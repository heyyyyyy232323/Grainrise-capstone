import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Share2, Copy, Check, Send, MessageCircle, X } from "lucide-react";
import useApi from "../../../Components/hooks/useApi";
import { slugifyTitle } from "../../Minor-Components/RichArticleContent";

const getCurrentMessageApiPrefix = () => {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("grainrise_user") || "{}");
    } catch {
      return {};
    }
  })();

  const role = String(
    storedUser.user_role || storedUser.role || ""
  )
    .trim()
    .toLowerCase();

  if (path.startsWith("/farmer") || role.includes("farmer")) return "farmer";
  if (path.startsWith("/warehouse") || role.includes("warehouse")) return "warehouse";
  if (path.startsWith("/retailer") || role.includes("retailer")) return "retailer";
  if (path.startsWith("/miller") || role.includes("miller")) return "miller";

  return "";
};

export default function ShareArticleModal({
  isOpen,
  onClose,
  article,
  onShareSuccess,
}) {
  const { request } = useApi();
  const [copied, setCopied] = useState(false);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState("");
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);

  const messageApiPrefix = getCurrentMessageApiPrefix();
  const chatShareEnabled = Boolean(
    messageApiPrefix &&
      (localStorage.getItem("grainrise_token") || localStorage.getItem("access_token"))
  );

  const articleSlug =
    article?.slug || (article?.title ? slugifyTitle(article.title) : article?.id);

  const publicUrl = article
    ? `${window.location.origin}/public/${
        article.item_type === "announcement" ? "announcements" : "news"
      }/${articleSlug}`
    : "";

  useEffect(() => {
    if (!isOpen) return;

    setCopied(false);
    setSelectedThread("");
    setSendStatus(null);
    document.body.style.overflow = "hidden";

    const loadRecentChats = async () => {
      if (!chatShareEnabled) {
        setThreads([]);
        return;
      }

      setIsLoadingChats(true);
      try {
        const res = await request(`/${messageApiPrefix}/messages/threads/`, {
          method: "GET",
        });

        if (res && res.data) {
          const list = res.data.threads || res.data || [];
          setThreads(list);
          if (list.length > 0) {
            setSelectedThread(list[0].thread_id || list[0].id || "");
          }
        } else {
          setThreads([]);
        }
      } catch (err) {
        console.error("Failed to load chats for sharing:", err);
        setThreads([]);
      } finally {
        setIsLoadingChats(false);
      }
    };

    loadRecentChats();

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, chatShareEnabled, messageApiPrefix, request]);

  if (!isOpen || !article) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = publicUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleSendToChat = async (e) => {
    e.preventDefault();
    if (!chatShareEnabled || !selectedThread || !messageApiPrefix) return;

    const threadObj = threads.find(
      (t) => String(t.thread_id || t.id) === String(selectedThread)
    );
    if (!threadObj) return;

    setIsSending(true);
    setSendStatus(null);

    try {
      const shareMessage = `Check out this article: "${article.title}"\n${publicUrl}`;

      const attachmentPayload = JSON.stringify({
        type: "article",
        item_type: article.item_type || "news",
        title: String(article.title || "").slice(0, 100),
        category: String(article.category || "").slice(0, 40),
        image_url: String(article.image_url || "").slice(0, 180),
        slug: String(articleSlug || "").slice(0, 120),
        id: article.id,
      });

      const res = await request(`/${messageApiPrefix}/messages/send/`, {
        method: "POST",
        body: {
          thread_id: threadObj.thread_id || threadObj.id,
          participant_type: threadObj.participant_type,
          participant_id: threadObj.participant_id,
          message_content: shareMessage,
          message_attachment: attachmentPayload,
        },
      });

      if (res && (res.data || res.success)) {
        setSendStatus({ type: "success", message: "Sent successfully to chat!" });
        if (onShareSuccess) onShareSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setSendStatus({
          type: "error",
          message: res?.error || "Failed to send to selected chat.",
        });
      }
    } catch (err) {
      setSendStatus({
        type: "error",
        message: err?.message || "Failed to send to chat.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Share Article</h3>
              <p className="text-[11px] text-slate-400">Share via chat or copy public link</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Article preview snippet */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
              {article.category || "News"}
            </span>
            <h4 className="mt-0.5 text-xs font-bold text-slate-800 line-clamp-2">
              {article.title}
            </h4>
          </div>

          {chatShareEnabled && (
            <>
              {/* Option 1: Send to Recent Chats */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MessageCircle size={13} />
                  <span>Send to Recent Chat</span>
                </label>

                {isLoadingChats ? (
                  <div className="p-3 text-center text-xs text-slate-400">Loading recent chats...</div>
                ) : threads.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-center text-xs text-slate-400">
                    No recent chat conversations available.
                  </div>
                ) : (
                  <form onSubmit={handleSendToChat} className="space-y-2.5">
                    <select
                      value={selectedThread}
                      onChange={(e) => setSelectedThread(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                    >
                      {threads.map((t) => (
                        <option key={t.thread_id || t.id} value={t.thread_id || t.id}>
                          {t.name || t.contact_name || t.participant_name || `Chat #${t.thread_id || t.id}`}
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      disabled={isSending || !selectedThread}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#08511f] py-2 text-xs font-bold text-white hover:bg-[#063f18] transition disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      <Send size={13} />
                      <span>{isSending ? "Sending..." : "Send to Chat"}</span>
                    </button>
                  </form>
                )}

                {sendStatus && (
                  <div
                    className={`p-2 rounded-lg text-xs font-semibold ${
                      sendStatus.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {sendStatus.message}
                  </div>
                )}
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2 text-[10px] uppercase font-bold text-slate-400 absolute">
                  or
                </span>
              </div>
            </>
          )}

          {/* Option 2: Copy Link */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Copy size={13} />
              <span>Public Link</span>
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Anyone with this link can view the article without logging in.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
