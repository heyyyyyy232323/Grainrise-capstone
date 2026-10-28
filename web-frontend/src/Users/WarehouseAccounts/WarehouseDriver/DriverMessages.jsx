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
  X,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import ProfanityWarningModal from "../../../Components/Modals/ProfanityWarningModal";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:8000"
    : "")
).replace(/\/$/, "");

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

const buildSocketUrl = (token) => {
  const explicit = import.meta.env.VITE_WS_URL;
  let base = "";

  if (explicit) {
    base = String(explicit).replace(/\/$/, "");
  } else if (API_BASE) {
    base = String(API_BASE).replace(/\/$/, "").replace(/^http/i, "ws");
  } else if (typeof window !== "undefined") {
    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    base = `${scheme}://${window.location.host}`;
  }
  return `${base}/ws/messages/?token=${encodeURIComponent(token)}`;
};

export default function DriverMessages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const paramRecipient = searchParams.get("conversation") || searchParams.get("recipient");
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
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const [profanityModal, setProfanityModal] = useState({
    isOpen: false,
    message: "",
    detectedWords: [],
  });

  const messagesEndRef = useRef(null);
  const activeConvoKeyRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);
  const idleTypingTimerRef = useRef(null);
  const lastTypingSentAtRef = useRef(0);
  const selectedConvoRef = useRef(selectedConversation);
  selectedConvoRef.current = selectedConversation;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setShowAllBatches(false);
    setIsPartnerTyping(false);
  }, [selectedConversation]);

  // ── 1. Fetch Conversations List ──────────────────────────────────────────
  const fetchConversations = useCallback(
    async (selectTargetId = null) => {
      setIsLoadingConversations(true);
      setErrorMessage("");
      try {
        const token = getAuthToken();
        const res = await fetch(`${API_BASE}/api/warehouse-employees/driver/messages/conversations/`, {
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
        setErrorMessage("");

        // Determine selected conversation without reference flips
        if (list.length > 0) {
          let matched = null;
          const targetId = selectTargetId || paramRecipient;

          if (targetId) {
            matched = list.find((c) => String(c.recipient_id) === String(targetId));
          }

          setSelectedConversation((prev) => {
            if (prev) {
              const updated = list.find(
                (c) => String(c.recipient_id) === String(prev.recipient_id)
              );
              if (updated) {
                if (
                  prev.has_active_assignment === updated.has_active_assignment &&
                  prev.unread === updated.unread &&
                  prev.lastMsg === updated.lastMsg &&
                  prev.lastMsgTime === updated.lastMsgTime &&
                  prev.name === updated.name
                ) {
                  return prev;
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
    },
    [paramRecipient]
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ── 2. Fetch Active Thread Messages ──────────────────────────────────────
  const fetchThread = useCallback(
    async (isPolling = false) => {
      if (!selectedConversation) {
        setThreadMessages([]);
        activeConvoKeyRef.current = null;
        return;
      }

      const currentKey = `Retailer_${selectedConversation.recipient_id}`;
      const isNewContact = activeConvoKeyRef.current !== currentKey;

      if (isNewContact) {
        activeConvoKeyRef.current = currentKey;
        setIsLoadingThread(true);
        setThreadMessages([]);
      }

      try {
        const token = getAuthToken();
        const params = new URLSearchParams({
          recipient_id: selectedConversation.recipient_id,
          recipient_type: "Retailer",
        });

        const res = await fetch(`${API_BASE}/api/warehouse-employees/driver/messages/thread/?${params.toString()}`, {
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
    },
    [selectedConversation]
  );

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  useEffect(() => {
    scrollToBottom();
  }, [threadMessages]);

  // ── 3. WebSocket Realtime & Render Fallback Polling ───────────────────────
  // A. WebSocket connection for instant events
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    let ws = null;
    let reconnectTimeout = null;
    let isCancelled = false;

    const connectWebSocket = () => {
      try {
        const wsUrl = buildSocketUrl(token);
        ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          // Connected successfully
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const activeConvo = selectedConvoRef.current;

            // Handle incoming new message
            if (data.type === "message.created" || data.type === "realtime.event") {
              const payload = data.payload || data;
              const msg = payload.message;
              if (!msg) return;

              // Check if message belongs to active thread
              if (
                activeConvo &&
                (payload.thread_id === `user_${activeConvo.recipient_id}` ||
                  payload.thread_id === `Retailer_${activeConvo.recipient_id}` ||
                  String(msg.sender_user_id) === String(activeConvo.recipient_id))
              ) {
                const formatted = {
                  id: msg.message_id || Date.now(),
                  sender: msg.is_mine ? "me" : "them",
                  text: msg.message_content || msg.message_text || "",
                  time: msg.created_at
                    ? new Date(msg.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                    : new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
                  timestamp: msg.created_at || new Date().toISOString(),
                  seen: Boolean(msg.is_seen || msg.seen_at),
                  status: "sent",
                };

                setThreadMessages((prev) => {
                  if (prev.some((m) => String(m.id) === String(formatted.id))) {
                    return prev;
                  }
                  return [...prev, formatted];
                });

                // Clear typing indicator since message arrived
                if (!msg.is_mine) {
                  setIsPartnerTyping(false);
                }
              }

              // Update conversation list preview
              setConversations((prev) =>
                prev.map((c) => {
                  const targetMatch =
                    payload.thread_id === `user_${c.recipient_id}` ||
                    payload.thread_id === `Retailer_${c.recipient_id}` ||
                    String(msg.sender_user_id) === String(c.recipient_id);

                  if (targetMatch) {
                    return {
                      ...c,
                      lastMsg: msg.message_content || msg.message_text || c.lastMsg,
                      lastMsgTime: msg.created_at || new Date().toISOString(),
                      unread:
                        activeConvo && activeConvo.recipient_id === c.recipient_id
                          ? 0
                          : (c.unread || 0) + (msg.is_mine ? 0 : 1),
                    };
                  }
                  return c;
                })
              );
            }

            // Handle messages seen event
            if (data.type === "messages.seen" || (data.payload && data.payload.type === "messages.seen")) {
              const payload = data.payload || data;
              const seenIds = new Set(payload.message_ids || []);
              if (seenIds.size > 0) {
                setThreadMessages((prev) =>
                  prev.map((m) => (seenIds.has(m.id) ? { ...m, seen: true } : m))
                );
              }
            }

            // Handle typing indicator event
            if (data.type === "typing") {
              const activeConvo = selectedConvoRef.current;
              if (
                activeConvo &&
                (data.thread_id === `user_${activeConvo.recipient_id}` ||
                  data.sender_user_id === activeConvo.recipient_id ||
                  data.sender_type === "retailer")
              ) {
                setIsPartnerTyping(Boolean(data.is_typing));
                if (data.is_typing) {
                  if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                  typingTimerRef.current = setTimeout(() => {
                    setIsPartnerTyping(false);
                  }, 4000);
                }
              }
            }
          } catch {
            // Ignore non-json frames
          }
        };

        ws.onclose = () => {
          if (!isCancelled) {
            reconnectTimeout = setTimeout(connectWebSocket, 4000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (!isCancelled) {
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        }
      }
    };

    connectWebSocket();

    return () => {
      isCancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  // B. Fallback polling for Render / disconnected intervals (every 5 seconds)
  useEffect(() => {
    if (!selectedConversation) return;

    const interval = setInterval(async () => {
      fetchThread(true);

      // Check partner typing status fallback
      try {
        const token = getAuthToken();
        const res = await fetch(
          `${API_BASE}/api/warehouse-employees/driver/messages/typing/?recipient_id=${selectedConversation.recipient_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (data && data.success) {
          setIsPartnerTyping(Boolean(data.is_typing));
        }
      } catch {
        // Silent fallback failure
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchThread, selectedConversation]);

  // ── 4. Typing Emit Handling ──────────────────────────────────────────────
  const emitDriverTyping = (isTyping) => {
    if (!selectedConversation) return;

    // WebSocket emit if open
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "typing",
          thread_id: `user_${selectedConversation.recipient_id}`,
          is_typing: isTyping,
          sender_type: "driver",
        })
      );
    }

    // REST fallback emit
    try {
      const token = getAuthToken();
      fetch(`${API_BASE}/api/warehouse-employees/driver/messages/typing/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: selectedConversation.recipient_id,
          is_typing: isTyping,
          sender_type: "driver",
        }),
      }).catch(() => {});
    } catch {
      // Non-blocking
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);

    if (!selectedConversation || !hasActiveAssignment) return;

    if (!val.trim()) {
      if (idleTypingTimerRef.current) clearTimeout(idleTypingTimerRef.current);
      emitDriverTyping(false);
      lastTypingSentAtRef.current = 0;
      return;
    }

    const now = Date.now();
    if (now - lastTypingSentAtRef.current > 2000) {
      emitDriverTyping(true);
      lastTypingSentAtRef.current = now;
    }

    if (idleTypingTimerRef.current) clearTimeout(idleTypingTimerRef.current);
    idleTypingTimerRef.current = setTimeout(() => {
      emitDriverTyping(false);
      lastTypingSentAtRef.current = 0;
    }, 2500);
  };

  // ── 5. Send Message ──────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedConversation || isSending) return;

    if (!hasActiveAssignment) {
      alert("Cannot send message: You do not have an active delivery assignment for this retailer.");
      return;
    }

    // Instantly clear prompt & stop typing
    setInput("");
    if (idleTypingTimerRef.current) clearTimeout(idleTypingTimerRef.current);
    emitDriverTyping(false);
    lastTypingSentAtRef.current = 0;

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
      const res = await fetch(`${API_BASE}/api/warehouse-employees/driver/messages/send/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: selectedConversation.recipient_id,
          recipient_type: "Retailer",
          message_content: text,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.code === "PROFANITY_DETECTED" || data.blocked) {
          setThreadMessages((prev) => prev.filter((m) => m.id !== tempId));
          setInput(text);
          setProfanityModal({
            isOpen: true,
            message:
              data.message ||
              "Your message contains a prohibited word. Please remove it before submitting.",
            detectedWords: data.detected_words || data.matches || [],
          });
          return;
        }
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

      fetchConversations(selectedConversation.recipient_id);
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
    const groupKey = `Retailer_${selectedConversation.recipient_id}`;
    navigate(`/warehouse-driver/live-tracking?group=${encodeURIComponent(groupKey)}`);
  };

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Communication" }, { label: "Messages" }]} />
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-slate-500 mt-1">
          Communicate with assigned retailers regarding your warehouse deliveries.
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
            ) : errorMessage ? (
              <div className="p-8 text-center space-y-2">
                <AlertCircle className="text-rose-500 mx-auto" size={24} />
                <p className="text-xs font-bold text-gray-800">Failed to load conversations</p>
                <p className="text-[11px] text-gray-500">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => fetchConversations()}
                  className="px-3 py-1.5 rounded-lg bg-[#0B5D1E] text-white text-xs font-bold hover:bg-emerald-800 transition cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-1">
                <p className="text-xs font-bold text-gray-700">No conversations found</p>
                <p className="text-[11px] text-gray-400">
                  {search ? "No matching contacts found." : "No assigned retailers with deliveries."}
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive =
                  selectedConversation &&
                  String(selectedConversation.recipient_id) === String(c.recipient_id);

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
                        {c.avatar}
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
                Select an assigned retailer from the list to view your delivery conversation history.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#0B5D1E] flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200">
                    {selectedConversation.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-sm truncate">{selectedConversation.name}</h3>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded shrink-0">
                        {selectedConversation.role}
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
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 shrink-0">
                          <MapPin size={12} className="text-amber-500 shrink-0" />
                          Delivering Batch:
                        </span>
                        {activeBatchNumbers.slice(0, 2).map((batchNo) => (
                          <span
                            key={batchNo}
                            className="text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200/90 px-2 py-0.5 rounded-md shadow-2xs tracking-tight"
                          >
                            {batchNo}
                          </span>
                        ))}
                        {activeBatchNumbers.length > 2 && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowAllBatches((prev) => !prev)}
                              className="text-[11px] font-semibold bg-amber-100 hover:bg-amber-200/80 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 shadow-2xs tracking-tight"
                              title="Click to view all assigned batches"
                            >
                              <span>+{activeBatchNumbers.length - 2} more</span>
                              <ChevronDown
                                size={11}
                                className={`transition-transform duration-150 ${showAllBatches ? "rotate-180" : ""}`}
                              />
                            </button>

                            {showAllBatches && (
                              <>
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setShowAllBatches(false)}
                                />
                                <div className="absolute left-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-3 w-64 animate-in fade-in zoom-in-95 duration-150">
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                                    <span className="text-xs font-bold text-slate-800">
                                      All Assigned Batches ({activeBatchNumbers.length})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setShowAllBatches(false)}
                                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                    {activeBatchNumbers.map((batchNo, idx) => (
                                      <div
                                        key={batchNo}
                                        className="flex items-center justify-between text-xs font-medium bg-amber-50/70 border border-amber-200/60 px-2.5 py-1 rounded-md text-amber-950 tracking-tight"
                                      >
                                        <span className="font-semibold text-slate-800">{batchNo}</span>
                                        <span className="text-[10px] text-amber-700 font-medium">#{idx + 1}</span>
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
                    <b>Delivery Completed:</b> Messaging is closed for this retailer because there is no ongoing delivery trip.
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
                    <p className="text-xs font-semibold">No messages yet with this retailer.</p>
                    {hasActiveAssignment && (
                      <p className="text-[11px] text-gray-400">
                        Send a message below to update the retailer regarding their delivery.
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

              {/* Typing Indicator */}
              {isPartnerTyping && (
                <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-5 py-2 text-xs text-slate-500 animate-in fade-in duration-200">
                  <span className="inline-flex items-center gap-1" aria-hidden="true">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-600" />
                  </span>
                  <span className="truncate font-medium text-slate-600">
                    {selectedConversation.name || "Retailer"} is typing...
                  </span>
                </div>
              )}

              {/* Input Bar */}
              <div className="p-3.5 bg-white border-t border-slate-200">
                {hasActiveAssignment ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                      placeholder="Type a message to retailer regarding delivery..."
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
                    <span>Sending is locked. You can only message retailers with active delivery assignments.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ProfanityWarningModal
        isOpen={profanityModal.isOpen}
        onClose={() => setProfanityModal({ isOpen: false, message: "", detectedWords: [] })}
        message={profanityModal.message}
        detectedWords={profanityModal.detectedWords}
        type="message"
      />
    </div>
  );
}
