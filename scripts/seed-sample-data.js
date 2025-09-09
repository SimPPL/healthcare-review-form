// Sample data seeding script for testing the Medical Expert Evaluation app
// Run this script to populate your DynamoDB dataset table with sample questions

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb"

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const dynamoDb = DynamoDBDocumentClient.from(client)
const DATASET_TABLE = process.env.DATASET_TABLE || "ai4health-dataset"

const sampleQuestions = [
  {
    question_id: "q1",
    question_text: "If I had painful periods in the past does it affect my child?",
    llm_response:
      "Painful periods (dysmenorrhea) can have a genetic component, but having painful periods doesn't directly affect your child during pregnancy or delivery. However, some underlying conditions that cause painful periods, like endometriosis, may affect fertility or pregnancy outcomes. It's important to discuss your menstrual history with your healthcare provider.",
    target_evaluations: 3,
    theme: "reproductive_health",
    times_answered: 0,
  },
  {
    question_id: "q2",
    question_text: "Do my irregular periods affect my pregnancy and child?",
    llm_response:
      "Irregular periods can indicate underlying hormonal imbalances or conditions like PCOS that may affect fertility and pregnancy. However, many women with irregular periods have healthy pregnancies. It's important to work with your healthcare provider to identify and manage any underlying conditions before and during pregnancy.",
    target_evaluations: 3,
    theme: "reproductive_health",
    times_answered: 0,
  },
  {
    question_id: "q3",
    question_text: "My friends say painful periods become normal after childbirth is this true?",
    llm_response:
      "This is partially true for some women. Childbirth can sometimes reduce menstrual pain, particularly if the pain was caused by a tight cervical opening. However, this doesn't apply to all causes of painful periods. Conditions like endometriosis may not improve and could potentially worsen after childbirth.",
    target_evaluations: 3,
    theme: "reproductive_health",
    times_answered: 0,
  },
  {
    question_id: "q4",
    question_text: "Will my irregular periods become regular after childbirth?",
    llm_response:
      "Childbirth and breastfeeding can temporarily affect menstrual cycles, but they don't typically 'fix' underlying causes of irregular periods like PCOS or thyroid disorders. Some women may experience changes in their cycle patterns after childbirth, but this varies greatly between individuals.",
    target_evaluations: 3,
    theme: "reproductive_health",
    times_answered: 0,
  },
  {
    question_id: "q5",
    question_text: "Is it safe to take pain medication during heavy menstrual bleeding?",
    llm_response:
      "NSAIDs like ibuprofen are generally safe and effective for menstrual pain and can actually help reduce heavy bleeding. However, avoid aspirin during heavy bleeding as it can increase bleeding risk. Always consult with your healthcare provider about appropriate pain management, especially if you have other medical conditions.",
    target_evaluations: 3,
    theme: "reproductive_health",
    times_answered: 0,
  },
]

async function seedData() {
  try {
    console.log("Seeding sample data to DynamoDB...")

    const putRequests = sampleQuestions.map((question) => ({
      PutRequest: {
        Item: question,
      },
    }))

    const batchWriteCommand = new BatchWriteCommand({
      RequestItems: {
        [DATASET_TABLE]: putRequests,
      },
    })

    await dynamoDb.send(batchWriteCommand)
    console.log(`Successfully seeded ${sampleQuestions.length} sample questions to ${DATASET_TABLE}`)
  } catch (error) {
    console.error("Error seeding data:", error)
    process.exit(1)
  }
}

seedData()
