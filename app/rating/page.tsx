"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [wordCounts, setWordCounts] = useState<
    Record<string, { user: number; ai: number }>
  >({});

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

      // Get all questions, we'll check localStorage for answers
      let answeredQuestions = [...data.questions];

      // First check if there are any answers in localStorage
      answeredQuestions = answeredQuestions.map((q) => {
        const storedAnswer = localStorage.getItem(`answer_${q.question_id}`);
        if (storedAnswer && storedAnswer.trim()) {
          return {
            ...q,
            user_answer: storedAnswer.trim(),
            status: "answered" as const,
          };
        }
        return q;
      });

      // Then filter questions that have answers (either from API or localStorage)
      answeredQuestions = answeredQuestions.filter(
        (q: UserResponse) => q.user_answer && q.user_answer.trim(),
      );

      console.log(
        `Found ${answeredQuestions.length} answered questions out of ${data.questions.length} total`,
      );

      // Process questions and add ratings from localStorage
      const processedQuestions = answeredQuestions.map((q: UserResponse) => {
        const storedRating = localStorage.getItem(`rating_${q.question_id}`);
        if (storedRating) {
          return {
            ...q,
            llm_rating: parseInt(storedRating, 10),
            status: "submitted" as const,
          };
        }
        return q;
      });

      setQuestions(processedQuestions);

      // Calculate word counts for all questions
      const newWordCounts: Record<string, { user: number; ai: number }> = {};
      processedQuestions.forEach((q: UserResponse) => {
        newWordCounts[q.question_id] = {
          user: countWords(q.user_answer || ""),
          ai: countWords(q.llm_response || ""),
        };
      });
      setWordCounts(newWordCounts);

      const initialRatings: Record<string, number> = {};
      processedQuestions.forEach((q: UserResponse) => {
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
    setIsSaving((prev) => ({ ...prev, [questionId]: true }));

    try {
      // Save rating to localStorage instead of making API call
      localStorage.setItem(`rating_${questionId}`, rating.toString());

      // Update UI state
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

  const countWords = useCallback((text: string): number => {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  }, []);

  const handleSaveEditedAnswer = (questionId: string) => {
    const updatedAnswer = editedAnswers[questionId];
    setQuestions((prev) =>
      prev.map((q) =>
        q.question_id === questionId ? { ...q, user_answer: updatedAnswer } : q,
      ),
    );

    // Update word count for the edited answer
    setWordCounts((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        user: countWords(updatedAnswer || ""),
      },
    }));

    setEditing((prev) => ({ ...prev, [questionId]: false }));
  };

  const proceedToClassification = () => {
    const ratedQuestions = questions.filter(
      (q) => ratings[q.question_id] !== undefined,
    );
    if (ratedQuestions.length === 0) {
      setError(
        "Please rate at least one AI answer before continuing to the classification page.",
      );
      return;
    }

    // Save all current ratings to localStorage before proceeding
    Object.entries(ratings).forEach(([questionId, rating]) => {
      localStorage.setItem(`rating_${questionId}`, rating.toString());
    });

    // Also save the questions with their answers to localStorage for easy access
    questions.forEach((q) => {
      if (q.user_answer && q.user_answer.trim()) {
        localStorage.setItem(`answer_${q.question_id}`, q.user_answer);
      }
    });

    router.push("/classification");
  };

  const goBackToQuestions = () => {
    router.push("/questions");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
          <span className="text-sm sm:text-base">Loading evaluation...</span>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">
              No Answered Questions Found
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              You haven't provided any clinical assessments yet. Please go back
              to the previous page and share your expert opinion on at least one
              question before proceeding to evaluate the AI's responses.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <Button
              onClick={goBackToQuestions}
              variant="outline"
              className="text-xs sm:text-sm h-8 sm:h-9"
            >
              Back to Clinical Questions
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
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Evaluate AI Responses
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl">
                Compare your expert assessment with the AI's response. Please
                rate how well the AI performed on a scale of 0 (poor) to 10
                (excellent), considering factors like accuracy, completeness,
                and clinical relevance.
              </p>
            </div>
            <div className="text-left sm:text-right mt-2 sm:mt-0 bg-slate-100 dark:bg-zinc-900 p-2 rounded-lg sm:bg-transparent sm:p-0 sm:rounded-none">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Progress
              </div>
              <div className="text-base sm:text-lg font-semibold text-foreground">
                {completedRatings} / {totalQuestions}
              </div>
            </div>
          </div>
          {userName && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              Evaluator: <span className="font-medium">{userName}</span>
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-8 sm:space-y-12">
          {questions.map((question, index) => (
            <Card
              key={question.question_id}
              className="shadow-lg border-t-4 border-[var(--color-purple-muted-border)] overflow-hidden"
            >
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-[var(--color-purple-muted)] text-white rounded-full flex items-center justify-center text-base sm:text-lg font-bold mt-1">
                      {index + 1}
                    </div>
                    <CardTitle className="text-base sm:text-xl leading-tight sm:leading-relaxed">
                      {question.question_text}
                    </CardTitle>
                  </div>
                  <Badge
                    variant={
                      ratings[question.question_id] !== undefined
                        ? "default"
                        : "secondary"
                    }
                    className="self-start mt-2 sm:mt-0 text-xs"
                  >
                    {ratings[question.question_id] !== undefined
                      ? "Rated"
                      : "Pending"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Your Answer */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                      <h4 className="font-semibold text-foreground flex items-center text-sm sm:text-md">
                        Your Expert Assessment
                      </h4>
                      <div className="flex items-center">
                        <span className="text-xs text-muted-foreground mr-2">
                          {wordCounts[question.question_id]?.user || 0} words
                        </span>
                        {!editing[question.question_id] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
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
                            <Pencil className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>

                    {editing[question.question_id] ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedAnswers[question.question_id] || ""}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setEditedAnswers((prev) => ({
                              ...prev,
                              [question.question_id]: newValue,
                            }));
                            setWordCounts((prev) => ({
                              ...prev,
                              [question.question_id]: {
                                ...prev[question.question_id],
                                user: countWords(newValue),
                              },
                            }));
                          }}
                          className="min-h-[100px] sm:min-h-[120px] text-sm"
                        />
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              handleSaveEditedAnswer(question.question_id)
                            }
                          >
                            <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() =>
                              setEditing((prev) => ({
                                ...prev,
                                [question.question_id]: false,
                              }))
                            }
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {question.user_answer}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI Answer */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                      <h4 className="font-semibold text-foreground flex items-center text-sm sm:text-md">
                        AI's Response
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {wordCounts[question.question_id]?.ai || 0} words
                      </span>
                    </div>
                    <div className="bg-[#f8f5ff] dark:bg-[var(--color-purple-muted-dark)]/10 p-3 sm:p-4 rounded-lg border border-[var(--color-purple-muted-border)] dark:border-[var(--color-purple-muted-dark-border)]">
                      <p className="text-xs sm:text-sm leading-relaxed">
                        {question.llm_response}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rating Section */}
                <div className="border-t pt-4 sm:pt-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground text-center text-sm sm:text-md">
                      Rate the quality of the AI's clinical assessment:
                    </h4>
                    <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                      <span className="text-xs sm:text-sm text-muted-foreground w-8 sm:w-12 text-right">
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
                            className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center ${
                              ratings[question.question_id] === rating
                                ? "bg-[var(--color-purple-muted)] text-white scale-110 shadow-lg"
                                : "bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 text-slate-600 dark:text-zinc-300"
                            } ${isSaving[question.question_id] ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {isSaving[question.question_id] &&
                            ratings[question.question_id] === rating ? (
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mx-auto" />
                            ) : (
                              rating
                            )}
                          </button>
                        ))}
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 text-left">
                        Expert
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
          <Button
            onClick={goBackToQuestions}
            variant="outline"
            size="lg"
            className="text-xs sm:text-sm h-10 sm:h-11 order-2 sm:order-1"
          >
            <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Back to Clinical Questions
          </Button>

          <Button
            onClick={proceedToClassification}
            className="bg-[var(--color-purple-muted)] hover:bg-[var(--color-purple-muted-hover)] text-white text-xs sm:text-sm h-10 sm:h-11 order-1 sm:order-2"
            size="lg"
          >
            Proceed to Quality Analysis
            <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
