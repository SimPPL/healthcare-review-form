import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Hardcoded table names for production
const HARDCODED_DATASET_TABLE = "ai4health-dataset";
const HARDCODED_RESPONSES_TABLE = "ai4health-responses";

/**
 * Creates and returns a DynamoDB Document Client
 * This function is meant to be used ONLY in server-side contexts (API routes)
 *
 * In production (AWS), it will use the instance role credentials
 * In local development, it will use environment variables
 */
export function getDynamoDbClient() {
  // Create client config - empty by default for AWS instance role
  const clientConfig: any = {};

  // For local development, use environment variables if available
  const region = process.env.MY_APP_AWS_REGION || process.env.AWS_REGION;
  const accessKeyId =
    process.env.MY_APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.MY_APP_AWS_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY;

  // If we have credentials from environment variables, use them (for local dev)
  if (region) {
    clientConfig.region = region;
  }

  if (accessKeyId && secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId,
      secretAccessKey,
    };
  }

  // Initialize client - in AWS this will use instance role
  // In local dev it will use env vars if available
  const client = new DynamoDBClient(clientConfig);

  // Return the document client for easier interaction with DynamoDB
  return DynamoDBDocumentClient.from(client);
}

// Table names - use environment variables if available, otherwise use hardcoded values
export const DATASET_TABLE =
  process.env.DATASET_TABLE || HARDCODED_DATASET_TABLE;
export const RESPONSES_TABLE =
  process.env.RESPONSES_TABLE || HARDCODED_RESPONSES_TABLE;
