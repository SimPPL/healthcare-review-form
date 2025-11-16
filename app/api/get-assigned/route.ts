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
            const rawRubrics = datasetResult.Item.rubrics;

            // Handle multiple possible storage formats for rubrics:
            // 1. JSON string of string[]:
            //    '["rubric 1", "rubric 2"]'
            // 2. JSON string of [{ "S": "rubric 1" }, ...] (Dynamo-style JSON)
            // 3. Array of strings
            // 4. Array of { S: string }
            if (typeof rawRubrics === "string") {
              try {
                const parsed = JSON.parse(rawRubrics);
                if (Array.isArray(parsed)) {
                  if (
                    parsed.length > 0 &&
                    typeof parsed[0] === "object" &&
                    parsed[0] !== null &&
                    "S" in (parsed[0] as any)
                  ) {
                    // Format: [{ S: "..." }, ...]
                    rubrics = (parsed as any[])
                      .map((item) =>
                        item && typeof item.S === "string" ? item.S.trim() : "",
                      )
                      .filter((v) => v.length > 0);
                  } else {
                    // Format: ["...", "..."]
                    rubrics = (parsed as any[])
                      .filter(
                        (item) => typeof item === "string" && item.trim().length > 0,
                      )
                      .map((item) => (item as string).trim());
                  }
                } else if (typeof parsed === "string" && parsed.trim().length > 0) {
                  rubrics = [parsed.trim()];
                }
              } catch {
                // If parsing fails, treat as a single rubric string
                if (rawRubrics.trim().length > 0) {
                  rubrics = [rawRubrics.trim()];
                }
              }
            } else if (Array.isArray(rawRubrics)) {
              // Handle direct arrays coming from Dynamo: either string[] or { S: string }[]
              if (
                rawRubrics.length > 0 &&
                typeof rawRubrics[0] === "object" &&
                rawRubrics[0] !== null &&
                "S" in (rawRubrics[0] as any)
              ) {
                rubrics = (rawRubrics as any[])
                  .map((item) =>
                    item && typeof item.S === "string" ? item.S.trim() : "",
                  )
                  .filter((v) => v.length > 0);
              } else {
                rubrics = (rawRubrics as any[])
                  .filter(
                    (item) => typeof item === "string" && item.trim().length > 0,
                  )
                  .map((item) => (item as string).trim());
              }
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
