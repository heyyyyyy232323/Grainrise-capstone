import { useCallback, useRef, useState } from "react";
import useApi from "../useApi";

export default function useMillerMessages() {
  const { request } = useApi();

  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);

  const [isThreadsLoading, setIsThreadsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [threadsError, setThreadsError] = useState("");
  const [messagesError, setMessagesError] = useState("");
  const [sendError, setSendError] = useState("");

  const activeThreadRef = useRef(activeThread);
  activeThreadRef.current = activeThread;

  // ── Load Conversation Threads ──────────────────────────────────────────────
  const loadThreads = useCallback(
    async (searchTerm = "") => {
      setIsThreadsLoading(true);
      setThreadsError("");

      try {
        const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
        const res = await request(`/miller/messages/threads/${query}`);

        if (res && res.success) {
          const list = Array.isArray(res.data) ? res.data : [];
          setThreads(list);

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
    [request]
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
          `/miller/messages/conversation/?thread_id=${encodeURIComponent(thread.thread_id)}`
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

          // Decrement/clear unread count in thread list locally
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
        `/miller/messages/conversation/?thread_id=${encodeURIComponent(thread.thread_id)}`
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
        };

        const res = await request("/miller/messages/send/", {
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
          const payload = res?.data || res;
          const errMsg = payload?.message || res?.message || "Failed to send message.";
          const err = new Error(errMsg);
          err.data = payload;
          err.code = payload?.code;
          err.blocked = payload?.blocked;
          err.detected_words = payload?.detected_words;
          err.matches = payload?.matches;
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
    [request]
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
  };
}

