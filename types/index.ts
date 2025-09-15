/**
 * Represents a question from the ai4health-dataset table in DynamoDB
 */
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
  rubrics?: string[]; // List of quality rubrics for this question
  target_evaluations?: number; // Number of times this question should be evaluated
  theme?: string; // Category/theme of the question
  times_answered?: number; // Number of times this question has been answered
}

/**
 * Represents a user's response for a specific question
 * Used in client-side code when displaying data from the ai4health-response table
 */
export interface UserResponse {
  // User information
  user_id: string;
  user_name: string;
  user_profession: string;
  user_extra_info?: string;
  clinical_experience?: string;
  ai_exposure?: string;

  // Question information
  question_id: string;
  question_text: string;
  llm_response: string;

  // Answer information
  user_answer?: string; // Answer provided by the user
  status: "assigned" | "answered" | "submitted" | "classification_completed";
  assigned_at: string;
  submitted_at?: string;

  // Rating information
  llm_rating?: number; // User's rating of the AI response

  // Rubric / classification fields
  rubrics: string[]; // Available rubrics for this question
  selected_rubrics?: string[]; // Rubrics selected by the user
  classified_rubrics?: Record<string, string[]>; // Category -> [rubrics]
  rubric_feedback?: string; // User's feedback on the rubrics
  edited_rubrics?: Record<string, string>; // originalText -> editedText
  rubric_scores?: Record<string, number>; // rubric -> score
  axis_scores?: Record<string, number>; // axis -> score
  classification?: string; // Final classification
}

/**
 * Represents a question assignment in the ai4health-response table
 * This is how questions are stored in the 'questions' field of the response record
 */
export interface QuestionAssignment {
  question_text: string;
  llm_response: string;
  status: "assigned" | "answered" | "submitted" | "classification_completed";
  assigned_at: string;
  rubric_scores?: Record<string, number>;
  axis_scores?: Record<string, number>;
  classification?: string;
}

/**
 * Represents the complete structure of a record in the ai4health-response table
 */
export interface UserResponseRecord {
  // User information
  user_id: string;
  user_name: string;
  user_profession: string;
  clinical_experience?: string;
  ai_exposure?: string;

  // Questions assigned to this user
  questions: Record<string, QuestionAssignment>; // questionId -> QuestionAssignment

  // User's answers to questions
  answers: Record<
    string,
    {
      user_answer: string;
      status: "answered" | "submitted" | "classification_completed";
      answered_at: string;
    }
  >; // questionId -> answer data

  // User's ratings of AI responses
  ratings: Record<string, number>; // questionId -> rating

  // Classification data
  classification_data?: ClassificationData;

  // Metadata
  created_at: string;
  updated_at: string;
  status?: "classification_completed";
}

/**
 * Represents basic user information for registration
 * Used when creating a new user in the system
 */
export interface UserInfo {
  name: string;
  profession: string;
  clinicalExperience?: string;
  aiExposure?: string;
  extraInfo?: string;
}

/**
 * Represents the classification data structure stored in the ai4health-response table
 * Under the 'classification_data' field
 */
export interface ClassificationData {
  selectedQualities: Record<string, string[]>; // questionId -> selected rubrics
  qualityCategories: Record<string, Record<string, string>>; // questionId -> rubric -> category
  editedQualities: Record<string, string>; // original -> edited text
  feedback: Record<string, string>; // questionId -> feedback text
  completed_at: string; // When the classification was completed
  rubric_scores?: Record<string, Record<string, number>>; // questionId -> rubric -> score
  axis_scores?: Record<string, Record<string, number>>; // questionId -> axis -> score
  classification?: Record<string, string>; // questionId -> classification
}
