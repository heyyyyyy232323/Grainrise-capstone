import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import UserNavbar, { getUserNavbarMenuItems } from "./UserNavbar";
import UserSidebar from "./UserSidebar";
import useApi from "../hooks/useApi";

const GUARDED_ROLES = ["miller_manager", "warehouse_manager", "retailer"];

const MainPageLayout = ({ role = "warehouse_encoder" }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [userRole] = useState(role);
  const location = useLocation();
  const navigate = useNavigate();
  const { request } = useApi();

  const isGuardedRole = GUARDED_ROLES.includes(role);
  const [isCheckingGuard, setIsCheckingGuard] = useState(isGuardedRole);

  useEffect(() => {
    if (!isGuardedRole) return;

    let isMounted = true;
    const verifyProfileStatus = async () => {
      try {
        const res = await request("/auth/profile-status", {
          method: "GET",
          throwOnError: true,
        });

        if (!isMounted) return;

        const mustChange = Boolean(
          res?.must_change_password ?? res?.user?.must_change_password
        );
        const incomplete = Boolean(
          res?.profile_incomplete ?? res?.user?.profile_incomplete
        );

        if (mustChange || incomplete) {
          navigate("/complete-profile", { replace: true });
          return;
        }
      } catch (err) {
        console.error("MainPageLayout first-login guard check error:", err);
      } finally {
        if (isMounted) {
          setIsCheckingGuard(false);
        }
      }
    };

    verifyProfileStatus();

    return () => {
      isMounted = false;
    };
  }, [isGuardedRole, navigate, request]);

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

  if (isCheckingGuard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#08511f]" />
          <p className="text-sm font-semibold text-gray-600">Verifying account access...</p>
        </div>
      </div>
    );
  }

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
          role={userRole}
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