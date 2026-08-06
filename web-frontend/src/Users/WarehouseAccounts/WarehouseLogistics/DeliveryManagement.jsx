import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";

const sampleOrders = Array.from({ length: 10 }, (_, i) => ({
  id: `o-${i + 1}`,
  batch: `Batch 2026 - 00${(i % 9) + 1}`,
  retailer: `Retailer A`,
  variant: "Dinorado",
  qty: "2,500 kg",
  arrival: "Apr 22, 2026",
}));

const drivers = [
  {
    id: "d-1",
    name: "Driver Unknown A",
    status: "Available",
    capacity: 340,
    max: 10000,
  },
  {
    id: "d-2",
    name: "Driver Unknown A",
    status: "Available",
    capacity: 340,
    max: 10000,
  },
  {
    id: "d-3",
    name: "Driver Unknown A",
    status: "Available",
    capacity: 340,
    max: 10000,
  },
  {
    id: "d-4",
    name: "Driver Unknown A",
    status: "Available",
    capacity: 340,
    max: 10000,
  },
  {
    id: "d-5",
    name: "Driver Unknown A",
    status: "Limited Capacity",
    capacity: 7800,
    max: 10000,
  },
  {
    id: "d-6",
    name: "Driver Unknown A",
    status: "Full",
    capacity: 10000,
    max: 10000,
  },
];

const driverStatusStyles = {
  Available: {
    cardBorder: "border-emerald-600",
    badge: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-600",
  },
  "Limited Capacity": {
    cardBorder: "border-amber-500",
    badge: "bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
  },
  Full: {
    cardBorder: "border-rose-500",
    badge: "bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
  },
};

export default function DeliveryManagement() {
  const [query, setQuery] = useState("");
  const [driverQuery, setDriverQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const columns = [
    { key: "batch", label: "Batch No." },
    { key: "retailer", label: "Retailer" },
    { key: "variant", label: "Variant" },
    { key: "qty", label: "Qty (kg)" },
    { key: "arrival", label: "Target Arrival" },
    { key: "action", label: "Action" },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sampleOrders.filter(
      (o) =>
        q === "" ||
        `${o.batch} ${o.retailer} ${o.variant}`.toLowerCase().includes(q),
    );
  }, [query]);

  const filteredDrivers = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    return drivers.filter((d) => q === "" || d.name.toLowerCase().includes(q));
  }, [driverQuery]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const tableSections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div>
      <Breadcrumbs
        items={[
          {
            label: "Delivery Operations",
            path: "/warehouse-logistics/dashboard",
          },
          { label: "Delivery Management" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Delivery Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Assign drivers to forwarded marketplace orders.
        </p>
      </div>

      <div className="flex gap-6 mt-4 items-start">
        <div className="flex-1">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Forwarded Orders
              </h3>
              <span className="text-sm text-slate-500">
                Orders ready for driver assignment ({filtered.length} orders)
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <SearchFilter
                  onSearch={(v) => { setQuery(v); setCurrentPage(1); }}
                  placeholder="Search batch no., retailer, or product"
                />
              </div>
              <select className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option>Delivery Area</option>
              </select>
              <select className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option>Priority</option>
              </select>
            </div>

            <SectionedTableCard
              columns={columns}
              sections={tableSections}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onViewDetails={(row) => console.log("View details for", row.id)}
              footerLabel={`Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${filtered.length} orders`}
            />
          </div>
        </div>

        <aside style={{ width: 360 }}>
          <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="font-bold text-slate-900">Driver Capacity</h4>
            <div className="relative mt-1">
              <SearchFilter
                onSearch={(v) => setDriverQuery(v)}
                placeholder="Search driver..."
              />
            </div>

            <div className="mt-3 space-y-2">
              {filteredDrivers.map((d) => {
                const pct = Math.min(
                  100,
                  Math.round((d.capacity / d.max) * 100),
                );
                const style =
                  driverStatusStyles[d.status] ?? driverStatusStyles.Available;

                return (
                  <div
                    key={d.id}
                    className={`rounded-md border p-2 ${style.cardBorder}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {d.name}
                        </div>
                        <span
                          className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.badge}`}
                        >
                          {d.status}
                        </span>
                      </div>
                      <button className="text-[11px] font-semibold text-slate-900 bg-white border border-slate-900 px-2 py-0.5 rounded">
                        ASSIGN
                      </button>
                    </div>

                    <div className="mt-2">
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`${style.bar} h-full`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1.5 text-[10px] text-slate-500">
                        Current Capacity
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                        <span>
                          {d.capacity.toLocaleString()} /{" "}
                          {d.max.toLocaleString()} kg
                        </span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}