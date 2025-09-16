import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Hardcoded table names for production
const HARDCODED_DATASET_TABLE = "ai4health-dataset";
const HARDCODED_RESPONSES_TABLE = "ai4health-responses";
// Hardcoded region for production
const HARDCODED_REGION = "ap-south-1";

// In production on AWS, we use instance role credentials (Amplify service role)
// In local development, we use environment variables
const IS_LOCAL_DEVELOPMENT =
  process.env.NODE_ENV === "development" || !process.env.AWS_EXECUTION_ENV;

/**
 * Creates and returns a DynamoDB Document Client
 * This function is meant to be used ONLY in server-side contexts (API routes)
 *
 * In production (AWS), it will use the instance role credentials
 * In local development, it will use environment variables
 */
export function getDynamoDbClient() {
  // Debug environment information
  console.log("=== DynamoDB Client Debug Info ===");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("AWS_EXECUTION_ENV:", process.env.AWS_EXECUTION_ENV);
  console.log("AWS_REGION:", process.env.AWS_REGION);
  console.log("IS_LOCAL_DEVELOPMENT:", IS_LOCAL_DEVELOPMENT);
  console.log("Available AWS env vars:", {
    AWS_REGION: !!process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
    MY_APP_AWS_REGION: !!process.env.MY_APP_AWS_REGION,
    MY_APP_AWS_ACCESS_KEY_ID: !!process.env.MY_APP_AWS_ACCESS_KEY_ID,
    MY_APP_AWS_SECRET_ACCESS_KEY: !!process.env.MY_APP_AWS_SECRET_ACCESS_KEY,
  });

  // Create client config - use hardcoded region for production
  const clientConfig: any = {
    region: process.env.AWS_REGION || HARDCODED_REGION, // Always ensure a region is set
  };

  // For local development only, use environment variables if available
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
      console.log("✅ Using local development credentials");
    } else {
      console.warn(
        "⚠️ Local development mode but no AWS credentials found in environment variables",
      );
    }
  } else {
    // In production (AWS), rely on the Amplify service role for credentials
    console.log("🚀 Using AWS service role credentials (production mode)");

    // Additional debugging for production
    console.log("AWS Lambda Context:", {
      AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
      AWS_LAMBDA_FUNCTION_VERSION: process.env.AWS_LAMBDA_FUNCTION_VERSION,
      _X_AMZN_TRACE_ID: !!process.env._X_AMZN_TRACE_ID,
    });
  }

  console.log("Final client config:", {
    region: clientConfig.region,
    hasCredentials: !!clientConfig.credentials,
  });

  try {
    // Initialize client - in AWS this will use Amplify service role credentials automatically
    // In local dev it will use env vars if available
    const client = new DynamoDBClient(clientConfig);

    console.log(
      `✅ DynamoDB client initialized successfully`,
      `Region: ${clientConfig.region}`,
      `Environment: ${IS_LOCAL_DEVELOPMENT ? "local development" : "production (AWS)"}`,
    );

    // Return the document client for easier interaction with DynamoDB
    return DynamoDBDocumentClient.from(client);
  } catch (error) {
    console.error("❌ Failed to initialize DynamoDB client:", error);
    throw error;
  }
}

// Table names - use environment variables if available, otherwise use hardcoded values
export const DATASET_TABLE =
  process.env.DATASET_TABLE || HARDCODED_DATASET_TABLE;
export const RESPONSES_TABLE =
  process.env.RESPONSES_TABLE || HARDCODED_RESPONSES_TABLE;
