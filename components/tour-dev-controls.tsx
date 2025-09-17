"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TourDevControls() {
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    // Show dev controls only in development or when dev mode is enabled
    const isDev = process.env.NODE_ENV === "development";
    const devModeEnabled = localStorage.getItem("tour-dev-mode") === "true";
    setIsDevMode(isDev || devModeEnabled);
  }, []);

  const resetTours = () => {
    localStorage.removeItem("questions-tour-seen");
    localStorage.removeItem("classification-tour-seen");
    alert("Tour guides reset! Refresh the page to see tours again.");
  };

  const toggleDevMode = () => {
    const newMode = !isDevMode;
    setIsDevMode(newMode);
    localStorage.setItem("tour-dev-mode", newMode.toString());
    if (!newMode) {
      localStorage.removeItem("tour-dev-mode");
    }
  };

  if (!isDevMode) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={toggleDevMode}
          variant="ghost"
          size="sm"
          className="text-xs opacity-30 hover:opacity-100"
        >
          Dev
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-64 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Tour Dev Controls
            <Button
              onClick={toggleDevMode}
              variant="ghost"
              size="sm"
              className="text-xs h-6 w-6 p-0"
            >
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Button
            onClick={resetTours}
            variant="outline"
            size="sm"
            className="w-full text-xs"
          >
            Reset Tours
          </Button>
          <div className="text-xs text-muted-foreground">
            <div>Questions Tour: {localStorage.getItem("questions-tour-seen") ? "✓ Seen" : "○ Not seen"}</div>
            <div>Classification Tour: {localStorage.getItem("classification-tour-seen") ? "✓ Seen" : "○ Not seen"}</div>
          </div>
          <div className="text-xs text-muted-foreground border-t pt-2">
            <div>Ctrl+Shift+T to reset</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
