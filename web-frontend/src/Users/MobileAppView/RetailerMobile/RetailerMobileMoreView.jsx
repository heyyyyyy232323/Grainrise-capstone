import React, { useState } from "react";
import {
  Store,
  FileText,
  ShoppingBag,
  RotateCcw,
  MessageSquare,
  Newspaper,
  ChevronRight,
  X,
} from "lucide-react";
import RetailerMobileNewsView from "./RetailerMobileNewsView";

export default function RetailerMobileMoreView({
  onNavigate,
  onClose,
  userInitials = "KA",
  userName = "Kerbie Hector Abanid",
}) {
  const [subView, setSubView] = useState(null);

  if (subView === "news") {
    return <RetailerMobileNewsView onBack={() => setSubView(null)} />;
  }

  const handleItemClick = (id) => {
    if (id === "news") {
      setSubView("news");
    } else if (onNavigate) {
      onNavigate(id);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-2xs border border-gray-100 space-y-5 animate-fadeIn">
      {/* ── Top Drag Handle ────────────────────────────────────────── */}
      <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto -mt-1 mb-2" />

      {/* ── Header Row ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
          More
        </h1>
        <button
          onClick={onClose || (() => onNavigate && onNavigate("close"))}
          className="w-8 h-8 rounded-full bg-[#f1f5f9] text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── 1. INVENTORY Section ───────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          INVENTORY
        </p>
        <button
          onClick={() => handleItemClick("marketplace")}
          className="w-full bg-[#EBF7EE] border border-[#D0EED7] rounded-2xl p-3 flex items-center justify-between transition-all cursor-pointer active:scale-99"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-[#00580C] text-white flex items-center justify-center shadow-2xs">
              <Store size={18} strokeWidth={2.2} />
            </div>
            <span className="text-sm font-bold text-[#00580C] ml-3.5">
              Warehouse Marketplace
            </span>
          </div>
          <ChevronRight size={18} className="text-[#00580C]" />
        </button>
      </div>

      {/* ── 2. SALES Section ───────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          SALES
        </p>
        <button
          onClick={() => handleItemClick("sales-history")}
          className="w-full bg-white border border-gray-100 rounded-2xl p-3 flex items-center justify-between hover:bg-gray-50/80 transition-all cursor-pointer active:scale-99 shadow-2xs"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-[#EBF7EE] text-[#00580C] flex items-center justify-center">
              <FileText size={18} strokeWidth={2.2} />
            </div>
            <span className="text-sm font-bold text-gray-900 ml-3.5">
              Sales History
            </span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* ── 3. PURCHASES Section ───────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          PURCHASES
        </p>
        <button
          onClick={() => handleItemClick("purchases")}
          className="w-full bg-white border border-gray-100 rounded-2xl p-3 flex items-center justify-between hover:bg-gray-50/80 transition-all cursor-pointer active:scale-99 shadow-2xs"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-[#EBF7EE] text-[#00580C] flex items-center justify-center">
              <ShoppingBag size={18} strokeWidth={2.2} />
            </div>
            <span className="text-sm font-bold text-gray-900 ml-3.5">
              My Purchases
            </span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* ── 4. SUPPORT Section ─────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          SUPPORT
        </p>
        <div className="space-y-2.5">
          <button
            onClick={() => handleItemClick("returns")}
            className="w-full bg-white border border-gray-100 rounded-2xl p-3 flex items-center justify-between hover:bg-gray-50/80 transition-all cursor-pointer active:scale-99 shadow-2xs"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-xl bg-[#EBF7EE] text-[#00580C] flex items-center justify-center">
                <RotateCcw size={18} strokeWidth={2.2} />
              </div>
              <span className="text-sm font-bold text-gray-900 ml-3.5">
                Product Returns Issue
              </span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          <button
            onClick={() => handleItemClick("messages")}
            className="w-full bg-white border border-gray-100 rounded-2xl p-3 flex items-center justify-between hover:bg-gray-50/80 transition-all cursor-pointer active:scale-99 shadow-2xs"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-xl bg-[#EBF7EE] text-[#00580C] flex items-center justify-center">
                <MessageSquare size={18} strokeWidth={2.2} />
              </div>
              <span className="text-sm font-bold text-gray-900 ml-3.5">
                Messages
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-[#E11D48] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                3
              </span>
              <ChevronRight size={18} className="text-gray-400" />
            </div>
          </button>
        </div>
      </div>

      {/* ── 5. RESOURCES Section ───────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          RESOURCES
        </p>
        <button
          onClick={() => handleItemClick("news")}
          className="w-full bg-white border border-gray-100 rounded-2xl p-3 flex items-center justify-between hover:bg-gray-50/80 transition-all cursor-pointer active:scale-99 shadow-2xs"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-[#EBF7EE] text-[#00580C] flex items-center justify-center">
              <Newspaper size={18} strokeWidth={2.2} />
            </div>
            <span className="text-sm font-bold text-gray-900 ml-3.5">
              News &amp; Updates
            </span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
}
