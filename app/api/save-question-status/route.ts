import { type NextRequest, NextResponse } from "next/server";
import { getDynamoDbClient, RESPONSES_TABLE } from "@/lib/aws/dynamodb";
import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, questionId, status } = body;

    if (!userId || !questionId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: userId, questionId, status" },
        { status: 400 },
      );
    }

    const validStatuses = [
      "assigned",
      "answered",
      "edited",
      "submitted",
      "classification_completed",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const dynamoDb = getDynamoDbClient();

    const getUserCommand = new GetCommand({
      TableName: RESPONSES_TABLE,
      Key: { user_id: userId },
    });

    const userResult = await dynamoDb.send(getUserCommand);
    const currentUser = userResult.Item;

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentTime = new Date().toISOString();
    const updateCommand = new UpdateCommand({
      TableName: RESPONSES_TABLE,
      Key: {
        user_id: userId,
      },
      UpdateExpression:
        "SET #statusField.#qid = :status, questions.#qid.#statusSub = :status, updated_at = :updatedAt",
      ExpressionAttributeNames: {
        "#statusField": "status",
        "#qid": questionId,
        "#statusSub": "status",
      },
      ExpressionAttributeValues: {
        ":status": status,
        ":updatedAt": currentTime,
      },
    });

    await dynamoDb.send(updateCommand);

    return NextResponse.json({
      message: "Question status updated successfully",
      questionId: questionId,
      newStatus: status,
      timestamp: currentTime,
    });
  } catch (error) {
    console.error("Error updating question status:", error);
    return NextResponse.json(
      { error: "Failed to update question status. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const questionId = searchParams.get("questionId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required parameter: userId" },
        { status: 400 },
      );
    }

    const dynamoDb = getDynamoDbClient();

    const getUserCommand = new GetCommand({
      TableName: RESPONSES_TABLE,
      Key: { user_id: userId },
    });

    const userResult = await dynamoDb.send(getUserCommand);
    const currentUser = userResult.Item;

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const questionStatuses = currentUser.status || {};

    // If questionId is provided, return status for that specific question
    if (questionId) {
      return NextResponse.json({
        questionId: questionId,
        status: questionStatuses[questionId] || null,
      });
    }

    // Otherwise, return all question statuses
    return NextResponse.json({
      userId: userId,
      questionStatuses: questionStatuses,
      totalQuestions: Object.keys(questionStatuses).length,
    });
  } catch (error) {
    console.error("Error fetching question status:", error);
    return NextResponse.json(
      { error: "Failed to fetch question status." },
      { status: 500 },
    );
  }
}
