import React, { useState } from "react";
import {
  Search,
  SquarePen,
  Store,
  CheckCheck,
  ChevronLeft,
  Navigation,
  CheckCircle2,
  Package,
  FileText,
  Download,
  Activity,
  Paperclip,
  Mic,
  Send,
  X,
} from "lucide-react";

export default function WarehouseDriverMessagesView({
  messages = [],
  onStartTracking,
}) {
  const [conversations, setConversations] = useState(messages);
  const [activeChat, setActiveChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputMessage, setInputMessage] = useState("");

  // Filter conversations in inbox
  const filteredConversations = conversations.filter(
    (c) =>
      c.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text?.trim() || !activeChat) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: "me",
      type: "text",
      text: text.trim(),
      time: "Just now",
      read: true,
    };

    const updated = conversations.map((item) => {
      if (item.id === activeChat.id) {
        return {
          ...item,
          lastMessage: text.trim(),
          timestamp: "Just now",
          chatHistory: [...(item.chatHistory || []), newMsg],
        };
      }
      return item;
    });

    setConversations(updated);
    setActiveChat((prev) => ({
      ...prev,
      lastMessage: text.trim(),
      timestamp: "Just now",
      chatHistory: [...(prev.chatHistory || []), newMsg],
    }));
    setInputMessage("");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 1. DETAIL / ACTIVE CONVERSATION VIEW (Matching Figma Image 4 & Image 3)
  // ─────────────────────────────────────────────────────────────────────────
  if (activeChat) {
    const lot = activeChat.lotInfo || {
      lotTitle: "Lot #994-A • Dinorado Special",
      badge: "Triple Milled",
      depotSubtext: "Depot 4 Storage Dock • Batch Q3-2024",
      reservedSacks: "500 Sacks Reserved (25,000 kg)",
    };

    return (
      <div className="flex flex-col min-h-[82vh] bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden -mx-1">
        {/* Chat Header */}
        <div className="bg-white border-b border-slate-100 px-3.5 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setActiveChat(null)}
              className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              aria-label="Back to conversations"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black text-slate-900 truncate">
                  {activeChat.sender}
                </h2>
                <CheckCircle2
                  size={14}
                  className="text-emerald-700 fill-emerald-100 shrink-0"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {activeChat.batchNo}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartTracking && onStartTracking(activeChat)}
            className="flex items-center gap-1.5 border border-[#0d5921] bg-white hover:bg-emerald-50 text-[#0d5921] px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
          >
            <Navigation size={13} className="rotate-45 fill-[#0d5921]" />
            <span>Live Tracking</span>
          </button>
        </div>

        {/* Chat Scrollable Message Body */}
        <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto bg-slate-50/40">
          {/* Centered Date Badge */}
          <div className="flex justify-center my-1">
            <span className="bg-slate-100 text-slate-500 font-bold text-[11px] px-3.5 py-1 rounded-full border border-slate-200/60 shadow-2xs">
              Today, October 15, 2024
            </span>
          </div>

          {/* Lot Summary Card (Figma Image 4) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex items-center gap-3">
            {/* Pallet / Rice sacks illustration */}
            <div className="w-16 h-16 rounded-xl bg-amber-50 border border-amber-200/60 flex flex-col items-center justify-center shrink-0 p-1">
              <div className="w-10 h-7 bg-amber-200/80 rounded-md border border-amber-400/80 flex items-center justify-center text-[8px] font-black text-amber-800">
                GRAIN
              </div>
              <span className="text-[8px] font-bold text-amber-700 mt-1">
                PALLET 4
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h3 className="text-xs font-black text-slate-900 truncate">
                  {lot.lotTitle}
                </h3>
                <span className="bg-amber-50 text-amber-700 border border-amber-200/70 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                  {lot.badge}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {lot.depotSubtext}
              </p>

              <div className="flex items-center gap-1.5 text-xs text-[#0d5921] font-bold mt-1">
                <Package size={13} className="shrink-0" />
                <span className="truncate">{lot.reservedSacks}</span>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          {activeChat.chatHistory?.map((msg) => {
            if (msg.sender === "them") {
              if (msg.type === "file") {
                return (
                  <div key={msg.id} className="flex flex-col items-start space-y-1">
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex items-center justify-between w-full max-w-[85%]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 truncate">
                            {msg.fileName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {msg.fileMeta}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => alert(`Downloading ${msg.fileName}...`)}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors shrink-0 ml-2"
                        title="Download Document"
                      >
                        <Download size={15} />
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium px-1">
                      {msg.time}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex flex-col items-start space-y-1 max-w-[85%]">
                  <div className="bg-[#f4f6fb] text-slate-800 rounded-2xl p-3.5 text-xs font-medium leading-relaxed shadow-2xs border border-slate-100">
                    <p>{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium px-1">
                    {msg.time}
                  </span>
                </div>
              );
            }

            if (msg.sender === "me") {
              return (
                <div key={msg.id} className="flex flex-col items-end space-y-1 ml-auto max-w-[85%]">
                  <div className="bg-[#0d5921] text-white rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-2xs">
                    <p>{msg.text}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium px-1">
                    <span>{msg.time}</span>
                    <CheckCheck size={13} className="text-emerald-700" />
                  </div>
                </div>
              );
            }

            if (msg.type === "sensor") {
              return (
                <div
                  key={msg.id}
                  className="bg-[#f6f9fc] border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs flex items-start gap-2.5 my-2"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-[#0d5921]">
                        {msg.title}
                      </h4>
                      <CheckCircle2 size={15} className="text-emerald-700 fill-emerald-100" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">
                      {msg.desc}
                    </p>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* Quick Suggestion Chips (Figma Image 3) */}
        <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {activeChat.quickSuggestions?.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(suggestion)}
              className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 whitespace-nowrap transition-all cursor-pointer shadow-2xs shrink-0"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Bottom Chat Input Bar (Figma Image 3) */}
        <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
          {/* Attachment Paperclip */}
          <button
            type="button"
            onClick={() => alert("Select a document or photo attachment.")}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer shrink-0"
            title="Attach file"
          >
            <Paperclip size={18} />
          </button>

          {/* Text input with Mic */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type a message..."
              className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl pl-3.5 pr-9 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d5921]/20 focus:border-[#0d5921]"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Voice message"
            >
              <Mic size={16} />
            </button>
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            className="bg-[#0d5921] hover:bg-[#0b4b1c] active:scale-95 text-white font-bold text-xs px-3.5 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
          >
            <span>Send</span>
            <Send size={13} className="fill-white" />
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. MESSAGES INBOX LIST VIEW (Matching Figma Image 2 & Image 1)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Title Header with New Conversation Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Messages
        </h1>
        <button
          type="button"
          onClick={() => alert("Start new conversation with warehouse dispatch or retailer.")}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          title="Compose Message"
        >
          <SquarePen size={18} />
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations"
          className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d5921]/20 focus:border-[#0d5921] shadow-2xs transition-all"
        />
      </div>

      {/* Conversation Cards List matching Figma exactly */}
      <div className="space-y-3">
        {filteredConversations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-1 shadow-2xs">
            <p className="text-xs font-bold text-slate-700">No conversations found</p>
            <p className="text-[11px] text-slate-400">Try searching another retailer name or batch code.</p>
          </div>
        ) : (
          filteredConversations.map((item) => {
            const hasUnread = (item.unreadCount || 0) > 0;

            return (
              <article
                key={item.id}
                onClick={() => setActiveChat(item)}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:border-slate-300 transition-all cursor-pointer active:scale-[0.99] space-y-2.5"
              >
                {/* Header Row: Store Icon, Name, Batch, Time & Badge/Ticks */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Store Icon Badge in Green */}
                    <div className="w-10 h-10 rounded-full bg-[#eef8f1] border border-emerald-200/60 text-[#0d5921] flex items-center justify-center shrink-0">
                      <Store size={18} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-extrabold text-slate-900 truncate">
                          {item.sender}
                        </h3>
                        {item.online && (
                          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        {item.batchNo}
                      </p>
                    </div>
                  </div>

                  {/* Right side: Timestamp & Unread count or Read receipt */}
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {item.timestamp}
                    </span>

                    {hasUnread ? (
                      <span className="w-5 h-5 rounded-full bg-[#0d5921] text-white text-[10px] font-black flex items-center justify-center shadow-2xs">
                        {item.unreadCount}
                      </span>
                    ) : (
                      <CheckCheck size={16} className="text-emerald-700" />
                    )}
                  </div>
                </div>

                {/* Message Preview Container */}
                <div className="bg-[#f4f6fb] rounded-xl px-3 py-2.5 border border-slate-100">
                  <p className="text-xs text-slate-700 font-medium leading-relaxed truncate">
                    {item.lastMessage}
                  </p>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
