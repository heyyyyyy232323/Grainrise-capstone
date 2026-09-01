import { useState, useMemo } from "react";
import { Search, FileText, CheckCircle2, AlertCircle, Eye, Download, Plus } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const MOCK_CONTRACTS = [
  { id: "cnt-101", farmer: "Mang Juan Dela Cruz", variety: "Dinorado Palay", volume: "25,000 kg", pricePerKg: "₱23.50", startDate: "2026-02-15", endDate: "2026-06-30", status: "Active" },
  { id: "cnt-102", farmer: "San Jose Farmers Coop", variety: "Sinandomeng Palay", volume: "60,000 kg", pricePerKg: "₱21.00", startDate: "2026-01-10", endDate: "2026-05-30", status: "Active" },
  { id: "cnt-103", farmer: "Pedro Ramirez", variety: "Jasponica Palay", volume: "15,000 kg", pricePerKg: "₱26.00", startDate: "2026-03-01", endDate: "2026-07-31", status: "Pending" },
  { id: "cnt-104", farmer: "Bulacan Rice Growers Org", variety: "RC-160 Palay", volume: "100,000 kg", pricePerKg: "₱22.00", startDate: "2025-11-01", endDate: "2026-03-31", status: "Active" },
  { id: "cnt-105", farmer: "Antonio Santos", variety: "Dinorado Palay", volume: "30,000 kg", pricePerKg: "₱24.00", startDate: "2025-08-01", endDate: "2026-01-31", status: "Completed" },
];

export default function MillerContracts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const columns = [
    { key: "id", label: "Contract ID", width: "12%" },
    { key: "farmer", label: "Farmer / Cooperative", width: "24%" },
    { key: "variety", label: "Rice / Palay Variety", width: "18%" },
    { key: "volume", label: "Contracted Vol.", width: "14%" },
    { key: "pricePerKg", label: "Agreed Rate", width: "12%" },
    { key: "status", label: "Status", width: "10%" },
    {
      key: "action",
      label: "Action",
      width: "10%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      render: (row) => (
        <button
          type="button"
          onClick={() => alert(`Viewing Contract: ${row.id} - ${row.farmer}`)}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-[#0B5D1E] hover:text-[#0B5D1E] cursor-pointer"
        >
          View
        </button>
      ),
    },
  ];

  const filtered = useMemo(() => {
    return MOCK_CONTRACTS.filter((c) => {
      const matchSearch =
        c.farmer.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.variety.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const tableSections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Contracts" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Farmer &amp; Supplier Contracts
        </h2>
        <p className="text-sm text-slate-500">
          Manage binding contracts, volume commitments, and supply agreements with farmers.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search contract ID, farmer name, variety..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#0B5D1E] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={tableSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={`Showing ${filtered.length} contracts`}
      />
    </div>
  );
}
