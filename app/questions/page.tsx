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

      setQuestions(data.questions);

      const initialAnswers: Record<string, string> = {};
      data.questions.forEach((q: UserResponse) => {
        if (q.user_answer) {
          initialAnswers[q.question_id] = q.user_answer;
        }
      });
      setAnswers(initialAnswers);
    } catch (err) {
      console.error("[v0] Error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load questions";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnswer = async (questionId: string, answer: string) => {
    if (!userId || !answer.trim()) {
      setError("Please provide an answer before saving");
      return;
    }

    setIsSaving((prev) => ({ ...prev, [questionId]: true }));
    setError("");

    try {
      const response = await fetch("/api/save-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          questionId,
          userAnswer: answer.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ error: "Network error" }));
        throw new Error(data.error || `Failed to save: ${response.status}`);
      }

      setQuestions((prev) =>
        prev.map((q) =>
          q.question_id === questionId
            ? { ...q, user_answer: answer.trim(), status: "answered" as const }
            : q,
        ),
      );
    } catch (err) {
      console.error("[v0] Error:", err);
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
      setError(
        "Please answer at least one question before moving to the rating step.",
      );
      return;
    }

    router.push("/rating");
  };

  const handleBackClick = () => {
    setShowBackConfirm(true);
  };

  const confirmBack = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    router.push("/");
  };

  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startIndex = currentPage * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentQuestions = questions.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleQuestionsPerPageChange = (value: string) => {
    const newPerPage = Number.parseInt(value);
    setQuestionsPerPage(newPerPage);
    setCurrentPage(0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading questions...</span>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-none border">
          <CardHeader>
            <CardTitle>No Questions Assigned</CardTitle>
            <CardDescription>
              You don’t have any questions to answer right now.
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
    <div className="min-h-screen bg-background">
      {showBackConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 shadow-none border">
            <CardHeader>
              <CardTitle>Go Back?</CardTitle>
              <CardDescription>
                If you return to the main page, your answers will be saved, but
                you’ll need to enter your details again to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowBackConfirm(false)}
                className="flex-1"
              >
                Stay
              </Button>
              <Button onClick={confirmBack} className="flex-1">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <img
              src="/logo.png"
              alt="Health Eval Feedback Logo"
              className="w-10 h-10 rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const sibling = e.currentTarget
                  .nextElementSibling as HTMLElement | null;
                if (sibling) sibling.style.display = "flex";
              }}
            />
            <div
              className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-sm"
              style={{ display: "none" }}
            >
              <span className="text-primary-foreground font-bold text-xs">
                HEF
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Clinical Questions
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                Using your expertise, please help answer the questions below,
                <br />
                you can choose how many questions you want to answer.
              </p>
            </div>
          </div>

          <Button
            onClick={handleBackClick}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2 bg-transparent shadow-none"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
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

        <div className="flex items-center justify-between mb-6 p-4 bg-muted/30 rounded-lg">
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
              Showing {startIndex + 1}-{Math.min(endIndex, questions.length)} of{" "}
              {questions.length}
            </span>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                disabled={currentPage === 0}
                className="shadow-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage >= totalPages - 1}
                className="shadow-none"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {currentQuestions.map((question, index) => {
            const globalIndex = startIndex + index;
            return (
              <Card
                key={question.question_id}
                className="shadow-none border border-gray-200 bg-gray-50"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        {globalIndex + 1}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-relaxed text-balance">
                          {question.question_text}
                        </CardTitle>
                      </div>
                    </div>
                    <Badge
                      variant={
                        question.status === "answered" ? "default" : "secondary"
                      }
                      className="ml-2"
                    >
                      {question.status === "answered" ? "Answered" : "Pending"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Your answer:
                    </label>
                    <Textarea
                      placeholder="Type your response here..."
                      value={answers[question.question_id] || ""}
                      onChange={(e) =>
                        handleAnswerChange(question.question_id, e.target.value)
                      }
                      className="min-h-[120px] resize-none shadow-none border border-gray-200 bg-white focus-visible:ring-0 focus-visible:outline-none"
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
                      size="sm"
                      variant="outline"
                      className="shadow-none"
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

        <div className="mt-8 flex justify-center">
          <Button
            onClick={proceedToRating}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-none"
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
