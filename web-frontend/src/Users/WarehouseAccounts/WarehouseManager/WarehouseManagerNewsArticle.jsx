import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Share2,
  Bookmark,
  Send,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import field1 from "../../../assets/field1.png";
import field2 from "../../../assets/field2.png";

const ARTICLES = {
  1: {
    id: 1,
    category: "MARKET UPDATES",
    categoryColor: "bg-emerald-100 text-emerald-700",
    source: "Department of Agriculture",
    date: "August 20, 2026 · 10:00 AM",
    title: "Palay Buying Prices Show Stable Movement This Month",
    image: field1,
    content: `
      Recent market analysis indicate stable palay buying prices across selected agricultural areas, providing a predictable revenue stream for local producers and millers alike. Strategic reserve holdings are projected to maintain sufficient volume through the upcoming harvest transition.

      Milling facilities are advised to coordinate with local farmer cooperatives to streamline intake schedules and maintain quality standards during peak receiving windows.
    `,
    likes: 24,
    comments: [
      {
        id: 1,
        author: "Miller Manager - Nueva Ecija",
        date: "Aug 20, 2026 · 11:30 AM",
        text: "We have aligned our purchasing rates with the updated DA guidelines for this week's harvest intake.",
        replies: [],
      },
    ],
  },
  2: {
    id: 2,
    category: "ADVISORY & BEST PRACTICES",
    categoryColor: "bg-blue-100 text-blue-700",
    source: "PAGASA",
    date: "August 17, 2026 · 08:15 AM",
    title: "El Niño Preparations: Water Management Strategies for Q4",
    image: field2,
    content: `
      With projected rainfall deficits approaching in the final quarter, experts recommend immediate implementation of efficient irrigation scheduling and soil moisture conservation techniques.

      Commercial drying facilities should prepare for drier paddy intake while ensuring optimal moisture targets (13.5% - 14%) are maintained during continuous mechanical drying cycles.
    `,
    likes: 56,
    comments: [],
  },
  3: {
    id: 3,
    category: "GRANT PROGRAMS & SUPPORT",
    categoryColor: "bg-amber-100 text-amber-700",
    source: "National Agri Board",
    date: "August 10, 2026 · 02:30 PM",
    title: "New Fertilizer Discount Vouchers Available for Registration",
    image: field1,
    content: `
      Eligible registered farmers can now apply for the Q3 fertilizer discount voucher program through the centralized portal to offset rising input costs for the upcoming cropping cycle.
    `,
    likes: 112,
    comments: [],
  },
};

export default function MillerManagerNewsArticle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const article = ARTICLES[id] || ARTICLES[1];

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(article.likes);
  const [saved, setSaved] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(article.comments);

  const handleLike = () => {
    setLiked((prev) => !prev);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  const handleComment = () => {
    if (!comment.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: Date.now(),
        author: "Miller Manager",
        date: new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        text: comment.trim(),
        replies: [],
      },
    ]);
    setComment("");
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Resources" },
          { label: "News & Updates", path: "/miller-manager/news-updates" },
          { label: article.title.slice(0, 45) + "…" },
        ]}
      />

      <button
        type="button"
        onClick={() => navigate("/miller-manager/news-updates")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-700 transition font-medium cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to News &amp; Updates
      </button>

      <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-7 pt-7 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${article.categoryColor}`}>
              {article.category.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">{article.source} &nbsp;·&nbsp; {article.date}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-snug">
            {article.title}
          </h1>
        </div>

        <div className="w-full h-56 md:h-80 overflow-hidden">
          <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
        </div>

        <div className="px-7 py-6">
          {article.content.trim().split("\n\n").map((para, i) => (
            <p key={i} className="text-sm md:text-base text-gray-700 leading-relaxed mb-5 last:mb-0">
              {para.trim()}
            </p>
          ))}
        </div>

        <div className="px-7 py-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center gap-2 text-sm font-medium transition cursor-pointer ${
              liked ? "text-emerald-700" : "text-gray-500 hover:text-emerald-700"
            }`}
          >
            <Heart size={18} fill={liked ? "currentColor" : "none"} />
            {likeCount} Likes
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSaved((p) => !p)}
              className={`p-2 rounded-lg transition cursor-pointer ${saved ? "text-emerald-700 bg-emerald-50" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
            </button>
            <button type="button" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer">
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm px-7 py-6 space-y-6">
        <h3 className="font-bold text-gray-900 text-base">Comments ({comments.length})</h3>

        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-[#0B5D1E] text-white flex items-center justify-center shrink-0 font-bold text-sm">
            M
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
              placeholder="Write a comment..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white text-gray-800"
            />
            <button
              type="button"
              onClick={handleComment}
              className="bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Send size={14} /> Post
            </button>
          </div>
        </div>

        <div className="space-y-4 divide-y divide-gray-100">
          {comments.map((c) => (
            <div key={c.id} className="pt-4 first:pt-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-semibold text-gray-900">{c.author}</span>
                <span className="text-xs text-gray-400">{c.date}</span>
              </div>
              <p className="text-sm text-gray-700">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}