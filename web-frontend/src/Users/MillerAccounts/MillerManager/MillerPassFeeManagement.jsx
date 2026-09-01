import { useState, useMemo } from "react";
import { Search, Receipt, Plus, CheckCircle2, DollarSign } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const MOCK_PASS_FEES = [
  { id: "PF-2026-01", truckNo: "NBC-1234", driver: "Juan Santos", route: "Bulacan to Manila", fee: "₱850.00", date: "2026-03-01", status: "paid" },
  { id: "PF-2026-02", truckNo: "CAE-5678", driver: "Pedro Reyes", route: "Nueva Ecija to Bulacan", fee: "₱1,200.00", date: "2026-03-01", status: "paid" },
  { id: "PF-2026-03", truckNo: "WRO-9988", driver: "Mario Gomez", route: "Pampanga to Bulacan", fee: "₱650.00", date: "2026-02-28", status: "pending" },
  { id: "PF-2026-04", truckNo: "TXA-4432", driver: "Danilo Cruz", route: "Tarlac to Manila", fee: "₱1,500.00", date: "2026-02-27", status: "paid" },
];

export default function MillerPassFeeManagement() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const columns = [
    { key: "id", label: "Pass Fee ID", width: "16%" },
    { key: "truckNo", label: "Truck Plate No.", width: "16%" },
    { key: "driver", label: "Assigned Driver", width: "20%" },
    { key: "route", label: "Transit Route", width: "24%" },
    { key: "fee", label: "Fee Amount", width: "12%" },
    { key: "status", label: "Status", width: "12%" },
  ];

  const filtered = useMemo(() => {
    return MOCK_PASS_FEES.filter(
      (f) =>
        f.id.toLowerCase().includes(search.toLowerCase()) ||
        f.truckNo.toLowerCase().includes(search.toLowerCase()) ||
        f.driver.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const tableSections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Pass Fee Management" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Pass Fee Management
        </h2>
        <p className="text-sm text-slate-500">
          Track and verify logistics toll fees, checkpoint passes, and transit clearances.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search fee ID, plate no., driver..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#0B5D1E] outline-none"
          />
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={tableSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={`Showing ${filtered.length} pass fee records`}
      />
    </div>
  );
}
