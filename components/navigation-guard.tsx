"use client";

import type React from "react";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface NavigationGuardProps {
  children: React.ReactNode;
}

export function NavigationGuard({ children }: NavigationGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const userId = localStorage.getItem("userId");

    // Protected routes that require a user session
    const protectedRoutes = ["/questions", "/classification", "/thank-you"];

    // If on a protected route without userId, redirect to home
    if (
      protectedRoutes.some((route) => pathname.startsWith(route)) &&
      !userId
    ) {
      router.push("/");
    }

    // If on home page with existing userId, offer to continue
    if (pathname === "/" && userId) {
      const shouldContinue = confirm(
        "You have an ongoing evaluation. Would you like to continue where you left off?",
      );

      if (shouldContinue) {
        router.push("/questions");
      } else {
        // Clear session if user wants to start fresh
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        // Reset tour guides for new session
        localStorage.removeItem("questions-tour-seen");
        localStorage.removeItem("classification-tour-seen");
      }
    }

    // Add tour reset functionality (for development/testing)
    // Press Ctrl+Shift+T to reset tour guides
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "T") {
        localStorage.removeItem("questions-tour-seen");
        localStorage.removeItem("classification-tour-seen");
        console.log("Tour guides reset! Refresh the page to see tours again.");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [pathname, router]);

  return <>{children}</>;
}
