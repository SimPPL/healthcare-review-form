import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Hardcoded table names for production
const HARDCODED_DATASET_TABLE = "ai4health-dataset";
const HARDCODED_RESPONSES_TABLE = "ai4health-responses";
// Hardcoded region for production
const HARDCODED_REGION = "ap-south-1";

// In production on AWS, we use instance credentials
// In local development, we use environment variables
const IS_LOCAL_DEVELOPMENT = process.env.NODE_ENV === "development";

/**
 * Creates and returns a DynamoDB Document Client
 * This function is meant to be used ONLY in server-side contexts (API routes)
 *
 * In production (AWS), it will use the instance role credentials
 * In local development, it will use environment variables
 */
export function getDynamoDbClient() {
  // Create client config - use hardcoded region for production
  const clientConfig: any = {
    region: process.env.AWS_REGION || HARDCODED_REGION, // Always ensure a region is set
  };

  // For local development, use environment variables if available
  if (IS_LOCAL_DEVELOPMENT) {
    const region = process.env.MY_APP_AWS_REGION || process.env.AWS_REGION;
    const accessKeyId =
      process.env.MY_APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.MY_APP_AWS_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY;

    // Override region if specified for local development
    if (region) {
      clientConfig.region = region;
    }

    // Add credentials only for local development
    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }
  }

  // Initialize client - in AWS this will use instance role credentials automatically
  // In local dev it will use env vars if available
  const client = new DynamoDBClient(clientConfig);

  console.log(
    `DynamoDB client initialized with region: ${clientConfig.region}`,
  );

  // Return the document client for easier interaction with DynamoDB
  return DynamoDBDocumentClient.from(client);
}

// Table names - use environment variables if available, otherwise use hardcoded values
export const DATASET_TABLE =
  process.env.DATASET_TABLE || HARDCODED_DATASET_TABLE;
export const RESPONSES_TABLE =
  process.env.RESPONSES_TABLE || HARDCODED_RESPONSES_TABLE;
