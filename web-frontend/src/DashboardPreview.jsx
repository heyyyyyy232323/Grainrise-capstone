import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Package, ShoppingCart, TrendingUp, UserPlus, Users, BellRing } from "lucide-react";
import UserNavbar, { getUserNavbarMenuItems } from "./Components/Major-Components/UserNavbar";
import UserSidebar, { getUserSidebarConfig, userSidebarRoles } from "./Components/Major-Components/UserSidebar";
import KPICard from "./Components/Graphs/KPICard";
import DistributionCard from "./Components/Graphs/PieChartCard";
import CategoryBarCard from "./Components/Graphs/BarGraphsCard";
import SalesTrendCard from "./Components/Graphs/LineGraphsCard";
import RecentActivityCard from "./Components/Graphs/RecentActivityCard";
import PendingReviewsCard from "./Components/Graphs/PendingReviewsCard";
import SectionedTableCard from "./Components/Minor-Components/SectionedTableCard";
import Toast from "./Components/Modals/Toast";
import Logo from "./assets/Logo.png";

const DashboardPreview = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [userRole, setUserRole] = useState("admin");
  const [salesRange, setSalesRange] = useState("Week");
  const [updatesPage, setUpdatesPage] = useState(1);
  const [activeToast, setActiveToast] = useState(null);
  const navigate = useNavigate();

  const handleToggleSidebar = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarMinimized(!sidebarMinimized);
    }
  };

  const currentConfig = getUserSidebarConfig(userRole);
  const user = {
    name: "Kerbie Hector Abanid",
    email: "abanid1@gmail.com",
    avatarUrl: "",
  };

  const previewMetrics = [
    {
      title: "Today's Sales",
      value: "₱24,580",
      trend: "+12.5% vs yesterday",
      footer: "Sales recorded today",
      icon: <DollarSign size={18} strokeWidth={2.2} />,
      tone: "success",
    },
    {
      title: "Open Orders",
      value: "128",
      trend: "+8.2% this week",
      footer: "Awaiting processing",
      icon: <ShoppingCart size={18} strokeWidth={2.2} />,
      tone: "warning",
    },
    {
      title: "Active Users",
      value: "1,204",
      trend: "+3.4% this month",
      footer: "Across all roles",
      icon: <Users size={18} strokeWidth={2.2} />,
      tone: "neutral",
    },
    {
      title: "Fulfillment Rate",
      value: "98%",
      trend: "+1.1% improved",
      footer: "Orders completed on time",
      icon: <Package size={18} strokeWidth={2.2} />,
      tone: "success",
    },
  ];

  const previewDistribution = [
    { label: "Walk-in Sales", value: 65, color: "#0B7A2A" },
    { label: "Online Sales", value: 35, color: "#E0AC1C" },
  ];

  const previewBars = [
    { label: "Supplier A", value: 89 },
    { label: "Supplier B", value: 13 },
    { label: "Supplier C", value: 64 },
    { label: "Supplier D", value: 24 },
  ];

  const previewActivity = [
    {
      id: "activity-1",
      title: "New Supplier Registered",
      description: "Kerbie Hector Abanid joined as a Retailer",
      time: "5 mins ago",
      icon: UserPlus,
      color: "#0B7A2A",
    },
    {
      id: "activity-2",
      title: "Inventory Updated",
      description: "Warehouse stock counts were synced successfully",
      time: "18 mins ago",
      icon: TrendingUp,
      color: "#0F9D2A",
    },
    {
      id: "activity-3",
      title: "Payment Confirmed",
      description: "An order payment cleared and moved to fulfillment",
      time: "42 mins ago",
      icon: DollarSign,
      color: "#E0AC1C",
    },
  ];

  const previewReviews = [
    {
      id: "review-1",
      category: "Supplier Registration",
      name: "Juan Dela Cruz",
      date: "OCT 24",
      initials: "J",
      color: "#0B7A2A",
      onDetails: () => console.log("Open supplier review", "review-1"),
    },
    {
      id: "review-2",
      category: "Supplier Registration",
      name: "Maria Santos",
      date: "OCT 24",
      initials: "M",
      color: "#0B7A2A",
      onDetails: () => console.log("Open supplier review", "review-2"),
    },
    {
      id: "review-3",
      category: "Warehouse Request",
      name: "Alex Reyes",
      date: "OCT 24",
      initials: "A",
      color: "#0B7A2A",
      onDetails: () => console.log("Open warehouse review", "review-3"),
    },
  ];

  const previewSalesTrend = [
    { label: "Week 1", value: 55000 },
    { label: "Week 2", value: 125000 },
    { label: "Week 3", value: 107000 },
    { label: "Week 4", value: 165000 },
  ];

  const salesRangeOptions = [
    { label: "Week", value: "Week" },
    { label: "Month", value: "Month" },
    { label: "Quarter", value: "Quarter" },
  ];

  const recentUpdates = [
    { id: "u-1", section: "Today", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Approved" },
    { id: "u-2", section: "Today", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Requested" },
    { id: "u-3", section: "Today", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Received" },
    { id: "u-4", section: "Yesterday", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "In Transit" },
    { id: "u-5", section: "Yesterday", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Declined" },
    { id: "u-6", section: "Yesterday", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Declined" },
    { id: "u-7", section: "Yesterday", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Approved" },
    { id: "u-8", section: "July 18, 2026", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Received" },
    { id: "u-9", section: "July 18, 2026", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "In Transit" },
    { id: "u-10", section: "July 18, 2026", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Requested" },
    { id: "u-11", section: "July 17, 2026", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Approved" },
    { id: "u-12", section: "July 17, 2026", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Declined" },
    { id: "u-13", section: "July 17, 2026", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Received" },
    { id: "u-14", section: "July 17, 2026", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "In Transit" },
    { id: "u-15", section: "July 16, 2026", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Approved" },
    { id: "u-16", section: "July 16, 2026", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Requested" },
    { id: "u-17", section: "July 16, 2026", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Received" },
    { id: "u-18", section: "July 16, 2026", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinarado", stockQty: "2,500 KG", supplier: "Supplier A", status: "Declined" },
  ];

  const updatesPerPage = 10;
  const totalUpdatePages = Math.max(1, Math.ceil(recentUpdates.length / updatesPerPage));
  const startIndex = (updatesPage - 1) * updatesPerPage;
  const visibleUpdates = recentUpdates.slice(startIndex, startIndex + updatesPerPage);

  const groupedUpdates = visibleUpdates.reduce((sections, row) => {
    const section = sections.find((item) => item.label === row.section);
    if (section) {
      section.rows.push(row);
    } else {
      sections.push({ label: row.section, rows: [row] });
    }
    return sections;
  }, []);

  const updateColumns = [
    { key: "batchId", label: "Batch ID" },
    { key: "productCode", label: "Product Code" },
    { key: "variant", label: "Variant" },
    { key: "stockQty", label: "Stock Qty (KG)" },
    { key: "supplier", label: "Supplier" },
    { key: "status", label: "Status" },
    { key: "action", label: "Action", headerClassName: "text-right" },
  ];

  const menuItems = getUserNavbarMenuItems(navigate);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="hidden md:flex">
        <UserSidebar role={userRole} logo={Logo} isMinimized={sidebarMinimized} />
      </div>

      <div
        className={`md:hidden fixed inset-0 z-20 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          sidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />
      <div
        className={`md:hidden fixed left-0 top-0 h-screen z-30 w-64 transition-opacity duration-300 ${
          sidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-100 pointer-events-none"
        }`}
      >
        <UserSidebar
          role={userRole}
          logo={Logo}
          isMinimized={false}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <UserNavbar
          user={user}
          notificationCount={3}
          onToggleSidebar={handleToggleSidebar}
          onSearch={(query) => console.log("Search:", query)}
          menuItems={menuItems}
        />

        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 md:p-8">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Dashboard Preview</h1>

              <div className="mb-8 pb-8 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Switch User Role:</h2>
                <div className="flex flex-wrap gap-2 sm:gap-4">
                  {userSidebarRoles.map((role) => (
                    <button
                      key={role}
                      onClick={() => setUserRole(role)}
                      className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition text-sm sm:text-base ${
                        userRole === role
                          ? "bg-[#0B5D1E] text-white shadow-md"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => navigate("/consumer/home")}
                    className="px-4 sm:px-6 py-2 rounded-lg font-medium text-sm sm:text-base bg-[#E0AC1C] text-white shadow-sm transition hover:bg-[#c99716]"
                  >
                    Consumer Portal
                  </button>
                </div>
              </div>

              {/* ── Figma Toast Notification Showcase ────────────────────────── */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <BellRing size={20} className="text-[#0B7A2A]" />
                  <h2 className="text-lg font-semibold text-gray-800">Figma Toast Notifications Preview</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">Click any button below to trigger and preview the Figma toast notification designs live on screen:</p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => setActiveToast({
                      type: "success",
                      title: "Success",
                      message: "Supplier account has been added successfully.",
                    })}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    1. Success Toast
                  </button>
                  <button
                    onClick={() => setActiveToast({
                      type: "error",
                      title: "Save Failed",
                      message: "Unable to save the inventory changes.\nPlease try again.",
                      actionLabel: "Retry",
                      actionType: "button",
                      onAction: () => alert("Retry action triggered!"),
                    })}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 transition cursor-pointer"
                  >
                    2. Save Failed (with Retry)
                  </button>
                  <button
                    onClick={() => setActiveToast({
                      type: "warning",
                      title: "Low Stock Alert",
                      message: "Rice stock for this product is below the recommended level.",
                      actionLabel: "Review Stock",
                      actionType: "link",
                      onAction: () => alert("Review Stock link clicked!"),
                    })}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition cursor-pointer"
                  >
                    3. Low Stock Alert (with Link)
                  </button>
                  <button
                    onClick={() => setActiveToast({
                      type: "info",
                      title: "Data Refreshed",
                      message: "Inventory data has been refreshed.",
                    })}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 transition cursor-pointer"
                  >
                    4. Data Refreshed
                  </button>
                  <button
                    onClick={() => setActiveToast({
                      type: "processing",
                      title: "Processing",
                      message: "Generating your inventory report...",
                      duration: 4000,
                    })}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition cursor-pointer"
                  >
                    5. Processing
                  </button>
                  <button
                    onClick={() => setActiveToast({
                      type: "deactivated",
                      title: "Account Deactivated",
                      message: "Juan Dela Cruz's account has been deactivated.",
                      actionLabel: "Undo Action",
                      actionType: "link-right",
                      onAction: () => alert("Undo Action triggered!"),
                    })}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 transition cursor-pointer"
                  >
                    6. Account Deactivated (with Undo)
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Current Configuration
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">{currentConfig.panelLabel}</h3>
                    </div>

                    <div className="text-sm text-slate-600 sm:text-right">
                      <p>
                        Total menu items: {currentConfig.sections.reduce((sum, section) => sum + section.items.length, 0)}
                      </p>
                      <p>Sidebar: {sidebarMinimized ? "Minimized (Icons Only)" : "Expanded"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <SalesTrendCard
                    title="Sales Trend"
                    data={previewSalesTrend}
                    selectedRange={salesRange}
                    rangeOptions={salesRangeOptions}
                    onRangeChange={setSalesRange}
                    maxValue={200000}
                    axisFormatter={(value) => `${Math.round(value / 1000)}k`}
                    valueFormatter={(value) => `₱${Math.round(value / 1000)}K`}
                    className="xl:col-span-2"
                  />

                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="grid gap-6 md:grid-cols-2">
                    {previewMetrics.map((metric) => (
                      <KPICard key={metric.title} {...metric} />
                    ))}
                  </div>

                  <DistributionCard
                    title="Sales Distribution"
                    totalLabel="100% Revenue"
                    items={previewDistribution}
                    className="h-full"
                  />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <CategoryBarCard
                    title="Supplier Employee Distributions"
                    seriesLabel="2026"
                    items={previewBars}
                    maxValue={100}
                    barColor="#2E7D32"
                    className="h-full"
                  />

                  <div className="grid gap-6">
                    <RecentActivityCard title="Recent Activity" items={previewActivity} className="h-full" />

                    <PendingReviewsCard
                      title="Pending Reviews"
                      items={previewReviews}
                      onViewAll={() => console.log("View all pending reviews")}
                      className="h-full"
                    />
                  </div>
                </div>

                <SectionedTableCard
                  title="Recent Updates"
                  columns={updateColumns}
                  sections={groupedUpdates}
                  currentPage={updatesPage}
                  totalPages={totalUpdatePages}
                  footerLabel={`Showing ${startIndex + 1}-${Math.min(startIndex + updatesPerPage, recentUpdates.length)} of ${recentUpdates.length} recent updates`}
                  onPageChange={setUpdatesPage}
                  onViewDetails={(row) => console.log("View details for", row.id)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Toast Component Preview */}
      {activeToast && (
        <Toast
          isOpen={Boolean(activeToast)}
          type={activeToast.type}
          title={activeToast.title}
          message={activeToast.message}
          actionLabel={activeToast.actionLabel}
          actionType={activeToast.actionType}
          onAction={activeToast.onAction}
          duration={activeToast.duration || 4000}
          onClose={() => setActiveToast(null)}
        />
      )}
    </div>
  );
};

export default DashboardPreview;