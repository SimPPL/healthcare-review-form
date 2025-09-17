"use client";

import { useEffect, useState } from "react";

interface TourStep {
  title: string;
  content: string;
  target: string;
}

interface TourOptions {
  steps: TourStep[];
  completeOnFinish?: boolean;
  nextLabel?: string;
  prevLabel?: string;
  finishLabel?: string;
  closeButton?: boolean;
}

export const useTourGuide = () => {
  const [isClient, setIsClient] = useState(false);
  const [TourGuideClient, setTourGuideClient] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);

    // Dynamically import TourGuide only on client-side
    const loadTourGuide = async () => {
      try {
        // Load CSS first
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href =
          "https://unpkg.com/@sjmc11/tourguidejs/dist/css/tour.min.css";
        document.head.appendChild(link);

        const { TourGuideClient: TourGuide } = await import(
          "@sjmc11/tourguidejs"
        );
        setTourGuideClient(() => TourGuide);
      } catch (error) {
        console.error("Failed to load TourGuide:", error);
      }
    };

    loadTourGuide();
  }, []);

  const startTour = (
    options: TourOptions,
    storageKey: string,
    delay: number = 1500,
  ) => {
    if (!isClient || !TourGuideClient) return;

    const hasSeenTour = localStorage.getItem(storageKey);
    if (hasSeenTour) return;

    const tg = new TourGuideClient({
      steps: options.steps,
      completeOnFinish: options.completeOnFinish || true,
      nextLabel: options.nextLabel || "Next",
      prevLabel: options.prevLabel || "Back",
      finishLabel: options.finishLabel || "Got it!",
      closeButton: options.closeButton !== false,
    });

    setTimeout(() => {
      tg.start();
      localStorage.setItem(storageKey, "true");
    }, delay);
  };

  return { startTour, isClient };
};
