import { type NextRequest, NextResponse } from "next/server";
import {
  getDynamoDbClient,
  DATASET_TABLE,
  RESPONSES_TABLE,
} from "@/lib/aws/dynamodb";
import {
  ScanCommand,
  UpdateCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import {
  Question,
  QuestionAssignment,
  UserInfo,
  UserResponseRecord,
} from "@/types";

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const { userInfo }: { userInfo: UserInfo } = body;
    if (!userInfo) {
      return NextResponse.json(
        { error: "userInfo is required" },
        { status: 400 },
      );
    }

    const { name, profession, email, phone, clinicalExperience, aiExposure } =
      userInfo;

    if (!name || !profession || !email) {
      return NextResponse.json(
        { error: "Name, profession, and email are required" },
        { status: 400 },
      );
    }

    let userId = uuidv4();
    let existingUser = null;

    try {
      const dynamoDb = getDynamoDbClient();
      const queryCommand = new ScanCommand({
        TableName: RESPONSES_TABLE,
        FilterExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": email,
        },
      });
      const queryResult = await dynamoDb.send(queryCommand);

      if (queryResult.Items && queryResult.Items.length > 0) {
        existingUser = queryResult.Items[0];
        userId = existingUser.user_id;
      }
    } catch (error) {
    }

    let scanResult;
    try {
      const dynamoDb = getDynamoDbClient();
      const scanCommand = new ScanCommand({
        TableName: DATASET_TABLE,
        FilterExpression: "times_answered < target_evaluations",
      });
      scanResult = await dynamoDb.send(scanCommand);
    } catch (error) {
      return NextResponse.json(
        {
          error: `Database connection failed: ${error instanceof Error ? error.message : String(error)}. Please check your AWS configuration.`,
          details: {
            table: DATASET_TABLE,
            region: process.env.AWS_REGION || "Not explicitly set",
            environment: process.env.NODE_ENV,
            errorDetails: error instanceof Error ? error.stack : String(error),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 },
      );
    }

    const availableQuestions: Question[] = (scanResult.Items ||
      []) as Question[];

    if (availableQuestions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No questions available for evaluation. All questions may have reached their target evaluations.",
        },
        { status: 404 },
      );
    }

    const shuffledQuestions = [...availableQuestions].sort(
      () => Math.random() - 0.5,
    );

    let uniqueQuestions: Question[] = [];
    const seenQuestionIds = new Set<string>();

    for (const question of shuffledQuestions) {
      if (!seenQuestionIds.has(question.question_id)) {
        seenQuestionIds.add(question.question_id);
        uniqueQuestions.push(question);
        if (uniqueQuestions.length >= 20) break;
      }
    }

    if (uniqueQuestions.length === 0) {
      return NextResponse.json(
        {
          error: "No unique questions available for evaluation.",
        },
        { status: 404 },
      );
    }

    const assignedQuestions: Question[] = [];
    const processedQuestionIds: string[] = [];

    // Check existing user limits early
    if (existingUser) {
      const existingQuestionsAssigned = existingUser.questions_assigned || [];
      const maxQuestions = existingUser.max_questions_assigned || 20;

      // Check if user already has max questions assigned
      if (existingQuestionsAssigned.length >= maxQuestions) {
        return NextResponse.json({
          userId,
          assignedQuestions: existingQuestionsAssigned.length,
          message: `You already have ${existingQuestionsAssigned.length} questions assigned. Please complete your current assignments.`,
          isReturningUser: true,
          reachedLimit: true,
        });
      }

      // Calculate how many more questions we can assign
      const remainingSlots = maxQuestions - existingQuestionsAssigned.length;
      uniqueQuestions = uniqueQuestions.slice(0, remainingSlots);
    }

    for (const question of uniqueQuestions) {
      if (
        !question.question_id ||
        !question.question_text
      ) {
        continue;
      }

      try {
        const updateCommand = new UpdateCommand({
          TableName: DATASET_TABLE,
          Key: { question_id: question.question_id },
          UpdateExpression:
            "SET times_answered = if_not_exists(times_answered, :zero) + :inc",
          ExpressionAttributeValues: {
            ":inc": 1,
            ":zero": 0,
          },
        });

        const dynamoDb = getDynamoDbClient();
        await dynamoDb.send(updateCommand);
      } catch (error) {
      }

      processedQuestionIds.push(question.question_id);
    }

    const questionsMap: Record<string, QuestionAssignment> = {};
    for (const question of uniqueQuestions) {
      if (
        !question.question_id ||
        !question.question_text
      ) {
        continue;
      }

      questionsMap[question.question_id] = {
        question_text: question.question_text,
        llm_response: question.llm_response || question.answer || "",
        status: "assigned",
        assigned_at: new Date().toISOString(),
      };

      assignedQuestions.push({
        question_id: question.question_id,
        question_text: question.question_text,
        llm_response: question.llm_response || question.answer || "",
      });
    }

    if (Object.keys(questionsMap).length > 0) {
      if (existingUser) {
        try {
          const newQuestionIds = Object.keys(questionsMap);
          const existingQuestionsAssigned =
            existingUser.questions_assigned || [];

          const updatedQuestionsAssigned = [
            ...new Set([...existingQuestionsAssigned, ...newQuestionIds]),
          ];

          const newStatuses = Object.fromEntries(
            newQuestionIds.map((id) => [id, "assigned" as const]),
          );

          const updateCommand = new UpdateCommand({
            TableName: RESPONSES_TABLE,
            Key: { user_id: userId },
            UpdateExpression:
              "SET questions = :questions, questions_assigned = :questionsAssigned, #s = :status, updated_at = :updatedAt, user_name = :userName, medical_profession = :profession, max_questions_assigned = if_not_exists(max_questions_assigned, :defaultMax)",
            ExpressionAttributeNames: {
              "#s": "status",
            },
            ExpressionAttributeValues: {
              ":questions": { ...existingUser.questions, ...questionsMap },
              ":questionsAssigned": updatedQuestionsAssigned,
              ":status": { ...existingUser.status, ...newStatuses },
              ":updatedAt": new Date().toISOString(),
              ":userName": name,
              ":profession": profession,
              ":defaultMax": 20,
            },
          });

          const dynamoDb = getDynamoDbClient();
          await dynamoDb.send(updateCommand);
        } catch (error) {
          return NextResponse.json(
            {
              error: "Failed to update user record. Please try again.",
            },
            { status: 500 },
          );
        }
      } else {
        const questionIds = Object.keys(questionsMap);
        const userResponseItem: UserResponseRecord = {
          user_id: userId,
          user_name: name,
          email: email,
          medical_profession: profession,
          phone_number: phone || "",
          clinical_experience: clinicalExperience || "",
          ai_exposure: aiExposure || "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          questions_assigned: questionIds,
          max_questions_assigned: 20,
          questions_answered: 0,
          unbiased_answer: {},
          edited_answer: {},
          status: Object.fromEntries(
            questionIds.map((id: string) => [id, "assigned" as const]),
          ),
          list_of_rubrics_picked: {},
          edited_rubrics: {},
          additional_feedback: {},
          questions: questionsMap,
        };

        try {
          const putCommand = new PutCommand({
            TableName: RESPONSES_TABLE,
            Item: userResponseItem,
          });

          const dynamoDb = getDynamoDbClient();
          await dynamoDb.send(putCommand);
        } catch (error) {
          return NextResponse.json(
            {
              error: "Failed to create user record. Please try again.",
            },
            { status: 500 },
          );
        }
      }
    }

    if (assignedQuestions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No questions could be successfully assigned. Please try again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      userId,
      assignedQuestions: assignedQuestions.length,
      message: existingUser
        ? `Welcome back! Added ${assignedQuestions.length} new questions to your existing set.`
        : `Successfully assigned ${assignedQuestions.length} questions`,
      isReturningUser: !!existingUser,
    });
  } catch (error) {
    const missingVars = [];
    if (!process.env.DATASET_TABLE && process.env.NODE_ENV === "development")
      missingVars.push("DATASET_TABLE");
    if (!process.env.RESPONSES_TABLE && process.env.NODE_ENV === "development")
      missingVars.push("RESPONSES_TABLE");

    return NextResponse.json(
      {
        error: `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
        details: {
          missingEnvironmentVariables:
            missingVars.length > 0 ? missingVars : undefined,
          datasetTable: DATASET_TABLE,
          responsesTable: RESPONSES_TABLE,
          region: process.env.AWS_REGION || "Not explicitly set",
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString(),
          errorType: (error as any)?.constructor?.name || typeof error,
        },
      },
      { status: 500 },
    );
  }
}
