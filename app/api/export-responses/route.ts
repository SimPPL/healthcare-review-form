import { type NextRequest, NextResponse } from "next/server";
import { getDynamoDbClient, RESPONSES_TABLE } from "@/lib/aws/dynamodb";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json"; // json or csv
    const includeRawData = searchParams.get("includeRawData") === "true";

    const dynamoDb = getDynamoDbClient();

    const scanCommand = new ScanCommand({
      TableName: RESPONSES_TABLE,
    });

    const result = await dynamoDb.send(scanCommand);
    const users = result.Items || [];

    if (format === "csv") {
      return generateCSVResponse(users, includeRawData);
    }

    return generateJSONResponse(users, includeRawData);
  } catch (error) {
    console.error("Error in export-responses:", error);
    return NextResponse.json(
      { 
        error: "Failed to export responses. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 },
    );
  }
}

function generateJSONResponse(users: any[], includeRawData: boolean) {
  const exportData = users.map((user) => {
    const baseData: any = extractUserData(user);

    if (includeRawData) {
      baseData.raw_data = user;
    }

    return baseData;
  });

  return NextResponse.json({
    total_users: users.length,
    exported_at: new Date().toISOString(),
    data: exportData,
  });
}

function generateCSVResponse(users: any[], includeRawData: boolean) {
  const flattenedData = users.flatMap((user) => {
    const userData = extractUserData(user);
    const rows: any[] = [];

    if (
      !userData.questions_assigned ||
      userData.questions_assigned.length === 0
    ) {
      rows.push({
        ...userData,
        question_id: "",
        question_text: "",
        llm_response: "",
        question_status: "",
        assigned_at: "",
        answered_at: "",
        submitted_at: "",
        completed_at: "",
        unbiased_answer: "",
        edited_answer: "",
        list_of_rubrics_picked: "",
        edited_rubrics: "",
        rubrics_pass_fail: "",
        edited_rubrics_pass_fail: "",
        rubrics_axes_info: "",
        additional_feedback: "",
      });
      return rows;
    }

    // Create one row per question
    userData.questions_assigned.forEach((questionId: string) => {
      const questionData = user.questions?.[questionId] || {};
      const questionStatus = user.status?.[questionId] || "assigned";
      const unbiasedAnswer = user.unbiased_answer?.[questionId] || "";
      const editedAnswer = user.edited_answer?.[questionId] || "";

      const selectedRubrics = user.list_of_rubrics_picked?.[questionId] || {};
      const editedRubrics = user.edited_rubrics?.[questionId] || {};
      const additionalFeedback = user.additional_feedback?.[questionId] || "";

      rows.push({
        // User info
        user_id: userData.user_id,
        user_name: userData.user_name,
        medical_profession: userData.medical_profession,
        email: userData.email,
        phone_number: userData.phone_number,
        clinical_experience: userData.clinical_experience,
        ai_exposure: userData.ai_exposure,
        created_at: userData.created_at,
        updated_at: userData.updated_at,

        // Questions summary
        total_questions_assigned: userData.questions_assigned.length,
        total_questions_answered: userData.questions_answered.length,

        // Question-specific data
        question_id: questionId,
        question_text: questionData.question_text || "",
        llm_response: questionData.llm_response || "",
        question_status: questionStatus || "",
        assigned_at: questionData.assigned_at || "",
        answered_at: questionData.answered_at || "",
        edited_at: questionData.edited_at || "",
        submitted_at: questionData.submitted_at || "",
        completed_at: selectedRubrics.completed_at || "",

        // Answers
        unbiased_answer: unbiasedAnswer || "",
        unbiased_answered_at: questionData.answered_at || "",
        edited_answer: editedAnswer || "",
        original_answer_for_edit: questionData.original_answer || "",
        edited_answer_at: questionData.edited_at || "",

        // Rubrics
        selected_rubrics: selectedRubrics.rubrics
          ? selectedRubrics.rubrics.join(", ")
          : "",
        rubrics_selected_at: selectedRubrics.completed_at || "",
        rubrics_axes_info: selectedRubrics.axes
          ? JSON.stringify(selectedRubrics.axes)
          : "",

        // Edited Rubrics
        edited_rubrics: editedRubrics.rubrics
          ? editedRubrics.rubrics.join(", ")
          : "",
        edited_rubrics_at: editedRubrics.completed_at || "",

        // Pass/Fail Data
        rubrics_pass_fail: selectedRubrics.pass_fail
          ? JSON.stringify(selectedRubrics.pass_fail)
          : "",
        edited_rubrics_pass_fail: editedRubrics.pass_fail
          ? JSON.stringify(editedRubrics.pass_fail)
          : "",

        // Axes Data
        rubrics_axes: selectedRubrics.axes
          ? JSON.stringify(selectedRubrics.axes)
          : "",
        edited_rubrics_axes: editedRubrics.axes
          ? JSON.stringify(editedRubrics.axes)
          : "",

        // Additional feedback
        additional_feedback: additionalFeedback,
      });
    });

    return rows;
  });

  const headers = [
    "user_id",
    "user_name",
    "medical_profession",
    "email",
    "phone_number",
    "clinical_experience",
    "ai_exposure",
    "created_at",
    "updated_at",
    "total_questions_assigned",
    "total_questions_answered",
    "question_id",
    "question_text",
    "llm_response",
    "question_status",
    "assigned_at",
    "answered_at",
    "edited_at",
    "submitted_at",
    "completed_at",
    "unbiased_answer",
    "unbiased_answered_at",
    "edited_answer",
    "original_answer_for_edit",
    "edited_answer_at",
    "selected_rubrics",
    "rubrics_selected_at",
    "edited_rubrics",
    "edited_rubrics_at",
    "rubrics_pass_fail",
    "edited_rubrics_pass_fail",
    "rubrics_axes",
    "edited_rubrics_axes",
    "rubrics_axes_info",
    "additional_feedback",
  ];

  const csvContent = [
    headers.join(","),
    ...flattenedData.map((row) =>
      headers
        .map((header) => {
          const value = row[header] || "";
          // Escape CSV values that contain commas, quotes, or newlines
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"') || value.includes("\n"))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    ),
  ].join("\n");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="healthcare-review-responses-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

function extractUserData(user: any) {
  return {
    // User basic info
    user_id: user.user_id || "",
    user_name: user.user_name || "",
    medical_profession: user.medical_profession || user.user_profession || "",
    email: user.email || "",
    phone_number: user.phone_number || user.phone || "",
    clinical_experience: user.clinical_experience || "",
    ai_exposure: user.ai_exposure || "",
    created_at: user.created_at || "",
    updated_at: user.updated_at || "",

    // Questions summary
    questions_assigned: user.questions_assigned || [],
    max_questions_assigned: user.max_questions_assigned || 25,
    questions_answered: user.questions_answered || 0,

    // Answers summary
    total_unbiased_answers: user.unbiased_answer
      ? Object.keys(user.unbiased_answer).length
      : 0,
    total_edited_answers: user.edited_answer
      ? Object.keys(user.edited_answer).length
      : 0,

    total_additional_feedback: user.additional_feedback
      ? Object.keys(user.additional_feedback).length
      : 0,

    // Detailed data
    status: user.status || {},
    unbiased_answer: user.unbiased_answer || {},
    edited_answer: user.edited_answer || {},

    list_of_rubrics_picked: user.list_of_rubrics_picked || {},
    edited_rubrics: user.edited_rubrics || {},
    additional_feedback: user.additional_feedback || {},

    classification_data: user.classification_data || {},

    answers: user.answers || {},
  };
}

// Helper endpoint to get export statistics
export async function POST(request: NextRequest) {
  try {
    const dynamoDb = getDynamoDbClient();

    const scanCommand = new ScanCommand({
      TableName: RESPONSES_TABLE,
    });

    const result = await dynamoDb.send(scanCommand);
    const users = result.Items || [];

    const stats = {
      total_users: users.length,
      users_with_assignments: users.filter(
        (u) => u.questions_assigned && u.questions_assigned.length > 0,
      ).length,
      users_with_answers: users.filter(
        (u) => u.questions_answered && u.questions_answered > 0,
      ).length,
      total_questions_assigned: users.reduce(
        (sum, u) => sum + (u.questions_assigned || []).length,
        0,
      ),
      total_questions_answered: users.reduce(
        (sum, u) => sum + (u.questions_answered || 0),
        0,
      ),
      total_unbiased_answers: users.reduce(
        (sum, u) =>
          sum + (u.unbiased_answer ? Object.keys(u.unbiased_answer).length : 0),
        0,
      ),
      total_edited_answers: users.reduce(
        (sum, u) =>
          sum + (u.edited_answer ? Object.keys(u.edited_answer).length : 0),
        0,
      ),

      total_feedback_entries: users.reduce(
        (sum, u) =>
          sum +
          (u.additional_feedback
            ? Object.keys(u.additional_feedback).length
            : 0),
        0,
      ),
      users_by_profession: users.reduce((acc: any, u) => {
        const prof = u.user_profession || "Unknown";
        acc[prof] = (acc[prof] || 0) + 1;
        return acc;
      }, {}),
      users_by_ai_exposure: users.reduce((acc: any, u) => {
        const exp = u.ai_exposure || "Unknown";
        acc[exp] = (acc[exp] || 0) + 1;
        return acc;
      }, {}),
    };

    return NextResponse.json({
      statistics: stats,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in export-responses POST:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate statistics. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 },
    );
  }
}
