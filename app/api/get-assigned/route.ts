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
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    let userResult: { Item?: any };
    try {
      const dynamoDb = getDynamoDbClient();

      const userCommand = new GetCommand({
        TableName: RESPONSES_TABLE,
        Key: { user_id: userId },
      });
      userResult = await dynamoDb.send(userCommand);
    } catch (err) {
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
      return NextResponse.json({ questions: [] }, { status: 200 });
    }

    const userRecord = userResult.Item;
    const questions: any[] = [];

    if (!userRecord.questions) {
    } else {
      for (const [
        questionId,
        questionData,
      ] of Object.entries<QuestionAssignment>(userRecord.questions)) {
        let rubrics: string[] = [];
        let axisRubricMap: Record<string, string[]> | null = null;

        try {
          const dynamoDb = getDynamoDbClient();

          const datasetResult = await dynamoDb.send(
            new GetCommand({
              TableName: DATASET_TABLE,
              Key: { question_id: questionId },
              ProjectionExpression: "rubrics, axis_rubric_map",
            }),
          );

          if (datasetResult.Item?.rubrics) {
            // Handle both string and array formats for rubrics
            if (typeof datasetResult.Item.rubrics === 'string') {
              try {
                rubrics = JSON.parse(datasetResult.Item.rubrics);
              } catch {
                // If parsing fails, treat as a single rubric string
                rubrics = [datasetResult.Item.rubrics];
              }
            } else if (Array.isArray(datasetResult.Item.rubrics)) {
              rubrics = datasetResult.Item.rubrics;
            }
          }

          if (datasetResult.Item?.axis_rubric_map) {
            const rawAxisMap = datasetResult.Item.axis_rubric_map;
            if (typeof rawAxisMap === "string") {
              try {
                axisRubricMap = JSON.parse(rawAxisMap);
              } catch {
                axisRubricMap = null;
              }
            } else if (typeof rawAxisMap === "object") {
              axisRubricMap = rawAxisMap as Record<string, string[]>;
            }
          }
        } catch (err) {
        }

        // Preserve empty strings (valid for questions 6+)
        // Check each field explicitly rather than using || which treats "" as falsy
        const userAnswer =
          userRecord.edited_answer?.[questionId] !== undefined
            ? userRecord.edited_answer[questionId]
            : userRecord.unbiased_answer?.[questionId] !== undefined
            ? userRecord.unbiased_answer[questionId]
            : userRecord.answers?.[questionId]?.user_answer !== undefined
            ? userRecord.answers[questionId].user_answer
            : "";

        const selectedRubrics =
          userRecord.edited_rubrics?.[questionId] ||
          userRecord.list_of_rubrics_picked?.[questionId] ||
          null;
        const hasEditedRubrics = !!userRecord.edited_rubrics?.[questionId];

        const typedQuestionData = questionData as QuestionAssignment;

        questions.push({
          user_id: userId,
          user_name: userRecord.user_name || "",
          user_profession:
            userRecord.medical_profession || userRecord.user_profession || "",
          email: userRecord.email || "",
          assigned_at:
            typedQuestionData.assigned_at || new Date().toISOString(),
          question_id: questionId,
          question_text: typedQuestionData.question_text,
          llm_response: typedQuestionData.llm_response,
          status:
            userRecord.status?.[questionId] ||
            typedQuestionData.status ||
            "assigned",
          user_answer: userAnswer,
          rubrics,
          selected_rubrics: selectedRubrics,
          has_edited_rubrics: hasEditedRubrics,
          rubric_scores: typedQuestionData.rubric_scores || {},
          axis_scores: typedQuestionData.axis_scores || {},
          classification: typedQuestionData.classification || "",
          axis_rubric_map: axisRubricMap,
        });
      }
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error in get-assigned:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
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
