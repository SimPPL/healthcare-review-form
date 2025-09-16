import { type NextRequest, NextResponse } from "next/server";
import {
  getDynamoDbClient,
  RESPONSES_TABLE,
  DATASET_TABLE,
} from "@/lib/aws/dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { Question, UserResponse, QuestionAssignment } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      console.error("GET /api/get-assigned: Missing user_id");
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    console.log(`Fetching assigned questions for user_id: ${userId}`);

    let userResult: { Item?: any };
    try {
      const dynamoDb = getDynamoDbClient();

      const userCommand = new GetCommand({
        TableName: RESPONSES_TABLE,
        Key: { user_id: userId },
      });
      userResult = await dynamoDb.send(userCommand);
    } catch (err) {
      console.error("Failed to fetch user record from RESPONSES_TABLE:", err);
      return NextResponse.json(
        {
          error: "Failed to fetch user record",
          details: {
            table: RESPONSES_TABLE,
          },
        },
        { status: 500 },
      );
    }

    if (!userResult.Item) {
      console.warn(`No response record found for user_id: ${userId}`);
      return NextResponse.json({ questions: [] }, { status: 200 });
    }

    const userRecord = userResult.Item;
    const questions: any[] = [];

    if (!userRecord.questions) {
      console.warn(
        `User record has no questions: ${JSON.stringify(userRecord)}`,
      );
    } else {
      for (const [
        questionId,
        questionData,
      ] of Object.entries<QuestionAssignment>(userRecord.questions)) {
        let rubrics: string[] = [];

        try {
          const dynamoDb = getDynamoDbClient();

          const datasetResult = await dynamoDb.send(
            new GetCommand({
              TableName: DATASET_TABLE,
              Key: { question_id: questionId },
              ProjectionExpression: "rubrics",
            }),
          );

          if (datasetResult.Item?.rubrics) {
            rubrics = Array.isArray(datasetResult.Item.rubrics)
              ? datasetResult.Item.rubrics
              : JSON.parse(datasetResult.Item.rubrics);
          }
        } catch (err) {
          console.error(
            `Failed to fetch rubrics for question ${questionId}:`,
            err,
          );
        }

        const userAnswer = userRecord.answers?.[questionId]?.user_answer || "";

        if (!userAnswer) {
          console.log(`Question ${questionId} has no user answer yet`);
        }

        const typedQuestionData = questionData as QuestionAssignment;

        questions.push({
          user_id: userId,
          user_name: userRecord.user_name || "",
          user_profession: userRecord.user_profession || "",
          email: userRecord.email || "",
          assigned_at:
            typedQuestionData.assigned_at || new Date().toISOString(),
          question_id: questionId,
          question_text: typedQuestionData.question_text,
          llm_response: typedQuestionData.llm_response,
          status: typedQuestionData.status || "assigned",
          user_answer: userAnswer,
          rating: userRecord.ratings?.[questionId] || null,
          rubrics,
          rubric_scores: typedQuestionData.rubric_scores || {},
          axis_scores: typedQuestionData.axis_scores || {},
          classification: typedQuestionData.classification || "",
        });
      }
    }

    console.log(`Returning ${questions.length} questions for user ${userId}`);
    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Unhandled error in GET /api/get-assigned:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: {
          tables: {
            datasetTable: DATASET_TABLE,
            responsesTable: RESPONSES_TABLE,
          },
        },
      },
      { status: 500 },
    );
  }
}
