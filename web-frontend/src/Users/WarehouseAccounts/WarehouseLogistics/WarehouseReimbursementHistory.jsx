import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const sampleData = Array.from({ length: 11 }, (_, i) => ({
  id: `r-${i + 1}`,
  category: "Vehicle Repair",
  amount: 3500 + (i % 3) * 250,
  requester: "Juan Dela Cruz",
  expense_date: new Date(2026, 3, 14).toISOString(),
  status: i < 3 ? "Paid" : i < 6 ? "Approved" : "Pending",
  actionLabel: "View Details",
}));

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "amount-desc", label: "Amount (High to Low)" },
  { value: "amount-asc", label: "Amount (Low to High)" },
];

export default function WarehouseReimbursementHistory() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = sampleData.filter((r) => {
      const matchesQuery =
        q === "" ||
        `${r.category} ${r.requester}`.toLowerCase().includes(q);
      const matchesStatus =
        !statusFilter || String(r.status).toLowerCase() === String(statusFilter).toLowerCase();
      return matchesQuery && matchesStatus;
    });
    if (sortBy === "amount-desc") result.sort((a, b) => b.amount - a.amount);
    else if (sortBy === "amount-asc") result.sort((a, b) => a.amount - b.amount);
    else if (sortBy === "date-asc") result.sort((a, b) => a.expense_date.localeCompare(b.expense_date));
    else if (sortBy === "date-desc") result.sort((a, b) => b.expense_date.localeCompare(a.expense_date));
    return result;
  }, [query, statusFilter, sortBy]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const columns = [
    { key: "category", label: "Expense Category" },
    {
      key: "amount",
      label: "Amount",
      render: (row) => <span>₱{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>,
    },
    { key: "requester", label: "Requested By" },
    {
      key: "expense_date",
      label: "Expense Date",
      render: (row) => {
        const d = new Date(row.expense_date);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      },
    },
    { key: "status", label: "Status" },
    { key: "action", label: "Action" },
  ];

  const sections = [{ rows: paginated }];

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Records", path: "/warehouse-logistics/assigned-history" },
          { label: "Reimbursement History" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reimbursement History</h1>
        <p className="text-sm text-slate-500 mt-1">View submitted reimbursement requests and their payment status.</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <SearchFilter onSearch={(v) => { setQuery(v); setCurrentPage(1); }} placeholder="Search category, description, requester" />
        </div>

        <div className="w-36">
          <Dropdown
            options={[
              { label: "All Status", value: "" },
              { label: "Paid", value: "Paid" },
              { label: "Approved", value: "Approved" },
              { label: "Pending", value: "Pending" },
            ]}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
            placeholder="Status"
          />
        </div>

        <SortByDropdown
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(v) => { setSortBy(v); setCurrentPage(1); }}
        />
      </div>

      <div className="mt-4">
        <SectionedTableCard
          title={null}
          columns={columns}
          sections={sections}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          footerLabel={`Showing ${startIndex + 1}-${Math.min(startIndex + paginated.length, filtered.length)} of ${filtered.length} reimbursement requests`}
          onViewDetails={(row) => alert(`View details: ${row.id}`)}
        />
      </div>
    </div>
  );
}
