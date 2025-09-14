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
    const protectedRoutes = [
      "/questions",
      "/rating",
      "/classification",
      "/thank-you",
    ];

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
      }
    }
  }, [pathname, router]);

  return <>{children}</>;
}
