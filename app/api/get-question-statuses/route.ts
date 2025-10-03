import { type NextRequest, NextResponse } from "next/server";
import { getDynamoDbClient, RESPONSES_TABLE } from "@/lib/aws/dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const questionId = searchParams.get("questionId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required parameter: userId" },
        { status: 400 },
      );
    }

    const dynamoDb = getDynamoDbClient();

    const getUserCommand = new GetCommand({
      TableName: RESPONSES_TABLE,
      Key: { user_id: userId },
    });

    const userResult = await dynamoDb.send(getUserCommand);
    const currentUser = userResult.Item;

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const questionStatuses = currentUser.status || {};
    const questionsAssigned = currentUser.questions_assigned || [];
    const questionsAnswered = currentUser.questions_answered || 0;
    const unbiasedAnswers = currentUser.unbiased_answer || {};
    const editedAnswers = currentUser.edited_answer || {};
    const additionalFeedback = currentUser.additional_feedback || {};
    const selectedRubrics = currentUser.list_of_rubrics_picked || {};
    const editedRubrics = currentUser.edited_rubrics || {};

    if (questionId) {
      const questionStatus = questionStatuses[questionId] || null;
      const hasUnbiasedAnswer = !!unbiasedAnswers[questionId];
      const hasEditedAnswer = !!editedAnswers[questionId];
      const hasFeedback = !!additionalFeedback[questionId];
      const hasSelectedRubrics = !!selectedRubrics[questionId];
      const hasEditedRubrics = !!editedRubrics[questionId];

      return NextResponse.json({
        questionId: questionId,
        status: questionStatus,
        progress: {
          is_assigned: questionsAssigned.includes(questionId),
          is_answered:
            questionStatuses[questionId] === "answered" ||
            questionStatuses[questionId] === "submitted" ||
            questionStatuses[questionId] === "classification_completed",
          has_unbiased_answer: hasUnbiasedAnswer,
          has_edited_answer: hasEditedAnswer,
          has_feedback: hasFeedback,
          has_selected_rubrics: hasSelectedRubrics,
          has_edited_rubrics: hasEditedRubrics,
        },
        data: {
          unbiased_answer: unbiasedAnswers[questionId] || null,
          edited_answer: editedAnswers[questionId] || null,
          additional_feedback: additionalFeedback[questionId] || "",
          selected_rubrics: selectedRubrics[questionId] || null,
          edited_rubrics: editedRubrics[questionId] || null,
        },
      });
    }

    // Otherwise, return comprehensive status for all questions
    const statusSummary = questionsAssigned.map((qId: string) => {
      const questionStatus = questionStatuses[qId] || "assigned";
      const hasUnbiasedAnswer = !!unbiasedAnswers[qId];
      const hasEditedAnswer = !!editedAnswers[qId];
      const hasFeedback = !!additionalFeedback[qId];
      const hasSelectedRubrics = !!selectedRubrics[qId];
      const hasEditedRubrics = !!editedRubrics[qId];

      return {
        question_id: qId,
        status: questionStatus,
        progress: {
          is_assigned: true,
          is_answered:
            questionStatus === "answered" ||
            questionStatus === "submitted" ||
            questionStatus === "classification_completed",
          has_unbiased_answer: hasUnbiasedAnswer,
          has_edited_answer: hasEditedAnswer,
          has_feedback: hasFeedback,
          has_selected_rubrics: hasSelectedRubrics,
          has_edited_rubrics: hasEditedRubrics,
        },
        completion_percentage: calculateCompletionPercentage({
          hasUnbiasedAnswer,
          hasEditedAnswer,
          hasFeedback,
          hasSelectedRubrics,
          hasEditedRubrics,
        }),
      };
    });

    const overallStats = {
      total_assigned: questionsAssigned.length,
      total_answered:
        typeof questionsAnswered === "number"
          ? questionsAnswered
          : Object.keys(questionsAnswered).length,
      total_with_unbiased_answers: Object.keys(unbiasedAnswers).length,
      total_with_edited_answers: Object.keys(editedAnswers).length,
      total_with_feedback: Object.keys(additionalFeedback).length,
      total_with_selected_rubrics: Object.keys(selectedRubrics).length,
      total_with_edited_rubrics: Object.keys(editedRubrics).length,
      completion_rate:
        questionsAssigned.length > 0
          ? (
              (statusSummary.filter(
                (q: any) =>
                  q.status === "answered" ||
                  q.status === "submitted" ||
                  q.status === "classification_completed",
              ).length /
                questionsAssigned.length) *
              100
            ).toFixed(2) + "%"
          : "0%",
      status_breakdown: statusSummary.reduce((acc: any, item: any) => {
        const status = item.status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
    };

    return NextResponse.json({
      userId: userId,
      overall_stats: overallStats,
      question_statuses: statusSummary,
      raw_data: {
        status: questionStatuses,
        questions_assigned: questionsAssigned,
        questions_answered: questionsAnswered,
      },
    });
  } catch (error) {
    console.error("Error fetching question statuses:", error);
    return NextResponse.json(
      { error: "Failed to fetch question statuses." },
      { status: 500 },
    );
  }
}

function calculateCompletionPercentage({
  hasUnbiasedAnswer,
  hasEditedAnswer,
  hasFeedback,
  hasSelectedRubrics,
  hasEditedRubrics,
}: {
  hasUnbiasedAnswer: boolean;
  hasEditedAnswer: boolean;
  hasFeedback: boolean;
  hasSelectedRubrics: boolean;
  hasEditedRubrics: boolean;
}): number {
  const steps = [
    hasUnbiasedAnswer,
    hasSelectedRubrics,
    // Optional steps that add to completion
    hasEditedAnswer,
    hasEditedRubrics,
    hasFeedback,
  ];

  const completedSteps = steps.filter(Boolean).length;
  const totalSteps = steps.length;

  return Math.round((completedSteps / totalSteps) * 100);
}
