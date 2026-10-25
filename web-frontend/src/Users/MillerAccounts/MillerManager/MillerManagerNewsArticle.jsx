import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Share2,
  Send,
  Flag,
  Edit2,
  Trash2,
  MessageSquare,
  CornerDownRight,
  AlertCircle,
  Megaphone,
  Newspaper,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import RichArticleContent, {
  resolveMediaUrl,
} from "../../../Components/Minor-Components/RichArticleContent";
import ReportCommentModal from "../../../Components/Modals/NewsUpdates/ReportCommentModal";
import ProfanityWarningModal from "../../../Components/Modals/NewsUpdates/ProfanityWarningModal";
import ShareArticleModal from "../../../Components/Modals/NewsUpdates/ShareArticleModal";
import useToast from "../../../Components/hooks/useToast";
import Toast from "../../../Components/Modals/Toast";
import useApi from "../../../Components/hooks/useApi";

export default function MillerManagerNewsArticle() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const { request } = useApi();

  const isAnnouncement =
    searchParams.get("type") === "announcement" || String(id).startsWith("announcement");
  const cleanId = String(id).replace(/^(announcement|news)-/, "");

  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interaction states
  const [isLiked, setIsLiked] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Comment input
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Inline Reply state
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Inline Edit state: { id, isReply, text }
  const [editingItem, setEditingItem] = useState(null);
  const [editText, setEditText] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Modals
  const [reportingComment, setReportingComment] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [profanityModal, setProfanityModal] = useState({
    isOpen: false,
    message: "",
    matches: [],
  });

  // Load article & comments
  const loadArticleData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isAnnouncement) {
        const res = await request(`/announcements/${cleanId}/user-detail/`, {
          method: "GET",
        });

        if (res && res.data) {
          const art = res.data.article || res.data || {};
          const artSlug = art.slug || cleanId;
          if (art.slug && cleanId !== art.slug && /^\d+$/.test(String(cleanId))) {
            window.history.replaceState(
              null,
              "",
              `/miller-manager/news-updates/${art.slug}?type=announcement`
            );
          }
          setArticle({
            id: art.announcement_id || cleanId,
            slug: artSlug,
            item_type: "announcement",
            title: art.title,
            content: art.content || "",
            image_url: art.image_url,
            category: art.category || "Announcement from the admin",
            category_color: "bg-indigo-100 text-indigo-700 border border-indigo-200",
            source: art.source_name || "GrainRise Admin",
            date: art.date_published || art.created_at || "",
          });
          setIsLiked(Boolean(art.is_liked));
          setLikeCount(art.reaction_count || 0);
          setComments(art.comments || []);
        } else if (res && res.error) {
          throw new Error(res.error);
        }
      } else {
        // News article
        const [artRes, commRes] = await Promise.all([
          request(`/news/${cleanId}/`, { method: "GET" }),
          request(`/news/${cleanId}/comments/?limit=50`, { method: "GET" }),
        ]);

        if (artRes && artRes.data) {
          const art = artRes.data.article || artRes.data || {};
          const artSlug = art.slug || cleanId;
          if (art.slug && cleanId !== art.slug && /^\d+$/.test(String(cleanId))) {
            window.history.replaceState(
              null,
              "",
              `/miller-manager/news-updates/${art.slug}?type=news`
            );
          }
          setArticle({
            id: art.news_id || cleanId,
            slug: artSlug,
            item_type: "news",
            title: art.title,
            content: art.article_body || art.description || "",
            image_url: art.image_url,
            category: (art.category_code || "General Agriculture")
              .replace("_", " ")
              .toUpperCase(),
            category_color: "bg-emerald-100 text-emerald-700 border border-emerald-200",
            source: art.source_name || "GrainRise News",
            date: art.published_at || art.first_fetched_at || "",
          });
          setIsLiked(Boolean(art.is_liked || art.has_liked));
          setLikeCount(art.reaction_count || 0);
        } else if (artRes && artRes.error) {
          throw new Error(artRes.error);
        }

        if (commRes && commRes.data) {
          const commList =
            commRes.data.comments ||
            commRes.data.items ||
            [];
          setComments(commList);
        }
      }
    } catch (err) {
      console.error("Failed to load article:", err);
      setError(err?.message || "Failed to load article.");
    } finally {
      setIsLoading(false);
    }
  }, [cleanId, isAnnouncement, request]);

  useEffect(() => {
    loadArticleData();
  }, [loadArticleData]);

  // Like / Unlike action
  const handleLikeToggle = async () => {
    const prevLiked = isLiked;
    const prevCount = likeCount;

    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const endpoint = isAnnouncement
        ? `/announcements/${cleanId}/reaction/`
        : `/news/${cleanId}/reaction/`;

      const res = await request(endpoint, {
        method: "POST",
      });

      if (res && res.data) {
        const resData = res.data;
        if (resData.is_liked !== undefined) setIsLiked(resData.is_liked);
        if (resData.reaction_count !== undefined) setLikeCount(resData.reaction_count);
      } else if (res && res.error) {
        setIsLiked(prevLiked);
        setLikeCount(prevCount);
        showToast({
          type: "error",
          title: "Error",
          message: res.error || "Could not update reaction.",
        });
      }
    } catch (err) {
      console.error("Like toggle failed:", err);
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      showToast({
        type: "error",
        title: "Error",
        message: "Could not update reaction.",
      });
    }
  };

  // Helper to handle profanity / restriction errors
  const handleApiError = (errData, fallbackMsg) => {
    const code = errData?.code;
    const msg = errData?.message || errData?.error || fallbackMsg;

    if (
      code === "profanity_detected" ||
      msg?.toLowerCase().includes("prohibited") ||
      msg?.toLowerCase().includes("inappropriate")
    ) {
      setProfanityModal({
        isOpen: true,
        message: msg || "Your comment contains prohibited words that violate GrainRise guidelines.",
        matches: errData?.matches || [],
      });
      return;
    }

    if (
      code === "commenting_restricted" ||
      msg?.toLowerCase().includes("restricted")
    ) {
      showToast({
        type: "error",
        title: "Commenting Restricted",
        message: msg || "Your commenting ability is temporarily restricted.",
      });
      return;
    }

    showToast({
      type: "error",
      title: "Error",
      message: msg,
    });
  };

  // Submit Root Comment
  const handlePostComment = async (e) => {
    e.preventDefault();
    const trimmed = newCommentText.trim();
    if (!trimmed) return;

    setIsSubmittingComment(true);
    try {
      const endpoint = isAnnouncement
        ? `/announcements/${cleanId}/comments/`
        : `/news/${cleanId}/comments/`;

      const res = await request(endpoint, {
        method: "POST",
        body: { comment_text: trimmed },
      });

      if (res && res.data) {
        setNewCommentText("");
        showToast({
          type: "success",
          title: "Success",
          message: "Comment posted.",
        });
        loadArticleData();
      } else {
        handleApiError(res?.data || res, "Unable to post comment.");
      }
    } catch (err) {
      console.error("Error posting comment:", err);
      handleApiError(err?.data, err?.message || "Failed to post comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Submit Reply
  const handlePostReply = async (parentCommentId) => {
    const trimmed = replyText.trim();
    if (!trimmed) return;

    setIsSubmittingReply(true);
    try {
      const endpoint = isAnnouncement
        ? `/announcements/comments/${parentCommentId}/replies/`
        : `/news/${cleanId}/comments/`;

      const payload = isAnnouncement
        ? { comment_text: trimmed }
        : { comment_text: trimmed, parent_comment_id: parentCommentId };

      const res = await request(endpoint, {
        method: "POST",
        body: payload,
      });

      if (res && res.data) {
        setReplyingToId(null);
        setReplyText("");
        showToast({
          type: "success",
          title: "Success",
          message: "Reply posted.",
        });
        loadArticleData();
      } else {
        handleApiError(res?.data || res, "Unable to post reply.");
      }
    } catch (err) {
      console.error("Error posting reply:", err);
      handleApiError(err?.data, err?.message || "Failed to post reply.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Edit Comment / Reply
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const trimmed = editText.trim();
    if (!trimmed) return;

    setIsSubmittingEdit(true);
    try {
      let endpoint = "";
      if (isAnnouncement) {
        endpoint = editingItem.isReply
          ? `/announcements/replies/${editingItem.id}/`
          : `/announcements/comments/${editingItem.id}/`;
      } else {
        endpoint = `/news/comments/${editingItem.id}/`;
      }

      const res = await request(endpoint, {
        method: "PATCH",
        body: { comment_text: trimmed },
      });

      if (res && res.data) {
        setEditingItem(null);
        setEditText("");
        showToast({
          type: "success",
          title: "Success",
          message: "Comment updated.",
        });
        loadArticleData();
      } else {
        handleApiError(res?.data || res, "Unable to save edits.");
      }
    } catch (err) {
      console.error("Error updating comment:", err);
      handleApiError(err?.data, err?.message || "Failed to update.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Comment / Reply
  const handleDeleteComment = async (itemId, isReply = false) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    try {
      let endpoint = "";
      if (isAnnouncement) {
        endpoint = isReply
          ? `/announcements/replies/${itemId}/`
          : `/announcements/comments/${itemId}/`;
      } else {
        endpoint = `/news/comments/${itemId}/`;
      }

      const res = await request(endpoint, {
        method: "DELETE",
      });

      if (res && (res.data || res.success)) {
        showToast({
          type: "success",
          title: "Success",
          message: "Comment deleted.",
        });
        loadArticleData();
      } else {
        showToast({
          type: "error",
          title: "Error",
          message: res?.error || "Failed to delete comment.",
        });
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
      showToast({
        type: "error",
        title: "Error",
        message: err?.message || "Unable to delete.",
      });
    }
  };

  // Report Comment
  const handleReportComment = async (reason) => {
    if (!reportingComment) return;

    const commentId = reportingComment.comment_id || reportingComment.id;
    const targetType = isAnnouncement ? "announcement" : "news";

    const res = await request("/news/report-comment/", {
      method: "POST",
      body: {
        comment_id: commentId,
        comment_type: targetType,
        reason,
        title: article?.title,
      },
    });

    if (res && res.data) {
      showToast({
        type: "success",
        title: "Success",
        message: "Report submitted. Thank you for helping keep GrainRise safe.",
      });
    } else {
      throw new Error(res?.error || "Unable to submit comment report.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const totalCommentCount = comments.reduce(
    (acc, c) =>
      acc +
      (c.comment_status !== "deleted" ? 1 : 0) +
      (c.replies?.filter((r) => r.comment_status !== "deleted").length || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Breadcrumbs & Back ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Breadcrumbs
          items={[
            { label: "Resources" },
            { label: "News & Updates", path: "/miller-manager/news-updates" },
            { label: article ? article.title.slice(0, 45) + "…" : "Article" },
          ]}
        />

        <button
          type="button"
          onClick={() => navigate("/miller-manager/news-updates")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-700 transition font-medium cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to News &amp; Updates</span>
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center space-y-3 shadow-xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-r-transparent" />
          <p className="text-sm font-semibold text-slate-500">Loading article...</p>
        </div>
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-2xl p-10 text-center space-y-3 shadow-xs">
          <AlertCircle size={32} className="mx-auto text-red-500" />
          <h3 className="text-base font-bold text-slate-800">Article Unavailable</h3>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      ) : article ? (
        <>
          {/* ── Article Card ─────────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-7 pt-7 pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${article.category_color}`}
                >
                  {article.category}
                </span>
                <span className="text-xs text-gray-500">
                  {article.source} &nbsp;·&nbsp; {formatDate(article.date)}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-snug">
                {article.title}
              </h1>
            </div>

            {/* Featured Image or Clean Placeholder */}
            {(() => {
              const resolvedImageUrl = resolveMediaUrl(article.image_url);
              if (resolvedImageUrl && !imageError) {
                return (
                  <div className="w-full bg-slate-900/5 flex items-center justify-center border-b border-slate-100 overflow-hidden py-3 sm:py-6 px-4">
                    <img
                      src={resolvedImageUrl}
                      alt={article.title}
                      className="max-h-[520px] w-auto max-w-full h-auto object-contain rounded-xl shadow-xs"
                      onError={() => setImageError(true)}
                    />
                  </div>
                );
              }
              return (
                <div className="w-full py-8 sm:py-12 bg-gradient-to-br from-amber-50/60 via-slate-50 to-emerald-50/30 border-b border-slate-100 flex flex-col items-center justify-center text-center px-4 select-none">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2.5 shadow-2xs ${
                    isAnnouncement ? "bg-amber-100/90 text-amber-800 border border-amber-200" : "bg-emerald-100/90 text-emerald-800 border border-emerald-200"
                  }`}>
                    {isAnnouncement ? <Megaphone size={24} /> : <Newspaper size={24} />}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {isAnnouncement ? "Official Admin Announcement" : "GrainRise News"}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Verified supply chain advisory
                  </span>
                </div>
              );
            })()}

            <div className="px-7 py-6">
              <RichArticleContent content={article.content} />
            </div>

            {/* Interaction Footer (Like & Share ONLY; Bookmark REMOVED) */}
            <div className="px-7 py-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleLikeToggle}
                className={`flex items-center gap-2 text-sm font-semibold transition cursor-pointer ${
                  isLiked ? "text-emerald-700" : "text-gray-500 hover:text-emerald-700"
                }`}
              >
                <Heart
                  size={18}
                  className={isLiked ? "fill-emerald-700 text-emerald-700" : ""}
                />
                <span>{likeCount} Likes</span>
              </button>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              >
                <Share2 size={15} />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* ── Comments Section ────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-7 py-6 space-y-6">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <MessageSquare size={18} />
              <span>Comments ({totalCommentCount})</span>
            </h3>

            {/* Root Comment Form */}
            <form onSubmit={handlePostComment} className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-[#0B5D1E] text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-xs">
                M
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#0B5D1E] outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !newCommentText.trim()}
                  className="bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Send size={14} />
                  <span>{isSubmittingComment ? "Posting..." : "Post"}</span>
                </button>
              </div>
            </form>

            {/* Comments Tree */}
            <div className="space-y-6 divide-y divide-gray-100">
              {comments.length === 0 ? (
                <p className="text-xs text-gray-400 italic pt-2">
                  No comments yet. Be the first to share your thoughts!
                </p>
              ) : (
                comments.map((c) => {
                  const commentId = c.comment_id || c.id;
                  const isDeleted = c.comment_status === "deleted";
                  const commentText = c.comment_text || c.comment_content || "";
                  const author = c.author_name || c.author || "User";
                  const dateStr = formatDate(c.created_at || c.date);
                  const isMine = Boolean(c.is_mine);

                  return (
                    <div key={commentId} className="pt-4 first:pt-0 space-y-3">
                      {/* Root Comment */}
                      <div className="rounded-xl p-3.5 bg-slate-50/70 border border-slate-100 space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-slate-800">
                            {author}{" "}
                            {isMine && (
                              <span className="text-[10px] text-emerald-700 font-semibold">
                                (You)
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-400">{dateStr}</span>
                        </div>

                        {editingItem?.id === commentId && !editingItem.isReply ? (
                          <div className="space-y-2 pt-1">
                            <textarea
                              rows={2}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-emerald-600"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingItem(null)}
                                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={isSubmittingEdit || !editText.trim()}
                                onClick={handleSaveEdit}
                                className="px-3 py-1 rounded-lg bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                              >
                                {isSubmittingEdit ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className={`text-xs text-slate-700 ${
                              isDeleted ? "italic text-slate-400" : ""
                            }`}
                          >
                            {commentText}
                          </p>
                        )}

                        {/* Facebook-style Inline Actions */}
                        {!isDeleted && (
                          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 pt-1 border-t border-slate-100/80">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingToId(
                                  replyingToId === commentId ? null : commentId
                                );
                                setReplyText("");
                              }}
                              className="hover:text-emerald-700 transition cursor-pointer"
                            >
                              Reply
                            </button>

                            {isMine ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItem({
                                      id: commentId,
                                      isReply: false,
                                    });
                                    setEditText(commentText);
                                  }}
                                  className="flex items-center gap-1 hover:text-emerald-700 transition cursor-pointer"
                                >
                                  <Edit2 size={11} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(commentId, false)}
                                  className="flex items-center gap-1 hover:text-red-600 text-red-500 transition cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                  <span>Delete</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setReportingComment(c)}
                                className="flex items-center gap-1 hover:text-red-600 transition cursor-pointer"
                              >
                                <Flag size={11} />
                                <span>Report</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Reply Input Box */}
                      {replyingToId === commentId && (
                        <div className="ml-6 sm:ml-8 flex gap-2 items-center bg-white border border-slate-200 rounded-xl p-2 animate-in fade-in duration-100">
                          <CornerDownRight size={14} className="text-slate-400 ml-1 shrink-0" />
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handlePostReply(commentId)}
                            placeholder={`Reply to ${author}...`}
                            className="flex-1 text-xs text-slate-800 outline-none px-2 py-1"
                          />
                          <button
                            type="button"
                            onClick={() => setReplyingToId(null)}
                            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isSubmittingReply || !replyText.trim()}
                            onClick={() => handlePostReply(commentId)}
                            className="bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-lg px-3 py-1 text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            {isSubmittingReply ? "Replying..." : "Reply"}
                          </button>
                        </div>
                      )}

                      {/* Replies List */}
                      {c.replies && c.replies.length > 0 && (
                        <div className="ml-6 sm:ml-8 space-y-2 border-l-2 border-emerald-100 pl-3">
                          {c.replies.map((r) => {
                            const replyId = r.reply_id || r.comment_id || r.id;
                            const rDeleted = r.comment_status === "deleted";
                            const rText = r.reply_content || r.comment_text || "";
                            const rAuthor = r.author_name || r.author || "User";
                            const rDate = formatDate(r.created_at || r.date);
                            const rIsMine = Boolean(r.is_mine);

                            return (
                              <div
                                key={replyId}
                                className="rounded-xl p-3 bg-white border border-slate-100 space-y-1.5 shadow-2xs"
                              >
                                <div className="flex justify-between items-baseline">
                                  <span className="text-[11px] font-bold text-slate-800">
                                    {rAuthor}{" "}
                                    {rIsMine && (
                                      <span className="text-[10px] text-emerald-700 font-semibold">
                                        (You)
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{rDate}</span>
                                </div>

                                {editingItem?.id === replyId && editingItem.isReply ? (
                                  <div className="space-y-2 pt-1">
                                    <textarea
                                      rows={2}
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-emerald-600"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => setEditingItem(null)}
                                        className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSubmittingEdit || !editText.trim()}
                                        onClick={handleSaveEdit}
                                        className="px-3 py-1 rounded-lg bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                                      >
                                        {isSubmittingEdit ? "Saving..." : "Save"}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p
                                    className={`text-xs text-slate-700 ${
                                      rDeleted ? "italic text-slate-400" : ""
                                    }`}
                                  >
                                    {rText}
                                  </p>
                                )}

                                {/* Inline Actions for Reply */}
                                {!rDeleted && (
                                  <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500 pt-1 border-t border-slate-50">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReplyingToId(commentId);
                                        setReplyText(`@${rAuthor} `);
                                      }}
                                      className="hover:text-emerald-700 transition cursor-pointer"
                                    >
                                      Reply
                                    </button>

                                    {rIsMine ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingItem({
                                              id: replyId,
                                              isReply: true,
                                            });
                                            setEditText(rText);
                                          }}
                                          className="flex items-center gap-1 hover:text-emerald-700 transition cursor-pointer"
                                        >
                                          <Edit2 size={10} />
                                          <span>Edit</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteComment(replyId, true)}
                                          className="flex items-center gap-1 hover:text-red-600 text-red-500 transition cursor-pointer"
                                        >
                                          <Trash2 size={10} />
                                          <span>Delete</span>
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setReportingComment(r)}
                                        className="flex items-center gap-1 hover:text-red-600 transition cursor-pointer"
                                      >
                                        <Flag size={10} />
                                        <span>Report</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* Modals */}
      <ReportCommentModal
        isOpen={Boolean(reportingComment)}
        onClose={() => setReportingComment(null)}
        comment={reportingComment}
        articleTitle={article?.title || ""}
        onSubmitReport={handleReportComment}
      />

      <ProfanityWarningModal
        isOpen={profanityModal.isOpen}
        onClose={() => setProfanityModal({ isOpen: false, message: "", matches: [] })}
        message={profanityModal.message}
        matches={profanityModal.matches}
      />

      {article && (
        <ShareArticleModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          article={article}
        />
      )}
    </div>
  );
}
