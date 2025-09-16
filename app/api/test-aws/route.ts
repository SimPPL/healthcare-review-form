import { NextResponse } from "next/server";

/**
 * Simple API route to check AWS environment variables
 * Does not attempt to initialize actual AWS services
 */
export async function GET() {
  try {
    // Check environment variables without exposing actual values
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

    // Return simple JSON response with explicit headers
    return new NextResponse(
      JSON.stringify({
        success: true,
        environment: envVars,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error in test-aws route:", error);

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
