import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const HARDCODED_DATASET_TABLE = "ai4health-dataset";
const HARDCODED_RESPONSES_TABLE = "ai4health-responses";
const HARDCODED_REGION = "ap-south-1";

const IS_LOCAL_DEVELOPMENT =
  process.env.NODE_ENV === "development" || !process.env.AWS_EXECUTION_ENV;

export function getDynamoDbClient() {
  const clientConfig: any = {
    region: process.env.AWS_REGION || HARDCODED_REGION,
  };

  if (IS_LOCAL_DEVELOPMENT) {
    const region = process.env.MY_APP_AWS_REGION || process.env.AWS_REGION;
    const accessKeyId =
      process.env.MY_APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.MY_APP_AWS_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY;

    if (region) {
      clientConfig.region = region;
    }

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }
  }

  const client = new DynamoDBClient(clientConfig);
  return DynamoDBDocumentClient.from(client);
}

export const DATASET_TABLE =
  process.env.DATASET_TABLE || HARDCODED_DATASET_TABLE;
export const RESPONSES_TABLE =
  process.env.RESPONSES_TABLE || HARDCODED_RESPONSES_TABLE;
