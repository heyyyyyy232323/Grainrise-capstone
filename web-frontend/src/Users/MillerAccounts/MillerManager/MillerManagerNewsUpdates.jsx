import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Heart,
  MessageSquare,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  Megaphone,
  Newspaper,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import {
  stripHtmlToExcerpt,
  resolveMediaUrl,
  slugifyTitle,
} from "../../../Components/Minor-Components/RichArticleContent";
import useToast from "../../../Components/hooks/useToast";
import Toast from "../../../Components/Modals/Toast";
import useApi from "../../../Components/hooks/useApi";

const CATEGORY_OPTIONS = [
  { value: "all", label: "News Category" },
  { value: "announcement_admin", label: "Announcement from the admin" },
  { value: "market_updates", label: "Market Updates" },
  { value: "advisory_best_practices", label: "Advisory & Best Practices" },
  { value: "grant_programs_support", label: "Grant Programs & Support" },
  { value: "weather_climate", label: "Weather & Climate" },
  { value: "policy_regulation", label: "Policy & Regulation" },
  { value: "supply_chain", label: "Supply Chain & Logistics" },
  { value: "general_agriculture", label: "General Agriculture" },
];

const SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "most_liked", label: "Most Liked" },
  { value: "most_commented", label: "Most Commented" },
];

function FeedThumbnail({ item }) {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = resolveMediaUrl(item?.image_url);
  const isAnnouncement = item?.item_type === "announcement";

  if (!resolvedUrl || hasError) {
    return (
      <div
        className={`w-full md:w-64 h-48 md:h-full min-h-[170px] flex flex-col items-center justify-center shrink-0 border-r border-slate-100 p-4 select-none ${
          isAnnouncement ? "bg-amber-50/70 text-amber-800" : "bg-emerald-50/70 text-emerald-800"
        }`}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-2xs ${
            isAnnouncement ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {isAnnouncement ? <Megaphone size={18} /> : <Newspaper size={18} />}
        </div>
        <span className="text-[11px] font-extrabold tracking-wider uppercase text-center opacity-85">
          {isAnnouncement ? "Announcement" : "GrainRise"}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full md:w-64 h-48 md:h-full min-h-[170px] bg-slate-100 flex items-center justify-center shrink-0 border-r border-slate-100 overflow-hidden relative">
      <img
        src={resolvedUrl}
        alt={item.title || "Article Image"}
        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function MillerManagerNewsUpdates() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const { request } = useApi();

  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter States
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dropdown visibility states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Fetching state for "Fetch Latest News" button
  const [isFetchingLatest, setIsFetchingLatest] = useState(false);

  const dateRef = useRef(null);
  const categoryRef = useRef(null);
  const sortRef = useRef(null);

  // Fetch combined feed from backend
  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (selectedCategory && selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }
      if (dateRange.startDate) params.set("start_date", dateRange.startDate);
      if (dateRange.endDate) params.set("end_date", dateRange.endDate);
      params.set("sort", sortBy);
      params.set("limit", String(itemsPerPage));
      params.set("offset", String((currentPage - 1) * itemsPerPage));

      const res = await request(`/news/combined-feed/?${params.toString()}`, {
        method: "GET",
      });

      if (res && res.data) {
        const items = res.data.items || [];
        const total = res.data.pagination?.total || items.length;
        setArticles(items);
        setTotalCount(total);
        return { success: true, count: items.length };
      } else if (res && res.error) {
        showToast({
          type: "error",
          title: "Error",
          message: res.error,
        });
        return { success: false, count: 0 };
      }
      return { success: false, count: 0 };
    } catch (err) {
      console.error("Error fetching feed:", err);
      showToast({
        type: "error",
        title: "Error",
        message: err?.message || "Failed to load news & updates feed.",
      });
      return { success: false, count: 0 };
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategory, dateRange, sortBy, currentPage, request, showToast]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Fetch Latest News - Refreshes available records from Aiven without bypassing admin sync/publishing
  const handleFetchLatestNews = async () => {
    if (isFetchingLatest) return;
    setIsFetchingLatest(true);
    try {
      const result = await fetchFeed();
      if (result && result.success && result.count > 0) {
        showToast({
          type: "success",
          title: "Success",
          message: "Latest news fetched successfully.",
          duration: 4000,
        });
      } else if (result && result.success && result.count === 0) {
        showToast({
          type: "warning",
          title: "No Data",
          message: "No latest news is currently available.",
          duration: 4000,
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        message: err?.message || "Failed to fetch the latest news. Please try again.",
        duration: 4000,
      });
    } finally {
      setIsFetchingLatest(false);
    }
  };

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

  // Date Range Apply with strict validation
  const handleDateApply = () => {
    if (
      tempDateRange.startDate &&
      tempDateRange.endDate &&
      tempDateRange.endDate < tempDateRange.startDate
    ) {
      showToast({
        type: "error",
        title: "Error",
        message: "End Date cannot precede Start Date.",
      });
      return;
    }
    setDateRange(tempDateRange);
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    setTempDateRange({ startDate: "", endDate: "" });
    setDateRange({ startDate: "", endDate: "" });
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  // Like / Unlike action
  const toggleLike = async (e, item) => {
    e.stopPropagation();

    // Optimistic update
    const prevArticles = [...articles];
    setArticles((prev) =>
      prev.map((art) => {
        if (art.id === item.id && art.item_type === item.item_type) {
          const nextLiked = !art.is_liked;
          return {
            ...art,
            is_liked: nextLiked,
            likes: nextLiked ? art.likes + 1 : Math.max(0, art.likes - 1),
          };
        }
        return art;
      })
    );

    try {
      const endpoint =
        item.item_type === "announcement"
          ? `/announcements/${item.id}/reaction/`
          : `/news/${item.id}/reaction/`;

      const res = await request(endpoint, {
        method: "POST",
      });

      if (res && res.data) {
        const resData = res.data;
        setArticles((prev) =>
          prev.map((art) => {
            if (art.id === item.id && art.item_type === item.item_type) {
              return {
                ...art,
                is_liked:
                  resData.is_liked !== undefined
                    ? resData.is_liked
                    : !art.is_liked,
                likes:
                  resData.reaction_count !== undefined
                    ? resData.reaction_count
                    : art.likes,
              };
            }
            return art;
          })
        );
      } else if (res && res.error) {
        setArticles(prevArticles);
        showToast({
          type: "error",
          title: "Error",
          message: res.error || "Could not update like status.",
        });
      }
    } catch (err) {
      console.error("Like toggle failed:", err);
      setArticles(prevArticles);
      showToast({
        type: "error",
        title: "Error",
        message: "Could not update like status.",
      });
    }
  };

  const categoryLabel =
    CATEGORY_OPTIONS.find((opt) => opt.value === selectedCategory)?.label ||
    "News Category";

  const sortLabel =
    SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || "Latest";

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

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
            Stay informed with the latest agricultural news, market updates, advisories, and administrative announcements.
          </p>
        </div>

        <button
          type="button"
          onClick={handleFetchLatestNews}
          disabled={isFetchingLatest || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00580C] hover:bg-[#00470A] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs hover:shadow transition cursor-pointer disabled:opacity-60 whitespace-nowrap self-start sm:self-center"
        >
          <RefreshCw size={15} className={isFetchingLatest ? "animate-spin" : ""} />
          <span>{isFetchingLatest ? "Fetching..." : "Fetch Latest News"}</span>
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
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search news and announcements..."
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
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
              <div className="absolute top-full mt-2 left-0 sm:left-auto bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64 animate-in fade-in zoom-in-95 duration-100">
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
              <div className="absolute top-full mt-1.5 left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-30 w-64 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto">
                <div className="space-y-0.5">
                  {CATEGORY_OPTIONS.map((opt) => {
                    const isSelected = selectedCategory === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(opt.value);
                          setCurrentPage(1);
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
              <span>{sortLabel}</span>
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
                          setCurrentPage(1);
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

      {/* ── Articles List ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 border border-slate-200 rounded-xl bg-white space-y-2">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-r-transparent" />
            <p className="text-xs font-semibold">Loading news &amp; announcements...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-gray-500 border border-slate-200 rounded-xl bg-white">
            No articles or announcements found matching your criteria.
          </div>
        ) : (
          articles.map((item) => {
            const isLiked = item.is_liked;
            const targetSlug = item.slug || slugifyTitle(item.title) || item.id;

            return (
              <div
                key={item.feed_id || `${item.item_type}-${item.id}`}
                onClick={() =>
                  navigate(`/miller-manager/news-updates/${targetSlug}?type=${item.item_type}`)
                }
                className="border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col md:flex-row overflow-hidden hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
              >
                {/* Thumbnail Image or Placeholder */}
                <FeedThumbnail item={item} />

                {/* Content */}
                <div className="p-5 flex flex-col justify-between w-full">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          item.category_color ||
                          "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {item.category}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {item.date}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-gray-900 mb-2 leading-snug group-hover:text-[#0B5D1E] transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                      {stripHtmlToExcerpt(item.description)}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-auto border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                      <button
                        type="button"
                        onClick={(e) => toggleLike(e, item)}
                        className={`flex items-center gap-1 transition cursor-pointer ${
                          isLiked
                            ? "text-emerald-700 font-semibold"
                            : "hover:text-emerald-700"
                        }`}
                      >
                        <Heart
                          size={14}
                          className={isLiked ? "fill-emerald-700 text-emerald-700" : ""}
                        />
                        <span>{item.likes}</span>
                      </button>

                      <span className="flex items-center gap-1">
                        <MessageSquare size={14} /> {item.comments} Comments
                      </span>

                      <span className="hidden sm:inline-block">Source: {item.source}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/miller-manager/news-updates/${targetSlug}?type=${item.item_type}`);
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
      {totalCount > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}-
            {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} articles
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-gray-200 text-gray-700 rounded-md text-sm transition hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
              .filter((page) => {
                return (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                );
              })
              .map((page, idx, arr) => {
                const prevPage = arr[idx - 1];
                const showEllipsis = prevPage && page - prevPage > 1;

                return (
                  <span key={page} className="flex items-center">
                    {showEllipsis && <span className="px-1 text-gray-400">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-md text-sm transition cursor-pointer ${
                        currentPage === page
                          ? "bg-[#0B5D1E] text-white font-medium"
                          : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                );
              })}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border border-gray-200 text-gray-700 rounded-md text-sm transition hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
