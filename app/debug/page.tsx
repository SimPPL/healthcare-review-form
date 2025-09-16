"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DebugPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [awsTestResult, setAwsTestResult] = useState<any>(null);
  const [error, setError] = useState("");

  const testAwsConnection = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Add timestamp to avoid caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/test-aws?t=${timestamp}`, {
        headers: {
          "Cache-Control": "no-cache, no-store",
          Pragma: "no-cache",
        },
      });

      // Check if response is OK
      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
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
          <CardTitle>AWS Environment Variables Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Button
              onClick={testAwsConnection}
              disabled={isLoading}
              variant="default"
            >
              {isLoading ? "Testing..." : "Test AWS Connection"}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {awsTestResult && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Environment Variables</h3>

              <div className="bg-muted p-4 rounded-md overflow-auto">
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(awsTestResult, null, 2)}
                </pre>
              </div>

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
              <h4 className="text-sm font-medium text-yellow-800">
                Common AWS Amplify Issues:
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-xs text-yellow-700 mt-1">
                <li>
                  Environment variables might need "Make available at runtime"
                  option enabled
                </li>
                <li>
                  Verify environment variables are applied to the correct branch
                </li>
                <li>
                  Try removing and re-adding environment variables in the
                  Amplify Console
                </li>
                <li>
                  Check AWS Amplify build logs for any environment variable
                  errors
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
