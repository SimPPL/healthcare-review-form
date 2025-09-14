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
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 bg-white dark:bg-zinc-800 rounded-lg shadow-md border flex items-center gap-3 cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="h-5 w-5 text-muted-foreground" />
      <span className="flex-1 text-sm">{children}</span>
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
      className={`border-2 rounded-xl p-4 transition-all duration-200 min-h-[150px] flex flex-col ${
        isOver
          ? "bg-purple-50 border-purple-400 border-dashed"
          : "bg-slate-50 dark:bg-zinc-900/50 border-transparent"
      }`}
    >
      <h4 className="font-semibold text-sm mb-3 text-zinc-600 dark:text-zinc-300">
        {title}
      </h4>
      <div className="flex-1 space-y-2">{children}</div>
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
    Record<string, { original: string; current: string }>
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
      const answeredQuestions = data.questions.filter((q: UserResponse) =>
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
    setEditing({ [questionId]: null });
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
    // ... (No changes here)
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
          <h1 className="text-3xl font-bold">Quality Classification</h1>
          {/* CHANGE 3: ADDED INSTRUCTIONS */}
          <p className="text-muted-foreground mt-2 max-w-3xl">
            This is a two-step process. For each question below, first select
            10-15 relevant qualities from the list. Then, drag and drop those
            qualities from the "Unassigned" area into the best-fitting
            categories.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-12">
          {questions.map((question, index) => {
            const selectedCount =
              selectedQualities[question.question_id]?.length || 0;
            const isEditing = !!editing[question.question_id];
            return (
              <Card
                key={question.question_id}
                className="shadow-lg border-t-4 border-purple-500 overflow-hidden"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center text-lg font-bold">
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
                            className="p-1 h-auto text-purple-600"
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
                        AI Answer
                      </h4>
                      <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {expandedText[question.question_id]?.aiAnswer
                            ? question.llm_response
                            : truncateText(question.llm_response, 150)}
                          {question.llm_response.length > 150 && (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-1 h-auto text-purple-600"
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
                    <div className="space-y-4">
                      <div className="text-center lg:text-left">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          <ListChecks className="text-purple-500" />
                          Step 1: Select & Refine Qualities
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Check 10-15 qualities. Click the{" "}
                          <Pencil className="inline h-3 w-3" /> to edit text.
                        </p>
                      </div>
                      <div className="space-y-1 p-3 border rounded-lg max-h-[500px] overflow-y-auto bg-white dark:bg-zinc-900">
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
                              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${isSelected ? "bg-purple-50 dark:bg-purple-950/40" : "hover:bg-slate-50 dark:hover:bg-zinc-800/50"}`}
                            >
                              {isCurrentlyEditing ? (
                                <div className="flex-1 flex items-center gap-2">
                                  <Input
                                    value={
                                      editing[question.question_id]?.current ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      setEditing({
                                        [question.question_id]: {
                                          ...editing[question.question_id]!,
                                          current: e.target.value,
                                        },
                                      })
                                    }
                                    className="h-8"
                                  />
                                  <Button
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                      saveEditedQuality(question.question_id)
                                    }
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() =>
                                      cancelEdit(question.question_id)
                                    }
                                  >
                                    <X className="h-4 w-4" />
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
                                    className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  />
                                  <label
                                    htmlFor={`${question.question_id}-${idx}`}
                                    className="flex-1 text-sm cursor-pointer"
                                  >
                                    {quality}
                                  </label>
                                  <Button
                                    disabled={isEditing}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                      handleEditQuality(
                                        question.question_id,
                                        quality,
                                      )
                                    }
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="text-center lg:text-left">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          <ArrowDownUp className="text-purple-500" />
                          Step 2: Classify Qualities
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Drag the selected qualities into the best-fitting
                          groups below.
                        </p>
                      </div>
                      <DndContext
                        sensors={sensors}
                        onDragStart={handleDragStart}
                        onDragEnd={(e) =>
                          handleDragEnd(e, question.question_id)
                        }
                      >
                        <div className="space-y-4">
                          <CategoryDropzone
                            id="Unassigned"
                            title="Unassigned"
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium mb-2">
                      Any suggestions or missing qualities?
                    </h4>
                    <Textarea
                      placeholder="Provide feedback..."
                      value={feedback[question.question_id] || ""}
                      onChange={(e) =>
                        setFeedback((prev) => ({
                          ...prev,
                          [question.question_id]: e.target.value,
                        }))
                      }
                      className="min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex justify-between">
          <Button
            onClick={() => router.push("/rating")}
            variant="outline"
            size="lg"
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Ratings
          </Button>
          <Button onClick={handleSubmit} size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Finish
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
