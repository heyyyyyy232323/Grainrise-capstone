import { useState } from "react";
import { Search, Send, Warehouse, ShieldCheck, Clock, CheckCheck } from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";

const CHAT_CONTACTS = [
  { id: 1, name: "Central Bulacan Regional Warehouse", role: "Warehouse Manager", lastMsg: "Your batch WR-001 has been dispatched.", time: "10:30 AM", unread: 1, online: true },
  { id: 2, name: "Isabela Grain Hub Dispatch", role: "Logistics Coordinator", lastMsg: "Payment verification received for Order #882.", time: "Yesterday", unread: 0, online: false },
  { id: 3, name: "GrainRise Support Desk", role: "Admin Support", lastMsg: "Your return ticket #RT-402 is under review.", time: "Aug 28", unread: 0, online: true },
];

const MOCK_MESSAGES = {
  1: [
    { id: 1, sender: "them", text: "Good morning! Regarding your bulk Dinorado procurement order #PO-902.", time: "10:15 AM" },
    { id: 2, sender: "me", text: "Hello! Has the delivery truck been assigned for this afternoon?", time: "10:20 AM" },
    { id: 3, sender: "them", text: "Yes! Truck plate NBD-3491 is loaded with 480 kg and en route now. ETA 02:30 PM.", time: "10:30 AM" },
  ],
  2: [
    { id: 1, sender: "them", text: "Payment verification received for Order #882. Goods will be dispatched on Friday.", time: "Yesterday" },
  ],
  3: [
    { id: 1, sender: "them", text: "Your return ticket #RT-402 is under review with the inspection team.", time: "Aug 28" },
  ],
};

export default function RetailerMessages() {
  const [selectedContact, setSelectedContact] = useState(CHAT_CONTACTS[0]);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [search, setSearch] = useState("");

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMsg = {
      id: Date.now(),
      sender: "me",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMsg],
    }));
    setInputText("");
  };

  const filteredContacts = CHAT_CONTACTS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.role.toLowerCase().includes(search.toLowerCase())
  );

  const activeMessages = messages[selectedContact.id] || [];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Support" }, { label: "Messages" }]} />

      <div className="mb-2">
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Messages &amp; Inquiries
        </h2>
        <p className="text-sm text-slate-500">
          Communicate directly with warehouse logistics coordinators and platform support.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[560px]">
        {/* Contact List */}
        <div className="border-r border-slate-200 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
            />
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[460px]">
            {filteredContacts.map((contact) => {
              const isSelected = selectedContact.id === contact.id;

              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full text-left p-3 rounded-xl transition flex items-start gap-3 cursor-pointer ${
                    isSelected ? "bg-emerald-50 border border-emerald-200" : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                      {contact.name[0]}
                    </div>
                    {contact.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <p className="font-bold text-gray-900 text-xs truncate">{contact.name}</p>
                      <span className="text-[10px] text-gray-400 shrink-0">{contact.time}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium truncate mb-1">{contact.role}</p>
                    <p className="text-[11px] text-gray-600 truncate">{contact.lastMsg}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Pane (2 cols) */}
        <div className="md:col-span-2 flex flex-col justify-between h-full bg-slate-50/50">
          {/* Chat Header */}
          <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                {selectedContact.name[0]}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{selectedContact.name}</h3>
                <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <ShieldCheck size={13} /> {selectedContact.role}
                </p>
              </div>
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 p-5 overflow-y-auto space-y-3">
            {activeMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "me" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.sender === "me"
                      ? "bg-emerald-700 text-white rounded-br-none"
                      : "bg-white border border-slate-200 text-gray-800 rounded-bl-none shadow-xs"
                  }`}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1 flex items-center gap-1">
                  {msg.time} {msg.sender === "me" && <CheckCheck size={12} className="text-emerald-600" />}
                </span>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={`Message ${selectedContact.name}...`}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
              />
              <button
                onClick={handleSend}
                className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Send size={15} /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
