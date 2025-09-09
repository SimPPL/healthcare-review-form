import { type NextRequest, NextResponse } from "next/server"
import { dynamoDb, DATASET_TABLE, RESPONSES_TABLE } from "@/lib/dynamo"
import { ScanCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { userInfo } = body
    if (!userInfo) {
      return NextResponse.json({ error: "userInfo is required" }, { status: 400 })
    }

    const { name, profession, clinicalExperience, aiExposure } = userInfo

    if (!name || !profession) {
      return NextResponse.json({ error: "Name and profession are required" }, { status: 400 })
    }

    const userId = uuidv4()

    let scanResult
    try {
      const scanCommand = new ScanCommand({
        TableName: DATASET_TABLE,
        FilterExpression: "times_answered < target_evaluations",
      })
      scanResult = await dynamoDb.send(scanCommand)
    } catch (error) {
      console.error("Error scanning dataset table:", error)
      return NextResponse.json(
        {
          error: "Database connection failed. Please check your AWS configuration.",
        },
        { status: 500 },
      )
    }

    const availableQuestions = scanResult.Items || []

    if (availableQuestions.length === 0) {
      return NextResponse.json(
        {
          error: "No questions available for evaluation. All questions may have reached their target evaluations.",
        },
        { status: 404 },
      )
    }

    const uniqueQuestions = []
    const seenQuestionIds = new Set()

    for (const question of availableQuestions) {
      if (!seenQuestionIds.has(question.question_id)) {
        seenQuestionIds.add(question.question_id)
        uniqueQuestions.push(question)
        // Limit to 10 questions per user for comprehensive evaluation
        if (uniqueQuestions.length >= 10) break
      }
    }

    if (uniqueQuestions.length === 0) {
      return NextResponse.json(
        {
          error: "No unique questions available for evaluation.",
        },
        { status: 404 },
      )
    }

    const assignedQuestions = []
    const processedQuestionIds = []

    console.log(
      "[v0] Assigning questions:",
      uniqueQuestions.map((q) => q.question_id),
    )

    // First, update the dataset table for each question
    for (const question of uniqueQuestions) {
      if (!question.question_id || !question.question_text || !question.llm_response) {
        console.error("[v0] Invalid question data:", question)
        continue
      }

      try {
        // Update times_answered in dataset table
        const updateCommand = new UpdateCommand({
          TableName: DATASET_TABLE,
          Key: { question_id: question.question_id },
          UpdateExpression: "SET times_answered = if_not_exists(times_answered, :zero) + :inc",
          ExpressionAttributeValues: {
            ":inc": 1,
            ":zero": 0,
          },
        })

        await dynamoDb.send(updateCommand)
        processedQuestionIds.push(question.question_id)
        console.log(`[v0] Updated question ${question.question_id}`)
      } catch (error) {
        console.error(`[v0] Error updating question ${question.question_id}:`, error)
        // Continue with other questions even if one fails
      }
    }

    // Then, create response records for successfully processed questions
    const questionsMap = {}
    for (const question of uniqueQuestions) {
      if (!processedQuestionIds.includes(question.question_id)) {
        continue // Skip questions that failed to update
      }

      questionsMap[question.question_id] = {
        question_text: question.question_text,
        llm_response: question.llm_response,
        status: "assigned",
        assigned_at: new Date().toISOString(),
      }

      assignedQuestions.push({
        question_id: question.question_id,
        question_text: question.question_text,
        llm_response: question.llm_response,
      })
    }

    // Create single user record with all questions
    if (Object.keys(questionsMap).length > 0) {
      const userResponseItem = {
        user_id: userId,
        user_name: name,
        user_profession: profession,
        clinical_experience: clinicalExperience || "",
        ai_exposure: aiExposure || "",
        questions: questionsMap,
        answers: {}, // Will be populated as user answers questions
        ratings: {}, // Will be populated as user rates responses
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      try {
        const putCommand = new PutCommand({
          TableName: RESPONSES_TABLE,
          Item: userResponseItem,
        })

        await dynamoDb.send(putCommand)
        console.log(`[v0] Created user response record for ${userId}`)
      } catch (error) {
        console.error(`[v0] Error creating user response record:`, error)
        return NextResponse.json(
          {
            error: "Failed to create user record. Please try again.",
          },
          { status: 500 },
        )
      }
    }

    if (assignedQuestions.length === 0) {
      return NextResponse.json(
        {
          error: "No questions could be successfully assigned. Please try again.",
        },
        { status: 500 },
      )
    }

    console.log(`[v0] Successfully assigned ${assignedQuestions.length} questions`)

    return NextResponse.json({
      userId,
      assignedQuestions: assignedQuestions.length,
      message: `Successfully assigned ${assignedQuestions.length} questions`,
    })
  } catch (error) {
    console.error("Error assigning questions:", error)
    return NextResponse.json(
      {
        error: "Internal server error. Please check your configuration and try again.",
      },
      { status: 500 },
    )
  }
}
