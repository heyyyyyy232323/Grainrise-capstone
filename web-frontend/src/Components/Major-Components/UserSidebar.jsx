import { Link, useLocation } from "react-router-dom";
import Logo from "../../assets/Logo.png";

const UserSidebar = ({ panelLabel = "Panel", sections = [], logo = Logo, isMinimized = false }) => {
  const location = useLocation();

  return (
    <aside
      className={`h-screen bg-white border-r border-gray-200 flex flex-col shrink-0 z-30 transition-all duration-300 ease-in-out ${
        isMinimized ? "w-20" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className={`h-[73px] flex items-center border-b border-gray-100 transition-all duration-300 ${
        isMinimized ? "justify-center px-3" : "justify-start px-6"
      }`}>
        <img src={logo} alt="GrainRise Logo" className={`object-contain transition-all duration-300 ${
          isMinimized ? "h-6" : "h-9"
        }`} />
      </div>

      {/* Panel label */}
      <div
        className={`bg-gradient-to-r from-[#0B5D1E] to-[#D6A62D] transition-all duration-300 overflow-hidden ${
          isMinimized ? "py-0 px-0 h-0" : "py-3 px-6 h-auto"
        }`}
      >
        <span className="text-white font-bold text-sm tracking-wider uppercase">
          {panelLabel}
        </span>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-4 transition-all duration-300">
        {sections.map((section) => (
          <div key={section.title} className="mb-5">
            {!isMinimized && (
              <p className="px-6 mb-2 text-xs font-bold text-amber-500 tracking-wider uppercase transition-all duration-300">
                {section.title}
              </p>
            )}
            <div className="flex flex-col gap-1 px-3">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={isMinimized ? item.label : ""}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isMinimized ? "justify-center" : "justify-start"
                    } ${
                      isActive
                        ? "bg-[#0B5D1E] text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {Icon && <Icon size={18} className="shrink-0" />}
                    {!isMinimized && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default UserSidebar;