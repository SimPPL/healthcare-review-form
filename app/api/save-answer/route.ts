import { type NextRequest, NextResponse } from "next/server";
import { getDynamoDbClient, RESPONSES_TABLE } from "@/lib/aws/dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, questionId, userAnswer, isEdit = false } = body;

    // Allow empty strings for userAnswer (needed for questions 6+)
    if (!userId || !questionId || userAnswer === undefined || userAnswer === null) {
      return NextResponse.json(
        { error: "Missing required fields: userId, questionId, userAnswer" },
        { status: 400 },
      );
    }

    const dynamoDb = getDynamoDbClient();

    const answerField = isEdit ? "edited_answer" : "unbiased_answer";

    const baseExpressionAttributeValues: Record<string, any> = {
      ":answer": userAnswer,
      ":statusValue": "answered",
      ":updatedAt": new Date().toISOString(),
    };

    const updateCommand = new UpdateCommand({
      TableName: RESPONSES_TABLE,
      Key: {
        user_id: userId,
      },
      UpdateExpression: `SET ${answerField}.#qid = :answer, #status.#qid = :statusValue, updated_at = :updatedAt`,
      ExpressionAttributeNames: {
        "#qid": questionId,
        "#status": "status",
      },
      ExpressionAttributeValues: baseExpressionAttributeValues,
    });

    await dynamoDb.send(updateCommand);
    return NextResponse.json({ message: "Answer saved successfully" });
  } catch (error) {
    console.error("Error in save-answer:", error);
    return NextResponse.json(
      { 
        error: "Failed to save answer. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 },
    );
  }
}
