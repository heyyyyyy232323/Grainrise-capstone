import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

// ─── Constants ───────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc",  label: "Oldest First"  },
  { value: "amount-desc", label: "Highest Amount" },
  { value: "amount-asc",  label: "Lowest Amount"  },
];

const COLUMNS = [
  { key: "retailerName", label: "Retailer Name" },
  { key: "batchNo",      label: "Batch No."     },
  { key: "variant",      label: "Variant"       },
  { key: "productCode",  label: "Product Code"  },
  { key: "totalPrice",   label: "Total Price"   },
  { key: "status",       label: "Status"        },
  { key: "action",       label: "Action"        },
];

const PENDING_ORDERS = Array.from({ length: 14 }, (_, i) => ({
  id:           `order-${i + 1}`,
  retailerName: "Retailer A",
  batchNo:      "Batch 2026-001",
  variant:      "Dinorado",
  productCode:  "WR-001",
  totalPrice:   "₱1,500",
  status:       "pending",
}));

const APPROVED_ORDERS = Array.from({ length: 6 }, (_, i) => ({
  id:           `approved-${i + 1}`,
  retailerName: "Retailer B",
  batchNo:      "Batch 2026-002",
  variant:      "Sinandomeng",
  productCode:  "WR-002",
  totalPrice:   "₱2,200",
  status:       "approved",
}));

const DECLINED_ORDERS = Array.from({ length: 4 }, (_, i) => ({
  id:           `declined-${i + 1}`,
  retailerName: "Retailer C",
  batchNo:      "Batch 2026-003",
  variant:      "Dinorado",
  productCode:  "WR-003",
  totalPrice:   "₱900",
  status:       "declined",
}));

const ALL_SECTIONS = [
  { label: "Pending",  rows: PENDING_ORDERS  },
  { label: "Approved", rows: APPROVED_ORDERS },
  { label: "Declined", rows: DECLINED_ORDERS },
];

const ITEMS_PER_PAGE = 10;

// ─── Component ───────────────────────────────────────────────────────────────

const MillerOnlineOrders = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy,      setSortBy     ] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);

  const pendingCount = PENDING_ORDERS.length;

  // Filter rows across all sections
  const filteredSections = ALL_SECTIONS.map((section) => ({
    ...section,
    rows: section.rows.filter((row) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        row.retailerName.toLowerCase().includes(q) ||
        row.batchNo.toLowerCase().includes(q)      ||
        row.variant.toLowerCase().includes(q)      ||
        row.productCode.toLowerCase().includes(q)
      );
    }),
  })).filter((section) => section.rows.length > 0);

  const totalRows  = filteredSections.reduce((n, s) => n + s.rows.length, 0);
  const totalPages = Math.max(1, Math.ceil(totalRows / ITEMS_PER_PAGE));

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: "Orders", path: "/miller-sales/dashboard" },
          { label: "Online Orders" },
        ]}
      />

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Online Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and process pending retailer online orders.
          </p>
        </div>

        {/* Pending badge */}
        {pendingCount > 0 && (
          <div className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full bg-amber-50 border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm">
            <ShoppingCart size={15} className="shrink-0" />
            Pending Orders ({pendingCount})
          </div>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-[220px]">
          <SearchFilter
            onSearch={(val) => { setSearchQuery(val); setCurrentPage(1); }}
            placeholder="Search retailer, batch number, product code, or variant"
          />
        </div>
        <SortByDropdown
          value={sortBy}
          onChange={setSortBy}
          options={SORT_OPTIONS}
        />
      </div>

      {/* Orders table */}
      <SectionedTableCard
        columns={COLUMNS}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onViewDetails={(row) => console.log("View order:", row)}
        viewDetailsLabel="View Details"
        footerLabel={`Showing 1–${Math.min(ITEMS_PER_PAGE, totalRows)} of ${totalRows} pending orders`}
      />
    </>
  );
};

export default MillerOnlineOrders;
