import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Truck, Warehouse, Store, Users, FileBarChart, ShoppingCart, Package, CornerUpLeft, CreditCard, History, X, ClipboardList, PackageCheck, Wallet, BookOpen, Receipt, RefreshCcw, Archive, Mail } from "lucide-react";
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
            { label: "Supplier Management", icon: Truck, path: "/admin/suppliers" },
            { label: "Warehouse Management", icon: Warehouse, path: "/admin/warehouses" },
            { label: "Retailer Management", icon: Store, path: "/admin/retailers" },
          ],
        },
        {
          title: "COMMUNICATION",
          items: [
            { label: "Email Users", icon: Mail, path: "/admin/email-users" },
          ],
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
          title: "SALES",
          items: [
            { label: "Point of Sale", icon: CreditCard, path: "/retailer/point-of-sale" },
            { label: "Sales History", icon: History, path: "/retailer/sales-history" },
          ],
        },
        {
          title: "INVENTORY",
          items: [
            { label: "Inventory", icon: Package, path: "/retailer/inventory" },
            { label: "Warehouse Marketplace", icon: Warehouse, path: "/retailer/warehouse-marketplace" },
          ],
        },
        {
          title: "ORDERS",
          items: [
            { label: "Order Tracking", icon: Truck, path: "/retailer/order-tracking" },
            { label: "My Purchases", icon: ShoppingCart, path: "/retailer/my-purchases" },
          ],
        },
        {
          title: "SUPPORT",
          items: [
            { label: "Product Returns Issue", icon: CornerUpLeft, path: "/retailer/product-returns" },
            { label: "Messages", icon: Mail, path: "/retailer/messages" },
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
    warehouse_procurement: {
      panelLabel: "Warehouse Procurement Panel",
      sections: [
        {
          title: "MAIN",
          items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/warehouse-procurement/dashboard" }],
        },
        {
          title: "OPERATIONS",
          items: [
            { label: "Receiving Orders", icon: Truck, path: "/warehouse-procurement/receiving-orders" },
            { label: "Goods Receipt", icon: Package, path: "/warehouse-procurement/goods-receipt" },
            { label: "Returns", icon: CornerUpLeft, path: "/warehouse-procurement/returns" },
            { label: "Receiving History", icon: History, path: "/warehouse-procurement/receiving-history" },
          ],
        },
        {
          title: "MASTER DATA",
          items: [
            { label: "Suppliers", icon: Truck, path: "/warehouse-procurement/suppliers" },
          ],
        },
            {
              title: "PAYMENT",
              items: [
                { label: "Procurement Payment History", icon: CreditCard, path: "/warehouse-procurement/payment-history" },
              ],
            },
      ],
    },
    warehouse_finance: {
      panelLabel: "Warehouse Finance Panel",
      sections: [
        {
          title: "MAIN",
          items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/warehouse-finance/dashboard" }],
        },
        {
          title: "FINANCE",
          items: [
            { label: "Payables", icon: BookOpen, path: "/warehouse-finance/payables" },
            { label: "Taxes", icon: Receipt, path: "/warehouse-finance/taxes" },
            { label: "Reimburse", icon: RefreshCcw, path: "/warehouse-finance/reimburse" },
          ],
        },
        {
          title: "RECORDS",
          items: [
            { label: "Payment History", icon: History, path: "/warehouse-finance/payment-history" },
          ],
        },
      ],
    },
    supplier_encoder: {
      panelLabel: "Supplier Encoder Panel",
      sections: [
        {
          title: "MAIN",
          items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/supplier-encoder/dashboard" }],
        },
        {
          title: "MANAGEMENT",
          items: [
            { label: "Order History", icon: History, path: "/supplier-encoder/orders" },
            { label: "Request Orders", icon: CornerUpLeft, path: "/supplier-encoder/requests" },
            { label: "Stock Management", icon: Archive, path: "/supplier-encoder/stock" },
          ],
        },
      ],
    },
    miller_sales: {
      panelLabel: "Miller Sales Panel",
      sections: [
        {
          title: "MAIN",
          items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/miller-sales/dashboard" }],
        },
        {
          title: "SALES",
          items: [
            { label: "Point of Sale", icon: CreditCard, path: "/miller-sales/point-of-sale" },
            { label: "Sales History", icon: History, path: "/miller-sales/sales-history" },
          ],
        },
        {
          title: "ORDERS",
          items: [
            { label: "Online Orders", icon: ShoppingCart, path: "/miller-sales/online-orders" },
          ],
        },
      ],
    },
    miller_logistics: {
      panelLabel: "Miller Logistics Panel",
      sections: [
        {
          title: "MAIN",
          items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/miller-logistics/dashboard" }],
        },
        {
          title: "DELIVERY OPERATIONS",
          items: [
            { label: "Delivery Management", icon: Truck, path: "/miller-logistics/delivery-management" },
            { label: "Product Returns", icon: CornerUpLeft, path: "/miller-logistics/product-returns" },
          ],
        },
        {
          title: "RECORDS",
          items: [
            { label: "Assigned History", icon: ClipboardList, path: "/miller-logistics/assigned-history" },
            { label: "Fulfillment History", icon: PackageCheck, path: "/miller-logistics/fulfillment-history" },
          ],
        },
        {
          title: "FINANCE",
          items: [
            { label: "Reimbursement", icon: Wallet, path: "/miller-logistics/reimbursement" },
            { label: "Reimbursement History", icon: History, path: "/miller-logistics/reimbursement-history" },
          ],
        },
      ],
    },
    miller_finance: {
      panelLabel: "Miller Finance Panel",
      sections: [
        {
          title: "MAIN",
          items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/miller-finance/dashboard" }],
        },
        {
          title: "FINANCE",
          items: [
            { label: "Payables", icon: BookOpen, path: "/miller-finance/payables" },
            { label: "Taxes", icon: Receipt, path: "/miller-finance/taxes" },
            { label: "Reimburse", icon: RefreshCcw, path: "/miller-finance/reimburse" },
          ],
        },
        {
          title: "RECORDS",
          items: [
            { label: "Payment History", icon: History, path: "/miller-finance/payment-history" },
          ],
        },
      ],
    },
  };

  return menuConfigs[role] || menuConfigs.admin;
};

export const userSidebarRoles = ["admin", "supplier", "retailer", "warehouse_encoder", "warehouse_sales", "warehouse_logistics", "warehouse_procurement", "warehouse_finance", "supplier_encoder", "miller_sales", "miller_logistics", "miller_finance"];

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