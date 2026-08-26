import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

/* 71 records matching the Figma data: first 4 Paid, next 3 Approved, rest Pending */
const sampleData = Array.from({ length: 71 }, (_, i) => ({
  id: `r-${i + 1}`,
  category:     "Vehicle Repair",
  amount:       3500,
  requester:    "Juan Dela Cruz",
  expense_date: new Date(2026, 3, 14).toISOString(), // Apr 14, 2026
  status:       i < 4 ? "Paid" : i < 7 ? "Approved" : "Pending",
}));

const STATUS_OPTIONS = [
  { value: "",         label: "Status"   },
  { value: "Paid",     label: "Paid"     },
  { value: "Approved", label: "Approved" },
  { value: "Pending",  label: "Pending"  },
];

export default function MillerReimbursementHistory() {
  const [query,        setQuery]        = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage,  setCurrentPage]  = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sampleData.filter((r) => {
      const matchesQuery =
        q === "" ||
        `${r.category} ${r.requester}`.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "" ||
        r.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter]);

  const itemsPerPage = 10;
  const totalPages   = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex   = (currentPage - 1) * itemsPerPage;
  const paginated    = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections     = [{ rows: paginated }];

  const columns = [
    { key: "category",  label: "Expense Category", width: "20%" },
    {
      key: "amount",
      label: "Amount",
      width: "14%",
      render: (row) => (
        <span>₱{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    { key: "requester", label: "Requested By", width: "20%" },
    {
      key: "expense_date",
      label: "Expense Date",
      width: "16%",
      render: (row) => {
        const d = new Date(row.expense_date);
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      },
    },
    { key: "status", label: "Status", width: "14%" },
    {
      key: "action",
      label: "Action",
      width: "12%",
      headerClassName: "text-center",
      cellClassName:   "!text-center",
    },
  ];

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Records", path: "/miller-logistics/assigned-history" },
          { label: "Reimbursement History" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Reimbursement History
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          View submitted reimbursement requests and their payment status.
        </p>
      </div>

      {/* Search + Status filter row */}
      <div className="mt-4 mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-lg">
          <SearchFilter
            onSearch={(v) => { setQuery(v); setCurrentPage(1); }}
            placeholder="Search category, description, requester"
          />
        </div>

        {/* Status dropdown */}
        <div className="flex-none">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="rounded-[8px] border border-slate-200 bg-white px-2 py-2 text-[13px] text-slate-600 cursor-pointer focus:outline-none focus:border-[#0B5D1E] hover:border-slate-400 transition-colors"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setCurrentPage(p)}
        onViewDetails={(row) => console.log("View details:", row.id)}
        footerLabel={`Showing ${startIndex + 1}-${Math.min(
          startIndex + itemsPerPage,
          filtered.length
        )} of ${filtered.length} reimbursement requests`}
      />
    </div>
  );
}

