"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowRight, Save, ArrowLeft } from "lucide-react"
import type { UserResponse } from "@/types"

export default function QuestionsPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<UserResponse[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({})
  const [error, setError] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [showBackConfirm, setShowBackConfirm] = useState(false)

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId")
    const storedUserName = localStorage.getItem("userName")

    if (!storedUserId) {
      router.push("/")
      return
    }

    setUserId(storedUserId)
    setUserName(storedUserName)
    fetchQuestions(storedUserId)
  }, [router])

  const fetchQuestions = async (userIdParam: string) => {
    try {
      const response = await fetch(`/api/get-assigned?user_id=${userIdParam}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch questions")
      }

      setQuestions(data.questions)

      // Initialize answers with existing user answers
      const initialAnswers: Record<string, string> = {}
      data.questions.forEach((q: UserResponse) => {
        if (q.user_answer) {
          initialAnswers[q.question_id] = q.user_answer
        }
      })
      setAnswers(initialAnswers)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load questions")
    } finally {
      setIsLoading(false)
    }
  }

  const saveAnswer = async (questionId: string, answer: string) => {
    if (!userId || !answer.trim()) return

    setIsSaving((prev) => ({ ...prev, [questionId]: true }))

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
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save answer")
      }

      // Update local state
      setQuestions((prev) =>
        prev.map((q) =>
          q.question_id === questionId ? { ...q, user_answer: answer.trim(), status: "answered" as const } : q,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save answer")
    } finally {
      setIsSaving((prev) => ({ ...prev, [questionId]: false }))
    }
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const proceedToRating = () => {
    const answeredQuestions = questions.filter((q) => q.status === "answered" || answers[q.question_id]?.trim())

    if (answeredQuestions.length === 0) {
      setError("Please answer at least one question before proceeding to rating")
      return
    }

    router.push("/rating")
  }

  const handleBackClick = () => {
    setShowBackConfirm(true)
  }

  const confirmBack = () => {
    // Clear user session data
    localStorage.removeItem("userId")
    localStorage.removeItem("userName")
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading questions...</span>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>No Questions Available</CardTitle>
            <CardDescription>There are no questions assigned to you at this time.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {showBackConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Confirm Navigation</CardTitle>
              <CardDescription>
                Are you sure you want to go back to the main page? Your progress will be saved, but you'll need to enter
                your information again to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowBackConfirm(false)} className="flex-1">
                Cancel
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
                // Try second logo if first fails
                e.currentTarget.src = "/logo2.png"
                e.currentTarget.onerror = () => {
                  // Fallback to placeholder if both logos not found
                  e.currentTarget.style.display = "none"
                  e.currentTarget.nextElementSibling.style.display = "flex"
                }
              }}
            />
            <div
              className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-sm"
              style={{ display: "none" }}
            >
              <span className="text-primary-foreground font-bold">LOGO</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Clinical Questions</h1>
              <p className="text-muted-foreground">Please provide your clinical approach to the following scenarios</p>
            </div>
          </div>

          <Button
            onClick={handleBackClick}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2 bg-transparent"
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

        <div className="space-y-6">
          {questions.map((question, index) => (
            <Card key={question.question_id} className="shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg leading-relaxed">{question.question_text}</CardTitle>
                    </div>
                  </div>
                  <Badge variant={question.status === "answered" ? "default" : "secondary"}>
                    {question.status === "answered" ? "Answered" : "Pending"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Describe your clinical approach...</label>
                  <Textarea
                    placeholder="Please provide your detailed clinical approach to this scenario..."
                    value={answers[question.question_id] || ""}
                    onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => saveAnswer(question.question_id, answers[question.question_id] || "")}
                    disabled={!answers[question.question_id]?.trim() || isSaving[question.question_id]}
                    size="sm"
                    variant="outline"
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
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            onClick={proceedToRating}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            Proceed to Rating
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
