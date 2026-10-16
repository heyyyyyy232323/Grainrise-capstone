import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Eye,
  Plus,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Toast from "../../../Components/Minor-Components/Toast";
import useToast from "../../../Components/hooks/useToast";
import useApi from "../../../Components/hooks/useApi";
import AddExpenseModal from "../../../Components/Modals/MillerManager/AddExpenseModal";
import ExpenseViewModal from "../../../Components/Modals/MillerManager/ExpenseViewModal";

const SORT_OPTIONS = [
  { value: "nearest_deadline", label: "Nearest Deadline First" },
  { value: "farthest_deadline", label: "Farthest Deadline First" },
  { value: "highest_amount", label: "Highest Amount First" },
  { value: "lowest_amount", label: "Lowest Amount First" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "near_deadline", label: "Near Deadline" },
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

export default function MillerExpenseManagement() {
  const { request } = useApi();
  const { toasts, showToast, removeToast } = useToast();

  const [expenses, setExpenses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [backendTypes, setBackendTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("nearest_deadline");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state: strictly ONE modal visible at a time ('add' | 'view' | null)
  const [activeModal, setActiveModal] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Fetch owned branches for filter & modal dropdown
  const loadBranches = useCallback(async () => {
    try {
      const res = await request("/miller/expenses/branches/", { method: "GET" });
      if (res && res.success && res.data) {
        setBranches(res.data);
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  }, [request]);

  // Fetch expenses with backend filtering
  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (selectedBranch && selectedBranch !== "all") params.append("branch", selectedBranch);
      if (selectedType && selectedType !== "all") params.append("type", selectedType);
      if (selectedStatus && selectedStatus !== "all") params.append("status", selectedStatus);
      if (sortBy) params.append("sort_by", sortBy);

      const url = `/miller/expenses/?${params.toString()}`;
      const res = await request(url, { method: "GET" });
      if (res && res.success) {
        setExpenses(res.data || []);
        if (res.types && Array.isArray(res.types)) {
          setBackendTypes(res.types);
        }
      }
    } catch (err) {
      console.error("Failed to load expenses:", err);
      showToast({
        type: "error",
        title: "Load Failed",
        message: "Failed to load expenses list. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [request, searchQuery, selectedBranch, selectedType, selectedStatus, sortBy, showToast]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Build dynamic options for branch filter
  const branchOptions = useMemo(() => {
    return [
      { label: "All Branches", value: "all" },
      ...branches.map((b) => ({
        label: b.display_name || b.business_name,
        value: String(b.supplier_profile_id),
      })),
    ];
  }, [branches]);

  // Type Filter: Always show all 10 predefined categories + unique custom types from database
  const typeOptions = useMemo(() => {
    const combinedSet = new Set(PRESET_EXPENSE_TYPES);
    if (backendTypes && backendTypes.length > 0) {
      backendTypes.forEach((t) => combinedSet.add(t));
    }
    expenses.forEach((e) => {
      if (e.expense_type) combinedSet.add(e.expense_type);
    });

    const list = Array.from(combinedSet);
    return [
      { label: "All Types", value: "all" },
      ...list.map((t) => ({ label: t, value: t })),
    ];
  }, [backendTypes, expenses]);

  // Handle Add Expense Success
  const handleAddSuccess = (newExpense) => {
    setActiveModal(null);
    showToast({
      type: "success",
      title: "Expense Created",
      message: `Expense reference #${newExpense.setting_reference_no} created successfully.`,
    });
    loadExpenses();
  };

  // Open View Modal
  const handleOpenView = (expense) => {
    setSelectedExpense(expense);
    setActiveModal("view");
  };

  const handleCloseModals = () => {
    setActiveModal(null);
    setSelectedExpense(null);
  };

  // Table Columns EXACTLY: Branch | Type | Description | Price | Deadline | Action
  // NOTE: Strict QA instruction: Do not add Overdue/Near Deadline badges to the Manager table.
  const columns = [
    {
      key: "branch",
      label: "Branch",
      width: "20%",
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs sm:text-sm block">
            {row.branch_name}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {row.setting_reference_no}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      width: "16%",
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {row.expense_type}
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      width: "26%",
      render: (row) => (
        <p
          className="text-xs text-slate-600 line-clamp-2 max-w-xs break-words"
          title={row.description}
        >
          {row.description}
        </p>
      ),
    },
    {
      key: "price",
      label: "Price",
      width: "15%",
      render: (row) => (
        <span className="font-bold text-[#0B5D1E] text-xs sm:text-sm">
          {row.price}
        </span>
      ),
    },
    {
      key: "deadline",
      label: "Deadline",
      width: "15%",
      render: (row) => {
        const isPaid = row.status === "paid";
        return (
          <div className="space-y-1">
            <span className="text-xs text-slate-700 font-medium block">
              {row.deadline_formatted || row.deadline}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isPaid
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              {isPaid ? "Paid" : "Pending"}
            </span>
          </div>
        );
      },
    },
    {
      key: "action",
      label: "Action",
      width: "8%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleOpenView(row)}
          className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition inline-flex items-center gap-1 text-xs cursor-pointer font-medium"
          title="View Details"
        >
          <Eye size={15} />
          <span>View</span>
        </button>
      ),
    },
  ];

  // Pagination calculation
  const totalCount = expenses.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = expenses.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginatedRows }], [paginatedRows]);

  return (
    <div className="space-y-4">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Breadcrumbs & Title ── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Management" },
            { label: "Expense Management" },
          ]}
        />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Expense Management
        </h2>
        <p className="text-sm text-slate-500">
          Set, review, and track operational expenses across your registered branches.
        </p>
      </div>

      {/* ── Filter Controls & Right-Aligned Counter + Add Button (Matching SupplierManagement.jsx) ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-2 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search */}
          <div className="w-full max-w-xs sm:w-64">
            <SearchFilter
              onSearch={(v) => {
                setSearchQuery(v);
                setCurrentPage(1);
              }}
              placeholder="Search reference, branch, type..."
            />
          </div>

          {/* Branch Filter */}
          <div className="w-full sm:w-40">
            <Dropdown
              options={branchOptions}
              value={selectedBranch}
              onChange={(v) => {
                setSelectedBranch(v);
                setCurrentPage(1);
              }}
              placeholder="Branch"
            />
          </div>

          {/* Type Filter */}
          <div className="w-full sm:w-36">
            <Dropdown
              options={typeOptions}
              value={selectedType}
              onChange={(v) => {
                setSelectedType(v);
                setCurrentPage(1);
              }}
              placeholder="Type"
            />
          </div>

          {/* Status Filter ONLY (All Status, Pending, Paid, Overdue, Near Deadline) */}
          <div className="w-full sm:w-36">
            <Dropdown
              options={STATUS_OPTIONS}
              value={selectedStatus}
              onChange={(v) => {
                setSelectedStatus(v);
                setCurrentPage(1);
              }}
              placeholder="Status"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="w-full sm:w-52">
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

        {/* Counter Badge & Add Expense Button (Aligned Right, matching SupplierManagement) */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 h-[38px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>{totalCount} expenses</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveModal("add")}
            className="flex items-center justify-center gap-1.5 bg-[#0B5D1E] hover:bg-[#084b18] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap h-[38px] shadow-xs"
          >
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {/* Table Card */}
      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={
          expenses.length > 0
            ? `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(
                currentPage * itemsPerPage,
                expenses.length
              )} of ${expenses.length} expenses`
            : "Showing 0 expenses"
        }
      />

      {/* ── Add Expense Modal ── */}
      {activeModal === "add" && (
        <AddExpenseModal
          isOpen={true}
          onClose={handleCloseModals}
          branches={branches}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* ── View Expense Modal ── */}
      {activeModal === "view" && selectedExpense && (
        <ExpenseViewModal
          isOpen={true}
          onClose={handleCloseModals}
          expense={selectedExpense}
        />
      )}
    </div>
  );
}
