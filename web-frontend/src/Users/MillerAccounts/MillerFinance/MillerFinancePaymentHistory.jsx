import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const TABS = [
  { id: "payables",       label: "Payables Payment" },
  { id: "taxes",          label: "Taxes Payment" },
  { id: "reimbursements", label: "Reimbursements" },
];

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "amount-desc", label: "Amount (High to Low)" },
  { value: "amount-asc", label: "Amount (Low to High)" },
];

/* 30 payables, 12 taxes, 18 reimbursements */
const samplePayables = Array.from({ length: 30 }, (_, i) => ({
  id: `pay-${i + 1}`,
  batchNo:   `Batch 2026 - 00${(i % 12) + 1}`,
  supplier:  "Supplier A",
  variant:   "Dinorado",
  stockQty:  "200 kg",
  unitPrice: "₱45.00",
  total:     "₱9,000.00",
  paidAt:    "Apr 14, 2026",
}));

const sampleTaxes = Array.from({ length: 12 }, (_, i) => ({
  id: `tax-${i + 1}`,
  name:    "3% Percentage Tax",
  desc:    "Non-VAT percentage tax obligation",
  cost:    "₱1,250.00",
  period:  i % 2 === 0 ? "Quarterly" : "Yearly",
  dueDate: "Sep 30, 2026",
}));

const sampleReimbursements = Array.from({ length: 18 }, (_, i) => ({
  id: `reim-${i + 1}`,
  category:    "Vehicle Repair",
  description: "Gasoline reimbursement",
  cost:        "₱3,500.00",
  requester:   "Juan Dela Cruz",
}));

export default function MillerFinancePaymentHistory() {
  const [activeTab, setActiveTab] = useState("payables");
  const [query,     setQuery]     = useState("");
  const [sortBy,    setSortBy]    = useState("date-desc");
  const [page,      setPage]      = useState(1);

  const data =
    activeTab === "payables"
      ? samplePayables
      : activeTab === "taxes"
      ? sampleTaxes
      : sampleReimbursements;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = data.filter((r) => {
      if (!q) return true;
      return Object.values(r).some((val) =>
        String(val).toLowerCase().includes(q)
      );
    });
    return result;
  }, [data, query]);

  const itemsPerPage = 10;
  const totalPages   = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex   = (page - 1) * itemsPerPage;
  const paginated    = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections     = [{ rows: paginated }];

  const columns =
    activeTab === "payables"
      ? [
          { key: "batchNo",   label: "Batch No."       },
          { key: "supplier",  label: "Supplier"         },
          { key: "variant",   label: "Variant"          },
          { key: "stockQty",  label: "Stock Qty (KG)"   },
          { key: "unitPrice", label: "Unit Price"       },
          { key: "total",     label: "Total"            },
          { key: "paidAt",    label: "Paid At"          },
        ]
      : activeTab === "taxes"
      ? [
          { key: "name",    label: "Name of Tax"  },
          { key: "desc",    label: "Description"  },
          { key: "cost",    label: "Cost Value"   },
          { key: "period",  label: "Tax Period"   },
          { key: "dueDate", label: "Due Date"     },
        ]
      : [
          {
            key: "category",
            label: "Expense Category",
            render: (row) => (
              <div>
                <span className="inline-block rounded-full bg-sky-100 text-sky-700 px-3 py-1 text-xs font-semibold">
                  {row.category}
                </span>
              </div>
            ),
          },
          { key: "description", label: "Description"  },
          { key: "cost",        label: "Cost"          },
          { key: "requester",   label: "Requested By"  },
        ];

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Finance", path: "/miller-finance/dashboard" },
          { label: "Payment History" },
        ]}
      />

      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Payment History
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          All paid records across procurement, taxes, and reimbursements.
        </p>
      </div>

      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(t) => { setActiveTab(t); setPage(1); setQuery(""); }}
      />

      {/* Search + Filters + Generate Financial Reports */}
      <div className="mt-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="w-full max-w-xs sm:w-72">
            <SearchFilter
              onSearch={(v) => { setQuery(v); setPage(1); }}
              placeholder={
                activeTab === "taxes"
                  ? "Search tax name, description"
                  : activeTab === "payables"
                  ? "Search batch ID, supplier, product"
                  : "Search category, description, recipient"
              }
            />
          </div>

          <DateRangePicker onDateChange={() => {}} />

          <SortByDropdown
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={(v) => { setSortBy(v); setPage(1); }}
          />
        </div>

        <button className="inline-flex items-center gap-2 bg-[#018311] hover:bg-[#016b0f] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer">
          📄 Generate Financial Reports
        </button>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${startIndex + 1}-${Math.min(
          startIndex + itemsPerPage,
          filtered.length
        )} of ${filtered.length} payment records`}
      />
    </div>
  );
}
