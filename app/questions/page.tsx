"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowRight,
  Save,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { UserResponse } from "@/types";

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<UserResponse[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [questionsPerPage, setQuestionsPerPage] = useState(1);

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
      setError("");
      const response = await fetch(`/api/get-assigned?user_id=${userIdParam}`);
      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ error: "Network error" }));
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      const data = await response.json();
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error("Invalid response format from server");
      }

      // Process questions and check localStorage for saved answers
      const updatedQuestions = data.questions.map((q: UserResponse) => {
        const storedAnswer = localStorage.getItem(`answer_${q.question_id}`);
        if (storedAnswer) {
          return {
            ...q,
            user_answer: storedAnswer,
            status: "answered" as const,
          };
        }
        return q;
      });

      setQuestions(updatedQuestions);
      const initialAnswers: Record<string, string> = {};
      updatedQuestions.forEach((q: UserResponse) => {
        if (q.user_answer) {
          initialAnswers[q.question_id] = q.user_answer;
        }
      });
      setAnswers(initialAnswers);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load questions";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnswer = async (questionId: string, answer: string) => {
    if (!answer.trim()) {
      setError("Please provide an answer before saving");
      return;
    }

    setIsSaving((prev) => ({ ...prev, [questionId]: true }));
    setError("");

    try {
      // Save answer to localStorage instead of making API call
      localStorage.setItem(`answer_${questionId}`, answer.trim());

      // Update UI state
      setQuestions((prev) =>
        prev.map((q) =>
          q.question_id === questionId
            ? { ...q, user_answer: answer.trim(), status: "answered" as const }
            : q,
        ),
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save answer";
      setError(errorMessage);
    } finally {
      setIsSaving((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const proceedToRating = () => {
    const answeredQuestions = questions.filter(
      (q) => q.status === "answered" || answers[q.question_id]?.trim(),
    );
    if (answeredQuestions.length === 0) {
      setError("Please answer at least one question before proceeding.");
      return;
    }

    // Save all current answers to localStorage before proceeding
    questions.forEach((q) => {
      const answer = answers[q.question_id];
      if (answer?.trim()) {
        localStorage.setItem(`answer_${q.question_id}`, answer.trim());
      }
    });

    router.push("/rating");
  };

  const handleBackClick = () => setShowBackConfirm(true);
  const confirmBack = () => {
    // Clear all localStorage items
    localStorage.clear();
    router.push("/");
  };

  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startIndex = currentPage * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentQuestions = questions.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const handleQuestionsPerPageChange = (value: string) => {
    setQuestionsPerPage(Number.parseInt(value));
    setCurrentPage(0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading questions...</span>
        </div>
      </div>
    );
  }

  if (questions.length === 0 && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CardTitle>No Questions Assigned</CardTitle>
            <CardDescription>
              There are no questions for you to answer at this time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      {showBackConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 shadow-lg">
            <CardHeader>
              <CardTitle>Are you sure?</CardTitle>
              <CardDescription>
                Your answers are saved, but you will need to log in again to
                continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-x-2">
              <Button
                variant="outline"
                onClick={() => setShowBackConfirm(false)}
                className="flex-1"
              >
                Stay
              </Button>
              <Button
                onClick={confirmBack}
                className="flex-1 bg-[var(--color-purple-muted)] hover:bg-[var(--color-purple-muted-hover)] text-white"
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Clinical Questions</h1>
            <p className="text-md text-muted-foreground mt-2">
              Using your expertise, please answer the questions below.
            </p>
          </div>
          <Button onClick={handleBackClick} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {userName && (
          <p className="text-sm text-muted-foreground mb-6">
            Welcome back, <span className="font-medium">{userName}</span>
          </p>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-6 p-4 bg-slate-100 dark:bg-zinc-900 rounded-lg">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Questions per page:</span>
            <Select
              value={questionsPerPage.toString()}
              onValueChange={handleQuestionsPerPageChange}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {startIndex + 1}-{Math.min(endIndex, questions.length)} of{" "}
              {questions.length}
            </span>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={goToPrevPage}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={goToNextPage}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {currentQuestions.map((question, index) => {
            const globalIndex = startIndex + index;
            return (
              <Card
                key={question.question_id}
                className="shadow-lg border-t-4 border-[var(--color-purple-muted-border)] overflow-hidden"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-purple-muted)] text-white rounded-full flex items-center justify-center text-lg font-bold">
                        {globalIndex + 1}
                      </div>
                      <CardTitle className="text-xl leading-relaxed">
                        {question.question_text}
                      </CardTitle>
                    </div>
                    <Badge
                      variant={
                        question.status === "answered" ? "default" : "secondary"
                      }
                    >
                      {question.status === "answered" ? "Answered" : "Pending"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-6">
                  <div className="space-y-2">
                    <label
                      htmlFor={`answer-${question.question_id}`}
                      className="text-sm font-medium text-foreground"
                    >
                      Your Expert Answer:
                    </label>
                    <Textarea
                      id={`answer-${question.question_id}`}
                      placeholder="Type your response here..."
                      value={answers[question.question_id] || ""}
                      onChange={(e) =>
                        handleAnswerChange(question.question_id, e.target.value)
                      }
                      className="min-h-[150px] resize-y bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-[var(--color-purple-muted-border)]"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() =>
                        saveAnswer(
                          question.question_id,
                          answers[question.question_id] || "",
                        )
                      }
                      disabled={
                        !answers[question.question_id]?.trim() ||
                        isSaving[question.question_id]
                      }
                      className="bg-[var(--color-purple-muted)] hover:bg-[var(--color-purple-muted-hover)] text-white"
                    >
                      {isSaving[question.question_id] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Answer
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            onClick={proceedToRating}
            className="bg-[var(--color-purple-muted)] hover:bg-[var(--color-purple-muted-hover)] text-white"
            size="lg"
          >
            Proceed to Rating
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
