import { type NextRequest, NextResponse } from "next/server"
import { dynamoDb, RESPONSES_TABLE } from "@/lib/dynamo"
import { GetCommand } from "@aws-sdk/lib-dynamodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const getCommand = new GetCommand({
      TableName: RESPONSES_TABLE,
      Key: {
        user_id: userId,
      },
    })

    const result = await dynamoDb.send(getCommand)

    if (!result.Item) {
      return NextResponse.json({ questions: [] })
    }

    const userRecord = result.Item
    const questions = []

    if (userRecord.questions) {
      for (const [questionId, questionData] of Object.entries(userRecord.questions)) {
        questions.push({
          question_id: questionId,
          question_text: questionData.question_text,
          llm_response: questionData.llm_response,
          status: questionData.status,
          user_answer: userRecord.answers?.[questionId]?.user_answer || "",
          rating: userRecord.ratings?.[questionId] || null,
        })
      }
    }

    return NextResponse.json({ questions })
  } catch (error) {
    console.error("Error fetching assigned questions:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
