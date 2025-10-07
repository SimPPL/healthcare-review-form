"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { NextStep, useNextStep } from "nextstepjs";
import { tourSteps } from "@/lib/tour-steps";
import CustomCard from "@/components/tour-card";

import type { UserResponse } from "@/types";

export default function ClassificationPage() {
  const router = useRouter();
  const { startNextStep } = useNextStep();
  const [currentQuestion, setCurrentQuestion] = useState<UserResponse | null>(
    null,
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [qualityPassFail, setQualityPassFail] = useState<
    Record<string, "pass" | "fail" | "">
  >({});
  const [editedRubrics, setEditedRubrics] = useState<Record<string, string>>(
    {},
  );
  const [feedback, setFeedback] = useState<string>("");
  const [wordCounts, setWordCounts] = useState<{ user: number; ai: number }>({
    user: 0,
    ai: 0,
  });


  useEffect(() => {
    try {
      const storedUserId = localStorage.getItem("userId");
      const tourSeen = localStorage.getItem("classificationTourSeen");

      if (!storedUserId) {
        router.push("/");
        return;
      }
      setUserId(storedUserId);

      const currentQuestionInfo = localStorage.getItem(
        "currentQuestionForClassification",
      );
      if (currentQuestionInfo) {
        const { questionId, questionIndex } = JSON.parse(currentQuestionInfo);
        setCurrentQuestionIndex(questionIndex);
        
        if (questionIndex === 0 && !tourSeen) {
          setTimeout(() => {
            startNextStep("classificationTour");
            localStorage.setItem("classificationTourSeen", "true");
          }, 1500);
        }
        
        fetchCurrentQuestion(storedUserId, questionId);
      } else {
        setError("No question selected for classification.");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Failed to access user information.");
      setIsLoading(false);
    }
  }, [router, startNextStep]);

  const fetchCurrentQuestion = async (
    userIdParam: string,
    questionId: string,
  ) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/get-assigned?user_id=${userIdParam}`);
      const data = await response.json();
      if (!response.ok || !data.questions || !Array.isArray(data.questions)) {
        throw new Error(data.error || "Invalid API response");
      }

      const question = data.questions.find(
        (q: UserResponse) => q.question_id === questionId,
      );
      if (!question) {
        throw new Error("Question not found");
      }

      const storedAnswer = localStorage.getItem(`answer_${questionId}`);
      const storedRating = localStorage.getItem(`rating_${questionId}`);

      const enhancedQuestion = { ...question };
      if (storedAnswer && storedAnswer.trim()) {
        enhancedQuestion.user_answer = storedAnswer.trim();
        enhancedQuestion.status = "answered" as const;
      }
      if (storedRating) {
        enhancedQuestion.llm_rating = parseInt(storedRating, 10);
      }

      setCurrentQuestion(enhancedQuestion);

      setWordCounts({
        user: countWords(enhancedQuestion.user_answer || ""),
        ai: countWords(enhancedQuestion.llm_response || ""),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch question");
    } finally {
      setIsLoading(false);
    }
  };

  const countWords = (text: string): number => {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  };

  const handlePassFailSelection = (
    quality: string,
    selection: "pass" | "fail",
  ) => {
    setQualityPassFail((prev) => {
      const currentSelection = prev[quality];
      if (currentSelection === selection) {
        const newState = { ...prev };
        delete newState[quality];
        return newState;
      }
      return {
        ...prev,
        [quality]: selection,
      };
    });
  };


  const handleSubmit = async () => {
    if (!userId || !currentQuestion) {
      setError("Missing required data. Please try again.");
      return;
    }

    const completedRubrics =
      currentQuestion.rubrics?.filter(
        (quality) => qualityPassFail[quality],
      ) || [];

    if (completedRubrics.length < 8) {
      setError(
        `Please evaluate at least 8 Qualities. You have only completed ${completedRubrics.length}.`,
      );
      return;
    }

    const missingPassFail = completedRubrics.filter(
      (quality) => !qualityPassFail[quality],
    );

    if (missingPassFail.length > 0) {
      setError(
        `Please select Yes/No for all evaluated qualities. Missing for: ${missingPassFail.join(", ")}`,
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const questionData = {
        [currentQuestion.question_id]: completedRubrics,
      };

      const passFailData = {
        [currentQuestion.question_id]: qualityPassFail,
      };

      const feedbackData = feedback
        ? { [currentQuestion.question_id]: feedback }
        : {};

      const editedQualities = editedRubrics;

      const response = await fetch("/api/save-rubric-choices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          selectedQualities: questionData,
          qualityPassFail: passFailData,
          editedQualities,
          feedback: feedbackData,
          isEdit: false,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save data");
      }

      localStorage.setItem(
        `classification_${currentQuestion.question_id}`,
        "completed",
      );

      localStorage.removeItem("currentQuestionForClassification");

      const totalQuestions = 25;
      if (currentQuestionIndex < totalQuestions - 1) {
        const nextIndex = currentQuestionIndex + 1;
        localStorage.setItem("currentQuestionIndex", nextIndex.toString());
        router.push("/questions");
      } else {
        router.push("/thank-you");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save data");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading question...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p>No question found. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <NextStep steps={tourSteps} cardComponent={CustomCard}>
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
        <div className="container mx-auto px-6 py-10 max-w-7xl">
          <div className="mb-12" id="classification-page-header">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6">
                  Medical Response Analysis
                </h1>
                <div
                  id="classification-intro"
                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 sm:p-6"
                >
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-6xl">
                    As a medical expert, please review the response below. Each quality is a checklist for a perfect answer. Select Yes if the response meets the quality, or No if it doesn't.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => startNextStep("classificationTour")}
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

        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertDescription className="text-base">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-lg sm:text-xl font-bold mb-2">
              Question {currentQuestionIndex + 1} of 25
            </h2>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-6">
              <div
                className="bg-[var(--color-purple-muted)] h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / 25) * 100}%` }}
              ></div>
            </div>
          </div>

          <Card className="overflow-hidden shadow-lg border-2 border-slate-200 dark:border-slate-700" id="question-context">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-purple-muted)] text-white rounded-full flex items-center justify-center text-lg font-bold">
                    {currentQuestionIndex + 1}
                  </div>
                  <CardTitle className="text-lg sm:text-xl">
                    {currentQuestion.question_text}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold">
                      Your Response
                    </h3>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {wordCounts.user} words
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border max-h-64 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">
                      {currentQuestion.user_answer || "No answer provided"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold">
                      Our Response
                    </h3>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {wordCounts.ai} words
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border max-h-64 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">
                      {currentQuestion.llm_response}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden shadow-lg border-2 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="text-center md:text-left">
                  <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-[var(--color-purple-muted)] text-white rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    Evaluate the Response
                  </h2>
                  <div className="space-y-3">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    For each quality below, select Yes if the response meets the quality, or No if it doesn't. Skip any that don't apply.
                  </p>
                  </div>
                </div>

                <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-lg border" id="rubric-table">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-zinc-800">
                      <tr>
                        <th className="text-left p-3 font-semibold text-sm border-b min-w-[200px]">
                          Qualities
                        </th>
                        <th className="text-center p-3 font-semibold text-sm border-b min-w-[200px]">
                          Yes/No
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentQuestion.rubrics?.map((quality, idx) => (
                        <tr
                          key={quality}
                          className={`${idx % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-slate-25 dark:bg-zinc-800/30"} hover:bg-slate-50 dark:hover:bg-zinc-800/50`}
                        >
                          <td className="p-3 text-xs sm:text-sm font-medium border-b">
                            {quality}
                          </td>
                          <td className="text-center p-3 border-b">
                            <div className="flex justify-center gap-2" id={idx === 0 ? "pass-fail-example" : undefined}>
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="radio"
                                  name={`passfail-${quality}`}
                                  value="pass"
                                  checked={qualityPassFail[quality] === "pass"}
                                  onChange={() =>
                                    handlePassFailSelection(quality, "pass")
                                  }
                                  className="sr-only"
                                />
                                <span
                                  className={`px-4 py-2 rounded text-sm font-semibold ${
                                    qualityPassFail[quality] === "pass"
                                      ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                  }`}
                                >
                                  Yes
                                </span>
                              </label>
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="radio"
                                  name={`passfail-${quality}`}
                                  value="fail"
                                  checked={qualityPassFail[quality] === "fail"}
                                  onChange={() =>
                                    handlePassFailSelection(quality, "fail")
                                  }
                                  className="sr-only"
                                />
                                <span
                                  className={`px-4 py-2 rounded text-sm font-semibold ${
                                    qualityPassFail[quality] === "fail"
                                      ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                  }`}
                                >
                                  No
                                </span>
                              </label>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 mt-8" id="additional-feedback">
                <label
                  htmlFor="feedback"
                  className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200"
                >
                  Additional Feedback (Optional):
                </label>
                <Textarea
                  id="feedback"
                  placeholder="Share any additional insights about this response..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[100px] text-sm sm:text-base resize-y"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <Button
            onClick={() => router.push("/questions")}
            variant="outline"
            size="lg"
            disabled={isSubmitting}
            className="flex items-center justify-center"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Question
          </Button>

          <Button onClick={handleSubmit} size="lg" disabled={isSubmitting} id="save-continue-button" className="flex items-center justify-center">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {currentQuestionIndex < 24
                  ? "Next Question"
                  : "Complete Review"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
    </NextStep>
  );
}
