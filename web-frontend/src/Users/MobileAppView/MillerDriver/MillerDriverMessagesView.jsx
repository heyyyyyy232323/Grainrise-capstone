import React, { useState } from "react";
import {
  Search,
  ArrowLeft,
  Send,
  Paperclip,
  CheckCheck,
  Check,
  CheckCircle2,
  FileText,
  Navigation,
  Mic,
  Store,
  PenSquare,
  Download,
  Radio,
  Package,
} from "lucide-react";

export default function MillerDriverMessagesView({
  messages = [],
  onStartTracking,
}) {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [inputText, setInputText] = useState("");
  const [chatThreads, setChatThreads] = useState(messages);

  const activeChat = chatThreads.find((c) => c.id === selectedChat?.id);

  const filteredList = chatThreads.filter((c) => {
    const matchesSearch =
      c.sender.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      c.batchNo.toLowerCase().includes(searchKeyword.toLowerCase());

    if (!matchesSearch) return false;
    if (filterTab === "unread") return c.unreadCount > 0;
    return true;
  });

  const handleSelectConversation = (chat) => {
    setSelectedChat(chat);
    setChatThreads((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleSendMessage = (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || !activeChat) return;

    const newMessage = {
      id: `m-${Date.now()}`,
      sender: "me",
      type: "text",
      text: text.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      read: true,
    };

    setChatThreads((prev) =>
      prev.map((c) => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            lastMessage: text.trim(),
            timestamp: "Just now",
            chatHistory: [...c.chatHistory, newMessage],
          };
        }
        return c;
      })
    );

    setInputText("");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW B: CHAT CONVERSATION SCREEN (Figma Design)
  // ─────────────────────────────────────────────────────────────────────────
  if (selectedChat && activeChat) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] bg-white -mx-4 -my-4 relative">
        {/* Chat Header matching Figma */}
        <div className="bg-white px-4 py-2.5 border-b border-slate-200/90 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedChat(null)}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer active:scale-95 transition-all shadow-2xs"
            >
              <ArrowLeft size={16} />
            </button>

            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black text-slate-900 leading-tight">
                  {activeChat.sender === "Rital Retailer"
                    ? "Rita Retailer"
                    : activeChat.sender}
                </h2>
                <CheckCircle2
                  size={14}
                  className="text-[#16a34a] fill-[#16a34a] text-white"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {activeChat.batchNo}
              </p>
            </div>
          </div>

          {/* Outlined Live Tracking Button */}
          <button
            type="button"
            onClick={() => onStartTracking && onStartTracking()}
            className="bg-white border border-[#0d5921] hover:bg-[#ebf8ee] text-[#0d5921] text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
          >
            <Navigation size={12} className="rotate-45" />
            <span>Live Tracking</span>
          </button>
        </div>

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-white">
          {/* Centered Date Badge */}
          <div className="text-center my-1">
            <span className="bg-slate-100 text-slate-500 font-medium text-[11px] px-3.5 py-1 rounded-full">
              Today, October 15, 2024
            </span>
          </div>

          {/* Lot / Commodity Info Card */}
          {activeChat.lotInfo && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex items-start gap-3">
              {/* Pallet Image Thumbnail */}
              <div className="w-16 h-16 rounded-xl bg-amber-50 border border-amber-200/60 overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=200&q=80"
                  alt="Sacks Pallet"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Lot details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <h3 className="text-xs font-black text-slate-900 truncate">
                    {activeChat.lotInfo.lotTitle}
                  </h3>
                  <span className="bg-[#fef3c7] text-[#b45309] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                    {activeChat.lotInfo.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {activeChat.lotInfo.depotSubtext}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0d5921] mt-1.5">
                  <Package size={14} className="text-[#0d5921] shrink-0" />
                  <span>{activeChat.lotInfo.reservedSacks}</span>
                </div>
              </div>
            </div>
          )}

          {/* Messages List */}
          {activeChat.chatHistory.map((msg) => {
            // 1. Depot Sensor Reading Card
            if (msg.type === "sensor") {
              return (
                <div
                  key={msg.id}
                  className="bg-[#f3f4fd] border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs space-y-1.5 my-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#ebf8ee] flex items-center justify-center text-[#0d5921] shrink-0">
                        <Radio size={13} strokeWidth={2.5} />
                      </div>
                      <span className="text-xs font-black text-[#0d5921]">
                        {msg.title}
                      </span>
                    </div>
                    <CheckCircle2
                      size={15}
                      className="text-[#16a34a] fill-[#16a34a] text-white shrink-0"
                    />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-8">
                    {msg.desc}
                  </p>
                </div>
              );
            }

            // 2. Attached PDF Report Card
            if (msg.type === "file") {
              return (
                <div key={msg.id} className="flex flex-col items-start space-y-1">
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-3 max-w-[85%] shadow-2xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {msg.fileName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {msg.fileMeta}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95 shadow-2xs"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 pl-1">
                    {msg.time}
                  </span>
                </div>
              );
            }

            // 3. Regular Text Message (Outbound green / Inbound soft lavender)
            const isMe = msg.sender === "me";
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs text-xs space-y-1 ${
                    isMe
                      ? "bg-[#0d5921] text-white"
                      : "bg-[#f3f4fd] text-slate-800"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <div
                    className={`flex items-center justify-end gap-1 text-[10px] ${
                      isMe ? "text-emerald-200" : "text-slate-400"
                    }`}
                  >
                    <span>{msg.time}</span>
                    {isMe && (
                      <CheckCheck size={13} className="text-emerald-300" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Suggestion Action Pills matching Figma */}
        {activeChat.quickSuggestions && activeChat.quickSuggestions.length > 0 && (
          <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-slate-100 bg-white">
            {activeChat.quickSuggestions.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(sug)}
                className="bg-white border border-slate-200 text-slate-700 hover:border-[#0d5921] hover:text-[#0d5921] text-xs font-medium px-3.5 py-1.5 rounded-full whitespace-nowrap cursor-pointer transition-all shadow-2xs active:scale-95"
              >
                {sug}
              </button>
            ))}
          </div>
        )}

        {/* Chat Input Bar matching Figma */}
        <div className="bg-white p-3 border-t border-slate-200 flex items-center gap-2">
          {/* Attachment Paperclip Button */}
          <button
            type="button"
            aria-label="Attach file"
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer active:scale-95 transition-all shadow-2xs shrink-0"
          >
            <Paperclip size={18} />
          </button>

          {/* Text Input with Microphone */}
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type a message..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-9 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0d5921] focus:ring-1 focus:ring-[#0d5921]/30 transition-all shadow-2xs"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Voice input"
            >
              <Mic size={15} />
            </button>
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            className="bg-[#0d5921] hover:bg-[#0a461a] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <span>Send</span>
            <Send size={12} className="translate-x-0.5" />
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW A: MESSAGES LIST (Figma Design)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3.5 pb-4">
      {/* Title & Compose Button */}
      <div className="flex items-center justify-between pt-0.5">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Messages
        </h1>
        <button
          type="button"
          aria-label="Compose new message"
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all cursor-pointer shadow-2xs active:scale-95"
        >
          <PenSquare size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="Search conversations"
          className="w-full bg-white border border-slate-200/90 rounded-xl py-2 pl-9 pr-3 text-xs placeholder:text-slate-400 font-medium text-slate-900 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#0d5921]/40"
        />
      </div>

      {/* Chat List matching Figma Cards */}
      <div className="space-y-3">
        {filteredList.map((chat) => (
          <div
            key={chat.id}
            onClick={() => handleSelectConversation(chat)}
            className="bg-white rounded-2xl border border-slate-200/80 p-3.5 space-y-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-xs cursor-pointer transition-all active:scale-[0.99]"
          >
            {/* Top row: Store Avatar + Name/Batch + Time/Status */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Circular Mint Avatar with Store Icon */}
                <div className="w-10 h-10 rounded-full bg-[#ebf8ee] flex items-center justify-center shrink-0">
                  <Store size={18} className="text-[#0d5921]" strokeWidth={2} />
                </div>

                {/* Sender Name + Green Online Dot + Batch Number */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-extrabold text-sm text-slate-900 truncate">
                      {chat.sender}
                    </h2>
                    {chat.online && (
                      <span className="w-2 h-2 rounded-full bg-[#16a34a] shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight mt-0.5">
                    {chat.batchNo}
                  </p>
                </div>
              </div>

              {/* Timestamp & Unread Count or Read Receipt */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-[11px] font-medium text-slate-400">
                  {chat.timestamp}
                </span>
                {chat.unreadCount > 0 ? (
                  <span className="w-5 h-5 rounded-full bg-[#0d5921] text-white text-[10px] font-black flex items-center justify-center shadow-2xs">
                    {chat.unreadCount}
                  </span>
                ) : (
                  <CheckCheck size={16} className="text-[#16a34a]" strokeWidth={2.2} />
                )}
              </div>
            </div>

            {/* Message Bubble Preview Box */}
            <div className="bg-[#f3f4fd] rounded-xl px-3 py-2 text-xs text-slate-600 font-normal leading-relaxed">
              {chat.lastMessage}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
