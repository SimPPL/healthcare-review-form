import { type NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envVars = {
      MY_APP_AWS_REGION: process.env.MY_APP_AWS_REGION || "Not set",
      MY_APP_AWS_ACCESS_KEY_ID: process.env.MY_APP_AWS_ACCESS_KEY_ID
        ? "Set (length: " + process.env.MY_APP_AWS_ACCESS_KEY_ID.length + ")"
        : "Not set",
      MY_APP_AWS_SECRET_ACCESS_KEY: process.env.MY_APP_AWS_SECRET_ACCESS_KEY
        ? "Set (length: " + process.env.MY_APP_AWS_SECRET_ACCESS_KEY.length + ")"
        : "Not set",
      DATASET_TABLE: process.env.DATASET_TABLE || "Not set",
      RESPONSES_TABLE: process.env.RESPONSES_TABLE || "Not set"
    };

    // Test DynamoDB client initialization
    let clientTest = "Not tested";
    try {
      const client = new DynamoDBClient({
        region: process.env.MY_APP_AWS_REGION!,
        credentials: {
          accessKeyId: process.env.MY_APP_AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.MY_APP_AWS_SECRET_ACCESS_KEY!,
        },
      });

      clientTest = "Client initialized successfully";
    } catch (error) {
      clientTest = `Client initialization failed: ${error instanceof Error ? error.message : String(error)}`;
    }

    return NextResponse.json({
      success: true,
      environment: envVars,
      clientTest,
      message: "Diagnostics successful",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
