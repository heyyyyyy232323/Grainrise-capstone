import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Tabs from "../../../Components/Minor-Components/Tabs";

// Badge color per tab, matching the reference (To Review = amber, Active = green, Inactive = red)
const TAB_BADGE_STYLES = {
  "to-review": "bg-amber-400 text-white",
  active: "bg-emerald-500 text-white",
  inactive: "bg-rose-500 text-white",
};

const SupplierManagement = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 4;

  const columns = [
    { key: "supplier", label: "Supplier Name" },
    { key: "company", label: "Company Name" },
    { key: "email", label: "Email" },
    { key: "contact", label: "Contact" },
    {
      key: "action",
      label: "Action",
      headerClassName: "text-right",
      render: (row) => {
        if (!row.status) return null;
        const s = String(row.status).toLowerCase();

        if (s.includes("to review") || s.includes("review")) {
          return (
            <div className="flex justify-end">
              <button className="rounded-full bg-amber-400 text-white px-3 py-1.5 text-[11px] font-semibold hover:brightness-95">
                Review
              </button>
            </div>
          );
        }

        if (s.includes("active")) {
          return (
            <div className="flex gap-2 justify-end">
              <button className="rounded-full border border-gray-300 px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50">
                View Details
              </button>
              <button className="rounded-full bg-yellow-400 text-white px-3 py-1.5 text-[11px] font-semibold hover:brightness-95">
                Archive
              </button>
            </div>
          );
        }

        if (s.includes("inactive") || s.includes("archived")) {
          return (
            <div className="flex gap-2 justify-end">
              <button className="rounded-full bg-emerald-600 text-white px-3 py-1.5 text-[11px] font-semibold hover:brightness-95">
                Restore
              </button>
              <button className="rounded-full bg-rose-600 text-white px-3 py-1.5 text-[11px] font-semibold hover:brightness-95">
                Delete Permanently
              </button>
            </div>
          );
        }

        return (
          <div className="flex justify-end">
            <button className="rounded-full border border-gray-300 px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50">
              Action
            </button>
          </div>
        );
      },
    },
  ];

  // sample rows with statuses that match screenshot states
  const rawRows = Array.from({ length: 24 }).map((_, i) => {
    const status = i % 4 === 0 ? "To Review" : i % 4 === 1 ? "Active" : i % 4 === 2 ? "Inactive" : "Active";
    return {
      id: i + 1,
      supplier: `Supplier ${String.fromCharCode(65 + (i % 26))}`,
      company: `ABC Rice Trading`,
      email: `abc${i}@email.com`,
      contact: `0917-XXX-XXXX`,
      joined: "Mar 12, 2026",
      status,
    };
  });

  const tabs = [
    { id: "to-review", label: "To Review" },
    { id: "active", label: "Active" },
    { id: "inactive", label: "Inactive" },
  ];

  const [activeTab, setActiveTab] = useState(tabs[0].id);

  // counts for badges
  const counts = useMemo(() => {
    return rawRows.reduce(
      (acc, r) => {
        const s = String(r.status).toLowerCase();
        if (s.includes("to review") || s.includes("review")) acc.toReview++;
        else if (s.includes("active")) acc.active++;
        else if (s.includes("inactive") || s.includes("archived")) acc.inactive++;
        return acc;
      },
      { toReview: 0, active: 0, inactive: 0 }
    );
  }, [rawRows]);

  // No section label needed — the active Tab already tells the user which
  // category they're viewing, so we skip the extra colored banner row.
  const sections = useMemo(() => {
    if (activeTab === "to-review")
      return [{ rows: rawRows.filter((r) => String(r.status).toLowerCase().includes("to review")) }];
    if (activeTab === "active")
      return [{ rows: rawRows.filter((r) => String(r.status).toLowerCase().includes("active")) }];
    if (activeTab === "inactive")
      return [
        {
          rows: rawRows.filter(
            (r) => String(r.status).toLowerCase().includes("inactive") || String(r.status).toLowerCase().includes("archived")
          ),
        },
      ];
    return [{ rows: rawRows }];
  }, [activeTab, rawRows]);

  return (
    <>
      <Breadcrumbs items={[{ label: "Management", path: "/admin/dashboard" }, { label: "Supplier Management" }]} />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Supplier Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage supplier accounts and approvals.</p>
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

      <div className="mb-4">
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by supplier, company, or email"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          />
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setCurrentPage(p)}
        footerLabel={`Showing 1-10 of ${sections[0].rows.length} suppliers`}
      />
    </>
  );
};

export default SupplierManagement;