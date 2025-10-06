'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';

interface ExtendedStep {
  title: string;
  content: string;
  selector: string;
  icon: string;
  side: string;
  image?: string;
  imageAlt?: string;
}

interface CustomCardProps {
  step: ExtendedStep;
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  skipTour?: () => void;
  arrow: React.ReactNode;
}

const CustomCard = ({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: CustomCardProps) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-700 p-4 sm:p-6 max-w-2xl mx-4 sm:mx-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {step.title}
          </h3>
        </div>
        <Button
          onClick={skipTour || (() => {})}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
        {step.content}
      </div>

      {/* Image */}
      {step.image && (
        <div className="mb-6">
          <div className="relative w-full max-w-4xl mx-auto">
            <Image
              src={step.image}
              alt={step.imageAlt || "Tour step illustration"}
              width={600}
              height={400}
              className="rounded-lg border border-gray-200 dark:border-zinc-700 shadow-md w-full h-auto"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>
      )}

      {/* Arrow */}
      {arrow}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span>Step {currentStep + 1} of {totalSteps}</span>
          <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button
              onClick={prevStep}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 flex-1 sm:flex-none"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={skipTour || (() => {})}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-1 sm:flex-none"
          >
            Skip Tour
          </Button>
          <Button
            onClick={nextStep}
            size="sm"
            className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white flex-1 sm:flex-none"
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
            {currentStep !== totalSteps - 1 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomCard;
