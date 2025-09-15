import { type NextRequest, NextResponse } from "next/server";
import { dynamoDb, DATASET_TABLE, RESPONSES_TABLE } from "@/lib/dynamo";
import { ScanCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

type QuestionItem = {
  question_id: string;
  question_text: string;
  llm_response: string;
  answer?: string;
  answer_hindi?: string;
  answer_marathi?: string;
  axis_scores?: Record<string, number>; // e.g., { Accuracy: 0.9, Completeness: 0.8 }
  classification?: string;
  medical_quality_score?: number;
  references?: string[];
  rubric_scores?: Record<string, number>; // rubric_name -> score
  rubrics?: string[];
  target_evaluations?: number;
  theme?: string;
  times_answered?: number;
};

type QuestionAssignment = {
  question_text: string;
  llm_response: string;
  answer?: string;
  answer_hindi?: string;
  answer_marathi?: string;
  status: string;
  assigned_at: string;
};

type UserResponseItem = {
  user_id: string;
  user_name: string;
  user_profession: string;
  email: string;
  phone?: string;
  clinical_experience: string;
  ai_exposure: string;
  questions: Record<string, QuestionAssignment>;
  answers: Record<string, Partial<QuestionItem>>; // now includes extra fields
  ratings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

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

    const { userInfo } = body;
    if (!userInfo) {
      return NextResponse.json(
        { error: "userInfo is required" },
        { status: 400 },
      );
    }

    const { name, profession, email, phone, clinicalExperience, aiExposure } =
      userInfo;

    if (!name || !profession || !email) {
      return NextResponse.json(
        { error: "Name, profession, and email are required" },
        { status: 400 },
      );
    }

    const userId = uuidv4();

    let scanResult;
    try {
      const scanCommand = new ScanCommand({
        TableName: DATASET_TABLE,
        FilterExpression: "times_answered < target_evaluations",
      });
      scanResult = await dynamoDb.send(scanCommand);
    } catch (error) {
      console.error("Error scanning dataset table:", error);
      return NextResponse.json(
        {
          error:
            "Database connection failed. Please check your AWS configuration.",
        },
        { status: 500 },
      );
    }

    const availableQuestions: QuestionItem[] = (scanResult.Items ||
      []) as QuestionItem[];

    if (availableQuestions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No questions available for evaluation. All questions may have reached their target evaluations.",
        },
        { status: 404 },
      );
    }

    const uniqueQuestions: QuestionItem[] = [];
    const seenQuestionIds = new Set<string>();

    for (const question of availableQuestions) {
      if (!seenQuestionIds.has(question.question_id)) {
        seenQuestionIds.add(question.question_id);
        uniqueQuestions.push(question);
        if (uniqueQuestions.length >= 20) break;
      }
    }

    if (uniqueQuestions.length === 0) {
      return NextResponse.json(
        {
          error: "No unique questions available for evaluation.",
        },
        { status: 404 },
      );
    }

    const assignedQuestions: QuestionItem[] = [];
    const processedQuestionIds: string[] = [];

    console.log(
      "[v0] Assigning questions:",
      uniqueQuestions.map((q) => q.question_id),
    );

    // First, update the dataset table for each question
    for (const question of uniqueQuestions) {
      if (
        !question.question_id ||
        !question.question_text ||
        !question.llm_response
      ) {
        console.error("[v0] Invalid question data:", question);
        continue;
      }

      try {
        // Update times_answered in dataset table
        const updateCommand = new UpdateCommand({
          TableName: DATASET_TABLE,
          Key: { question_id: question.question_id },
          UpdateExpression:
            "SET times_answered = if_not_exists(times_answered, :zero) + :inc",
          ExpressionAttributeValues: {
            ":inc": 1,
            ":zero": 0,
          },
        });

        await dynamoDb.send(updateCommand);
        processedQuestionIds.push(question.question_id);
        console.log(`[v0] Updated question ${question.question_id}`);
      } catch (error) {
        console.error(
          `[v0] Error updating question ${question.question_id}:`,
          error,
        );
        // Continue with other questions even if one fails
      }
    }

    // Then, create response records for successfully processed questions
    const questionsMap: Record<string, QuestionAssignment> = {};
    for (const question of uniqueQuestions) {
      if (!processedQuestionIds.includes(question.question_id)) {
        continue; // Skip questions that failed to update
      }

      questionsMap[question.question_id] = {
        question_text: question.question_text,
        llm_response: question.llm_response,
        status: "assigned",
        assigned_at: new Date().toISOString(),
      };

      assignedQuestions.push({
        question_id: question.question_id,
        question_text: question.question_text,
        llm_response: question.llm_response,
      });
    }

    // Create single user record with all questions
    if (Object.keys(questionsMap).length > 0) {
      const userResponseItem: UserResponseItem = {
        user_id: userId,
        user_name: name,
        user_profession: profession,
        email: email,
        phone: phone || "",
        clinical_experience: clinicalExperience || "",
        ai_exposure: aiExposure || "",
        questions: questionsMap,
        answers: {}, // Will be populated as user answers questions
        ratings: {}, // Will be populated as user rates responses
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        const putCommand = new PutCommand({
          TableName: RESPONSES_TABLE,
          Item: userResponseItem,
        });

        await dynamoDb.send(putCommand);
        console.log(`[v0] Created user response record for ${userId}`);
      } catch (error) {
        console.error(`[v0] Error creating user response record:`, error);
        return NextResponse.json(
          {
            error: "Failed to create user record. Please try again.",
          },
          { status: 500 },
        );
      }
    }

    if (assignedQuestions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No questions could be successfully assigned. Please try again.",
        },
        { status: 500 },
      );
    }

    console.log(
      `[v0] Successfully assigned ${assignedQuestions.length} questions`,
    );

    return NextResponse.json({
      userId,
      assignedQuestions: assignedQuestions.length,
      message: `Successfully assigned ${assignedQuestions.length} questions`,
    });
  } catch (error) {
    console.error("Error assigning questions:", error);
    return NextResponse.json(
      {
        error:
          "Internal server error. Please check your configuration and try again.",
      },
      { status: 500 },
    );
  }
}
