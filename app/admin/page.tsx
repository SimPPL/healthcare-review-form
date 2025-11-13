"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { SAMPLE_QUESTIONS } from "@/lib/sample-data";

export default function AdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Simple password check - no complex authentication needed
    if (password === "admin") {
      setIsLoading(true);
      
      // Clear all previous demo data to ensure fresh start
      SAMPLE_QUESTIONS.forEach((question) => {
        localStorage.removeItem(`answer_${question.question_id}`);
        localStorage.removeItem(`showAI_${question.question_id}`);
        localStorage.removeItem(`classification_${question.question_id}`);
      });
      localStorage.removeItem("questionsTourSeen");
      localStorage.removeItem("questionsTourAISeen");
      localStorage.removeItem("classificationTourSeen");
      localStorage.removeItem("currentQuestionForClassification");
      
      // Set up demo mode in localStorage
      localStorage.setItem("demoMode", "true");
      localStorage.setItem("userId", "admin-demo-user");
      localStorage.setItem("userName", "Admin Demo User");
      localStorage.setItem("currentQuestionIndex", "0");
      
      // Simulate a brief delay for better UX
      setTimeout(() => {
        router.push("/questions");
      }, 500);
    } else if (password === "") {
      setError("Please enter a password");
    } else {
      setError("Incorrect password");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2 px-4 sm:px-6">
            <div className="flex items-center justify-center mb-6">
              <Image
                src="/logo.png"
                alt="Healthcare Review Form"
                width={48}
                height={48}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg"
                priority
              />
            </div>
            <CardTitle className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
              Admin Demo Access
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs sm:text-sm">
              Enter password to access demo mode
            </CardDescription>
          </CardHeader>

          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs sm:text-sm font-medium"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full"
                  autoFocus
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm md:text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login to Demo"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4 px-2">
                This is a demo mode without database connectivity.
                <br />
                Password hint: admin
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

