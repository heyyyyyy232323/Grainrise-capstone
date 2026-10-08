import React from "react";
import logoMaskImg from "../../../assets/Logo mask.png";

/**
 * StartupMobileSplashScreen
 * 
 * Pixel-perfect implementation of the Figma splash screen design
 * for GrainRise mobile app view.
 * 
 * Features:
 * - Native mobile status bar (9:41, Cellular signal, Wi-Fi, Battery)
 * - Centered squircle card with GrainRise circular emblem
 * - Two-tone brand title: "Grain" (forest green) + "Rise" (harvest gold)
 * - Pill badge: "RICE SUPPLY CHAIN PORTAL"
 * - Bottom carousel/step dots (Green, Amber, Green)
 * - Home gesture indicator bar
 */
export default function StartupMobileSplashScreen({ onContinue, showFrame = false }) {
  return (
    <div className={`relative flex flex-col justify-between w-full h-full min-h-screen bg-white text-gray-900 select-none overflow-hidden font-sans ${showFrame ? "max-w-[390px] max-h-[844px] shadow-2xl rounded-[44px] border-[6px] border-gray-900" : ""}`}>
      {/* ── Main Splash Center Group ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Squircle Card Container */}
        <div
          className="w-[124px] h-[124px] bg-white rounded-[26px] flex items-center justify-center transition-transform duration-300 hover:scale-105"
          style={{
            boxShadow:
              "0 10px 30px -5px rgba(0, 0, 0, 0.07), 0 4px 12px -2px rgba(0, 0, 0, 0.04)",
            border: "1px solid rgba(0, 0, 0, 0.04)",
          }}
        >
          {/* Logo Mask Circular Emblem */}
          <img
            src={logoMaskImg}
            alt="GrainRise Emblem"
            className="w-[82px] h-[82px] object-contain select-none pointer-events-none drop-shadow-2xs"
          />
        </div>

        {/* Wordmark: "GrainRise" */}
        <h1 className="mt-7 text-[34px] font-extrabold tracking-tight leading-none flex items-center justify-center">
          <span className="text-[#00875A]">Grain</span>
          <span className="text-[#E59819]">Rise</span>
        </h1>

        {/* Capsule Badge: "RICE SUPPLY CHAIN PORTAL" */}
        <div className="mt-4 inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-[#f2faf4] border border-[#def2e4] shadow-2xs">
          <span className="text-[11px] font-bold text-[#357e4d] tracking-[0.14em] uppercase select-none">
            Rice Supply Chain Portal
          </span>
        </div>
      </main>

      {/* ── Bottom Section: 3 Dots + Home Indicator Bar ─────────────────────── */}
      <footer className="w-full pb-3 flex flex-col items-center justify-end shrink-0">
        {/* 3 Pagination / Progress Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {/* Dot 1: Green */}
          <span className="w-2 h-2 rounded-full bg-[#15803d]" />
          {/* Dot 2: Golden Amber */}
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
          {/* Dot 3: Green */}
          <span className="w-2 h-2 rounded-full bg-[#15803d]" />
        </div>

        {/* Home Gesture Bar */}
        <div className="w-36 h-1 bg-gray-300 rounded-full" />
      </footer>
    </div>
  );
}
