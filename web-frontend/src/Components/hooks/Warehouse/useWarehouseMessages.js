import { useCallback, useEffect, useRef, useState } from "react";
import useApi from "../useApi";

export default function useWarehouseMessages() {
  const { request } = useApi();

  const [threads, setThreads] = useState([]);
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeProfanity, setActiveProfanity] = useState([]);

  const [isThreadsLoading, setIsThreadsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [threadsError, setThreadsError] = useState("");
  const [messagesError, setMessagesError] = useState("");
  const [sendError, setSendError] = useState("");

  const activeThreadRef = useRef(activeThread);
  activeThreadRef.current = activeThread;

  // ── Load Active Profanity Terms for instant client-side validation ─────────
  const loadActiveProfanity = useCallback(async () => {
    try {
      const res = await request("/warehouse/messages/active-profanity/");
      if (res && res.success && Array.isArray(res.data)) {
        setActiveProfanity(res.data);
      }
    } catch {
      // Non-critical: server-side validation is always enforced on send
    }
  }, [request]);

  useEffect(() => {
    loadActiveProfanity();
  }, [loadActiveProfanity]);

  // Client-side case-insensitive word-boundary profanity detector
  const detectProfanity = useCallback(
    (text) => {
      if (!text || !activeProfanity.length) return [];
      const normalizedMsg = String(text).toLowerCase();
      const detected = [];

      for (const entry of activeProfanity) {
        const rawWord = entry.prohibited_text || "";
        const cleanWord = rawWord.trim().toLowerCase();
        if (!cleanWord) continue;

        // Escape regex special characters
        const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Match whole word or phrase boundaries
        const regex = new RegExp(`(^|\\b|\\W)${escaped}(\\b|\\W|$)`, "i");
        if (regex.test(normalizedMsg)) {
          detected.push(rawWord);
        }
      }

      return Array.from(new Set(detected));
    },
    [activeProfanity]
  );

  // ── Load Conversation Threads ──────────────────────────────────────────────
  const loadThreads = useCallback(
    async (searchTerm = "") => {
      setIsThreadsLoading(true);
      setThreadsError("");

      try {
        const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
        const res = await request(`/warehouse/messages/threads/${query}`);

        if (res && res.success) {
          const list = Array.isArray(res.data) ? res.data : [];
          setThreads(list);

          if (Array.isArray(res.branches)) {
            setBranches(res.branches);
            if (!activeBranchId && res.branches.length > 0) {
              setActiveBranchId(res.branches[0].warehouse_profile_id);
            }
          }

          // Update activeThread info if currently selected
          if (activeThreadRef.current) {
            const updatedActive = list.find(
              (t) => t.thread_id === activeThreadRef.current.thread_id
            );
            if (updatedActive) {
              setActiveThread((prev) => ({ ...prev, ...updatedActive }));
            }
          }
          return list;
        } else {
          const err = res?.message || "Failed to load conversations.";
          setThreadsError(err);
          return [];
        }
      } catch (err) {
        console.error("Failed to load message threads:", err);
        setThreadsError(err?.message || "Failed to load conversations.");
        return [];
      } finally {
        setIsThreadsLoading(false);
      }
    },
    [request, activeBranchId]
  );

  // ── Select a Conversation Thread ───────────────────────────────────────────
  const selectThread = useCallback(
    async (thread) => {
      if (!thread) return;

      setActiveThread(thread);
      setIsMessagesLoading(true);
      setMessagesError("");
      setSendError("");

      try {
        const res = await request(
          `/warehouse/messages/conversation/?thread_id=${encodeURIComponent(thread.thread_id)}`
        );

        if (res && res.success && res.data) {
          setMessages(Array.isArray(res.data.messages) ? res.data.messages : []);
          if (res.data.thread) {
            setActiveThread((prev) => ({
              ...(prev || {}),
              ...res.data.thread,
              unread_count: 0,
            }));
          }

          // Clear unread count in thread list locally
          setThreads((prevThreads) =>
            prevThreads.map((t) =>
              t.thread_id === thread.thread_id ? { ...t, unread_count: 0 } : t
            )
          );
        } else {
          setMessagesError(res?.message || "Failed to load messages.");
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
        setMessagesError(err?.message || "Failed to load messages.");
      } finally {
        setIsMessagesLoading(false);
      }
    },
    [request]
  );

  // ── Refresh Currently Active Thread ────────────────────────────────────────
  const refreshActiveThread = useCallback(async () => {
    if (!activeThreadRef.current) return;
    const thread = activeThreadRef.current;

    setIsMessagesLoading(true);
    setMessagesError("");

    try {
      const res = await request(
        `/warehouse/messages/conversation/?thread_id=${encodeURIComponent(thread.thread_id)}`
      );

      if (res && res.success && res.data) {
        setMessages(Array.isArray(res.data.messages) ? res.data.messages : []);
        if (res.data.thread) {
          setActiveThread((prev) => ({
            ...(prev || {}),
            ...res.data.thread,
            unread_count: 0,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to refresh conversation:", err);
    } finally {
      setIsMessagesLoading(false);
    }
  }, [request]);

  // ── Send a Message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content, repliedToMessageId = null) => {
      if (!activeThreadRef.current) {
        throw new Error("No conversation selected.");
      }

      const trimmed = String(content || "").trim();
      if (!trimmed) {
        throw new Error("Message content cannot be empty.");
      }

      // 1. Client-side profanity pre-check against active terms
      const localMatches = detectProfanity(trimmed);
      if (localMatches.length > 0) {
        const err = new Error(
          "Your message contains a prohibited word. Please remove it before submitting."
        );
        err.code = "PROFANITY_DETECTED";
        err.blocked = true;
        err.detected_words = localMatches;
        err.matches = localMatches.map((w) => ({ prohibited_text: w }));
        setSendError(err.message);
        throw err;
      }

      const currentThread = activeThreadRef.current;
      setIsSending(true);
      setSendError("");

      try {
        const payload = {
          thread_id: currentThread.thread_id,
          participant_type: currentThread.participant_type,
          participant_id: currentThread.participant_id,
          message_content: trimmed,
          replied_to_message_id: repliedToMessageId || null,
          warehouse_profile_id: activeBranchId || null,
        };

        const res = await request("/warehouse/messages/send/", {
          method: "POST",
          body: payload,
        });

        if (res && res.success && res.data) {
          const newMsg = res.data;

          // Append to message history
          setMessages((prev) => [...prev, newMsg]);

          // Update thread list latest message preview (or add newly initiated thread)
          setThreads((prevThreads) => {
            const index = prevThreads.findIndex(
              (t) => t.thread_id === currentThread.thread_id
            );
            if (index !== -1) {
              const updated = {
                ...prevThreads[index],
                latest_message: trimmed,
                latest_message_at: newMsg.created_at,
                is_sender_me: true,
                messages_count: (prevThreads[index].messages_count || 0) + 1,
              };
              const remaining = prevThreads.filter(
                (t) => t.thread_id !== currentThread.thread_id
              );
              return [updated, ...remaining];
            } else {
              const newThread = {
                thread_id: currentThread.thread_id,
                participant_type: currentThread.participant_type,
                participant_id: currentThread.participant_id,
                name: currentThread.name || "Contact",
                subtitle: currentThread.subtitle || currentThread.role || "Conversation",
                role: currentThread.role || "Contact",
                email: currentThread.email || "",
                latest_message: trimmed,
                latest_message_at: newMsg.created_at,
                is_sender_me: true,
                unread_count: 0,
                messages_count: 1,
              };
              return [newThread, ...prevThreads];
            }
          });

          return newMsg;
        } else {
          const payloadData = res?.data || res;
          const errMsg =
            payloadData?.message || res?.message || "Failed to send message.";
          const err = new Error(errMsg);
          err.data = payloadData;
          err.code = payloadData?.code;
          err.blocked = payloadData?.blocked;
          err.detected_words = payloadData?.detected_words;
          err.matches = payloadData?.matches;
          setSendError(errMsg);
          throw err;
        }
      } catch (err) {
        console.error("Failed to send message:", err);
        const msg = err?.message || "Failed to send message.";
        setSendError(msg);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [request, activeBranchId, detectProfanity]
  );

  const clearSendError = useCallback(() => {
    setSendError("");
  }, []);

  return {
    threads,
    branches,
    activeBranchId,
    setActiveBranchId,
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
  };
}

