export interface Question {
  question_id: string;
  question_text: string;
  llm_response: string;
  answer?: string;
  answer_hindi?: string;
  answer_marathi?: string;
  axis_scores?: Record<string, number>; // e.g., Accuracy, Completeness
  classification?: string; // e.g., HealthBench classification
  medical_quality_score?: number;
  references?: string[];
  rubric_scores?: Record<string, number>; // rubric_name -> score
  rubrics?: string[];
  target_evaluations?: number;
  theme?: string;
  times_answered?: number;
}

export interface UserResponse {
  user_id: string;
  question_id: string;
  user_name: string;
  user_profession: string;
  user_extra_info?: string;
  question_text: string;
  llm_response: string;
  answer?: string;
  answer_hindi?: string;
  answer_marathi?: string;
  status: "assigned" | "answered" | "submitted";
  assigned_at: string;
  submitted_at?: string;
  llm_rating?: number;

  // Rubric / classification fields
  rubrics: string[];
  selected_rubrics?: string[];
  classified_rubrics?: Record<string, string[]>;
  rubric_feedback?: string;
  edited_rubrics?: Record<string, string>;
  rubric_scores?: Record<string, number>;
  axis_scores?: Record<string, number>;
  classification?: string;
}

export interface UserInfo {
  name: string;
  profession: string;
  extraInfo?: string;
}

// New interface for the classification data structure
export interface ClassificationData {
  selectedQualities: Record<string, string[]>; // questionId -> selected rubrics
  qualityCategories: Record<string, Record<string, string>>; // questionId -> rubric -> category
  editedQualities: Record<string, string>; // original -> edited text
  feedback: Record<string, string>; // questionId -> feedback text
  rubric_scores?: Record<string, Record<string, number>>; // questionId -> rubric -> score
  axis_scores?: Record<string, Record<string, number>>; // questionId -> axis -> score
  classification?: Record<string, string>; // questionId -> classification
}
