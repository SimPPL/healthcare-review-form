import { type NextRequest, NextResponse } from "next/server";
import { getDynamoDbClient, RESPONSES_TABLE } from "@/lib/aws/dynamodb";
import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, questionId, feedback } = body;

    if (!userId || !questionId) {
      return NextResponse.json(
        { error: "Missing required fields: userId, questionId" },
        { status: 400 },
      );
    }

    const feedbackText = feedback || "";

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
        "SET additional_feedback.#qid = :feedback, updated_at = :updatedAt",
      ExpressionAttributeNames: {
        "#qid": questionId,
      },
      ExpressionAttributeValues: {
        ":feedback": feedbackText,
        ":updatedAt": currentTime,
      },
    });

    await dynamoDb.send(updateCommand);

    return NextResponse.json({
      message: "Additional feedback saved successfully",
      questionId: questionId,
      feedbackLength: feedbackText.length,
      timestamp: currentTime,
    });
  } catch (error) {
    console.error("Error saving additional feedback:", error);
    return NextResponse.json(
      { error: "Failed to save additional feedback. Please try again." },
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

    const additionalFeedback = currentUser.additional_feedback || {};

    if (questionId) {
      return NextResponse.json({
        questionId: questionId,
        feedback: additionalFeedback[questionId] || "",
      });
    }

    return NextResponse.json({
      userId: userId,
      additionalFeedback: additionalFeedback,
      totalQuestions: Object.keys(additionalFeedback).length,
    });
  } catch (error) {
    console.error("Error fetching additional feedback:", error);
    return NextResponse.json(
      { error: "Failed to fetch additional feedback." },
      { status: 500 },
    );
  }
}
