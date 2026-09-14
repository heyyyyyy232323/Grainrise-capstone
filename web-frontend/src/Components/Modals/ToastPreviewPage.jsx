import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  AlertTriangle,
  RotateCw,
  UserX,
  X,
  ArrowLeft,
  Bell,
  Sparkles,
} from "lucide-react";
import Toast from "./Toast";
import Logo from "../../assets/Logo.png";

export default function ToastPreviewPage() {
  const navigate = useNavigate();
  const [activePopup, setActivePopup] = useState(null);

  const toastExamples = [
    {
      id: "success",
      type: "success",
      title: "Success",
      message: "Supplier account has been added successfully.",
      borderColor: "border-[#16a34a]",
      accentBorder: "border-l-[#16a34a]",
      Icon: () => (
        <div className="w-5 h-5 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0 shadow-2xs">
          <Check size={12} strokeWidth={3} className="text-white" />
        </div>
      ),
    },
    {
      id: "error",
      type: "error",
      title: "Save Failed",
      message: "Unable to save the inventory changes.\nPlease try again.",
      borderColor: "border-[#ef4444]",
      accentBorder: "border-l-[#ef4444]",
      actionLabel: "Retry",
      actionType: "button",
      Icon: () => (
        <div className="w-5 h-5 rounded-full bg-[#ef4444] flex items-center justify-center shrink-0 shadow-2xs">
          <span className="text-white text-xs font-black leading-none">!</span>
        </div>
      ),
    },
    {
      id: "warning",
      type: "warning",
      title: "Low Stock Alert",
      message: "Rice stock for this product is below the recommended level.",
      borderColor: "border-[#eab308]",
      accentBorder: "border-l-[#eab308]",
      actionLabel: "Review Stock",
      actionType: "link",
      Icon: () => (
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          <AlertTriangle size={18} className="text-[#eab308] fill-[#eab308]/20" />
        </div>
      ),
    },
    {
      id: "info",
      type: "info",
      title: "Data Refreshed",
      message: "Inventory data has been refreshed.",
      borderColor: "border-[#3b82f6]",
      accentBorder: "border-l-[#3b82f6]",
      Icon: () => (
        <div className="w-5 h-5 rounded-full bg-[#3b82f6] flex items-center justify-center shrink-0 shadow-2xs">
          <span className="text-white text-xs font-bold leading-none italic font-serif">i</span>
        </div>
      ),
    },
    {
      id: "processing",
      type: "processing",
      title: "Processing",
      message: "Generating your inventory report...",
      borderColor: "border-[#4b5563]",
      accentBorder: "border-l-[#4b5563]",
      Icon: () => (
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          <RotateCw size={17} className="text-[#374151] animate-spin" />
        </div>
      ),
    },
    {
      id: "deactivated",
      type: "deactivated",
      title: "Account Deactivated",
      message: "Juan Dela Cruz's account has been deactivated.",
      borderColor: "border-[#374151]",
      accentBorder: "border-l-[#374151]",
      actionLabel: "Undo Action",
      actionType: "link-right",
      Icon: () => (
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          <UserX size={18} className="text-[#374151]" />
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={Logo} alt="GrainRise" className="h-9 w-auto" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">
                  Figma Toast Notifications Gallery
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">
                  Figma Design Match
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                All 6 toast notification designs matched to the Figma specifications.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
          >
            <ArrowLeft size={15} />
            Back to Home
          </button>
        </div>

        {/* Section 1: Figma Layout Side-by-Side View */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Sparkles size={18} className="text-[#0B7A2A]" />
                Static Showcase (Matching Figma Mockup)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Visual side-by-side comparison of the 6 card variants. Click &ldquo;Test as Live Popup&rdquo; to test real animation.
              </p>
            </div>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            {toastExamples.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-xl border ${item.borderColor} border-l-[4px] ${item.accentBorder} shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-4 relative`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <item.Icon />
                    <h4 className="text-sm font-bold text-gray-900 leading-snug">
                      {item.title}
                    </h4>
                  </div>
                  <div className="text-gray-300 hover:text-gray-500 rounded-md p-0.5">
                    <X size={14} strokeWidth={2.5} />
                  </div>
                </div>

                {/* Message */}
                <div className="pl-7.5 pr-2 mt-1">
                  <p className="text-xs text-gray-500 font-normal leading-relaxed whitespace-pre-line">
                    {item.message}
                  </p>
                </div>

                {/* Action Button/Link if any */}
                {item.actionLabel && (
                  <div
                    className={`pl-7.5 pr-2 ${
                      item.actionType === "link-right"
                        ? "flex justify-end mt-1.5"
                        : "mt-2.5"
                    }`}
                  >
                    {item.actionType === "button" && (
                      <button
                        type="button"
                        onClick={() => alert(`${item.actionLabel} clicked`)}
                        className="inline-flex items-center justify-center px-3.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-2xs cursor-pointer"
                      >
                        {item.actionLabel}
                      </button>
                    )}

                    {item.actionType === "link" && (
                      <button
                        type="button"
                        onClick={() => alert(`${item.actionLabel} clicked`)}
                        className="text-xs font-semibold text-gray-700 hover:text-gray-900 hover:underline cursor-pointer"
                      >
                        {item.actionLabel}
                      </button>
                    )}

                    {item.actionType === "link-right" && (
                      <button
                        type="button"
                        onClick={() => alert(`${item.actionLabel} clicked`)}
                        className="text-xs font-semibold text-gray-600 hover:text-gray-900 hover:underline cursor-pointer text-right"
                      >
                        {item.actionLabel}
                      </button>
                    )}
                  </div>
                )}

                {/* Trigger button badge */}
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActivePopup(item)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0B7A2A] hover:text-[#07531c] bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md transition cursor-pointer"
                  >
                    <Bell size={12} />
                    Test as Live Popup
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Live Popup */}
      {activePopup && (
        <Toast
          isOpen={Boolean(activePopup)}
          type={activePopup.type}
          title={activePopup.title}
          message={activePopup.message}
          actionLabel={activePopup.actionLabel}
          actionType={activePopup.actionType}
          onAction={() => alert(`${activePopup.actionLabel} clicked on live popup!`)}
          duration={4000}
          onClose={() => setActivePopup(null)}
        />
      )}
    </div>
  );
}
