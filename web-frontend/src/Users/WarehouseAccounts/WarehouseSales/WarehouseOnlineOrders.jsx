import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Calendar, ChevronDown, X, ShoppingCart } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";

// ─── Constants ───────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "date-desc",    label: "Newest First" },
  { value: "date-asc",     label: "Oldest First" },
  { value: "variant-asc",  label: "Variant (A-Z)" },
  { value: "retailer-asc", label: "Retailer (A-Z)" },
  { value: "amount-desc",  label: "Highest Amount" },
  { value: "amount-asc",   label: "Lowest Amount" },
];

const COLUMNS = [
  { key: "retailerName", label: "Retailer Name" },
  { key: "batchNo",      label: "Batch No."     },
  { key: "variant",      label: "Variant"       },
  { key: "productCode",  label: "Product Code"  },
  { key: "totalPrice",   label: "Total Price"   },
  { key: "action",       label: "Action",       align: "center" },
];

const PENDING_ORDERS = Array.from({ length: 14 }, (_, i) => ({
  id:           `order-${i + 1}`,
  retailerName: `Retailer ${String.fromCharCode(65 + (i % 5))}`,
  batchNo:      `Batch 2026-00${(i % 3) + 1}`,
  variant:      i % 2 === 0 ? "Dinorado" : "Sinandomeng",
  productCode:  i % 2 === 0 ? "WR-001" : "WR-002",
  totalPrice:   `₱${(1500 + i * 250).toLocaleString()}`,
  status:       "pending",
}));

const ITEMS_PER_PAGE = 10;

// ─── Component ───────────────────────────────────────────────────────────────

const WarehouseOnlineOrders = () => {
  const [searchQuery,   setSearchQuery]   = useState("");
  const [dateRange,     setDateRange]     = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [sortBy,        setSortBy]        = useState("date-desc");
  const [currentPage,   setCurrentPage]   = useState(1);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortDrop,   setShowSortDrop]   = useState(false);

  const dateRef = useRef(null);
  const sortRef = useRef(null);

  // Click outside listener
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
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    setTempDateRange({ startDate: "", endDate: "" });
    setDateRange({ startDate: "", endDate: "" });
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    const list = PENDING_ORDERS.filter((row) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        row.retailerName.toLowerCase().includes(q) ||
        row.batchNo.toLowerCase().includes(q) ||
        row.variant.toLowerCase().includes(q) ||
        row.productCode.toLowerCase().includes(q)
      );
    });

    if (sortBy === "variant-asc") {
      list.sort((a, b) => a.variant.localeCompare(b.variant));
    } else if (sortBy === "retailer-asc") {
      list.sort((a, b) => a.retailerName.localeCompare(b.retailerName));
    } else if (sortBy === "amount-desc") {
      list.sort(
        (a, b) =>
          parseFloat(b.totalPrice.replace(/[^0-9.]/g, "")) -
          parseFloat(a.totalPrice.replace(/[^0-9.]/g, ""))
      );
    } else if (sortBy === "amount-asc") {
      list.sort(
        (a, b) =>
          parseFloat(a.totalPrice.replace(/[^0-9.]/g, "")) -
          parseFloat(b.totalPrice.replace(/[^0-9.]/g, ""))
      );
    }

    return list;
  }, [searchQuery, sortBy]);

  const pendingCount = PENDING_ORDERS.length;
  const totalRows    = filteredRows.length;
  const totalPages   = Math.max(1, Math.ceil(totalRows / ITEMS_PER_PAGE));

  const startIdx    = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx      = Math.min(startIdx + ITEMS_PER_PAGE, totalRows);
  const visibleRows = filteredRows.slice(startIdx, endIdx);

  return (
    <div className="space-y-5">
      {/* ── Breadcrumb & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Orders", path: "/warehouse-sales/dashboard" },
            { label: "Online Orders" },
          ]}
        />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Online Orders
        </h1>
        <p className="text-sm text-slate-500">
          Review and process pending retailer online orders.
        </p>
      </div>

      {/* ── Toolbar (Procurement Design) ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-between">
        {/* Left: Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search retailer, batch number, product code, or variant"
              className="block w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white placeholder-gray-400 text-gray-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
            {/* Date Range Dropdown */}
            <div className="relative w-full sm:w-auto" ref={dateRef}>
              <button
                type="button"
                onClick={() => {
                  setShowDatePicker((prev) => !prev);
                  setShowSortDrop(false);
                }}
                className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer ${
                  dateRange.startDate ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
                }`}
              >
                <span>
                  {dateRange.startDate
                    ? `${dateRange.startDate} - ${dateRange.endDate || "..."}`
                    : "Date Range"}
                </span>
                <Calendar
                  size={16}
                  className={dateRange.startDate ? "text-emerald-600" : "text-gray-500"}
                />
              </button>

              {showDatePicker && (
                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
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

            {/* Sort By Dropdown */}
            <div className="relative w-full sm:w-auto" ref={sortRef}>
              <button
                type="button"
                onClick={() => {
                  setShowSortDrop((prev) => !prev);
                  setShowDatePicker(false);
                }}
                className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer"
              >
                <span>{SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Sort By"}</span>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 transition-transform duration-200 ${
                    showSortDrop ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showSortDrop && (
                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[190px]">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.value);
                        setShowSortDrop(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        sortBy === opt.value
                          ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Pending badge */}
        {pendingCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm ml-auto whitespace-nowrap">
            <ShoppingCart size={15} className="shrink-0" />
            Pending Orders ({pendingCount})
          </div>
        )}
      </div>

      {/* ── Orders Table Card ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#EDEDED] text-[13px] font-bold text-slate-700 border-b border-gray-200">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-6 py-3.5 whitespace-nowrap ${col.align === "center" ? "text-center" : ""}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-gray-800">{row.retailerName}</td>
                  <td className="px-6 py-4 text-gray-700">{row.batchNo}</td>
                  <td className="px-6 py-4 text-gray-700">{row.variant}</td>
                  <td className="px-6 py-4 text-gray-700">{row.productCode}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{row.totalPrice}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => console.log("View order:", row)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-emerald-500 hover:text-emerald-700 transition cursor-pointer"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-6 py-10 text-center text-gray-400"
                  >
                    No pending orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-6 py-3.5 border-t border-gray-100 bg-white">
          <p className="text-xs text-gray-500">
            Showing {totalRows === 0 ? 0 : startIdx + 1}–{endIdx} of {totalRows} pending orders
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs rounded-lg text-gray-600 disabled:text-gray-300 hover:bg-gray-100 disabled:hover:bg-transparent font-medium transition cursor-pointer"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-7 w-7 text-xs rounded-lg font-medium transition cursor-pointer ${
                  page === currentPage
                    ? "bg-[#0B5D1E] text-white font-bold"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs rounded-lg text-gray-600 disabled:text-gray-300 hover:bg-gray-100 disabled:hover:bg-transparent font-medium transition cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseOnlineOrders;