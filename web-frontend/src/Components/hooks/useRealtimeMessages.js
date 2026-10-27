import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// WebSocket URL / token helpers
// ============================================================

const getStoredToken = () =>
  localStorage.getItem("grainrise_token") ||
  localStorage.getItem("access_token") ||
  "";

const buildSocketUrl = (token) => {
  const explicit = import.meta.env.VITE_WS_URL;
  let base = "";

  if (explicit) {
    base = String(explicit).replace(/\/$/, "");
  } else {
    const apiBase =
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1")
        ? "http://127.0.0.1:8000"
        : "");

    if (apiBase) {
      base = String(apiBase).replace(/\/$/, "").replace(/^http/i, "ws");
    } else {
      const scheme = window.location.protocol === "https:" ? "wss" : "ws";
      base = `${scheme}://${window.location.host}`;
    }
  }

  return `${base}/ws/messages/?token=${encodeURIComponent(token)}`;
};

const TYPING_EMIT_INTERVAL_MS = 2000; // throttle for "typing" pings
const TYPING_IDLE_STOP_MS = 3000; // stop after user pauses
const TYPING_EXPIRE_MS = 4500; // receiver-side safety expiry
const HEARTBEAT_MS = 25000;

const appendUnique = (list, msg) =>
  list.some((m) => String(m.message_id) === String(msg.message_id))
    ? list
    : [...list, msg];

/**
 * Shared real-time layer for the Miller and Warehouse Messages hooks.
 *
 * It only ever receives events that the backend scoped to the authenticated
 * account. Typing events are ephemeral and never persisted.
 */
export default function useRealtimeMessages({
  request,
  apiPrefix, // "/miller" | "/warehouse"
  activeThreadRef,
  threadsRef,
  setThreads,
  setMessages,
  getBranchId,
}) {
  const [typingMap, setTypingMap] = useState({});
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const heartbeatRef = useRef(null);
  const attemptsRef = useRef(0);
  const hasConnectedOnceRef = useRef(false);
  const closedByUsRef = useRef(false);
  const typingTimersRef = useRef({});

  const typingSentRef = useRef({ threadId: null, at: 0 });
  const typingIdleTimerRef = useRef(null);

  const requestRef = useRef(request);
  requestRef.current = request;
  const getBranchIdRef = useRef(getBranchId);
  getBranchIdRef.current = getBranchId;

  // ── Outgoing ──────────────────────────────────────────────
  const sendJson = useCallback((payload) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  const stopTyping = useCallback(() => {
    if (typingIdleTimerRef.current) {
      clearTimeout(typingIdleTimerRef.current);
      typingIdleTimerRef.current = null;
    }
    const { threadId } = typingSentRef.current;
    if (threadId) {
      sendJson({
        type: "typing",
        thread_id: threadId,
        is_typing: false,
        branch_id: getBranchIdRef.current ? getBranchIdRef.current() : null,
      });
    }
    typingSentRef.current = { threadId: null, at: 0 };
  }, [sendJson]);

  /** Call from the composer's onChange with the new text value. */
  const emitTyping = useCallback(
    (text) => {
      const thread = activeThreadRef.current;
      if (!thread) return;

      if (!String(text || "").trim()) {
        stopTyping();
        return;
      }

      const now = Date.now();
      const sent = typingSentRef.current;

      if (sent.threadId && sent.threadId !== thread.thread_id) {
        stopTyping();
      }

      if (
        typingSentRef.current.threadId !== thread.thread_id ||
        now - typingSentRef.current.at >= TYPING_EMIT_INTERVAL_MS
      ) {
        sendJson({
          type: "typing",
          thread_id: thread.thread_id,
          is_typing: true,
          branch_id: getBranchIdRef.current ? getBranchIdRef.current() : null,
        });
        typingSentRef.current = { threadId: thread.thread_id, at: now };
      }

      if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current);
      typingIdleTimerRef.current = setTimeout(stopTyping, TYPING_IDLE_STOP_MS);
    },
    [activeThreadRef, sendJson, stopTyping]
  );

  // ── Incoming helpers ──────────────────────────────────────
  const setTyping = useCallback((threadIds, isTyping) => {
    const ids = Array.isArray(threadIds) ? threadIds : [];
    ids.forEach((id) => {
      if (typingTimersRef.current[id]) {
        clearTimeout(typingTimersRef.current[id]);
        delete typingTimersRef.current[id];
      }
      if (isTyping) {
        typingTimersRef.current[id] = setTimeout(() => {
          setTypingMap((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, TYPING_EXPIRE_MS);
      }
    });

    setTypingMap((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        if (isTyping) next[id] = true;
        else delete next[id];
      });
      return next;
    });
  }, []);

  const silentFetchConversation = useCallback(async () => {
    const thread = activeThreadRef.current;
    if (!thread) return null;
    try {
      const res = await requestRef.current(
        `${apiPrefix}/messages/conversation/?thread_id=${encodeURIComponent(thread.thread_id)}`
      );
      if (res && res.success && res.data) return res.data;
    } catch {
      /* silent */
    }
    return null;
  }, [activeThreadRef, apiPrefix]);

  const mergeMissingThread = useCallback(
    async (threadId) => {
      try {
        const res = await requestRef.current(`${apiPrefix}/messages/threads/`);
        if (res && res.success && Array.isArray(res.data)) {
          const found = res.data.find((t) => t.thread_id === threadId);
          if (found) {
            setThreads((prev) =>
              prev.some((t) => t.thread_id === threadId) ? prev : [found, ...prev]
            );
          }
        }
      } catch {
        /* silent */
      }
    },
    [apiPrefix, setThreads]
  );

  const resync = useCallback(async () => {
    try {
      const res = await requestRef.current(`${apiPrefix}/messages/threads/`);
      if (res && res.success && Array.isArray(res.data)) {
        setThreads(res.data);
      }
    } catch {
      /* silent */
    }
    const data = await silentFetchConversation();
    if (data && Array.isArray(data.messages)) setMessages(data.messages);
  }, [apiPrefix, setThreads, setMessages, silentFetchConversation]);

  const handleMessageCreated = useCallback(
    (evt) => {
      const { thread_id: threadId, is_mine: isMine } = evt;
      const raw = evt.message || {};
      const active = activeThreadRef.current;
      const isActive = !!active && active.thread_id === threadId;

      const message = {
        ...raw,
        sender_name: isMine ? "You" : raw.sender_name || active?.name || "",
        replied_message: raw.replied_message
          ? {
              ...raw.replied_message,
              sender_name:
                raw.replied_message.sender_name || active?.name || "Participant",
            }
          : null,
      };

      if (isActive) {
        setMessages((prev) => appendUnique(prev, message));
        if (!isMine) {
          // Conversation is open: mark as read (server broadcasts "seen" back).
          silentFetchConversation();
        }
      }

      const known = (threadsRef.current || []).some((t) => t.thread_id === threadId);

      setThreads((prev) => {
        const idx = prev.findIndex((t) => t.thread_id === threadId);
        if (idx === -1) return prev;
        const current = prev[idx];
        const updated = {
          ...current,
          latest_message: message.message_content || "",
          latest_message_at: message.created_at,
          is_sender_me: !!isMine,
          messages_count: (current.messages_count || 0) + 1,
          unread_count:
            isMine || isActive ? 0 : Number(current.unread_count || 0) + 1,
        };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });

      if (!known) mergeMissingThread(threadId);
      if (!isMine) setTyping([threadId], false);
    },
    [activeThreadRef, threadsRef, setMessages, setThreads, silentFetchConversation, mergeMissingThread, setTyping]
  );

  const handleMessagesSeen = useCallback(
    (evt) => {
      const ids = new Set((evt.message_ids || []).map(String));
      const active = activeThreadRef.current;
      if (active && active.thread_id === evt.thread_id) {
        const seenAt = new Date().toISOString();
        setMessages((prev) =>
          prev.map((m) =>
            ids.has(String(m.message_id))
              ? { ...m, is_seen: true, seen_at: m.seen_at || seenAt }
              : m
          )
        );
      }
      if (!evt.is_mine) {
        setThreads((prev) =>
          prev.map((t) =>
            t.thread_id === evt.thread_id ? { ...t, unread_count: 0 } : t
          )
        );
      }
    },
    [activeThreadRef, setMessages, setThreads]
  );

  const handleEventRef = useRef(null);
  handleEventRef.current = (evt) => {
    if (!evt || typeof evt !== "object") return;
    switch (evt.type) {
      case "message.created":
        handleMessageCreated(evt);
        break;
      case "messages.seen":
        handleMessagesSeen(evt);
        break;
      case "typing":
        setTyping(
          evt.thread_ids && evt.thread_ids.length ? evt.thread_ids : [evt.thread_id],
          !!evt.is_typing
        );
        break;
      default:
        break;
    }
  };

  const resyncRef = useRef(resync);
  resyncRef.current = resync;

  // ── Connection lifecycle ──────────────────────────────────
  useEffect(() => {
    closedByUsRef.current = false;

    const clearHeartbeat = () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };

    const connect = () => {
      const token = getStoredToken();
      if (!token || closedByUsRef.current) return;

      let ws;
      try {
        ws = new WebSocket(buildSocketUrl(token));
      } catch (err) {
        console.error("WebSocket init failed:", err);
        scheduleReconnect();
        return;
      }
      socketRef.current = ws;

      ws.onopen = () => {
        attemptsRef.current = 0;
        setConnected(true);
        clearHeartbeat();
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, HEARTBEAT_MS);

        if (hasConnectedOnceRef.current) {
          // Missed events while offline -> reconcile with the server.
          resyncRef.current();
        }
        hasConnectedOnceRef.current = true;
      };

      ws.onmessage = (e) => {
        try {
          handleEventRef.current(JSON.parse(e.data));
        } catch (err) {
          console.error("Bad realtime payload:", err);
        }
      };

      ws.onclose = (e) => {
        clearHeartbeat();
        setConnected(false);
        if (socketRef.current === ws) socketRef.current = null;
        if (closedByUsRef.current) return;
        if (e.code === 4001) return; // auth rejected: do not hammer the server
        scheduleReconnect();
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
    };

    const scheduleReconnect = () => {
      if (closedByUsRef.current) return;
      const delay = Math.min(30000, 1000 * 2 ** attemptsRef.current);
      attemptsRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    const onVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        !socketRef.current &&
        !closedByUsRef.current
      ) {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        attemptsRef.current = 0;
        connect();
      }
    };

    connect();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onVisibility);

    return () => {
      closedByUsRef.current = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onVisibility);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      clearHeartbeat();
      stopTyping();
      Object.values(typingTimersRef.current).forEach(clearTimeout);
      typingTimersRef.current = {};
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          /* ignore */
        }
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { typingMap, connected, emitTyping, stopTyping };
}
