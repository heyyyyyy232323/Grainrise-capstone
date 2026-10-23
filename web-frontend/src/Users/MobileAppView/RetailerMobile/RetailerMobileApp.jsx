import React, { useState } from "react";
import Toast from "../../../Components/Modals/Toast";
import { Plus, Calendar, X, Bell, Search, CheckCircle2, ShoppingBag } from "lucide-react";
import { INITIAL_RETAILER_DATA } from "./RetailerMobileMockData";
import RetailerMobileHeader from "./RetailerMobileHeader";
import RetailerMobileKPICards from "./RetailerMobileKPICards";
import RetailerMobileSalesTrend from "./RetailerMobileSalesTrend";
import RetailerMobileInventoryStatus from "./RetailerMobileInventoryStatus";
import RetailerMobileActiveOrders from "./RetailerMobileActiveOrders";
import RetailerMobileStockAttention from "./RetailerMobileStockAttention";
import RetailerMobilePendingActions from "./RetailerMobilePendingActions";
import RetailerMobileRecentActivity from "./RetailerMobileRecentActivity";
import RetailerMobileBottomNav from "./RetailerMobileBottomNav";
import RetailerMobilePosView from "./RetailerMobilePosView";
import RetailerMobileOrdersView from "./RetailerMobileOrdersView";
import RetailerMobileInventoryView from "./RetailerMobileInventoryView";
import RetailerMobileMoreView from "./RetailerMobileMoreView";
import RetailerMobileSalesHistoryView from "./RetailerMobileSalesHistoryView";
import RetailerMobilePurchasesView from "./RetailerMobilePurchasesView";
import RetailerMobileReturnsView from "./RetailerMobileReturnsView";
import RetailerMobileMessagesView from "./RetailerMobileMessagesView";

export default function RetailerMobileApp({ onExternalNavigate }) {
  const [data, setData] = useState(INITIAL_RETAILER_DATA);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) return tabParam;
    }
    return "dashboard";
  });
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Handler for "+ New Sale" quick completion
  const handleQuickSale = (productName, kg, pricePerKg) => {
    const totalAmount = kg * pricePerKg;
    const newSaleActivity = {
      id: `sale-${Date.now()}`,
      title: "Sale Completed",
      desc: `Receipt POS-2026-${Math.floor(1000 + Math.random() * 9000)} • ${productName} • ₱${totalAmount.toLocaleString()}`,
      time: "Just now",
      iconType: "check",
      iconBg: "bg-[#00875A]",
      highlightAmount: `₱${totalAmount.toLocaleString()}`,
    };

    setData((prev) => ({
      ...prev,
      recentActivities: [newSaleActivity, ...prev.recentActivities.slice(0, 4)],
    }));

    setShowNewSaleModal(false);
    showToast(`Successfully processed sale of ${kg}kg ${productName}!`);
  };

  return (
    <div className="flex flex-col min-h-full bg-[#f8fafc] text-gray-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Toast popup */}
      {toastMessage && (
        <Toast
          isOpen
          type="success"
          message={toastMessage}
          duration={3000}
          onClose={() => setToastMessage(null)}
          position="top-center"
        />
      )}

      {/* ── 1. Top App Bar ────────────────────────────────────────────── */}
      <RetailerMobileHeader
        onSearchClick={() => setShowSearchModal(true)}
        onNotificationClick={() => setShowNotificationsModal(true)}
        onProfileClick={() => setActiveTab("more")}
        unreadCount={2}
        userInitials={data.storeInfo.retailerInitials}
      />

      {/* ── Main View Content ────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-4 space-y-4 w-full pb-20">
        {activeTab === "dashboard" && (

          <>
            {/* ── Dashboard Header & New Sale CTA ─────────────────────── */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  Dashboard
                </h1>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                  <span className="inline-flex items-center gap-1 bg-white border border-gray-200/80 px-2 py-0.5 rounded-md text-[11px] font-semibold text-gray-700 shadow-2xs">
                    <Calendar size={11} className="text-gray-400" />
                    <span>{data.storeInfo.currentDate}</span>
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-[11px] font-medium text-gray-400">
                    Updated 10:42 AM
                  </span>
                </div>
              </div>

              {/* "+ New Sale" Button Matching Figma */}
              <button
                onClick={() => setShowNewSaleModal(true)}
                className="bg-[#00580C] hover:bg-[#004709] active:scale-95 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={14} strokeWidth={3} />
                <span>New Sale</span>
              </button>
            </div>

            {/* ── 4 KPI Metric Summary Cards (2x2 Grid) ───────────────── */}
            <RetailerMobileKPICards
              metrics={data.kpiMetrics}
              onCardClick={(metric) => {
                if (metric.id === "sales-today") setActiveTab("pos");
                else if (metric.id === "low-stock") setActiveTab("inventory");
                else if (metric.id === "active-orders") setActiveTab("orders");
                else if (metric.id === "returns-issues") setActiveTab("returns");
                else showToast(`Opening ${metric.title} records`);
              }}
            />

            {/* ── Sales Trend Graph Card ──────────────────────────────── */}
            <RetailerMobileSalesTrend
              salesData={data.salesTrend}
              onViewHistoryClick={() => {
                setActiveTab("sales-history");
              }}
            />

            {/* ── Inventory Status Donut Chart Card ───────────────────── */}
            <RetailerMobileInventoryStatus
              inventoryData={data.inventoryStatus}
              onViewInventoryClick={() => setActiveTab("inventory")}
            />

            {/* ── Active Orders List Card ─────────────────────────────── */}
            <RetailerMobileActiveOrders
              orders={data.activeOrders}
              onOrderClick={(ord) => showToast(`Selected ${ord.orderNo}`)}
              onViewAllClick={() => setActiveTab("orders")}
            />

            {/* ── Stock Attention Restock Alert Card ──────────────────── */}
            <RetailerMobileStockAttention
              items={data.stockAttention}
              onFindStockClick={(it) => {
                showToast(`Finding warehouse supplier for ${it.name}`);
                if (onExternalNavigate) onExternalNavigate("/retailer/warehouse-marketplace");
              }}
              onBrowseMarketplaceClick={() => {
                showToast("Opening Warehouse Marketplace...");
                if (onExternalNavigate) onExternalNavigate("/retailer/warehouse-marketplace");
              }}
            />

            {/* ── Pending Actions Cards ───────────────────────────────── */}
            <RetailerMobilePendingActions
              actions={data.pendingActions}
              onActionClick={(act) => {
                if (act.actionType === "inventory") setActiveTab("inventory");
                else if (act.actionType === "tracking") setActiveTab("orders");
                else if (act.actionType === "returns") setActiveTab("returns");
                else if (act.actionType === "messages") setActiveTab("messages");
                else showToast(`Action Triggered: ${act.actionText} on ${act.ref}`);
              }}
            />

            {/* ── Recent Activity Timeline Card ──────────────────────── */}
            <RetailerMobileRecentActivity
              activities={data.recentActivities}
              onViewHistoryClick={() => {
                setActiveTab("sales-history");
              }}
            />
          </>
        )}

        {/* Other Tabs */}
        {activeTab === "pos" && (
          <RetailerMobilePosView
            onCompleteSale={(amt) => {
              showToast(`Sale of ₱${amt.toLocaleString()} recorded successfully!`);
              setActiveTab("dashboard");
            }}
          />
        )}

        {activeTab === "orders" && (
          <RetailerMobileOrdersView orders={data.activeOrders} />
        )}

        {activeTab === "inventory" && (
          <RetailerMobileInventoryView
            onRestockClick={() => {
              if (onExternalNavigate) {
                showToast("Opening Warehouse Marketplace...");
                onExternalNavigate("/retailer/warehouse-marketplace");
              } else {
                showToast("Marketplace is available in the web app.");
              }
            }}
          />
        )}

        {activeTab === "more" && (
          <RetailerMobileMoreView
            userInitials={data.storeInfo.retailerInitials}
            userName={data.storeInfo.retailerName}
            onClose={() => setActiveTab("dashboard")}
            onNavigate={(id) => {
              if (id === "close") {
                setActiveTab("dashboard");
                return;
              }
              if (id === "sales-history") {
                setActiveTab("sales-history");
                return;
              }
              if (id === "purchases") {
                setActiveTab("purchases");
                return;
              }
              if (id === "returns") {
                setActiveTab("returns");
                return;
              }
              if (id === "messages") {
                setActiveTab("messages");
                return;
              }
              if (onExternalNavigate) {
                showToast(`Navigating to ${id}...`);
                if (id === "marketplace") onExternalNavigate("/retailer/warehouse-marketplace");
                else if (id === "news") onExternalNavigate("/retailer/news-updates");
                else if (id === "profile") onExternalNavigate("/retailer/profile");
              } else {
                showToast(`"${id}" is available in the web app.`);
              }
            }}
          />
        )}

        {activeTab === "sales-history" && (
          <RetailerMobileSalesHistoryView
            onBack={() => setActiveTab("more")}
          />
        )}

        {activeTab === "purchases" && (
          <RetailerMobilePurchasesView
            onBack={() => setActiveTab("more")}
          />
        )}

        {activeTab === "returns" && (
          <RetailerMobileReturnsView
            onBack={() => setActiveTab("more")}
          />
        )}

        {activeTab === "messages" && (
          <RetailerMobileMessagesView
            onBack={() => setActiveTab("more")}
          />
        )}
      </main>

      {/* ── 5-Tab Sticky Bottom Navigation Bar ────────────────────────── */}
      <RetailerMobileBottomNav
        activeTab={
          activeTab === "sales-history" ||
          activeTab === "purchases" ||
          activeTab === "returns" ||
          activeTab === "messages"
            ? "more"
            : activeTab
        }
        onTabChange={(tabId) => setActiveTab(tabId)}
      />

      {/* ── Interactive Modal: New Sale Quick Dialog ─────────────────── */}
      {showNewSaleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#00580C] flex items-center justify-center">
                  <ShoppingBag size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Quick New Sale</h3>
                  <p className="text-[11px] text-gray-500">Record an instant in-store sale</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewSaleModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 my-4">
              <p className="text-xs font-bold text-gray-700">Select Rice Variant:</p>
              {[
                { name: "Dinorado Premium", price: 55, kg: 25 },
                { name: "Sinandomeng Regular", price: 48, kg: 50 },
                { name: "Jasmine Fragrant", price: 62, kg: 25 },
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickSale(p.name, p.kg, p.price)}
                  className="w-full p-3 rounded-xl border border-gray-200 hover:border-[#00580C] hover:bg-emerald-50/40 transition-all flex items-center justify-between text-left cursor-pointer active:scale-98"
                >
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">{p.name}</span>
                    <span className="text-[11px] text-gray-500">{p.kg} kg sack · ₱{p.price}/kg</span>
                  </div>
                  <span className="text-xs font-extrabold text-[#00580C]">
                    ₱{(p.kg * p.price).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowNewSaleModal(false);
                setActiveTab("pos");
              }}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors text-center cursor-pointer"
            >
              Open Full POS Terminal &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ── Interactive Modal: Notifications Drawer ───────────────────── */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Bell size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Notifications</h3>
                  <p className="text-[11px] text-gray-500">2 unread warehouse updates</p>
                </div>
              </div>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2.5 my-4">
              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Fulfillment Update</span>
                <p className="text-xs font-bold text-gray-900 mt-0.5">ORD-2026-0021 Preparing for Delivery</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Warehouse ABC has packed 500 kg Dinorado</p>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl">
                <span className="text-[10px] font-bold text-blue-800 uppercase">Warehouse Message</span>
                <p className="text-xs font-bold text-gray-900 mt-0.5">Warehouse ABC sent a message</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Regarding invoice verification for batch 2026-0021</p>
              </div>
            </div>

            <button
              onClick={() => setShowNotificationsModal(false)}
              className="w-full py-2 bg-[#00580C] text-white text-xs font-bold rounded-xl text-center cursor-pointer"
            >
              Mark All as Read
            </button>
          </div>
        </div>
      )}

      {/* ── Interactive Modal: Global Search Overlay ─────────────────── */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center p-4 pt-12">
          <div className="bg-white rounded-2xl w-full max-w-sm p-4 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Search size={16} className="text-[#00580C]" />
              <input
                type="text"
                autoFocus
                placeholder="Search orders, stock, activity..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="flex-1 text-xs text-gray-900 placeholder-gray-400 outline-none"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-xs font-bold text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="py-4 text-xs text-gray-500 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick Suggestions</p>
              {["Dinorado Special", "Sinandomeng", "WR-2026-021", "Warehouse ABC"].map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSearchKeyword(s);
                    showToast(`Searching for: ${s}`);
                    setShowSearchModal(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-100 font-medium text-gray-800 transition-colors cursor-pointer"
                >
                  🔍 {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
