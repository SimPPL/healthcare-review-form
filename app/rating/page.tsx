"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import type { UserResponse } from "@/types";

export default function RatingPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<UserResponse[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedUserName = localStorage.getItem("userName");

    if (!storedUserId) {
      router.push("/");
      return;
    }

    setUserId(storedUserId);
    setUserName(storedUserName);
    fetchQuestions(storedUserId);
  }, [router]);

  const fetchQuestions = async (userIdParam: string) => {
    try {
      const response = await fetch(`/api/get-assigned?user_id=${userIdParam}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch questions");
      }

      // Filter to only show answered questions
      const answeredQuestions = data.questions.filter(
        (q: UserResponse) => q.user_answer && q.user_answer.trim(),
      );
      setQuestions(answeredQuestions);

      // Initialize ratings
      const initialRatings: Record<string, number> = {};
      answeredQuestions.forEach((q: UserResponse) => {
        if (q.llm_rating !== undefined) {
          initialRatings[q.question_id] = q.llm_rating;
        }
      });
      setRatings(initialRatings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  };

  const saveRating = async (questionId: string, rating: number) => {
    if (!userId) return;

    setIsSaving((prev) => ({ ...prev, [questionId]: true }));

    try {
      const response = await fetch("/api/save-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, questionId, llmRating: rating }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save rating");
      }

      // Update state
      setQuestions((prev) =>
        prev.map((q) =>
          q.question_id === questionId
            ? { ...q, llm_rating: rating, status: "submitted" as const }
            : q,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rating");
    } finally {
      setIsSaving((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleRatingClick = (questionId: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [questionId]: rating }));
    saveRating(questionId, rating);
  };

  const proceedToThankYou = () => {
    const ratedQuestions = questions.filter(
      (q) => ratings[q.question_id] !== undefined,
    );

    if (ratedQuestions.length === 0) {
      setError(
        "Please provide a rating for at least one AI answer before continuing.",
      );
      return;
    }

    router.push("/thank-you");
  };

  const goBackToQuestions = () => {
    router.push("/questions");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading evaluation...</span>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>No Answered Questions</CardTitle>
            <CardDescription>
              You need to answer questions before you can evaluate AI answers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={goBackToQuestions} variant="outline">
              Back to Questions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedRatings = Object.keys(ratings).length;
  const totalQuestions = questions.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Evaluate AI Answers
              </h1>
              <p className="text-muted-foreground">
                Review your answer alongside the AI’s response and rate how well
                the AI performed (0 = poor, 10 = excellent).
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Progress</div>
              <div className="text-lg font-semibold">
                {completedRatings} / {totalQuestions}
              </div>
            </div>
          </div>
          {userName && (
            <p className="text-sm text-muted-foreground">
              Evaluator: <span className="font-medium">{userName}</span>
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-8">
          {questions.map((question, index) => (
            <Card key={question.question_id} className="shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <CardTitle className="text-lg leading-relaxed">
                      {question.question_text}
                    </CardTitle>
                  </div>
                  <Badge
                    variant={
                      ratings[question.question_id] !== undefined
                        ? "default"
                        : "secondary"
                    }
                  >
                    {ratings[question.question_id] !== undefined
                      ? "Rated"
                      : "Pending"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Your Answer */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Your Answer
                    </h4>
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {question.user_answer}
                      </p>
                    </div>
                  </div>

                  {/* AI Answer */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      AI’s Answer
                    </h4>
                    <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-sm leading-relaxed">
                        {question.llm_response}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rating Section */}
                <div className="border-t pt-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">
                      How well did the AI’s answer perform?
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground w-12">
                        Poor
                      </span>
                      <div className="flex space-x-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                          <button
                            key={rating}
                            onClick={() =>
                              handleRatingClick(question.question_id, rating)
                            }
                            disabled={isSaving[question.question_id]}
                            className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                              ratings[question.question_id] === rating
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                            } ${isSaving[question.question_id] ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            {isSaving[question.question_id] &&
                            ratings[question.question_id] === rating ? (
                              <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                            ) : (
                              rating
                            )}
                          </button>
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground w-16">
                        Excellent
                      </span>
                    </div>
                    {ratings[question.question_id] !== undefined && (
                      <p className="text-sm text-muted-foreground">
                        You rated this answer:{" "}
                        <span className="font-medium">
                          {ratings[question.question_id]} out of 10
                        </span>
                        .
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-between">
          <Button onClick={goBackToQuestions} variant="outline" size="lg">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Questions
          </Button>

          <Button
            onClick={proceedToThankYou}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            Finish Evaluation
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
