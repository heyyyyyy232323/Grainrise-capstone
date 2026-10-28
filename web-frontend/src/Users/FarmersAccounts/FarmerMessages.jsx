import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import {
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  UserRound,
  CornerUpLeft,
  X,
  CheckCheck,
} from "lucide-react";
import useFarmerMessages from "../../Components/hooks/Farmer/useFarmerMessages";
import { ArticleMessageContent } from "../../Components/Minor-Components/ArticleAttachmentCard";
import ProfanityWarningModal from "../../Components/Modals/ProfanityWarningModal";

// ============================================================
// HELPERS
// ============================================================

function getInitials(name) {
  const words = String(name || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "U";
  }

  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase();
  }

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function formatTimestamp(value) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  const today = new Date();
  const sameDay =
    parsed.getFullYear() === today.getFullYear() &&
    parsed.getMonth() === today.getMonth() &&
    parsed.getDate() === today.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    }).format(parsed);
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatFullTimestamp(value) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

// ============================================================
// THREAD ITEM COMPONENT
// ============================================================

function ThreadItem({ thread, selected, onSelect }) {
  const unread = Number(thread.unread_count || 0);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left transition cursor-pointer ${
        selected ? "bg-emerald-50/70" : "bg-white hover:bg-slate-50"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          selected ? "bg-[#0B5D1E] text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {getInitials(thread.name)}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">
            {thread.name}
          </p>
          <span className="shrink-0 text-[11px] text-slate-400">
            {formatTimestamp(thread.latest_message_at)}
          </span>
        </div>

        <p className="mt-0.5 truncate text-xs text-slate-500">
          {thread.subtitle || thread.role || "Miller Partner"}
        </p>

        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-slate-500">
            {thread.is_sender_me ? (
              <span className="font-medium text-slate-600">You: </span>
            ) : null}
            {thread.latest_message || "No messages yet"}
          </p>

          {unread > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0B5D1E] px-1.5 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================
// MAIN FARMER MESSAGES COMPONENT
// ============================================================

export default function FarmerMessages() {
  const {
    threads,
    activeThread,
    messages,

    isThreadsLoading,
    isMessagesLoading,
    isSending,

    threadsError,
    messagesError,
    sendError,

    loadThreads,
    selectThread,
    sendMessage,
    refreshActiveThread,
    clearSendError,
    isPartnerTyping,
    emitTyping,
    stopTyping,
  } = useFarmerMessages();

  const [search, setSearch] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);

  const [profanityModal, setProfanityModal] = useState({
    isOpen: false,
    message: "",
    detectedWords: [],
  });

  const threadEndRef = useRef(null);
  const textareaRef = useRef(null);
  const openedTargetRef = useRef("");
  const location = useLocation();

  const didMountRef = useRef(false);

  // Load Threads on mount immediately & search changes debounced
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      loadThreads("").catch(() => {});
      return;
    }

    const timer = window.setTimeout(() => {
      loadThreads(search).catch(() => {});
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search, loadThreads]);

  // Auto-select first thread if none active and not navigated with state
  useEffect(() => {
    if (!activeThread && threads.length > 0 && !location.state) {
      selectThread(threads[0], true).catch(() => {});
    }
  }, [activeThread, threads, location.state, selectThread]);

  // Handle Initial Conversation Target or Navigation State
  useEffect(() => {
    const targetState = location.state;
    if (!targetState) return;

    const pType =
      targetState.participant_type ||
      targetState.participantType ||
      (targetState.supplierId ? "supplier" : "");
    const pId = targetState.participant_id || targetState.supplierId;
    const pName = targetState.name || targetState.millerName || "Miller Partner";
    const pRole = targetState.role || "Miller / Supplier";

    if (!pType || !pId) return;

    const targetKey = targetState.thread_id || `${pType}_${pId}`;

    if (!targetKey || openedTargetRef.current === targetKey) {
      return;
    }

    openedTargetRef.current = targetKey;
    clearSendError();
    setInputMessage("");
    setReplyingTo(null);

    selectThread({
      thread_id: targetKey,
      participant_type: pType,
      participant_id: pId,
      name: pName,
      role: pRole,
      subtitle: targetState.subtitle || pRole,
    }).catch(() => {});
  }, [location.state, selectThread, clearSendError]);

  // Auto Scroll to Latest Message
  useEffect(() => {
    if (!activeThread) {
      return;
    }

    const timer = window.setTimeout(() => {
      threadEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [activeThread, messages]);

  // Select Thread
  const handleSelectThread = async (thread) => {
    stopTyping();
    clearSendError();
    setInputMessage("");
    setReplyingTo(null);

    try {
      await selectThread(thread);
    } catch {
      // Handled by hook
    }
  };

  // Send Message
  const handleSend = async (e) => {
    if (e) e.preventDefault();

    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    // Immediately clear input & reply target for instant UX response
    const messageToSend = trimmed;
    const repliedTarget = replyingTo;
    setInputMessage("");
    setReplyingTo(null);
    textareaRef.current?.focus();

    try {
      await sendMessage(messageToSend, repliedTarget);
    } catch (err) {
      const errData = err?.data || {};
      if (
        errData.code === "PROFANITY_DETECTED" ||
        errData.blocked ||
        err?.code === "PROFANITY_DETECTED" ||
        err?.blocked
      ) {
        // Restore input and reply target on profanity block so user can edit
        setInputMessage(messageToSend);
        if (repliedTarget) setReplyingTo(repliedTarget);

        setProfanityModal({
          isOpen: true,
          message:
            errData.message ||
            err.message ||
            "Your message contains a prohibited word. Please remove it before submitting.",
          detectedWords:
            errData.detected_words ||
            err.detected_words ||
            errData.matches ||
            err.matches ||
            [],
        });
        return;
      }
    }
  };

  const handleMessageKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const activeKey = activeThread?.thread_id || "";

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Title ────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Business" }, { label: "Messages" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Messages
        </h2>
        <p className="text-sm text-slate-500">
          View and manage your conversations with Miller partners and grain buyers in one place.
        </p>
      </div>

      {/* ── Messages Container ─────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex min-h-[680px] flex-col lg:h-[680px] lg:flex-row">
          {/* ==================================================
              LEFT - CONVERSATION LIST
          ================================================== */}
          <aside className="flex max-h-[330px] w-full flex-col border-b border-slate-200 bg-white lg:max-h-none lg:w-[360px] lg:shrink-0 lg:border-b-0 lg:border-r">
            {/* Search Bar */}
            <div className="border-b border-slate-200 p-4">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Miller or conversation..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0B5D1E] focus:bg-white focus:ring-1 focus:ring-[#0B5D1E]"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {isThreadsLoading && threads.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
                  <Loader2 size={22} className="animate-spin text-[#0B5D1E]" />
                  <p className="mt-3 text-xs text-slate-500">Loading conversations...</p>
                </div>
              ) : threadsError ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-red-600">{threadsError}</p>
                </div>
              ) : threads.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <MessageCircle size={20} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    No conversations found
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Conversations with registered Millers and buyers will appear here once initiated.
                  </p>
                </div>
              ) : (
                threads.map((thread) => (
                  <ThreadItem
                    key={thread.thread_id}
                    thread={thread}
                    selected={thread.thread_id === activeKey}
                    onSelect={() => handleSelectThread(thread)}
                  />
                ))
              )}
            </div>
          </aside>

          {/* ==================================================
              RIGHT - CHAT
          ================================================== */}
          <main className="flex min-h-[500px] min-w-0 flex-1 flex-col bg-slate-50/50">
            {!activeThread ? (
              /* Empty State */
              <div className="flex flex-1 items-center justify-center p-8">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#0B5D1E]">
                    <MessageCircle size={25} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-800">
                    Select a conversation
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Choose a contact from the left to view messages and discuss contracts and deliveries.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B5D1E] text-xs font-bold text-white">
                      {getInitials(activeThread.name)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-slate-900">
                          {activeThread.name || "Miller Partner"}
                        </h3>
                        {activeThread.role && (
                          <span className="inline-block rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {activeThread.role}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {activeThread.subtitle || "Direct Message"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => refreshActiveThread().catch(() => {})}
                    disabled={isMessagesLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw
                      size={13}
                      className={isMessagesLoading ? "animate-spin" : ""}
                    />
                    Refresh
                  </button>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  {isMessagesLoading && messages.length === 0 ? (
                    <div className="flex h-full min-h-64 items-center justify-center">
                      <div className="text-center">
                        <Loader2 size={25} className="mx-auto animate-spin text-[#0B5D1E]" />
                        <p className="mt-3 text-xs text-slate-500">Loading conversation...</p>
                      </div>
                    </div>
                  ) : messagesError && messages.length === 0 ? (
                    <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
                      {messagesError}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full min-h-64 items-center justify-center">
                      <div className="max-w-sm text-center">
                        <UserRound size={29} className="mx-auto text-slate-300" />
                        <p className="mt-3 text-sm font-semibold text-slate-600">
                          Start the conversation
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Send a message to start chatting with {activeThread.name}.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => {
                        const mine =
                          message.is_mine === true ||
                          message.sender_type === "farmer" ||
                          message.sender_type === "me" ||
                          message.sender_name === "You";

                        return (
                          <div
                            key={message.message_id}
                            className={`group flex w-full ${mine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`flex max-w-[86%] items-end gap-2 sm:max-w-[72%] ${
                                mine ? "flex-row-reverse" : "flex-row"
                              }`}
                            >
                              {!mine && (
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
                                  {getInitials(activeThread.name)}
                                </div>
                              )}

                              <div className="relative">
                                <div
                                  className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                                    mine
                                      ? "rounded-br-md bg-[#0B5D1E] text-white"
                                      : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-2xs"
                                  }`}
                                >
                                  {/* Quoted Replied Message */}
                                  {message.replied_message && (
                                    <div
                                      className={`mb-2 rounded-lg px-2.5 py-1.5 text-xs border-l-2 ${
                                        mine
                                          ? "bg-emerald-800/40 border-white/70 text-white/90"
                                          : "bg-slate-50 border-emerald-600 text-slate-600"
                                      }`}
                                    >
                                      <p className="font-semibold text-[10px]">
                                        {message.replied_message.sender_name || "Reply"}
                                      </p>
                                      <p className="truncate text-[11px] italic">
                                        {message.replied_message.message_content}
                                      </p>
                                    </div>
                                  )}

                                  <ArticleMessageContent
                                    content={message.message_content || message.message_text}
                                    attachment={message.message_attachment}
                                    isMine={mine}
                                  />
                                </div>

                                <div
                                  className={`mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 ${
                                    mine ? "justify-end text-right" : "justify-start text-left"
                                  }`}
                                >
                                  <span title={formatFullTimestamp(message.created_at)}>
                                    {formatTimestamp(message.created_at)}
                                  </span>

                                  {mine && (
                                    message.is_sending ? (
                                      <span
                                        title="Sending..."
                                        className="inline-flex items-center gap-1 text-slate-400"
                                      >
                                        <Loader2 size={10} className="animate-spin text-emerald-600" />
                                        <span className="text-[10px] text-slate-400">Sending...</span>
                                      </span>
                                    ) : (
                                      <span
                                        title={message.is_seen ? `Seen at ${formatFullTimestamp(message.seen_at)}` : "Sent"}
                                        className="inline-flex items-center"
                                      >
                                        <CheckCheck
                                          size={13}
                                          className={message.is_seen ? "text-emerald-500" : "text-slate-300"}
                                        />
                                      </span>
                                    )
                                  )}

                                  {/* Quick Reply Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyingTo(message);
                                      textareaRef.current?.focus();
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                                    title="Reply to this message"
                                  >
                                    <CornerUpLeft size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <div ref={threadEndRef} />
                    </div>
                  )}
                </div>

                {/* Typing Indicator */}
                {isPartnerTyping && (
                  <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-5 py-1.5 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                    </span>
                    <span className="truncate">
                      {activeThread.name || "Participant"} is typing...
                    </span>
                  </div>
                )}

                {/* Send Error Banner */}
                {sendError && (
                  <div className="border-t border-red-100 bg-red-50 px-5 py-2.5 text-xs text-red-700">
                    {sendError}
                  </div>
                )}

                {/* Replying Banner */}
                {replyingTo && (
                  <div className="flex items-center justify-between border-t border-emerald-100 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <CornerUpLeft size={14} className="text-emerald-600 shrink-0" />
                      <span className="font-semibold shrink-0">
                        {replyingTo.sender_type === "farmer"
                          ? "Replying to yourself"
                          : `Replying to ${activeThread.name}`}:
                      </span>
                      <span className="truncate italic text-emerald-700">
                        {replyingTo.message_content || replyingTo.message_text}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-emerald-600 hover:text-emerald-900 rounded-md transition cursor-pointer"
                      title="Cancel reply"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Message Composer */}
                <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-4">
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <textarea
                        ref={textareaRef}
                        rows={2}
                        maxLength={5000}
                        value={inputMessage}
                        onChange={(e) => {
                          setInputMessage(e.target.value);
                          emitTyping(e.target.value);
                          clearSendError();
                        }}
                        onKeyDown={handleMessageKeyDown}
                        placeholder="Write a message to Miller partner..."
                        className="max-h-32 min-h-[48px] w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0B5D1E] focus:ring-1 focus:ring-[#0B5D1E]"
                      />

                      <div className="mt-1 flex justify-between gap-3 px-1">
                        <p className="text-[10px] text-slate-400">
                          Enter to send • Shift + Enter for a new line
                        </p>
                        <p
                          className={`text-[10px] ${
                            inputMessage.length > 4800 ? "text-red-500" : "text-slate-400"
                          }`}
                        >
                          {inputMessage.length}/5000
                        </p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!inputMessage.trim()}
                      className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0B5D1E] px-4 text-sm font-normal text-white transition hover:bg-[#094d19] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      <Send size={16} />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Profanity Warning Modal */}
      <ProfanityWarningModal
        isOpen={profanityModal.isOpen}
        onClose={() => {
          setProfanityModal({ isOpen: false, message: "", detectedWords: [] });
          textareaRef.current?.focus();
        }}
        message={profanityModal.message}
        detectedWords={profanityModal.detectedWords}
        type="message"
      />
    </div>
  );
}
