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
import { Loader2, ArrowRight, ArrowLeft, Pencil, X, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>(
    {},
  );

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

      const answeredQuestions = data.questions.filter(
        (q: UserResponse) => q.user_answer && q.user_answer.trim(),
      );
      setQuestions(answeredQuestions);

      const initialRatings: Record<string, number> = {};
      answeredQuestions.forEach((q: UserResponse) => {
        if (q.llm_rating !== undefined && q.llm_rating !== null) {
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

  const handleSaveEditedAnswer = (questionId: string) => {
    const updatedAnswer = editedAnswers[questionId];
    setQuestions((prev) =>
      prev.map((q) =>
        q.question_id === questionId ? { ...q, user_answer: updatedAnswer } : q,
      ),
    );
    setEditing((prev) => ({ ...prev, [questionId]: false }));
  };

  const proceedToClassification = () => {
    const ratedQuestions = questions.filter(
      (q) => ratings[q.question_id] !== undefined,
    );
    if (ratedQuestions.length === 0) {
      setError("Please rate at least one AI answer before continuing.");
      return;
    }
    router.push("/classification");
  };

  const goBackToQuestions = () => {
    router.push("/questions");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading evaluation...</span>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CardTitle>No Answered Questions Found</CardTitle>
            <CardDescription>
              Please answer some questions first before evaluating the AI.
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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Evaluate AI Answers</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Review your answer alongside the AI's response. Then, rate the
                AI's performance on a scale of 0 (poor) to 10 (excellent).
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Progress</div>
              <div className="text-lg font-semibold text-foreground">
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

        <div className="space-y-12">
          {questions.map((question, index) => (
            <Card
              key={question.question_id}
              className="shadow-lg border-t-4 border-purple-500 overflow-hidden"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center text-lg font-bold">
                      {index + 1}
                    </div>
                    <CardTitle className="text-xl leading-relaxed">
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

              <CardContent className="space-y-6 p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Your Answer */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground flex items-center text-md">
                        Your Answer
                      </h4>
                      {!editing[question.question_id] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditedAnswers((prev) => ({
                              ...prev,
                              [question.question_id]:
                                question.user_answer ?? "",
                            }));
                            setEditing((prev) => ({
                              ...prev,
                              [question.question_id]: true,
                            }));
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {editing[question.question_id] ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedAnswers[question.question_id] || ""}
                          onChange={(e) =>
                            setEditedAnswers((prev) => ({
                              ...prev,
                              [question.question_id]: e.target.value,
                            }))
                          }
                          className="min-h-[120px]"
                        />
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleSaveEditedAnswer(question.question_id)
                            }
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEditing((prev) => ({
                                ...prev,
                                [question.question_id]: false,
                              }))
                            }
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {question.user_answer}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI Answer */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground flex items-center text-md">
                      AI's Answer
                    </h4>
                    <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-sm leading-relaxed">
                        {question.llm_response}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rating Section */}
                <div className="border-t pt-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground text-center text-md">
                      How would you rate the AI's answer?
                    </h4>
                    <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        Poor
                      </span>
                      <div className="flex flex-wrap justify-center gap-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                          <button
                            key={rating}
                            onClick={() =>
                              handleRatingClick(question.question_id, rating)
                            }
                            disabled={isSaving[question.question_id]}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-sm font-bold transition-all duration-200 flex items-center justify-center ${
                              ratings[question.question_id] === rating
                                ? "bg-purple-600 text-white scale-110 shadow-lg"
                                : "bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 text-slate-600 dark:text-zinc-300"
                            } ${isSaving[question.question_id] ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {isSaving[question.question_id] &&
                            ratings[question.question_id] === rating ? (
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : (
                              rating
                            )}
                          </button>
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground w-16 text-left">
                        Excellent
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex justify-between">
          <Button onClick={goBackToQuestions} variant="outline" size="lg">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Questions
          </Button>

          <Button
            onClick={proceedToClassification}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="lg"
          >
            Continue to Classification
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
