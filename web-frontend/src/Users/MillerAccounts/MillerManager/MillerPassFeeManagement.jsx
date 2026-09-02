import { useState, useMemo } from "react";
import { Search, FileText } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const MOCK_FARE_RATES = Array.from({ length: 20 }, (_, i) => {
  const isActive = i % 2 === 0;
  return {
    id: `rate-${i + 1}`,
    rateName: "BATCH 2026 - 001",
    description: "Temporary hike during harvest peak.",
    freeDistance: "15 km",
    baseFee: "₱ 500.00",
    additionalFee: "₱ 25.00/km",
    status: isActive ? "Active" : "Inactive",
    lastUpdatedDate: "Aug 01,, 2026",
    lastUpdatedTime: "9:15 PHT",
  };
});

const STATUS_OPTIONS = ["Status", "Active", "Inactive"];
const SORT_OPTIONS = ["Sort By", "Latest", "Oldest", "Base Fee: High to Low", "Base Fee: Low to High"];

function FilterSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2 pr-8 text-xs font-medium text-gray-700 outline-none focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
    </div>
  );
}

export default function MillerFareFeeManagement() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);

  const columns = [
    {
      key: "rateName",
      label: "Rate Name",
      width: "22%",
      renderCell: (row) => (
        <div>
          <p className="font-bold text-gray-900 text-xs">{row.rateName}</p>
          <p className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">{row.description}</p>
        </div>
      ),
    },
    {
      key: "freeDistance",
      label: "Free Delivery Distance (km)",
      width: "18%",
      renderCell: (row) => <span className="font-semibold text-gray-800">{row.freeDistance}</span>,
    },
    {
      key: "baseFee",
      label: "Base Fee",
      width: "12%",
      renderCell: (row) => <span className="font-bold text-gray-900">{row.baseFee}</span>,
    },
    {
      key: "additionalFee",
      label: "Additional Fee (₱/km)",
      width: "16%",
      renderCell: (row) => <span className="font-semibold text-gray-800">{row.additionalFee}</span>,
    },
    {
      key: "status",
      label: "Status",
      width: "10%",
      renderCell: (row) => (
        <span
          className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold ${
            row.status === "Active"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-500"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "lastUpdatedDate",
      label: "Last Updated",
      width: "14%",
      renderCell: (row) => (
        <div>
          <p className="font-bold text-gray-800 text-xs">{row.lastUpdatedDate}</p>
          <p className="text-[10px] text-gray-400 font-medium">{row.lastUpdatedTime}</p>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: "8%",
      renderCell: (row) => (
        <button
          type="button"
          onClick={() => alert(`Editing rate: ${row.id}`)}
          className="rounded-full border border-slate-200 bg-white px-3.5 py-1 text-[11px] font-semibold text-gray-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer"
        >
          Edit
        </button>
      ),
    },
  ];

  const filteredRates = useMemo(() => {
    return MOCK_FARE_RATES.filter((item) => {
      const matchSearch =
        item.rateName.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "Status" || item.status === status;

      return matchSearch && matchStatus;
    });
  }, [search, status]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRates.length / itemsPerPage));

  const paginatedRates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRates.slice(start, start + itemsPerPage);
  }, [filteredRates, currentPage]);

  const tableSections = useMemo(() => [{ rows: paginatedRates }], [paginatedRates]);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Page Header ────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Fare Fee Management" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Fare Fee Management
        </h2>
        <p className="text-sm text-slate-500">
          Manage the delivery rates used to calculate transportation fees for eligible orders.
        </p>
      </div>

      {/* ── Toolbar & Action Button ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2.5 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search tax name, description"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <FilterSelect value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => alert("Generating Financial Reports...")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B5D1E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition cursor-pointer whitespace-nowrap"
        >
          <FileText size={15} />
          Generate Financial Reports
        </button>
      </div>

      {/* ── Sectioned Table Card Component ───────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={tableSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={`Showing ${
          filteredRates.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
        }–${Math.min(currentPage * itemsPerPage, filteredRates.length)} of ${filteredRates.length} rates`}
      />
    </div>
  );
}