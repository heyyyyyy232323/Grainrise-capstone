import { useState, useRef, useEffect } from "react";
import { PanelLeft, Search, Bell, ChevronDown } from "lucide-react";

/**
 * Reusable top navbar for all user roles.
 *
 * Props:
 * - user: { name, email, avatarUrl }
 * - notificationCount: number
 * - onToggleSidebar: () => void   (optional, e.g. to collapse the sidebar)
 * - onSearch: (query: string) => void  (optional)
 * - menuItems: [{ label, onClick }]  (optional dropdown items under the user's name, e.g. "Profile", "Log Out")
 *
 * Usage:
 * <Navbar
 *   user={{ name: "Kerbie Hector Abanid", email: "Abanid1@gmail.com", avatarUrl: avatar }}
 *   notificationCount={1}
 *   onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
 *   menuItems={[{ label: "Profile", onClick: () => navigate("/profile") }, { label: "Log Out", onClick: handleLogout }]}
 * />
 */
const UserNavbar = ({
  user = { name: "", email: "", avatarUrl: "" },
  notificationCount = 0,
  onToggleSidebar,
  onSearch,
  menuItems = [],
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-[73px] w-full bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-4 px-4 sm:px-6 z-30">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition shrink-0"
      >
        <PanelLeft size={18} />
      </button>

      {/* Search - Hidden on small mobile */}
      <div className="relative flex-1 max-w-xl hidden sm:flex">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search"
          onChange={(e) => onSearch && onSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600 transition"
        />
      </div>

      <div className="flex-1" />

      {/* Notification bell */}
      <button className="relative w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition shrink-0">
        <Bell size={18} />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
            {notificationCount}
          </span>
        )}
      </button>

      {/* User */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 sm:gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-gray-50 transition"
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-600 to-yellow-400 flex items-center justify-center text-white text-sm font-bold">
              {user.name?.charAt(0) || "U"}
            </div>
          )}

          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-gray-800 leading-tight">{user.name}</p>
            <p className="text-xs text-gray-500 leading-tight">{user.email}</p>
          </div>

          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform hidden sm:block ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {menuOpen && menuItems.length > 0 && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  item.onClick?.();
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default UserNavbar;