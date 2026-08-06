import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";

const sampleAssigned = Array.from({ length: 125 }, (_, i) => ({
  id: `a-${i + 1}`,
  orderNo: `Batch A2026 - 00${(i % 12) + 1}`,
  variant: "Dinorado",
  driver: "Driver Unknown A",
  status: "Assigned",
  assignedOn: "Apr 12, 2026",
}));

export default function AssignedHistory() {
  const [query, setQuery] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [page, setPage] = useState(1);

  const columns = [
    { key: "orderNo", label: "Order No." },
    { key: "variant", label: "Variant" },
    { key: "driver", label: "Assigned Driver" },
    { key: "status", label: "Status" },
    { key: "assignedOn", label: "Assigned On" },
    { key: "action", label: "Action", headerClassName: "text-center", cellClassName: "!text-center !pr-3" },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sampleAssigned.filter((r) => {
      if (q && !(`${r.orderNo} ${r.variant} ${r.driver}`.toLowerCase().includes(q))) return false;
      if (deliveryFilter !== "all") {
        // placeholder for future delivery status filtering
      }
      if (assignmentFilter !== "all") {
        // placeholder for assignment status filtering
      }
      return true;
    });
  }, [query, deliveryFilter, assignmentFilter]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Records", path: "/warehouse-logistics/dashboard" }, { label: "Assigned History" }]} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assigned History</h1>
        <p className="text-sm text-slate-500 mt-1">View all assigned, delivered, and completed delivery records.</p>
      </div>

      <div className="mt-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex-1">
          <SearchFilter
            onSearch={(v) => { setQuery(v); setPage(1); }}
            placeholder="Search order no., batch no., driver, or product"
          />
        </div>

        <select value={deliveryFilter} onChange={(e) => { setDeliveryFilter(e.target.value); setPage(1); }} className="rounded-md border border-slate-200 px-3 py-2">
          <option value="all">Delivery Status</option>
        </select>

        <select value={assignmentFilter} onChange={(e) => { setAssignmentFilter(e.target.value); setPage(1); }} className="rounded-md border border-slate-200 px-3 py-2">
          <option value="all">Assignment Status</option>
        </select>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${filtered.length} records`}
      />
    </div>
  );
}