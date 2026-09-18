import React from "react";
import {
  LayoutDashboard,
  Truck,
  Warehouse,
  Store,
  Users,
  FileBarChart,
  ShoppingCart,
  Package,
  CornerUpLeft,
  CreditCard,
  History,
  X,
  ClipboardList,
  PackageCheck,
  Wallet,
  BookOpen,
  Receipt,
  RefreshCcw,
  Archive,
  Mail,
  Newspaper,
  MessagesSquare,
  FileText,
  ClipboardCheck,
  SlidersHorizontal,
  CircleDollarSign,
  Tractor,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Logo from "../../assets/Logo.png";

export const getUserSidebarConfig = (role = "admin") => {
  const menuConfigs = {
    admin: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/admin/dashboard",
            },
          ],
        },
        {
          title: "MANAGEMENT",
          items: [
            {
              label: "Miller Management",
              icon: Truck,
              path: "/admin/suppliers",
            },
            {
              label: "Warehouse Management",
              icon: Warehouse,
              path: "/admin/warehouses",
            },
            {
              label: "Retailer Management",
              icon: Store,
              path: "/admin/retailers",
            },
            {
              label: "Farmer Management",
              icon: Users,
              path: "/admin/farmers",
            },
          ],
        },
        {
          title: "COMMUNICATION",
          items: [
            {
              label: "Email Users",
              icon: Mail,
              path: "/admin/email-users",
            },
            {
              label: "News & Updates",
              icon: Newspaper,
              path: "/admin/news-updates",
            },
          ],
        },
      ],
    },

    supplier: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/supplier/dashboard",
            },
          ],
        },
        {
          title: "MANAGEMENT",
          items: [
            {
              label: "Products",
              icon: Package,
              path: "/supplier/products",
            },
            {
              label: "Orders",
              icon: ShoppingCart,
              path: "/supplier/orders",
            },
          ],
        },
      ],
    },

    retailer: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/retailer/dashboard",
            },
          ],
        },
        {
          title: "SALES",
          items: [
            {
              label: "Point of Sale",
              icon: CreditCard,
              path: "/retailer/point-of-sale",
            },
            {
              label: "Sales History",
              icon: History,
              path: "/retailer/sales-history",
            },
          ],
        },
        {
          title: "INVENTORY",
          items: [
            {
              label: "Inventory",
              icon: Package,
              path: "/retailer/inventory",
            },
            {
              label: "Warehouse Marketplace",
              icon: Warehouse,
              path: "/retailer/warehouse-marketplace",
            },
          ],
        },
        {
          title: "ORDERS",
          items: [
            {
              label: "Order Tracking",
              icon: Truck,
              path: "/retailer/order-tracking",
            },
            {
              label: "My Purchases",
              icon: ShoppingCart,
              path: "/retailer/my-purchases",
            },
          ],
        },
        {
          title: "SUPPORT",
          items: [
            {
              label: "Product Returns Issue",
              icon: CornerUpLeft,
              path: "/retailer/product-returns",
            },
            {
              label: "Messages",
              icon: MessagesSquare,
              path: "/retailer/messages",
            },
          ],
        },
        {
          title: "RESOURCES",
          items: [
            {
              label: "News & Updates",
              icon: Newspaper,
              path: "/retailer/news-updates",
            },
          ],
        },
      ],
    },

    warehouse_encoder: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/warehouse-encoder/dashboard",
            },
          ],
        },
        {
          title: "MANAGEMENT",
          items: [
            {
              label: "Order History",
              icon: ShoppingCart,
              path: "/warehouse-encoder/orders",
            },
            {
              label: "Request Order",
              icon: CornerUpLeft,
              path: "/warehouse-encoder/requests",
            },
            {
              label: "Stock Management",
              icon: Package,
              path: "/warehouse-encoder/stock",
            },
          ],
        },
      ],
    },

    warehouse_sales: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/warehouse-sales/dashboard",
            },
          ],
        },
        {
          title: "SALES",
          items: [
            {
              label: "Point of Sale",
              icon: CreditCard,
              path: "/warehouse-sales/point-of-sale",
            },
            {
              label: "Sales History",
              icon: History,
              path: "/warehouse-sales/sales-history",
            },
          ],
        },
        {
          title: "ORDERS",
          items: [
            {
              label: "Online Orders",
              icon: ShoppingCart,
              path: "/warehouse-sales/online-orders",
            },
          ],
        },
      ],
    },

    warehouse_logistics: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/warehouse-logistics/dashboard",
            },
          ],
        },
        {
          title: "DELIVERY OPERATIONS",
          items: [
            {
              label: "Delivery Management",
              icon: Truck,
              path: "/warehouse-logistics/delivery-management",
            },
            {
              label: "Product Returns",
              icon: CornerUpLeft,
              path: "/warehouse-logistics/product-returns",
            },
          ],
        },
        {
          title: "RECORDS",
          items: [
            {
              label: "Assigned History",
              icon: ClipboardList,
              path: "/warehouse-logistics/assigned-history",
            },
            {
              label: "Fulfillment History",
              icon: PackageCheck,
              path: "/warehouse-logistics/fulfillment-history",
            },
          ],
        },
        {
          title: "FINANCE",
          items: [
            {
              label: "Reimbursement",
              icon: Wallet,
              path: "/warehouse-logistics/reimbursement",
            },
            {
              label: "Reimbursement History",
              icon: History,
              path: "/warehouse-logistics/reimbursement-history",
            },
          ],
        },
      ],
    },

    warehouse_procurement: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/warehouse-procurement/dashboard",
            },
          ],
        },
        {
          title: "OPERATIONS",
          items: [
            {
              label: "Receiving Orders",
              icon: Truck,
              path: "/warehouse-procurement/receiving-orders",
            },
            {
              label: "Goods Receipt",
              icon: Package,
              path: "/warehouse-procurement/goods-receipt",
            },
            {
              label: "Returns",
              icon: CornerUpLeft,
              path: "/warehouse-procurement/returns",
            },
            {
              label: "Receiving History",
              icon: History,
              path: "/warehouse-procurement/receiving-history",
            },
          ],
        },
        {
          title: "MASTER DATA",
          items: [
            {
              label: "Suppliers",
              icon: Truck,
              path: "/warehouse-procurement/suppliers",
            },
          ],
        },
        {
          title: "PAYMENT",
          items: [
            {
              label: "Procurement Payment History",
              icon: CreditCard,
              path: "/warehouse-procurement/payment-history",
            },
          ],
        },
      ],
    },

    warehouse_finance: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/warehouse-finance/dashboard",
            },
          ],
        },
        {
          title: "FINANCE",
          items: [
            {
              label: "Payables",
              icon: BookOpen,
              path: "/warehouse-finance/payables",
            },
            {
              label: "Taxes",
              icon: Receipt,
              path: "/warehouse-finance/taxes",
            },
            {
              label: "Reimburse",
              icon: RefreshCcw,
              path: "/warehouse-finance/reimburse",
            },
          ],
        },
        {
          title: "RECORDS",
          items: [
            {
              label: "Payment History",
              icon: History,
              path: "/warehouse-finance/payment-history",
            },
          ],
        },
      ],
    },

    supplier_encoder: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/supplier-encoder/dashboard",
            },
          ],
        },
        {
          title: "MANAGEMENT",
          items: [
            {
              label: "Order History",
              icon: History,
              path: "/supplier-encoder/orders",
            },
            {
              label: "Request Orders",
              icon: CornerUpLeft,
              path: "/supplier-encoder/requests",
            },
            {
              label: "Stock Management",
              icon: Archive,
              path: "/supplier-encoder/stock",
            },
          ],
        },
      ],
    },

    miller_sales: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/miller-sales/dashboard",
            },
          ],
        },
        {
          title: "SALES",
          items: [
            {
              label: "Point of Sale",
              icon: CreditCard,
              path: "/miller-sales/point-of-sale",
            },
            {
              label: "Sales History",
              icon: History,
              path: "/miller-sales/sales-history",
            },
          ],
        },
        {
          title: "ORDERS",
          items: [
            {
              label: "Online Orders",
              icon: ShoppingCart,
              path: "/miller-sales/online-orders",
            },
          ],
        },
      ],
    },

    miller_logistics: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/miller-logistics/dashboard",
            },
          ],
        },
        {
          title: "DELIVERY OPERATIONS",
          items: [
            {
              label: "Delivery Management",
              icon: Truck,
              path: "/miller-logistics/delivery-management",
            },
            {
              label: "Product Returns",
              icon: CornerUpLeft,
              path: "/miller-logistics/product-returns",
            },
          ],
        },
        {
          title: "RECORDS",
          items: [
            {
              label: "Assigned History",
              icon: ClipboardList,
              path: "/miller-logistics/assigned-history",
            },
            {
              label: "Fulfillment History",
              icon: PackageCheck,
              path: "/miller-logistics/fulfillment-history",
            },
          ],
        },
        {
          title: "FINANCE",
          items: [
            {
              label: "Reimbursement",
              icon: Wallet,
              path: "/miller-logistics/reimbursement",
            },
            {
              label: "Reimbursement History",
              icon: History,
              path: "/miller-logistics/reimbursement-history",
            },
          ],
        },
      ],
    },

    miller_finance: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/miller-finance/dashboard",
            },
          ],
        },
        {
          title: "FINANCE",
          items: [
            {
              label: "Payables",
              icon: BookOpen,
              path: "/miller-finance/payables",
            },
            {
              label: "Taxes",
              icon: Receipt,
              path: "/miller-finance/taxes",
            },
            {
              label: "Reimburse",
              icon: RefreshCcw,
              path: "/miller-finance/reimburse",
            },
          ],
        },
        {
          title: "RECORDS",
          items: [
            {
              label: "Payment History",
              icon: History,
              path: "/miller-finance/payment-history",
            },
          ],
        },
      ],
    },

    warehouse_manager: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/warehouse-manager/dashboard",
            },
          ],
        },
        {
          title: "MANAGEMENT",
          items: [
            {
              label: "Branch Management",
              icon: Warehouse,
              path: "/warehouse-manager/branches",
            },
            {
              label: "Messages",
              icon: MessagesSquare,
              path: "/warehouse-manager/messages",
            },
            {
              label: "Order Approval",
              icon: ClipboardList,
              path: "/warehouse-manager/order-approval",
            },
          ],
        },
        {
          title: "ANALYTICS",
          items: [
            {
              label: "Performance Monitoring",
              icon: FileBarChart,
              path: "/warehouse-manager/performance",
            },
          ],
        },
        {
          title: "HISTORY",
          items: [
            {
              label: "Fulfillment History",
              icon: PackageCheck,
              path: "/warehouse-manager/fulfillment-history",
            },
            {
              label: "Sales History",
              icon: History,
              path: "/warehouse-manager/sales-history",
            },
            {
              label: "Procurement Receiving History",
              icon: Truck,
              path: "/warehouse-manager/procurement-history",
            },
            {
              label: "Finance Management History",
              icon: CreditCard,
              path: "/warehouse-manager/finance-history",
            },
          ],
        },
        {
          title: "RESOURCES",
          items: [
            {
              label: "News & Updates",
              icon: Newspaper,
              path: "/warehouse-manager/news-updates",
            },
          ],
        },
      ],
    },

    branch_manager: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/branch-manager/dashboard",
            },
          ],
        },
        {
          title: "MANAGEMENT",
          items: [
            {
              label: "Order Approval",
              icon: ClipboardList,
              path: "/branch-manager/order-approval",
            },
          ],
        },
        {
          title: "ANALYTICS",
          items: [
            {
              label: "Performance Monitoring",
              icon: FileBarChart,
              path: "/branch-manager/performance",
            },
          ],
        },
        {
          title: "HISTORY",
          items: [
            {
              label: "Fulfillment History",
              icon: PackageCheck,
              path: "/branch-manager/fulfillment-history",
            },
            {
              label: "Sales History",
              icon: History,
              path: "/branch-manager/sales-history",
            },
            {
              label: "Procurement Receiving History",
              icon: Truck,
              path: "/branch-manager/procurement-history",
            },
            {
              label: "Finance Management History",
              icon: CreditCard,
              path: "/branch-manager/finance-history",
            },
          ],
        },
        {
          title: "RESOURCES",
          items: [
            {
              label: "News & Updates",
              icon: Newspaper,
              path: "/branch-manager/news-updates",
            },
          ],
        },
      ],
    },

    warehouse_driver: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/warehouse-driver/dashboard",
            },
          ],
        },
        {
          title: "OPERATIONS",
          items: [
            {
              label: "My Duties",
              icon: ClipboardList,
              path: "/warehouse-driver/my-duties",
            },
          ],
        },
        {
          title: "COMMUNICATION",
          items: [
            {
              label: "Messages",
              icon: MessagesSquare,
              path: "/warehouse-driver/messages",
            },
          ],
        },
        {
          title: "FINANCE",
          items: [
            {
              label: "Payment Submission",
              icon: CreditCard,
              path: "/warehouse-driver/payment-submission",
            },
            {
              label: "Reimbursement",
              icon: Wallet,
              path: "/warehouse-driver/reimbursement",
            },
          ],
        },
        {
          title: "HISTORY",
          items: [
            {
              label: "Assigned History",
              icon: ClipboardList,
              path: "/warehouse-driver/assigned-history",
            },
            {
              label: "Reimbursement History",
              icon: History,
              path: "/warehouse-driver/reimbursement-history",
            },
          ],
        },
      ],
    },

    miller_driver: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/miller-driver/dashboard",
            },
          ],
        },
        {
          title: "OPERATIONS",
          items: [
            {
              label: "My Duties",
              icon: ClipboardList,
              path: "/miller-driver/my-duties",
            },
          ],
        },
        {
          title: "COMMUNICATION",
          items: [
            {
              label: "Messages",
              icon: MessagesSquare,
              path: "/miller-driver/messages",
            },
          ],
        },
        {
          title: "FINANCE",
          items: [
            {
              label: "Payment Submission",
              icon: CreditCard,
              path: "/miller-driver/payment-submission",
            },
            {
              label: "Reimbursement",
              icon: Wallet,
              path: "/miller-driver/reimbursement",
            },
          ],
        },
        {
          title: "HISTORY",
          items: [
            {
              label: "Assigned History",
              icon: ClipboardList,
              path: "/miller-driver/assigned-history",
            },
            {
              label: "Reimbursement History",
              icon: History,
              path: "/miller-driver/reimbursement-history",
            },
          ],
        },
      ],
    },

    miller_manager: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/miller-manager/dashboard",
            },
          ],
        },
        {
          title: "MANAGEMENT",
          items: [
            {
              label: "Branch Management",
              icon: Warehouse,
              path: "/miller-manager/branches",
            },
            {
              label: "Contracts",
              icon: FileText,
              path: "/miller-manager/contracts",
            },
            {
              label: "Messages",
              icon: MessagesSquare,
              path: "/miller-manager/messages",
            },
            {
              label: "Order Approval",
              icon: ClipboardCheck,
              path: "/miller-manager/order-approval",
            },
            {
              label: "Fare Fee Management",
              icon: SlidersHorizontal,
              path: "/miller-manager/pass-fee",
            },
          ],
        },
        {
          title: "ANALYTICS",
          items: [
            {
              label: "Performance Monitoring",
              icon: FileBarChart,
              path: "/miller-manager/performance",
            },
          ],
        },
        {
          title: "HISTORY",
          items: [
            {
              label: "Fulfillment History",
              icon: PackageCheck,
              path: "/miller-manager/fulfillment-history",
            },
            {
              label: "Sales History",
              icon: Receipt,
              path: "/miller-manager/sales-history",
            },
            {
              label: "Procurement Receiving History",
              icon: Package,
              path: "/miller-manager/procurement-history",
            },
            {
              label: "Finance Management History",
              icon: CircleDollarSign,
              path: "/miller-manager/finance-history",
            },
          ],
        },
        {
          title: "RESOURCES",
          items: [
            {
              label: "News & Updates",
              icon: Newspaper,
              path: "/miller-manager/news-updates",
            },
          ],
        },
      ],
    },

    farmer: {
      sections: [
        {
          title: "MAIN",
          items: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              path: "/farmer/dashboard",
            },
          ],
        },
        {
          title: "FARM",
          items: [
            {
              label: "Farm Management",
              icon: Tractor,
              path: "/farmer/farm-management",
            },
            {
              label: "Forecasting",
              icon: FileBarChart,
              path: "/farmer/forecasting",
            },
          ],
        },
        {
          title: "BUSINESS",
          items: [
            {
              label: "Contracts",
              icon: ClipboardList,
              path: "/farmer/contracts",
            },
            {
              label: "Messages",
              icon: MessagesSquare,
              path: "/farmer/messages",
            },
            {
              label: "Point of Sale",
              icon: ShoppingCart,
              path: "/farmer/point-of-sale",
            },
            {
              label: "Transaction History",
              icon: History,
              path: "/farmer/transaction-history",
            },
          ],
        },
        {
          title: "RESOURCES",
          items: [
            {
              label: "News & Updates",
              icon: Newspaper,
              path: "/farmer/news-updates",
            },
          ],
        },
      ],
    },
  };

  return menuConfigs[role] || menuConfigs.admin;
};

export const userSidebarRoles = [
  "admin",
  "supplier",
  "retailer",
  "warehouse_encoder",
  "warehouse_sales",
  "warehouse_logistics",
  "warehouse_procurement",
  "warehouse_finance",
  "warehouse_manager",
  "branch_manager",
  "warehouse_driver",
  "miller_driver",
  "supplier_encoder",
  "miller_sales",
  "miller_logistics",
  "miller_finance",
  "miller_manager",
  "farmer",
];

const UserSidebar = ({
  role = "admin",
  sections,
  logo = Logo,
  isMinimized = false,
  isOpen = false,
  onClose,
}) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const sidebarConfig = getUserSidebarConfig(role);
  const resolvedSections = sections ?? sidebarConfig.sections;

  return (
    <aside
      className={`dark-readable-sidebar fixed md:relative inset-y-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col shrink-0 z-40 md:z-30 transition-all duration-300 ease-out will-change-transform select-none
        ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 overflow-hidden
        ${isMinimized ? "md:w-20" : "md:w-72"} w-72
      `}
    >
    {/* Header Container - Height matched to Navbar (h-18.25) */}
      <div
        className={`h-18.25 flex items-center border-b border-gray-200 px-5 transition-all duration-300 ease-in-out shrink-0 ${
          isMinimized
            ? "md:justify-center md:px-0"
            : "justify-start"
        }`}
      >
        <img
          src={logo}
          alt="GrainRise Logo"
          className={`object-contain transition-all duration-300 ease-in-out ${
            isMinimized ? "md:h-7 h-8" : "h-10 md:h-11 w-auto max-h-12"
          }`}
        />

        <button
          onClick={onClose}
          aria-label="Close sidebar"
          className="md:hidden ml-auto -mr-2 p-2 rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Role Banner for Retailer Panel */}
      {!isMinimized && role === "retailer" && (
        <div className="bg-gradient-to-r from-[#00580C] via-[#657B10] to-[#B8860B] px-5 py-2 text-white text-[11px] font-extrabold uppercase tracking-wider shadow-sm shrink-0">
          RETAILER PANEL
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {resolvedSections.map((section) => (
          <div key={section.title} className="mb-5">
            {/* Section Title */}
            <div
              className={`px-5 mb-1.5 transition-all duration-300 ease-in-out overflow-hidden ${
                isMinimized
                  ? "md:h-0 md:mb-0 md:opacity-0"
                  : "h-4 opacity-100"
              }`}
            >
              <p className="text-[11px] font-bold text-amber-500 tracking-wider uppercase whitespace-nowrap">
                {section.title}
              </p>
            </div>

            {/* Menu Items */}
            <div className="flex flex-col gap-1 px-3">
              {section.items.map((item) => {
                const Icon = item.icon;

                const isActive = currentPath === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    title={isMinimized ? item.label : ""}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${
                      isMinimized
                        ? "md:justify-center md:px-0"
                        : "justify-start"
                    } ${
                      isActive
                        ? "bg-[#0B5D1E] text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {Icon && (
                      <Icon
                        size={19}
                        className="shrink-0"
                      />
                    )}

                    <span
                      className={`whitespace-nowrap transition-all duration-300 ease-in-out ${
                        isMinimized
                          ? "md:w-0 md:opacity-0 overflow-hidden"
                          : "w-auto opacity-100"
                      }`}
                    >
                      {item.label}
                    </span>
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