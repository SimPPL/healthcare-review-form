/**
 * Server-side AWS operations helper
 * This file contains all the AWS SDK logic and should ONLY be imported in server components or API routes
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
  PutCommand,
  GetCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";

// Load environment variables - these are only available server-side
if (!process.env.MY_APP_AWS_REGION) {
  throw new Error("MY_APP_AWS_REGION environment variable is required");
}
if (!process.env.MY_APP_AWS_ACCESS_KEY_ID) {
  throw new Error("MY_APP_AWS_ACCESS_KEY_ID environment variable is required");
}
if (!process.env.MY_APP_AWS_SECRET_ACCESS_KEY) {
  throw new Error("MY_APP_AWS_SECRET_ACCESS_KEY environment variable is required");
}
if (!process.env.DATASET_TABLE) {
  throw new Error("DATASET_TABLE environment variable is required");
}
if (!process.env.RESPONSES_TABLE) {
  throw new Error("RESPONSES_TABLE environment variable is required");
}

// Initialize the DynamoDB client (only once)
const client = new DynamoDBClient({
  region: process.env.MY_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MY_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_APP_AWS_SECRET_ACCESS_KEY,
  },
});

// Export the document client for complex operations
export const dynamoDb = DynamoDBDocumentClient.from(client);

// Export table names
export const DATASET_TABLE = process.env.DATASET_TABLE;
export const RESPONSES_TABLE = process.env.RESPONSES_TABLE;

// Types
export type QuestionItem = {
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

export type QuestionAssignment = {
  question_text: string;
  llm_response: string;
  answer?: string;
  answer_hindi?: string;
  answer_marathi?: string;
  status: string;
  assigned_at: string;
};

export type UserResponseItem = {
  user_id: string;
  user_name: string;
  user_profession: string;
  email: string;
  phone?: string;
  clinical_experience?: string;
  ai_exposure?: string;
  questions: Record<string, QuestionAssignment>;
  answers: Record<string, Partial<QuestionItem>>; // now includes extra fields
  ratings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UserInfo = {
  name: string;
  profession: string;
  email: string;
  phone?: string;
  clinicalExperience?: string;
  aiExposure?: string;
};

// Helper functions for common AWS operations
export async function getAvailableQuestions(limit: number = 20): Promise<QuestionItem[]> {
  try {
    const scanCommand = new ScanCommand({
      TableName: DATASET_TABLE,
      FilterExpression: "times_answered < target_evaluations",
    });

    const result = await dynamoDb.send(scanCommand);

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    // Get unique questions (by question_id)
    const uniqueQuestions: QuestionItem[] = [];
    const seenQuestionIds = new Set<string>();

    for (const question of result.Items as QuestionItem[]) {
      if (!seenQuestionIds.has(question.question_id)) {
        seenQuestionIds.add(question.question_id);
        uniqueQuestions.push(question);
        if (uniqueQuestions.length >= limit) break;
      }
    }

    return uniqueQuestions;
  } catch (error) {
    console.error("Error getting available questions:", error);
    throw new Error(`Failed to get available questions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function incrementQuestionUsage(questionId: string): Promise<void> {
  try {
    const updateCommand = new UpdateCommand({
      TableName: DATASET_TABLE,
      Key: { question_id: questionId },
      UpdateExpression: "SET times_answered = if_not_exists(times_answered, :zero) + :inc",
      ExpressionAttributeValues: {
        ":inc": 1,
        ":zero": 0,
      },
    });

    await dynamoDb.send(updateCommand);
  } catch (error) {
    console.error(`Error incrementing usage for question ${questionId}:`, error);
    throw new Error(`Failed to update question usage: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function createUserResponse(userResponse: UserResponseItem): Promise<void> {
  try {
    const putCommand = new PutCommand({
      TableName: RESPONSES_TABLE,
      Item: userResponse,
    });

    await dynamoDb.send(putCommand);
  } catch (error) {
    console.error("Error creating user response:", error);
    throw new Error(`Failed to create user response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getUserResponse(userId: string): Promise<UserResponseItem | null> {
  try {
    const getCommand = new GetCommand({
      TableName: RESPONSES_TABLE,
      Key: { user_id: userId },
    });

    const result = await dynamoDb.send(getCommand);

    if (!result.Item) {
      return null;
    }

    return result.Item as UserResponseItem;
  } catch (error) {
    console.error(`Error getting user response for ${userId}:`, error);
    throw new Error(`Failed to get user response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function updateUserAnswer(
  userId: string,
  questionId: string,
  answer: Partial<QuestionItem>
): Promise<void> {
  try {
    const updateCommand = new UpdateCommand({
      TableName: RESPONSES_TABLE,
      Key: { user_id: userId },
      UpdateExpression: "SET answers.#qid = :answer, updated_at = :updated",
      ExpressionAttributeNames: {
        "#qid": questionId,
      },
      ExpressionAttributeValues: {
        ":answer": answer,
        ":updated": new Date().toISOString(),
      },
    });

    await dynamoDb.send(updateCommand);
  } catch (error) {
    console.error(`Error updating answer for user ${userId}, question ${questionId}:`, error);
    throw new Error(`Failed to save answer: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function updateUserRating(
  userId: string,
  questionId: string,
  rating: unknown
): Promise<void> {
  try {
    const updateCommand = new UpdateCommand({
      TableName: RESPONSES_TABLE,
      Key: { user_id: userId },
      UpdateExpression: "SET ratings.#qid = :rating, updated_at = :updated",
      ExpressionAttributeNames: {
        "#qid": questionId,
      },
      ExpressionAttributeValues: {
        ":rating": rating,
        ":updated": new Date().toISOString(),
      },
    });

    await dynamoDb.send(updateCommand);
  } catch (error) {
    console.error(`Error updating rating for user ${userId}, question ${questionId}:`, error);
    throw new Error(`Failed to save rating: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Debug helper
export async function getDynamoDbStatus(): Promise<{
  success: boolean;
  environment: Record<string, string>;
  clientTest: string;
  tablesExist?: boolean;
}> {
  try {
    // Check environment variables
    const envVars = {
      MY_APP_AWS_REGION: process.env.MY_APP_AWS_REGION || "Not set",
      MY_APP_AWS_ACCESS_KEY_ID: process.env.MY_APP_AWS_ACCESS_KEY_ID
        ? `Set (length: ${process.env.MY_APP_AWS_ACCESS_KEY_ID.length})`
        : "Not set",
      MY_APP_AWS_SECRET_ACCESS_KEY: process.env.MY_APP_AWS_SECRET_ACCESS_KEY
        ? `Set (length: ${process.env.MY_APP_AWS_SECRET_ACCESS_KEY.length})`
        : "Not set",
      DATASET_TABLE: process.env.DATASET_TABLE || "Not set",
      RESPONSES_TABLE: process.env.RESPONSES_TABLE || "Not set",
    };

    // Test if tables exist
    let tablesExist = false;
    try {
      // Try a simple scan with limit 1 to check if tables exist
      const scanCommand = new ScanCommand({
        TableName: DATASET_TABLE,
        Limit: 1,
      });
      await dynamoDb.send(scanCommand);
      tablesExist = true;
    } catch (tableError) {
      console.error("Error checking tables:", tableError);
      tablesExist = false;
    }

    return {
      success: true,
      environment: envVars,
      clientTest: "Client initialized successfully",
      tablesExist,
    };
  } catch (error) {
    console.error("Error getting DynamoDB status:", error);
    return {
      success: false,
      environment: {
        MY_APP_AWS_REGION: process.env.MY_APP_AWS_REGION || "Not set",
        MY_APP_AWS_ACCESS_KEY_ID: process.env.MY_APP_AWS_ACCESS_KEY_ID ? "Set (but error occurred)" : "Not set",
        MY_APP_AWS_SECRET_ACCESS_KEY: process.env.MY_APP_AWS_SECRET_ACCESS_KEY ? "Set (but error occurred)" : "Not set",
        DATASET_TABLE: process.env.DATASET_TABLE || "Not set",
        RESPONSES_TABLE: process.env.RESPONSES_TABLE || "Not set",
      },
      clientTest: `Client initialization failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
