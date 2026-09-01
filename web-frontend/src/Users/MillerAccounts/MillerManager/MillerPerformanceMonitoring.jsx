import { useState } from "react";
import { Star, ChevronDown, CalendarDays } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";

const REVIEWS = [
  { id: 1, customer: "Customer A", rating: 5, comment: "Excellent! & arrive ahead of time on the last wheat shipment.", date: "Apr 13, 2026" },
  { id: 2, customer: "Customer A", rating: 5, comment: "Excellent! & arrive ahead of time on the last wheat shipment.", date: "Apr 13, 2026" },
  { id: 3, customer: "Customer A", rating: 5, comment: "Excellent! & arrive ahead of time on the last wheat shipment.", date: "Apr 13, 2026" },
  { id: 4, customer: "Customer A", rating: 5, comment: "Excellent! & arrive ahead of time on the last wheat shipment.", date: "Apr 13, 2026" },
  { id: 5, customer: "Customer A", rating: 5, comment: "Excellent! & arrive ahead of time on the last wheat shipment.", date: "Apr 13, 2026" },
  { id: 6, customer: "Customer B", rating: 4, comment: "Good quality rice sacks, consistent grading and moisture levels.", date: "Apr 10, 2026" },
  { id: 7, customer: "Customer C", rating: 5, comment: "Reliable distribution logistics and prompt delivery confirmation.", date: "Apr 08, 2026" },
  { id: 8, customer: "Customer D", rating: 4, comment: "Very satisfied with overall milling cleanliness and packaging.", date: "Apr 05, 2026" },
];

export default function MillerPerformanceMonitoring() {
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
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-lg">Branch Monitoring</h3>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="appearance-none pr-8 pl-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:ring-1 focus:ring-[#0B5D1E] outline-none cursor-pointer"
              >
                <option value="Warehouse ABC">Warehouse ABC</option>
                <option value="Warehouse Distribution A">Warehouse Distribution A</option>
                <option value="Warehouse Distribution B">Warehouse Distribution B</option>
                <option value="Warehouse Distribution C">Warehouse Distribution C</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Customer Ratings Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <p className="text-xs font-semibold text-gray-500">Customers Ratings and Reviews</p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>
              <span className="text-gray-900">4.5/5</span>
              <span className="text-gray-400 font-normal">({REVIEWS.length} reviews)</span>
            </div>
          </div>

          {/* Review Rows */}
          <div className="space-y-4 divide-y divide-gray-100">
            {paginatedReviews.map((rev) => (
              <div key={rev.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="flex text-amber-400">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} size={13} fill="currentColor" />
                      ))}
                    </div>
                    <span className="font-bold text-gray-900 text-sm">{rev.customer}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{rev.comment}</p>
                </div>
                <span className="text-[11px] text-gray-400 whitespace-nowrap self-end sm:self-center">
                  {rev.date}
                </span>
              </div>
            ))}
          </div>

          {/* Reviews Pagination Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
            <span>Showing {(reviewPage - 1) * reviewsPerPage + 1}-{Math.min(reviewPage * reviewsPerPage, REVIEWS.length)} of {REVIEWS.length} reviews</span>
            <div className="flex items-center gap-1">
              <button
                disabled={reviewPage === 1}
                onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-gray-200 rounded text-xs text-gray-400 disabled:opacity-40 hover:border-[#0B5D1E] cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: totalReviewPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setReviewPage(i + 1)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                    reviewPage === i + 1 ? "bg-[#0B5D1E] text-white" : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={reviewPage === totalReviewPages}
                onClick={() => setReviewPage((p) => Math.min(totalReviewPages, p + 1))}
                className="px-2.5 py-1 border border-gray-200 rounded text-xs text-gray-700 disabled:opacity-40 hover:border-[#0B5D1E] cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Product Trends & Forecasting ─────────────────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-lg">Branch Monitoring</h3>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedVariant}
                onChange={(e) => setSelectedVariant(e.target.value)}
                className="appearance-none pr-8 pl-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:ring-1 focus:ring-[#0B5D1E] outline-none cursor-pointer"
              >
                <option value="Dinorado">Dinorado</option>
                <option value="Sinandomeng">Sinandomeng</option>
                <option value="Jasmine Rice">Jasmine Rice</option>
                <option value="RC222 Tubigan">RC222 Tubigan</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Metric summary badges */}
        <div className="flex justify-end gap-3 text-xs">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-700 font-bold shadow-xs">
            This Month: <span className="text-gray-900">₱1,101,000.00</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-700 font-bold shadow-xs">
            This Month: <span className="text-gray-900">₱1,101,000.00</span>
          </div>
        </div>

        {/* 3 Graphs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Sales Overtime (12 Months) Line Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-gray-800">Sales Overtime <span className="text-gray-400 font-normal">(12 Months)</span></h4>
            <div className="w-full h-44 relative">
              <svg viewBox="0 0 320 140" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="chartGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {/* Y Axis text */}
                <text x="0" y="25" className="text-[9px] fill-gray-400">₱200k</text>
                <text x="0" y="70" className="text-[9px] fill-gray-400">₱100k</text>
                <text x="0" y="115" className="text-[9px] fill-gray-400">0</text>
                {/* Gridlines */}
                <line x1="35" y1="25" x2="310" y2="25" stroke="#f1f5f9" />
                <line x1="35" y1="70" x2="310" y2="70" stroke="#f1f5f9" />
                <line x1="35" y1="115" x2="310" y2="115" stroke="#f1f5f9" />
                {/* Area Fill */}
                <path d="M 45,105 C 90,50 110,60 160,80 C 210,100 240,40 300,30 L 300,115 L 45,115 Z" fill="url(#chartGrad1)" />
                {/* Smooth Curve */}
                <path d="M 45,105 C 90,50 110,60 160,80 C 210,100 240,40 300,30" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="45" cy="105" r="3" fill="#fff" stroke="#059669" strokeWidth="2" />
                <circle cx="160" cy="80" r="3" fill="#fff" stroke="#059669" strokeWidth="2" />
                <circle cx="300" cy="30" r="3.5" fill="#059669" />
                {/* X Axis */}
                <text x="45" y="132" className="text-[8px] fill-gray-400" textAnchor="middle">Aug 25</text>
                <text x="130" y="132" className="text-[8px] fill-gray-400" textAnchor="middle">Sep 25</text>
                <text x="215" y="132" className="text-[8px] fill-gray-400" textAnchor="middle">Oct 25</text>
                <text x="295" y="132" className="text-[8px] fill-gray-400" textAnchor="middle">Nov 25</text>
              </svg>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-semibold pt-1">
              <span className="w-2 h-2 bg-emerald-600 rounded-xs"></span> Current Revenue
            </div>
          </div>

          {/* 2. Purchase Breakdown Donut Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <h4 className="text-xs font-bold text-gray-800">Purchase Breakdown</h4>
            <div className="flex items-center justify-center gap-5 py-2">
              {/* Donut SVG */}
              <div className="w-28 h-28 relative">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  {/* Background segment: Yellow/Gold (Pending) */}
                  <path
                    className="text-amber-500"
                    strokeWidth="5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Foreground segment: Green (Completed 80%) */}
                  <path
                    className="text-emerald-700"
                    strokeDasharray="80, 100"
                    strokeWidth="5"
                    strokeLinecap="butt"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>

              {/* Legend List */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-700 shrink-0"></span>
                  <span className="text-gray-600 text-[11px]">Completed (Online Order)</span>
                  <span className="font-bold text-gray-900 ml-1">8</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="text-gray-600 text-[11px]">Pending (Online Order)</span>
                  <span className="font-bold text-gray-900 ml-1">2</span>
                </div>
              </div>
            </div>
            <div className="h-2"></div>
          </div>

          {/* 3. Demand Forecasting Spline Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-gray-800">Sales Overtime <span className="text-gray-400 font-normal">(12 Months)</span></h4>
            <div className="w-full h-44 relative">
              <svg viewBox="0 0 320 140" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="chartGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                {/* Y Axis text */}
                <text x="0" y="25" className="text-[9px] fill-gray-400">25kg</text>
                <text x="0" y="70" className="text-[9px] fill-gray-400">10kg</text>
                <text x="0" y="115" className="text-[9px] fill-gray-400">0kg</text>
                {/* Gridlines */}
                <line x1="30" y1="25" x2="310" y2="25" stroke="#f1f5f9" />
                <line x1="30" y1="70" x2="310" y2="70" stroke="#f1f5f9" />
                <line x1="30" y1="115" x2="310" y2="115" stroke="#f1f5f9" />
                {/* Area under curve */}
                <path d="M 45,100 C 80,45 120,45 160,75 C 200,105 240,40 300,30 L 300,115 L 45,115 Z" fill="url(#chartGrad2)" />
                {/* Spline curve */}
                <path d="M 45,100 C 80,45 120,45 160,75 C 200,105 240,40 300,30" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="45" cy="100" r="3" fill="#fff" stroke="#047857" strokeWidth="2" />
                <circle cx="160" cy="75" r="3" fill="#fff" stroke="#047857" strokeWidth="2" />
                <circle cx="300" cy="30" r="3.5" fill="#047857" />
                {/* X Axis */}
                <text x="45" y="132" className="text-[8px] fill-gray-400" textAnchor="middle">Jul 25</text>
                <text x="130" y="132" className="text-[8px] fill-gray-400" textAnchor="middle">Jul 28</text>
                <text x="215" y="132" className="text-[8px] fill-gray-400" textAnchor="middle">Aug 01</text>
                <text x="295" y="132" className="text-[8px] fill-gray-400" textAnchor="middle">Sept 01</text>
              </svg>
            </div>
            <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500 font-semibold pt-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-700 rounded-xs"></span> Actual (kg)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-xs"></span> Forecast (kg)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
