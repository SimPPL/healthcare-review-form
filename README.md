# Healthcare Review Form

A Next.js application for evaluating AI responses to medical questions by medical professionals.

## Setup Instructions

### 1. Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Fill in your AWS credentials and DynamoDB table names:

\`\`\`env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
DATASET_TABLE=ai4health-dataset
RESPONSES_TABLE=ai4health-responses
\`\`\`

### 2. DynamoDB Tables

Create two tables in AWS DynamoDB:

#### ai4health-dataset
- Partition Key: `question_id` (String)
- Fields: `question_text`, `llm_response`, `target_evaluations`, `theme`, `times_answered`

#### ai4health-responses
- Partition Key: `user_id` (String)
- Sort Key: `question_id` (String)
- Fields: `user_name`, `user_profession`, `user_extra_info`, `question_text`, `llm_response`, `status`, `assigned_at`, `user_answer`, `llm_rating`, `submitted_at`

### 3. Seed Sample Data (Optional)

To populate your dataset table with sample questions for testing:

\`\`\`bash
node scripts/seed-sample-data.js
\`\`\`

### 4. Run the Application

\`\`\`bash
npm install
npm run dev
\`\`\`

Visit `http://localhost:3000` to start the evaluation process.

## Application Flow

1. **User Info**: Enter name, medical profession, and optional details
2. **Questions**: Answer assigned clinical questions with your approach
3. **Rating**: Rate the AI responses compared to your answers (0-10 scale)
4. **Thank You**: Confirmation of completed evaluation

## Troubleshooting

- **Database connection errors**: Verify AWS credentials and table names in `.env.local`
- **No questions available**: Run the seed script or add questions to your dataset table
- **Permission errors**: Ensure your AWS user has DynamoDB read/write permissions
