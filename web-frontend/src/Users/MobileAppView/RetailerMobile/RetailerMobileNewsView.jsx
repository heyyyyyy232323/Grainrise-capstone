import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Clock,
  Heart,
  MessageCircle,
  ArrowRight,
  RotateCw,
  ChevronLeft,
} from "lucide-react";
import RetailerMobileArticleDetailView from "./RetailerMobileArticleDetailView";

const INITIAL_ARTICLES = [
  {
    id: "art-0",
    category: "MARKET TRENDS",
    categoryBg: "bg-[#FEF3C7] text-[#B45309]",
    date: "August 24, 2026",
    time: "10:30 AM",
    title: "Global Rice Prices Hit 15-Year High Amid Export Restrictions",
    excerpt:
      "International rice benchmarks have surged to their highest levels in over fifteen years following intensified export restrictions and climate-induced yield variances...",
    imageUrl:
      "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80",
    likes: 24,
    comments: 3,
    source: "Agrinews",
  },
  {
    id: "art-1",
    category: "RICE & PALAY UPDATES",
    categoryBg: "bg-[#FEF3C7] text-[#B45309]",
    date: "August 25, 2026",
    time: "10:30 AM",
    title: "Palay Buying Prices Show Stable Movement This Month",
    excerpt:
      "Recent market records indicate stable palay buying prices across selected agricultural areas, providing a predictable...",
    imageUrl:
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80",
    likes: 24,
    comments: 8,
    source: "Dept. of Agriculture",
  },
  {
    id: "art-2",
    category: "CLIMATE & WEATHER ADVISORIES",
    categoryBg: "bg-[#FEF3C7] text-[#B45309]",
    date: "August 21, 2026",
    time: "08:15 AM",
    title: "Strategies for Q4",
    excerpt:
      "With projected rainfall deficits approaching in the final quarter, experts recommend immediate implementation of...",
    imageUrl:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
    likes: 56,
    comments: 12,
    source: "PAGASA",
  },
  {
    id: "art-3",
    category: "FARMER PROGRAMS & SUBSIDIES",
    categoryBg: "bg-[#FEF3C7] text-[#B45309]",
    date: "August 18, 2026",
    time: "02:45 PM",
    title: "New Fertilizer Discount Vouchers Available for Registration",
    excerpt:
      "Eligible registered farmers can now apply for the Q3 fertilizer discount voucher program through the centralized portal to...",
    imageUrl:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80",
    likes: 112,
    comments: 45,
    source: "National Agri Board",
  },
  {
    id: "art-4",
    category: "SUPPLY CHAIN & LOGISTICS",
    categoryBg: "bg-[#E0F2FE] text-[#0369A1]",
    date: "August 14, 2026",
    time: "11:20 AM",
    title: "National Rice Inventory Reaches 90-Day Buffer Stock Target",
    excerpt:
      "Strategic regional warehouses report optimized grain reserves ahead of the scheduled harvest cycle next month...",
    imageUrl:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
    likes: 89,
    comments: 21,
    source: "NFA Philippines",
  },
];

const CATEGORIES = ["All", "Market Trends", "Rice & Palay", "Climate", "Subsidies", "Logistics"];

export default function RetailerMobileNewsView({ onBack }) {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [likedArticles, setLikedArticles] = useState({});

  if (selectedArticle) {
    return (
      <RetailerMobileArticleDetailView
        article={selectedArticle}
        onBack={() => setSelectedArticle(null)}
      />
    );
  }

  const toggleLike = (id, e) => {
    e?.stopPropagation();
    setLikedArticles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredArticles = INITIAL_ARTICLES.filter((art) => {
    const matchesSearch =
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      selectedCategory === "All" ||
      art.category.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-4 pb-6 font-sans">
      {/* ── View Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            News &amp; Updates
          </h1>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search news and updates......"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#00580C] shadow-2xs"
          />
        </div>

        {/* Filter Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal size={13} className="text-gray-500" />
            <span>{selectedCategory}</span>
            <span className="text-[10px] text-gray-400">▾</span>
          </button>

          {showFilterMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-emerald-50 text-[#00580C] font-bold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Articles List ──────────────────────────────────────────── */}
      <div className="space-y-4">
        {filteredArticles.map((art) => {
          const isLiked = likedArticles[art.id];
          const likeCount = art.likes + (isLiked ? 1 : 0);

          return (
            <div
              key={art.id}
              onClick={() => setSelectedArticle(art)}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-2xs hover:shadow-xs transition-shadow cursor-pointer group"
            >
              {/* Article Cover Image */}
              <div className="relative h-44 w-full bg-gray-100 overflow-hidden">
                <img
                  src={art.imageUrl}
                  alt={art.title}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
              </div>

              {/* Article Content */}
              <div className="p-4 space-y-2.5">
                {/* Tag & Date */}
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <span
                    className={`text-[9.5px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${art.categoryBg}`}
                  >
                    {art.category}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Clock size={12} />
                    <span>
                      {art.date} · {art.time}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-sm font-extrabold text-gray-900 leading-snug group-hover:text-[#00580C] transition-colors">
                  {art.title}
                </h2>

                {/* Excerpt */}
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                  {art.excerpt}
                </p>

                {/* Footer Meta & Read More */}
                <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-gray-400 text-[11px]">
                    <button
                      onClick={(e) => toggleLike(art.id, e)}
                      className={`flex items-center gap-1 cursor-pointer transition-colors ${
                        isLiked ? "text-rose-500 font-bold" : "hover:text-gray-600"
                      }`}
                    >
                      <Heart
                        size={13}
                        fill={isLiked ? "currentColor" : "none"}
                      />
                      <span>{likeCount}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <MessageCircle size={13} />
                      <span>{art.comments} Comments</span>
                    </div>
                  </div>

                  <span className="text-[11px] text-gray-400 font-medium">
                    {art.source}
                  </span>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setSelectedArticle(art)}
                    className="text-xs font-bold text-[#00580C] hover:text-[#004209] flex items-center gap-1 cursor-pointer"
                  >
                    Read More &rarr;
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom Pagination & Load More ──────────────────────────── */}
      <div className="text-center pt-2 space-y-2">
        <p className="text-xs text-gray-400 font-medium">
          Showing {filteredArticles.length} of 15 articles
        </p>
        <button
          onClick={() => {}}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-2xs hover:bg-gray-50 active:scale-98 transition-all cursor-pointer"
        >
          <RotateCw size={13} className="text-gray-500" />
          <span>Load More Articles</span>
        </button>
      </div>
    </div>
  );
}
