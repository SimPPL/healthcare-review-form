import { type NextRequest, NextResponse } from "next/server";
import {
  getDynamoDbClient,
  DATASET_TABLE,
  RESPONSES_TABLE,
} from "@/lib/aws/dynamodb";
import { ScanCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
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

    const userId = uuidv4();

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

    const uniqueQuestions: Question[] = [];
    const seenQuestionIds = new Set<string>();

    for (const question of availableQuestions) {
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
      message: `Successfully assigned ${assignedQuestions.length} questions`,
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
