import { Tour } from 'nextstepjs';

export const tourSteps: Tour[] = [
  {
    tour: "questionsTour",
    steps: [
      {
        title: "Welcome to Questions Page",
        content: "This is where you'll answer clinical questions. Let's explore the key features.",
        selector: "#questions-page-header",
        icon: "👋",
        side: "bottom",
      },
      {
        title: "Current Question",
        content: "This is the clinical question you need to answer. Read it carefully and provide your response.",
        selector: "#current-question",
        icon: "❓",
        side: "right",
      },
      {
        title: "Your Answer",
        content: "Type your answer here. This is your unbiased response before seeing the AI answer.",
        selector: "#answer-textarea",
        icon: "✍️",
        side: "left",
      },
      {
        title: "Show AI Response",
        content: "Click this button to reveal the AI-generated answer after you've written your own response.",
        selector: "#show-ai-button",
        icon: "🤖",
        side: "top",
      },
    ],
  },
  {
    tour: "questionsTourAI",
    steps: [
      {
        title: "AI Response Revealed",
        content: "Great! Now you can see the AI response alongside your answer. Let's learn how to work with both.",
        selector: "#ai-response",
        icon: "🎉",
        side: "left",
      },
      {
        title: "Compare & Edit",
        content: "Compare the AI response with your answer. You can edit your answer by clicking the 'Edit' button if needed.",
        selector: "#answer-textarea",
        icon: "✏️",
        side: "left",
      },
      {
        title: "Continue to Classification",
        content: "Once you're satisfied with your answer, click here to proceed to the classification step.",
        selector: "#continue-button",
        icon: "➡️",
        side: "top",
      },
    ],
  },
  {
    tour: "classificationTour",
    steps: [
      {
        title: "Welcome to Classification Page",
        content: "Here you'll evaluate the AI response using rubrics. Let's learn how to use this page.",
        selector: "#classification-page-header",
        icon: "👋",
        side: "bottom",
      },
      {
        title: "Question Context",
        content: "This shows the original question and both your answer and the AI response for reference.",
        selector: "#question-context",
        icon: "📋",
        side: "bottom",
      },
      {
        title: "Rubric Evaluation",
        content: "For each rubric, you need to: 1) Select Pass/Fail, 2) Choose a category (Accuracy, Communication, etc.).",
        selector: "#rubric-table",
        icon: "📊",
        side: "top",
      },
      {
        title: "Pass/Fail Selection",
        content: "Click 'Pass' if the AI response meets this rubric, or 'Fail' if it doesn't.",
        selector: "#pass-fail-example",
        icon: "✅❌",
        side: "right",
      },
      {
        title: "Category Selection",
        content: "Click on one of the category boxes to classify this rubric (Accuracy, Communication, Completeness, etc.).",
        selector: "#category-example",
        icon: "🏷️",
        side: "right",
      },
      {
        title: "Additional Feedback",
        content: "Add any additional comments or insights about this response here (optional).",
        selector: "#additional-feedback",
        icon: "💬",
        side: "top",
      },
      {
        title: "Save & Continue",
        content: "Once you've evaluated at least 8 rubrics, click here to save and continue to the next question.",
        selector: "#save-continue-button",
        icon: "💾",
        side: "top",
      },
    ],
  },
];
