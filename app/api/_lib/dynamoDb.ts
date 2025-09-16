import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * Creates and returns a DynamoDB Document Client
 * This function is meant to be used ONLY in server-side contexts (API routes)
 */
export function getDynamoDbClient() {
  // Check for required environment variables
  if (!process.env.MY_APP_AWS_REGION) {
    throw new Error("MY_APP_AWS_REGION environment variable is required");
  }
  if (!process.env.MY_APP_AWS_ACCESS_KEY_ID) {
    throw new Error(
      "MY_APP_AWS_ACCESS_KEY_ID environment variable is required",
    );
  }
  if (!process.env.MY_APP_AWS_SECRET_ACCESS_KEY) {
    throw new Error(
      "MY_APP_AWS_SECRET_ACCESS_KEY environment variable is required",
    );
  }

  // Initialize the DynamoDB client
  const client = new DynamoDBClient({
    region: process.env.MY_APP_AWS_REGION,
    credentials: {
      accessKeyId: process.env.MY_APP_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.MY_APP_AWS_SECRET_ACCESS_KEY,
    },
  });

  // Return the document client for easier interaction with DynamoDB
  return DynamoDBDocumentClient.from(client);
}

// Table names are safe to export as constants
export const DATASET_TABLE = process.env.DATASET_TABLE || "ai4health-dataset";
export const RESPONSES_TABLE =
  process.env.RESPONSES_TABLE || "ai4health-responses";
