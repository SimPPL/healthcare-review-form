import { type NextRequest, NextResponse } from "next/server";
import { dynamoDb, RESPONSES_TABLE } from "@/lib/dynamo";
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
      editedQualities,
      feedback,
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

    const updateCommand = new UpdateCommand({
      TableName: RESPONSES_TABLE,
      Key: { user_id: userId },
      UpdateExpression: `
        SET
          classification_data = :classificationData,
          #s = :status,
          updated_at = :updatedAt
      `,
      ExpressionAttributeNames: {
        "#s": "status", // alias reserved keyword
      },
      ExpressionAttributeValues: {
        ":classificationData": {
          selected_qualities: selectedQualities,
          quality_categories: qualityCategories || {},
          edited_qualities: editedQualities || {},
          feedback: feedback || {},
          completed_at: new Date().toISOString(),
        },
        ":status": "classification_completed",
        ":updatedAt": new Date().toISOString(),
      },
    });

    await dynamoDb.send(updateCommand);

    console.log("Classification data saved for user:", userId);
    console.log(
      "Selected qualities count:",
      Object.keys(selectedQualities).length,
    );
    console.log(
      "Categories assigned:",
      Object.keys(qualityCategories || {}).length,
    );

    return NextResponse.json({
      message: "Classification data saved successfully",
      summary: {
        questionsProcessed: Object.keys(selectedQualities).length,
        totalQualitiesSelected: Object.values(selectedQualities).reduce(
          (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
          0,
        ),
      },
    });
  } catch (error) {
    console.error("Error saving classification data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
