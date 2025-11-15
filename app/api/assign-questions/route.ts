import { type NextRequest, NextResponse } from "next/server";
import {
  getDynamoDbClient,
  DATASET_TABLE,
  RESPONSES_TABLE,
} from "@/lib/aws/dynamodb";
import {
  ScanCommand,
  QueryCommand,
  UpdateCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import {
  Question,
  QuestionAssignment,
  UserInfo,
  UserResponseRecord,
} from "@/types";

const PROFESSION_TO_DOMAIN_MAP: Record<string, string> = {
  "OB/GYN": "Gynecology & Maternal Health",
  "General Practitioner": "General Health & Primary Care",
  Dietitian: "Nutrition & Dietetics",
  Physiotherapist: "Physical Therapy & Recovery",
};

const MAX_QUESTIONS_PER_USER = 25;
const MAX_ASSIGNMENTS_PER_QUESTION = 2;

async function lookupUserByEmail(email: string): Promise<any | null> {
  const dynamoDb = getDynamoDbClient();

  try {
    const queryCommand = new QueryCommand({
      TableName: RESPONSES_TABLE,
      IndexName: "email-index",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
      Limit: 1,
    });

    const queryResult = await dynamoDb.send(queryCommand);

    if (queryResult.Items && queryResult.Items.length > 0) {
      return queryResult.Items[0];
    }
  } catch (error: any) {
    if (
      error.name === "ResourceNotFoundException" ||
      error.code === "ResourceNotFoundException"
    ) {
      console.warn(
        "email-index GSI not found, falling back to Scan for user lookup",
      );
    } else {
      throw error;
    }
  }

  const scanCommand = new ScanCommand({
    TableName: RESPONSES_TABLE,
    FilterExpression: "email = :email",
    ExpressionAttributeValues: {
      ":email": email,
    },
    Limit: 1,
  });

  const scanResult = await dynamoDb.send(scanCommand);

  if (scanResult.Items && scanResult.Items.length > 0) {
    if (scanResult.Items.length > 1) {
      console.warn(
        `Multiple users found with email ${email}, returning first match`,
      );
    }
    return scanResult.Items[0];
  }

  return null;
}

async function checkAllDomainsForNeverAssigned(): Promise<boolean> {
  try {
    const dynamoDb = getDynamoDbClient();
    const scanCommand = new ScanCommand({
      TableName: DATASET_TABLE,
      FilterExpression:
        "(attribute_not_exists(assigned_count) OR assigned_count = :zero) AND (attribute_not_exists(times_answered) OR times_answered < target_evaluations)",
      ExpressionAttributeValues: {
        ":zero": 0,
      },
      Limit: 1,
      ProjectionExpression: "question_id",
    });

    const result = await dynamoDb.send(scanCommand);
    return (result.Items?.length || 0) > 0;
  } catch (error) {
    console.error("Error checking all domains for never-assigned questions:", error);
    return true;
  }
}

async function fetchQuestions(
  domain: string | null,
  criteria: {
    assignedCount?: number;
    timesAnswered?: number;
    excludeDomain?: string;
    maxItems?: number;
  },
): Promise<Question[]> {
  const dynamoDb = getDynamoDbClient();
  const { assignedCount, timesAnswered, excludeDomain, maxItems } = criteria;

  let filterExpression = "(attribute_not_exists(times_answered) OR times_answered < target_evaluations)";
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  if (assignedCount !== undefined) {
    if (assignedCount === 0) {
      filterExpression +=
        " AND (attribute_not_exists(assigned_count) OR assigned_count = :zero)";
      expressionAttributeValues[":zero"] = 0;
    } else {
      filterExpression += " AND (attribute_not_exists(assigned_count) OR assigned_count < :maxAssignments)";
      expressionAttributeValues[":maxAssignments"] = MAX_ASSIGNMENTS_PER_QUESTION;
    }
  }

  if (timesAnswered !== undefined) {
    if (timesAnswered === 0) {
      filterExpression += " AND (attribute_not_exists(times_answered) OR times_answered = :zeroAnswered)";
      expressionAttributeValues[":zeroAnswered"] = 0;
    }
  }

  if (domain) {
    filterExpression += " AND #domain = :domain";
    expressionAttributeNames["#domain"] = "domain";
    expressionAttributeValues[":domain"] = domain;
  } else if (excludeDomain) {
    filterExpression += " AND (attribute_not_exists(#domain) OR #domain <> :excludeDomain)";
    expressionAttributeNames["#domain"] = "domain";
    expressionAttributeValues[":excludeDomain"] = excludeDomain;
  }

  const scanCommand = new ScanCommand({
    TableName: DATASET_TABLE,
    FilterExpression: filterExpression,
    ExpressionAttributeNames:
      Object.keys(expressionAttributeNames).length > 0
        ? expressionAttributeNames
        : undefined,
    ExpressionAttributeValues: expressionAttributeValues,
    ...(maxItems && { Limit: maxItems }),
  });

  const result = await dynamoDb.send(scanCommand);
  return (result.Items || []) as Question[];
}

async function rollbackAssignments(
  questionIds: string[],
): Promise<void> {
  const dynamoDb = getDynamoDbClient();

  const rollbackPromises = questionIds.map((questionId) => {
    const updateCommand = new UpdateCommand({
      TableName: DATASET_TABLE,
      Key: { question_id: questionId },
      UpdateExpression: "SET assigned_count = if_not_exists(assigned_count, :zero) - :dec",
      ConditionExpression: "if_not_exists(assigned_count, :zero) > :zero",
      ExpressionAttributeValues: {
        ":dec": 1,
        ":zero": 0,
      },
    });

    return dynamoDb.send(updateCommand).catch((error) => {
      console.error(
        `Failed to rollback assigned_count for question ${questionId}:`,
        error,
      );
    });
  });

  await Promise.all(rollbackPromises);
}

export async function POST(request: NextRequest) {
  const processedQuestionIds: string[] = [];

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
      existingUser = await lookupUserByEmail(email);
      if (existingUser) {
        userId = existingUser.user_id;
      }
    } catch (error) {
      console.error("Failed to lookup existing user:", error);
    }

    const selectedDomain = PROFESSION_TO_DOMAIN_MAP[profession];
    if (!selectedDomain) {
      return NextResponse.json(
        { error: "Invalid profession selected" },
        { status: 400 },
      );
    }

    const hasNeverAssignedQuestions =
      await checkAllDomainsForNeverAssigned();

    let uniqueQuestions: Question[] = [];
    const seenQuestionIds = new Set<string>();

    if (hasNeverAssignedQuestions) {
      const selectedDomainQuestions = await fetchQuestions(selectedDomain, {
        assignedCount: 0,
        maxItems: MAX_QUESTIONS_PER_USER,
      });

      const sortedSelected = selectedDomainQuestions
        .filter((q) => q.question_id && q.question_text)
        .sort((a, b) => (a.question_id || "").localeCompare(b.question_id || ""));

      for (const question of sortedSelected) {
        if (question.question_id && !seenQuestionIds.has(question.question_id)) {
          seenQuestionIds.add(question.question_id);
          uniqueQuestions.push(question);
          if (uniqueQuestions.length >= MAX_QUESTIONS_PER_USER) break;
        }
      }

      if (uniqueQuestions.length < MAX_QUESTIONS_PER_USER) {
        const otherDomainsQuestions = await fetchQuestions(null, {
          assignedCount: 0,
          excludeDomain: selectedDomain,
          maxItems: MAX_QUESTIONS_PER_USER * 2,
        });

        const shuffled = [...otherDomainsQuestions].sort(
          () => Math.random() - 0.5,
        );

        const remainingSlots =
          MAX_QUESTIONS_PER_USER - uniqueQuestions.length;
        for (const question of shuffled) {
          if (
            question.question_id &&
            !seenQuestionIds.has(question.question_id) &&
            (question.assigned_count || 0) === 0
          ) {
            seenQuestionIds.add(question.question_id);
            uniqueQuestions.push(question);
            if (uniqueQuestions.length >= MAX_QUESTIONS_PER_USER) break;
          }
        }
      }
    } else {
      const unansweredSelected = await fetchQuestions(selectedDomain, {
        assignedCount: 1,
        timesAnswered: 0,
        maxItems: MAX_QUESTIONS_PER_USER,
      });

      const sortedUnanswered = unansweredSelected
        .filter((q) => q.question_id && (q.assigned_count || 0) < MAX_ASSIGNMENTS_PER_QUESTION)
        .sort((a, b) => (a.question_id || "").localeCompare(b.question_id || ""));

      for (const question of sortedUnanswered) {
        if (question.question_id && !seenQuestionIds.has(question.question_id)) {
          seenQuestionIds.add(question.question_id);
          uniqueQuestions.push(question);
          if (uniqueQuestions.length >= MAX_QUESTIONS_PER_USER) break;
        }
      }

      if (uniqueQuestions.length < MAX_QUESTIONS_PER_USER) {
        const unansweredOther = await fetchQuestions(null, {
          assignedCount: 1,
          timesAnswered: 0,
          excludeDomain: selectedDomain,
          maxItems: MAX_QUESTIONS_PER_USER * 2,
        });

        const filtered = unansweredOther.filter(
          (q) =>
            q.question_id &&
            !seenQuestionIds.has(q.question_id) &&
            (q.assigned_count || 0) < MAX_ASSIGNMENTS_PER_QUESTION,
        );

        const shuffled = [...filtered].sort(() => Math.random() - 0.5);
        const remainingSlots =
          MAX_QUESTIONS_PER_USER - uniqueQuestions.length;

        for (const question of shuffled) {
          if (question.question_id) {
            seenQuestionIds.add(question.question_id);
            uniqueQuestions.push(question);
            if (uniqueQuestions.length >= MAX_QUESTIONS_PER_USER) break;
          }
        }
      }

      if (uniqueQuestions.length < MAX_QUESTIONS_PER_USER) {
        const partiallyAnsweredSelected = await fetchQuestions(
          selectedDomain,
          {
            assignedCount: 1,
            maxItems: MAX_QUESTIONS_PER_USER * 2,
          },
        );

        const filtered = partiallyAnsweredSelected.filter(
          (q) =>
            q.question_id &&
            !seenQuestionIds.has(q.question_id) &&
            (q.assigned_count || 0) < MAX_ASSIGNMENTS_PER_QUESTION &&
            (q.times_answered || 0) > 0,
        );

        const shuffled = [...filtered]
          .sort((a, b) => (a.times_answered || 0) - (b.times_answered || 0))
          .sort(() => Math.random() - 0.5);

        const remainingSlots =
          MAX_QUESTIONS_PER_USER - uniqueQuestions.length;
        for (const question of shuffled.slice(0, remainingSlots)) {
          if (question.question_id) {
            seenQuestionIds.add(question.question_id);
            uniqueQuestions.push(question);
            if (uniqueQuestions.length >= MAX_QUESTIONS_PER_USER) break;
          }
        }
      }

      if (uniqueQuestions.length < MAX_QUESTIONS_PER_USER) {
        const partiallyAnsweredOther = await fetchQuestions(null, {
          assignedCount: 1,
          excludeDomain: selectedDomain,
          maxItems: MAX_QUESTIONS_PER_USER * 2,
        });

        const filtered = partiallyAnsweredOther.filter(
          (q) =>
            q.question_id &&
            !seenQuestionIds.has(q.question_id) &&
            (q.assigned_count || 0) < MAX_ASSIGNMENTS_PER_QUESTION &&
            (q.times_answered || 0) > 0,
        );

        const shuffled = [...filtered]
          .sort((a, b) => (a.times_answered || 0) - (b.times_answered || 0))
          .sort(() => Math.random() - 0.5);

        const remainingSlots =
          MAX_QUESTIONS_PER_USER - uniqueQuestions.length;
        for (const question of shuffled.slice(0, remainingSlots)) {
          if (question.question_id) {
            seenQuestionIds.add(question.question_id);
            uniqueQuestions.push(question);
            if (uniqueQuestions.length >= MAX_QUESTIONS_PER_USER) break;
          }
        }
      }
    }

    if (uniqueQuestions.length === 0) {
      return NextResponse.json(
        {
          error: "No questions available for assignment at this time.",
        },
        { status: 404 },
      );
    }

    if (existingUser) {
      const existingQuestionsAssigned = existingUser.questions_assigned || [];
      const maxQuestions = existingUser.max_questions_assigned || MAX_QUESTIONS_PER_USER;

      if (existingQuestionsAssigned.length >= maxQuestions) {
        return NextResponse.json({
          userId,
          assignedQuestions: existingQuestionsAssigned.length,
          message: `You already have ${existingQuestionsAssigned.length} questions assigned. Please complete your current assignments.`,
          isReturningUser: true,
          reachedLimit: true,
        });
      }

      const validExistingQuestions = existingQuestionsAssigned.filter(
        (id: any) => id && typeof id === "string"
      );
      const existingQuestionsSet = new Set(validExistingQuestions);
      uniqueQuestions = uniqueQuestions.filter(
        (q) => q.question_id && !existingQuestionsSet.has(q.question_id),
      );

      const remainingSlots = maxQuestions - existingQuestionsAssigned.length;
      uniqueQuestions = uniqueQuestions.slice(0, remainingSlots);
    }

    const processedQuestionIdsSet = new Set<string>();
    const failedQuestionIds: string[] = [];

    for (const question of uniqueQuestions) {
      if (
        !question.question_id ||
        !question.question_text ||
        processedQuestionIdsSet.has(question.question_id)
      ) {
        continue;
      }

      try {
        const dynamoDb = getDynamoDbClient();
        const updateCommand = new UpdateCommand({
          TableName: DATASET_TABLE,
          Key: { question_id: question.question_id },
          UpdateExpression:
            "SET assigned_count = if_not_exists(assigned_count, :zero) + :inc",
          ConditionExpression: hasNeverAssignedQuestions
            ? "(attribute_not_exists(assigned_count) OR assigned_count = :zero)"
            : "(attribute_not_exists(assigned_count) OR assigned_count < :maxAssignments)",
          ExpressionAttributeValues: hasNeverAssignedQuestions
            ? {
                ":inc": 1,
                ":zero": 0,
              }
            : {
                ":inc": 1,
                ":zero": 0,
                ":maxAssignments": MAX_ASSIGNMENTS_PER_QUESTION,
              },
        });
        await dynamoDb.send(updateCommand);

        processedQuestionIdsSet.add(question.question_id);
        processedQuestionIds.push(question.question_id);
      } catch (error: any) {
        if (
          error.name === "ConditionalCheckFailedException" ||
          error.code === "ConditionalCheckFailedException"
        ) {
          console.warn(
            `Question ${question.question_id} already at max assignments, skipping`,
          );
        } else {
          console.error(
            `Failed to update assigned_count for question ${question.question_id}:`,
            error,
          );
          failedQuestionIds.push(question.question_id);
        }
      }
    }

    const successfullyProcessedQuestions = uniqueQuestions.filter((q) =>
      q.question_id && q.question_text && processedQuestionIdsSet.has(q.question_id),
    );

    if (successfullyProcessedQuestions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No questions could be successfully assigned. All available questions may have reached maximum assignments.",
        },
        { status: 409 },
      );
    }

    const questionsMap: Record<string, QuestionAssignment> = {};
    const assignedQuestions: Question[] = [];

    for (const question of successfullyProcessedQuestions) {
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
        domain: question.domain,
        target_evaluations: question.target_evaluations,
      });
    }

    try {
      if (existingUser) {
        const newQuestionIds = Object.keys(questionsMap);
        const existingQuestionsAssigned =
          existingUser.questions_assigned || [];
        const existingQuestions = existingUser.questions || {};
        const existingStatus = existingUser.status || {};

        const updatedQuestionsAssigned = [
          ...new Set([
            ...existingQuestionsAssigned.filter((id: string) => id && typeof id === "string"),
            ...newQuestionIds,
          ]),
        ];

        const newStatuses = Object.fromEntries(
          newQuestionIds.map((id) => [id, "assigned" as const]),
        );

        const dynamoDb = getDynamoDbClient();
        const updateCommand = new UpdateCommand({
          TableName: RESPONSES_TABLE,
          Key: { user_id: userId },
          UpdateExpression:
            "SET questions = :questions, questions_assigned = :questionsAssigned, #s = :status, updated_at = :updatedAt, user_name = :userName, medical_profession = :profession, max_questions_assigned = if_not_exists(max_questions_assigned, :defaultMax)",
          ExpressionAttributeNames: {
            "#s": "status",
          },
          ExpressionAttributeValues: {
            ":questions": { ...existingQuestions, ...questionsMap },
            ":questionsAssigned": updatedQuestionsAssigned,
            ":status": { ...existingStatus, ...newStatuses },
            ":updatedAt": new Date().toISOString(),
            ":userName": name,
            ":profession": profession,
            ":defaultMax": MAX_QUESTIONS_PER_USER,
          },
        });

        await dynamoDb.send(updateCommand);
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
          max_questions_assigned: MAX_QUESTIONS_PER_USER,
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

        const dynamoDb = getDynamoDbClient();
        const putCommand = new PutCommand({
          TableName: RESPONSES_TABLE,
          Item: userResponseItem,
        });

        await dynamoDb.send(putCommand);
      }
    } catch (error) {
      console.error("Failed to update user record, rolling back assignments:", error);
      await rollbackAssignments(processedQuestionIds);

      return NextResponse.json(
        {
          error: "Failed to save assignment. Please try again.",
        },
        { status: 500 },
      );
    }

    const isPartialAssignment =
      successfullyProcessedQuestions.length < MAX_QUESTIONS_PER_USER &&
      !existingUser;

    return NextResponse.json({
      userId,
      assignedQuestions: successfullyProcessedQuestions.length,
      questions: assignedQuestions,
      message: existingUser
        ? `Welcome back! Added ${successfullyProcessedQuestions.length} new question${successfullyProcessedQuestions.length !== 1 ? "s" : ""} to your existing set.`
        : isPartialAssignment
          ? `Assigned ${successfullyProcessedQuestions.length} question${successfullyProcessedQuestions.length !== 1 ? "s" : ""} (fewer than the maximum of ${MAX_QUESTIONS_PER_USER} due to limited availability).`
          : `Successfully assigned ${successfullyProcessedQuestions.length} question${successfullyProcessedQuestions.length !== 1 ? "s" : ""}.`,
      isReturningUser: !!existingUser,
      isPartialAssignment,
      failedQuestions: failedQuestionIds.length > 0 ? failedQuestionIds.length : undefined,
    });
  } catch (error) {
    if (processedQuestionIds.length > 0) {
      console.error("Unexpected error, rolling back assignments:", error);
      await rollbackAssignments(processedQuestionIds).catch((rollbackError) => {
        console.error("Failed to rollback assignments:", rollbackError);
      });
    }

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
