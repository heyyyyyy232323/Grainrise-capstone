import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCheck,
  ChevronDown,
  Loader2,
  Lock,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Send,
  Store,
  Warehouse,
  X,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";

const API_BASE = "http://127.0.0.1:8000";

const getAuthToken = () => {
  return (
    localStorage.getItem("grainrise_token") ||
    sessionStorage.getItem("grainrise_token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
};

export default function MillerDriverMessages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const paramRecipient = searchParams.get("recipient");
  const paramType = searchParams.get("type");

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [hasActiveAssignment, setHasActiveAssignment] = useState(false);
  const [activeBatchNumbers, setActiveBatchNumbers] = useState([]);
  const [showAllBatches, setShowAllBatches] = useState(false);

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const messagesEndRef = useRef(null);
  const activeConvoKeyRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setShowAllBatches(false);
  }, [selectedConversation]);

  // ── 1. Fetch Conversations List ──────────────────────────────────────────
  const fetchConversations = useCallback(async (selectTargetId = null, selectTargetType = null) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/miller-employees/driver/messages/conversations/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load conversations.");
      }

      const list = data.conversations || [];
      setConversations(list);

      // Determine selected conversation without causing unnecessary object reference flips
      if (list.length > 0) {
        let matched = null;
        const targetId = selectTargetId || paramRecipient;
        const targetType = selectTargetType || paramType;

        if (targetId) {
          matched = list.find(
            (c) =>
              String(c.recipient_id) === String(targetId) &&
              (!targetType || c.recipient_type.toLowerCase() === targetType.toLowerCase())
          );
        }

        setSelectedConversation((prev) => {
          if (prev) {
            const updated = list.find(
              (c) =>
                String(c.recipient_id) === String(prev.recipient_id) &&
                c.recipient_type.toLowerCase() === prev.recipient_type.toLowerCase()
            );
            if (updated) {
              if (
                prev.has_active_assignment === updated.has_active_assignment &&
                prev.unread === updated.unread &&
                prev.lastMsg === updated.lastMsg &&
                prev.lastMsgTime === updated.lastMsgTime &&
                prev.name === updated.name
              ) {
                return prev; // Retain exact same reference so useEffect doesn't trigger
              }
              return { ...prev, ...updated };
            }
          }
          return matched || list[0];
        });
      } else {
        setSelectedConversation(null);
        activeConvoKeyRef.current = null;
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to load messages.");
    } finally {
      setIsLoadingConversations(false);
    }
  }, [paramRecipient, paramType]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ── 2. Fetch Active Thread Messages ──────────────────────────────────────
  const fetchThread = useCallback(async (isPolling = false) => {
    if (!selectedConversation) {
      setThreadMessages([]);
      activeConvoKeyRef.current = null;
      return;
    }

    const currentKey = `${selectedConversation.recipient_type}_${selectedConversation.recipient_id}`;
    const isNewContact = activeConvoKeyRef.current !== currentKey;

    // ONLY show loading screen if switching to an entirely different conversation.
    // Background polling, refreshing, or sending must update silently without disappearing!
    if (isNewContact) {
      activeConvoKeyRef.current = currentKey;
      setIsLoadingThread(true);
      setThreadMessages([]);
    }

    try {
      const token = getAuthToken();
      const params = new URLSearchParams({
        recipient_id: selectedConversation.recipient_id,
        recipient_type: selectedConversation.recipient_type,
      });

      const res = await fetch(`${API_BASE}/api/miller-employees/driver/messages/thread/?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load thread.");
      }

      const thread = data.thread || {};
      const serverMessages = thread.messages || [];

      // Preserve local optimistic messages that are currently in 'sending' state
      setThreadMessages((prev) => {
        const sendingLocals = prev.filter((m) => m.status === "sending");
        if (sendingLocals.length === 0) {
          return serverMessages;
        }
        const existingKeys = new Set(serverMessages.map((m) => `${m.text}_${m.sender}`));
        const unresolved = sendingLocals.filter((m) => !existingKeys.has(`${m.text}_${m.sender}`));
        return [...serverMessages, ...unresolved];
      });

      setHasActiveAssignment(Boolean(thread.has_active_assignment));
      setActiveBatchNumbers(thread.active_batch_numbers || []);
    } catch (err) {
      if (!isPolling && isNewContact) setErrorMessage(err.message || "Failed to load message thread.");
    } finally {
      if (isNewContact) setIsLoadingThread(false);
    }
  }, [selectedConversation]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  useEffect(() => {
    scrollToBottom();
  }, [threadMessages]);

  // Polling for incoming messages every 6 seconds
  useEffect(() => {
    if (!selectedConversation) return;
    const interval = setInterval(() => {
      fetchThread(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchThread, selectedConversation]);

  // ── 3. Send Message ──────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedConversation || isSending) return;

    if (!hasActiveAssignment) {
      alert("Cannot send message: You do not have an active delivery assignment for this buyer.");
      return;
    }

    // Instantly clear the prompt so the driver does not wait
    setInput("");

    // Optimistic message in the chat pane with circular loading spinner beside time
    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    const optimisticMsg = {
      id: tempId,
      sender: "me",
      text: text,
      time: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      timestamp: now.toISOString(),
      status: "sending",
      seen: false,
    };

    setThreadMessages((prev) => [...prev, optimisticMsg]);
    setIsSending(true);

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/miller-employees/driver/messages/send/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: selectedConversation.recipient_id,
          recipient_type: selectedConversation.recipient_type,
          message_content: text,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send message.");
      }

      const serverMsg = data.data || {};
      setThreadMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...serverMsg,
                id: serverMsg.id || m.id,
                status: "sent",
                sender: "me",
              }
            : m
        )
      );

      fetchConversations(selectedConversation.recipient_id, selectedConversation.recipient_type);
    } catch (err) {
      setThreadMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "error" } : m))
      );
      alert(err.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        (c.batch && c.batch.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  const handleOpenLiveTracking = () => {
    if (!selectedConversation) return;
    const groupKey = `${selectedConversation.recipient_type}_${selectedConversation.recipient_id}`;
    navigate(`/miller-driver/live-tracking?group=${encodeURIComponent(groupKey)}`);
  };

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Communication" }, { label: "Messages" }]} />
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-slate-500 mt-1">
          Communicate with assigned retailers and warehouses regarding your miller deliveries.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[620px]">
        {/* ── Left: Contact List ────────────────────────────────────────── */}
        <div className="border-r border-slate-200 flex flex-col bg-white">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchConversations()}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 transition cursor-pointer"
              title="Refresh conversations"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
            {isLoadingConversations ? (
              <div className="p-8 text-center space-y-2">
                <Loader2 className="animate-spin text-[#0B5D1E] mx-auto" size={24} />
                <p className="text-xs text-gray-500 font-semibold">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-1">
                <p className="text-xs font-bold text-gray-700">No conversations found</p>
                <p className="text-[11px] text-gray-400">
                  {search ? "No matching contacts found." : "No assigned buyers with deliveries."}
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive =
                  selectedConversation &&
                  selectedConversation.recipient_id === c.recipient_id &&
                  selectedConversation.recipient_type === c.recipient_type;

                const isWh = c.recipient_type === "Warehouse";

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedConversation(c)}
                    className={`w-full text-left px-3.5 py-3 flex items-start gap-3 transition cursor-pointer ${
                      isActive ? "bg-emerald-50/80 border-l-4 border-l-[#0B5D1E]" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-100/70 text-[#0B5D1E] flex items-center justify-center font-extrabold text-sm border border-emerald-200/50">
                        {isWh ? <Warehouse size={18} /> : c.avatar}
                      </div>
                      {c.has_active_assignment && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-500 border-2 border-white rounded-full shadow-xs"
                          title="On Delivery Trip"
                        />
                      )}
                      {c.unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-1">
                        <p className="font-bold text-gray-900 text-xs truncate">{c.name}</p>
                        {c.lastMsgTime && (
                          <span className="text-[9px] text-gray-400 shrink-0">
                            {new Date(c.lastMsgTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                          {c.role}
                        </span>
                        {c.has_active_assignment ? (
                          <span className="text-[9px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300/80 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            On Delivery
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded shadow-2xs">
                            Delivered
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-1">{c.lastMsg}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: Chat Pane ──────────────────────────────────────────── */}
        <div className="md:col-span-2 flex flex-col bg-slate-50/40">
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
              <Store size={36} className="text-gray-300 mx-auto" />
              <h3 className="text-sm font-bold text-gray-700">No conversation selected</h3>
              <p className="text-xs text-gray-400 max-w-xs">
                Select an assigned buyer from the list to view your delivery conversation history.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#0B5D1E] flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200">
                    {selectedConversation.recipient_type === "Warehouse" ? (
                      <Warehouse size={18} />
                    ) : (
                      selectedConversation.avatar
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-sm truncate">{selectedConversation.name}</h3>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded shrink-0">
                        {selectedConversation.recipient_type}
                      </span>
                      {hasActiveAssignment ? (
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                          On Delivery
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                          Delivered
                        </span>
                      )}
                    </div>
                    {activeBatchNumbers.length > 0 ? (
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[11px] font-semibold text-amber-900 flex items-center gap-1 shrink-0">
                          <MapPin size={11} className="text-amber-600 shrink-0" />
                          Delivering Batch:
                        </span>
                        {activeBatchNumbers.slice(0, 2).map((batchNo) => (
                          <span
                            key={batchNo}
                            className="text-[10px] font-mono font-bold bg-amber-50/90 text-amber-900 border border-amber-300/80 px-1.5 py-0.5 rounded shadow-2xs"
                          >
                            {batchNo}
                          </span>
                        ))}
                        {activeBatchNumbers.length > 2 && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowAllBatches((prev) => !prev)}
                              className="text-[10px] font-bold bg-amber-100/70 hover:bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded transition cursor-pointer flex items-center gap-0.5 shadow-2xs"
                              title="Click to view all assigned batches"
                            >
                              <span>+{activeBatchNumbers.length - 2} more</span>
                              <ChevronDown
                                size={10}
                                className={`transition-transform duration-150 ${showAllBatches ? "rotate-180" : ""}`}
                              />
                            </button>

                            {showAllBatches && (
                              <>
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setShowAllBatches(false)}
                                />
                                <div className="absolute left-0 top-full mt-1.5 z-30 bg-white border border-amber-200 rounded-xl shadow-lg p-2.5 w-64 animate-in fade-in zoom-in-95 duration-150">
                                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-100 mb-1.5">
                                    <span className="text-[11px] font-bold text-amber-950">
                                      All Assigned Batches ({activeBatchNumbers.length})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setShowAllBatches(false)}
                                      className="text-amber-700 hover:text-amber-900 p-0.5 rounded cursor-pointer"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                    {activeBatchNumbers.map((batchNo, idx) => (
                                      <div
                                        key={batchNo}
                                        className="flex items-center justify-between text-[11px] font-mono bg-amber-50/60 border border-amber-200/80 px-2 py-1 rounded text-amber-900"
                                      >
                                        <span className="font-semibold">{batchNo}</span>
                                        <span className="text-[9px] text-amber-600 font-sans font-semibold">#{idx + 1}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate mt-0.5">
                        <MapPin size={11} className="shrink-0" />
                        {selectedConversation.address || "Designated Delivery Destination"}
                      </p>
                    )}
                  </div>
                </div>

                {hasActiveAssignment && (
                  <button
                    type="button"
                    onClick={handleOpenLiveTracking}
                    className="shrink-0 rounded-lg bg-[#0B5D1E] hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Navigation size={13} />
                    Live Tracking
                  </button>
                )}
              </div>

              {/* Inactive Assignment Notice Banner */}
              {!hasActiveAssignment && (
                <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-amber-900 text-xs">
                  <Lock size={14} className="text-amber-600 shrink-0" />
                  <span>
                    <b>Delivery Completed:</b> Messaging is closed for this buyer because there is no ongoing delivery trip.
                  </span>
                </div>
              )}

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[420px] max-h-[520px]">
                {isLoadingThread && threadMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-48 space-x-2 text-gray-400">
                    <Loader2 size={20} className="animate-spin text-[#0B5D1E]" />
                    <span className="text-xs">Loading conversation history...</span>
                  </div>
                ) : threadMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 text-gray-400">
                    <AlertCircle size={28} className="text-gray-300" />
                    <p className="text-xs font-semibold">No messages yet with this buyer.</p>
                    {hasActiveAssignment && (
                      <p className="text-[11px] text-gray-400">
                        Send a message below to update the buyer regarding their delivery.
                      </p>
                    )}
                  </div>
                ) : (
                  threadMessages.map((msg) => {
                    const isMe = msg.sender === "me";
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                            isMe
                              ? "bg-[#0B5D1E] text-white rounded-br-xs shadow-xs"
                              : "bg-white border border-slate-200 text-gray-800 rounded-bl-xs shadow-2xs"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 px-1 flex items-center gap-1">
                          {msg.time}
                          {isMe && (
                            msg.status === "sending" ? (
                              <Loader2 size={11} className="animate-spin text-gray-400 shrink-0" title="Sending..." />
                            ) : msg.status === "error" ? (
                              <AlertCircle size={11} className="text-red-500 shrink-0" title="Failed to send" />
                            ) : (
                              <CheckCheck size={11} className={msg.seen ? "text-blue-500" : "text-gray-400"} />
                            )
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="p-3.5 bg-white border-t border-slate-200">
                {hasActiveAssignment ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                      placeholder="Type a message to buyer regarding delivery..."
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none bg-white placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="bg-[#0B5D1E] hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl px-5 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:cursor-not-allowed"
                    >
                      <Send size={14} />
                      <span>Send</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <Lock size={13} className="text-gray-400" />
                    <span>Sending is locked. You can only message buyers with active delivery assignments.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

