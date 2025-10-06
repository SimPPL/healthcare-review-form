import { Tour } from 'nextstepjs';

// Extend the Step interface to include image support
interface ExtendedStep {
  title: string;
  content: string;
  selector: string;
  icon: string;
  side: string;
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
        title: "The Quality Checklist",
        content: "For each quality below, give it a rating and assign it a category. Guide your choices by thinking about how an ideal answer should be written.",
        selector: "#rubric-table", 
        icon: "📊",
        side: "top",
        image: "/rubric.png",
        imageAlt: "Example of AI-generated medical response format",
      },
      {
        title: "Give Your Rating",
        content: "Select 'Relevant' if 'Our Response' meets this quality standard, or 'Off-Topic' if it doesn't.",
        selector: "#pass-fail-example",
        icon: "✅❌",
        side: "right",
        image: "/response.png",
        imageAlt: "Example of AI-generated medical response format",
      },
      {
        title: "Assign a Category",
        content: "After rating it, assign the quality to a relevant category like Accuracy, Communication or Completeness.",
        selector: "#category-example",
        icon: "🏷️",
        side: "right",
        image: "/axes.png",
        imageAlt: "Example of AI-generated medical response format",
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