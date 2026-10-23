import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Heart, MessageSquare, ArrowRight, Calendar, ChevronDown, ChevronUp, X, RefreshCw } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import useToast from "../../../Components/hooks/useToast";
import Toast from "../../../Components/Modals/Toast";
import useFetchLatestNews from "../../../Components/hooks/NewsUpdates/useFetchLatestNews";

export const MILLER_NEWS_DATA = [
  {
    id: 1,
    category: "MARKET UPDATES",
    categoryColor: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    date: "August 20, 2026 · 10:00 AM",
    isoDate: "2026-08-20",
    title: "Palay Buying Prices Show Stable Movement This Month",
    description:
      "Recent market analysis indicate stable palay buying prices across selected agricultural areas, providing a predictable revenue stream for local producers...",
    likes: 24,
    comments: 8,
    source: "Department of Agriculture",
  },
  {
    id: 2,
    category: "ADVISORY & BEST PRACTICES",
    categoryColor: "bg-blue-100 text-blue-700 border border-blue-200",
    date: "August 17, 2026 · 08:15 AM",
    isoDate: "2026-08-17",
    title: "El Niño Preparations: Water Management Strategies for Q4",
    description:
      "With projected rainfall deficits approaching in the final quarter, experts recommend immediate implementation of efficient irrigation scheduling and soil...",
    likes: 56,
    comments: 12,
    source: "PAGASA",
  },
  {
    id: 3,
    category: "GRANT PROGRAMS & SUPPORT",
    categoryColor: "bg-amber-100 text-amber-700 border border-amber-200",
    date: "August 10, 2026 · 02:30 PM",
    isoDate: "2026-08-10",
    title: "New Fertilizer Discount Vouchers Available for Registration",
    description:
      "Eligible registered farmers can now apply for the Q3 fertilizer discount voucher program through the centralized portal to offset rising input costs for the...",
    likes: 112,
    comments: 45,
    source: "National Agri Board",
  },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "News Category" },
  { value: "MARKET UPDATES", label: "Market Updates" },
  { value: "ADVISORY & BEST PRACTICES", label: "Advisory & Best Practices" },
  { value: "GRANT PROGRAMS & SUPPORT", label: "Grant Programs & Support" },
];

const SORT_OPTIONS = [
  { value: "Latest", label: "Latest" },
  { value: "Most Liked", label: "Most Liked" },
  { value: "Most Commented", label: "Most Commented" },
];

export default function MillerManagerNewsUpdates() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [articles, setArticles] = useState(MILLER_NEWS_DATA);

  // Fetch Latest News Hook
  const { fetchLatestNews, isFetching } = useFetchLatestNews({
    showToast,
    onNewsFetched: (fetched) => {
      if (fetched && fetched.length > 0) {
        setArticles((prev) => {
          const formatted = fetched.map((item, idx) => ({
            id: item.news_id || item.id || `fetched-${idx}`,
            category: (item.category || "Market Updates").toUpperCase(),
            categoryColor: "bg-emerald-100 text-emerald-700 border border-emerald-200",
            date: item.published_at
              ? new Date(item.published_at).toLocaleString()
              : "Just now",
            isoDate: item.published_at ? item.published_at.slice(0, 10) : "2026-08-20",
            title: item.title,
            description: item.description || item.snippet || item.content || "",
            likes: item.likes_count || 0,
            comments: item.comments_count || 0,
            source: item.source_name || "GrainRise News",
          }));
          return [...formatted, ...prev.filter(p => !formatted.some(f => f.id === p.id))];
        });
      }
    },
  });

  // Filter States
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("Latest");

  // Dropdown visibility states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const [likedArticles, setLikedArticles] = useState({});

  const dateRef = useRef(null);
  const categoryRef = useRef(null);
  const sortRef = useRef(null);

  // Handle outside clicks to close dropdown popovers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateApply = () => {
    setDateRange(tempDateRange);
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    setTempDateRange({ startDate: "", endDate: "" });
    setDateRange({ startDate: "", endDate: "" });
    setShowDatePicker(false);
  };

  const toggleLike = (e, id) => {
    e.stopPropagation();
    setLikedArticles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter & Sort Logic
  const filtered = articles.filter((news) => {
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = news.title.toLowerCase().includes(q);
      const matchDesc = news.description.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    if (dateRange.startDate && news.isoDate < dateRange.startDate) return false;
    if (dateRange.endDate && news.isoDate > dateRange.endDate) return false;

    if (selectedCategory !== "all" && news.category !== selectedCategory) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === "Most Liked") return b.likes - a.likes;
    if (sortBy === "Most Commented") return b.comments - a.comments;
    return b.id - a.id; // Default "Latest"
  });

  const categoryLabel =
    CATEGORY_OPTIONS.find((opt) => opt.value === selectedCategory)?.label || "News Category";

  return (
    <div className="space-y-6">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Resources" }, { label: "News & Updates" }]} />
          <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
            News &amp; Updates
          </h2>
          <p className="text-sm text-slate-500">
            Stay informed with the latest agricultural news, market updates, advisories, and programs.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLatestNews}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00580C] hover:bg-[#00470A] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs hover:shadow transition cursor-pointer disabled:opacity-60 whitespace-nowrap self-start sm:self-center"
        >
          <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
          <span>{isFetching ? "Fetching..." : "Fetch Latest News"}</span>
        </button>
      </div>

      {/* ── Search & Filter Controls ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-2 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search news and updates..."
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* 1. Date Range Picker Dropdown */}
          <div className="relative w-full sm:w-auto" ref={dateRef}>
            <button
              type="button"
              onClick={() => setShowDatePicker((prev) => !prev)}
              className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px] ${
                dateRange.startDate ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
              }`}
            >
              <span>
                {dateRange.startDate
                  ? `${dateRange.startDate} - ${dateRange.endDate || "..."}`
                  : "Date Range"}
              </span>
              <Calendar size={16} className={dateRange.startDate ? "text-emerald-600" : "text-gray-500"} />
            </button>

            {showDatePicker && (
              <div className="absolute top-full mt-2 left-0 sm:left-auto bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={tempDateRange.startDate}
                      onChange={(e) =>
                        setTempDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={tempDateRange.endDate}
                      onChange={(e) =>
                        setTempDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleDateReset}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleDateApply}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. News Category Dropdown */}
          <div className="relative w-full sm:w-auto" ref={categoryRef}>
            <button
              type="button"
              onClick={() => setShowCategoryDropdown((prev) => !prev)}
              className="flex items-center gap-2 border border-gray-200 bg-white px-3.5 py-2 rounded-lg text-sm font-medium text-slate-800 hover:bg-gray-50 transition-colors cursor-pointer h-[38px] justify-between"
            >
              <span>{categoryLabel}</span>
              {showCategoryDropdown ? (
                <ChevronUp size={16} className="text-slate-500" />
              ) : (
                <ChevronDown size={16} className="text-slate-500" />
              )}
            </button>

            {showCategoryDropdown && (
              <div className="absolute top-full mt-1.5 left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-30 w-60 animate-in fade-in zoom-in-95 duration-100">
                <div className="space-y-0.5">
                  {CATEGORY_OPTIONS.map((opt) => {
                    const isSelected = selectedCategory === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(opt.value);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#EAF5ED] text-[#0B5D1E] font-semibold"
                            : "text-slate-700 hover:bg-gray-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Sort By Dropdown */}
          <div className="relative w-full sm:w-auto" ref={sortRef}>
            <button
              type="button"
              onClick={() => setShowSortDropdown((prev) => !prev)}
              className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 rounded-2xl text-sm font-medium text-slate-800 hover:bg-gray-50 transition-colors cursor-pointer h-[38px] min-w-[140px] justify-between shadow-2xs"
            >
              <span>{sortBy}</span>
              {showSortDropdown ? (
                <ChevronUp size={16} className="text-slate-500" />
              ) : (
                <ChevronDown size={16} className="text-slate-500" />
              )}
            </button>

            {showSortDropdown && (
              <div className="absolute top-full mt-1.5 left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-30 w-48 animate-in fade-in zoom-in-95 duration-100">
                <div className="space-y-0.5">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = sortBy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSortBy(opt.value);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#EAF5ED] text-[#0B5D1E] font-semibold"
                            : "text-slate-700 hover:bg-gray-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── News List ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 border border-slate-200 rounded-xl bg-white">
            No articles found matching your criteria.
          </div>
        ) : (
          filtered.map((news) => {
            const isLiked = likedArticles[news.id];
            const displayLikes = isLiked ? news.likes + 1 : news.likes;

            return (
              <div
                key={news.id}
                onClick={() => navigate(`/miller-manager/news-updates/${news.id}`)}
                className="border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col md:flex-row overflow-hidden hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
              >
                {/* Thumbnail Placeholder */}
                <div className="w-full md:w-64 h-48 md:h-auto bg-emerald-700/10 flex items-center justify-center shrink-0 border-r border-slate-100">
                  <span className="text-emerald-900/40 font-bold text-sm tracking-widest uppercase">
                    Image
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col justify-between w-full">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${news.categoryColor}`}
                      >
                        {news.category}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {news.date}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-gray-900 mb-2 leading-snug group-hover:text-[#0B5D1E] transition-colors">
                      {news.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                      {news.description}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-auto border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                      <button
                        type="button"
                        onClick={(e) => toggleLike(e, news.id)}
                        className={`flex items-center gap-1 ${
                          isLiked ? "text-emerald-700 font-semibold" : "hover:text-emerald-700"
                        }`}
                      >
                        <Heart size={14} fill={isLiked ? "currentColor" : "none"} /> {displayLikes}
                      </button>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={14} /> {news.comments} Comments
                      </span>
                      <span className="hidden sm:inline-block">Source: {news.source}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/miller-manager/news-updates/${news.id}`);
                      }}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition cursor-pointer"
                    >
                      Read More <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-500">
          Showing 1-{filtered.length} of {MILLER_NEWS_DATA.length} articles
        </p>
        <div className="flex gap-1">
          <button type="button" className="px-3 py-1 border border-gray-200 text-gray-400 rounded-md text-sm cursor-not-allowed">
            Previous
          </button>
          <button type="button" className="px-3 py-1 bg-[#0B5D1E] text-white font-medium rounded-md text-sm cursor-pointer">
            1
          </button>
          <button type="button" className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md text-sm transition cursor-pointer">
            2
          </button>
          <button type="button" className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md text-sm transition cursor-pointer">
            3
          </button>
          <button type="button" className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md text-sm transition cursor-pointer">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}