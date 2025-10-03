import { type NextRequest, NextResponse } from "next/server";
import { getDynamoDbClient, RESPONSES_TABLE } from "@/lib/aws/dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, questionId, userAnswer, isEdit = false } = body;

    if (!userId || !questionId || !userAnswer) {
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

    if (!isEdit) {
      baseExpressionAttributeValues[":zero"] = 0;
      baseExpressionAttributeValues[":increment"] = 1;
    }

    const updateCommand = new UpdateCommand({
      TableName: RESPONSES_TABLE,
      Key: {
        user_id: userId,
      },
      UpdateExpression: isEdit
        ? `SET ${answerField}.#qid = :answer, #status.#qid = :statusValue, updated_at = :updatedAt`
        : `SET ${answerField}.#qid = :answer, #status.#qid = :statusValue, updated_at = :updatedAt, questions_answered = if_not_exists(questions_answered, :zero) + :increment`,
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
