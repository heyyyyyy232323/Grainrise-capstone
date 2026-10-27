import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import ToastNotification from "../../../Components/Modals/Toast";
import useApi from "../../../Components/hooks/useApi";
import WarehouseExpensePayNowModal from "../../../Components/Modals/WarehouseFinance/WarehouseExpensePayNowModal";
import WarehouseExpenseReceiptModal from "../../../Components/Modals/WarehouseFinance/WarehouseExpenseReceiptModal";

const SORT_OPTIONS = [
  { value: "nearest_deadline", label: "Nearest Deadline First" },
  { value: "farthest_deadline", label: "Farthest Deadline First" },
  { value: "highest_amount", label: "Highest Amount First" },
  { value: "lowest_amount", label: "Lowest Amount First" },
];

const PRESET_EXPENSE_TYPES = [
  "Utilities",
  "Transportation",
  "Machinery Maintenance & Repair",
  "Operating Supplies",
  "Rent & Facilities",
  "Salaries & Wages",
  "Taxes & Government Fees",
  "Equipments",
  "Administrative",
  "Others",
];

export default function WarehouseExpenses() {
  const location = useLocation();
  const isManager = location.pathname.startsWith("/warehouse-manager");
  const { request } = useApi();

  const [expenses, setExpenses] = useState([]);
  const [backendTypes, setBackendTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("nearest_deadline");
  const [currentPage, setCurrentPage] = useState(1);

  // Strict modal management: exactly ONE modal at a time ('pay_now' | 'receipt' | null)
  const [activeModal, setActiveModal] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  // Toast feedback
  const [toast, setToast] = useState(null);

  // Fetch pending expenses for the authenticated Warehouse branch
  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (selectedType && selectedType !== "all") params.append("type", selectedType);
      if (sortBy) params.append("sort_by", sortBy);

      const res = await request(`/warehouse/finance/expenses/?${params.toString()}`, {
        method: "GET",
      });

      if (res && res.success && res.data) {
        setExpenses(res.data);
        if (res.types && Array.isArray(res.types)) {
          setBackendTypes(res.types);
        }
      }
    } catch (err) {
      console.error("Failed to load warehouse expenses:", err);
      const msg = err?.message || err?.detail || "";
      const cleanMsg =
        typeof msg === "string" && msg.trim() && !/<[a-z][\s\S]*>/i.test(msg)
          ? msg
          : "Failed to load expenses records. Please refresh the page.";
      setToast({
        type: "error",
        message: cleanMsg,
      });
    } finally {
      setIsLoading(false);
    }
  }, [request, searchQuery, selectedType, sortBy]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Type Filter: Always show all 10 predefined categories + unique custom types from database
  const typeOptions = useMemo(() => {
    const combinedSet = new Set(PRESET_EXPENSE_TYPES);
    if (backendTypes && backendTypes.length > 0) {
      backendTypes.forEach((t) => combinedSet.add(t));
    }
    expenses.forEach((e) => {
      if (e.expense_type) combinedSet.add(e.expense_type);
    });

    const sortedTypes = Array.from(combinedSet).sort();
    return [
      { label: "All Types", value: "all" },
      ...sortedTypes.map((t) => ({ label: t, value: t })),
    ];
  }, [backendTypes, expenses]);

  // Modal handlers
  const handleOpenPayNow = (row) => {
    setSelectedExpense(row);
    setReceiptData(null);
    setActiveModal("pay_now");
  };

  const handleClosePayNow = () => {
    setActiveModal(null);
    setSelectedExpense(null);
  };

  const handlePaymentSuccess = (receipt) => {
    // 1. Close and unmount Pay Now modal FIRST (strictly unstacked)
    setActiveModal(null);
    setSelectedExpense(null);

    // 2. Refresh expenses table so paid record immediately disappears from list
    fetchExpenses();

    // 3. Open Receipt Modal with returned receipt
    setReceiptData(receipt);
    setActiveModal("receipt");
  };

  const handleCloseReceiptModal = () => {
    setActiveModal(null);
    setReceiptData(null);
    setSelectedExpense(null);
  };

  // Table columns EXACTLY: Setting Reference No. | Type | Description | Price | Deadline | Action
  const columns = [
    {
      key: "settingReferenceNo",
      label: "Setting Reference No.",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {row.setting_reference_no}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {row.expense_type}
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (row) => (
        <p
          className="text-xs text-slate-600 line-clamp-1 max-w-sm truncate"
          title={row.description}
        >
          {row.description}
        </p>
      ),
    },
    {
      key: "price",
      label: "Price",
      render: (row) => (
        <span className="font-bold text-[#0B5D1E] text-xs sm:text-sm">
          {row.price}
        </span>
      ),
    },
    {
      key: "deadline",
      label: "Deadline",
      render: (row) => (
        <div className="space-y-1">
          <span className="text-xs text-slate-700 font-medium block">
            {row.deadline_formatted || row.deadline}
          </span>
          {row.deadline_badge === "overdue" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
              Overdue
            </span>
          )}
          {row.deadline_badge === "near_deadline" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
              Near Deadline
            </span>
          )}
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      headerClassName: "text-center",
      cellClassName: "!text-center !pr-3",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleOpenPayNow(row)}
          className="inline-flex items-center justify-center px-3 py-1 h-7 rounded-lg text-white text-xs font-semibold hover:bg-[#016b0f] transition cursor-pointer"
          style={{ backgroundColor: "#018311", minWidth: 72 }}
        >
          Pay Now
        </button>
      ),
    },
  ];

  // Pagination (10 rows per page)
  const itemsPerPage = 10;
  const totalCount = expenses.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = expenses.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div>
      {toast && (
        <ToastNotification
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <Breadcrumbs
        items={
          isManager
            ? [
                { label: "Management", path: "/warehouse-manager/dashboard" },
                { label: "Expense Management" },
              ]
            : [
                { label: "Finance", path: "/warehouse-finance/dashboard" },
                { label: "Expenses" },
              ]
        }
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {isManager ? "Expense Management" : "Expenses"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and disburse pending operational expenses for your branch.
        </p>
      </div>

      {/* Filters Bar matching Payables exactly */}
      <div className="mt-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="w-full max-w-xs sm:w-72">
            <SearchFilter
              onSearch={(v) => {
                setSearchQuery(v);
                setCurrentPage(1);
              }}
              placeholder="Search reference, type, description"
            />
          </div>

          <div className="w-full sm:w-44">
            <Dropdown
              options={typeOptions}
              value={selectedType}
              onChange={(v) => {
                setSelectedType(v);
                setCurrentPage(1);
              }}
              placeholder="Expense Type"
            />
          </div>

          <div className="w-full sm:w-56">
            <SortByDropdown
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={(v) => {
                setSortBy(v);
                setCurrentPage(1);
              }}
              placeholder="Sort By"
            />
          </div>
        </div>

        {/* Counter Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 self-start sm:self-center h-[38px] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          <span>{totalCount} pending expenses</span>
        </div>
      </div>

      {/* Sectioned Table Card */}
      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        isLoading={isLoading}
        footerLabel={
          expenses.length > 0
            ? `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(
                currentPage * itemsPerPage,
                expenses.length
              )} of ${expenses.length} expenses`
            : "Showing 0 pending expenses"
        }
      />

      {/* ── Pay Now Modal ── */}
      {activeModal === "pay_now" && selectedExpense && (
        <WarehouseExpensePayNowModal
          isOpen={true}
          onClose={handleClosePayNow}
          expense={selectedExpense}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* ── Success Receipt Modal ── */}
      {activeModal === "receipt" && receiptData && (
        <WarehouseExpenseReceiptModal
          isOpen={true}
          onClose={handleCloseReceiptModal}
          receipt={receiptData}
        />
      )}
    </div>
  );
}
