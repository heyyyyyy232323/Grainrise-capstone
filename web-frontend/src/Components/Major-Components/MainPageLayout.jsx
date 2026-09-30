import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import UserNavbar, { getUserNavbarMenuItems } from "./UserNavbar";
import UserSidebar from "./UserSidebar";

const MainPageLayout = ({ role = "warehouse_encoder" }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [userRole] = useState(role);
  const location = useLocation();

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
      <div
        className={`fixed inset-0 z-30 md:hidden bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          sidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Navbar */}
        <UserNavbar
          user={user}
          onToggleSidebar={handleToggleSidebar}
          menuItems={getUserNavbarMenuItems(userRole)}
        />

        {/* Scrollable Content Area - each page renders inside here */}
        <div className="flex-1 overflow-y-auto">
          <div className="app-content min-w-0 px-4 py-6 md:px-8 md:py-8 space-y-6 w-full">
            <div key={location.pathname} className="animate-page-fade">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainPageLayout;