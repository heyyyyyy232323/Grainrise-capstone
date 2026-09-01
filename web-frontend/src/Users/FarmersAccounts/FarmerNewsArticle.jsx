import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Heart, Share2, Bookmark, Send, ThumbsUp, ChevronRight,
} from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import field1 from "../../assets/field1.png";
import field2 from "../../assets/field2.png";

/* ─── Mock article data ─────────────────────────────────────────── */
const ARTICLES = {
  1: {
    id: 1,
    category: "Market Trends",
    categoryColor: "bg-yellow-100 text-yellow-700",
    source: "Agrinews",
    date: "Aug 24, 2026 · 10:30 AM",
    title: "Global Rice Prices Hit 15-Year High Amid Export Restrictions",
    image: field1,
    content: `
      Global rice prices have surged to their highest levels in 15 years, driven by a confluence of severe weather events in major producing regions and newly implemented export restrictions by key Southeast Asian suppliers. The benchmark Thai white rice 5% broken has climbed sharply, signaling tightening global supplies and triggering concerns over food security in import-dependent nations.

      For local farmers, this global supply shock presents a complex scenario. While farmgate prices for domestically produced rice are expected to see upward pressure, providing a potential boost to short-term revenues, the broader economic implications are significant. Input costs, particularly fertilizers and fuel which are often tied to similar global macro-trends, remain stubbornly high, potentially offsetting the gains from improved crop pricing.

      Analysts suggest that the export bans are a precautionary measure by governments aiming to stabilize their domestic markets ahead of continued global uncertainty. Industry veterans are urging farmers to capitalize on the favorable crop cycle, adjust resource allocation, and embrace market intelligence. The community remains in a state of heightened volatility, requiring meticulous crop planning, efficient resource allocation, and robust market intelligence.

      To navigate the impact of these fluctuations, experts recommend adopting more resilient farming practices, such as investing in drought-tolerant seed varieties and improving water management systems. Additionally, diversifying crops and accessing agricultural credit and expanding agri-insurance coverage can help cushion the blow of unpredictable market dynamics. As the situation evolves, staying informed and adaptable will be crucial for farmers seeking to thrive in an increasingly competitive agricultural landscape.
    `,
    likes: 34,
    comments: [
      {
        id: 1,
        author: "Ricardo Gomez",
        date: "Aug 29, 2026 · 4:18 PM",
        text: "We need more updates on local logistics costs too. The transport rates are eating into these margins.",
        replies: [
          {
            id: 2,
            author: "Ricardo Gomez",
            date: "Aug 29, 2026 · 4:20 PM",
            text: "We need more updates on local logistics costs too. The transport rates are eating into these margins.",
          },
        ],
      },
    ],
  },
  2: {
    id: 2,
    category: "Advisory & Best Practices",
    categoryColor: "bg-blue-100 text-blue-700",
    source: "PAGASA",
    date: "Aug 17, 2026 · 08:15 AM",
    title: "El Niño Preparations: Water Management Strategies for Q4",
    image: field2,
    content: `
      With projected rainfall deficits approaching in the final quarter, agricultural experts strongly recommend immediate implementation of efficient irrigation scheduling and soil moisture conservation techniques across all registered farm areas.

      The Philippine Atmospheric, Geophysical and Astronomical Services Administration (PAGASA) has issued an advisory urging farmers to prepare for a prolonged dry spell that could affect major rice-producing regions. The agency recommends adopting alternate wetting and drying (AWD) irrigation methods, which can reduce water use by up to 30% while maintaining comparable yields.

      Farmers are also advised to consider drought-tolerant rice varieties, ensure their irrigation infrastructure is well-maintained, and coordinate with local water management councils for equitable distribution of available water resources.

      Community-based water management systems have proven effective in similar El Niño events, with farmers who proactively organized water user associations reporting significantly less yield loss compared to those who did not.
    `,
    likes: 56,
    comments: [],
  },
  3: {
    id: 3,
    category: "Grant Programs & Support",
    categoryColor: "bg-green-100 text-green-700",
    source: "National Agri Board",
    date: "Aug 10, 2026 · 02:30 PM",
    title: "New Fertilizer Discount Vouchers Available for Registration",
    image: field1,
    content: `
      Eligible registered farmers can now apply for the Q3 fertilizer discount voucher program through the centralized portal. The program aims to offset rising input costs and ensure that smallholder farmers can access affordable fertilizers during the critical planting season.

      The National Agriculture Board has allocated ₱2.5 billion for this initiative, which is expected to benefit over 500,000 registered farmers nationwide. Applicants must have an updated Farm Registration Certificate and a valid government-issued ID. The discount covers up to 40% of fertilizer costs, capped at ₱5,000 per hectare.

      Registration can be done online through the DA eServices portal or at any Regional Field Office. The program runs until October 31, 2026, or until funds are exhausted. Farmers are urged to apply early to secure their allocation.
    `,
    likes: 112,
    comments: [],
  },
};

/* ─── Component ─────────────────────────────────────────────────── */
export default function FarmerNewsArticle() {
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
        author: "You",
        date: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
        text: comment.trim(),
        replies: [],
      },
    ]);
    setComment("");
  };

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs ──────────────────────────────────────────────── */}
      <Breadcrumbs
        items={[
          { label: "Resources" },
          { label: "News & Updates", path: "/farmer/news-updates" },
          { label: article.title.slice(0, 40) + "…" },
        ]}
      />

      {/* ── Back button ──────────────────────────────────────────────── */}
      <button
        onClick={() => navigate("/farmer/news-updates")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-700 transition-colors font-medium"
      >
        <ArrowLeft size={16} /> Back to News &amp; Updates
      </button>

      {/* ── Article card ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Category + meta */}
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

        {/* Hero image */}
        <div className="w-full h-56 md:h-80 overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Body */}
        <div className="px-7 py-6">
          {article.content.trim().split("\n\n").map((para, i) => (
            <p key={i} className="text-sm md:text-base text-gray-700 leading-relaxed mb-5 last:mb-0">
              {para.trim()}
            </p>
          ))}
        </div>

        {/* Reactions bar */}
        <div className="px-7 py-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                liked ? "text-green-700" : "text-gray-500 hover:text-green-700"
              }`}
            >
              <Heart size={18} fill={liked ? "currentColor" : "none"} />
              {likeCount} Likes
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSaved((p) => !p)}
              title="Save article"
              className={`p-2 rounded-lg transition-colors ${
                saved ? "text-green-700 bg-green-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
            </button>
            <button
              title="Share"
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Comments ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm px-7 py-6 space-y-6">
        <h3 className="font-bold text-gray-900 text-base">Comments ({comments.length})</h3>

        {/* New comment input */}
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-green-700 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">Y</span>
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
              placeholder="Write a comment..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
            />
            <button
              onClick={handleComment}
              className="bg-green-700 hover:bg-green-800 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Send size={14} /> Post Comment
            </button>
          </div>
        </div>

        {/* Comment list */}
        <div className="space-y-5 divide-y divide-slate-100">
          {comments.map((c) => (
            <div key={c.id} className="pt-4 first:pt-0">
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-pink-400 flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-bold">
                    {c.author[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-800">{c.author}</span>
                    <span className="text-[11px] text-gray-400">{c.date}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{c.text}</p>
                  <button className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-700 transition-colors font-medium">
                    <ThumbsUp size={12} /> Reply
                  </button>

                  {/* Nested replies */}
                  {c.replies?.map((r) => (
                    <div key={r.id} className="mt-4 ml-6 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">{r.author[0]}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-800">{r.author}</span>
                          <span className="text-[11px] text-gray-400">{r.date}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No comments yet. Be the first to comment!</p>
          )}
        </div>
      </div>
    </div>
  );
}