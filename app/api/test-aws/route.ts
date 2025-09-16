import { type NextRequest, NextResponse } from "next/server";
import { getDynamoDbStatus } from "@/lib/server/aws";

export async function GET(request: NextRequest) {
  try {
    // Use our server-side helper to check DynamoDB status
    const dynamoStatus = await getDynamoDbStatus();

    return NextResponse.json({
      success: true,
      environment: dynamoStatus.environment,
      clientTest: dynamoStatus.clientTest,
      tablesExist: dynamoStatus.tablesExist,
      message: "Diagnostics successful",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
