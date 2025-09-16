import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * Creates and returns a DynamoDB Document Client
 * This function is meant to be used ONLY in server-side contexts (API routes)
 */
export function getDynamoDbClient() {
  // Get region from either custom or standard environment variable
  const region = process.env.MY_APP_AWS_REGION || process.env.AWS_REGION;
  if (!region) {
    throw new Error("AWS region is required (MY_APP_AWS_REGION or AWS_REGION)");
  }

  // Get access key from either custom or standard environment variable
  const accessKeyId =
    process.env.MY_APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  if (!accessKeyId) {
    throw new Error(
      "AWS access key ID is required (MY_APP_AWS_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID)",
    );
  }

  // Get secret key from either custom or standard environment variable
  const secretAccessKey =
    process.env.MY_APP_AWS_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY;
  if (!secretAccessKey) {
    throw new Error(
      "AWS secret access key is required (MY_APP_AWS_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY)",
    );
  }

  // Initialize the DynamoDB client with the available credentials
  const client = new DynamoDBClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  // Return the document client for easier interaction with DynamoDB
  return DynamoDBDocumentClient.from(client);
}

// Table names are safe to export as constants - use either custom or default values
export const DATASET_TABLE = process.env.DATASET_TABLE || "ai4health-dataset";
export const RESPONSES_TABLE =
  process.env.RESPONSES_TABLE || "ai4health-responses";
