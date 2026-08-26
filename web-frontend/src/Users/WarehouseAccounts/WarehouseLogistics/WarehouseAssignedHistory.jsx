import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import WarehouseDeliveryDetails from "./WarehouseDeliveryDetails";

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
  const [selectedRecord, setSelectedRecord] = useState(null);

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

  if (selectedRecord) {
    return (
      <div>
        <Breadcrumbs 
          items={[
            { label: "Records", path: "/warehouse-logistics/dashboard" }, 
            { label: "Assigned History", path: "/warehouse-logistics/assigned-history", onClick: () => setSelectedRecord(null) },
            { label: "Delivery Details" }
          ]} 
        />
        <WarehouseDeliveryDetails 
          record={selectedRecord} 
          onBack={() => setSelectedRecord(null)} 
        />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Records", path: "/warehouse-logistics/dashboard" }, { label: "Assigned History" }]} />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Assigned History</h1>
        <p className="text-sm text-slate-500 mt-1">View all assigned, delivered, and completed delivery records.</p>
      </div>

      <div className="mt-4 mb-4 -mx-4 md:mx-0">
        <div className="px-4 md:px-0">
          <div className="w-full">
            <div className="flex gap-3 items-center">
            <div className="flex-1 min-w-0 max-w-xl">
              <SearchFilter
                onSearch={(v) => { setQuery(v); setPage(1); }}
                placeholder="Search order no., batch no., driver, or product"
              />
            </div>

            <div className="w-44 flex-none">
              <Dropdown
                options={[
                  { label: "All", value: "all" },
                  { label: "Pending", value: "pending" },
                  { label: "In Transit", value: "in_transit" },
                  { label: "Delivered", value: "delivered" },
                ]}
                value={deliveryFilter}
                onChange={(v) => { setDeliveryFilter(v); setPage(1); }}
                placeholder="Delivery Status"
              />
            </div>

            <div className="w-44 flex-none">
              <Dropdown
                options={[
                  { label: "All", value: "all" },
                  { label: "Assigned", value: "assigned" },
                  { label: "Completed", value: "completed" },
                  { label: "Cancelled", value: "cancelled" },
                ]}
                value={assignmentFilter}
                onChange={(v) => { setAssignmentFilter(v); setPage(1); }}
                placeholder="Assignment Status"
              />
            </div>
            </div>
          </div>
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onViewDetails={(row) => setSelectedRecord(row)}
        footerLabel={`Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${filtered.length} records`}
      />
    </div>
  );
}