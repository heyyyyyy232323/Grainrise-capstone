import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import CustomAmberButton from "../../../Components/Minor-Components/CustomAmberButton";
import CustomRedButton from "../../../Components/Minor-Components/CustomRedButton";
import ArchiveProductModal from "../../../Components/Modals/ArchiveProductModal";
import DeleteProductModal from "../../../Components/Modals/DeleteProductModal";
import RestoreProductModal from "../../../Components/Modals/RestoreProductModal";
import Toast from "../../../Components/Modals/Toast";

const legendItems = [
  { label: "In Stock", dot: "bg-emerald-500", text: "text-emerald-700" },
  { label: "Low Stock", dot: "bg-amber-500", text: "text-amber-700" },
  { label: "Out of Stock", dot: "bg-rose-500", text: "text-rose-700" },
];

const sortOptions = [
  { value: "qty-desc", label: "Stock Qty (High-Low)" },
  { value: "qty-asc", label: "Stock Qty (Low-High)" },
  { value: "code-asc", label: "Product Code (A-Z)" },
];

const statusDotStyles = {
  in: "bg-emerald-500",
  low: "bg-amber-500",
  out: "bg-rose-500",
};

const expiryBadgeStyles = {
  "Expiring Soon": "border-amber-200 bg-amber-50 text-amber-600",
  Expired: "border-rose-200 bg-rose-50 text-rose-600",
};

// Shared sizing override for buttons inside table rows — the components
// default to px-6 py-2 (good for standalone buttons like Add Product), but
// table actions need to stay compact.
const tableButtonClass = "px-3! py-1.5! text-xs! rounded-full!";

const activeStockData = [
  { id: "st-1", productCode: "WR-001", variant: "Dinorado", expiry: "Exp. Oct 17, 2026", stockQty: 0, stockStatus: "out", description: "Premium rice, locally sourced specialty..." },
  { id: "st-2", productCode: "WR-001", variant: "Dinorado", expiry: "Exp. Oct 17, 2026", stockQty: 0, stockStatus: "out", description: "Premium rice, locally sourced specialty..." },
  { id: "st-3", productCode: "WR-001", variant: "Dinorado", expiry: "Exp. Oct 17, 2026", stockQty: 100, stockStatus: "low", badge: "Expiring Soon", description: "Premium rice, locally sourced specialty..." },
  { id: "st-4", productCode: "WR-001", variant: "Dinorado", expiry: "Exp. Jul 24, 2026", stockQty: 150, stockStatus: "low", badge: "Expired", description: "Premium rice, locally sourced specialty..." },
  { id: "st-5", productCode: "WR-001", variant: "Dinorado", expiry: "Exp. Jul 24, 2026", stockQty: 150, stockStatus: "low", badge: "Expired", description: "Premium rice, locally sourced specialty..." },
];

const archivedStockData = Array.from({ length: 20 }, (_, i) => {
  const templates = [
    { expiry: "Exp. Oct 17, 2026", stockQty: 0, stockStatus: "out" },
    { expiry: "Exp. Oct 17, 2026", stockQty: 0, stockStatus: "out" },
    { expiry: "Exp. Oct 17, 2026", stockQty: 100, stockStatus: "low" },
    { expiry: "Exp. Jul 24, 2026", stockQty: 150, stockStatus: "low" },
    { expiry: "Exp. Jul 24, 2026", stockQty: 150, stockStatus: "low" },
  ];
  const template = templates[i % templates.length];
  return {
    id: `arc-${i + 1}`,
    productCode: "WR-001",
    variant: "Dinorado",
    description: "Premium rice, locally sourced specialty...",
    ...template,
  };
});

const StockManagement = () => {
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("qty-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState({ isOpen: false, message: "", type: "success" });

  // Modal states
  const [archiveModal, setArchiveModal] = useState({ isOpen: false, product: null, isLoading: false });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, product: null, isLoading: false });
  const [restoreModal, setRestoreModal] = useState({ isOpen: false, product: null, isLoading: false });

  const tabs = [
    { id: "active", label: "Active" },
    { id: "archive", label: "Archive" },
  ];

  const sourceData = activeTab === "active" ? activeStockData : archivedStockData;

  const filteredData = useMemo(() => {
    const filtered = sourceData.filter((item) => {
      const query = searchQuery.toLowerCase();
      return (
        query === "" ||
        item.productCode.toLowerCase().includes(query) ||
        item.variant.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case "qty-asc":
        return sorted.sort((a, b) => a.stockQty - b.stockQty);
      case "code-asc":
        return sorted.sort((a, b) => a.productCode.localeCompare(b.productCode));
      case "qty-desc":
      default:
        return sorted.sort((a, b) => b.stockQty - a.stockQty);
    }
  }, [sourceData, searchQuery, sortBy]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);
  const rangeEnd = Math.min(startIndex + itemsPerPage, filteredData.length);
  const itemNoun = activeTab === "active" ? "products" : "archived products";
  const footerLabel =
    filteredData.length > 0
      ? `Showing ${startIndex + 1}-${rangeEnd} of ${filteredData.length} ${itemNoun}`
      : `No ${itemNoun} found`;

  // SectionedTableCard groups rows into sections; a single section with no
  // `label` renders as a plain flat table (no divider row), which is what
  // this page needs (unlike Order History's date-grouped sections).
  const tableSections = useMemo(() => [{ rows: paginatedData }], [paginatedData]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleAddProduct = () => {
    console.log("Open add product form");
  };

  const handleViewDetails = (row) => {
    console.log("View details", row.id);
  };

  const handleArchive = (row) => {
    setArchiveModal({ isOpen: true, product: row, isLoading: false });
  };

  const handleArchiveConfirm = async () => {
    setArchiveModal((prev) => ({ ...prev, isLoading: true }));
    try {
      console.log("Archiving product:", archiveModal.product.id);
      // Add API call here
      setTimeout(() => {
        setArchiveModal({ isOpen: false, product: null, isLoading: false });
        setToast({
          isOpen: true,
          message: `${archiveModal.product.variant} archived successfully!`,
          type: "success",
        });
      }, 500);
    } catch (error) {
      console.error("Archive failed:", error);
      setArchiveModal((prev) => ({ ...prev, isLoading: false }));
      setToast({
        isOpen: true,
        message: "Failed to archive product",
        type: "error",
      });
    }
  };

  const handleRestore = (row) => {
    setRestoreModal({ isOpen: true, product: row, isLoading: false });
  };

  const handleRestoreConfirm = async () => {
    setRestoreModal((prev) => ({ ...prev, isLoading: true }));
    try {
      console.log("Restoring product:", restoreModal.product.id);
      // Add API call here
      setTimeout(() => {
        setRestoreModal({ isOpen: false, product: null, isLoading: false });
        setToast({
          isOpen: true,
          message: `${restoreModal.product.variant} restored successfully!`,
          type: "success",
        });
      }, 500);
    } catch (error) {
      console.error("Restore failed:", error);
      setRestoreModal((prev) => ({ ...prev, isLoading: false }));
      setToast({
        isOpen: true,
        message: "Failed to restore product",
        type: "error",
      });
    }
  };

  const handleDeletePermanently = (row) => {
    setDeleteModal({ isOpen: true, product: row, isLoading: false });
  };

  const handleDeleteConfirm = async () => {
    setDeleteModal((prev) => ({ ...prev, isLoading: true }));
    try {
      console.log("Deleting product:", deleteModal.product.id);
      // Add API call here
      setTimeout(() => {
        setDeleteModal({ isOpen: false, product: null, isLoading: false });
        setToast({
          isOpen: true,
          message: `${deleteModal.product.variant} deleted permanently!`,
          type: "success",
        });
      }, 500);
    } catch (error) {
      console.error("Delete failed:", error);
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
      setToast({
        isOpen: true,
        message: "Failed to delete product",
        type: "error",
      });
    }
  };

  const columns = [
    { key: "productCode", label: "Product Code" },
    {
      key: "variant",
      label: "Variant",
      render: (row) => (
        <div>
          <p className="text-[13px] font-semibold text-slate-800">{row.variant}</p>
          <p className="text-[11px] text-slate-400">{row.expiry}</p>
          {row.badge ? (
            <span
              className={`mt-1 inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${
                expiryBadgeStyles[row.badge] || "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              {row.badge}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "stockQty",
      label: "Stock Qty (kg)",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-slate-700">
          <span className={`h-1.5 w-1.5 rounded-full ${statusDotStyles[row.stockStatus] || "bg-slate-400"}`} />
          {row.stockQty.toLocaleString()} kg
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      cellClassName: "max-w-xs truncate text-slate-500",
    },
    {
      key: "action",
      label: "Action",
      headerClassName: "text-right",
      render: (row) =>
        activeTab === "active" ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleViewDetails(row)}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              View Details
            </button>
            <CustomAmberButton
              text="Archive"
              onClick={() => handleArchive(row)}
              className={tableButtonClass}
            />
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <CustomGreenButton
              text="Restore"
              onClick={() => handleRestore(row)}
              className={tableButtonClass}
            />
            <CustomRedButton
              text="Delete Permanently"
              onClick={() => handleDeletePermanently(row)}
              className={tableButtonClass}
            />
          </div>
        ),
    },
  ];

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Management", path: "/warehouse-encoder/dashboard" },
          { label: "Stock Management" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage warehouse inventory and product records.
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="flex-1 min-w-0">
            <SearchFilter
              onSearch={(value) => {
                setSearchQuery(value);
                setCurrentPage(1);
              }}
              placeholder="Search product code, variant, or description"
            />
          </div>
          <SortByDropdown value={sortBy} onChange={setSortBy} options={sortOptions} />
        </div>

        {activeTab === "active" && (
          <CustomGreenButton
            text={
              <span className="flex items-center gap-2">
                <Plus size={16} />
                Add Product
              </span>
            }
            onClick={handleAddProduct}
            className="rounded-full! shrink-0"
          />
        )}
      </div>

      {activeTab === "active" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-gray-700">Legend:</span>
          {legendItems.map((item) => (
            <span
              key={item.label}
              className={`inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold ${item.text}`}
            >
              <span className={`h-2 w-2 rounded-full ${item.dot}`} />
              {item.label}
            </span>
          ))}
        </div>
      )}

      <SectionedTableCard
        columns={columns}
        sections={tableSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={footerLabel}
        className={activeTab === "active" ? "active-table" : "archive-table"}
      />

      <style>{`
        .active-table th:last-child {
          padding-right: 4rem;
        }
        .active-table td[data-col="action"] {
          padding-right: 2rem;
        }
        .archive-table th:last-child {
          padding-right: 7rem;
        }
        .archive-table td[data-col="action"] {
          padding-right: 2rem;
        }
      `}</style>

      {/* Modal Components */}
      <ArchiveProductModal
        isOpen={archiveModal.isOpen}
        onClose={() => setArchiveModal({ isOpen: false, product: null, isLoading: false })}
        onArchive={handleArchiveConfirm}
        productName={archiveModal.product?.variant || "Product"}
        isLoading={archiveModal.isLoading}
      />

      <DeleteProductModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, product: null, isLoading: false })}
        onDelete={handleDeleteConfirm}
        productName={deleteModal.product?.variant || "Product"}
        isLoading={deleteModal.isLoading}
      />

      <RestoreProductModal
        isOpen={restoreModal.isOpen}
        onClose={() => setRestoreModal({ isOpen: false, product: null, isLoading: false })}
        onRestore={handleRestoreConfirm}
        productName={restoreModal.product?.variant || "Product"}
        isLoading={restoreModal.isLoading}
      />

      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ isOpen: false, message: "", type: "success" })}
      />
    </>
  );
};

export default StockManagement;