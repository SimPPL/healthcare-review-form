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

    // Check if user already exists by email
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
        console.log(
          `Found existing user with email ${email}, user_id: ${userId}`,
        );

        // Check if user already has questions assigned
        if (
          existingUser.questions &&
          Object.keys(existingUser.questions).length > 0
        ) {
          const existingQuestionsCount = Object.keys(
            existingUser.questions,
          ).length;
          console.log(
            `User ${userId} already has ${existingQuestionsCount} questions assigned`,
          );

          // Return immediately with existing assignment info
          return NextResponse.json({
            userId,
            assignedQuestions: existingQuestionsCount,
            message: `Welcome back! You have ${existingQuestionsCount} questions assigned.`,
            isReturningUser: true,
          });
        }
      }
    } catch (error) {
      console.error("Error checking for existing user:", error);
      // Continue with new user creation if check fails
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
      console.error("Error scanning dataset table:", error);
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

    // Shuffle questions to ensure different users get different questions
    const shuffledQuestions = [...availableQuestions].sort(
      () => Math.random() - 0.5,
    );

    const uniqueQuestions: Question[] = [];
    const seenQuestionIds = new Set<string>();

    // Ensure we only assign exactly 20 questions maximum
    const MAX_QUESTIONS = 20;
    for (const question of shuffledQuestions) {
      if (!seenQuestionIds.has(question.question_id)) {
        seenQuestionIds.add(question.question_id);
        uniqueQuestions.push(question);
        if (uniqueQuestions.length >= MAX_QUESTIONS) break;
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

    console.log(
      "[v0] Assigning questions:",
      uniqueQuestions.map((q) => q.question_id),
    );

    for (const question of uniqueQuestions) {
      if (
        !question.question_id ||
        !question.question_text ||
        !question.llm_response
      ) {
        console.error("Invalid question data:", question);
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
        console.log(`Successfully updated question ${question.question_id}`);
      } catch (error) {
        console.error(
          `Error updating question ${question.question_id}:`,
          error,
        );
      }

      // Always add valid questions to assignment, regardless of update success
      processedQuestionIds.push(question.question_id);
    }

    const questionsMap: Record<string, QuestionAssignment> = {};
    for (const question of uniqueQuestions) {
      if (
        !question.question_id ||
        !question.question_text ||
        !question.llm_response
      ) {
        continue;
      }

      questionsMap[question.question_id] = {
        question_text: question.question_text,
        llm_response: question.llm_response,
        status: "assigned",
        assigned_at: new Date().toISOString(),
      };

      assignedQuestions.push({
        question_id: question.question_id,
        question_text: question.question_text,
        llm_response: question.llm_response,
      });
    }

    if (Object.keys(questionsMap).length > 0) {
      if (existingUser) {
        // This should not happen anymore since we return early for existing users
        // But keeping as fallback - only assign questions if user has none
        const existingQuestionsCount = existingUser.questions
          ? Object.keys(existingUser.questions).length
          : 0;

        if (existingQuestionsCount === 0) {
          try {
            const updateCommand = new UpdateCommand({
              TableName: RESPONSES_TABLE,
              Key: { user_id: userId },
              UpdateExpression:
                "SET questions = :questions, updated_at = :updatedAt, user_name = :name, user_profession = :profession",
              ExpressionAttributeValues: {
                ":questions": questionsMap, // Only assign new questions, don't merge
                ":updatedAt": new Date().toISOString(),
                ":name": name,
                ":profession": profession,
              },
            });

            const dynamoDb = getDynamoDbClient();
            await dynamoDb.send(updateCommand);
            console.log(
              `Updated existing user ${userId} with ${Object.keys(questionsMap).length} questions`,
            );
          } catch (error) {
            console.error(`Error updating existing user record:`, error);
            return NextResponse.json(
              {
                error: "Failed to update user record. Please try again.",
              },
              { status: 500 },
            );
          }
        } else {
          console.log(
            `User ${userId} already has ${existingQuestionsCount} questions, skipping assignment`,
          );
        }
      } else {
        // Create new user
        const userResponseItem: UserResponseRecord = {
          user_id: userId,
          user_name: name,
          user_profession: profession,
          email: email,
          phone: phone || "",
          clinical_experience: clinicalExperience || "",
          ai_exposure: aiExposure || "",
          questions: questionsMap,
          answers: {}, // Will be populated as user answers questions
          ratings: {}, // Will be populated as user rates responses
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        try {
          const putCommand = new PutCommand({
            TableName: RESPONSES_TABLE,
            Item: userResponseItem,
          });

          const dynamoDb = getDynamoDbClient();
          await dynamoDb.send(putCommand);
          console.log(`Created new user ${userId}`);
        } catch (error) {
          console.error(`Error creating user response record:`, error);
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
      console.error("No questions were assigned - this should not happen");
      return NextResponse.json(
        {
          error:
            "No questions could be successfully assigned. Please try again.",
        },
        { status: 500 },
      );
    }

    console.log(`Successfully assigned ${assignedQuestions.length} questions`);

    return NextResponse.json({
      userId,
      assignedQuestions: assignedQuestions.length,
      message: existingUser
        ? `Welcome back! You have ${assignedQuestions.length} questions assigned.`
        : `Successfully assigned ${assignedQuestions.length} questions`,
      isReturningUser: !!existingUser,
    });
  } catch (error) {
    console.error("Error assigning questions:", error);
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
