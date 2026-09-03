import { useState } from "react";
import { Star, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SalesTrendCard from "../../../Components/Graphs/LineGraphsCard";
import DistributionCard from "../../../Components/Graphs/PieChartCard";

const REVIEWS = [
  { id: 1, customer: "Customer A", rating: 4.5, comment: "Excellent turnaround time on the last rice shipment. Quality verified upon delivery.", date: "Apr 12, 2026" },
  { id: 2, customer: "Customer A", rating: 4.5, comment: "Excellent turnaround time on the last rice shipment. Quality verified upon delivery.", date: "Apr 12, 2026" },
  { id: 3, customer: "Customer A", rating: 4.5, comment: "Excellent turnaround time on the last rice shipment. Quality verified upon delivery.", date: "Apr 12, 2026" },
  { id: 4, customer: "Customer A", rating: 4.5, comment: "Excellent turnaround time on the last rice shipment. Quality verified upon delivery.", date: "Apr 12, 2026" },
  { id: 5, customer: "Customer A", rating: 4.5, comment: "Excellent turnaround time on the last rice shipment. Quality verified upon delivery.", date: "Apr 12, 2026" },
  { id: 6, customer: "Customer B", rating: 4.0, comment: "Fast dispatch and clean sacks. Minor delay on logistics handover but handled well.", date: "Apr 10, 2026" },
  { id: 7, customer: "Customer C", rating: 5.0, comment: "Great communication with the warehouse encoder and logistics coordinator.", date: "Apr 08, 2026" },
  { id: 8, customer: "Customer D", rating: 4.5, comment: "Very satisfied with overall milling cleanliness and packaging.", date: "Apr 05, 2026" },
  { id: 9, customer: "Customer E", rating: 4.0, comment: "Smooth transaction and transparent weight monitoring.", date: "Apr 02, 2026" },
];

// Mock Data for Graph 1: Sales Overtime (12 Months)
const SALES_OVERTIME_DATA = [
  { label: "Aug 26", value: 5000 },
  { label: "Sept 26", value: 14000 },
  { label: "Oct 26", value: 11000 },
  { label: "Nov 26", value: 18000 },
];

// Mock Data for Graph 2: Purchase Breakdown Donut
const PURCHASE_BREAKDOWN_DATA = [
  { label: "Completed (Online Sales)", value: 8, color: "#0B5D1E" },
  { label: "Pending (Online Sales)", value: 4, color: "#EAB308" },
];

// Mock Data for Graph 3: Demand Forecasting
const DEMAND_FORECAST_DATA = [
  { label: "Jun 26", value: 4 },
  { label: "Jul 26", value: 12 },
  { label: "Aug 26", value: 9 },
  { label: "Sept 26", value: 16 },
];

export default function PerformanceMonitoring() {
  const [selectedBranch, setSelectedBranch] = useState("Warehouse ABC");
  const [selectedVariant, setSelectedVariant] = useState("Dinorado");
  const [reviewPage, setReviewPage] = useState(1);

  const reviewsPerPage = 5;
  const totalReviewPages = Math.ceil(REVIEWS.length / reviewsPerPage);
  const paginatedReviews = REVIEWS.slice((reviewPage - 1) * reviewsPerPage, reviewPage * reviewsPerPage);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Analytics" }, { label: "Performance Monitoring" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Performance Monitoring
        </h2>
        <p className="text-sm text-slate-500">
          Branch ratings, product sales trends, and demand forecasting.
        </p>
      </div>

      {/* ── Top Section: Branch Customer Reviews ─────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-base">Branch Monitoring</h3>

          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="appearance-none pr-8 pl-4 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:ring-1 focus:ring-[#0B5D1E] outline-none cursor-pointer"
            >
              <option value="Warehouse ABC">Warehouse ABC</option>
              <option value="Warehouse Distribution A">Warehouse Distribution A</option>
              <option value="Warehouse Distribution B">Warehouse Distribution B</option>
              <option value="Warehouse Distribution C">Warehouse Distribution C</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Customer Ratings Card */}
        <div className="border border-slate-200/80 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-white">
            <p className="text-xs font-semibold text-gray-500">Customers Ratings and Reviews</p>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} fill="currentColor" />
                ))}
              </div>
              <span className="text-amber-500 font-bold">4.5 / 5</span>
              <span className="text-gray-400 font-normal">({REVIEWS.length} reviews)</span>
            </div>
          </div>

          {/* Review Rows */}
          <div className="divide-y divide-slate-100 bg-white px-4">
            {paginatedReviews.map((rev) => (
              <div key={rev.id} className="py-3.5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} fill={i < Math.floor(rev.rating) ? "currentColor" : "none"} stroke="currentColor" />
                      ))}
                    </div>
                    <span className="font-bold text-gray-900 text-xs">{rev.customer}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{rev.comment}</p>
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{rev.date}</span>
              </div>
            ))}
          </div>

          {/* Reviews Pagination Footer */}
          <div className="flex items-center justify-between bg-slate-50/70 px-4 py-2.5 border-t border-slate-200 text-xs text-gray-500">
            <span>
              Showing {(reviewPage - 1) * reviewsPerPage + 1}–{Math.min(reviewPage * reviewsPerPage, REVIEWS.length)} of {REVIEWS.length} reviews
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={reviewPage === 1}
                onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-gray-200 bg-white rounded-lg text-xs text-gray-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: totalReviewPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReviewPage(i + 1)}
                  className={`h-6 w-6 rounded-lg text-xs font-bold cursor-pointer ${
                    reviewPage === i + 1 ? "bg-[#0B5D1E] text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-slate-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={reviewPage === totalReviewPages}
                onClick={() => setReviewPage((p) => Math.min(totalReviewPages, p + 1))}
                className="px-2.5 py-1 border border-gray-200 bg-white rounded-lg text-xs text-gray-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Product Trends & Forecasting ─────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-base">Branch Monitoring</h3>

          <div className="relative">
            <select
              value={selectedVariant}
              onChange={(e) => setSelectedVariant(e.target.value)}
              className="appearance-none pr-8 pl-4 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:ring-1 focus:ring-[#0B5D1E] outline-none cursor-pointer"
            >
              <option value="Dinorado">Dinorado</option>
              <option value="Sinandomeng">Sinandomeng</option>
              <option value="Jasmine Rice">Jasmine Rice</option>
              <option value="RC222 Tubigan">RC222 Tubigan</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="flex justify-end gap-2 text-xs">
          <div className="border border-slate-200 rounded-xl px-3 py-1.5 text-gray-700 font-medium bg-slate-50/50">
            This Month: <span className="font-bold text-gray-900">₱1,101,000.00</span>
          </div>
          <div className="border border-slate-200 rounded-xl px-3 py-1.5 text-gray-700 font-medium bg-slate-50/50">
            This Month: <span className="font-bold text-gray-900">₱1,101,000.00</span>
          </div>
        </div>

        {/* 3 Component Graphs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Sales Overtime (12 Months) Line Chart */}
          <SalesTrendCard
            title="Sales Overtime (12 Months)"
            data={SALES_OVERTIME_DATA}
            height={200}
            maxValue={20000}
            lineColor="#0B5D1E"
            fillColor="rgba(11, 93, 30, 0.12)"
            axisFormatter={(v) => (v === 0 ? "0" : `₱${v / 1000}k`)}
            valueFormatter={() => ""}
          />

          {/* 2. Purchase Breakdown Donut Chart */}
          <DistributionCard
            title="Purchase Breakdown"
            items={PURCHASE_BREAKDOWN_DATA}
            donutSize={160}
            holeSize={80}
          />

          {/* 3. Demand Forecasting Spline Chart */}
          <SalesTrendCard
            title="Sales Overtime (12 Months)"
            data={DEMAND_FORECAST_DATA}
            height={200}
            maxValue={20}
            lineColor="#0B5D1E"
            fillColor="rgba(11, 93, 30, 0.12)"
            axisFormatter={(v) => `${v}kg`}
            valueFormatter={() => ""}
          />
        </div>
      </div>
    </div>
  );
}