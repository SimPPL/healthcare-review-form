"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { testAwsConnection } from "@/lib/client/api";

export default function DebugPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [awsTestResult, setAwsTestResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [awsTestCount, setAwsTestCount] = useState(0);

  const runAwsTest = async () => {
    setIsLoading(true);
    setError("");
    try {
      setAwsTestCount((prev) => prev + 1);
      const data = await testAwsConnection();
      setAwsTestResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("AWS test error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>AWS Connection Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={runAwsTest}
                disabled={isLoading}
                variant="default"
              >
                {isLoading ? "Testing..." : "Test AWS Connection"}
              </Button>

              <a
                href="/api/env-check"
                target="_blank"
                className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
              >
                Server Environment Check
              </a>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {awsTestResult && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Test Results</h3>

              <div className="bg-muted p-4 rounded-md overflow-auto">
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(awsTestResult, null, 2)}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Environment Variables</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {Object.entries(awsTestResult.environment || {}).map(
                    ([key, value]) => (
                      <li key={key}>
                        <span className="font-mono">{key}:</span>{" "}
                        {value as string}
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">DynamoDB Client</h4>
                <p>{awsTestResult.clientTest}</p>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium mb-2 text-blue-800">Server-Side Diagnostic Results</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-blue-700 mb-1">AWS Region</h5>
                    <p className="text-sm">{awsTestResult.environment?.MY_APP_AWS_REGION || "Not available"}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-blue-700 mb-1">Tables Exist</h5>
                    <p className="text-sm">{awsTestResult.tablesExist ? "✓ Yes" : "✗ No"}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-blue-700 mb-1">Access Key</h5>
                    <p className="text-sm">{awsTestResult.environment?.MY_APP_AWS_ACCESS_KEY_ID?.startsWith("Set") ? "✓ Set" : "✗ Missing"}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-blue-700 mb-1">Secret Key</h5>
                    <p className="text-sm">{awsTestResult.environment?.MY_APP_AWS_SECRET_ACCESS_KEY?.startsWith("Set") ? "✓ Set" : "✗ Missing"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-muted p-4 rounded-md mt-6">
            <h3 className="text-md font-medium mb-2">Deployment Checklist</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Environment variables are correctly set</li>
              <li>AWS credentials have the correct permissions</li>
              <li>Region is correctly configured</li>
              <li>DynamoDB tables exist and are accessible</li>
              <li>Network configuration allows outbound AWS API connections</li>
            </ul>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <h4 className="text-sm font-medium text-yellow-800">Common AWS Amplify Issues:</h4>
              <ul className="list-disc pl-5 space-y-1 text-xs text-yellow-700 mt-1">
                <li>Environment variables might need "Make available at runtime" option enabled</li>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
