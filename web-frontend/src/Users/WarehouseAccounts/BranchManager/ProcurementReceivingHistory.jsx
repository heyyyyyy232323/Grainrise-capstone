import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Calendar, ChevronDown, X, ShieldCheck, Eye } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

/* ── Style Mappings ──────────────────────────────────────────────────────────── */
const QC_STATUS_PILLS = {
  Partial: "bg-amber-100/90 text-amber-700 border border-amber-200",
  Passed: "bg-emerald-100/90 text-emerald-700 border border-emerald-200",
  Failed: "bg-rose-100/90 text-rose-700 border border-rose-200",
};

/* ── Table Column Configurations ───────────────────────────────────────────────── */
const TABLE_COLUMNS = [
  { key: "batchNo",  label: "Batch No.",         width: "18%" },
  { key: "branch",   label: "Branch",            width: "18%" },
  { key: "supplier", label: "Supplier",          width: "18%" },
  { key: "variant",  label: "Variant",           width: "16%" },
  { key: "qty",      label: "Received Qty (kg)", width: "16%" },
  { key: "qcStatus", label: "QC Status",         width: "12%", headerClassName: "text-center", cellClassName: "text-center" },
  { key: "action",   label: "Action",            width: "10%", headerClassName: "text-center", cellClassName: "text-center" },
];

/* ── Branch Options ───────────────────────────────────────────────────────────── */
const BRANCH_OPTIONS = [
  "Warehouse ABC",
  "Warehouse XYZ",
  "Main Distribution Hub",
];

/* ── Sort Options ─────────────────────────────────────────────────────────────── */
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
];

/* ── Mock Data ───────────────────────────────────────────────────────────────── */
const MOCK_SECTIONS = [
  {
    label: "Today",
    date: "2026-09-04",
    rows: [
      { id: "rcv-t1", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Partial", passedQty: "15,000 kg", failedQty: "5,000 kg", bay: "Bay A-1", inspector: "Inspector Cruz", date: "2026-09-04" },
      { id: "rcv-t2", batchNo: "Batch 2026 - 001", branch: "Warehouse XYZ", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Passed", passedQty: "20,000 kg", failedQty: "0 kg", bay: "Bay A-2", inspector: "Inspector Cruz", date: "2026-09-04" },
      { id: "rcv-t3", batchNo: "Batch 2026 - 001", branch: "Main Distribution Hub", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Failed", passedQty: "0 kg", failedQty: "20,000 kg", bay: "Rejection Bay", inspector: "Inspector Santos", date: "2026-09-04" },
    ],
  },
  {
    label: "Yesterday",
    date: "2026-09-03",
    rows: [
      { id: "rcv-y1", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Partial", passedQty: "16,000 kg", failedQty: "4,000 kg", bay: "Bay B-1", inspector: "Inspector Cruz", date: "2026-09-03" },
      { id: "rcv-y2", batchNo: "Batch 2026 - 001", branch: "Warehouse XYZ", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Passed", passedQty: "20,000 kg", failedQty: "0 kg", bay: "Bay B-2", inspector: "Inspector Cruz", date: "2026-09-03" },
      { id: "rcv-y3", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Failed", passedQty: "0 kg", failedQty: "20,000 kg", bay: "Rejection Bay", inspector: "Inspector Santos", date: "2026-09-03" },
      { id: "rcv-y4", batchNo: "Batch 2026 - 001", branch: "Main Distribution Hub", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Passed", passedQty: "20,000 kg", failedQty: "0 kg", bay: "Bay B-3", inspector: "Inspector Cruz", date: "2026-09-03" },
    ],
  },
  {
    label: "July 16, 2026",
    date: "2026-07-16",
    rows: [
      { id: "rcv-j1", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Partial", passedQty: "14,000 kg", failedQty: "6,000 kg", bay: "Bay C-1", inspector: "Inspector Cruz", date: "2026-07-16" },
      { id: "rcv-j2", batchNo: "Batch 2026 - 001", branch: "Warehouse XYZ", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Passed", passedQty: "20,000 kg", failedQty: "0 kg", bay: "Bay C-2", inspector: "Inspector Santos", date: "2026-07-16" },
      { id: "rcv-j3", batchNo: "Batch 2026 - 001", branch: "Main Distribution Hub", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Failed", passedQty: "0 kg", failedQty: "20,000 kg", bay: "Rejection Bay", inspector: "Inspector Santos", date: "2026-07-16" },
    ],
  },
];

export default function ProcurementReceivingHistory() {
  const [search, setSearch] = useState("");
  const [qcStatusFilter, setQcStatusFilter] = useState("QC Status");
  const [branchFilter, setBranchFilter] = useState("Branch");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortDrop, setShowSortDrop] = useState(false);

  const dateRef = useRef(null);
  const sortRef = useRef(null);

  // Click outside listener for popovers
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

  // Format and filter sectioned data for SectionedTableCard
  const filteredSections = useMemo(() => {
    return MOCK_SECTIONS.map((sec) => {
      const filteredRows = sec.rows.filter((r) => {
        // Search Filter
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchB = r.batchNo.toLowerCase().includes(q);
          const matchS = r.supplier.toLowerCase().includes(q);
          const matchV = r.variant.toLowerCase().includes(q);
          const matchBr = r.branch.toLowerCase().includes(q);
          if (!matchB && !matchS && !matchV && !matchBr) return false;
        }

        // QC Status Filter
        if (qcStatusFilter !== "QC Status" && qcStatusFilter !== "All") {
          if (r.qcStatus !== qcStatusFilter) return false;
        }

        // Date Range Filter
        if (dateRange.startDate && r.date < dateRange.startDate) return false;
        if (dateRange.endDate && r.date > dateRange.endDate) return false;

        // Branch Filter
        if (branchFilter !== "Branch" && branchFilter !== "All") {
          if (r.branch !== branchFilter) return false;
        }

        return true;
      });

      const formattedRows = filteredRows.map((row) => ({
        ...row,
        qcStatus: (
          <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-normal ${QC_STATUS_PILLS[row.qcStatus]}`}>
            {row.qcStatus}
          </span>
        ),
        action: (
          <button
            type="button"
            onClick={() => setSelectedRecord(row)}
            className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition inline-flex items-center gap-1 text-xs cursor-pointer"
            title="View Details"
          >
            <Eye size={15} />
            <span>View</span>
          </button>
        ),
      }));

      return {
        label: sec.label,
        rows: formattedRows,
      };
    }).filter((sec) => sec.rows.length > 0);
  }, [search, qcStatusFilter, dateRange, branchFilter]);

  const TOTAL_PAGES = 4;

  return (
    <div className="space-y-5">
      {/* ── Breadcrumb & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Procurement Receiving History" }]} />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-[-0.03em] text-slate-900">
          Procurement Receiving History
        </h1>
        <p className="text-sm text-slate-500">
          Complete history of received deliveries after quality inspection.
        </p>
      </div>

      {/* ── Search Bar & Filter Controls ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search batch no., supplier, or product"
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter and Sort Dropdowns */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">

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
              className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px]"
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
              <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[180px]">
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

          {/* Branch Filter Dropdown (Placed as Last Filter) */}
          <div className="relative w-full sm:w-auto">
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Branch">All Branches</option>
              {BRANCH_OPTIONS.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* ── Shared SectionedTableCard Component ─────────────────────────────── */}
      <SectionedTableCard
        columns={TABLE_COLUMNS}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        footerLabel={`Showing receiving records — Page ${currentPage} of ${TOTAL_PAGES}`}
      />

      {/* ── Receiving & QC Inspection Detail Modal ─────────────────────────── */}
      {selectedRecord &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-normal text-gray-900 text-base">Quality Inspection Report</h3>
                    <p className="text-xs text-gray-500">{selectedRecord.batchNo}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 bg-gray-50 p-4 rounded-xl text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Warehouse Facility:</span>
                  <span className="font-normal text-gray-900">{selectedRecord.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Grain Supplier:</span>
                  <span className="font-normal text-gray-900">{selectedRecord.supplier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rice Variant:</span>
                  <span className="font-normal text-gray-900">{selectedRecord.variant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Assigned Storage Bay:</span>
                  <span className="font-normal text-gray-800">{selectedRecord.bay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">QC Inspector:</span>
                  <span className="font-normal text-gray-800">{selectedRecord.inspector}</span>
                </div>

                <div className="border-t border-gray-200 pt-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-normal">Total Intake Quantity:</span>
                    <span className="font-normal text-gray-900 text-sm">{selectedRecord.qty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700 font-normal">Passed Inspection (Accepted):</span>
                    <span className="font-normal text-emerald-700">{selectedRecord.passedQty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-600 font-normal">Failed Inspection (Rejected):</span>
                    <span className="font-normal text-rose-600">{selectedRecord.failedQty}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-gray-500">Final QC Status:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-normal ${QC_STATUS_PILLS[selectedRecord.qcStatus]}`}>
                      {selectedRecord.qcStatus}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="w-full py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white font-normal text-xs rounded-xl transition cursor-pointer"
              >
                Close Inspection Details
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}