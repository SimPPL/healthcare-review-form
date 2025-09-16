import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

/**
 * Enhanced API route to check AWS environment variables and connection
 * Provides detailed diagnostics for troubleshooting AWS configuration
 */
export async function GET() {
  try {
    // Get all environment variables for diagnostic purposes
    const allEnvVars = { ...process.env };

    // Format environment variables for safe display
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

    // Check for AWS-prefixed environment variables (which might be used instead)
    const awsPrefixVars = {
      AWS_REGION: process.env.AWS_REGION
        ? `Set (length: ${process.env.AWS_REGION.length})`
        : "Not set",
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID
        ? `Set (length: ${process.env.AWS_ACCESS_KEY_ID.length})`
        : "Not set",
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY
        ? `Set (length: ${process.env.AWS_SECRET_ACCESS_KEY.length})`
        : "Not set",
    };

    // Test AWS connectivity if credentials are available
    let awsConnectionTest = "Not tested";
    try {
      if (
        process.env.MY_APP_AWS_REGION &&
        process.env.MY_APP_AWS_ACCESS_KEY_ID &&
        process.env.MY_APP_AWS_SECRET_ACCESS_KEY
      ) {
        const client = new DynamoDBClient({
          region: process.env.MY_APP_AWS_REGION,
          credentials: {
            accessKeyId: process.env.MY_APP_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.MY_APP_AWS_SECRET_ACCESS_KEY,
          },
        });

        // Just initializing the client, not making actual calls
        awsConnectionTest = "AWS client initialized successfully";
      } else {
        awsConnectionTest = "Skipped - missing environment variables";
      }
    } catch (awsError) {
      awsConnectionTest = `AWS client initialization failed: ${
        awsError instanceof Error ? awsError.message : String(awsError)
      }`;
    }

    // Collect server environment information
    const serverInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV,
    };

    // Return detailed diagnostic information
    return new NextResponse(
      JSON.stringify({
        success: true,
        environment: envVars,
        awsPrefixVars,
        awsConnectionTest,
        serverInfo,
        timestamp: new Date().toISOString(),
        allEnvVarKeys: Object.keys(allEnvVars).filter(
          (key) =>
            !key.includes("SECRET") &&
            !key.includes("KEY") &&
            !key.includes("PASSWORD") &&
            !key.includes("TOKEN"),
        ),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Error in test-aws route:", error);

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
