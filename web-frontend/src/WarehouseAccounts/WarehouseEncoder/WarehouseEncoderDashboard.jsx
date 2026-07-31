import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, BarChart3, AlertCircle, CheckCircle } from "lucide-react";
import UserNavbar, { getUserNavbarMenuItems } from "../../Components/Major-Components/UserNavbar";
import UserSidebar from "../../Components/Major-Components/UserSidebar";
import KPICard from "../../Components/Major-Components/KPICard";
import DistributionCard from "../../Components/Major-Components/DistributionCard";
import CategoryBarCard from "../../Components/Major-Components/CategoryBarCard";
import RecentActivityCard from "../../Components/Major-Components/RecentActivityCard";
import PendingReviewsCard from "../../Components/Major-Components/PendingReviewsCard";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import DateDisplay from "../../Components/Minor-Components/DateDisplay";
import Logo from "../../assets/Logo.png";

const WarehouseEncoderDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [userRole] = useState("warehouse_encoder");
  const navigate = useNavigate();

  const handleToggleSidebar = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setSidebarOpen((prev) => !prev);
    } else {
      setSidebarMinimized((prev) => !prev);
    }
  };

  const user = {
    name: "Kerbie Hector Abanid",
    email: "abanid1@gmail.com",
    avatarUrl: "",
  };

  const lastUpdatedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // Warehouse-specific KPI metrics
  const warehouseMetrics = [
    {
      title: "Product Variants",
      value: "500",
      trend: "Registered warehouse products",
      footer: "Total SKUs",
      icon: <Package size={18} strokeWidth={2.2} />,
      tone: "success",
    },
    {
      title: "Inventory Value",
      value: "₱24.8M",
      trend: "Total warehouse inventory value",
      footer: "Across all products",
      icon: <BarChart3 size={18} strokeWidth={2.2} />,
      tone: "success",
    },
    {
      title: "Low Stock Products",
      value: "42",
      trend: "Products requiring restocking",
      footer: "Products needing inventory",
      icon: <AlertCircle size={18} strokeWidth={2.2} />,
      tone: "warning",
    },
    {
      title: "Out of Stock",
      value: "5",
      trend: "Products with zero inventory",
      footer: "Products with empty inventory",
      icon: <AlertCircle size={18} strokeWidth={2.2} />,
      tone: "danger",
    },
  ];

  // Inventory status distribution
  const inventoryDistribution = [
    { label: "In Stock", value: 50, color: "#0B7A2A" },
    { label: "Low Stock", value: 23, color: "#E0AC1C" },
    { label: "Out of Stock", value: 17, color: "#DC2626" },
  ];

  // Product variants by category
  const productVariants = [
    { label: "Brand A", value: 89 },
    { label: "Brand B", value: 13 },
    { label: "Brand C", value: 64 },
    { label: "Brand D", value: 24 },
  ];

  // Low stock distributions
  const lowStockDistribution = [
    { label: "Brand A", value: 89 },
    { label: "Brand B", value: 13 },
    { label: "Brand C", value: 64 },
    { label: "Brand D", value: 24 },
  ];

  // Recent inventory activity
  const inventoryActivity = [
    {
      id: "activity-1",
      title: "Inventory Received",
      description: "Batch 2026-001 (Dinarado 50kg) accepted from Supplier A",
      time: "5 mins ago",
      icon: CheckCircle,
      color: "#0B7A2A",
    },
    {
      id: "activity-2",
      title: "Inventory Received",
      description: "Batch 2026-001 (Dinarado 50kg) accepted from Supplier A",
      time: "5 mins ago",
      icon: CheckCircle,
      color: "#0B7A2A",
    },
    {
      id: "activity-3",
      title: "Inventory Received",
      description: "Batch 2026-001 (Dinarado 50kg) accepted from Supplier A",
      time: "5 mins ago",
      icon: CheckCircle,
      color: "#0B7A2A",
    },
  ];

  // Pending order requests for encoder
  const pendingRequests = [
    {
      id: "req-1",
      category: "Supplier A",
      name: "Bulk Wholesale",
      date: "OCT 24",
      initials: "S",
      color: "#0B7A2A",
      onDetails: () => console.log("Open request", "req-1"),
    },
    {
      id: "req-2",
      category: "Supplier A",
      name: "Bulk Wholesale",
      date: "OCT 24",
      initials: "S",
      color: "#0B7A2A",
      onDetails: () => console.log("Open request", "req-2"),
    },
    {
      id: "req-3",
      category: "Supplier A",
      name: "Bulk Wholesale",
      date: "OCT 24",
      initials: "S",
      color: "#0B7A2A",
      onDetails: () => console.log("Open request", "req-3"),
    },
  ];


  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <UserSidebar
        role={userRole}
        isMinimized={sidebarMinimized}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Navbar */}
        <UserNavbar
          user={user}
          onToggleSidebar={handleToggleSidebar}
          menuItems={getUserNavbarMenuItems(userRole)}
          currentPath="/warehouse-encoder/dashboard"
        />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Breadcrumbs */}
            <Breadcrumbs 
              items={[
                { label: "Main", path: "/warehouse-encoder/dashboard" },
                { label: "Dashboard" }
              ]}
            />

            {/* Header */}
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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {warehouseMetrics.map((metric) => (
                <KPICard key={metric.title} {...metric} />
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Inventory Status */}
              <DistributionCard
                title="Inventory Status"
                subtitle="Current Inventory Status"
                data={inventoryDistribution}
              />

              {/* Inventory Overview */}
              <CategoryBarCard
                title="Inventory Overview"
                subtitle="Stock levels by brand"
                bars={productVariants}
              />

              {/* Low Stock Distributions */}
              <CategoryBarCard
                title="Low Stock Distributions"
                subtitle="Stock levels by brand"
                bars={lowStockDistribution}
              />
            </div>

            {/* Bottom Row - Activity & Requests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <RecentActivityCard
                title="Recent Inventory Activity"
                activities={inventoryActivity}
              />

              {/* Pending Requests */}
              <PendingReviewsCard
                title="Pending Order Requests"
                subtitle="3 awaiting approval"
                reviews={pendingRequests}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WarehouseEncoderDashboard;