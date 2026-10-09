import React, { useState, useEffect } from "react";
import StartupMobileSplashScreen from "./StartupMobileSplashScreen";
import StartupMobileOnboardingView from "./StartupMobileOnboardingView";
import StartupMobileLoginView from "./StartupMobileLoginView";

/**
 * StartupMobileApp
 * 
 * Main flow controller for the GrainRise Mobile Startup experience:
 * 1. Splash Screen
 * 2. 3-Step Onboarding View
 * 3. Mobile Login Screen
 */
export default function StartupMobileApp() {
  const [currentScreen, setCurrentScreen] = useState("splash"); // 'splash' | 'onboarding' | 'login'
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Automatically advance from splash to onboarding after 2.5 seconds
  useEffect(() => {
    if (currentScreen === "splash") {
      const timer = setTimeout(() => {
        setCurrentScreen("onboarding");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  return (
    <div className="relative w-full min-h-screen bg-white text-gray-900 select-none overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg backdrop-blur-sm animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Screen Render */}
      {currentScreen === "splash" && (
        <div
          onClick={() => setCurrentScreen("onboarding")}
          className="cursor-pointer h-full"
          title="Click to continue"
        >
          <StartupMobileSplashScreen />
        </div>
      )}

      {currentScreen === "onboarding" && (
        <StartupMobileOnboardingView
          initialStep={onboardingStep}
          onStepChange={(step) => setOnboardingStep(step)}
          onBackToSplash={() => setCurrentScreen("splash")}
          onComplete={() => setCurrentScreen("login")}
        />
      )}

      {currentScreen === "login" && (
        <StartupMobileLoginView
          onBack={() => {
            setOnboardingStep(3);
            setCurrentScreen("onboarding");
          }}
          onLoginSuccess={({ email }) => {
            showToast(`Signed in successfully as ${email}`);
          }}
          onForgotPassword={() => {
            showToast("Forgot password flow triggered");
          }}
          onRegister={() => {
            showToast("Register flow triggered");
          }}
        />
      )}
    </div>
  );
}
