import { type NextRequest, NextResponse } from "next/server";
import { getDynamoDbClient, RESPONSES_TABLE } from "../_lib/dynamoDb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { UserResponseRecord } from "@/types";

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
      questionId,
      llmRating,
    }: {
      userId: string;
      questionId: string;
      llmRating: number;
    } = body;

    if (!userId || !questionId || llmRating === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: userId, questionId, llmRating" },
        { status: 400 },
      );
    }

    if (typeof llmRating !== "number" || llmRating < 0 || llmRating > 10) {
      return NextResponse.json(
        { error: "Rating must be a number between 0 and 10" },
        { status: 400 },
      );
    }

    try {
      // Initialize DynamoDB client for this request
      const dynamoDb = getDynamoDbClient();

      // Define typed update command for DynamoDB
      const updateCommand = new UpdateCommand({
        TableName: RESPONSES_TABLE,
        Key: {
          user_id: userId, // Changed from "user-id" to "user_id" to match DynamoDB table schema
        },
        UpdateExpression:
          "SET ratings.#qid = :rating, questions.#qid.#status = :status, updated_at = :updatedAt",
        ExpressionAttributeNames: {
          "#qid": questionId,
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":rating": llmRating,
          ":status": "submitted",
          ":updatedAt": new Date().toISOString(),
        },
      });

      await dynamoDb.send(updateCommand);
      return NextResponse.json({ message: "Rating saved successfully" });
    } catch (error) {
      console.error("Error updating rating:", error);
      return NextResponse.json(
        {
          error: "Failed to save rating. Please try again.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error saving rating:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
