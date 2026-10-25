import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Heart, MessageSquare, ArrowRight, Calendar, ChevronDown, X } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import { stripHtmlToExcerpt } from "../../../Components/Minor-Components/RichArticleContent";

export const WAREHOUSE_NEWS_DATA = [
  {
    id: 1,
    category: "MARKET UPDATES",
    categoryColor: "bg-emerald-100 text-emerald-700",
    date: "August 20, 2026 · 10:00 AM",
    isoDate: "2026-08-20",
    year: "2026",
    month: "August",
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
    categoryColor: "bg-blue-100 text-blue-700",
    date: "August 17, 2026 · 08:15 AM",
    isoDate: "2026-08-17",
    year: "2026",
    month: "August",
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
    categoryColor: "bg-amber-100 text-amber-700",
    date: "August 10, 2026 · 02:30 PM",
    isoDate: "2026-08-10",
    year: "2026",
    month: "August",
    title: "New Fertilizer Discount Vouchers Available for Registration",
    description:
      "Eligible registered farmers can now apply for the Q3 fertilizer discount voucher program through the centralized portal to offset rising input costs for the...",
    likes: 112,
    comments: 45,
    source: "National Agri Board",
  },
];

export default function WarehouseManagerNewsUpdates() {
  const navigate = useNavigate();

  // Filter States
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [selectedCategory, setSelectedCategory] = useState("News Category");
  const [sortBy, setSortBy] = useState("Latest");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortDrop, setShowSortDrop] = useState(false);

  const [likedArticles, setLikedArticles] = useState({});

  const dateRef = useRef(null);
  const sortRef = useRef(null);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortDrop(false);
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
  const filtered = WAREHOUSE_NEWS_DATA.filter((news) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!news.title.toLowerCase().includes(q) && !news.description.toLowerCase().includes(q)) {
        return false;
      }
    }

    // Date Range Filter
    if (dateRange.startDate && news.isoDate < dateRange.startDate) return false;
    if (dateRange.endDate && news.isoDate > dateRange.endDate) return false;

    // Category Filter
    if (
      selectedCategory !== "News Category" &&
      !news.category.toLowerCase().includes(selectedCategory.toLowerCase())
    ) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === "Most Liked") return b.likes - a.likes;
    if (sortBy === "Most Commented") return b.comments - a.comments;
    return b.id - a.id; // Default "Latest"
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Resources" }, { label: "News & Updates" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          News &amp; Updates
        </h2>
        <p className="text-sm text-slate-500">
          Stay informed with the latest agricultural news, market updates, advisories, and programs.
        </p>
      </div>

      {/* ── Search & Grouped Filter Toolbar ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-3 mb-2 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Date Range Picker Dropdown */}
          <div className="relative w-full sm:w-auto" ref={dateRef}>
            <button
              type="button"
              onClick={() => {
                setShowDatePicker((prev) => !prev);
                setShowSortDrop(false);
              }}
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
              <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
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

          {/* News Category Select */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="News Category">News Category</option>
              <option value="Market Updates">Market Updates</option>
              <option value="Advisory">Advisory &amp; Best Practices</option>
              <option value="Grant Programs">Grant Programs &amp; Support</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="relative w-full sm:w-auto" ref={sortRef}>
            <button
              type="button"
              onClick={() => {
                setShowSortDrop((prev) => !prev);
                setShowDatePicker(false);
              }}
              className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px]"
            >
              <span>{sortBy}</span>
              <ChevronDown
                size={16}
                className={`text-gray-500 transition-transform duration-200 ${
                  showSortDrop ? "rotate-180" : ""
                }`}
              />
            </button>

            {showSortDrop && (
              <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[160px]">
                {["Latest", "Most Liked", "Most Commented"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setSortBy(opt);
                      setShowSortDrop(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      sortBy === opt
                        ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
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
                onClick={() => navigate(`/branch-manager/news-updates/${news.id}`)}
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
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-sm uppercase ${news.categoryColor}`}
                      >
                        {news.category}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {news.date}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-gray-900 mb-2 leading-snug group-hover:text-emerald-700 transition-colors">
                      {news.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                      {stripHtmlToExcerpt(news.description)}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-auto border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                      <button
                        onClick={(e) => toggleLike(e, news.id)}
                        className={`flex items-center gap-1 ${
                          isLiked ? "text-emerald-700 font-semibold" : "hover:text-emerald-700"
                        }`}
                      >
                        <Heart size={14} fill={isLiked ? "currentColor" : "none"} /> {displayLikes}
                      </button>
                      <span>
                        <MessageSquare size={14} className="inline mr-1" /> {news.comments} Comments
                      </span>
                      <span className="hidden sm:inline-block">Source: {news.source}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/branch-manager/news-updates/${news.id}`);
                      }}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
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
          Showing 1-{filtered.length} of {WAREHOUSE_NEWS_DATA.length} articles
        </p>
        <div className="flex gap-1">
          <button className="px-3 py-1 border border-gray-200 text-gray-400 rounded-md text-sm cursor-not-allowed">
            Previous
          </button>
          <button className="px-3 py-1 bg-emerald-700 text-white font-medium rounded-md text-sm">
            1
          </button>
          <button className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md text-sm transition">
            2
          </button>
          <button className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md text-sm transition">
            3
          </button>
          <button className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md text-sm transition">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}