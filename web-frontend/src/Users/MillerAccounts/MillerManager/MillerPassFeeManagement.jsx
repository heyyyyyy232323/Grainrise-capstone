import Toast from "../../../Components/Modals/Toast";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, Plus, ChevronDown, Calendar, X, Loader2 } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import FarePolicyModal from "../../../Components/Modals/MillerManager/FarePolicyModal";
import useApi from "../../../Components/hooks/useApi";

const STATUS_OPTIONS = ["Status", "All Statuses", "Active", "Archive"];
const SORT_OPTIONS = ["Sort By", "Latest", "Oldest", "Base Fee: High to Low", "Base Fee: Low to High"];

export default function MillerFareFeeManagement() {
  const { request } = useApi();

  const [rates, setRates] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Status");
  const [sortBy, setSortBy] = useState("Sort By");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMsg, setToastMsg] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState(null);

  // Popover dismissal handling for Date Picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Fetch policies and branches from live database
  const fetchFarePolicies = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await request("/miller/fare-fee/");
      if (res && res.success) {
        const rawData = Array.isArray(res.data) ? res.data : [];
        const mapped = rawData.map((item) => ({
          id: item.fare_fee_id,
          fareFeeId: item.fare_fee_id,
          rateName: item.rate_name || "",
          description: item.description || "",
          freeDeliveryDistance: item.free_delivery_distance,
          freeDistance: `${Number(item.free_delivery_distance || 0).toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })} km`,
          rawBaseFee: Number(item.base_fee || 0),
          baseFee: `₱ ${Number(item.base_fee || 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          rawAdditionalFee: Number(item.additional_fee_per_kilometers || 0),
          additionalFee: `₱ ${Number(item.additional_fee_per_kilometers || 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}/km`,
          status: item.status || (item.raw_status === "archived" ? "Archived" : "Active"),
          rawStatus: item.raw_status || (item.status === "Archived" ? "archived" : "active"),
          archiveReason: item.archive_reason || "",
          lastUpdatedDate: item.last_updated_date || "",
          lastUpdatedTime: item.last_updated_time || "",
          isoDate: item.iso_date || "",
          effectiveBranches: item.effective_branches || [],
          effectiveBranchIds: item.effective_branch_ids || [],
          rawItem: item,
        }));
        setRates(mapped);

        if (Array.isArray(res.branches) && res.branches.length > 0) {
          setBranches(res.branches);
        }
      }
    } catch (err) {
      console.error("Failed to load fare policies:", err);
      showToast("Failed to load fare policies.");
    } finally {
      setIsLoading(false);
    }
  }, [request]);

  // Load branches fallback if not provided in initial response
  const fetchBranches = useCallback(async () => {
    try {
      const res = await request("/miller/branches/");
      if (res && res.success && Array.isArray(res.data)) {
        setBranches(res.data);
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  }, [request]);

  useEffect(() => {
    fetchFarePolicies();
    fetchBranches();
  }, [fetchFarePolicies, fetchBranches]);

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

  const handleModalSuccess = (savedPolicy, message) => {
    showToast(message || "Fare policy saved successfully.");
    fetchFarePolicies();
  };

  const columns = [
    {
      key: "rateName",
      label: "Rate Name",
      width: "22%",
      renderCell: (row) => (
        <div>
          <p className="text-[13px] font-medium text-slate-700">{row.rateName}</p>
          {row.description ? (
            <p className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">{row.description}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "freeDistance",
      label: "Free Delivery Distance (km)",
      width: "18%",
      renderCell: (row) => <span className="text-[13px] font-medium text-slate-700">{row.freeDistance}</span>,
    },
    {
      key: "baseFee",
      label: "Base Fee",
      width: "12%",
      renderCell: (row) => <span className="text-[13px] font-medium text-slate-700">{row.baseFee}</span>,
    },
    {
      key: "additionalFee",
      label: "Additional Fee (₱/km)",
      width: "16%",
      renderCell: (row) => <span className="text-[13px] font-medium text-slate-700">{row.additionalFee}</span>,
    },
    {
      key: "status",
      label: "Status",
      width: "10%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      renderCell: (row) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            row.status === "Active"
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-rose-100 text-rose-700 border border-rose-200"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "lastUpdatedDate",
      label: "Last Updated",
      width: "14%",
      renderCell: (row) => (
        <div>
          <p className="text-[13px] font-medium text-slate-700">{row.lastUpdatedDate}</p>
          <p className="text-[10px] text-gray-400 font-medium">{row.lastUpdatedTime}</p>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: "8%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      renderCell: (row) => (
        <button
          type="button"
          onClick={() => setEditModalData(row.rawItem || row)}
          className="rounded-full border border-slate-200 bg-white px-3.5 py-1 text-[11px] font-semibold text-gray-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer"
        >
          Edit
        </button>
      ),
    },
  ];

  const filteredRates = useMemo(() => {
    let result = rates.filter((item) => {
      // Search Filter
      const q = search.trim().toLowerCase();
      const matchSearch =
        q === "" ||
        item.rateName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);

      // Status Filter
      const matchStatus =
        statusFilter === "Status" ||
        statusFilter === "All Statuses" ||
        item.status === statusFilter ||
        (statusFilter === "Archive" && (item.status === "Archive" || item.status === "Archived"));

      // Date Range Filter
      const matchStart = !dateRange.startDate || item.isoDate >= dateRange.startDate;
      const matchEnd = !dateRange.endDate || item.isoDate <= dateRange.endDate;

      return matchSearch && matchStatus && matchStart && matchEnd;
    });

    // Sorting Logic
    if (sortBy === "Latest") {
      result.sort((a, b) =>
        (b.rawItem?.updated_at || b.rawItem?.created_at || b.isoDate || "").localeCompare(
          a.rawItem?.updated_at || a.rawItem?.created_at || a.isoDate || ""
        )
      );
    } else if (sortBy === "Oldest") {
      result.sort((a, b) =>
        (a.rawItem?.updated_at || a.rawItem?.created_at || a.isoDate || "").localeCompare(
          b.rawItem?.updated_at || b.rawItem?.created_at || b.isoDate || ""
        )
      );
    } else if (sortBy === "Base Fee: High to Low") {
      result.sort((a, b) => b.rawBaseFee - a.rawBaseFee);
    } else if (sortBy === "Base Fee: Low to High") {
      result.sort((a, b) => a.rawBaseFee - b.rawBaseFee);
    }

    return result;
  }, [rates, search, statusFilter, dateRange, sortBy]);

  const itemsPerPage = 10;
  const rawCount = filteredRates.length;
  const totalPages = Math.max(1, Math.ceil(rawCount / itemsPerPage));

  const paginatedRates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRates.slice(start, start + itemsPerPage);
  }, [filteredRates, currentPage]);

  const tableSections = useMemo(() => [{ rows: paginatedRates }], [paginatedRates]);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Page Header ────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Fare Fee Management" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Fare Fee Management
        </h2>
        <p className="text-sm text-slate-500">
          Manage the delivery rates used to calculate transportation fees for eligible orders.
        </p>
      </div>

      {/* ── Toolbar Controls & Actions ───────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-3 mb-2 items-stretch lg:items-center justify-between">
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
              placeholder="Search rate name, description"
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

          {/* 2. Status Select Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>

          {/* 3. Sort By Select Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>
        </div>

        {/* Right-side Action Button: Replaced Generate Financial Reports with Add New Fare Policy */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B5D1E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#084b18] transition cursor-pointer whitespace-nowrap h-[38px]"
          >
            <Plus size={16} />
            Add New Fare Policy
          </button>
        </div>
      </div>

      {/* ── Toast Alert ────────────────────────────────────────────────────── */}
      {toastMsg && (
        <Toast
          isOpen
          type="success"
          message={toastMsg}
          duration={3000}
          onClose={() => setToastMsg("")}
        />
      )}

      {/* ── Sectioned Table Card Component ───────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={tableSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={`Showing rate records — Page ${currentPage} of ${totalPages}`}
        emptyStateTitle="No fare rate records found"
        emptyStateDescription="No matching fare policies were found. Create a new fare policy to manage delivery fees."
      />

      {/* ── Add Fare Policy Modal ────────────────────────────────────────── */}
      <FarePolicyModal
        isOpen={isAddModalOpen}
        mode="add"
        branches={branches}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      {/* ── Edit Fare Policy Modal ───────────────────────────────────────── */}
      <FarePolicyModal
        isOpen={Boolean(editModalData)}
        mode="edit"
        policy={editModalData}
        branches={branches}
        onClose={() => setEditModalData(null)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}