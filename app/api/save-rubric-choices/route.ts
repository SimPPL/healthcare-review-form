import { type NextRequest, NextResponse } from "next/server";
import { getDynamoDbClient, RESPONSES_TABLE } from "@/lib/aws/dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

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

    let updateExpression = "SET updated_at = :updatedAt";
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {
      ":updatedAt": new Date().toISOString(),
    };

    Object.keys(selectedQualities).forEach((questionId, index) => {
      const rubricKey = `#rubric${index}`;
      const feedbackKey = `#feedback${index}`;

      expressionAttributeNames[rubricKey] = questionId;
      
      updateExpression += `, ${rubricsField}.${rubricKey} = :rubricData${index}`;
      updateExpression += `, #s.${rubricKey} = :statusValue${index}`;

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

      expressionAttributeValues[`:statusValue${index}`] = "classification_completed";
    });

    expressionAttributeNames["#s"] = "status";


    if (answers && Object.keys(answers).length > 0) {
      updateExpression += ", answers = :answers";
      expressionAttributeValues[":answers"] = answers;
    }

    const dynamoDb = getDynamoDbClient();

    const updateCommand = new UpdateCommand({
      TableName: RESPONSES_TABLE,
      Key: { user_id: userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await dynamoDb.send(updateCommand);

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
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 },
    );
  }
}
