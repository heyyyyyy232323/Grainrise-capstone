import React, { useState } from "react";
import { ChevronLeft, ArrowRight } from "lucide-react";
import onboardingImg1 from "../../../assets/onboardingimage.png";
import onboardingImg2 from "../../../assets/onboardingimage2.png";
import onboardingImg3 from "../../../assets/onboardingimage3.png";

/**
 * StartupMobileOnboardingView
 * 
 * Pixel-perfect implementation of the 3-step GrainRise mobile onboarding flow from Figma
 * with well-balanced spacing across all mobile viewport heights.
 */
export default function StartupMobileOnboardingView({ initialStep = 1, onStepChange, onBackToSplash, onComplete }) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  const handleBack = () => {
    if (currentStep > 1) {
      const next = currentStep - 1;
      setCurrentStep(next);
      if (onStepChange) onStepChange(next);
    } else if (onBackToSplash) {
      onBackToSplash();
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      const next = currentStep + 1;
      setCurrentStep(next);
      if (onStepChange) onStepChange(next);
    } else if (onComplete) {
      onComplete();
    }
  };

  const handleSkip = () => {
    setCurrentStep(3);
    if (onStepChange) onStepChange(3);
  };

  return (
    <div className="relative flex flex-col justify-between w-full max-w-[420px] mx-auto min-h-screen bg-white text-gray-900 select-none overflow-hidden font-sans px-6 py-3 transition-all duration-300">
      {/* ── Top Header with Back Navigation ──────────────────────────────── */}
      <header className="relative z-20 w-full flex items-center justify-between pt-1 shrink-0 h-10">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="relative z-20 w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft size={24} strokeWidth={2.2} />
        </button>
        <div className="w-10" />
      </header>

      {/* ── Step 1: Manage Your Supply Chain Anywhere ────────────────────── */}
      {currentStep === 1 && (
        <main className="flex-1 flex flex-col items-center justify-center py-2 animate-fade-in">
          {/* Illustration */}
          <div className="w-full max-w-[270px] sm:max-w-[290px] aspect-square flex items-center justify-center mb-4">
            <img
              src={onboardingImg1}
              alt="Manage Your Supply Chain Anywhere"
              className="w-full h-full object-contain pointer-events-none drop-shadow-xs select-none"
            />
          </div>

          {/* Text Group */}
          <div className="text-center px-2">
            <h1 className="text-[21px] sm:text-[23px] font-bold text-gray-900 tracking-tight leading-snug">
              Manage Your Supply Chain Anywhere
            </h1>
            <p className="mt-2 text-[13px] text-gray-500 max-w-[280px] mx-auto leading-relaxed font-normal">
              Access GrainRise on mobile to monitor inventory, products, and daily operations wherever you are.
            </p>
          </div>

          {/* Progress Indicator Dots: 1st Active */}
          <div className="flex items-center justify-center gap-1.5 mt-6 mb-2">
            <span className="w-6 h-1.5 rounded-full bg-[#15803d] transition-all" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
          </div>
        </main>
      )}

      {/* ── Step 2: Track Orders and Deliveries ───────────────────────────── */}
      {currentStep === 2 && (
        <main className="flex-1 flex flex-col items-center justify-center py-2 animate-fade-in">
          {/* Text Group at Top */}
          <div className="text-center px-2 mb-4">
            <h1 className="text-[21px] sm:text-[23px] font-bold text-gray-900 tracking-tight leading-snug">
              Track Orders and Deliveries
            </h1>
            <p className="mt-2 text-[13px] text-gray-500 max-w-[280px] mx-auto leading-relaxed font-normal">
              Monitor order progress, delivery routes, and supply movement in real time through the GrainRise mobile app.
            </p>
          </div>

          {/* Illustration in Center */}
          <div className="w-full max-w-[270px] sm:max-w-[290px] aspect-square flex items-center justify-center mb-4">
            <img
              src={onboardingImg2}
              alt="Track Orders and Deliveries"
              className="w-full h-full object-contain pointer-events-none drop-shadow-xs select-none"
            />
          </div>

          {/* Progress Indicator Dots: 2nd Active */}
          <div className="flex items-center justify-center gap-1.5 mt-3 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            <span className="w-6 h-1.5 rounded-full bg-[#15803d] transition-all" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
          </div>
        </main>
      )}

      {/* ── Step 3: Stay Connected to Your Operations ────────────────────── */}
      {currentStep === 3 && (
        <main className="flex-1 flex flex-col items-center justify-center py-2 animate-fade-in">
          {/* Illustration */}
          <div className="w-full max-w-[270px] sm:max-w-[290px] aspect-square flex items-center justify-center mb-4">
            <img
              src={onboardingImg3}
              alt="Stay Connected to Your Operations"
              className="w-full h-full object-contain pointer-events-none drop-shadow-xs select-none"
            />
          </div>

          {/* Text Group */}
          <div className="text-center px-2">
            <h1 className="text-[21px] sm:text-[23px] font-bold text-gray-900 tracking-tight leading-snug">
              Stay Connected to Your Operations
            </h1>
            <p className="mt-2 text-[13px] text-gray-500 max-w-[280px] mx-auto leading-relaxed font-normal">
              View updates, monitor performance, and stay informed across your GrainRise activities in one mobile experience.
            </p>
          </div>

          {/* Progress Indicator Dots: 3rd Active */}
          <div className="flex items-center justify-center gap-1.5 mt-6 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            <span className="w-6 h-1.5 rounded-full bg-[#15803d] transition-all" />
          </div>
        </main>
      )}

      {/* ── Bottom Actions & Home Indicator ──────────────────────────────── */}
      <footer className="w-full pb-2 pt-2 flex flex-col gap-4 shrink-0">
        {/* Step 1 & 2: [Skip] ... [Next →] */}
        {currentStep < 3 ? (
          <div className="flex items-center justify-between w-full">
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-700 font-semibold text-sm transition-colors cursor-pointer py-2 px-2"
            >
              Skip
            </button>

            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 bg-[#15803d] hover:bg-[#116b32] active:scale-95 text-white font-semibold text-sm px-6 py-2.5 rounded-full shadow-sm transition-all cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight size={16} strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          /* Step 3: Full-width "Get Started" button */
          <div className="w-full">
            <button
              onClick={onComplete || handleNext}
              className="w-full bg-[#15803d] hover:bg-[#116b32] active:scale-98 text-white font-bold text-[15px] py-3.5 rounded-full shadow-sm transition-all cursor-pointer text-center"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Home Gesture Bar */}
        <div className="w-full flex justify-center pt-1">
          <div className="w-32 h-1 bg-gray-300 rounded-full" />
        </div>
      </footer>
    </div>
  );
}
