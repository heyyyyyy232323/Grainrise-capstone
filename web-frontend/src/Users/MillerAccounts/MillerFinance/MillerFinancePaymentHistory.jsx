import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const TABS = [
  { id: "payables",  label: "Procurement Payables"  },
  { id: "taxes",     label: "Tax Compliance Record"  },
  { id: "reimburse", label: "Reimbursement"          },
];

const samplePayables = Array.from({ length: 24 }, (_, i) => ({
  id:       `p-${i + 1}`,
  batchNo:  `Batch 2026 - 001`,
  supplier: `Supplier A`,
  variant:  "Dinorado",
  stockQty: "200 kg",
  unitPrice: "₱45.00",
  total:    "₱9,000.00",
  paidAt:   "Sep 30, 2026",
}));

const sampleTaxes = Array.from({ length: 24 }, (_, i) => ({
  id:      `t-${i + 1}`,
  name:    i % 2 === 0 ? "3% Percentage Tax" : "Local Business Tax",
  desc:    i % 2 === 0
    ? "Tax imposed by BIR on non-VAT registered businesses..."
    : "Local tax imposed by the LGU...",
  cost:    i % 2 === 0 ? "₱1.00" : "₱10,310.20",
  period:  i % 2 === 0 ? "Quarterly" : "Yearly",
  dueDate: "Sep 30, 2026",
}));

const sampleReimburse = Array.from({ length: 24 }, (_, i) => ({
  id:          `r-${i + 1}`,
  category:    i % 3 === 0 ? "Logistic / Delivery Reimbursement" : i % 3 === 1 ? "Miller Operation" : "Payroll",
  description: i % 3 === 0 ? "Fuel reimbursement for delivery truck" : i % 3 === 1 ? "Miller supply expense" : "Weekly salary payout",
  cost:        i % 3 === 0 ? "₱2,500.00" : "₱150.00",
  requester:   i % 3 === 0 ? "Logistics A" : "Driver A",
}));

export default function MillerFinancePaymentHistory() {
  const [activeTab, setActiveTab] = useState("payables");
  const [query,     setQuery]     = useState("");
  const [page,      setPage]      = useState(1);

  const data = useMemo(() => {
    if (activeTab === "payables")  return samplePayables;
    if (activeTab === "taxes")     return sampleTaxes;
    return sampleReimburse;
  }, [activeTab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
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

      {/* Search + Generate Financial Reports */}
      <div className="mt-4 mb-4 flex items-center gap-3">
        <div className="flex-1 max-w-md">
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

        <div className="ml-auto">
          <button className="inline-flex items-center gap-2 bg-[#018311] hover:bg-[#016b0f] text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors">
            📄 Generate Financial Reports
          </button>
        </div>
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
