import { useCallback, useRef, useState } from "react";
import useApi from "../useApi";
import useRealtimeMessages from "../useRealtimeMessages";

const CACHE_KEY_THREADS = "grainrise_farmer_threads";
const CACHE_KEY_ACTIVE_THREAD = "grainrise_farmer_active_thread";
const CACHE_KEY_MESSAGES_PREFIX = "grainrise_farmer_msgs_";

function getCachedJson(key, fallback) {
  try {
    const val = sessionStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setCachedJson(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function useFarmerMessages() {
  const { request } = useApi();

  // Instant SWR state initialization from session storage
  const [threads, setThreads] = useState(() => getCachedJson(CACHE_KEY_THREADS, []));
  const [activeThread, setActiveThread] = useState(() => getCachedJson(CACHE_KEY_ACTIVE_THREAD, null));
  const [messages, setMessages] = useState(() => {
    const initThread = getCachedJson(CACHE_KEY_ACTIVE_THREAD, null);
    if (initThread && initThread.thread_id) {
      return getCachedJson(`${CACHE_KEY_MESSAGES_PREFIX}${initThread.thread_id}`, []);
    }
    return [];
  });

  const [isThreadsLoading, setIsThreadsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [threadsError, setThreadsError] = useState("");
  const [messagesError, setMessagesError] = useState("");
  const [sendError, setSendError] = useState("");

  const activeThreadRef = useRef(activeThread);
  activeThreadRef.current = activeThread;

  const threadsRef = useRef(threads);
  threadsRef.current = threads;

  // In-memory conversation cache for instant 0ms switching
  const messagesCacheRef = useRef({});

  // Real-time (WebSocket) updates & typing indicators
  const { typingMap, connected: realtimeConnected, emitTyping, stopTyping } =
    useRealtimeMessages({
      request,
      apiPrefix: "/farmer",
      activeThreadRef,
      threadsRef,
      setThreads,
      setMessages,
      getBranchId: () => null,
    });
  const isPartnerTyping = !!(activeThread && typingMap[activeThread.thread_id]);

  // Select a Conversation Thread (Instant Cache-First)
  const selectThread = useCallback(
    async (thread, isSilent = false) => {
      if (!thread) return;

      setActiveThread(thread);
      setCachedJson(CACHE_KEY_ACTIVE_THREAD, thread);

      // Check cache first for instant 0ms display
      const cached =
        messagesCacheRef.current[thread.thread_id] ||
        getCachedJson(`${CACHE_KEY_MESSAGES_PREFIX}${thread.thread_id}`, null);

      if (cached && Array.isArray(cached) && cached.length > 0) {
        setMessages(cached);
        setIsMessagesLoading(false);
      } else if (!isSilent) {
        setIsMessagesLoading(true);
      }

      setMessagesError("");
      setSendError("");

      try {
        const res = await request(
          `/farmer/messages/conversation/?thread_id=${encodeURIComponent(thread.thread_id)}`
        );

        if (res && res.success && res.data) {
          const freshList = Array.isArray(res.data.messages) ? res.data.messages : [];
          setMessages(freshList);
          messagesCacheRef.current[thread.thread_id] = freshList;
          setCachedJson(`${CACHE_KEY_MESSAGES_PREFIX}${thread.thread_id}`, freshList);

          if (res.data.thread) {
            setActiveThread((prev) => {
              const updated = {
                ...(prev || {}),
                ...res.data.thread,
                unread_count: 0,
              };
              setCachedJson(CACHE_KEY_ACTIVE_THREAD, updated);
              return updated;
            });
          }

          // Decrement/clear unread count in thread list locally
          setThreads((prevThreads) => {
            const updated = prevThreads.map((t) =>
              t.thread_id === thread.thread_id ? { ...t, unread_count: 0 } : t
            );
            setCachedJson(CACHE_KEY_THREADS, updated);
            return updated;
          });
        } else {
          if (!cached || cached.length === 0) {
            setMessagesError(res?.message || "Failed to load messages.");
          }
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
        if (!cached || cached.length === 0) {
          setMessagesError(err?.message || "Failed to load messages.");
        }
      } finally {
        setIsMessagesLoading(false);
      }
    },
    [request]
  );

  // Load Conversation Threads (With Instant Cache & Auto-select)
  const loadThreads = useCallback(
    async (searchTerm = "") => {
      // Only show full loading spinner if we don't have any cached threads
      if (threadsRef.current.length === 0) {
        setIsThreadsLoading(true);
      }
      setThreadsError("");

      try {
        const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
        const res = await request(`/farmer/messages/threads/${query}`);

        if (res && res.success) {
          const list = Array.isArray(res.data) ? res.data : [];
          setThreads(list);
          if (!searchTerm) {
            setCachedJson(CACHE_KEY_THREADS, list);
          }

          // Auto-select first conversation if none selected yet
          if (!activeThreadRef.current && list.length > 0) {
            selectThread(list[0], true).catch(() => {});
          } else if (activeThreadRef.current) {
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
    [request, selectThread]
  );

  // Refresh Currently Active Thread
  const refreshActiveThread = useCallback(async () => {
    if (!activeThreadRef.current) return;
    const thread = activeThreadRef.current;

    setIsMessagesLoading(true);
    setMessagesError("");

    try {
      const res = await request(
        `/farmer/messages/conversation/?thread_id=${encodeURIComponent(thread.thread_id)}`
      );

      if (res && res.success && res.data) {
        const freshList = Array.isArray(res.data.messages) ? res.data.messages : [];
        setMessages(freshList);
        messagesCacheRef.current[thread.thread_id] = freshList;
        setCachedJson(`${CACHE_KEY_MESSAGES_PREFIX}${thread.thread_id}`, freshList);

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

  // Send a Message (with immediate optimistic UI)
  const sendMessage = useCallback(
    async (content, repliedTarget = null) => {
      if (!activeThreadRef.current) {
        throw new Error("No conversation selected.");
      }

      const trimmed = String(content || "").trim();
      if (!trimmed) {
        throw new Error("Message content cannot be empty.");
      }

      const currentThread = activeThreadRef.current;
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();

      // Resolve replied message metadata for optimistic display
      let repliedMeta = null;
      let repliedToId = null;
      if (repliedTarget && typeof repliedTarget === "object") {
        repliedToId = repliedTarget.message_id;
        repliedMeta = {
          message_id: repliedTarget.message_id,
          message_content: repliedTarget.message_content || repliedTarget.message_text || "",
          sender_name: repliedTarget.sender_name || (repliedTarget.is_mine ? "You" : currentThread.name || "Participant"),
        };
      } else if (repliedTarget) {
        repliedToId = repliedTarget;
      }

      const optimisticMsg = {
        message_id: tempId,
        sender_type: "farmer",
        sender_name: "You",
        is_mine: true,
        is_sending: true,
        message_content: trimmed,
        message_text: trimmed,
        message_attachment: "",
        created_at: nowIso,
        seen_at: null,
        is_seen: false,
        replied_to_message_id: repliedToId,
        replied_message: repliedMeta,
      };

      // 1. Immediately inject optimistic message into chat history
      setMessages((prev) => [...prev, optimisticMsg]);
      stopTyping();

      // 2. Immediately update threads list latest message preview
      setThreads((prevThreads) => {
        const index = prevThreads.findIndex(
          (t) => t.thread_id === currentThread.thread_id
        );
        if (index !== -1) {
          const updated = {
            ...prevThreads[index],
            latest_message: trimmed,
            latest_message_at: nowIso,
            is_sender_me: true,
            messages_count: (prevThreads[index].messages_count || 0) + 1,
          };
          const remaining = prevThreads.filter(
            (t) => t.thread_id !== currentThread.thread_id
          );
          return [updated, ...remaining];
        }
        return prevThreads;
      });

      setIsSending(true);
      setSendError("");

      try {
        const payload = {
          thread_id: currentThread.thread_id,
          participant_type: currentThread.participant_type,
          participant_id: currentThread.participant_id,
          message_content: trimmed,
          replied_to_message_id: repliedToId || null,
        };

        const res = await request("/farmer/messages/send/", {
          method: "POST",
          body: payload,
        });

        if (res && res.success && res.data) {
          const newMsg = {
            ...res.data,
            sender_type: "farmer",
            sender_name: "You",
            is_mine: true,
            is_sending: false,
          };

          // Replace optimistic temporary message with the confirmed saved message
          setMessages((prev) => {
            const alreadyHasReal = prev.some(
              (m) => String(m.message_id) === String(newMsg.message_id)
            );
            if (alreadyHasReal) {
              return prev.filter((m) => m.message_id !== tempId);
            }
            return prev.map((m) => (m.message_id === tempId ? newMsg : m));
          });

          return newMsg;
        } else {
          // Remove optimistic message if submission failed
          setMessages((prev) => prev.filter((m) => m.message_id !== tempId));

          const payloadErr = res?.data || res;
          const errMsg = payloadErr?.message || res?.message || "Failed to send message.";
          const err = new Error(errMsg);
          err.data = payloadErr;
          err.code = payloadErr?.code;
          err.blocked = payloadErr?.blocked;
          err.detected_words = payloadErr?.detected_words;
          err.matches = payloadErr?.matches;
          setSendError(errMsg);
          throw err;
        }
      } catch (err) {
        // Remove optimistic message if network or validation error occurred
        setMessages((prev) => prev.filter((m) => m.message_id !== tempId));
        console.error("Failed to send message:", err);
        const msg = err?.message || "Failed to send message.";
        setSendError(msg);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [request, stopTyping]
  );

  const clearSendError = useCallback(() => {
    setSendError("");
  }, []);

  return {
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
    realtimeConnected,
  };
}
