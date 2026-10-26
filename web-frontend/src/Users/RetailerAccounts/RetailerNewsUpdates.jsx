import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Heart, MessageSquare, ArrowRight, RefreshCw } from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import { stripHtmlToExcerpt } from "../../Components/Minor-Components/RichArticleContent";
import useToast from "../../Components/hooks/useToast";
import Toast from "../../Components/Modals/Toast";
import useFetchLatestNews from "../../Components/hooks/NewsUpdates/useFetchLatestNews";

export const RETAILER_NEWS_DATA = [
  {
    id: 1,
    category: "RICE MARKET UPDATES",
    categoryColor: "bg-emerald-100 text-emerald-700",
    date: "August 29, 2026 · 10:00 AM",
    year: "2026",
    month: "August",
    title: "Palay Buying Prices Show Stable Movement This Month",
    description:
      "Recent market records indicate stable palay buying prices across selected agricultural areas, providing a predictable revenue stream for local producers and steady wholesale procurement costs for registered rice retailers...",
    likes: 34,
    comments: 8,
    source: "Department of Agriculture",
  },
  {
    id: 2,
    category: "CLIMATE & WEATHER ADVISORY",
    categoryColor: "bg-blue-100 text-blue-700",
    date: "August 22, 2026 · 08:15 AM",
    year: "2026",
    month: "August",
    title: "El Niño Preparations: Water Management Strategies for Q4",
    description:
      "With projected rainfall deficits approaching in the final quarter, experts recommend immediate implementation of efficient irrigation scheduling and soil moisture conservation to prevent localized supply shortfalls...",
    likes: 56,
    comments: 12,
    source: "PAGASA",
  },
  {
    id: 3,
    category: "MARKET FORECAST & LOGISTICS",
    categoryColor: "bg-amber-100 text-amber-700",
    date: "August 18, 2026 · 02:30 PM",
    year: "2026",
    month: "August",
    title: "New Fertilizer Discount Vouchers Available for Registration",
    description:
      "Eligible registered farmers can now apply for the Q3 fertilizer discount voucher program through the centralized portal to offset rising input costs for the upcoming harvest season...",
    likes: 112,
    comments: 45,
    source: "National Agri Board",
  },
  {
    id: 4,
    category: "SUPPLY CHAIN INSIGHTS",
    categoryColor: "bg-purple-100 text-purple-700",
    date: "August 12, 2026 · 11:20 AM",
    year: "2026",
    month: "August",
    title: "Inter-island Rice Logistics Routes Upgraded for Wet Season",
    description:
      "Maritime and inland logistics hubs have completed route optimizations, reducing transit times between Central Luzon milling centers and Metro Manila retail distribution points by up to 18%...",
    likes: 89,
    comments: 19,
    source: "Logistics Authority",
  },
];

export default function RetailerNewsUpdates() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const [articles, setArticles] = useState(RETAILER_NEWS_DATA);

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("Year");
  const [selectedMonth, setSelectedMonth] = useState("Month");
  const [selectedCategory, setSelectedCategory] = useState("News Category");
  const [sortBy, setSortBy] = useState("Latest");

  const [likedArticles, setLikedArticles] = useState({});

  // Fetch Latest News Hook
  const { fetchLatestNews, isFetching } = useFetchLatestNews({
    showToast,
    onNewsFetched: (fetched) => {
      if (fetched && fetched.length > 0) {
        setArticles((prev) => {
          const formatted = fetched.map((item, idx) => ({
            id: item.news_id || item.id || `fetched-${idx}`,
            category: (item.category || "Rice Market Updates").toUpperCase(),
            categoryColor: "bg-emerald-100 text-emerald-700",
            date: item.published_at
              ? new Date(item.published_at).toLocaleString()
              : "Just now",
            year: item.published_at
              ? new Date(item.published_at).getFullYear().toString()
              : "2026",
            month: item.published_at
              ? new Date(item.published_at).toLocaleString("default", { month: "long" })
              : "August",
            title: item.title,
            description: item.description || item.snippet || item.content || "",
            likes: item.likes_count || 0,
            comments: item.comments_count || 0,
            source: item.source_name || "GrainRise News",
          }));
          // Put new ones first
          return [...formatted, ...prev.filter(p => !formatted.some(f => f.id === p.id))];
        });
      }
    },
  });

  const toggleLike = (e, id) => {
    e.stopPropagation();
    setLikedArticles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter & Sort Logic
  const filtered = articles.filter((news) => {
    if (search) {
      const q = search.toLowerCase();
      if (!news.title.toLowerCase().includes(q) && !news.description.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (selectedYear !== "Year" && news.year !== selectedYear) return false;
    if (selectedMonth !== "Month" && news.month !== selectedMonth) return false;
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
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Resources" }, { label: "News & Updates" }]} />
          <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
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

      {/* ── Search & Dropdown Filters ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search news and updates..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-none bg-white text-gray-700"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-none bg-white text-gray-700 min-w-[100px]"
          >
            <option value="Year">Year</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-none bg-white text-gray-700 min-w-[100px]"
          >
            <option value="Month">Month</option>
            <option value="August">August</option>
            <option value="July">July</option>
            <option value="June">June</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-none bg-white text-gray-700 min-w-[160px]"
          >
            <option value="News Category">News Category</option>
            <option value="Rice Market">Rice Market Updates</option>
            <option value="Climate">Climate &amp; Weather Advisory</option>
            <option value="Forecast">Market Forecast &amp; Logistics</option>
            <option value="Supply Chain">Supply Chain Insights</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-none bg-white text-gray-700 min-w-[120px]"
          >
            <option value="Latest">Latest</option>
            <option value="Most Liked">Most Liked</option>
            <option value="Most Commented">Most Commented</option>
          </select>
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
                onClick={() => navigate(`/retailer/news-updates/${news.id}`)}
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
                        navigate(`/retailer/news-updates/${news.id}`);
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
          Showing 1-{filtered.length} of {articles.length} articles
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