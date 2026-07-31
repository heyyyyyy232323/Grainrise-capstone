import { Package, BarChart3, AlertCircle, CheckCircle } from "lucide-react";
import KPICard from "../../Components/Major-Components/KPICard";
import DistributionCard from "../../Components/Major-Components/DistributionCard";
import CategoryBarCard from "../../Components/Major-Components/CategoryBarCard";
import RecentActivityCard from "../../Components/Major-Components/RecentActivityCard";
import PendingReviewsCard from "../../Components/Major-Components/PendingReviewsCard";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import DateDisplay from "../../Components/Minor-Components/DateDisplay";

const WarehouseEncoderDashboard = () => {
  const lastUpdatedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const warehouseMetrics = [
    { title: "Product Variants", value: "500", trend: "Registered warehouse products", footer: "Total SKUs", icon: <Package size={18} strokeWidth={2.2} />, tone: "success" },
    { title: "Inventory Value", value: "₱24.8M", trend: "Total warehouse inventory value", footer: "Across all products", icon: <BarChart3 size={18} strokeWidth={2.2} />, tone: "success" },
    { title: "Low Stock Products", value: "42", trend: "Products requiring restocking", footer: "Products needing inventory", icon: <AlertCircle size={18} strokeWidth={2.2} />, tone: "warning" },
    { title: "Out of Stock", value: "5", trend: "Products with zero inventory", footer: "Products with empty inventory", icon: <AlertCircle size={18} strokeWidth={2.2} />, tone: "danger" },
  ];

  const inventoryDistribution = [
    { label: "In Stock", value: 50, color: "#0B7A2A" },
    { label: "Low Stock", value: 23, color: "#E0AC1C" },
    { label: "Out of Stock", value: 17, color: "#DC2626" },
  ];

  const productVariants = [
    { label: "Brand A", value: 89 },
    { label: "Brand B", value: 13 },
    { label: "Brand C", value: 64 },
    { label: "Brand D", value: 24 },
  ];

  const lowStockDistribution = [
    { label: "Brand A", value: 89 },
    { label: "Brand B", value: 13 },
    { label: "Brand C", value: 64 },
    { label: "Brand D", value: 24 },
  ];

  const inventoryActivity = [
    { id: "activity-1", title: "Inventory Received", description: "Batch 2026-001 (Dinarado 50kg) accepted from Supplier A", time: "5 mins ago", icon: CheckCircle, color: "#0B7A2A" },
    { id: "activity-2", title: "Inventory Received", description: "Batch 2026-001 (Dinarado 50kg) accepted from Supplier A", time: "5 mins ago", icon: CheckCircle, color: "#0B7A2A" },
    { id: "activity-3", title: "Inventory Received", description: "Batch 2026-001 (Dinarado 50kg) accepted from Supplier A", time: "5 mins ago", icon: CheckCircle, color: "#0B7A2A" },
  ];

  const pendingRequests = [
    { id: "req-1", category: "Supplier A", name: "Bulk Wholesale", date: "OCT 24", initials: "S", color: "#0B7A2A", onDetails: () => console.log("Open request", "req-1") },
    { id: "req-2", category: "Supplier A", name: "Bulk Wholesale", date: "OCT 24", initials: "S", color: "#0B7A2A", onDetails: () => console.log("Open request", "req-2") },
    { id: "req-3", category: "Supplier A", name: "Bulk Wholesale", date: "OCT 24", initials: "S", color: "#0B7A2A", onDetails: () => console.log("Open request", "req-3") },
  ];

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Main", path: "/warehouse-encoder/dashboard" },
          { label: "Dashboard" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Last Updated: Today, {lastUpdatedTime}
          </p>
        </div>
        <DateDisplay />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {warehouseMetrics.map((metric) => (
          <KPICard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DistributionCard
          title="Inventory Status"
          subtitle="Current Inventory Status"
          data={inventoryDistribution}
        />
        <CategoryBarCard
          title="Inventory Overview"
          subtitle="Stock levels by brand"
          bars={productVariants}
        />
        <CategoryBarCard
          title="Low Stock Distributions"
          subtitle="Stock levels by brand"
          bars={lowStockDistribution}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityCard
          title="Recent Inventory Activity"
          activities={inventoryActivity}
        />
        <PendingReviewsCard
          title="Pending Order Requests"
          subtitle="3 awaiting approval"
          reviews={pendingRequests}
        />
      </div>
    </>
  );
};

export default WarehouseEncoderDashboard;