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
import { useTourGuide } from "@/hooks/useTourGuide";

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
  const [currentQuestion, setCurrentQuestion] = useState<UserResponse | null>(
    null,
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Single question state
  const [selectedQualities, setSelectedQualities] = useState<string[]>([]);
  const [qualityCategories, setQualityCategories] = useState<
    Record<string, string>
  >({});
  const [editing, setEditing] = useState<{
    original: string;
    current: string;
  } | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const { startTour } = useTourGuide();

  // Rating and editing state
  const [rating, setRating] = useState<number | null>(null);
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [editedAnswer, setEditedAnswer] = useState<string>("");
  const [originalAnswer, setOriginalAnswer] = useState<string>("");
  const [wordCounts, setWordCounts] = useState<{ user: number; ai: number }>({
    user: 0,
    ai: 0,
  });

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

      // Get current question info from localStorage
      const currentQuestionInfo = localStorage.getItem(
        "currentQuestionForClassification",
      );
      if (currentQuestionInfo) {
        const { questionId, questionIndex } = JSON.parse(currentQuestionInfo);
        setCurrentQuestionIndex(questionIndex);
        fetchCurrentQuestion(storedUserId, questionId);
      } else {
        setError("No question selected for classification.");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Failed to access user information.");
      setIsLoading(false);
    }
  }, [router]);

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

      // Find the specific question
      const question = data.questions.find(
        (q: UserResponse) => q.question_id === questionId,
      );
      if (!question) {
        throw new Error("Question not found");
      }

      // Enhance with stored data
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

      // Initialize rating and word counts
      setRating(storedRating ? parseInt(storedRating, 10) : null);
      setEditedAnswer(enhancedQuestion.user_answer || "");
      setOriginalAnswer(enhancedQuestion.user_answer || "");
      setWordCounts({
        user: countWords(enhancedQuestion.user_answer || ""),
        ai: countWords(enhancedQuestion.llm_response || ""),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load question");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize tour guide
  useEffect(() => {
    if (currentQuestion && !isLoading) {
      startTour(
        {
          steps: [
            {
              title: "Welcome to Classification",
              content:
                "Here you'll analyze the AI's response in three structured steps.",
              target: "#classification-intro",
            },
            {
              title: "Step 1: Rate the AI Response",
              content:
                "First, provide a numerical rating for the quality of the AI's clinical assessment.",
              target: "#rating-section",
            },
            {
              title: "Step 2: Select Key Qualities",
              content:
                "Choose 10-15 qualities that best characterize the AI's medical response.",
              target: "#qualities-section",
            },
            {
              title: "Step 3: Categorize Qualities",
              content:
                "Drag your selected qualities into appropriate medical categories to complete the analysis.",
              target: "#categorization-section",
            },
          ],
          completeOnFinish: true,
          nextLabel: "Next",
          prevLabel: "Back",
          finishLabel: "Got it!",
          closeButton: true,
        },
        "classification-tour-seen",
      );
    }
  }, [currentQuestion, isLoading, startTour]);

  const countWords = (text: string): number => {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  };

  const handleRatingClick = (ratingValue: number) => {
    setRating(ratingValue);
    setIsSavingRating(true);

    try {
      localStorage.setItem(
        `rating_${currentQuestion?.question_id}`,
        ratingValue.toString(),
      );
    } catch (err) {
      console.error("Failed to save rating:", err);
    } finally {
      setIsSavingRating(false);
    }
  };

  const handleSaveEditedAnswer = () => {
    if (!currentQuestion || !editedAnswer.trim()) return;

    localStorage.setItem(
      `answer_${currentQuestion.question_id}`,
      editedAnswer.trim(),
    );

    // Track answer edit if it changed
    if (editedAnswer.trim() !== originalAnswer.trim()) {
      const editHistory = {
        original_answer: originalAnswer,
        edited_answer: editedAnswer.trim(),
        edited_at: new Date().toISOString(),
      };
      localStorage.setItem(
        `answer_edit_${currentQuestion.question_id}`,
        JSON.stringify(editHistory),
      );
    }

    setCurrentQuestion((prev) =>
      prev ? { ...prev, user_answer: editedAnswer.trim() } : null,
    );
    setWordCounts((prev) => ({ ...prev, user: countWords(editedAnswer) }));
    setEditingAnswer(false);
  };

  const toggleQualitySelection = (quality: string) => {
    setSelectedQualities((prev) => {
      if (prev.includes(quality)) {
        // Remove from selected and from categories
        setQualityCategories((prevCat) => {
          const newCat = { ...prevCat };
          delete newCat[quality];
          return newCat;
        });
        return prev.filter((q) => q !== quality);
      } else {
        return [...prev, quality];
      }
    });
  };

  const handleEditQuality = (quality: string) => {
    setEditing({ original: quality, current: quality });
  };

  const handleSaveEdit = () => {
    if (!editing) return;

    // Update selected qualities
    setSelectedQualities((prev) =>
      prev.map((q) => (q === editing.original ? editing.current : q)),
    );

    // Update categories if the quality was categorized
    if (qualityCategories[editing.original]) {
      const category = qualityCategories[editing.original];
      setQualityCategories((prev) => {
        const newCat = { ...prev };
        delete newCat[editing.original];
        newCat[editing.current] = category;
        return newCat;
      });
    }

    setEditing(null);
  };

  const assignToCategory = (quality: string, category: string) => {
    setQualityCategories((prev) => ({
      ...prev,
      [quality]: category,
    }));
  };

  const handleSubmit = async () => {
    if (!userId || !currentQuestion) {
      setError("Missing required data. Please try again.");
      return;
    }

    // Validate minimum 10 rubrics are selected
    if (selectedQualities.length < 10) {
      setError(
        `Please select at least 10 rubrics to proceed. Currently selected: ${selectedQualities.length}/10`,
      );
      return;
    }

    // Validate rating is provided
    if (rating === null) {
      setError(
        "Please provide a rating for the AI response before proceeding.",
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Prepare data for this single question
      const questionData = {
        [currentQuestion.question_id]: selectedQualities,
      };

      const categoryData = {
        [currentQuestion.question_id]: qualityCategories,
      };

      const feedbackData = feedback
        ? {
            [currentQuestion.question_id]: feedback,
          }
        : {};

      const editedQualities =
        editing && editing.original !== editing.current
          ? {
              [editing.original]: editing.current,
            }
          : {};

      // Prepare answer edit history
      const answerEditHistory: Record<string, any> = {};
      const storedEditHistory = localStorage.getItem(
        `answer_edit_${currentQuestion.question_id}`,
      );
      if (storedEditHistory) {
        try {
          const editData = JSON.parse(storedEditHistory);
          answerEditHistory[currentQuestion.question_id] = [editData];
        } catch (err) {
          console.error("Failed to parse answer edit history:", err);
        }
      }

      // Save rating first
      const saveRatingResponse = await fetch("/api/save-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          questionId: currentQuestion.question_id,
          llmRating: rating,
        }),
      });

      if (!saveRatingResponse.ok) {
        throw new Error("Failed to save rating");
      }

      // Save classification data for this question
      const response = await fetch("/api/save-rubric-choices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          selectedQualities: questionData,
          qualityCategories: categoryData,
          editedQualities,
          feedback: feedbackData,
          answerEditHistory,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save data");
      }

      // Mark this question as classification completed
      localStorage.setItem(
        `classification_${currentQuestion.question_id}`,
        "completed",
      );

      // Clear current question data
      localStorage.removeItem("currentQuestionForClassification");

      // Move to next question or complete
      const totalQuestions = 20; // You can make this dynamic
      if (currentQuestionIndex < totalQuestions - 1) {
        // Go back to questions page for next question
        const nextIndex = currentQuestionIndex + 1;
        localStorage.setItem("currentQuestionIndex", nextIndex.toString());
        router.push("/questions");
      } else {
        // All questions completed
        router.push("/thank-you");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save data");
      setIsSubmitting(false);
    }
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event: { active: { id: React.Key } }) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (over && active.id !== over.id) {
      assignToCategory(active.id as string, over.id as string);
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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="container mx-auto px-6 py-10 max-w-7xl">
        <div className="mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6">
            Medical Response Analysis
          </h1>
          <div
            id="classification-intro"
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6"
          >
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-6xl">
              As a medical expert, please help us analyze the AI's clinical
              responses. Complete the three steps below for this question:
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Step 1:
                </span>{" "}
                Based on the AI's responses, help us rate the quality of the
                AI's clinical assessment.
              </p>
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Step 2:
                </span>{" "}
                Select 10-15 qualities that characterize the AI's medical
                assessment.
              </p>
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Step 3:
                </span>{" "}
                Categorize these qualities to help us understand the AI's
                strengths and limitations.
              </p>
            </div>
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
              Question {currentQuestionIndex + 1} of 20
            </h2>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-6">
              <div
                className="bg-[var(--color-purple-muted)] h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / 20) * 100}%` }}
              ></div>
            </div>
          </div>

          <Card className="overflow-hidden shadow-lg border-2 border-slate-200 dark:border-slate-700">
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
                <Badge
                  variant={
                    selectedQualities.length >= 10 &&
                    selectedQualities.length <= 15
                      ? "default"
                      : "destructive"
                  }
                  className="text-white dark:text-black font-semibold"
                >
                  {selectedQualities.length} / 15 selected
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-8 p-6">
              <div className="grid md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                    <h4 className="font-semibold text-foreground flex items-center text-md">
                      Your Expert Assessment
                    </h4>
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground mr-2">
                        {wordCounts.user} words
                      </span>
                      {!editingAnswer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setEditedAnswer(currentQuestion.user_answer || "");
                            setOriginalAnswer(
                              currentQuestion.user_answer || "",
                            );
                            setEditingAnswer(true);
                          }}
                        >
                          <Pencil className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>

                  {editingAnswer ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedAnswer}
                        onChange={(e) => {
                          setEditedAnswer(e.target.value);
                          setWordCounts((prev) => ({
                            ...prev,
                            user: countWords(e.target.value),
                          }));
                        }}
                        className="min-h-[100px] sm:min-h-[120px] text-sm"
                      />
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={handleSaveEditedAnswer}
                        >
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setEditingAnswer(false)}
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {currentQuestion.user_answer}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                    <h4 className="font-semibold text-foreground flex items-center text-md">
                      AI's Response
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {wordCounts.ai} words
                    </span>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {currentQuestion.llm_response}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1: Rating Section */}
              <div id="rating-section" className="border-t pt-4 sm:pt-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground text-center text-lg sm:text-xl flex items-center justify-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-[var(--color-purple-muted)] text-white rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    Step 1: Rate the quality of the AI's clinical assessment
                  </h4>
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <span className="text-xs sm:text-sm text-muted-foreground w-8 sm:w-12 text-right">
                      Poor
                    </span>
                    <div className="flex flex-wrap justify-center gap-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((ratingValue) => (
                        <button
                          key={ratingValue}
                          onClick={() => handleRatingClick(ratingValue)}
                          disabled={isSavingRating}
                          className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center ${
                            rating === ratingValue
                              ? "bg-[var(--color-purple-muted)] text-white scale-110 shadow-lg"
                              : "bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 text-slate-600 dark:text-zinc-300"
                          } ${isSavingRating ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {isSavingRating && rating === ratingValue ? (
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mx-auto" />
                          ) : (
                            ratingValue
                          )}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-16 text-left">
                      Expert
                    </span>
                  </div>
                  {rating !== undefined && rating !== null && (
                    <div className="text-center">
                      <Badge variant="default" className="text-xs">
                        Rated: {rating}/10
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Classification Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-12 mt-8 border-t-2 border-slate-200 dark:border-slate-700">
                <div id="qualities-section" className="space-y-6">
                  <div className="text-center lg:text-left">
                    <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-[var(--color-purple-muted)] text-white rounded-full flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      Step 2: Identify Key Qualities
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      Select 10-15 qualities that characterize the AI's
                      response. Click the <Pencil className="inline h-3 w-3" />{" "}
                      to modify if needed.
                    </p>
                  </div>
                  <div className="space-y-1 p-2 sm:p-3 border rounded-lg max-h-[300px] sm:max-h-[400px] md:max-h-[500px] overflow-y-auto bg-white dark:bg-zinc-900">
                    {currentQuestion.rubrics?.map((quality, idx) => {
                      const isSelected = selectedQualities.includes(quality);
                      const isCurrentlyEditing = editing?.original === quality;
                      return (
                        <div
                          key={quality}
                          className={`flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg transition-colors ${
                            isSelected
                              ? "bg-[#f8f5ff] dark:bg-[var(--color-purple-muted-dark)]/20"
                              : "hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                          }`}
                        >
                          {isCurrentlyEditing ? (
                            <div className="flex-1 flex items-center gap-1 sm:gap-2">
                              <Input
                                value={editing?.current || ""}
                                onChange={(e) =>
                                  setEditing((prev) =>
                                    prev
                                      ? { ...prev, current: e.target.value }
                                      : null,
                                  )
                                }
                                className="text-xs sm:text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0"
                                onClick={handleSaveEdit}
                              >
                                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0"
                                onClick={() => setEditing(null)}
                              >
                                <X className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <input
                                type="checkbox"
                                id={`${currentQuestion.question_id}-${idx}`}
                                checked={isSelected}
                                onChange={() => toggleQualitySelection(quality)}
                                className="h-4 w-4 sm:h-5 sm:w-5 rounded border-gray-300 text-[var(--color-purple-muted)] focus:ring-[var(--color-purple-muted-border)]"
                              />
                              <label
                                htmlFor={`${currentQuestion.question_id}-${idx}`}
                                className="flex-1 text-xs sm:text-sm cursor-pointer"
                              >
                                {quality}
                              </label>
                              <Button
                                disabled={!!editing}
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0"
                                onClick={() => handleEditQuality(quality)}
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

                <div id="categorization-section" className="space-y-6">
                  <div className="text-center lg:text-left">
                    <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-[var(--color-purple-muted)] text-white rounded-full flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      Step 3: Categorize Response Attributes
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      Drag each selected quality into the most appropriate
                      medical category to help us understand the AI's clinical
                      strengths and weaknesses.
                    </p>
                  </div>
                  <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Unassigned qualities */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 min-h-[80px]">
                      <h3 className="font-semibold text-sm mb-2 text-gray-600">
                        Unassigned Qualities
                      </h3>
                      <div className="space-y-1">
                        {selectedQualities
                          .filter((quality) => !qualityCategories[quality])
                          .map((quality) => (
                            <DraggableQuality key={quality} id={quality}>
                              <div className="flex items-center justify-between">
                                <span className="flex-1">{quality}</span>
                                <GripVertical className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                              </div>
                            </DraggableQuality>
                          ))}
                      </div>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      {CATEGORIES.map((category) => (
                        <CategoryDropzone
                          key={category}
                          id={category}
                          title={category}
                          isOver={activeDragId !== null}
                        >
                          {selectedQualities
                            .filter(
                              (quality) =>
                                qualityCategories[quality] === category,
                            )
                            .map((quality) => (
                              <DraggableQuality key={quality} id={quality}>
                                <div className="flex items-center justify-between">
                                  <span className="flex-1">{quality}</span>
                                  <GripVertical className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                                </div>
                              </DraggableQuality>
                            ))}
                        </CategoryDropzone>
                      ))}
                    </div>
                  </DndContext>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="space-y-3">
                  <label
                    htmlFor="feedback"
                    className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Additional Feedback (Optional):
                  </label>
                  <Textarea
                    id="feedback"
                    placeholder="Share any additional insights about this AI response..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[100px] text-sm sm:text-base resize-y"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 flex justify-between items-center">
          <Button
            onClick={() => router.push("/questions")}
            variant="outline"
            size="lg"
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Question
          </Button>

          <Button
            onClick={handleSubmit}
            size="lg"
            disabled={
              isSubmitting || selectedQualities.length < 10 || rating === null
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {currentQuestionIndex < 19
                  ? "Next Question"
                  : "Complete Review"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
