import { type NextRequest, NextResponse } from "next/server";
import {
  getDynamoDbClient,
  RESPONSES_TABLE,
  DATASET_TABLE,
} from "@/lib/aws/dynamodb";
import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

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

    const {
      userId,
      selectedQualities,
      qualityCategories,
      qualityPassFail,
      editedQualities,
      feedback,
      answers,
      isEdit = false,
    }: {
      userId: string;
      selectedQualities: Record<string, string[]>;
      qualityCategories?: Record<string, Record<string, string>>;
      qualityPassFail?: Record<string, Record<string, "pass" | "fail">>;
      editedQualities?: Record<string, string>;
      feedback?: Record<string, string>;
      answers?: Record<string, any>;
      isEdit?: boolean;
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 },
      );
    }

    if (!selectedQualities || typeof selectedQualities !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid selectedQualities" },
        { status: 400 },
      );
    }

    const rubricsField = isEdit ? "edited_rubrics" : "list_of_rubrics_picked";
    const dynamoDb = getDynamoDbClient();

    // Get current user status to check if questions are already completed (prevents double-counting)
    let currentStatus: Record<string, string> = {};
    try {
      const getUserCommand = new GetCommand({
        TableName: RESPONSES_TABLE,
        Key: { user_id: userId },
        ProjectionExpression: "#statusField, rubric_evaluations",
        ExpressionAttributeNames: {
          "#statusField": "status",
        },
      });
      const userResult = await dynamoDb.send(getUserCommand);
      
      if (userResult.Item) {
        currentStatus = userResult.Item.status || {};
        
        // For old users: Check if rubric_evaluations exists, initialize it if it doesn't
        // This must be done BEFORE the main update to avoid path overlap errors
        const hasRubricEvaluations = qualityPassFail && Object.keys(qualityPassFail).length > 0;
        if (hasRubricEvaluations) {
          // If rubric_evaluations doesn't exist or is null for old users, initialize it first
          if (userResult.Item.rubric_evaluations === undefined || 
              userResult.Item.rubric_evaluations === null) {
            const initCommand = new UpdateCommand({
              TableName: RESPONSES_TABLE,
              Key: { user_id: userId },
              UpdateExpression: "SET rubric_evaluations = if_not_exists(rubric_evaluations, :emptyMap)",
              ExpressionAttributeValues: {
                ":emptyMap": {},
              },
            });
            await dynamoDb.send(initCommand);
          }
        }
      }
    } catch (initError) {
      // Log but don't fail - we'll try to set nested values anyway
      // DynamoDB might auto-create the parent map when setting nested paths
      console.warn("Could not fetch user status or initialize rubric_evaluations, will attempt update:", initError);
    }

    let updateExpression = "SET updated_at = :updatedAt";
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {
      ":updatedAt": new Date().toISOString(),
    };

    Object.keys(selectedQualities).forEach((questionId, index) => {
      const rubricKey = `#rubric${index}`;
      const feedbackKey = `#feedback${index}`;
      const evalKey = `#eval${index}`;

      expressionAttributeNames[rubricKey] = questionId;

      updateExpression += `, ${rubricsField}.${rubricKey} = :rubricData${index}`;
      updateExpression += `, #s.${rubricKey} = :statusValue${index}`;

      // Add readable rubric evaluations (safe for existing users who don't have this field)
      if (qualityPassFail && qualityPassFail[questionId]) {
        updateExpression += `, rubric_evaluations.${evalKey} = :evalData${index}`;
        expressionAttributeNames[evalKey] = questionId;
        expressionAttributeValues[`:evalData${index}`] =
          qualityPassFail[questionId];
      }

      if (feedback && feedback[questionId]) {
        expressionAttributeNames[feedbackKey] = questionId;
        updateExpression += `, additional_feedback.${feedbackKey} = :feedbackValue${index}`;
        expressionAttributeValues[`:feedbackValue${index}`] =
          feedback[questionId];
      }

      expressionAttributeValues[`:rubricData${index}`] = {
        rubrics: selectedQualities[questionId] || [],
        axes: qualityCategories?.[questionId] || {},
        pass_fail: qualityPassFail?.[questionId] || {},
        completed_at: new Date().toISOString(),
        edited_rubrics: editedQualities || {},
      };

      expressionAttributeValues[`:statusValue${index}`] =
        "classification_completed";
    });

    expressionAttributeNames["#s"] = "status";

    if (answers && Object.keys(answers).length > 0) {
      updateExpression += ", answers = :answers";
      expressionAttributeValues[":answers"] = answers;
    }

    // Increment questions_answered only when classification is completed (not on edits)
    // This ensures questions are only counted when fully completed, not just when answer is saved
    // IMPORTANT: Only count questions that aren't already classified to prevent double-counting
    if (!isEdit) {
      // Count unique questions being classified for the FIRST TIME (not already completed)
      const newCompletions = Object.keys(selectedQualities).filter(
        (questionId) => currentStatus[questionId] !== "classification_completed"
      );
      const newCompletionCount = newCompletions.length;
      
      if (newCompletionCount > 0) {
        updateExpression += ", questions_answered = if_not_exists(questions_answered, :zero) + :increment";
        expressionAttributeValues[":zero"] = 0;
        expressionAttributeValues[":increment"] = newCompletionCount;
      }
    }

    const updateCommand = new UpdateCommand({
      TableName: RESPONSES_TABLE,
      Key: { user_id: userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await dynamoDb.send(updateCommand);

    // Only increment times_answered for original classifications (not edits)
    // This ensures questions get properly tracked as completed
    if (!isEdit) {
      try {
        // Increment times_answered for each completed question in the dataset table
        const incrementPromises = Object.keys(selectedQualities).map(
          async (questionId) => {
            const incrementCommand = new UpdateCommand({
              TableName: DATASET_TABLE,
              Key: { question_id: questionId },
              UpdateExpression:
                "SET times_answered = if_not_exists(times_answered, :zero) + :inc",
              ExpressionAttributeValues: {
                ":inc": 1,
                ":zero": 0,
              },
            });

            await dynamoDb.send(incrementCommand);
          },
        );

        await Promise.all(incrementPromises);
      } catch (error) {
        console.error("Error incrementing times_answered:", error);
        // Don't fail the whole request if this fails, just log it
      }
    }

    return NextResponse.json({
      message: `${isEdit ? "Edited" : "Original"} rubric choices saved successfully`,
      isEdit,
      summary: {
        questionsProcessed: Object.keys(selectedQualities).length,
        totalRubricsEvaluated: Object.values(selectedQualities).reduce(
          (sum: number, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
          0,
        ),
        axesAssigned: Object.keys(qualityCategories || {}).length,
        passFailAssigned: Object.keys(qualityPassFail || {}).length,
        answersProcessed: answers ? Object.keys(answers).length : 0,
      },
    });
  } catch (error) {
    console.error("Error in save-rubric-choices:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
