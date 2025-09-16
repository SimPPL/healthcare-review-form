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

    // Type the request body
    const {
      userId,
      questionId,
      userAnswer,
    }: {
      userId: string;
      questionId: string;
      userAnswer: string;
    } = body;

    if (!userId || !questionId || !userAnswer) {
      return NextResponse.json(
        { error: "Missing required fields: userId, questionId, userAnswer" },
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
          "SET answers.#qid = :answerData, updated_at = :updatedAt",
        ExpressionAttributeNames: {
          "#qid": questionId,
        },
        ExpressionAttributeValues: {
          ":answerData": {
            user_answer: userAnswer,
            status: "answered",
            answered_at: new Date().toISOString(),
          },
          ":updatedAt": new Date().toISOString(),
        },
      });

      await dynamoDb.send(updateCommand);
      return NextResponse.json({ message: "Answer saved successfully" });
    } catch (error) {
      console.error("Error updating answer:", error);
      return NextResponse.json(
        {
          error: "Failed to save answer. Please try again.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error saving answer:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
