import { useState, useMemo } from "react";
import UserNavbar, { getUserNavbarMenuItems } from "../../Components/Major-Components/UserNavbar";
import UserSidebar from "../../Components/Major-Components/UserSidebar";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../Components/Minor-Components/Tabs";
import SearchFilter from "../../Components/Minor-Components/SearchFilter";
import DateRangePicker from "../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../Components/Minor-Components/SectionedTableCard";

const orderHistoryColumns = [
  { key: "batchId", label: "Batch ID" },
  { key: "productCode", label: "Product Code" },
  { key: "variant", label: "Variant" },
  { key: "stockQty", label: "Stock Qty (kg)" },
  { key: "supplier", label: "Supplier" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action", headerClassName: "text-right" },
];

const formatSectionLabel = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const sortRows = (rows, sortBy) => {
  const sorted = [...rows];
  switch (sortBy) {
    case "date-asc":
      return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    case "batch-asc":
      return sorted.sort((a, b) => a.batchId.localeCompare(b.batchId));
    case "status":
      return sorted.sort((a, b) => a.status.localeCompare(b.status));
    case "date-desc":
    default:
      return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
};

const OrderHistory = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [userRole] = useState("warehouse_encoder");
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [sortBy, setSortBy] = useState("date-asc");
  const [currentPage, setCurrentPage] = useState(1);

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

  // Mock data - 5 items
  const allRecordsData = [
    {
      id: "u-1",
      date: "2026-06-10",
      batchId: "BATCH 2026-001",
      productCode: "WR-001",
      variant: "Dinarado",
      stockQty: "2,500 kg",
      supplier: "Supplier A",
      status: "Approved",
    },
    {
      id: "u-2",
      date: "2026-06-10",
      batchId: "BATCH 2026-002",
      productCode: "WR-002",
      variant: "IR-8",
      stockQty: "1,800 kg",
      supplier: "Supplier B",
      status: "Requested",
    },
    {
      id: "u-3",
      date: "2026-06-18",
      batchId: "BATCH 2026-003",
      productCode: "WR-003",
      variant: "PSB-Rc82",
      stockQty: "3,200 kg",
      supplier: "Supplier A",
      status: "Received",
    },
    {
      id: "u-4",
      date: "2026-06-18",
      batchId: "BATCH 2026-004",
      productCode: "WR-001",
      variant: "Dinarado",
      stockQty: "2,500 kg",
      supplier: "Supplier C",
      status: "In Transit",
    },
    {
      id: "u-5",
      date: "2026-06-18",
      batchId: "BATCH 2026-005",
      productCode: "WR-004",
      variant: "NSIC RC-222",
      stockQty: "1,500 kg",
      supplier: "Supplier B",
      status: "Declined",
    },
  ];

  const recentUpdatesData = [
    {
      id: "u-1",
      date: "2026-06-10",
      batchId: "BATCH 2026-001",
      productCode: "WR-001",
      variant: "Dinarado",
      stockQty: "2,500 kg",
      supplier: "Supplier A",
      status: "Approved",
    },
    {
      id: "u-2",
      date: "2026-06-10",
      batchId: "BATCH 2026-002",
      productCode: "WR-002",
      variant: "IR-8",
      stockQty: "1,800 kg",
      supplier: "Supplier B",
      status: "Requested",
    },
  ];

  const tabs = [
    { id: "all", label: "All Records" },
    { id: "recent", label: "Recent Updates" },
  ];

  // Get current data based on active tab
  const currentData = activeTab === "all" ? allRecordsData : recentUpdatesData;

  // Filter data based on search and date range
  const filteredData = useMemo(() => {
    const filtered = currentData.filter((item) => {
      // Search filter
      const searchMatch =
        searchQuery === "" ||
        item.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.variant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchQuery.toLowerCase());

      // Date range filter
      const itemDate = new Date(item.date);
      const startDate = dateRange.startDate
        ? new Date(dateRange.startDate)
        : null;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;

      const dateMatch =
        (!startDate || itemDate >= startDate) &&
        (!endDate || itemDate <= endDate);

      return searchMatch && dateMatch;
    });

    return sortRows(filtered, sortBy);
  }, [currentData, searchQuery, dateRange, sortBy]);

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Group by date into the { label, rows } shape SectionedTableCard expects.
  // Sections themselves stay in the order rows arrive in (post-sort), so a
  // "Newest First" sort surfaces the newest date group first, etc.
  const tableSections = useMemo(() => {
    const sections = [];
    paginatedData.forEach((item) => {
      const section = sections.find((s) => s.date === item.date);
      if (section) {
        section.rows.push(item);
      } else {
        sections.push({ date: item.date, label: formatSectionLabel(item.date), rows: [item] });
      }
    });
    return sections;
  }, [paginatedData]);

  const rangeEnd = Math.min(startIndex + itemsPerPage, filteredData.length);
  const footerLabel =
    filteredData.length > 0
      ? `Showing ${startIndex + 1}-${rangeEnd} of ${filteredData.length} records`
      : "No records found";

  const handleViewDetails = (row) => {
    console.log("View details", row.id);
  };

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
          currentPath="/warehouse-encoder/orders"
        />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Breadcrumbs */}
            <Breadcrumbs
              items={[
                { label: "Management", path: "/warehouse-encoder/dashboard" },
                { label: "Order History" },
              ]}
            />

            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
              <p className="text-sm text-gray-600 mt-1">
                Review warehouse transaction history.
              </p>
            </div>

            {/* Tabs */}
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
            />

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="flex-1 min-w-0">
                <SearchFilter
                  onSearch={(value) => {
                    setSearchQuery(value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search Batch ID, Product Code, Variant, or Supplier"
                />
              </div>
              <div className="flex gap-3 shrink-0">
                <DateRangePicker
                  onDateChange={(range) => {
                    setDateRange(range);
                    setCurrentPage(1);
                  }}
                />
                <SortByDropdown value={sortBy} onChange={setSortBy} />
              </div>
            </div>

            {/* Table */}
            <SectionedTableCard
              columns={orderHistoryColumns}
              sections={tableSections}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onViewDetails={handleViewDetails}
              footerLabel={footerLabel}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderHistory;