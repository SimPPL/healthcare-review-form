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
import { Loader2, ArrowRight, ArrowLeft, Pencil, Check, X, HelpCircle } from "lucide-react";
import type { UserResponse } from "@/types";
import { NextStep, useNextStep } from "nextstepjs";
import { tourSteps } from "@/lib/tour-steps";
import CustomCard from "@/components/tour-card";

export default function QuestionsPage() {
  const router = useRouter();
  const { startNextStep } = useNextStep();
  const [questions, setQuestions] = useState<UserResponse[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [showAIResponse, setShowAIResponse] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnswer, setEditedAnswer] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(false);
  const [hasSeenAITour, setHasSeenAITour] = useState(false);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedUserName = localStorage.getItem("userName");
    const tourSeen = localStorage.getItem("questionsTourSeen");
    const aiTourSeen = localStorage.getItem("questionsTourAISeen");

    if (!storedUserId) {
      router.push("/");
      return;
    }

    setUserId(storedUserId);
    setUserName(storedUserName);
    setHasSeenTour(!!tourSeen);
    setHasSeenAITour(!!aiTourSeen);
    fetchQuestions(storedUserId);
  }, [router]);

  const currentQuestion = questions[currentQuestionIndex];

  // Update progress when questions change
  useEffect(() => {
    if (questions.length > 0) {
      const completed = parseInt(
        localStorage.getItem("currentQuestionIndex") || "0",
      );
      setCurrentQuestionIndex(completed);

      if (questions[completed]) {
        const currentQuestionData = questions[completed];
        const questionId = currentQuestionData.question_id;

        const dbAnswer = currentQuestionData.user_answer || "";
        const storedAnswer = localStorage.getItem(`answer_${questionId}`);
        const finalAnswer = dbAnswer || storedAnswer || "";

        const storedShowAI =
          localStorage.getItem(`showAI_${questionId}`) === "true";
        const shouldShowAI = dbAnswer ? true : storedShowAI;

        setAnswer(finalAnswer);
        setEditedAnswer(finalAnswer);
        setShowAIResponse(shouldShowAI);
        setIsEditing(false);
        setIsSaving(false);
        setWordCount(finalAnswer ? finalAnswer.trim().split(/\s+/).length : 0);

        if (completed === 0 && !hasSeenTour && !shouldShowAI) {
          setTimeout(() => {
            startNextStep("questionsTour");
            localStorage.setItem("questionsTourSeen", "true");
            setHasSeenTour(true);
          }, 1000);
        }
      }
    }
  }, [questions, hasSeenTour, startNextStep]);

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
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load questions";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (value: string) => {
    if (!showAIResponse) {
      setAnswer(value);
      setWordCount(value.trim() === "" ? 0 : value.trim().split(/\s+/).length);
    } else if (isEditing) {
      setEditedAnswer(value);
      setWordCount(value.trim() === "" ? 0 : value.trim().split(/\s+/).length);
    }
    if (currentQuestion) {
      localStorage.setItem(`answer_${currentQuestion.question_id}`, value);
    }
  };

  const confirmAnswer = async () => {
    if (!userId || !currentQuestion || !answer.trim()) {
      setError("Please enter an answer before confirming.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          questionId: currentQuestion?.question_id,
          userAnswer: answer.trim(),
          isEdit: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save unbiased answer");
      }

      setShowAIResponse(true);
      setEditedAnswer(answer);
      setError("");
      if (currentQuestion) {
        localStorage.setItem(`showAI_${currentQuestion.question_id}`, "true");
      }

      if (currentQuestionIndex === 0 && !hasSeenAITour) {
        setTimeout(() => {
          startNextStep("questionsTourAI");
          localStorage.setItem("questionsTourAISeen", "true");
          setHasSeenAITour(true);
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save answer");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!currentQuestion || !editedAnswer.trim()) return;

    try {
      const response = await fetch("/api/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          questionId: currentQuestion.question_id,
          userAnswer: editedAnswer.trim(),
          isEdit: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save edited answer");
      }

      setAnswer(editedAnswer);
      setIsEditing(false);
      localStorage.setItem(
        `answer_${currentQuestion.question_id}`,
        editedAnswer,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save edit");
    }
  };

  const cancelEdit = () => {
    setEditedAnswer(answer);
    setIsEditing(false);
  };

  const skipToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      localStorage.setItem("currentQuestionIndex", nextIndex.toString());

      const nextQuestion = questions[nextIndex];
      if (currentQuestion) {
        localStorage.removeItem(`showAI_${currentQuestion.question_id}`);
      }

      if (nextQuestion) {
        const storedAnswer = localStorage.getItem(
          `answer_${nextQuestion.question_id}`,
        );
        const storedShowAI =
          localStorage.getItem(`showAI_${nextQuestion.question_id}`) === "true";

        setAnswer(storedAnswer || "");
        setEditedAnswer(storedAnswer || "");
        setShowAIResponse(storedShowAI);
        setIsEditing(false);
        setWordCount(
          storedAnswer ? storedAnswer.trim().split(/\s+/).length : 0,
        );
      }
      setError("");
    }
  };

  const proceedToClassification = async () => {
    if (!currentQuestion) {
      setError("No question loaded. Please refresh the page.");
      return;
    }

    if (!answer.trim()) {
      setError("Please enter an answer before proceeding.");
      return;
    }

    if (!showAIResponse) {
      setError(
        "Please confirm your answer first by clicking 'Confirm Answer'.",
      );
      return;
    }

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const saveAnswerResponse = await fetch("/api/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          questionId: currentQuestion.question_id,
          userAnswer: answer.trim(),
        }),
      });

      if (!saveAnswerResponse.ok) {
        throw new Error("Failed to save answer");
      }

      localStorage.setItem(
        `answer_${currentQuestion.question_id}`,
        answer.trim(),
      );

      localStorage.setItem(
        "currentQuestionForClassification",
        JSON.stringify({
          questionId: currentQuestion.question_id,
          questionIndex: currentQuestionIndex,
        }),
      );

      router.push("/classification");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save data");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmBack = () => {
    localStorage.clear();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading your questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>No Questions Found</CardTitle>
            <CardDescription>
              No questions have been assigned to your account yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/")} variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <NextStep steps={tourSteps} cardComponent={CustomCard}>
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
        {showBackConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-semibold text-foreground">
                Confirm Exit
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Your answers are saved, but you will need to log in again to
                continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => setShowBackConfirm(false)}
                variant="outline"
                className="text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmBack}
                variant="destructive"
                className="text-sm sm:text-base"
              >
                Yes, Exit
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-6 py-10 max-w-4xl">
        <div className="mb-12" id="questions-page-header">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                Healthcare Expert Review
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400">
                Welcome, {userName}! Please provide your expert clinical assessment
                for each response from our dataset.
              </p>
            </div>
            <Button
              onClick={() => {
                if (showAIResponse) {
                  startNextStep("questionsTourAI");
                } else {
                  startNextStep("questionsTour");
                }
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 flex-shrink-0"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Tour Guide</span>
              <span className="sm:hidden">Tour</span>
            </Button>
          </div>
        </div>

        {currentQuestion && (
          <>
            <div className="mb-8 bg-slate-100 dark:bg-zinc-900 rounded-xl p-4 sm:p-6" id="question-progress">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Progress: Question {currentQuestionIndex + 1} of{" "}
                  {questions.length}
                </h2>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {Math.round(
                    ((currentQuestionIndex + 1) / questions.length) * 100,
                  )}
                  % Complete
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                <div
                  className="bg-[var(--color-purple-muted)] h-3 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Card
              id="question-card"
              className="shadow-lg border-t-4 border-[var(--color-purple-muted-border)] overflow-hidden"
            >
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <div className="flex items-start space-x-3 sm:space-x-4 md:space-x-6">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[var(--color-purple-muted)] text-white rounded-full flex items-center justify-center text-sm sm:text-lg md:text-xl font-bold">
                    {currentQuestionIndex + 1}
                  </div>
                  <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed font-semibold text-slate-800 dark:text-slate-100" id="current-question">
                    {currentQuestion.question_text}
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8">
                {showAIResponse ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-foreground flex items-center text-md">
                          Your Expert Assessment
                        </h4>
                        <span className="text-xs sm:text-sm text-muted-foreground" id="word-count">
                          {wordCount} words
                        </span>
                      </div>
                      <div className="relative">
                        <Textarea
                          id="answer-textarea"
                          value={isEditing ? editedAnswer : answer}
                          onChange={(e) => handleAnswerChange(e.target.value)}
                          disabled={!isEditing}
                          className={`min-h-[120px] sm:min-h-[160px] text-sm resize-y ${
                            isEditing
                              ? "bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-[var(--color-purple-muted-border)]"
                              : "bg-gray-50 dark:bg-gray-800"
                          }`}
                        />
                        {!isEditing && (
                          <Button
                            onClick={startEditing}
                            size="sm"
                            variant="outline"
                            className="absolute top-2 right-2"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        )}
                        {isEditing && (
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              onClick={saveEdit}
                              size="sm"
                              variant="outline"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={cancelEdit}
                              size="sm"
                              variant="outline"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-foreground text-md">
                          Our Response
                        </h4>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {
                            currentQuestion.llm_response.trim().split(/\s+/)
                              .length
                          }{" "}
                          words
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 border rounded-lg p-4" id="ai-response">
                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {currentQuestion.llm_response}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                      <label className="text-sm sm:text-base md:text-lg font-semibold text-slate-800 dark:text-slate-200">
                        Your Clinical Assessment:
                      </label>
                      <span className="text-xs sm:text-sm text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 sm:px-3 py-1 rounded-full" id="word-count">
                        {wordCount} words
                      </span>
                    </div>
                    <Textarea
                      id="answer-textarea"
                      placeholder="Share your medical expertise here (50-100 words recommended)..."
                      value={answer}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      className="min-h-[120px] sm:min-h-[160px] text-sm sm:text-base resize-y bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-[var(--color-purple-muted-border)] leading-relaxed"
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <div className="mt-12 flex justify-between items-center" id="navigation-buttons">
              <Button
                onClick={() => setShowBackConfirm(true)}
                variant="outline"
                size="lg"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Home
              </Button>

              <div className="flex space-x-4">
                {!showAIResponse && (
                  <Button
                    onClick={skipToNext}
                    variant="outline"
                    size="lg"
                    className="px-6"
                  >
                    Skip Question
                  </Button>
                )}

                {!showAIResponse ? (
                  <Button
                    id="show-ai-button"
                    onClick={confirmAnswer}
                    disabled={!answer.trim() || isSaving}
                    className="bg-[var(--color-purple-muted)] hover:bg-[var(--color-purple-muted-hover)] text-white px-8"
                    size="lg"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Confirm Answer"
                    )}
                  </Button>
                ) : (
                  <Button
                    id="continue-button"
                    onClick={proceedToClassification}
                    disabled={!answer.trim() || isSaving}
                    className="bg-[var(--color-purple-muted)] hover:bg-[var(--color-purple-muted-hover)] text-white px-8"
                    size="lg"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Next Page
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </NextStep>
  );
}
