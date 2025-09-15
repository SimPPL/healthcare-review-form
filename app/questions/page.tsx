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
import { useCallback } from "react";

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
  const [wordCounts, setWordCounts] = useState<Record<string, number>>({});

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
      data.questions.forEach((q: UserResponse) => {
        if (q.user_answer) {
          initialAnswers[q.question_id] = q.user_answer;
          setWordCounts((prev) => ({
            ...prev,
            [q.question_id]: countWords(q.user_answer || ""),
          }));
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

  const countWords = useCallback((text: string): number => {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  }, []);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setWordCounts((prev) => ({ ...prev, [questionId]: countWords(value) }));
  };

  const proceedToRating = () => {
    // Check if any questions have been answered
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
          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
          <span className="text-sm sm:text-base">Loading questions...</span>
        </div>
      </div>
    );
  }

  if (questions.length === 0 && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">
              No Questions Assigned
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              There are no questions for you to answer at this time.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="text-xs sm:text-sm h-8 sm:h-9"
            >
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
              <CardTitle className="text-lg sm:text-xl">
                Are you sure?
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Your answers are saved, but you will need to log in again to
                continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-x-2 px-4 pb-4 sm:px-6 sm:pb-6">
              <Button
                variant="outline"
                onClick={() => setShowBackConfirm(false)}
                className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
              >
                Stay
              </Button>
              <Button
                onClick={confirmBack}
                className="flex-1 bg-[var(--color-purple-muted)] hover:bg-[var(--color-purple-muted-hover)] text-white text-xs sm:text-sm h-8 sm:h-9"
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Medical Expert Evaluation
            </h1>
            <p className="text-sm sm:text-md text-muted-foreground mt-2">
              Please share your expert opinion on the following clinical
              questions. Aim for concise answers (ideally 50-100 words) that
              reflect your professional expertise.
            </p>
          </div>
          <Button
            onClick={handleBackClick}
            variant="outline"
            size="sm"
            className="self-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {userName && (
          <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
            Welcome back, <span className="font-medium">{userName}</span>
          </p>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 p-3 sm:p-4 bg-slate-100 dark:bg-zinc-900 rounded-lg gap-3 sm:gap-0">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className="text-xs sm:text-sm font-medium">
              Questions per page:
            </span>
            <Select
              value={questionsPerPage.toString()}
              onValueChange={handleQuestionsPerPageChange}
            >
              <SelectTrigger className="w-16 sm:w-20 h-8 text-xs sm:text-sm">
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

          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className="text-xs sm:text-sm text-muted-foreground">
              {startIndex + 1}-{Math.min(endIndex, questions.length)} of{" "}
              {questions.length}
            </span>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={goToPrevPage}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={goToNextPage}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
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
                <CardHeader className="px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-[var(--color-purple-muted)] text-white rounded-full flex items-center justify-center text-base sm:text-lg font-bold mt-1">
                        {globalIndex + 1}
                      </div>
                      <CardTitle className="text-base sm:text-xl leading-tight sm:leading-relaxed">
                        {question.question_text}
                      </CardTitle>
                    </div>
                    <Badge
                      variant={
                        question.status === "answered" ? "default" : "secondary"
                      }
                      className="self-start mt-2 sm:mt-0 text-xs"
                    >
                      {question.status === "answered" ? "Answered" : "Pending"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label
                        htmlFor={`answer-${question.question_id}`}
                        className="text-xs sm:text-sm font-medium text-foreground"
                      >
                        Your Clinical Assessment:
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {wordCounts[question.question_id] || 0} words
                      </span>
                    </div>
                    <Textarea
                      id={`answer-${question.question_id}`}
                      placeholder="Share your medical expertise here (50-100 words recommended)..."
                      value={answers[question.question_id] || ""}
                      onChange={(e) =>
                        handleAnswerChange(question.question_id, e.target.value)
                      }
                      className="min-h-[120px] sm:min-h-[150px] text-sm sm:text-base resize-y bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-[var(--color-purple-muted-border)]"
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
                      className="bg-[var(--color-purple-muted)] hover:bg-[var(--color-purple-muted-hover)] text-white text-xs sm:text-sm h-8 sm:h-9"
                    >
                      {isSaving[question.question_id] ? (
                        <>
                          <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          Save Response
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 sm:mt-10 flex justify-center">
          <Button
            onClick={proceedToRating}
            className="bg-[var(--color-purple-muted)] hover:bg-[var(--color-purple-muted-hover)] text-white text-sm sm:text-base"
            size="lg"
          >
            Continue to AI Evaluation
            <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
