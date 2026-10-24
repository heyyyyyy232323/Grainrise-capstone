import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Star, X, Image as ImageIcon, ZoomIn } from "lucide-react";

/**
 * Normalizes an attachment URL or path.
 * If already absolute or starts with http/data/blob, returns as is.
 * Otherwise prepends /media/ or root slash.
 */
function normalizeAttachmentUrl(url) {
  if (!url) return "";
  const cleaned = String(url).trim();
  if (
    cleaned.startsWith("http://") ||
    cleaned.startsWith("https://") ||
    cleaned.startsWith("data:") ||
    cleaned.startsWith("blob:")
  ) {
    return cleaned;
  }
  if (cleaned.startsWith("/media/")) {
    return cleaned;
  }
  if (cleaned.startsWith("media/")) {
    return `/${cleaned}`;
  }
  if (cleaned.startsWith("/")) {
    return cleaned;
  }
  return `/media/${cleaned}`;
}

export default function OnlineOrderRatingModal({
  isOpen,
  onClose,
  rating,
}) {
  const [previewImage, setPreviewImage] = useState(null);

  // Close preview on escape key or modal close
  useEffect(() => {
    if (!isOpen) {
      setPreviewImage(null);
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (previewImage) {
          setPreviewImage(null);
        } else {
          onClose?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, previewImage]);

  if (!isOpen || !rating) return null;

  const maskedName =
    rating.masked_reviewer ||
    rating.customer ||
    rating.reviewer_name ||
    "Customer";

  const starValue = Number(rating.rating || 0);

  const commentText =
    rating.comment && String(rating.comment).trim()
      ? String(rating.comment).trim()
      : "No comment provided.";

  const attachments = Array.isArray(rating.attachments)
    ? rating.attachments
    : rating.attachment
    ? [rating.attachment]
    : [];

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !previewImage) {
          onClose?.();
        }
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Masked Reviewer Name ONLY */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-xl font-bold tracking-tight text-gray-900">
            {maskedName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-5 pt-4 overflow-y-auto pr-1">
          {/* Star Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  className={
                    i < Math.floor(starValue)
                      ? "fill-amber-400 text-amber-400"
                      : i < starValue
                      ? "fill-amber-200 text-amber-400"
                      : "text-gray-200 fill-none"
                  }
                />
              ))}
            </div>
            <span className="text-sm font-bold text-gray-800">
              {starValue.toFixed(1)} / 5
            </span>
          </div>

          {/* Full Comment */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Review Comment
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
              {commentText}
            </p>
          </div>

          {/* Attachments (If available) */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <ImageIcon size={14} />
                <span>
                  Attachments ({attachments.length})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {attachments.map((att, idx) => {
                  const url = normalizeAttachmentUrl(
                    typeof att === "string" ? att : att?.url || att?.attachment
                  );
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewImage(url)}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-2xs hover:border-emerald-500 focus:outline-none transition-all cursor-pointer"
                    >
                      <img
                        src={url}
                        alt={`Attachment ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.classList.add(
                              "flex",
                              "items-center",
                              "justify-center",
                              "text-gray-400",
                              "text-xs"
                            );
                            e.currentTarget.parentElement.innerText = "Attachment";
                          }
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="rounded-full bg-white/90 p-1.5 text-gray-800 shadow-sm">
                          <ZoomIn size={16} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Lightbox Overlay */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/90 transition cursor-pointer"
              aria-label="Close image preview"
            >
              <X size={20} />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[85vh] max-w-[85vw] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}

