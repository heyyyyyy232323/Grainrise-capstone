import React, {
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Eye,
  FileEdit,
  Heart,
  MessageCircle,
  ShieldAlert,
  X,
} from "lucide-react";


const getAudienceLabel = (value) => {
  const labels = {
    all: "All Audiences",
    miller: "Miller",
    warehouse: "Warehouse",
    retailer: "Retailer",
  };

  return (
    labels[
      String(value || "").toLowerCase()
    ] ||
    value ||
    "All Audiences"
  );
};


const getStatusBadge = (status) => {
  const s = String(status || "").toLowerCase();

  if (s === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (s === "draft") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  if (s === "archived") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (s === "hidden") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (s === "deleted") {
    return "border-red-200 bg-red-50 text-red-600";
  }

  return "border-gray-200 bg-gray-50 text-gray-600";
};


const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-PH",
      {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return String(value);
  }
};


const CommentCard = ({
  comment,
  isReply = false,
  onModerate,
  onPenalty,
}) => {
  const status =
    String(
      comment?.comment_status ||
      comment?.reply_status ||
      "active"
    ).toLowerCase();

  const authorName =
    comment?.author_name ||
    "Unknown User";

  const authorRole =
    comment?.author_role ||
    "User";

  const text =
    comment?.comment_content ||
    comment?.reply_content ||
    comment?.comment_text ||
    "";

  return (
    <div
      className={`
        rounded-xl
        border
        border-gray-200
        bg-white
        p-4
        ${
          isReply
            ? "ml-8 mt-3 border-l-4 border-l-[#08511f]/30 bg-gray-50/50"
            : "mt-3"
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">
            {authorName}
          </p>

          <p className="mt-0.5 text-xs text-gray-400 capitalize">
            {authorRole}
            {" • "}
            {formatDate(comment?.created_at)}
          </p>
        </div>

        <span
          className={`
            inline-flex
            rounded-full
            border
            px-2.5
            py-0.5
            text-[11px]
            font-semibold
            capitalize
            ${getStatusBadge(status)}
          `}
        >
          {status}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
        {text || "—"}
      </p>

      {/* MODERATION BUTTONS */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {status === "active" && (
          <button
            type="button"
            onClick={() => onModerate?.(comment, "hide", isReply)}
            className="
              rounded-lg
              border
              border-amber-300
              px-2.5
              py-1
              text-xs
              font-semibold
              text-amber-700
              transition
              hover:bg-amber-50
            "
          >
            Hide
          </button>
        )}

        {status === "hidden" && (
          <button
            type="button"
            onClick={() => onModerate?.(comment, "restore", isReply)}
            className="
              rounded-lg
              border
              border-emerald-300
              px-2.5
              py-1
              text-xs
              font-semibold
              text-emerald-700
              transition
              hover:bg-emerald-50
            "
          >
            Restore
          </button>
        )}

        {status !== "deleted" && (
          <button
            type="button"
            onClick={() => onModerate?.(comment, "delete", isReply)}
            className="
              rounded-lg
              border
              border-red-300
              px-2.5
              py-1
              text-xs
              font-semibold
              text-red-600
              transition
              hover:bg-red-50
            "
          >
            Delete
          </button>
        )}

        <button
          type="button"
          disabled={comment?.user_status !== "active"}
          onClick={() => onPenalty?.(comment, isReply)}
          title={
            comment?.user_status !== "active"
              ? "User is already deactivated"
              : "Deactivate user account"
          }
          className="
            inline-flex
            items-center
            gap-1
            rounded-lg
            border
            border-gray-300
            px-2.5
            py-1
            text-xs
            font-semibold
            text-gray-700
            transition
            hover:bg-gray-100
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          <ShieldAlert size={13} />
          Penalize User
        </button>
      </div>

      {/* NESTED REPLIES */}
      {!isReply &&
        Array.isArray(comment?.replies) &&
        comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((reply) => (
              <CommentCard
                key={reply.reply_id}
                comment={reply}
                isReply
                onModerate={onModerate}
                onPenalty={onPenalty}
              />
            ))}
          </div>
        )}
    </div>
  );
};


const ViewAnnouncementModal = ({
  open,
  announcement,
  onClose,
  onEdit,
  onModerateComment,
  onModerateReply,
  onPenaltyComment,
  onPenaltyReply,
}) => {
  const [activeTab, setActiveTab] = useState("announcement");

  if (!open || !announcement) {
    return null;
  }

  const status =
    String(
      announcement?.status || ""
    ).toLowerCase();

  const canEdit =
    status !== "archived" &&
    typeof onEdit === "function";

  const comments =
    Array.isArray(announcement?.comments)
      ? announcement.comments
      : [];

  const totalReplies = comments.reduce(
    (acc, curr) => acc + (Array.isArray(curr?.replies) ? curr.replies.length : 0),
    0
  );

  const totalCommentCount = comments.length + totalReplies;

  const handleModerate = (item, action, isReply) => {
    if (isReply) {
      onModerateReply?.(item, action);
    } else {
      onModerateComment?.(item, action);
    }
  };

  const handlePenalty = (item, isReply) => {
    if (isReply) {
      onPenaltyReply?.(item);
    } else {
      onPenaltyComment?.(item);
    }
  };

  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-black/50
        p-4
      "
    >
      <div
        role="dialog"
        aria-modal="true"
        className="
          flex
          h-[88vh]
          w-full
          max-w-4xl
          flex-col
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >
        {/* HEADER */}
        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-gray-200
            px-6
            py-4
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-green-50
                text-[#08511f]
              "
            >
              <Eye size={19} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Announcement Details
              </h2>

              <p className="mt-0.5 text-xs text-gray-500">
                View announcement information, preview, and moderate discussions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              rounded-lg
              p-2
              text-gray-400
              transition
              hover:bg-gray-100
              hover:text-gray-700
            "
          >
            <X size={19} />
          </button>
        </div>

        {/* TABS */}
        <div className="flex shrink-0 border-b border-gray-200 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("announcement")}
            className={`border-b-2 py-3 text-sm font-semibold transition ${
              activeTab === "announcement"
                ? "border-[#08511f] text-[#08511f]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Announcement Preview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={`ml-6 flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition ${
              activeTab === "comments"
                ? "border-[#08511f] text-[#08511f]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <MessageCircle size={15} />
            <span>Comments & Replies</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === "comments"
                  ? "bg-[#08511f]/10 text-[#08511f]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {totalCommentCount}
            </span>
          </button>
        </div>

        {/* BODY */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {activeTab === "announcement" ? (
            <div className="space-y-4">
              {/* IMAGE */}
              {announcement?.image_url && (
                <div
                  className="
                    overflow-hidden
                    rounded-xl
                    border
                    border-gray-200
                    bg-gray-50
                  "
                >
                  <img
                    src={announcement.image_url}
                    alt={announcement.title || "Announcement"}
                    className="max-h-72 w-full object-cover"
                  />
                </div>
              )}

              {/* BADGES & META */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`
                    inline-flex
                    rounded-full
                    border
                    px-2.5
                    py-1
                    text-xs
                    font-semibold
                    capitalize
                    ${getStatusBadge(announcement?.status)}
                  `}
                >
                  {announcement?.status || "Unknown"}
                </span>

                <span
                  className="
                    inline-flex
                    rounded-full
                    border
                    border-gray-200
                    bg-gray-50
                    px-2.5
                    py-1
                    text-xs
                    font-semibold
                    text-gray-700
                  "
                >
                  {getAudienceLabel(announcement?.audience)}
                </span>

                {announcement?.reactions_count !== undefined && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-pink-200 bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-700">
                    <Heart size={12} className="fill-pink-500 text-pink-500" />
                    {announcement.reactions_count} reactions
                  </span>
                )}

                <span className="ml-auto text-xs text-gray-500">
                  {status === "draft"
                    ? "Draft (unissued)"
                    : `Published: ${formatDate(
                        announcement?.date_published || announcement?.created_at
                      )}`}
                </span>
              </div>

              {/* TITLE */}
              <div>
                <h3 className="text-xl font-bold leading-snug text-gray-900">
                  {announcement?.title || "Untitled Announcement"}
                </h3>

                {announcement?.announcement_id && (
                  <p className="mt-1 text-xs text-gray-400">
                    Announcement ID: {announcement.announcement_id}
                  </p>
                )}
              </div>

              {/* CONTENT */}
              <div
                className="
                  rounded-xl
                  border
                  border-gray-100
                  bg-gray-50/50
                  p-4
                "
              >
                {announcement?.content ? (
                  <div
                    className="
                      prose
                      prose-sm
                      max-w-none
                      text-gray-700
                      leading-relaxed
                      [&_a]:text-blue-600
                      [&_a]:underline
                    "
                    dangerouslySetInnerHTML={{
                      __html: announcement.content,
                    }}
                  />
                ) : (
                  <p className="text-sm italic text-gray-400">
                    No announcement content provided.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    Discussion Moderation
                  </h4>
                  <p className="text-xs text-gray-500">
                    Moderate user comments and replies or penalize abusive accounts.
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {totalCommentCount} discussion item(s)
                </span>
              </div>

              {comments.length === 0 ? (
                <div
                  className="
                    rounded-2xl
                    border
                    border-dashed
                    border-gray-200
                    py-16
                    text-center
                  "
                >
                  <MessageCircle
                    size={32}
                    className="mx-auto text-gray-300"
                  />
                  <p className="mt-3 text-sm font-medium text-gray-600">
                    No comments yet
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    User comments and replies on this announcement will appear here for moderation.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <CommentCard
                      key={comment.comment_id}
                      comment={comment}
                      isReply={false}
                      onModerate={handleModerate}
                      onPenalty={handlePenalty}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          className="
            flex
            shrink-0
            items-center
            justify-end
            gap-3
            border-t
            border-gray-200
            bg-gray-50
            px-6
            py-4
          "
        >
          <button
            type="button"
            onClick={onClose}
            className="
              h-10
              rounded-lg
              border
              border-gray-300
              bg-white
              px-4
              text-sm
              font-semibold
              text-gray-700
              transition
              hover:bg-gray-50
            "
          >
            Close
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                onClose?.();
                onEdit?.(announcement);
              }}
              className="
                flex
                h-10
                items-center
                justify-center
                gap-2
                rounded-lg
                bg-[#08511f]
                px-4
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-[#063d18]
              "
            >
              <FileEdit size={16} />
              Edit Announcement
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};


export default ViewAnnouncementModal;
