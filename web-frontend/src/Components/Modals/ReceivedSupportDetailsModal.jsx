import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Mail,
  User,
  Tag,
  Hash,
  Calendar,
  FileText,
  Paperclip,
  CheckCircle,
  Eye,
  EyeOff,
  Send,
  ExternalLink
} from "lucide-react";

const formatDateTime = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getCategoryBadgeClass = (category) => {
  const cat = String(category || "").toLowerCase();
  if (cat.includes("tech")) return "bg-red-50 text-red-700 border-red-200";
  if (cat.includes("access") || cat.includes("security")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (cat.includes("order") || cat.includes("transaction")) return "bg-blue-50 text-blue-700 border-blue-200";
  if (cat.includes("registration") || cat.includes("verification")) return "bg-purple-50 text-purple-700 border-purple-200";
  if (cat.includes("billing") || cat.includes("payment")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
};

export default function ReceivedSupportDetailsModal({
  isOpen,
  onClose,
  message,
  onToggleRead,
  onUpdateStatus,
  onReply,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !message) return null;

  const isRead = Boolean(message.is_read);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 px-4 py-6"
      onMouseDown={onClose}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          style={{ maxHeight: "calc(100dvh - 48px)" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Mail size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Support Inquiry Details</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {(() => {
                    const status = String(message.status || (isRead ? "read" : "unread")).toLowerCase();
                    if (status === "replied") {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Replied
                        </span>
                      );
                    }
                    if (status === "read") {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border border-slate-200 bg-slate-100 text-slate-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Read
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border border-red-200 bg-red-50 text-red-700 animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Unread
                      </span>
                    );
                  })()}
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">ID #{message.id || message.support_id}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-6 py-5 space-y-5">
            {/* Sender & Meta Card */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Sender</span>
                  <div className="flex items-center gap-1.5 font-medium text-gray-900 mt-0.5">
                    <User size={14} className="text-gray-400" />
                    <span>{message.full_name}</span>
                    {message.user_role && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-200/70 text-gray-700">
                        {message.user_role}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Email Address</span>
                  <a
                    href={`mailto:${message.email}`}
                    className="flex items-center gap-1.5 font-medium text-emerald-600 hover:underline mt-0.5"
                  >
                    <Mail size={14} />
                    <span>{message.email}</span>
                  </a>
                </div>

                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Category</span>
                  <span
                    className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full border font-medium ${getCategoryBadgeClass(
                      message.concern_category
                    )}`}
                  >
                    {message.concern_category}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Reference ID</span>
                  <div className="flex items-center gap-1.5 font-medium text-gray-800 mt-1">
                    <Hash size={14} className="text-gray-400" />
                    <span>{message.reference_id || "None provided"}</span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Date Received</span>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                    <Calendar size={14} className="text-gray-400" />
                    <span>{formatDateTime(message.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject */}
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Subject</span>
              <h4 className="text-base font-bold text-gray-900 bg-white border border-gray-100 rounded-lg p-3">
                {message.subject}
              </h4>
            </div>

            {/* Description / Message */}
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Message Content
              </span>
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[120px]">
                {message.description}
              </div>
            </div>

            {/* Attachment, if any */}
            {(message.attachment_name || message.attachment_file) && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Attachment
                </span>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <Paperclip size={16} className="text-emerald-600" />
                    <span className="text-sm font-medium text-gray-800">
                      {message.attachment_name || "Attachment File"}
                    </span>
                  </div>
                  {message.attachment_file && (
                    <a
                      href={message.attachment_file.startsWith("http") ? message.attachment_file : `/media/${message.attachment_file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      <ExternalLink size={14} />
                      View Attachment
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Status:</span>
              <select
                value={String(message.status || (isRead ? "read" : "unread")).toLowerCase()}
                onChange={(e) => onUpdateStatus?.(message.id || message.support_id, e.target.value)}
                className="text-xs font-semibold rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="replied">Replied</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {onReply && (
                <button
                  type="button"
                  onClick={() => {
                    onReply(message);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <Send size={14} />
                  Reply via Email
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

