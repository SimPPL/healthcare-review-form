import { Tour } from 'nextstepjs';
interface ExtendedStep {
  title: string;
  content: string;
  selector: string;
  icon: string;
  side: "bottom" | "right" | "left" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "left-top" | "left-bottom" | "right-top" | "right-bottom";
  image?: string;
  imageAlt?: string;
}

interface ExtendedTour {
  tour: string;
  steps: ExtendedStep[];
}

export const tourSteps: ExtendedTour[] = [
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
        content: "Please type your complete answer here.",
        selector: "#answer-textarea",
        icon: "✍️",
        side: "left",
        image: "/response.png",
        imageAlt: "Example of a well-structured medical response",
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
        title: "Evaluate the Response",
        content: "Each quality is a checklist for a perfect answer. Select 'Yes' if 'Our Response' meets this quality standard, or 'No' if it doesn't. You can click again to change your selection.",
        selector: "#rubric-table", 
        icon: "📊",
        side: "top",
        image: "/response.png",
        imageAlt: "Example of evaluating response quality",
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