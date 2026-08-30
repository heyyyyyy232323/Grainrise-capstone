import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";

const SORT_OPTIONS = [
  { value: "name-asc", label: "Manager Name (A-Z)" },
  { value: "name-desc", label: "Manager Name (Z-A)" },
  { value: "company-asc", label: "Company (A-Z)" },
];

// Badge color per tab, matching the reference (To Review = amber, Active = green, Inactive = red)
const TAB_BADGE_STYLES = {
  "to-review": "bg-amber-400 text-white",
  active: "bg-emerald-500 text-white",
  inactive: "bg-rose-500 text-white",
};

const WarehouseManagement = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 4;

  const columns = [
    { key: "manager", label: "Manager Name", width: "24%" },
    { key: "company", label: "Company Name", width: "24%" },
    { key: "email", label: "Email", width: "24%" },
    { key: "contact", label: "Contact", width: "20%" },
    {
      key: "action",
      label: "Action",
      width: "8%",
      cellClassName: "text-right",
      render: (row) => {
        if (!row.status) return null;
        const s = String(row.status).toLowerCase().trim();

        if (s === "to review") {
          return (
            <div className="flex justify-end">
              <button className="rounded-full bg-amber-400 text-white px-3 py-1 text-[11px] font-semibold leading-normal hover:brightness-95">
                Review
              </button>
            </div>
          );
        }

        if (s === "inactive" || s === "archived") {
          return (
            <div className="flex justify-end gap-1.5">
              <button
                className="rounded-full text-white px-2.5 py-1 text-[11px] font-semibold leading-normal"
                style={{ backgroundColor: "#00A516" }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#008C13")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#00A516")}
              >
                Restore
              </button>
              <button className="rounded-full bg-[#DC2626] text-white px-2.5 py-1 text-[11px] font-semibold leading-normal hover:bg-[#B91C1C]">
                Delete
              </button>
            </div>
          );
        }

        if (s === "active") {
          return (
            <div className="flex justify-end gap-1.5">
              <button className="rounded-full border border-gray-300 px-2.5 py-1 text-[11px] font-semibold leading-normal text-gray-700 hover:bg-gray-50">
                View
              </button>
              <button className="rounded-full bg-amber-400 text-white px-2.5 py-1 text-[11px] font-semibold leading-normal hover:brightness-95">
                Archive
              </button>
            </div>
          );
        }

        return (
          <div className="flex justify-end">
            <button className="rounded-full border border-gray-300 px-2.5 py-1 text-[11px] font-semibold leading-normal text-gray-700 hover:bg-gray-50">
              Action
            </button>
          </div>
        );
      },
    },
  ];

  // sample rows — masked contact + generic email to match the design reference
  const rawRows = Array.from({ length: 24 }).map((_, i) => {
    const status = i % 4 === 0 ? "To Review" : i % 4 === 1 ? "Active" : i % 4 === 2 ? "Inactive" : "Active";
    return {
      id: i + 1,
      manager: `Manager A`,
      company: `ABC Warehousing Corporation`,
      email: `abc@email.com`,
      contact: `0917-XXX-XXXX`,
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
        r.manager.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    });
    if (sortBy === "name-asc") list.sort((a, b) => a.manager.localeCompare(b.manager));
    else if (sortBy === "name-desc") list.sort((a, b) => b.manager.localeCompare(a.manager));
    else if (sortBy === "company-asc") list.sort((a, b) => a.company.localeCompare(b.company));
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
      <Breadcrumbs items={[{ label: "Management", path: "/admin/warehouses" }, { label: "Warehouse Management" }]} />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Warehouse Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage warehouse accounts and approvals.</p>
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
              placeholder="Search by manager, company, or email"
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
        footerLabel={`Showing 1-10 of ${sections[0].rows.length} warehouses`}
      />
    </>
  );
};

export default WarehouseManagement;