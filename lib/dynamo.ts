import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

if (!process.env.AWS_REGION) {
  throw new Error("AWS_REGION environment variable is required")
}
if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error("AWS_ACCESS_KEY_ID environment variable is required")
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS_SECRET_ACCESS_KEY environment variable is required")
}
if (!process.env.DATASET_TABLE) {
  throw new Error("DATASET_TABLE environment variable is required")
}
if (!process.env.RESPONSES_TABLE) {
  throw new Error("RESPONSES_TABLE environment variable is required")
}

const client = new DynamoDBClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export const dynamoDb = DynamoDBDocumentClient.from(client)

export const DATASET_TABLE = process.env.DATASET_TABLE!
export const RESPONSES_TABLE = process.env.RESPONSES_TABLE!
