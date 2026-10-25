import React, { useState } from "react";
import {
  ChevronLeft,
  Bookmark,
  Share2,
  ExternalLink,
  Heart,
  MessageCircle,
  Info,
  Send,
  CornerDownRight,
  ChevronDown,
  Flag,
} from "lucide-react";
import ReportCommentModal from "../../../Components/Modals/NewsUpdates/ReportCommentModal";
import useNewsUpdates from "../../../Components/hooks/NewsUpdates/useNewsUpdates";

export default function RetailerMobileArticleDetailView({
  article,
  onBack,
  userInitials = "KA",
}) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(24);
  const [commentText, setCommentText] = useState("");
  const [reportingComment, setReportingComment] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const { reportNewsComment } = useNewsUpdates();

  const handleReportComment = async (reason) => {
    if (!reportingComment) return;
    try {
      await reportNewsComment({
        commentId: reportingComment.id,
        reason,
        title: article?.title || "News Article",
      });
      setFeedback({ type: "success", text: "Report submitted successfully." });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: "error", text: err?.message || "Unable to submit report." });
      setTimeout(() => setFeedback(null), 4000);
    }
  };
  const [comments, setComments] = useState([
    {
      id: "c-1",
      author: "Ricardo Gomez",
      initials: "RG",
      avatarBg: "bg-slate-200 text-slate-700",
      date: "Aug 25, 2026 - 5:15 PM",
      text: "We need more updates on local logistics costs too. The transport rates from Central Luzon are eating into these retail margins.",
      likes: 4,
      isLiked: false,
      replies: [
        {
          id: "r-1",
          author: "Maria Lourdes (ABC Warehouse)",
          initials: "ML",
          avatarBg: "bg-emerald-100 text-emerald-800",
          time: "6:30 PM",
          text: "Agreed Ricardo. Warehouse ABC has consolidated batch dispatches every Tuesday to help retailers lower inter-provincial freight charges.",
        },
      ],
    },
    {
      id: "c-2",
      author: "Danilo Santos",
      initials: "DS",
      avatarBg: "bg-blue-100 text-blue-800",
      date: "Aug 25, 2026 - 4:40 PM",
      text: "Good advice on securing Dinorado stocks early. We noticed price increases of ₱50 per 50kg bag starting this week.",
      likes: 2,
      isLiked: false,
      replies: [],
    },
  ]);

  const handleToggleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikesCount((prev) => prev - 1);
    } else {
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
    }
  };

  const handlePostComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      id: `c-${Date.now()}`,
      author: "Kerbie Hector Abanid",
      initials: userInitials,
      avatarBg: "bg-[#00580C] text-white",
      date: "Just now",
      text: commentText.trim(),
      likes: 0,
      isLiked: false,
      replies: [],
    };

    setComments((prev) => [newComment, ...prev]);
    setCommentText("");
  };

  return (
    <div className="bg-white min-h-full -mx-4 -mt-4 px-4 py-3 space-y-4 font-sans antialiased text-gray-900 pb-16">
      {/* ── Subheader Navigation Bar matching Figma ───────────────── */}
      <div className="flex items-center justify-between py-2 border-b border-gray-100 -mx-4 px-4 sticky top-0 bg-white/95 backdrop-blur-xs z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-800 hover:text-[#00580C] transition-colors cursor-pointer py-1"
        >
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
            <ChevronLeft size={16} />
          </div>
          <span className="text-sm">News &amp; Updates</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isSaved
                ? "bg-emerald-50 text-[#00580C]"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            title="Bookmark"
          >
            <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "Global Rice Prices Hit 15-Year High Amid Export Restrictions",
                  url: window.location.href,
                });
              }
            }}
            className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* ── Article Header ────────────────────────────────────────── */}
      <div className="space-y-2 pt-1">
        <span className="inline-block text-[9.5px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider bg-[#FEF3C7] text-[#B45309]">
          MARKET TRENDS
        </span>

        <h1 className="text-lg font-black text-gray-900 leading-snug tracking-tight">
          Global Rice Prices Hit 15-Year High Amid Export Restrictions
        </h1>

        <p className="text-[11px] text-gray-400 font-medium">
          Source: <strong className="text-gray-600 font-semibold">Agrinews</strong> · Aug 24, 2026 - 10:30 AM
        </p>
      </div>

      {/* ── Hero Image & Caption ───────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-2xs aspect-16/10 bg-gray-100">
          <img
            src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=900&q=80"
            alt="Field monitoring and grain trade analysis"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-[10px] text-gray-400 italic">
          Photo: Agricultural field monitoring and grain trade analysis.
        </p>
      </div>

      {/* ── Article Body Paragraphs ────────────────────────────────── */}
      <div className="space-y-3.5 text-xs text-gray-700 leading-relaxed font-normal">
        <p>
          International rice benchmarks have surged to their highest levels in over fifteen years following intensified export restrictions and climate-induced yield variances across major South and Southeast Asian producing regions. The sharp movement has prompted agricultural supply networks and regional retailers to re-evaluate procurement strategies heading into the final quarter.
        </p>

        <p>
          According to latest market telemetry from trade monitoring groups, Thai white rice and regional aromatic varieties experienced consecutive monthly gains of 4.8% to 6.2%. Domestic millers and local grain distributors are currently navigating fluctuating freight tariffs while balancing seasonal buffer stock reserves.
        </p>

        {/* ── Key Takeaway Callout Box matching Figma ───────────────── */}
        <div className="bg-[#F0FDF4] border-l-4 border-[#00580C] rounded-r-2xl p-3.5 space-y-1.5 shadow-2xs my-2">
          <div className="flex items-center gap-1.5 text-[#00580C]">
            <Info size={14} className="shrink-0" />
            <h3 className="text-[11px] font-extrabold uppercase tracking-wide">
              KEY TAKEAWAY FOR RETAILERS:
            </h3>
          </div>
          <p className="text-xs text-gray-800 leading-relaxed font-medium pl-5">
            Retail operators are advised to lock in supply contracts for staple variants (Dinorado, Sinandomeng) early to hedge against anticipated transportation surcharge revisions.
          </p>
        </div>

        <p>
          Industry analysts recommend that municipal retailers maintain close coordination with accredited regional warehouses to monitor scheduled delivery dispatches and optimize warehouse replenishment schedules.
        </p>
      </div>

      {/* ── View Original Article Button ────────────────────────────── */}
      <div className="pt-2">
        <button
          onClick={() => {}}
          className="w-full py-2.5 bg-white border border-gray-200 hover:border-[#00580C] hover:text-[#00580C] text-gray-700 text-xs font-bold rounded-2xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>View Original Article</span>
          <ExternalLink size={13} />
        </button>
      </div>

      {/* ── Likes & Share Engagement Row ────────────────────────────── */}
      <div className="pt-2 pb-2 border-b border-gray-100 flex items-center justify-between">
        <button
          onClick={handleToggleLike}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            isLiked
              ? "bg-[#EBF7EE] text-[#00580C]"
              : "bg-gray-50 text-gray-700 hover:bg-[#EBF7EE] hover:text-[#00580C]"
          }`}
        >
          <Heart
            size={14}
            className={isLiked ? "text-[#00580C]" : "text-gray-500"}
            fill={isLiked ? "currentColor" : "none"}
          />
          <span>{likesCount} Likes</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-500 font-semibold">
          <button
            onClick={() => {}}
            className="flex items-center gap-1 hover:text-gray-900 cursor-pointer"
          >
            <Share2 size={13} />
            <span>Share</span>
          </button>
          <button
            onClick={() => setIsSaved(!isSaved)}
            className="flex items-center gap-1 hover:text-gray-900 cursor-pointer"
          >
            <Bookmark size={13} fill={isSaved ? "currentColor" : "none"} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* ── Comments Section matching Figma ─────────────────────────── */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-gray-900">
            Comments ({comments.length + 1})
          </h2>
          <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium cursor-pointer">
            <span>Sort by: <strong className="text-gray-700 font-semibold">Newest</strong></span>
            <ChevronDown size={12} />
          </div>
        </div>

        {/* New Comment Input Box */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#00580C] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
              {userInitials}
            </div>
            <textarea
              rows={2}
              placeholder="Write a comment or question about this report..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full text-xs text-gray-900 placeholder-gray-400 outline-none resize-none"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={handlePostComment}
              className="px-3.5 py-1.5 bg-[#00580C] hover:bg-[#004209] text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Post Comment</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className={`p-2.5 rounded-xl text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}>
            {feedback.text}
          </div>
        )}

        {/* Comment Thread List */}
        <div className="space-y-4 pt-1">
          {comments.map((c) => (
            <div key={c.id} className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${c.avatarBg}`}
                >
                  {c.initials}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-900 text-xs truncate">
                      {c.author}
                    </span>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      · {c.date}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-xs">
                    {c.text}
                  </p>
                  <div className="flex items-center gap-3 pt-0.5 text-[11px] text-gray-400 font-semibold">
                    <button className="text-[#00580C] hover:underline cursor-pointer">
                      Reply
                    </button>
                    <button className="flex items-center gap-1 hover:text-gray-600 cursor-pointer">
                      <Heart size={11} />
                      <span>{c.likes} Likes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportingComment(c)}
                      className="flex items-center gap-1 hover:text-red-600 cursor-pointer text-gray-400"
                    >
                      <Flag size={11} />
                      <span>Report</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Nested Replies */}
              {c.replies && c.replies.length > 0 && (
                <div className="ml-5 pl-3 border-l-2 border-emerald-300 space-y-2 pt-1">
                  {c.replies.map((r) => (
                    <div key={r.id} className="flex items-start gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${r.avatarBg}`}
                      >
                        {r.initials}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-gray-900 text-[11px] truncate">
                            {r.author}
                          </span>
                          <span className="text-[9.5px] text-gray-400">
                            · {r.time}
                          </span>
                        </div>
                        <p className="text-gray-700 text-xs leading-relaxed">
                          {r.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ReportCommentModal
        isOpen={Boolean(reportingComment)}
        onClose={() => setReportingComment(null)}
        comment={reportingComment}
        articleTitle={article?.title || ""}
        onSubmitReport={handleReportComment}
      />
    </div>
  );
}
