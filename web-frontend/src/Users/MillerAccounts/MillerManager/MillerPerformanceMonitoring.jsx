import { useState, useEffect, useCallback, useMemo } from "react";
import { Star, ChevronDown, Loader2 } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SalesTrendCard from "../../../Components/Graphs/LineGraphsCard";
import DistributionCard from "../../../Components/Graphs/PieChartCard";
import OnlineOrderRatingModal from "../../../Components/Modals/OnlineOrderRatingModal";
import useApi from "../../../Components/hooks/useApi";

function formatPeso(val) {
  const num = Number(val || 0);
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function MillerPerformanceMonitoring() {
  const { request } = useApi();

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [products, setProducts] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState("all");

  const [ratingsSummary, setRatingsSummary] = useState({
    average_rating: 0.0,
    total_reviews: 0,
    star_counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [reviews, setReviews] = useState([]);
  const [salesOvertime, setSalesOvertime] = useState([]);
  const [quantityOvertime, setQuantityOvertime] = useState([]);
  const [purchaseBreakdown, setPurchaseBreakdown] = useState([
    { label: "Completed (Online Sales)", value: 0, color: "#0B5D1E" },
    { label: "Pending (Online Sales)", value: 0, color: "#EAB308" },
  ]);
  const [statistics, setStatistics] = useState({
    this_month_sales: 0.0,
    total_sales: 0.0,
    this_month_qty: 0.0,
    total_qty: 0.0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reviewPage, setReviewPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState(null);

  // ── Fetch Manager Branches on Mount ───────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    try {
      const res = await request("/miller/branches/", { method: "GET" });
      if (res?.data && Array.isArray(res.data)) {
        setBranches(res.data);
      }
    } catch (err) {
      console.warn("Failed to fetch branches from /miller/branches/:", err);
    }
  }, [request]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // ── Fetch Performance Monitoring Data ─────────────────────────────────────
  const fetchPerformanceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (selectedBranch && selectedBranch !== "all") {
        queryParams.set("branch_id", selectedBranch);
      }
      if (selectedVariant && selectedVariant !== "all") {
        queryParams.set("product_name", selectedVariant);
      }

      const url = `/miller/performance-monitoring/?${queryParams.toString()}`;
      const res = await request(url, { method: "GET" });

      const payload = res?.data?.data || res?.data || {};

      if (payload.branches && Array.isArray(payload.branches)) {
        setBranches((prev) => (prev.length > 0 ? prev : payload.branches));
      }
      if (payload.products && Array.isArray(payload.products)) {
        setProducts(payload.products);
      }
      if (payload.ratings_summary) {
        setRatingsSummary(payload.ratings_summary);
      }
      if (Array.isArray(payload.reviews)) {
        setReviews(payload.reviews);
      }
      if (Array.isArray(payload.sales_overtime)) {
        setSalesOvertime(payload.sales_overtime);
      }
      if (Array.isArray(payload.quantity_overtime)) {
        setQuantityOvertime(payload.quantity_overtime);
      }
      if (Array.isArray(payload.purchase_breakdown)) {
        setPurchaseBreakdown(payload.purchase_breakdown);
      }
      if (payload.statistics) {
        setStatistics(payload.statistics);
      }
    } catch (err) {
      console.error("Error loading performance data:", err);
      setError("Failed to load performance monitoring data.");
    } finally {
      setLoading(false);
    }
  }, [request, selectedBranch, selectedVariant]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  // ── Pagination Calculation ────────────────────────────────────────────────
  const reviewsPerPage = 5;
  const totalReviews = reviews.length;
  const totalReviewPages = Math.max(1, Math.ceil(totalReviews / reviewsPerPage));
  const safeReviewPage = Math.min(reviewPage, totalReviewPages);

  const paginatedReviews = useMemo(() => {
    const start = (safeReviewPage - 1) * reviewsPerPage;
    return reviews.slice(start, start + reviewsPerPage);
  }, [reviews, safeReviewPage, reviewsPerPage]);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Analytics" },
            { label: "Performance Monitoring" },
          ]}
        />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Performance Monitoring
        </h2>
        <p className="text-sm text-slate-500">
          Branch ratings, product sales trends, and demand forecasting.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* ── Top Section: Branch Customer Reviews ─────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-base">Branch Monitoring</h3>

          {/* Branch Filter Dropdown (All owned branches, including 0 records) */}
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setReviewPage(1);
              }}
              className="appearance-none pr-8 pl-4 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:ring-1 focus:ring-[#0B5D1E] outline-none cursor-pointer"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option
                  key={b.supplier_profile_id}
                  value={b.supplier_profile_id}
                >
                  {b.business_name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Reviews List Card */}
        <div className="border border-slate-200/80 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-white">
            <p className="text-xs font-semibold text-gray-500">
              Customers Ratings and Reviews
            </p>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={13}
                    className={
                      i < Math.floor(ratingsSummary.average_rating)
                        ? "fill-amber-400 text-amber-400"
                        : i < ratingsSummary.average_rating
                        ? "fill-amber-200 text-amber-400"
                        : "text-gray-200 fill-none"
                    }
                  />
                ))}
              </div>
              <span className="text-amber-500 font-bold">
                {Number(ratingsSummary.average_rating || 0).toFixed(1)} / 5
              </span>
              <span className="text-gray-400 font-normal">
                ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 bg-white px-4">
            {loading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 size={16} className="animate-spin text-[#0B5D1E]" />
                <span>Loading reviews...</span>
              </div>
            ) : paginatedReviews.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                No customer ratings or reviews found for this branch.
              </div>
            ) : (
              paginatedReviews.map((rev) => (
                <div
                  key={rev.id || rev.rating_id}
                  onClick={() => setSelectedReview(rev)}
                  className="py-3.5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors px-2 -mx-2 rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            fill={
                              i < Math.floor(rev.rating)
                                ? "currentColor"
                                : "none"
                            }
                            stroke="currentColor"
                          />
                        ))}
                      </div>
                      <span className="font-bold text-gray-900 text-xs">
                        {rev.customer || rev.masked_reviewer}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {rev.comment || "No comment provided."}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {rev.date}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Footer Pagination */}
          <div className="flex items-center justify-between bg-slate-50/70 px-4 py-2.5 border-t border-slate-200 text-xs text-gray-500">
            <span>
              {totalReviews === 0
                ? "Showing 0 reviews"
                : `Showing ${(safeReviewPage - 1) * reviewsPerPage + 1}–${Math.min(
                    safeReviewPage * reviewsPerPage,
                    totalReviews
                  )} of ${totalReviews} reviews`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safeReviewPage === 1 || totalReviews === 0}
                onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-gray-200 bg-white rounded-lg text-xs text-gray-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalReviewPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReviewPage(i + 1)}
                  className={`h-6 w-6 rounded-lg text-xs font-bold cursor-pointer ${
                    safeReviewPage === i + 1
                      ? "bg-[#0B5D1E] text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-slate-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={safeReviewPage === totalReviewPages || totalReviews === 0}
                onClick={() =>
                  setReviewPage((p) => Math.min(totalReviewPages, p + 1))
                }
                className="px-2.5 py-1 border border-gray-200 bg-white rounded-lg text-xs text-gray-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Product Trends & Analytics ───────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-base">Branch Monitoring</h3>

          {/* Product / Variant Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedVariant}
              onChange={(e) => setSelectedVariant(e.target.value)}
              className="appearance-none pr-8 pl-4 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:ring-1 focus:ring-[#0B5D1E] outline-none cursor-pointer"
            >
              <option value="all">All Products</option>
              {products.map((pName) => (
                <option key={pName} value={pName}>
                  {pName}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Metric Badges */}
        <div className="flex justify-end gap-2 text-xs">
          <div className="border border-slate-200 rounded-xl px-3 py-1.5 text-gray-700 font-medium">
            This Month:{" "}
            <span className="font-bold text-gray-900">
              ₱{formatPeso(statistics.this_month_sales)}
            </span>
          </div>
          <div className="border border-slate-200 rounded-xl px-3 py-1.5 text-gray-700 font-medium">
            Total Sales:{" "}
            <span className="font-bold text-gray-900">
              ₱{formatPeso(statistics.total_sales)}
            </span>
          </div>
        </div>

        {/* 3 Graphs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Sales Overtime Graph (Actual Monetary Sales in ₱) */}
          <SalesTrendCard
            title="Sales Overtime (12 Months)"
            data={salesOvertime}
            height={200}
            maxValue={20000}
            lineColor="#0B5D1E"
            fillColor="rgba(11, 93, 30, 0.12)"
            axisFormatter={(v) =>
              v === 0
                ? "0"
                : v >= 1000000
                ? `₱${(v / 1000000).toFixed(1)}M`
                : v >= 1000
                ? `₱${(v / 1000).toFixed(0)}k`
                : `₱${v}`
            }
            valueFormatter={(v) => `₱${formatPeso(v)}`}
            emptyStateTitle="No Sales Data"
            emptyStateDescription="No sales recorded for this period."
          />

          {/* 2. Purchase Breakdown Donut Chart (Completed vs Pending Online Sales) */}
          <DistributionCard
            title="Purchase Breakdown"
            items={purchaseBreakdown}
            donutSize={160}
            holeSize={80}
            emptyStateTitle="No Purchase Data"
            emptyStateDescription="No online order transactions recorded."
          />

          {/* 3. Volume Overtime Graph (Actual Quantity Sold in kg) */}
          <SalesTrendCard
            title="Sales Overtime (12 Months)"
            data={quantityOvertime}
            height={200}
            maxValue={20}
            lineColor="#0B5D1E"
            fillColor="rgba(11, 93, 30, 0.12)"
            axisFormatter={(v) =>
              v === 0 ? "0kg" : `${Number(v).toLocaleString("en-PH")}kg`
            }
            valueFormatter={(v) => `${Number(v).toLocaleString("en-PH")} kg`}
            emptyStateTitle="No Volume Data"
            emptyStateDescription="No quantity sold recorded for this period."
          />
        </div>
      </div>

      {/* ── Rating Details Modal (Masked Name, Stars, Comment, Attachments) ── */}
      <OnlineOrderRatingModal
        isOpen={Boolean(selectedReview)}
        onClose={() => setSelectedReview(null)}
        rating={selectedReview}
      />
    </div>
  );
}