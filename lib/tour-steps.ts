import { Tour } from 'nextstepjs';

export const tourSteps: Tour[] = [
  {
    tour: "questionsTour",
    steps: [
      {
        title: "Welcome!",
        content: "In this section, you'll provide your expert answers to a series of clinical questions. Let's get started.",
        selector: "#questions-page-header",
        icon: "👋",
        side: "bottom",
      },
      {
        title: "The Question",
        content: "Here's the clinical question. Take a moment to consider the best possible response.",
        selector: "#current-question",
        icon: "❓",
        side: "right",
      },
      {
        title: "Your Expert Answer",
        content: "Please type your complete answer here. It's important to do this before seeing Our Response to capture your initial thoughts.",
        selector: "#answer-textarea",
        icon: "✍️",
        side: "left",
      },
      {
        title: "Reveal Our Response",
        content: "Once you've finished writing, click here to see Our Response to the same question.",
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
        title: "Our Response",
        content: "Great! Take a moment to review Our Response. See how it's structured and what information it includes.",
        selector: "#ai-response",
        icon: "🎉",
        side: "left",
      },
      {
        title: "Compare and Refine",
        content: "Now, compare Our Response to your own. If you feel you've missed anything or want to add more detail, you can edit your answer.",
        selector: "#answer-textarea",
        icon: "✏️",
        side: "left",
      },
      {
        title: "Ready to Evaluate?",
        content: "When you're happy with your final answer, click here to move on to the evaluation stage.",
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
        title: "Welcome to the Evaluation Page",
        content: "In this final step, you'll use a checklist to evaluate the quality of Our Response.",
        selector: "#classification-page-header",
        icon: "👋",
        side: "bottom",
      },
      {
        title: "For Your Reference",
        content: "Here you can see the original question, your final answer, and Our Response to help you during the evaluation.",
        selector: "#question-context",
        icon: "📋",
        side: "bottom",
      },
      {
        title: "The Quality Checklist",
        content: "For each quality below, give it a rating and assign it a category. Guide your choices by thinking about how an ideal answer should be written.",
        selector: "#rubric-table", 
        icon: "📊",
        side: "top",
      },
      {
        title: "Give Your Rating",
        content: "Select 'Relevant' if Our Response meets this quality standard, or 'Off-Topic' if it doesn't.",
        selector: "#pass-fail-example",
        icon: "✅❌",
        side: "right",
      },
      {
        title: "Assign a Category",
        content: "After rating it, assign the quality check to a relevant category like Accuracy, Clarity, or Completeness.",
        selector: "#category-example",
        icon: "🏷️",
        side: "right",
      },
      {
        title: "Add Optional Comments",
        content: "If you have any other thoughts or feedback on the response, you can add them here.",
        selector: "#additional-feedback",
        icon: "💬",
        side: "top",
      },
      {
        title: "Save and Finish",
        content: "Once you've evaluated at least 8 quality checks, click here to save your work and move to the next question.",
        selector: "#save-continue-button",
        icon: "💾",
        side: "top",
      },
    ],
  },
];