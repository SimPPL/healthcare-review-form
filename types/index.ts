export interface Question {
  question_id: string
  question_text: string
  llm_response: string
  target_evaluations: number
  theme: string
  times_answered: number
}

export interface UserResponse {
  user_id: string
  question_id: string
  user_name: string
  user_profession: string
  user_extra_info: string
  question_text: string
  llm_response: string
  status: "assigned" | "answered" | "submitted"
  assigned_at: string
  user_answer?: string
  llm_rating?: number
  submitted_at?: string
}

export interface UserInfo {
  name: string
  profession: string
  extraInfo?: string
}
