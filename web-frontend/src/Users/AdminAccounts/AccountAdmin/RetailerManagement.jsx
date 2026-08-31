import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import CustomAmberButton from "../../../Components/Minor-Components/CustomAmberButton";
import CustomRedButton from "../../../Components/Minor-Components/CustomRedButton";
import ArchiveProductModal from "../../../Components/Modals/ArchiveProductModal";
import RestoreProductModal from "../../../Components/Modals/RestoreProductModal";
import DeleteProductModal from "../../../Components/Modals/DeleteProductModal";

const SORT_OPTIONS = [
  { value: "name-asc", label: "Retailer Name (A-Z)" },
  { value: "name-desc", label: "Retailer Name (Z-A)" },
  { value: "address-asc", label: "Address (A-Z)" },
];

// Badge color per tab, matching the reference (To Review = amber, Active = green, Inactive = red)
const TAB_BADGE_STYLES = {
  "to-review": "bg-amber-400 text-white",
  active: "bg-emerald-500 text-white",
  inactive: "bg-rose-500 text-white",
};

const RetailerManagement = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 4;

  // Modal state
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [archiveModal, setArchiveModal] = useState(false);
  const [restoreModal, setRestoreModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const handleArchive = (row) => { setSelectedRetailer(row); setArchiveModal(true); };
  const handleRestore = (row) => { setSelectedRetailer(row); setRestoreModal(true); };
  const handleDelete  = (row) => { setSelectedRetailer(row); setDeleteModal(true); };

  const confirmArchive = () => {
    console.log("Archive retailer:", selectedRetailer);
    setArchiveModal(false);
    setSelectedRetailer(null);
  };
  const confirmRestore = () => {
    console.log("Restore retailer:", selectedRetailer);
    setRestoreModal(false);
    setSelectedRetailer(null);
  };
  const confirmDelete = () => {
    console.log("Delete retailer:", selectedRetailer);
    setDeleteModal(false);
    setSelectedRetailer(null);
  };

  const columns = [
    { key: "retailer", label: "Retailer Name", width: "24%" },
    { key: "address", label: "Address", width: "28%" },
    { key: "email", label: "Email", width: "23%" },
    {
      key: "action",
      label: "Action",
      headerClassName: "text-center",
      width: "25%",
      cellClassName: "text-center",
      render: (row) => {
        const s = String(row.status || "").toLowerCase().trim();

        if (s === "to review") {
          return (
            <div className="flex justify-center">
              <CustomAmberButton text="Review" className="whitespace-nowrap px-3 py-1.5 text-[11px] rounded-lg" />
            </div>
          );
        }

        if (s === "inactive" || s === "archived") {
          return (
            <div className="flex items-center justify-center gap-2">
              <CustomGreenButton
                text="Restore"
                className="whitespace-nowrap px-3 py-1.5 text-[11px] rounded-lg"
                onClick={() => handleRestore(row)}
              />
              <CustomRedButton
                text="Delete"
                className="whitespace-nowrap px-4 py-1.5 text-[11px] rounded-lg"
                onClick={() => handleDelete(row)}
              />
            </div>
          );
        }

        if (s === "active") {
          return (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
              >
                View Details
              </button>
              <CustomAmberButton
                text="Archive"
                className="whitespace-nowrap px-3 py-1.5 text-[11px] rounded-lg"
                onClick={() => handleArchive(row)}
              />
            </div>
          );
        }

        return (
          <div className="flex justify-center">
            <button
              type="button"
              className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
            >
              Action
            </button>
          </div>
        );
      },
    },
  ];

  const rawRows = Array.from({ length: 24 }).map((_, i) => {
    const status = i % 4 === 0 ? "To Review" : i % 4 === 1 ? "Active" : i % 4 === 2 ? "Inactive" : "Active";
    return {
      id: i + 1,
      retailer: `Retailer ${String.fromCharCode(65 + (i % 26))}`,
      address: `ABC Address`,
      email: `abc${i}@email.com`,
      status,
    };
  });

  const tabs = [
    { id: "to-review", label: "To Review" },
    { id: "active", label: "Active" },
    { id: "inactive", label: "Inactive" },
  ];

  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

  const counts = useMemo(() => {
    return rawRows.reduce(
      (acc, r) => {
        const s = String(r.status).toLowerCase().trim();
        if (s === "to review") acc.toReview++;
        else if (s === "inactive" || s === "archived") acc.inactive++;
        else if (s === "active") acc.active++;
        return acc;
      },
      { toReview: 0, active: 0, inactive: 0 }
    );
  }, [rawRows]);

  const filteredRawRows = useMemo(() => {
    let list = rawRows.filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.retailer.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    });
    if (sortBy === "name-asc") list.sort((a, b) => a.retailer.localeCompare(b.retailer));
    else if (sortBy === "name-desc") list.sort((a, b) => b.retailer.localeCompare(a.retailer));
    else if (sortBy === "address-asc") list.sort((a, b) => a.address.localeCompare(b.address));
    return list;
  }, [rawRows, searchQuery, sortBy]);

  const sections = useMemo(() => {
    if (activeTab === "to-review")
      return [{ rows: filteredRawRows.filter((r) => String(r.status).toLowerCase().trim() === "to review") }];
    if (activeTab === "inactive")
      return [{ rows: filteredRawRows.filter((r) => ["inactive", "archived"].includes(String(r.status).toLowerCase().trim())) }];
    if (activeTab === "active")
      return [{ rows: filteredRawRows.filter((r) => String(r.status).toLowerCase().trim() === "active") }];
    return [{ rows: filteredRawRows }];
  }, [activeTab, filteredRawRows]);

  return (
    <>
      <Breadcrumbs items={[{ label: "Management", path: "/admin/retailers" }, { label: "Retailer Management" }]} />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Retailer Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage retailer accounts and approvals.</p>
      </div>

      <Tabs
        tabs={tabs.map((t) => ({
          ...t,
          label: (
            <>
              <span>{t.label}</span>
              <span
                className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${TAB_BADGE_STYLES[t.id]}`}
              >
                {t.id === "to-review" ? counts.toReview : t.id === "active" ? counts.active : counts.inactive}
              </span>
            </>
          ),
        }))}
        activeTab={activeTab}
        onTabChange={(id) => {
          setActiveTab(id);
          setCurrentPage(1);
        }}
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-full max-w-sm">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by retailer, address, or email"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white placeholder-gray-400 text-gray-700"
            />
          </div>
        </div>

        <div>
          <SortByDropdown
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={(v) => {
              setSortBy(v);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setCurrentPage(p)}
        footerLabel={`Showing 1-10 of ${sections[0].rows.length} retailers`}
      />

      {/* Modals */}
      <ArchiveProductModal
        isOpen={archiveModal}
        onClose={() => { setArchiveModal(false); setSelectedRetailer(null); }}
        onArchive={confirmArchive}
        productName={selectedRetailer?.retailer ?? "this retailer"}
      />
      <RestoreProductModal
        isOpen={restoreModal}
        onClose={() => { setRestoreModal(false); setSelectedRetailer(null); }}
        onRestore={confirmRestore}
        productName={selectedRetailer?.retailer ?? "this retailer"}
      />
      <DeleteProductModal
        isOpen={deleteModal}
        onClose={() => { setDeleteModal(false); setSelectedRetailer(null); }}
        onDelete={confirmDelete}
        productName={selectedRetailer?.retailer ?? "this retailer"}
      />
    </>
  );
};

export default RetailerManagement;