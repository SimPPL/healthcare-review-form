import { type NextRequest, NextResponse } from "next/server";
import { getDynamoDbClient, RESPONSES_TABLE } from "@/lib/aws/dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ClassificationData } from "@/types";

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
      answers,
      ratings,
      answerEditHistory,
    }: {
      userId: string;
      selectedQualities: Record<string, string[]>;
      qualityCategories?: Record<string, Record<string, string>>;
      editedQualities?: Record<string, string>;
      feedback?: Record<string, string>;
      answers?: Record<string, any>;
      ratings?: Record<string, number>;
      answerEditHistory?: Record<
        string,
        Array<{
          original_answer: string;
          edited_answer: string;
          edited_at: string;
        }>
      >;
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

    let updateExpression =
      "SET classification_data = :classificationData, #s = :status, updated_at = :updatedAt";
    const expressionAttributeNames = {
      "#s": "status", // alias reserved keyword
    };
    const expressionAttributeValues: Record<string, any> = {
      ":classificationData": {
        selectedQualities: selectedQualities,
        qualityCategories: qualityCategories || {},
        editedQualities: editedQualities || {},
        feedback: feedback || {},
        answerEditHistory: answerEditHistory || {},
        completed_at: new Date().toISOString(),
      } as ClassificationData,
      ":status": "classification_completed",
      ":updatedAt": new Date().toISOString(),
    };

    if (answers && Object.keys(answers).length > 0) {
      updateExpression += ", answers = :answers";
      expressionAttributeValues[":answers"] = answers;
    }

    if (ratings && Object.keys(ratings).length > 0) {
      updateExpression += ", ratings = :ratings";
      expressionAttributeValues[":ratings"] = ratings;
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

    console.log("Classification data saved for user:", userId);
    console.log(
      "Selected qualities count:",
      Object.keys(selectedQualities).length,
    );
    console.log(
      "Categories assigned:",
      Object.keys(qualityCategories || {}).length,
    );

    if (answers) {
      console.log("Answers saved:", Object.keys(answers).length);
    }
    if (ratings) {
      console.log("Ratings saved:", Object.keys(ratings).length);
    }
    if (answerEditHistory) {
      console.log(
        "Answer edits tracked:",
        Object.keys(answerEditHistory).length,
      );
    }

    return NextResponse.json({
      message: "Classification data saved successfully",
      summary: {
        questionsProcessed: Object.keys(selectedQualities).length,
        totalQualitiesSelected: Object.values(selectedQualities).reduce(
          (sum: number, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
          0,
        ),
        answersProcessed: answers ? Object.keys(answers).length : 0,
        ratingsProcessed: ratings ? Object.keys(ratings).length : 0,
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
