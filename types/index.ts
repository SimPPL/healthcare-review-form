export interface Question {
  question_id: string;
  question_text: string;
  answer?: string;
  answer_hindi?: string;
  answer_marathi?: string;
  question_hindi?: string;
  question_marathi?: string;
  references?: string;
  rubrics?: string;
  target_evaluations?: number;
  theme?: string;
  times_answered?: number;
  
  // Legacy fields for backward compatibility
  llm_response?: string;
  axis_scores?: Record<string, number>;
  classification?: string;
  medical_quality_score?: number;
  rubric_scores?: Record<string, number>;
}

export interface UserResponse {
  user_id: string;
  user_name: string;
  user_profession: string;
  user_extra_info?: string;
  email: string;
  phone?: string;
  clinical_experience?: string;
  ai_exposure?: string;

  question_id: string;
  question_text: string;
  llm_response: string;

  user_answer?: string;
  status: "assigned" | "answered" | "submitted" | "classification_completed";
  assigned_at: string;
  submitted_at?: string;

  rubrics: string[];
  selected_rubrics?: string[];
  classified_rubrics?: Record<string, string[]>;
  rubric_feedback?: string;
  edited_rubrics?: Record<string, string>;
  rubric_scores?: Record<string, number>;
  axis_scores?: Record<string, number>;
  classification?: string;
}

export interface QuestionAssignment {
  question_text: string;
  llm_response: string;
  status: "assigned" | "answered" | "submitted" | "classification_completed";
  assigned_at: string;
  rubric_scores?: Record<string, number>;
  axis_scores?: Record<string, number>;
  classification?: string;
}

export interface UserResponseRecord {
  user_id: string;
  user_name: string;
  email: string;
  medical_profession: string;
  phone_number?: string;
  clinical_experience?: string;
  ai_exposure?: string;
  created_at: string;
  updated_at: string;

  questions_assigned: string[];
  max_questions_assigned: number;
  questions_answered: number;

  unbiased_answer: Record<string, string>;
  edited_answer: Record<string, string>;

  status: Record<
    string,
    "assigned" | "answered" | "submitted" | "classification_completed"
  >;

  list_of_rubrics_picked: Record<
    string,
    {
      rubrics: string[];
      axes: Record<string, string>;
      pass_fail: Record<string, "pass" | "fail">;
      completed_at: string;
      edited_rubrics: Record<string, string>;
    }
  >;

  edited_rubrics: Record<
    string,
    {
      rubrics: string[];
      axes: Record<string, string>;
      pass_fail: Record<string, "pass" | "fail">;
      completed_at: string;
      edited_rubrics: Record<string, string>;
    }
  >;

  additional_feedback: Record<string, string>;

  // Removed classification_data to prevent duplication - all data stored in individual question objects

  questions?: Record<string, QuestionAssignment>;
}

export interface UserInfo {
  name: string;
  profession: string;
  email: string;
  phone?: string;
  clinicalExperience?: string;
  aiExposure?: string;
  extraInfo?: string;
}

// ClassificationData interface removed to prevent data duplication
// All classification data is now stored directly in individual question objects
// within list_of_rubrics_picked and edited_rubrics
