import { type NextRequest, NextResponse } from "next/server";
import { getDynamoDbClient, RESPONSES_TABLE } from "@/lib/aws/dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, questionId, userAnswer } = body;

    if (!userId || !questionId || !userAnswer) {
      return NextResponse.json(
        { error: "Missing required fields: userId, questionId, userAnswer" },
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
    console.error("Error saving answer:", error);
    return NextResponse.json(
      { error: "Failed to save answer. Please try again." },
      { status: 500 },
    );
  }
}
