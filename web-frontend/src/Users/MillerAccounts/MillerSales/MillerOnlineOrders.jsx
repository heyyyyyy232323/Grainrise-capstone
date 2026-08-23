import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";

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

const ITEMS_PER_PAGE = 10;

// ─── Component ───────────────────────────────────────────────────────────────

const MillerOnlineOrders = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy,      setSortBy     ] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter rows
  const filteredRows = PENDING_ORDERS.filter((row) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.retailerName.toLowerCase().includes(q) ||
      row.batchNo.toLowerCase().includes(q)      ||
      row.variant.toLowerCase().includes(q)      ||
      row.productCode.toLowerCase().includes(q)
    );
  });

  const pendingCount = PENDING_ORDERS.length;
  const totalRows     = filteredRows.length;
  const totalPages    = Math.max(1, Math.ceil(totalRows / ITEMS_PER_PAGE));

  const startIdx    = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx       = Math.min(startIdx + ITEMS_PER_PAGE, totalRows);
  const visibleRows  = filteredRows.slice(startIdx, endIdx);

  const handleSearch = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Online Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and process pending retailer online orders.
          </p>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-[220px]">
          <SearchFilter
            onSearch={handleSearch}
            placeholder="Search retailer, batch number, product code, or variant"
          />
        </div>
        <SortByDropdown
          value={sortBy}
          onChange={setSortBy}
          options={SORT_OPTIONS}
        />

        {/* Pending badge */}
        {pendingCount > 0 && (
          <div className="ml-auto inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm">
            <ShoppingCart size={15} className="shrink-0" />
            Pending Orders ({pendingCount})
          </div>
        )}
      </div>

      {/* Orders table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-6 py-3 font-semibold text-gray-600 whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-gray-800">{row.retailerName}</td>
                  <td className="px-6 py-4 text-gray-800">{row.batchNo}</td>
                  <td className="px-6 py-4 text-gray-800">{row.variant}</td>
                  <td className="px-6 py-4 text-gray-800">{row.productCode}</td>
                  <td className="px-6 py-4 text-gray-800">{row.totalPrice}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => console.log("View order:", row)}
                      className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-6 py-10 text-center text-gray-400"
                  >
                    No pending orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-6 py-3 border-t border-gray-100 bg-white">
          <p className="text-sm text-gray-500">
            Showing {totalRows === 0 ? 0 : startIdx + 1}–{endIdx} of {totalRows} pending orders
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm rounded-md text-gray-500 disabled:text-gray-300 hover:bg-gray-100 disabled:hover:bg-transparent"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-8 w-8 text-sm rounded-md ${
                  page === currentPage
                    ? "bg-green-700 text-white font-semibold"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm rounded-md text-gray-500 disabled:text-gray-300 hover:bg-gray-100 disabled:hover:bg-transparent"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MillerOnlineOrders;