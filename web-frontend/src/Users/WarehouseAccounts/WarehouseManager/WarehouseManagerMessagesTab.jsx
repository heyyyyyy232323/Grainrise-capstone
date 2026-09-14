import { useState } from "react";
import { Search, Paperclip, Send, FileText } from "lucide-react";

// ── Mock Conversation Data ──────────────────────────────────────────────────
const INITIAL_CONVERSATIONS = [
  {
    id: "conv-1",
    name: "ABC Rice Mill",
    reference: "APP-2026-0018",
    status: "Application Under Review",
    statusColor: "text-emerald-700 bg-emerald-50",
    time: "10:42 AM",
    unreadCount: 2,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
    messages: [
      {
        id: "m1",
        sender: "them",
        text: "Hello. We've received your application (APP-2026-0018) for the long-grain rice contract. Could you please provide the updated moisture analysis report from your latest harvest? We need this to proceed with the review.",
        time: "10:42 AM",
      },
      {
        id: "m2",
        sender: "me",
        text: "Hi, thanks for reaching out. Yes, I have the latest moisture analysis report ready. I will attach it here momentarily. The levels are consistent with our historical data.",
        time: "11:15 AM",
      },
      {
        id: "m3",
        sender: "me",
        attachment: {
          name: "Moisture_Report_Oct24.pdf",
          size: "1.2 MB",
        },
        time: "11:16 AM",
      },
    ],
  },
  {
    id: "conv-2",
    name: "Golden Harvest Milling",
    reference: "OFR-2026-0042",
    status: "Offer Open",
    statusColor: "text-amber-700 bg-amber-50",
    time: "Yesterday",
    unreadCount: 2,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
    messages: [
      {
        id: "m1",
        sender: "them",
        text: "The revised offer details have been sent. Please review the delivery schedule for precision.",
        time: "Yesterday",
      },
    ],
  },
  {
    id: "conv-3",
    name: "Delta Agro Co.",
    reference: "CON-2025-0112",
    status: "Current Contract",
    statusColor: "text-blue-700 bg-blue-50",
    time: "Oct 12",
    unreadCount: 2,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
    messages: [
      {
        id: "m1",
        sender: "them",
        text: "Delivery confirmed for shipment #4. Payment will be processed within 5 business days.",
        time: "Oct 12",
      },
    ],
  },
];

export default function WarehouseManagerMessagesTab() {
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState("conv-1");
  const [search, setSearch] = useState("");
  const [inputMessage, setInputMessage] = useState("");

  const activeConv =
    conversations.find((c) => c.id === activeConvId) || conversations[0];

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.reference.toLowerCase().includes(search.toLowerCase())
  );

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: "me",
      text: inputMessage,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? { ...c, messages: [...c.messages, newMessage] }
          : c
      )
    );

    setInputMessage("");
  };

  return (
    <div className="flex h-[680px] rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* ── Left Sidebar: Conversation List ──────────────────────────────── */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-white shrink-0">
        <div className="p-3.5 border-b border-slate-100">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={15}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none bg-white placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.map((conv) => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            const isSelected = conv.id === activeConvId;

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full p-3.5 text-left transition flex items-start gap-3 cursor-pointer ${
                  isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50"
                }`}
              >
                <img
                  src={conv.avatar}
                  alt={conv.name}
                  className="h-9 w-9 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 truncate">
                      {conv.name}
                    </h4>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {conv.time}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-medium">
                    <span className="text-gray-400">{conv.reference}</span>
                    <span className="text-gray-300">•</span>
                    <span className={`px-1.5 rounded ${conv.statusColor}`}>
                      {conv.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 truncate leading-snug">
                    {lastMsg?.text ||
                      (lastMsg?.attachment
                        ? `📎 ${lastMsg.attachment.name}`
                        : "")}
                  </p>
                </div>

                {conv.unreadCount > 0 && !isSelected && (
                  <span className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[9px] font-bold text-white">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right Main Chat Area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        {/* Thread Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={activeConv.avatar}
              alt={activeConv.name}
              className="h-9 w-9 rounded-full object-cover"
            />
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {activeConv.name}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Reference: {activeConv.reference}{" "}
                <span className="text-gray-300"> • </span>
                <span className="text-gray-600">{activeConv.status}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              alert(`Viewing reference details: ${activeConv.reference}`)
            }
            className="rounded-xl border border-emerald-700 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
          >
            View Reference
          </button>
        </div>

        {/* Message Thread Window */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-center my-2">
            <span className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-semibold text-gray-500">
              Today, October 15, 2024
            </span>
          </div>

          {activeConv.messages.map((msg) => {
            const isMe = msg.sender === "me";

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`flex gap-2 max-w-[70%] ${
                    isMe ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Bubble */}
                  <div
                    className={`rounded-2xl p-4 text-xs leading-relaxed ${
                      isMe
                        ? "bg-[#0B5D1E] text-white rounded-br-xs"
                        : "bg-white text-gray-800 border border-slate-200/80 shadow-xs rounded-bl-xs"
                    }`}
                  >
                    {msg.text && <p>{msg.text}</p>}

                    {/* File Attachment Bubble */}
                    {msg.attachment && (
                      <div className="flex items-center gap-3 rounded-xl bg-slate-100 p-2.5 text-gray-800 border border-slate-200/60">
                        <div className="p-2 bg-slate-200 rounded-lg text-gray-600">
                          <FileText size={16} />
                        </div>
                        <div className="pr-4">
                          <p className="font-bold text-xs">
                            {msg.attachment.name}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {msg.attachment.size}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isMe && (
                    <div className="self-end mb-1 text-slate-300">
                      <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                        🏛️
                      </div>
                    </div>
                  )}

                  {isMe && (
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
                      alt="Avatar"
                      className="h-6 w-6 rounded-full object-cover self-end mb-1"
                    />
                  )}
                </div>

                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {msg.time}
                </span>
              </div>
            );
          })}
        </div>

        {/* Message Input Footer */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 border-t border-slate-200 bg-white"
        >
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#0B5D1E] focus-within:border-[#0B5D1E]">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
            >
              <Paperclip size={18} />
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 text-xs outline-none bg-transparent placeholder-gray-400 text-gray-700 py-1"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-[#0B5D1E] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition cursor-pointer"
            >
              <span>Send</span>
              <Send size={12} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
