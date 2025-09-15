"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Pencil,
  Check,
  X,
  GripVertical,
  ListChecks,
  ArrowDownUp,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { UserResponse } from "@/types";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

// --- Helper Components for Drag-and-Drop ---

function DraggableQuality({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="mb-1 p-1.5 sm:p-2 bg-white dark:bg-zinc-800 border rounded-lg shadow-sm cursor-grab text-xs sm:text-sm"
      style={style}
    >
      {children}
    </div>
  );
}

function CategoryDropzone({
  id,
  title,
  children,
  isOver,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`border-2 rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 min-h-[100px] sm:min-h-[120px] md:min-h-[150px] flex flex-col ${
        isOver
          ? "bg-[#f8f5ff] border-[var(--color-purple-muted-border)] border-dashed"
          : "bg-slate-50 dark:bg-zinc-900/50 border-transparent"
      }`}
    >
      <h3 className="font-semibold text-xs sm:text-sm mb-1 sm:mb-2">{title}</h3>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// --- Main Page Component ---

export default function ClassificationPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedQualities, setSelectedQualities] = useState<
    Record<string, string[]>
  >({});
  const [qualityCategories, setQualityCategories] = useState<
    Record<string, Record<string, string>>
  >({});
  const [editing, setEditing] = useState<
    Record<string, { original: string; current: string } | null>
  >({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [expandedText, setExpandedText] = useState<
    Record<
      string,
      { question?: boolean; userAnswer?: boolean; aiAnswer?: boolean }
    >
  >({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const CATEGORIES = [
    "Accuracy",
    "Communication",
    "Completeness",
    "Context Awareness",
    "Terminology",
  ];

  useEffect(() => {
    try {
      const storedUserId = localStorage.getItem("userId");
      const storedUserName = localStorage.getItem("userName");
      if (!storedUserId) {
        router.push("/");
        return;
      }
      setUserId(storedUserId);
      setUserName(storedUserName || null);
      fetchQuestions(storedUserId);
    } catch (err) {
      setError("Failed to access user information.");
      setIsLoading(false);
    }
  }, [router]);

  const fetchQuestions = async (userIdParam: string) => {
    try {
      const response = await fetch(`/api/get-assigned?user_id=${userIdParam}`);
      const data = await response.json();
      if (!response.ok || !data.questions || !Array.isArray(data.questions)) {
        throw new Error(data.error || "Invalid API response");
      }

      // First, enhance questions with answers from localStorage
      let enhancedQuestions = [...data.questions].map((q: UserResponse) => {
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

      // Then filter to get only answered questions
      const answeredQuestions = enhancedQuestions.filter((q: UserResponse) =>
        q.user_answer?.trim(),
      );

      setQuestions(answeredQuestions);
      const initialSelected: Record<string, string[]> = {};
      const initialCategories: Record<string, Record<string, string>> = {};
      answeredQuestions.forEach((q: UserResponse) => {
        initialSelected[q.question_id] = [];
        initialCategories[q.question_id] = {};
      });
      setSelectedQualities(initialSelected);
      setQualityCategories(initialCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTextExpansion = (
    questionId: string,
    type: "question" | "userAnswer" | "aiAnswer",
  ) => {
    setExpandedText((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], [type]: !prev[questionId]?.[type] },
    }));
  };

  const truncateText = (text: string, maxLength: number = 150) =>
    text.length <= maxLength ? text : text.substring(0, maxLength) + "...";

  const toggleQualitySelection = (questionId: string, quality: string) => {
    setSelectedQualities((prev) => {
      const current = prev[questionId] || [];
      const isSelected = current.includes(quality);
      if (!isSelected && current.length >= 15) return prev;
      const newSelection = isSelected
        ? current.filter((q) => q !== quality)
        : [...current, quality];
      if (isSelected) {
        setQualityCategories((prevCat) => {
          const newCats = { ...prevCat[questionId] };
          delete newCats[quality];
          return { ...prevCat, [questionId]: newCats };
        });
      }
      return { ...prev, [questionId]: newSelection };
    });
  };

  const handleEditQuality = (questionId: string, quality: string) => {
    setEditing({ [questionId]: { original: quality, current: quality } });
  };

  const cancelEdit = (questionId: string) => {
    setEditing((prev) => ({ ...prev, [questionId]: null }));
  };

  const saveEditedQuality = (questionId: string) => {
    const editState = editing[questionId];
    if (!editState || !editState.current.trim()) return;
    const { original, current } = editState;
    setQuestions((prev) =>
      prev.map((q) =>
        q.question_id === questionId
          ? {
              ...q,
              rubrics: q.rubrics?.map((r) => (r === original ? current : r)),
            }
          : q,
      ),
    );
    setSelectedQualities((prev) => ({
      ...prev,
      [questionId]: (prev[questionId] || []).map((q) =>
        q === original ? current : q,
      ),
    }));
    setQualityCategories((prev) => {
      const newCats = { ...prev[questionId] };
      if (newCats[original]) {
        newCats[current] = newCats[original];
        delete newCats[original];
      }
      return { ...prev, [questionId]: newCats };
    });
    cancelEdit(questionId);
  };

  const assignToCategory = (
    questionId: string,
    quality: string,
    category: string,
  ) => {
    setQualityCategories((prev) => {
      const newCats = { ...(prev[questionId] || {}) };
      if (category === "Unassigned") {
        delete newCats[quality];
      } else {
        newCats[quality] = category;
      }
      return { ...prev, [questionId]: newCats };
    });
  };

  const getQualitiesInCategory = (questionId: string, category: string) => {
    const selected = selectedQualities[questionId] || [];
    const categories = qualityCategories[questionId] || {};
    return selected.filter((q) =>
      category === "Unassigned" ? !categories[q] : categories[q] === category,
    );
  };

  const handleSubmit = async () => {
    if (!userId) {
      setError("User ID not found. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Create an object to hold user answers
      const userAnswers: Record<
        string,
        {
          user_answer: string;
          status: string;
          answered_at: string;
        }
      > = {};

      // Create an object to hold ratings
      const userRatings: Record<string, number> = {};

      // Collect answers from questions state and localStorage
      questions.forEach((q) => {
        // First check localStorage for the most recent answer
        const storedAnswer = localStorage.getItem(`answer_${q.question_id}`);
        if (storedAnswer && storedAnswer.trim()) {
          userAnswers[q.question_id] = {
            user_answer: storedAnswer,
            status: "answered",
            answered_at: new Date().toISOString(),
          };
        } else if (q.user_answer) {
          userAnswers[q.question_id] = {
            user_answer: q.user_answer,
            status: "answered",
            answered_at: new Date().toISOString(),
          };
        }

        // Check localStorage for ratings first
        const storedRating = localStorage.getItem(`rating_${q.question_id}`);
        if (storedRating) {
          userRatings[q.question_id] = parseInt(storedRating, 10);
        } else if (q.llm_rating !== undefined && q.llm_rating !== null) {
          userRatings[q.question_id] = q.llm_rating;
        }
      });

      // Save all data at once
      const response = await fetch("/api/save-rubric-choices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          answers: userAnswers,
          ratings: userRatings,
          selectedQualities,
          qualityCategories,
          editedQualities: Object.entries(editing)
            .filter(([_, value]) => value !== null)
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
          feedback,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save data");
      }

      // Clear localStorage after successful submission
      questions.forEach((q) => {
        localStorage.removeItem(`answer_${q.question_id}`);
        localStorage.removeItem(`rating_${q.question_id}`);
      });

      // Navigate to thank you page
      router.push("/thank-you");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save data");
      setIsSubmitting(false);
    }
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event: { active: { id: React.Key } }) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent, questionId: string) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (over && active.id !== over.id) {
      assignToCategory(questionId, active.id as string, over.id as string);
    }
  };

  if (isLoading) {
    /* ... */
  }
  if (questions.length === 0) {
    /* ... */
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Medical Response Analysis</h1>
          {/* CHANGE 3: ADDED INSTRUCTIONS */}
          <p className="text-muted-foreground mt-2 max-w-6xl">
            As a medical expert, please help us analyze the AI's clinical
            responses. Complete the two steps below for each question:
            <br />
            First, select 10-15 qualities that characterize the AI's medical
            assessment.
            <br />
            Then, categorize these qualities to help us understand the AI's
            strengths and limitations in providing healthcare advice and
            information.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4 sm:mb-6">
            <AlertDescription className="text-xs sm:text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-8 sm:space-y-12">
          {questions.map((question, index) => {
            const selectedCount =
              selectedQualities[question.question_id]?.length || 0;
            const isEditing = !!editing[question.question_id];
            return (
              <Card
                key={question.question_id}
                className="shadow-lg border-t-4 border-[var(--color-purple-muted-border)] overflow-hidden"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-purple-muted)] text-white rounded-full flex items-center justify-center text-lg font-bold">
                        {index + 1}
                      </div>
                      {/* CHANGE 2: RESTORED SHOW MORE/LESS FOR QUESTION */}
                      <CardTitle className="text-xl">
                        {expandedText[question.question_id]?.question
                          ? question.question_text
                          : truncateText(question.question_text, 80)}
                        {question.question_text.length > 80 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-1 h-auto text-[var(--color-purple-muted)]"
                            onClick={() =>
                              toggleTextExpansion(
                                question.question_id,
                                "question",
                              )
                            }
                          >
                            {expandedText[question.question_id]?.question
                              ? "Show less"
                              : "Show more"}
                          </Button>
                        )}
                      </CardTitle>
                    </div>
                    {/* CHANGE 1: IMPROVED BADGE READABILITY */}
                    <Badge
                      variant={
                        selectedCount >= 10 && selectedCount <= 15
                          ? "default"
                          : "destructive"
                      }
                      className="text-white dark:text-black font-semibold"
                    >
                      {selectedCount} / 15 selected
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 p-6">
                  <div className="grid md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-lg">
                    {/* CHANGE 2: RESTORED SHOW MORE/LESS FOR ANSWERS */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground flex items-center text-md">
                        Your Answer
                      </h4>
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {expandedText[question.question_id]?.userAnswer
                            ? question.user_answer
                            : truncateText(question.user_answer || "", 150)}
                          {(question.user_answer?.length || 0) > 150 && (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-1 h-auto text-blue-600"
                              onClick={() =>
                                toggleTextExpansion(
                                  question.question_id,
                                  "userAnswer",
                                )
                              }
                            >
                              {expandedText[question.question_id]?.userAnswer
                                ? "Show less"
                                : "Show more"}
                            </Button>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground flex items-center text-md">
                        AI's Medical Assessment
                      </h4>
                      <div className="bg-[#f8f5ff] dark:bg-[var(--color-purple-muted-dark)]/10 p-4 rounded-lg border border-[var(--color-purple-muted-border)] dark:border-[var(--color-purple-muted-dark-border)]">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {expandedText[question.question_id]?.aiAnswer
                            ? question.llm_response
                            : truncateText(question.llm_response, 150)}
                          {question.llm_response.length > 150 && (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-1 h-auto text-[var(--color-purple-muted)]"
                              onClick={() =>
                                toggleTextExpansion(
                                  question.question_id,
                                  "aiAnswer",
                                )
                              }
                            >
                              {expandedText[question.question_id]?.aiAnswer
                                ? "Show less"
                                : "Show more"}
                            </Button>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="text-center lg:text-left">
                        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-1 sm:gap-2">
                          <ListChecks className="text-[var(--color-purple-muted)] h-4 w-4 sm:h-5 sm:w-5" />
                          Step 1: Identify Key Qualities
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Select 10-15 qualities that characterize the AI's
                          response. Click the{" "}
                          <Pencil className="inline h-3 w-3" /> to modify if
                          needed.
                        </p>
                      </div>
                      <div className="space-y-1 p-2 sm:p-3 border rounded-lg max-h-[300px] sm:max-h-[400px] md:max-h-[500px] overflow-y-auto bg-white dark:bg-zinc-900">
                        {question.rubrics?.map((quality, idx) => {
                          const isSelected =
                            selectedQualities[question.question_id]?.includes(
                              quality,
                            );
                          const isCurrentlyEditing =
                            editing[question.question_id]?.original === quality;
                          return (
                            <div
                              key={quality}
                              className={`flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg transition-colors ${isSelected ? "bg-[#f8f5ff] dark:bg-[var(--color-purple-muted-dark)]/20" : "hover:bg-slate-50 dark:hover:bg-zinc-800/50"}`}
                            >
                              {isCurrentlyEditing ? (
                                <div className="flex-1 flex items-center gap-1 sm:gap-2">
                                  <Input
                                    value={
                                      editing[question.question_id]?.current ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      setEditing((prev) => ({
                                        ...prev,
                                        [question.question_id]: {
                                          ...prev[question.question_id]!,
                                          current: e.target.value,
                                        },
                                      }))
                                    }
                                    className="h-7 sm:h-8 text-xs sm:text-sm"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                    onClick={() =>
                                      saveEditedQuality(question.question_id)
                                    }
                                  >
                                    <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                    onClick={() =>
                                      cancelEdit(question.question_id)
                                    }
                                  >
                                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <input
                                    type="checkbox"
                                    id={`${question.question_id}-${idx}`}
                                    checked={isSelected}
                                    onChange={() =>
                                      toggleQualitySelection(
                                        question.question_id,
                                        quality,
                                      )
                                    }
                                    className="h-4 w-4 sm:h-5 sm:w-5 rounded border-gray-300 text-[var(--color-purple-muted)] focus:ring-[var(--color-purple-muted-border)]"
                                  />
                                  <label
                                    htmlFor={`${question.question_id}-${idx}`}
                                    className="flex-1 text-xs sm:text-sm cursor-pointer"
                                  >
                                    {quality}
                                  </label>
                                  <Button
                                    disabled={isEditing}
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0"
                                    onClick={() =>
                                      handleEditQuality(
                                        question.question_id,
                                        quality,
                                      )
                                    }
                                  >
                                    <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="text-center lg:text-left">
                        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-1 sm:gap-2">
                          <ArrowDownUp className="text-[var(--color-purple-muted)] h-4 w-4 sm:h-5 sm:w-5" />
                          Step 2: Categorize Response Attributes
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Drag each quality into the most appropriate medical
                          category to help us understand the AI's clinical
                          strengths and weaknesses.
                        </p>
                      </div>
                      <DndContext
                        sensors={sensors}
                        onDragStart={handleDragStart}
                        onDragEnd={(e) =>
                          handleDragEnd(e, question.question_id)
                        }
                      >
                        <div className="space-y-3 sm:space-y-4">
                          <CategoryDropzone
                            id="Unassigned"
                            title="Unclassified Qualities (Drag to Categories)"
                            isOver={
                              activeDragId
                                ? "Unassigned" ===
                                  (qualityCategories[question.question_id]?.[
                                    activeDragId
                                  ] || "Unassigned")
                                : false
                            }
                          >
                            {getQualitiesInCategory(
                              question.question_id,
                              "Unassigned",
                            ).map((quality) => (
                              <DraggableQuality key={quality} id={quality}>
                                {quality}
                              </DraggableQuality>
                            ))}
                          </CategoryDropzone>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {CATEGORIES.map((category) => (
                              <CategoryDropzone
                                key={category}
                                id={category}
                                title={category}
                                isOver={
                                  activeDragId
                                    ? category ===
                                      qualityCategories[question.question_id]?.[
                                        activeDragId
                                      ]
                                    : false
                                }
                              >
                                {getQualitiesInCategory(
                                  question.question_id,
                                  category,
                                ).map((quality) => (
                                  <DraggableQuality key={quality} id={quality}>
                                    {quality}
                                  </DraggableQuality>
                                ))}
                              </CategoryDropzone>
                            ))}
                          </div>
                        </div>
                      </DndContext>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 sm:mt-6 sm:pt-6 border-t">
                    <h4 className="font-medium text-sm sm:text-base mb-2">
                      Additional Clinical Insights
                    </h4>
                    <Textarea
                      placeholder="Share any professional observations about the AI's clinical reasoning, knowledge gaps, or areas for improvement..."
                      value={feedback[question.question_id] || ""}
                      onChange={(e) =>
                        setFeedback((prev) => ({
                          ...prev,
                          [question.question_id]: e.target.value,
                        }))
                      }
                      className="min-h-[60px] sm:min-h-[80px] text-xs sm:text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-0">
          <Button
            onClick={() => router.push("/rating")}
            variant="outline"
            size="lg"
            disabled={isSubmitting}
            className="text-xs sm:text-sm h-10 sm:h-11"
          >
            <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Return
            to Rating Assessment
          </Button>
          <Button
            onClick={handleSubmit}
            size="lg"
            disabled={isSubmitting}
            className="text-xs sm:text-sm h-10 sm:h-11"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Submit Expert Evaluation
                <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
