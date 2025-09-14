"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    profession: "",
    clinicalExperience: "",
    aiExposure: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.profession.trim()) {
      setError("Name and medical profession are required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/assign-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userInfo: {
            name: formData.name.trim(),
            profession: formData.profession.trim(),
            clinicalExperience: formData.clinicalExperience,
            aiExposure: formData.aiExposure,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign questions");
      }

      // Store user ID in localStorage for the session
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("userName", formData.name.trim());

      // Navigate to questions page
      router.push("/questions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(""); // Clear error when user starts typing
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="flex items-center justify-center mb-4">
              <img
                src="/logo.png"
                alt="Health Eval Feedback Logo"
                className="w-12 h-12 rounded-lg"
                onError={(e) => {
                  // Fallback to placeholder if logo not found
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling.style.display = "flex";
                }}
              />
              <div
                className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center"
                style={{ display: "none" }}
              >
                <span className="text-primary-foreground font-bold text-xs">
                  HEF
                </span>
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground">
              Health Eval Feedback
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Please provide your information to get started
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profession" className="text-sm font-medium">
                  Medical Profession <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="profession"
                  type="text"
                  placeholder="e.g., Cardiologist, Emergency Medicine, Internal Medicine"
                  value={formData.profession}
                  onChange={(e) =>
                    handleInputChange("profession", e.target.value)
                  }
                  className="w-full"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="clinicalExperience"
                  className="text-sm font-medium"
                >
                  Years of Clinical Experience (Optional)
                </Label>
                <Select
                  value={formData.clinicalExperience}
                  onValueChange={(value) =>
                    handleInputChange("clinicalExperience", value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<1">Less than 1 year</SelectItem>
                    <SelectItem value="1-5">1-5 years</SelectItem>
                    <SelectItem value="6-10">6-10 years</SelectItem>
                    <SelectItem value="10+">10+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aiExposure" className="text-sm font-medium">
                  Prior Exposure to AI Tools (Optional)
                </Label>
                <Select
                  value={formData.aiExposure}
                  onValueChange={(value) =>
                    handleInputChange("aiExposure", value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI exposure level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="occasional">Occasional</SelectItem>
                    <SelectItem value="frequent">Frequent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning Questions...
                  </>
                ) : (
                  "Continue to Questions"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
