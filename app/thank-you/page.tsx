"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Home, RotateCcw } from "lucide-react"

export default function ThankYouPage() {
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId")
    const storedUserName = localStorage.getItem("userName")

    if (!storedUserId) {
      router.push("/")
      return
    }

    setUserId(storedUserId)
    setUserName(storedUserName)
  }, [router])

  const startNewEvaluation = () => {
    // Clear current session data
    localStorage.removeItem("userId")
    localStorage.removeItem("userName")

    // Navigate to home page for new evaluation
    router.push("/")
  }

  const goHome = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold text-foreground mb-2">Evaluation Complete!</CardTitle>
              <CardDescription className="text-muted-foreground">
                Thank you for participating in the Medical Expert Evaluation
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {userName && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Completed by</p>
                <p className="font-medium text-foreground">{userName}</p>
              </div>
            )}

            <div className="text-left space-y-2">
              <h4 className="font-medium text-foreground">What happens next?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Your responses have been saved to our database</li>
                <li>• Your evaluations will help improve AI medical responses</li>
                <li>• All data is stored securely and anonymously</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={startNewEvaluation}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Start New Evaluation
              </Button>

              <Button onClick={goHome} variant="outline" className="w-full bg-transparent">
                <Home className="mr-2 h-4 w-4" />
                Return to Home
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Thank you for contributing to medical AI research and helping improve healthcare technology.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
