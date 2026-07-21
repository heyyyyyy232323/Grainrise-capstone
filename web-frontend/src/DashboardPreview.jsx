import { useState } from "react";
import { useNavigate } from "react-router-dom";
import UserNavbar from "./Components/Major-Components/UserNavbar";
import UserSidebar from "./Components/Major-Components/UserSidebar";
import { LayoutDashboard, Truck, Warehouse, Store, Users, FileBarChart, ShoppingCart, Package } from "lucide-react";
import Logo from "./assets/Logo.png";

const DashboardPreview = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [userRole, setUserRole] = useState("admin");
  const navigate = useNavigate();

  // Toggle between open/close (mobile) or minimize/expand (desktop)
  const handleToggleSidebar = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarMinimized(!sidebarMinimized);
    }
  };

  // Different menu configs per role
  const menuConfigs = {
    admin: {
      panelLabel: "Admin Panel",
      sections: [
        {
          title: "MAIN",
          items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" }],
        },
        {
          title: "MANAGEMENT",
          items: [
            { label: "Suppliers", icon: Truck, path: "/admin/suppliers" },
            { label: "Warehouses", icon: Warehouse, path: "/admin/warehouses" },
            { label: "Retailers", icon: Store, path: "/admin/retailers" },
            { label: "Users", icon: Users, path: "/admin/users" },
          ],
        },
        {
          title: "ANALYTICS",
          items: [{ label: "Reports", icon: FileBarChart, path: "/admin/reports" }],
        },
      ],
    },
    supplier: {
      panelLabel: "Supplier Panel",
      sections: [
        {
          title: "MAIN",
          items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/supplier/dashboard" }],
        },
        {
          title: "MANAGEMENT",
          items: [
            { label: "Products", icon: Package, path: "/supplier/products" },
            { label: "Orders", icon: ShoppingCart, path: "/supplier/orders" },
          ],
        },
      ],
    },
    retailer: {
      panelLabel: "Retailer Panel",
      sections: [
        {
          title: "MAIN",
          items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/retailer/dashboard" }],
        },
        {
          title: "MANAGEMENT",
          items: [
            { label: "Orders", icon: ShoppingCart, path: "/retailer/orders" },
            { label: "Inventory", icon: Package, path: "/retailer/inventory" },
          ],
        },
      ],
    },
  };

  const currentConfig = menuConfigs[userRole];
  const user = {
    name: "Kerbie Hector Abanid",
    email: "abanid1@gmail.com",
    avatarUrl: "",
  };

  const menuItems = [
    { label: "Profile", onClick: () => alert("Navigate to Profile") },
    { label: "Settings", onClick: () => alert("Navigate to Settings") },
    { label: "Log Out", onClick: () => navigate("/login") },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Always visible on desktop, toggle on mobile */}
      <div className="hidden md:flex">
        <UserSidebar
          panelLabel={currentConfig.panelLabel}
          sections={currentConfig.sections}
          logo={Logo}
          isMinimized={sidebarMinimized}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="md:hidden fixed left-0 top-0 h-screen z-30 w-64">
            <UserSidebar
              panelLabel={currentConfig.panelLabel}
              sections={currentConfig.sections}
              logo={Logo}
              isMinimized={false}
            />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* Navbar */}
        <UserNavbar
          user={user}
          notificationCount={3}
          onToggleSidebar={handleToggleSidebar}
          onSearch={(query) => console.log("Search:", query)}
          menuItems={menuItems}
        />

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 md:p-8">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Dashboard Preview</h1>

              {/* Role selector */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Switch User Role:</h2>
                <div className="flex flex-wrap gap-2 sm:gap-4">
                  {Object.keys(menuConfigs).map((role) => (
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
                </div>
              </div>

              {/* Info */}
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Current Configuration:</h3>
                  <p className="text-sm sm:text-base text-blue-800">
                    Panel: <strong>{currentConfig.panelLabel}</strong>
                  </p>
                  <p className="text-sm sm:text-base text-blue-800">
                    Total menu items:{" "}
                    <strong>{currentConfig.sections.reduce((sum, s) => sum + s.items.length, 0)}</strong>
                  </p>
                  <p className="text-sm sm:text-base text-blue-800 hidden md:block">
                    Sidebar: <strong>{sidebarMinimized ? "Minimized (Icons Only)" : "Expanded"}</strong>
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">Features:</h3>
                  <ul className="text-green-800 space-y-1 text-sm sm:text-base">
                    <li>✓ Responsive design (mobile, tablet, desktop)</li>
                    <li>✓ Mobile sidebar overlay</li>
                    <li>✓ Desktop sidebar minimize</li>
                    <li>✓ Smooth animations</li>
                    <li>✓ Search functionality</li>
                    <li>✓ Notifications</li>
                    <li>✓ User dropdown menu</li>
                    <li>✓ Active link highlighting</li>
                    <li>✓ Per-role navigation menus</li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">How to Use:</h3>
                  <ul className="text-amber-800 space-y-1 text-sm sm:text-base">
                    <li>
                      📱 <strong>Mobile (&lt;768px):</strong> Click panel button to open/close sidebar
                    </li>
                    <li>
                      🖥️ <strong>Desktop (≥768px):</strong> Click panel button to minimize/expand sidebar
                    </li>
                    <li>→ Integrate navbar/sidebar into your actual dashboard pages</li>
                    <li>→ Replace menu items with your real routes</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPreview;
