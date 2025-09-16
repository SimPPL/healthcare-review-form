/**
 * Client-side API helper functions
 * This file contains functions for interacting with the server-side API routes
 * These functions should be used in client components or pages
 */

// Types
export type UserInfo = {
  name: string;
  profession: string;
  email: string;
  phone?: string;
  clinicalExperience?: string;
  aiExposure?: string;
};

export type QuestionItem = {
  question_id: string;
  question_text: string;
  llm_response: string;
  answer?: string;
  answer_hindi?: string;
  answer_marathi?: string;
  axis_scores?: Record<string, number>;
  classification?: string;
  medical_quality_score?: number;
  references?: string[];
  rubric_scores?: Record<string, number>;
  rubrics?: string[];
  target_evaluations?: number;
  theme?: string;
  times_answered?: number;
};

// Helper function to handle API errors
async function handleResponse(response: Response) {
  if (!response.ok) {
    // Try to parse error as JSON first
    let errorMessage = "API request failed";
    try {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || "API request failed";
      } catch (parseError) {
        // If JSON parsing fails, use the raw text
        errorMessage = errorText.length > 100
          ? `${errorText.substring(0, 100)}...`
          : errorText;
      }
    } catch (e) {
      errorMessage = `Request failed with status ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// API functions
export async function assignQuestions(userInfo: UserInfo): Promise<{ userId: string, assignedQuestions: number }> {
  const timestamp = new Date().getTime(); // Prevent caching
  const response = await fetch(`/api/assign-questions?t=${timestamp}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store",
    },
    body: JSON.stringify({ userInfo }),
  });

  return handleResponse(response);
}

export async function saveAnswer(
  userId: string,
  questionId: string,
  answer: string
): Promise<{ success: boolean }> {
  const timestamp = new Date().getTime(); // Prevent caching
  const response = await fetch(`/api/save-answer?t=${timestamp}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store",
    },
    body: JSON.stringify({ userId, questionId, answer }),
  });

  return handleResponse(response);
}

export async function saveRating(
  userId: string,
  questionId: string,
  ratings: Record<string, number>
): Promise<{ success: boolean }> {
  const timestamp = new Date().getTime(); // Prevent caching
  const response = await fetch(`/api/save-rating?t=${timestamp}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store",
    },
    body: JSON.stringify({ userId, questionId, ratings }),
  });

  return handleResponse(response);
}

export async function saveRubricChoices(
  userId: string,
  questionId: string,
  rubricChoices: Record<string, string | number>
): Promise<{ success: boolean }> {
  const timestamp = new Date().getTime(); // Prevent caching
  const response = await fetch(`/api/save-rubric-choices?t=${timestamp}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store",
    },
    body: JSON.stringify({ userId, questionId, rubricChoices }),
  });

  return handleResponse(response);
}

export async function getAssignedQuestions(
  userId: string
): Promise<{ questions: Record<string, QuestionItem> }> {
  const timestamp = new Date().getTime(); // Prevent caching
  const response = await fetch(`/api/get-assigned?userId=${userId}&t=${timestamp}`, {
    headers: {
      "Cache-Control": "no-cache, no-store",
    },
  });

  return handleResponse(response);
}

export async function testAwsConnection(): Promise<any> {
  const timestamp = new Date().getTime(); // Prevent caching
  const response = await fetch(`/api/test-aws?t=${timestamp}`, {
    headers: {
      "Cache-Control": "no-cache, no-store",
    },
  });

  return handleResponse(response);
}
