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

    const protectedRoutes = ["/questions", "/classification", "/thank-you"];
    if (
      protectedRoutes.some((route) => pathname.startsWith(route)) &&
      !userId
    ) {
      router.push("/");
    }

    if (pathname === "/" && userId) {
      const shouldContinue = confirm(
        "You have an ongoing evaluation. Would you like to continue where you left off?",
      );

      if (shouldContinue) {
        router.push("/questions");
      } else {
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
      }
    }
  }, [pathname, router]);

  return <>{children}</>;
}
