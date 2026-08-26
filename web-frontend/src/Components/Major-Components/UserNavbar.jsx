import { useState, useRef, useEffect } from "react";
import { PanelLeft, Search, Bell, ChevronDown, UserPlus, CircleUserRound, Moon, CircleHelp, LogOut, AlertCircle } from "lucide-react";

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
export const getUserNavbarMenuItems = (navigate) => [
  { label: "Help Center", onClick: () => alert("Open Help Center") },
  { label: "Logout", onClick: () => navigate("/login") },
];

export const getUserNavbarNotifications = () => [
  {
    id: "notif-1",
    title: "Low Stock Alert",
    description: "Dinorado Rice has reached the minimum stock level.",
    time: "15 mins",
    read: false,
    onView: () => alert("Open stock details"),
  },
  {
    id: "notif-2",
    title: "Low Stock Alert",
    description: "Dinorado Rice has reached the minimum stock level.",
    time: "15 mins",
    read: false,
    onView: () => alert("Open stock details"),
  },
  {
    id: "notif-3",
    title: "Low Stock Alert",
    description: "Dinorado Rice has reached the minimum stock level.",
    time: "15 mins",
    read: false,
    onView: () => alert("Open stock details"),
  },
  {
    id: "notif-4",
    title: "Low Stock Alert",
    description: "Dinorado Rice has reached the minimum stock level.",
    time: "15 mins",
    read: false,
    onView: () => alert("Open stock details"),
  },
];

const UserNavbar = ({
  user = { name: "", email: "", avatarUrl: "" },
  notificationCount = 0,
  onToggleSidebar,
  onSearch,
  menuItems = [],
  notificationItems = [],
  onMarkAllAsRead,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [notifications, setNotifications] = useState(
    notificationItems.length > 0 ? notificationItems : getUserNavbarNotifications(),
  );
  const menuRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    if (notificationItems.length > 0) {
      setNotifications(notificationItems);
    }
  }, [notificationItems]);

  // Initialize theme from localStorage. Default to light when no saved preference exists.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light") {
        document.documentElement.classList.add("light");
        setDarkModeEnabled(false);
      } else if (saved === "dark") {
        document.documentElement.classList.remove("light");
        setDarkModeEnabled(true);
      } else {
        document.documentElement.classList.add("light");
        localStorage.setItem("theme", "light");
        setDarkModeEnabled(false);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    setDarkModeEnabled((prev) => {
      const next = !prev;
      try {
        if (next) {
          // dark -> remove light class
          document.documentElement.classList.remove("light");
          localStorage.setItem("theme", "dark");
        } else {
          // light -> add light class
          document.documentElement.classList.add("light");
          localStorage.setItem("theme", "light");
        }
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const effectiveMenuItems = menuItems.length > 0 ? menuItems : getUserNavbarMenuItems(() => { });
  const unreadCount = notifications.filter((item) => !item.read).length;
  const badgeCount = notificationCount || unreadCount;

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    onMarkAllAsRead?.();
  };

  return (
    <header className="h-18.25 w-full bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-4 px-4 sm:px-6 z-30">
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

      {/* Notification */}
      <div className="relative" ref={notificationRef}>
        <button
          onClick={() => {
            setNotificationOpen((prev) => !prev);
            setMenuOpen(false);
          }}
          className="relative w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition shrink-0"
        >
          <Bell size={18} />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
              {badgeCount}
            </span>
          )}
        </button>

        {notificationOpen && (
          <div className="absolute right-0 mt-2 w-[min(88vw,20rem)] rounded-xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
              <h3 className="text-sm leading-none font-bold text-gray-900">Notification</h3>
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-[#0B7A2A] hover:text-[#096322] transition"
              >
                Mark all as read
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto px-2 py-2 space-y-1">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 border-b border-slate-100 last:border-b-0 ${item.read ? "bg-white" : "bg-[#F0F8F1]"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <AlertCircle size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs leading-tight font-bold text-gray-900">
                          {item.title}
                        </p>
                        <span className="text-[10px] font-semibold text-gray-500 whitespace-nowrap pt-0.5">
                          {item.time}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {item.description}
                      </p>

                      <button
                        onClick={() => item.onView?.(item)}
                        className="mt-2.5 inline-flex items-center rounded-full bg-[#007A1F] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#006218] transition"
                      >
                        View Stock
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
            <div className="w-9 h-9 rounded-full bg-linear-to-br from-green-600 to-yellow-400 flex items-center justify-center text-white text-sm font-bold">
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

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-[min(80vw,15rem)] rounded-xl border border-gray-200 bg-[#EDF4EE] shadow-2xl z-50 overflow-hidden p-2">
            <div className="rounded-lg bg-[#DDE7DF] px-2.5 py-1.5 flex items-center gap-1.5 text-[#006A1E] mb-1.5">
              <CircleUserRound size={16} className="shrink-0" />
              <span className="text-sm leading-none font-bold">My Account</span>
            </div>

            <div className="w-full flex items-center justify-between px-1.5 py-1.5 text-left text-gray-500">
              <span className="flex items-center gap-1.5 text-sm leading-none">
                <Moon size={16} />
                <span className="text-sm">Dark Mode</span>
              </span>
              <button
                type="button"
                aria-label="Toggle dark mode"
                onClick={toggleTheme}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${darkModeEnabled ? "bg-[#0B7A2A]" : "bg-gray-300"
                  }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${darkModeEnabled ? "translate-x-4.5" : "translate-x-1"
                    }`}
                />
              </button>
            </div>

            <div className="space-y-0.5">
              {effectiveMenuItems.map((item) => {
                const isLogout = item.label.toLowerCase().includes("logout") || item.label.toLowerCase().includes("log out");

                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.onClick?.();
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-1.5 px-1.5 py-1.5 text-left transition ${isLogout
                      ? "mt-0.5 pt-2 border-t border-gray-300 text-red-600 hover:text-red-700"
                      : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    {isLogout ? <LogOut size={16} /> : <CircleHelp size={16} />}
                    <span className="text-sm leading-none">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default UserNavbar;