import { type NextRequest, NextResponse } from "next/server";
import {
  getDynamoDbClient,
  DATASET_TABLE,
  RESPONSES_TABLE,
} from "@/lib/aws/dynamodb";
import { ScanCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import {
  Question,
  QuestionAssignment,
  UserInfo,
  UserResponseRecord,
} from "@/types";

// Mapping from profession dropdown values to domain values
const PROFESSION_TO_DOMAIN_MAP: Record<string, string> = {
  "OB/GYN": "Gynecology & Maternal Health",
  "General Practitioner": "General Health & Primary Care",
  Dietitian: "Nutrition & Dietetics",
  Physiotherapist: "Physical Therapy & Recovery",
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

    const { userInfo }: { userInfo: UserInfo } = body;
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

    let userId = uuidv4();
    let existingUser = null;

    try {
      const dynamoDb = getDynamoDbClient();
      const queryCommand = new ScanCommand({
        TableName: RESPONSES_TABLE,
        FilterExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": email,
        },
      });
      const queryResult = await dynamoDb.send(queryCommand);

      if (queryResult.Items && queryResult.Items.length > 0) {
        existingUser = queryResult.Items[0];
        userId = existingUser.user_id;
      }
    } catch (error) {
      // Log error but continue - user lookup failure shouldn't block new user creation
      console.warn("Failed to lookup existing user:", error);
    }

    // Get the domain for the selected profession
    const selectedDomain = PROFESSION_TO_DOMAIN_MAP[profession];
    if (!selectedDomain) {
      return NextResponse.json(
        { error: "Invalid profession selected" },
        { status: 400 },
      );
    }

    let scanResult;
    try {
      const dynamoDb = getDynamoDbClient();
      const scanCommand = new ScanCommand({
        TableName: DATASET_TABLE,
        FilterExpression:
          "(attribute_not_exists(times_answered) OR times_answered < target_evaluations) AND #domain = :domain",
        ExpressionAttributeNames: {
          "#domain": "domain",
        },
        ExpressionAttributeValues: {
          ":domain": selectedDomain,
        },
      });
      scanResult = await dynamoDb.send(scanCommand);
    } catch (error) {
      return NextResponse.json(
        {
          error: `Database connection failed: ${error instanceof Error ? error.message : String(error)}. Please check your AWS configuration.`,
          details: {
            table: DATASET_TABLE,
            region: process.env.AWS_REGION || "Not explicitly set",
            environment: process.env.NODE_ENV,
            errorDetails: error instanceof Error ? error.stack : String(error),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 },
      );
    }

    const availableQuestions: Question[] = (scanResult.Items ||
      []) as Question[];

    if (availableQuestions.length === 0) {
      return NextResponse.json(
        {
          error: `No questions available for evaluation in the ${selectedDomain} domain. All questions may have reached their target evaluations.`,
        },
        { status: 404 },
      );
    }

    // Separate questions into two groups:
    // 1. Questions that haven't been answered yet (times_answered = 0)
    // 2. Questions that have been answered but haven't reached target (times_answered > 0)
    const unansweredQuestions = availableQuestions.filter(
      (q) => (q.times_answered || 0) === 0,
    );
    const partiallyAnsweredQuestions = availableQuestions.filter(
      (q) => (q.times_answered || 0) > 0,
    );

    // Sort unanswered questions by question_id for consistent ordering
    const sortedUnansweredQuestions = unansweredQuestions.sort((a, b) =>
      a.question_id.localeCompare(b.question_id),
    );

    // Shuffle partially answered questions for variety in repeats
    const shuffledPartiallyAnswered = [...partiallyAnsweredQuestions].sort(
      () => Math.random() - 0.5,
    );

    // Combine: first all unanswered questions, then shuffled partially answered
    const prioritizedQuestions = [
      ...sortedUnansweredQuestions,
      ...shuffledPartiallyAnswered,
    ];

    let uniqueQuestions: Question[] = [];
    const seenQuestionIds = new Set<string>();

    // First, try to get unique questions (up to 25)
    for (const question of prioritizedQuestions) {
      if (!seenQuestionIds.has(question.question_id)) {
        seenQuestionIds.add(question.question_id);
        uniqueQuestions.push(question);
        if (uniqueQuestions.length >= 25) break;
      }
    }

    // If we don't have enough unique questions, fill with repeated questions
    if (uniqueQuestions.length < 25) {
      const remainingSlots = 25 - uniqueQuestions.length;

      // Get questions that have been answered but haven't reached target
      // Sort by times_answered (ascending) to prioritize questions that need more evaluations
      const repeatedQuestions = partiallyAnsweredQuestions
        .sort((a, b) => (a.times_answered || 0) - (b.times_answered || 0))
        .slice(0, remainingSlots);

      uniqueQuestions = [...uniqueQuestions, ...repeatedQuestions];
    }

    if (uniqueQuestions.length === 0) {
      return NextResponse.json(
        {
          error: "No questions available for evaluation in this domain.",
        },
        { status: 404 },
      );
    }

    const assignedQuestions: Question[] = [];
    const processedQuestionIds: string[] = [];

    // Check existing user limits early
    if (existingUser) {
      const existingQuestionsAssigned = existingUser.questions_assigned || [];
      const maxQuestions = existingUser.max_questions_assigned || 25;

      // Check if user already has max questions assigned
      if (existingQuestionsAssigned.length >= maxQuestions) {
        return NextResponse.json({
          userId,
          assignedQuestions: existingQuestionsAssigned.length,
          message: `You already have ${existingQuestionsAssigned.length} questions assigned. Please complete your current assignments.`,
          isReturningUser: true,
          reachedLimit: true,
        });
      }

      // Calculate how many more questions we can assign
      const remainingSlots = maxQuestions - existingQuestionsAssigned.length;
      uniqueQuestions = uniqueQuestions.slice(0, remainingSlots);
    }

    // Track processed questions to prevent duplicates
    const processedQuestionIdsSet = new Set<string>();

    for (const question of uniqueQuestions) {
      if (
        !question.question_id ||
        !question.question_text ||
        processedQuestionIdsSet.has(question.question_id)
      ) {
        continue;
      }

      // Just track the question as processed - don't increment times_answered yet
      // times_answered should only be incremented when user completes the question
      processedQuestionIdsSet.add(question.question_id);
      processedQuestionIds.push(question.question_id);
    }

    const questionsMap: Record<string, QuestionAssignment> = {};
    for (const question of uniqueQuestions) {
      if (!question.question_id || !question.question_text) {
        continue;
      }

      questionsMap[question.question_id] = {
        question_text: question.question_text,
        llm_response: question.llm_response || question.answer || "",
        status: "assigned",
        assigned_at: new Date().toISOString(),
      };

      assignedQuestions.push({
        question_id: question.question_id,
        question_text: question.question_text,
        llm_response: question.llm_response || question.answer || "",
      });
    }

    if (Object.keys(questionsMap).length > 0) {
      if (existingUser) {
        try {
          const newQuestionIds = Object.keys(questionsMap);
          const existingQuestionsAssigned =
            existingUser.questions_assigned || [];

          const updatedQuestionsAssigned = [
            ...new Set([...existingQuestionsAssigned, ...newQuestionIds]),
          ];

          const newStatuses = Object.fromEntries(
            newQuestionIds.map((id) => [id, "assigned" as const]),
          );

          const updateCommand = new UpdateCommand({
            TableName: RESPONSES_TABLE,
            Key: { user_id: userId },
            UpdateExpression:
              "SET questions = :questions, questions_assigned = :questionsAssigned, #s = :status, updated_at = :updatedAt, user_name = :userName, medical_profession = :profession, max_questions_assigned = if_not_exists(max_questions_assigned, :defaultMax)",
            ExpressionAttributeNames: {
              "#s": "status",
            },
            ExpressionAttributeValues: {
              ":questions": { ...(existingUser.questions || {}), ...questionsMap },
              ":questionsAssigned": updatedQuestionsAssigned,
              ":status": { ...(existingUser.status || {}), ...newStatuses },
              ":updatedAt": new Date().toISOString(),
              ":userName": name,
              ":profession": profession,
              ":defaultMax": 25,
            },
          });

          const dynamoDb = getDynamoDbClient();
          await dynamoDb.send(updateCommand);
        } catch (error) {
          return NextResponse.json(
            {
              error: "Failed to update user record. Please try again.",
            },
            { status: 500 },
          );
        }
      } else {
        const questionIds = Object.keys(questionsMap);
        const userResponseItem: UserResponseRecord = {
          user_id: userId,
          user_name: name,
          email: email,
          medical_profession: profession,
          phone_number: phone || undefined,
          clinical_experience: clinicalExperience || undefined,
          ai_exposure: aiExposure || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          questions_assigned: questionIds,
          max_questions_assigned: 25,
          questions_answered: 0,
          unbiased_answer: {},
          edited_answer: {},
          status: Object.fromEntries(
            questionIds.map((id: string) => [id, "assigned" as const]),
          ),
          list_of_rubrics_picked: {},
          edited_rubrics: {},
          additional_feedback: {},
          rubric_evaluations: {},
          questions: questionsMap,
        };

        try {
          const putCommand = new PutCommand({
            TableName: RESPONSES_TABLE,
            Item: userResponseItem,
          });

          const dynamoDb = getDynamoDbClient();
          await dynamoDb.send(putCommand);
        } catch (error) {
          return NextResponse.json(
            {
              error: "Failed to create user record. Please try again.",
            },
            { status: 500 },
          );
        }
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

    return NextResponse.json({
      userId,
      assignedQuestions: assignedQuestions.length,
      message: existingUser
        ? `Welcome back! Added ${assignedQuestions.length} new questions to your existing set.`
        : `Successfully assigned ${assignedQuestions.length} questions`,
      isReturningUser: !!existingUser,
    });
  } catch (error) {
    const missingVars = [];
    if (!process.env.DATASET_TABLE && process.env.NODE_ENV === "development")
      missingVars.push("DATASET_TABLE");
    if (!process.env.RESPONSES_TABLE && process.env.NODE_ENV === "development")
      missingVars.push("RESPONSES_TABLE");

    return NextResponse.json(
      {
        error: `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
        details: {
          missingEnvironmentVariables:
            missingVars.length > 0 ? missingVars : undefined,
          datasetTable: DATASET_TABLE,
          responsesTable: RESPONSES_TABLE,
          region: process.env.AWS_REGION || "Not explicitly set",
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString(),
          errorType: (error as any)?.constructor?.name || typeof error,
        },
      },
      { status: 500 },
    );
  }
}
