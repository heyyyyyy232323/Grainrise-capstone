import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const TABS = [
  { id: "payables", label: "Procurement Payables" },
  { id: "taxes", label: "Tax Compliance Record" },
  { id: "reimburse", label: "Reimbursement" },
];

// sample data for each tab (lightweight)
const samplePayables = Array.from({ length: 24 }, (_, i) => ({
  id: `p-${i + 1}`,
  // mark as paid history so it's distinct from active Payables page
  batchNo: `Paid Batch 2026 - 00${(i % 12) + 1}`,
  supplier: `Supplier A (Paid)`,
  variant: "Dinorado",
  stockQty: "200 kg",
  unitPrice: "₱45.00",
  total: "₱9,000.00",
  paidAt: "Sep 30, 2026",
}));

const sampleTaxes = Array.from({ length: 24 }, (_, i) => ({
  id: `t-${i + 1}`,
  name: i % 2 === 0 ? "3% Percentage Tax" : "Local Business Tax",
  desc: i % 2 === 0 ? "Tax imposed by BIR on non-VAT registered businesses..." : "Local tax imposed by the LGU...",
  cost: i % 2 === 0 ? "₱1.00" : "₱10,310.20",
  period: i % 2 === 0 ? "Quarterly" : "Yearly",
  dueDate: "Sep 30, 2026",
}));

const sampleReimburse = Array.from({ length: 24 }, (_, i) => ({
  id: `r-${i + 1}`,
  category:
    i % 3 === 0
      ? "Logistics / Delivery Reimbursement"
      : i % 3 === 1
      ? "Warehouse Operation"
      : "Payroll",
  description:
    i % 3 === 0
      ? "Fuel reimbursement for delivery truck"
      : i % 3 === 1
      ? "Warehouse supply expense"
      : "Weekly salary payout",
  cost: i % 3 === 0 ? "₱2,500.00" : "₱150.00",
  requester: i % 3 === 0 ? "Logistics A" : i % 3 === 1 ? "Driver A" : "Finance A",
  date: `Apr ${(i % 12) + 1}, 2026`,
}));

export default function WarehousePaymentHistory() {
  const [activeTab, setActiveTab] = useState("payables");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [variantFilter, setVariantFilter] = useState("");
  const [page, setPage] = useState(1);

  const data = useMemo(() => {
    if (activeTab === "payables") return samplePayables;
    if (activeTab === "taxes") return sampleTaxes;
    return sampleReimburse;
  }, [activeTab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((r) => {
      if (!q) return true;
      return Object.values(r).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, query]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  // columns per tab
  const columns = activeTab === "payables" ? [
    { key: "batchNo", label: "Batch No." },
    { key: "supplier", label: "Supplier" },
    { key: "variant", label: "Variant" },
    { key: "stockQty", label: "Stock Qty (KG)" },
    { key: "unitPrice", label: "Unit Price" },
    { key: "total", label: "Total" },
    { key: "paidAt", label: "Paid At" },
  ] : activeTab === "taxes" ? [
    { key: "name", label: "Name of Tax" },
    {
      key: "desc",
      label: "Description",
      render: (row) => (
        <span className="text-[13px] text-slate-600">
          {row.desc}
        </span>
      ),
    },
    { key: "cost", label: "Cost Value" },
    {
      key: "period",
      label: "Tax Period",
      render: (row) => {
        const isYearly = row.period === "Yearly";
        return (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold ${
              isYearly
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {row.period}
          </span>
        );
      },
    },
    { key: "dueDate", label: "Due Date" },
  ] : [
    { key: "category", label: "Expense Category", render: (row) => {
      const colorMap = {
        "Logistics / Delivery Reimbursement": "bg-blue-100 text-blue-700",
        "Warehouse Operation": "bg-amber-100 text-amber-700",
        "Payroll": "bg-purple-100 text-purple-700",
      };
      const colorClass = colorMap[row.category] || "bg-slate-100 text-slate-600";
      return (
        <div>
          <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold ${colorClass}`}>
            {row.category}
          </span>
          <div className="text-[11px] text-slate-400 mt-1">{row.date}</div>
        </div>
      );
    }},
    { key: "description", label: "Description" },
    { key: "cost", label: "Cost" },
    { key: "requester", label: "Requested By" },
  ];

  const sections = [{ rows: paginated }];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Finance", path: "/warehouse-finance/dashboard" }, { label: "Payment History" }]} />

      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payment History</h1>
        <p className="text-sm text-slate-500 mt-1">All paid records across procurement, taxes, and reimbursements.</p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={(t) => { setActiveTab(t); setPage(1); setQuery(""); }} />

      <div className="mt-4 mb-4 -mx-4 md:mx-0">
        <div className="px-4 md:px-0 flex items-center justify-between">
          <div className="w-full md:w-1/2">
            <div className="flex gap-3 items-center">
              <div className="flex-1 min-w-0 max-w-3xl">
                <SearchFilter onSearch={(v) => { setQuery(v); setPage(1); }} placeholder={activeTab === "taxes" ? "Search tax name, description" : activeTab === "payables" ? "Search batch ID, supplier, product" : "Search category, description, recipient"} />
              </div>
              {activeTab === "payables" ? (
                <>
                  <div className="w-36 flex-none">
                    <Dropdown options={[{ label: "All Variants", value: "" }]} value={variantFilter} onChange={(v) => setVariantFilter(v)} placeholder="All Variants" />
                  </div>
                  <div className="w-36 flex-none">
                    <Dropdown options={[{ label: "All Suppliers", value: "" }]} value={filter} onChange={(v) => setFilter(v)} placeholder="All Suppliers" />
                  </div>
                </>
              ) : activeTab === "reimburse" ? (
                null
              ) : null}
            </div>
          </div>

          <div className="ml-4 flex items-center gap-3">
           <button className="inline-flex items-center gap-2 bg-[#0B5D1E] hover:opacity-90 transition-opacity text-white px-4 py-[9px] rounded-full text-[13px] font-semibold">
             <FileText size={16} />
             Generate Financial Reports
           </button>
          </div>
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${filtered.length} payment records`}
      />
    </div>
  );
}