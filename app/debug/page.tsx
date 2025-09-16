"use client";

import { useState, useEffect } from "react";
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
      const response = await fetch("/api/test-aws");
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
          <CardTitle>AWS Connection Diagnostics</CardTitle>
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
              <h3 className="text-lg font-medium">Test Results</h3>

              <div className="bg-muted p-4 rounded-md overflow-auto">
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(awsTestResult, null, 2)}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Environment Variables</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {Object.entries(awsTestResult.environment || {}).map(([key, value]) => (
                    <li key={key}>
                      <span className="font-mono">{key}:</span> {value as string}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">DynamoDB Client</h4>
                <p>{awsTestResult.clientTest}</p>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
