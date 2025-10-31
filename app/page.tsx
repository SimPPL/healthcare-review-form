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
import Image from "next/image";

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
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    profession: "",
    email: "",
    phone: "",
  });

  // Validation functions
  const validateName = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return "Name is required";
    if (trimmed.length < 2) return "Name must be at least 2 characters";
    if (trimmed.length > 50) return "Name must be less than 50 characters";
    if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmed))
      return "Name can only contain letters, spaces, hyphens, apostrophes, and periods";
    if (/^\s|\s$/.test(name)) return "Name cannot start or end with spaces";
    return "";
  };

  const validateEmail = (email: string): string => {
    const trimmed = email.trim();
    if (!trimmed) return "Email is required";
    // More robust email validation
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(trimmed)) return "Please enter a valid email address";
    if (trimmed.length > 254) return "Email address is too long";
    return "";
  };

  const validatePhone = (phone: string): string => {
    if (!phone.trim()) return ""; // Phone is optional
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
    if (!/^\d+$/.test(cleaned))
      return "Phone number can only contain digits, spaces, hyphens, parentheses, and plus signs";
    if (cleaned.length < 10) return "Phone number must be at least 10 digits";
    if (cleaned.length > 15) return "Phone number must be less than 15 digits";
    return "";
  };

  const validateProfession = (profession: string): string => {
    if (!profession) return "Medical profession is required";
    const validProfessions = [
      "OB/GYN",
      "General Practitioner",
      "Dietitian",
      "Physiotherapist",
    ];
    if (!validProfessions.includes(profession))
      return "Please select a valid medical profession";
    return "";
  };

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "name":
        return validateName(value);
      case "email":
        return validateEmail(value);
      case "phone":
        return validatePhone(value);
      case "profession":
        return validateProfession(value);
      default:
        return "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newFieldErrors = {
      name: validateName(formData.name),
      profession: validateProfession(formData.profession),
      email: validateEmail(formData.email),
      phone: validatePhone(formData.phone),
    };

    setFieldErrors(newFieldErrors);

    // Check if there are any validation errors
    const hasErrors = Object.values(newFieldErrors).some(
      (error) => error !== "",
    );
    if (hasErrors) {
      setError("Please fix the validation errors above");
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

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to assign questions";

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage =
            errorText.length > 100
              ? `${errorText.substring(0, 100)}...`
              : errorText;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      localStorage.setItem("userId", data.userId);
      localStorage.setItem("userName", formData.name.trim());

      router.push("/questions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear general error when user starts typing
    if (error) setError("");

    // Real-time validation for the field being changed
    const fieldError = validateField(field, value);
    setFieldErrors((prev) => ({ ...prev, [field]: fieldError }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2 px-4 sm:px-6">
            <div className="flex items-center justify-center mb-6">
              <Image
                src="/logo.png"
                alt="Healthcare Review Form"
                width={48}
                height={48}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg"
                priority
              />
            </div>
            <CardTitle className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
              Healthcare Review Form
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs sm:text-sm">
              Please provide your information to get started
            </CardDescription>
          </CardHeader>

          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="input-name"
                  className="text-xs sm:text-sm font-medium"
                >
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="input-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`w-full ${fieldErrors.name ? "border-destructive" : ""}`}
                  disabled={isLoading}
                  maxLength={50}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-destructive">{fieldErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="input-email"
                  className="text-xs sm:text-sm font-medium"
                >
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="input-email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`w-full ${fieldErrors.email ? "border-destructive" : ""}`}
                  disabled={isLoading}
                  maxLength={254}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="input-phone"
                  className="text-xs sm:text-sm font-medium"
                >
                  Phone Number (Optional)
                </Label>
                <Input
                  id="input-phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={`w-full ${fieldErrors.phone ? "border-destructive" : ""}`}
                  disabled={isLoading}
                  maxLength={20}
                />
                {fieldErrors.phone && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="select-profession"
                  className="text-xs sm:text-sm font-medium"
                >
                  Medical Profession <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.profession}
                  onValueChange={(value) =>
                    handleInputChange("profession", value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger
                    id="select-profession"
                    className={
                      fieldErrors.profession ? "border-destructive" : ""
                    }
                  >
                    <SelectValue placeholder="Select your medical profession" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OB/GYN">OB/GYN</SelectItem>
                    <SelectItem value="General Practitioner">
                      General Practitioner
                    </SelectItem>
                    <SelectItem value="Dietitian">Dietitian</SelectItem>
                    <SelectItem value="Physiotherapist">
                      Physiotherapist
                    </SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.profession && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.profession}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="select-clinical-experience"
                  className="text-xs sm:text-sm font-medium"
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
                  className="text-xs sm:text-sm font-medium"
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
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm md:text-base"
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
