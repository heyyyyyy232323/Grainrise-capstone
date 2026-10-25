import React, { useState } from "react";
import {
  Search,
  ChevronLeft,
  FileText,
  CheckCheck,
  CheckCircle2,
  Clock,
  Anchor,
  Paperclip,
  Mic,
  Send,
  Download,
  Factory,
  Wheat,
  Truck,
  Wifi,
  Package,
  X,
  FileCheck,
} from "lucide-react";

const INITIAL_CONVERSATIONS = [
  {
    id: "conv-1",
    name: "ABC Rice Mill",
    isVerified: true,
    location: "Depot Central #4 • Bulacan",
    time: "10:42 AM",
    lastMessage:
      "We've received your application for the long-grain rice contract. Could you please provide the...",
    statusText: "Delivered • Waiting for QA PDF",
    statusType: "delivered",
    unreadCount: 2,
    avatarBg: "bg-[#E6F4EA] text-[#00580C]",
    icon: Factory,
    refCode: "APP-2026-0018",
    refSubtitle: "Application Under Review",
    lotInfo: {
      lotNo: "Lot #994-A • Dinorado Special",
      millingType: "Triple Milled",
      storage: "Depot 4 Storage Dock • Batch Q3-2024",
      reserved: "500 Sacks Reserved (25,000 kg)",
    },
    messages: [
      {
        id: "m-1",
        sender: "them",
        senderName: "ABC Rice Mill • Procurement Desk",
        text: "Hello. We've received your application (APP-2026-0018) for the long-grain rice contract. Could you please provide the updated moisture analysis report from your latest harvest? We need this to proceed with the review.",
        time: "10:42 AM",
      },
      {
        id: "m-2",
        sender: "me",
        text: "Hi, thanks for reaching out. Yes, I have the latest moisture analysis report ready. I will attach it here momentarily. The levels are consistent with our historical data.",
        time: "11:15 AM",
        delivered: true,
      },
      {
        id: "m-3",
        sender: "me-attachment",
        fileName: "Moisture_Report_Oct24.pdf",
        fileSize: "1.2 MB",
        fileType: "Signed Lab Certificate",
        time: "11:16 AM",
        delivered: true,
      },
      {
        id: "m-4",
        sender: "system-reading",
        title: "Depot Moisture Reading: 12.9%",
        description:
          "Auto-verified by Depot #4 automated grain sensor array. Status complies with premium milling benchmark (< 14.0%).",
      },
    ],
  },
  {
    id: "conv-2",
    name: "Golden Harvest Milling",
    isVerified: true,
    location: "Isabela Grain Silo • Depot Bay 2",
    time: "Yesterday",
    lastMessage:
      "The revised offer details have been sent. Please review the delivery schedule for the 500 sacks...",
    statusText: "Valid until Nov 1 • 500 Sacks Reserved",
    statusType: "clock",
    unreadCount: 2,
    avatarBg: "bg-[#FEF3C7] text-[#B45309]",
    icon: Wheat,
    refCode: "ORD-2026-0045",
    refSubtitle: "Scheduled Batch Dispatch",
    lotInfo: {
      lotNo: "Lot #812-B • Sinandomeng Premium",
      millingType: "Double Polished",
      storage: "Isabela Main Warehouse • Bay 2",
      reserved: "500 Sacks Reserved (25,000 kg)",
    },
    messages: [
      {
        id: "m-201",
        sender: "them",
        senderName: "Golden Harvest • Logistics",
        text: "The revised offer details have been sent. Please review the delivery schedule for the 500 sacks of Sinandomeng scheduled for next week.",
        time: "Yesterday",
      },
    ],
  },
  {
    id: "conv-3",
    name: "Delta Agro Co.",
    isVerified: false,
    location: "Freight Division • Port Logistics",
    time: "Oct 12",
    lastMessage:
      "Delivery confirmed for shipment #4. Payment will be processed within 5 business days upon...",
    statusText: "In Transit: Manila Wharf (Wharf 9)",
    statusType: "anchor",
    unreadCount: 0,
    avatarBg: "bg-[#E0F2FE] text-[#0369A1]",
    icon: Truck,
    refCode: "SHP-2026-0091",
    refSubtitle: "Container Vessel Transit",
    lotInfo: {
      lotNo: "Lot #401-C • Jasmine Fragrant Grain",
      millingType: "Export Grade",
      storage: "Manila Port Dock 9",
      reserved: "300 Sacks Reserved (15,000 kg)",
    },
    messages: [
      {
        id: "m-301",
        sender: "them",
        senderName: "Delta Freight Admin",
        text: "Delivery confirmed for shipment #4. Payment will be processed within 5 business days upon arrival verification.",
        time: "Oct 12",
      },
    ],
  },
];

export default function RetailerMobileMessagesView({ onBack }) {
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [showRefModal, setShowRefModal] = useState(false);

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedConversation) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: "me",
      text: inputText.trim(),
      time: "Just now",
      delivered: true,
    };

    setSelectedConversation((prev) => ({
      ...prev,
      messages: [...prev.messages, newMsg],
    }));

    setInputText("");
  };

  const handleQuickAction = (text) => {
    if (!selectedConversation) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: "me",
      text: text,
      time: "Just now",
      delivered: true,
    };

    setSelectedConversation((prev) => ({
      ...prev,
      messages: [...prev.messages, newMsg],
    }));
  };

  // ── 1. ACTIVE CHAT THREAD VIEW (Figma Screen 2 & 1) ─────────────────
  if (selectedConversation) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f8fafc] font-sans -mx-4 -my-4">
        {/* Chat App Bar */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSelectedConversation(null)}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <ChevronLeft size={19} />
            </button>

            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-extrabold text-gray-900 leading-tight">
                  {selectedConversation.name}
                </h2>
                {selectedConversation.isVerified && (
                  <CheckCircle2
                    size={15}
                    className="text-[#00580C] fill-[#E6F4EA]"
                  />
                )}
              </div>
              <p className="text-[11px] text-gray-500 font-medium truncate max-w-[190px]">
                {selectedConversation.refCode} • {selectedConversation.refSubtitle}
              </p>
            </div>
          </div>

          {/* View Ref Button */}
          <button
            onClick={() => setShowRefModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-98 text-xs font-bold text-[#00580C] transition-all cursor-pointer shadow-2xs"
          >
            <FileText size={14} className="text-[#00580C]" />
            <span>View Ref</span>
          </button>
        </div>

        {/* Chat Body Scroll Area */}
        <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
          {/* Centered Date Badge */}
          <div className="text-center">
            <span className="inline-block bg-[#EEF2F6] text-[#64748B] text-xs font-semibold px-3 py-1 rounded-full shadow-2xs">
              Today, October 15, 2024
            </span>
          </div>

          {/* Pinned Reference Card matching Figma */}
          {selectedConversation.lotInfo && (
            <div className="bg-white border border-gray-200/80 rounded-2xl p-3 flex items-start gap-3 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                <Package size={22} className="text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-extrabold text-gray-900 truncate">
                    {selectedConversation.lotInfo.lotNo}
                  </h3>
                  <span className="bg-[#FEF3C7] text-[#B45309] text-[9.5px] font-bold px-2 py-0.5 rounded-full">
                    {selectedConversation.lotInfo.millingType}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {selectedConversation.lotInfo.storage}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[#00580C] text-[11px] font-bold">
                  <Package size={13} />
                  <span>{selectedConversation.lotInfo.reserved}</span>
                </div>
              </div>
            </div>
          )}

          {/* Messages Flow */}
          <div className="space-y-3.5">
            {selectedConversation.messages.map((msg) => {
              if (msg.sender === "them") {
                return (
                  <div key={msg.id} className="space-y-1 max-w-[88%]">
                    <span className="text-[10px] font-semibold text-gray-400 block px-1">
                      {msg.senderName}
                    </span>
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-xs p-3.5 shadow-2xs space-y-2">
                      <p className="text-xs text-gray-800 leading-relaxed">
                        Hello. We've received your application (
                        <span className="font-bold text-[#00580C]">
                          APP-2026-0018
                        </span>
                        ) for the long-grain rice contract. Could you please
                        provide the updated moisture analysis report from your
                        latest harvest? We need this to proceed with the review.
                      </p>
                      <div className="text-right">
                        <span className="text-[10px] font-medium text-gray-400">
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.sender === "me") {
                return (
                  <div key={msg.id} className="flex flex-col items-end space-y-1">
                    <div className="bg-[#00580C] text-white rounded-2xl rounded-tr-xs p-3.5 max-w-[88%] shadow-2xs space-y-1.5">
                      <ArticleMessageContent content={msg.text} isMine={true} className="text-xs text-white leading-relaxed" />
                      <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-100">
                        <span>{msg.time}</span>
                        {msg.delivered && (
                          <CheckCheck size={12} className="text-emerald-200" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.sender === "me-attachment") {
                return (
                  <div key={msg.id} className="flex flex-col items-end space-y-1">
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-3 max-w-[88%] shadow-2xs flex items-center justify-between gap-3 w-72">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-rose-600 tracking-tight">
                            PDF
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-gray-900 truncate">
                            {msg.fileName}
                          </p>
                          <p className="text-[10.5px] text-gray-400 truncate">
                            {msg.fileSize} • {msg.fileType}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => alert(`Downloading ${msg.fileName}...`)}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors shrink-0"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 pr-1">
                      <span>{msg.time}</span>
                      <CheckCheck size={12} className="text-[#00580C]" />
                    </div>
                  </div>
                );
              }

              if (msg.sender === "system-reading") {
                return (
                  <div
                    key={msg.id}
                    className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#EBF7EE] text-[#00580C] flex items-center justify-center shrink-0">
                      <Wifi size={17} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-[#00580C]">
                          {msg.title}
                        </h4>
                        <CheckCircle2
                          size={15}
                          className="text-[#00580C] fill-[#EBF7EE]"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        {msg.description}
                      </p>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>

        {/* Quick Action Suggestion Chips */}
        <div className="px-4 py-2 bg-transparent flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleQuickAction("Acknowledge Sample Delivery")}
            className="px-3.5 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-98 whitespace-nowrap shadow-2xs transition-all cursor-pointer"
          >
            Acknowledge Sample Delivery
          </button>
          <button
            onClick={() => handleQuickAction("Re-confirm Sacks Allocation")}
            className="px-3.5 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-98 whitespace-nowrap shadow-2xs transition-all cursor-pointer"
          >
            Re-confirm Sacks Allocation
          </button>
        </div>

        {/* Message Input Bottom Bar */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex items-center gap-2 shadow-lg">
          <button
            onClick={() => alert("Upload file/document attachment")}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <Paperclip size={18} />
          </button>

          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type a message..."
              className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#00580C]"
            />
            <button
              onClick={() => alert("Voice input active")}
              className="absolute right-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <Mic size={15} />
            </button>
          </div>

          <button
            onClick={handleSendMessage}
            className="px-4 py-2.5 bg-[#00580C] hover:bg-[#004709] active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <span>Send</span>
            <Send size={13} />
          </button>
        </div>

        {/* View Ref Modal Dialog */}
        {showRefModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-gray-100 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <FileCheck size={18} className="text-[#00580C]" />
                  <h3 className="text-sm font-black text-gray-900">
                    Application Reference
                  </h3>
                </div>
                <button
                  onClick={() => setShowRefModal(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="bg-[#f8fafc] p-3 rounded-xl space-y-1.5 border border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Ref No:</span>
                    <span className="font-bold text-gray-900">
                      {selectedConversation.refCode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Contract:</span>
                    <span className="font-bold text-gray-900">
                      Long-grain Rice Supply 2026
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Allocation:</span>
                    <span className="font-bold text-[#00580C]">
                      500 Sacks (25,000 kg)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Status:</span>
                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                      Under Review
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowRefModal(false)}
                className="w-full py-2.5 bg-[#00580C] text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Reference
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 2. CONVERSATIONS LIST VIEW (Figma Screen 4 & 3) ─────────────────
  return (
    <div className="space-y-4 pb-6 font-sans">
      {/* ── Page Header / Title ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Messages
          </h1>
        </div>
      </div>

      {/* ── Search Bar matching Figma ──────────────────────────────────── */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations"
          className="w-full bg-white border border-gray-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#00580C] focus:ring-1 focus:ring-[#00580C] transition-all shadow-2xs"
        />
      </div>

      {/* ── Conversation Cards List ────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredConversations.map((conv) => {
          const IconComponent = conv.icon;

          return (
            <div
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs hover:border-gray-200 active:scale-[0.99] transition-all cursor-pointer space-y-2.5"
            >
              {/* Header: Avatar, Name, Location & Time */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl ${conv.avatarBg} flex items-center justify-center shrink-0 shadow-2xs`}
                  >
                    <IconComponent size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-extrabold text-gray-900 leading-tight">
                        {conv.name}
                      </h3>
                      {conv.isVerified && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                      {conv.location}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap">
                  {conv.time}
                </span>
              </div>

              {/* Message Preview Text */}
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                {conv.lastMessage}
              </p>

              {/* Footer Row: Status Pill / Indicator & Unread Badge */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-50 text-[11px]">
                <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                  {conv.statusType === "delivered" && (
                    <>
                      <CheckCheck size={14} className="text-emerald-600" />
                      <span>{conv.statusText}</span>
                    </>
                  )}
                  {conv.statusType === "clock" && (
                    <>
                      <Clock size={13} className="text-amber-700" />
                      <span>{conv.statusText}</span>
                    </>
                  )}
                  {conv.statusType === "anchor" && (
                    <>
                      <Anchor size={13} className="text-slate-600" />
                      <span>{conv.statusText}</span>
                    </>
                  )}
                </div>

                {conv.unreadCount > 0 ? (
                  <span className="w-5 h-5 rounded-full bg-[#00580C] text-white font-extrabold text-[10px] flex items-center justify-center shadow-xs">
                    {conv.unreadCount}
                  </span>
                ) : (
                  <CheckCheck size={14} className="text-emerald-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
