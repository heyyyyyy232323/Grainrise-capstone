import { useState } from "react";
import { Search, Send, CheckCheck, MapPin } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";

const CONTACTS = [
  {
    id: 1,
    name: "Rita Retailer",
    role: "Retailer",
    batch: "BATCH-20260413-4D5EB009 · Brown Rice · 10kg",
    lastMsg: "Okay lang, salamat ha. Lagi may kasama hehe...",
    time: "10:00 AM",
    unread: 1,
    online: true,
    avatar: "R",
  },
  {
    id: 2,
    name: "Rita Retailer",
    role: "Retailer",
    batch: "Delivery has arrived confirmation",
    lastMsg: "Good day! I'm the assigned driver for your order in our continue...",
    time: "Yesterday",
    unread: 0,
    online: true,
    avatar: "R",
  },
  {
    id: 3,
    name: "Retailer",
    role: "Retailer",
    batch: "",
    lastMsg: "[Attachment] confirm...",
    time: "Apr 13",
    unread: 0,
    online: false,
    avatar: "R",
  },
  {
    id: 4,
    name: "Retailer",
    role: "Retailer",
    batch: "",
    lastMsg: "[Attachment] confirm...",
    time: "Apr 12",
    unread: 0,
    online: false,
    avatar: "R",
  },
  {
    id: 5,
    name: "Retailer",
    role: "Retailer",
    batch: "",
    lastMsg: "[Attachment] confirm...",
    time: "Apr 11",
    unread: 0,
    online: false,
    avatar: "R",
  },
];

const MOCK_MESSAGES = {
  1: [
    { id: 1, sender: "them", text: "Hi, thanks for reaching out. Yes, I have the latest moisture analysis report ready. I'll attach it momentarily. The items are scheduled with us. Kindly take note.", time: "10:09 AM" },
    { id: 2, sender: "me",   text: "Ok po.",              time: "10:45 AM" },
    { id: 3, sender: "them", text: "Sige po bilisan natin.",      time: "10:49 AM" },
    { id: 4, sender: "them", text: "Okay lang salamat ha. Lagi may kasama hehe...", time: "10:52 AM" },
  ],
  2: [{ id: 1, sender: "them", text: "Good day! I'm the assigned driver for your order.", time: "Yesterday" }],
  3: [{ id: 1, sender: "them", text: "[Attachment] confirm...", time: "Apr 13" }],
  4: [{ id: 1, sender: "them", text: "[Attachment] confirm...", time: "Apr 12" }],
  5: [{ id: 1, sender: "them", text: "[Attachment] confirm...", time: "Apr 11" }],
};

const DATE_LABEL = "Today, October 13, 2024";

export default function DriverMessages() {
  const [selected,  setSelected]  = useState(CONTACTS[0]);
  const [messages,  setMessages]  = useState(MOCK_MESSAGES);
  const [input,     setInput]     = useState("");
  const [search,    setSearch]    = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const msg = {
      id: Date.now(),
      sender: "me",
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => ({ ...prev, [selected.id]: [...(prev[selected.id] || []), msg] }));
    setInput("");
  };

  const filtered = CONTACTS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeMessages = messages[selected.id] || [];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Communication" }, { label: "Messages" }]} />
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-slate-500 mt-1">Communicate with retailers regarding your assigned deliveries.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[600px]">
        {/* ── Left: Contact List ────────────────────────────────────────── */}
        <div className="border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {filtered.map((c) => {
              const isActive = selected.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left px-3 py-3 flex items-start gap-3 transition border-b border-slate-50 cursor-pointer ${
                    isActive ? "bg-emerald-50 border-l-4 border-l-emerald-600" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm">
                      {c.avatar}
                    </div>
                    {c.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                    {c.unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className="font-bold text-gray-900 text-xs truncate">{c.name}</p>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-1">{c.time}</span>
                    </div>
                    <p className="text-[11px] text-amber-600 font-medium truncate">{c.role}</p>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{c.lastMsg}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: Chat Pane ──────────────────────────────────────────── */}
        <div className="md:col-span-2 flex flex-col bg-slate-50/40">
          {/* Chat Header */}
          <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm">
                {selected.avatar}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{selected.name}</h3>
                {selected.batch && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin size={10} />
                    {selected.batch}
                  </p>
                )}
              </div>
            </div>
            <button className="rounded-lg border border-emerald-600 text-emerald-700 text-xs font-bold px-4 py-1.5 hover:bg-emerald-50 transition cursor-pointer">
              Live Tracking
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[400px]">
            {/* Date separator */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">{DATE_LABEL}</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {activeMessages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === "me" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.sender === "me"
                    ? "bg-emerald-700 text-white rounded-br-none"
                    : "bg-white border border-slate-200 text-gray-800 rounded-bl-none shadow-sm"
                }`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1 flex items-center gap-1">
                  {msg.time}
                  {msg.sender === "me" && <CheckCheck size={11} className="text-emerald-500" />}
                </span>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
            />
            <button
              onClick={handleSend}
              className="bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl px-5 text-sm font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Send size={14} /> Send it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
