import React, { useEffect } from "react";
import Logo from "../../assets/Logo.png";
import { useLoading } from "../context/LoadingContext";

/**
 * Session-storage key — set to "1" after the very first render so we know
 * subsequent renders within the same browser tab are NOT hard refreshes.
 */
const SESSION_KEY = "grainrise_session_started";

export default function GlobalLoadingScreen() {
  const { visible, triggerLoading } = useLoading();

  useEffect(() => {
    const isFirstLoad = !sessionStorage.getItem(SESSION_KEY);

    if (isFirstLoad) {
      // Hard refresh or very first open — show the loader once
      sessionStorage.setItem(SESSION_KEY, "1");
      triggerLoading(700);
    }
    // All other triggers (login submit) are handled imperatively
    // via triggerLoading() in the Login components — never on route change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#F9FCF9] pointer-events-none">
      {/* Top Logo */}
      <div className="mb-16">
        <img src={Logo} alt="GrainRise Logo" className="h-12 object-contain" />
      </div>

      {/* Loading Text */}
      <div className="text-green-700 font-bold text-xl tracking-wide mb-6">
        Loading...
      </div>

      {/* Circular Spinner */}
      <div className="relative flex items-center justify-center w-32 h-32 bg-green-200/50 rounded-full">
        <div className="w-20 h-20 relative animate-spin" style={{ animationDuration: "2.5s" }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-5 bg-teal-700 rounded-full" style={{ transformOrigin: "50% 100%" }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-5 bg-green-600 rounded-full rotate-45" style={{ transformOrigin: "50% 200%" }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-5 bg-lime-500 rounded-full rotate-90" style={{ transformOrigin: "50% 200%" }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-5 bg-yellow-500 rounded-full rotate-[135deg]" style={{ transformOrigin: "50% 200%" }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-5 bg-amber-400 rounded-full rotate-180" style={{ transformOrigin: "50% 200%" }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-5 bg-yellow-400 rounded-full rotate-[225deg]" style={{ transformOrigin: "50% 200%" }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-5 bg-lime-400 rounded-full rotate-[270deg]" style={{ transformOrigin: "50% 200%" }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-5 bg-teal-500 rounded-full rotate-[315deg]" style={{ transformOrigin: "50% 200%" }} />
        </div>
      </div>
    </div>
  );
}
