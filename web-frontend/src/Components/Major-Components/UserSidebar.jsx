import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Truck, Warehouse, Store, Users, FileBarChart, ShoppingCart, Package, CornerUpLeft, CreditCard, History, X, ClipboardList, PackageCheck, Wallet } from "lucide-react";
import Logo from "../../assets/Logo.png";

export const getUserSidebarConfig = (role = "admin") => {
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
     warehouse_encoder: {
      panelLabel: "Warehouse Encoder Panel",
      sections: [
        {
          title: "MAIN",
          items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/warehouse-encoder/dashboard" }],
        },
        {
          title: "MANAGEMENT",
          items: [
            { label: "Order History", icon: ShoppingCart, path: "/warehouse-encoder/orders" },
            { label: "Request Order", icon: CornerUpLeft, path: "/warehouse-encoder/requests" },
            { label: "Stock Management", icon: Package , path: "/warehouse-encoder/stock" },
          ],
        },
      ],
    },
    warehouse_sales: {
      panelLabel: "Warehouse Sales Panel",
      sections: [
        {
          title: "MAIN",
          items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/warehouse-sales/dashboard" }],
        },
        {
          title: "SALES",
          items: [
            { label: "Point of Sale", icon: CreditCard, path: "/warehouse-sales/point-of-sale" },
            { label: "Sales History", icon: History, path: "/warehouse-sales/sales-history" },
          ],
        },
        {
          title: "ORDERS",
          items: [
            { label: "Online Orders", icon: ShoppingCart, path: "/warehouse-sales/online-orders" },
          ],
        },
      ],
    },
    warehouse_logistics: {
      panelLabel: "Warehouse Logistics Panel",
      sections: [
        {
          title: "MAIN",
          items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/warehouse-logistics/dashboard" }],
        },
        {
          title: "DELIVERY OPERATIONS",
          items: [
            { label: "Delivery Management", icon: Truck, path: "/warehouse-logistics/delivery-management" },
            { label: "Product Returns", icon: CornerUpLeft, path: "/warehouse-logistics/product-returns" },
          ],
        },
        {
          title: "RECORDS",
          items: [
            { label: "Assigned History", icon: ClipboardList, path: "/warehouse-logistics/assigned-history" },
            { label: "Fulfillment History", icon: PackageCheck, path: "/warehouse-logistics/fulfillment-history" },
          ],
        },
        {
          title: "FINANCE",
          items: [
            { label: "Reimbursement", icon: Wallet, path: "/warehouse-logistics/reimbursement" },
            { label: "Reimbursement History", icon: History, path: "/warehouse-logistics/reimbursement-history" },
          ],
        },
      ],
    },
  };

  return menuConfigs[role] || menuConfigs.admin;
};

export const userSidebarRoles = ["admin", "supplier", "retailer", "warehouse_encoder", "warehouse_sales", "warehouse_logistics"];

const UserSidebar = ({
  role = "admin",
  panelLabel,
  sections,
  logo = Logo,
  isMinimized = false,
  isOpen = false,
  onClose,
}) => {
  const location = useLocation();
  const sidebarConfig = getUserSidebarConfig(role);
  const resolvedPanelLabel = panelLabel ?? sidebarConfig.panelLabel;
  const resolvedSections = sections ?? sidebarConfig.sections;

  return (
    <aside
      className={`fixed md:relative inset-y-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col shrink-0 z-40 md:z-30 transition-all duration-300 ease-in-out w-64
        ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        ${isMinimized ? "md:w-20" : "md:w-64"}
      `}
    >
      {/* Logo + Mobile close button */}
      <div className={`h-18.25 flex items-center border-b border-gray-100 transition-all duration-300 ${
        isMinimized ? "md:justify-center md:px-3 px-6 justify-start" : "justify-start px-6"
      }`}>
        <img src={logo} alt="GrainRise Logo" className={`object-contain transition-all duration-300 h-9 ${
          isMinimized ? "md:h-6" : "md:h-9"
        }`} />

        {/* Close button visible only on small screens when sidebar is open */}
        <button
          onClick={onClose}
          aria-label="Close sidebar"
          className="md:hidden ml-auto -mr-2 p-2 rounded-md text-slate-600 hover:bg-slate-100"
        >
          <X size={18} />
        </button>
      </div>

      {/* Panel label */}
      <div
        className={`bg-linear-to-r from-[#0B5D1E] to-[#D6A62D] transition-all duration-300 overflow-hidden py-3 px-6 h-auto ${
          isMinimized ? "md:py-0 md:px-0 md:h-0" : "md:py-3 md:px-6 md:h-auto"
        }`}
      >
        <span className="text-white font-bold text-sm tracking-wider uppercase">
          {resolvedPanelLabel}
        </span>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-4 transition-all duration-300">
        {resolvedSections.map((section) => (
          <div key={section.title} className="mb-5">
            <p className={`px-6 mb-2 text-xs font-bold text-amber-500 tracking-wider uppercase transition-all duration-300 ${
              isMinimized ? "md:hidden" : ""
            }`}>
              {section.title}
            </p>
            <div className="flex flex-col gap-1 px-3">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    title={isMinimized ? item.label : ""}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 justify-start ${
                      isMinimized ? "md:justify-center" : ""
                    } ${
                      isActive
                        ? "bg-[#0B5D1E] text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {Icon && <Icon size={18} className="shrink-0" />}
                    <span className={isMinimized ? "md:hidden" : ""}>{item.label}</span>
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