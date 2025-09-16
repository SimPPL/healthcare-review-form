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
    email: "",
    phone: "",
    clinicalExperience: "",
    aiExposure: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.profession.trim() ||
      !formData.email.trim()
    ) {
      setError("Name, medical profession, and email are required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError("Please enter a valid email address");
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
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            clinicalExperience: formData.clinicalExperience,
            aiExposure: formData.aiExposure,
          },
        }),
      });

      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        // Try to get error text first
        const errorText = await response.text();
        let errorMessage = "Failed to assign questions";

        try {
          // Try to parse error text as JSON
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If parsing fails, use the raw text (truncated if too long)
          errorMessage =
            errorText.length > 100
              ? `${errorText.substring(0, 100)}...`
              : errorText;
        }

        throw new Error(errorMessage);
      }

      // If response is OK, then parse JSON
      const data = await response.json();

      // Store user ID in localStorage for the session
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("userName", formData.name.trim());

      // Navigate to questions page
      router.push("/questions");
    } catch (err) {
      console.error("Form submission error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");

      // Try a diagnostics API call to check AWS credentials
      try {
        const diagResponse = await fetch("/api/test-aws");
        const diagData = await diagResponse.json();
        console.log("AWS Diagnostics:", diagData);

        if (!diagData.success) {
          setError(
            `AWS Configuration Error: ${diagData.error || "Unknown error"}`,
          );
        }
      } catch (diagErr) {
        console.error("Diagnostics API error:", diagErr);
      }
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
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2 px-4 sm:px-6">
            <div className="flex items-center justify-center mb-4">
              <img
                src="/logo.png"
                alt="Healthcare Review FormLogo"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg"
                onError={(e) => {
                  // Fallback to placeholder if logo not found
                  e.currentTarget.style.display = "none";
                  const sibling = e.currentTarget.nextElementSibling;
                  if (sibling instanceof HTMLElement) {
                    sibling.style.display = "flex";
                  }
                }}
              />
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center"
                style={{ display: "none" }}
              >
                <span className="text-primary-foreground font-bold text-xs">
                  HEF
                </span>
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground">
              Healthcare Review Form
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Please provide your information to get started
            </CardDescription>
          </CardHeader>

          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="input-name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="input-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="input-email" className="text-sm font-medium">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="input-email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="w-full"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="input-phone" className="text-sm font-medium">
                  Phone Number (Optional)
                </Label>
                <Input
                  id="input-phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="input-profession"
                  className="text-sm font-medium"
                >
                  Medical Profession <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="input-profession"
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
                  htmlFor="select-clinical-experience"
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
                  <SelectTrigger id="select-clinical-experience">
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
                <Label
                  htmlFor="select-ai-exposure"
                  className="text-sm font-medium"
                >
                  Prior Exposure to AI Tools (Optional)
                </Label>
                <Select
                  value={formData.aiExposure}
                  onValueChange={(value) =>
                    handleInputChange("aiExposure", value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger id="select-ai-exposure">
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
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    Assigning Questions...
                  </>
                ) : (
                  "Continue to Questions"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4 px-2">
                Your personal data will only be used to send you your responses
                and will not be used for any other purpose.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
