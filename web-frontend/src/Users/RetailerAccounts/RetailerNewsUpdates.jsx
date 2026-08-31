import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Heart, MessageSquare, ArrowRight } from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import field1 from "../../assets/field1.png";
import field2 from "../../assets/field2.png";

export const RETAILER_NEWS_DATA = [
  {
    id: 1,
    category: "RICE MARKET UPDATES",
    categoryColor: "bg-yellow-100 text-yellow-700",
    date: "August 29, 2026 · 10:00 AM",
    title: "Palay Buying Prices Show Stable Movement This Month",
    description: "Recent market records indicate stable palay buying prices across selected agricultural areas, providing a predictable revenue stream for local producers and steady wholesale procurement costs for registered rice retailers...",
    likes: 34,
    comments: 8,
    source: "Department of Agriculture",
    image: field1,
  },
  {
    id: 2,
    category: "CLIMATE & WEATHER ADVISORY",
    categoryColor: "bg-blue-100 text-blue-700",
    date: "August 22, 2026 · 08:15 AM",
    title: "El Niño Preparations: Water Management Strategies for Q4",
    description: "With projected rainfall deficits approaching in the final quarter, experts recommend immediate implementation of efficient irrigation scheduling and soil moisture conservation to prevent localized supply shortfalls...",
    likes: 56,
    comments: 12,
    source: "PAGASA",
    image: field2,
  },
  {
    id: 3,
    category: "MARKET FORECAST & LOGISTICS",
    categoryColor: "bg-amber-100 text-amber-700",
    date: "August 18, 2026 · 02:30 PM",
    title: "New Fertilizer Discount Vouchers Available for Registration",
    description: "Eligible registered farmers can now apply for the Q3 fertilizer discount voucher program through the centralized portal to offset rising input costs for the upcoming harvest season...",
    likes: 112,
    comments: 45,
    source: "National Agri Board",
    image: field1,
  },
  {
    id: 4,
    category: "SUPPLY CHAIN INSIGHTS",
    categoryColor: "bg-emerald-100 text-emerald-700",
    date: "August 12, 2026 · 11:20 AM",
    title: "Inter-island Rice Logistics Routes Upgraded for Wet Season",
    description: "Maritime and inland logistics hubs have completed route optimizations, reducing transit times between Central Luzon milling centers and Metro Manila retail distribution points by up to 18%...",
    likes: 89,
    comments: 19,
    source: "Logistics Authority",
    image: field2,
  },
];

export default function RetailerNewsUpdates() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("Year");
  const [selectedMonth, setSelectedMonth] = useState("Month");
  const [selectedCategory, setSelectedCategory] = useState("News Category");
  const [sortBy, setSortBy] = useState("Sort By");
  const [currentPage, setCurrentPage] = useState(1);
  const [likedArticles, setLikedArticles] = useState({});

  const toggleLike = (e, id) => {
    e.stopPropagation();
    setLikedArticles((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredNews = RETAILER_NEWS_DATA.filter((news) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = news.title.toLowerCase().includes(q);
      const matchDesc = news.description.toLowerCase().includes(q);
      const matchCat = news.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }

    if (selectedCategory !== "News Category" && selectedCategory !== "All Categories") {
      if (!news.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Resources" }, { label: "News & Updates" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          News & Updates
        </h2>
        <p className="text-sm text-slate-500">
          Stay informed with the latest agricultural news, market updates, advisories, and programs.
        </p>
      </div>

      {/* ── Filters Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search news and updates"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-none bg-white placeholder-gray-400 text-gray-700"
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-none min-w-[90px]"
          >
            <option value="Year">Year</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-none min-w-[100px]"
          >
            <option value="Month">Month</option>
            <option value="August">August</option>
            <option value="July">July</option>
            <option value="June">June</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-none min-w-[150px]"
          >
            <option value="News Category">News Category</option>
            <option value="All Categories">All Categories</option>
            <option value="Market Updates">Market Updates</option>
            <option value="Climate">Climate Advisory</option>
            <option value="Forecast">Forecast & Logistics</option>
            <option value="Supply Chain">Supply Chain</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-none min-w-[110px]"
          >
            <option value="Sort By">Sort By</option>
            <option value="latest">Latest First</option>
            <option value="likes">Most Liked</option>
            <option value="comments">Most Comments</option>
          </select>
        </div>
      </div>

      {/* ── News List ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {filteredNews.map((news) => {
          const isLiked = likedArticles[news.id];
          const displayLikes = isLiked ? news.likes + 1 : news.likes;

          return (
            <div
              key={news.id}
              onClick={() => navigate(`/retailer/news-updates/${news.id}`)}
              className="border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col md:flex-row overflow-hidden hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
            >
              {/* Thumbnail Image */}
              <div className="w-full md:w-64 h-48 md:h-auto overflow-hidden shrink-0 border-r border-slate-100 bg-slate-100">
                <img
                  src={news.image}
                  alt={news.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col justify-between w-full">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-sm uppercase tracking-wider ${news.categoryColor}`}>
                      {news.category}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span> {news.date}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-gray-900 mb-2 leading-snug group-hover:text-emerald-700 transition-colors">
                    {news.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                    {news.description}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-auto border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                    <button
                      onClick={(e) => toggleLike(e, news.id)}
                      className={`flex items-center gap-1 transition-colors ${
                        isLiked ? "text-emerald-700 font-semibold" : "hover:text-emerald-700"
                      }`}
                    >
                      <Heart size={14} fill={isLiked ? "currentColor" : "none"} /> {displayLikes}
                    </button>
                    <span className="flex items-center gap-1 hover:text-emerald-700 cursor-pointer transition">
                      <MessageSquare size={14} /> {news.comments} Comments
                    </span>
                    <span className="hidden sm:inline-block text-gray-400">|</span>
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
        })}

        {filteredNews.length === 0 && (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
            <p className="text-gray-500 font-medium">No news articles found matching your filters.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("News Category");
                setSelectedYear("Year");
                setSelectedMonth("Month");
              }}
              className="mt-3 text-xs font-bold text-emerald-700 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-500">
          Showing 1-{Math.min(3, filteredNews.length)} of 28 new articles
        </p>
        <div className="flex gap-1">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border border-gray-200 text-gray-400 rounded-md text-sm cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(1)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              currentPage === 1 ? "bg-emerald-700 text-white" : "border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            1
          </button>
          <button
            onClick={() => setCurrentPage(2)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              currentPage === 2 ? "bg-emerald-700 text-white" : "border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            2
          </button>
          <button
            onClick={() => setCurrentPage(3)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              currentPage === 3 ? "bg-emerald-700 text-white" : "border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            3
          </button>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md text-sm transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
