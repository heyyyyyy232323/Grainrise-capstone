import { useMemo } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import DateDisplay from "../../../Components/Minor-Components/DateDisplay";
import KPICard from "../../../Components/Graphs/KPICard";
import DistributionCard from "../../../Components/Graphs/PieChartCard";
import BarGraphsCard from "../../../Components/Graphs/BarGraphsCard";
import RecentActivityCard from "../../../Components/Graphs/RecentActivityCard";
import { Users, Warehouse, Truck, UserPlus } from "lucide-react";

const sampleDistribution = [
  { label: "Retailers", value: 25, color: "#0B7A2A" },
  { label: "Suppliers", value: 25, color: "#7ED26B" },
  { label: "Warehouse Mgrs", value: 25, color: "#CFF3D1" },
  { label: "Administrators", value: 25, color: "#E6F9E9" },
];

const sampleBar = [
  { label: "Supplier A", value: 85 },
  { label: "Supplier B", value: 15 },
  { label: "Supplier C", value: 65 },
  { label: "Supplier D", value: 23 },
];

const recentActivity = [
  { id: "a1", title: "New Supplier Registered", description: "Kerbie Hector Abanid joined as a Retailer", time: "5 mins ago", icon: UserPlus, color: "#0B7A2A" },
  { id: "a2", title: "New Warehouse Added", description: "Warehouse 12 registered successfully", time: "20 mins ago", icon: Warehouse, color: "#0F9D2A" },
  { id: "a3", title: "New User", description: "A new user was created by Admin", time: "1 hour ago", icon: Users, color: "#0B7A2A" },
];

export default function AdminDashboard() {
  const metrics = useMemo(
    () => [
      { title: "Overall Users", value: "100", footer: "Registered Accounts", icon: <Users size={18} strokeWidth={2.2} />, tone: "success" },
      { title: "Warehouses", value: "100", footer: "Registered Warehouses", icon: <Warehouse size={18} strokeWidth={2.2} />, tone: "success" },
      { title: "Suppliers", value: "50", footer: "Verified Suppliers", icon: <Truck size={18} strokeWidth={2.2} />, tone: "neutral" },
      { title: "Inactive Accounts", value: "10", footer: "Requires Review", icon: <UserPlus size={18} strokeWidth={2.2} />, tone: "danger" },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Last Updated: Today · 10:42 AM</p>
        </div>

        <DateDisplay />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <KPICard key={m.title} {...m} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DistributionCard title="Entity Breakdown" items={sampleDistribution} totalLabel="100%" className="h-full" />
        </div>

        <div className="grid gap-6">
          <BarGraphsCard title="Warehouse Employee Distributions" items={sampleBar} seriesLabel="2026" className="h-full" />
          <BarGraphsCard title="Supplier Employee Distributions" items={sampleBar} seriesLabel="2026" className="h-full" />
        </div>
      </div>

      <RecentActivityCard title="Recent Activity" items={recentActivity} />
    </div>
  );
}
