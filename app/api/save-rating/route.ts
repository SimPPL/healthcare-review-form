import { type NextRequest, NextResponse } from "next/server";
import { getDynamoDbClient, RESPONSES_TABLE } from "@/lib/aws/dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, questionId, llmRating } = body;

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

    const dynamoDb = getDynamoDbClient();
    const updateCommand = new UpdateCommand({
      TableName: RESPONSES_TABLE,
      Key: {
        user_id: userId,
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
    console.error("Error saving rating:", error);
    return NextResponse.json(
      { error: "Failed to save rating. Please try again." },
      { status: 500 },
    );
  }
}
