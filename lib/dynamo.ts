/**
 * This module provides access to DynamoDB table names and utility functions
 * for client-side code.
 *
 * WARNING: This is a client-safe version - actual DynamoDB client initialization
 * and AWS credentials handling happens on the server side in:
 * app/api/_lib/dynamoDb.ts
 */

// Table names are safe to export as constants
export const DATASET_TABLE = process.env.DATASET_TABLE || "ai4health-dataset";
export const RESPONSES_TABLE =
  process.env.RESPONSES_TABLE || "ai4health-responses";

// For backward compatibility with existing imports
// This is null to ensure any attempt to use it directly will fail obviously
export const dynamoDb = null;
