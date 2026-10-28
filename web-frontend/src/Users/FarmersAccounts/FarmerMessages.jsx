import { useMemo, useState } from "react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import {
  MessageCircle,
  Search,
  Send,
  UserRound,
  Building2,
  Clock,
  CheckCheck,
} from "lucide-react";

const INITIAL_CONVERSATIONS = [
  {
    id: 1,
    contactName: "Golden Grains Rice Mill",
    contactRole: "Miller Partner",
    branch: "Cabanatuan Central Branch",
    avatarColor: "bg-emerald-100 text-emerald-700",
    unreadCount: 1,
    lastActivity: "10:30 AM",
    messages: [
      {
        id: 101,
        sender: "them",
        senderName: "Golden Grains Rice Mill",
        text: "Good morning! We'd like to check on your expected harvest of RC 222 next month.",
        time: "10:15 AM",
      },
      {
        id: 102,
        sender: "me",
        senderName: "You",
        text: "Hello! Our crop is doing great. We anticipate approximately 14,500 kg harvested at 14% moisture by mid-December.",
        time: "10:22 AM",
      },
      {
        id: 103,
        sender: "them",
        senderName: "Golden Grains Rice Mill",
        text: "Excellent! We have an open contract opportunity (OPP-2026-001) with competitive pricing. Let us know if you want to lock it in.",
        time: "10:30 AM",
      },
    ],
  },
  {
    id: 2,
    contactName: "Isabela Central Milling Co.",
    contactRole: "Miller Partner",
    branch: "Santiago Main Plant",
    avatarColor: "bg-blue-100 text-blue-700",
    unreadCount: 0,
    lastActivity: "Yesterday",
    messages: [
      {
        id: 201,
        sender: "me",
        senderName: "You",
        text: "Hi, following up on our application for the NSIC Rc 160 palay delivery.",
        time: "Yesterday, 3:10 PM",
      },
      {
        id: 202,
        sender: "them",
        senderName: "Isabela Central Milling Co.",
        text: "Good day! Your application is under review by our quality control manager. We will update you shortly.",
        time: "Yesterday, 3:45 PM",
      },
    ],
  },
  {
    id: 3,
    contactName: "Plaridel Grain Logistics",
    contactRole: "Logistics & Milling",
    branch: "Bulacan Operations",
    avatarColor: "bg-amber-100 text-amber-700",
    unreadCount: 0,
    lastActivity: "Oct 20",
    messages: [
      {
        id: 301,
        sender: "them",
        senderName: "Plaridel Grain Logistics",
        text: "Confirmation of settlement payout for CTR-2026-042 (Angelica Special) has been disbursed to your registered account.",
        time: "Oct 20, 11:00 AM",
      },
      {
        id: 302,
        sender: "me",
        senderName: "You",
        text: "Received! Thank you for the smooth transaction and prompt payment.",
        time: "Oct 20, 11:20 AM",
      },
    ],
  },
];

export default function FarmerMessages() {
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.contactName.toLowerCase().includes(q) ||
        c.branch.toLowerCase().includes(q) ||
        c.messages.some((m) => m.text.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedId) || conversations[0];
  }, [conversations, selectedId]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const newMsg = {
      id: Date.now(),
      sender: "me",
      senderName: "You",
      text: inputText.trim(),
      time: "Just now",
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversation.id) {
          return {
            ...c,
            lastActivity: "Just now",
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    setInputText("");
  };

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Business" }, { label: "Messages" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Messages
        </h2>
        <p className="text-sm text-slate-500">
          View and manage your conversations with Miller partners and grain buyers in one place.
        </p>
      </div>

      {/* ── Chat Container ────────────────────────────────────────────────── */}
      <div className="flex h-[640px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Left Sidebar - Conversations List */}
        <div className="flex w-full max-w-sm flex-col border-r border-slate-200 bg-slate-50/50">
          {/* Search bar */}
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No matching conversations found.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConversation?.id;
                const lastMsg = conv.messages[conv.messages.length - 1];
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelect(conv.id)}
                    className={`w-full p-4 text-left flex items-start gap-3 transition cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50/70 border-l-4 border-emerald-600"
                        : "hover:bg-slate-100/70"
                    }`}
                  >
                    <div
                      className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${conv.avatarColor}`}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-slate-800 truncate">
                          {conv.contactName}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {conv.lastActivity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {conv.branch}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-1">
                        {lastMsg?.text || "No messages yet"}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane - Chat Window */}
        {activeConversation ? (
          <div className="flex flex-1 flex-col bg-white">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs ${activeConversation.avatarColor}`}
                >
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    {activeConversation.contactName}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeConversation.branch} • {activeConversation.contactRole}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Connected
              </span>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              {activeConversation.messages.map((msg) => {
                const isMe = msg.sender === "me";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] text-slate-400 font-medium mb-1 px-1">
                      {msg.senderName} • {msg.time}
                    </span>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                        isMe
                          ? "bg-emerald-600 text-white rounded-tr-none"
                          : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Footer */}
            <form
              onSubmit={handleSend}
              className="border-t border-slate-200 p-4 bg-white flex items-center gap-3"
            >
              <input
                type="text"
                placeholder={`Message ${activeConversation.contactName}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none transition"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-slate-400 text-sm">
            Select a conversation to view messages.
          </div>
        )}
      </div>
    </div>
  );
}
