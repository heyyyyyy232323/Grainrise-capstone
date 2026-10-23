import React, { useState } from "react";
import { Calendar, Search, Bell, X, CheckCircle2, AlertCircle } from "lucide-react";
import { INITIAL_WAREHOUSE_DRIVER_DATA } from "./WarehouseDriverMockData";
import WarehouseDriverHeader from "./WarehouseDriverHeader";
import WarehouseDriverKPICards from "./WarehouseDriverKPICards";
import WarehouseDriverActiveDutyCard from "./WarehouseDriverActiveDutyCard";
import WarehouseDriverLoadUtilization from "./WarehouseDriverLoadUtilization";
import WarehouseDriverDeliveryManagement from "./WarehouseDriverDeliveryManagement";
import WarehouseDriverBottomNav from "./WarehouseDriverBottomNav";
import WarehouseDriverDutiesView from "./WarehouseDriverDutiesView";
import WarehouseDriverMessagesView from "./WarehouseDriverMessagesView";
import WarehouseDriverPaymentsView from "./WarehouseDriverPaymentsView";
import WarehouseDriverMoreView from "./WarehouseDriverMoreView";
import WarehouseDriverDutyDetailsModal from "./WarehouseDriverDutyDetailsModal";
import WarehouseDriverLiveTrackingModal from "./WarehouseDriverLiveTrackingModal";

export default function WarehouseDriverApp({ onExternalNavigate }) {
  const [data, setData] = useState(INITIAL_WAREHOUSE_DRIVER_DATA);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) return tabParam;
    }
    return "dashboard";
  });
  const [selectedDuty, setSelectedDuty] = useState(null);
  const [isLiveTrackingOpen, setIsLiveTrackingOpen] = useState(false);
  const [isDutyDetailsOpen, setIsDutyDetailsOpen] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleOpenActiveDutyDetails = () => {
    setSelectedDuty(data.activeDuty);
    setIsDutyDetailsOpen(true);
  };

  const handleOpenLiveTracking = (duty) => {
    setSelectedDuty(duty || data.activeDuty);
    setIsLiveTrackingOpen(true);
  };

  const handleSelectQueueDuty = (duty) => {
    setSelectedDuty(duty);
    setIsDutyDetailsOpen(true);
  };

  const handleMarkDelivered = (duty) => {
    showToast(`Batch ${duty.batchNo} successfully marked as delivered!`);
    setData((prev) => ({
      ...prev,
      loadUtilization: {
        ...prev.loadUtilization,
        deliveredLoadKg: (prev.loadUtilization.deliveredLoadKg || 0) + 10.0,
      },
    }));
  };

  const handlePaymentRemitted = (remitInfo) => {
    showToast(`Payment of ₱${remitInfo.amount} remitted via ${remitInfo.method}!`);
    setData((prev) => ({
      ...prev,
      kpiMetrics: {
        ...prev.kpiMetrics,
        pending: {
          ...prev.kpiMetrics.pending,
          value: 0,
          subtext: "All collections remitted",
        },
      },
    }));
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900 relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. Top Header (Figma) ─────────────────────────────────── */}
      <WarehouseDriverHeader
          onSearchClick={() => setShowSearchModal(true)}
          onNotificationClick={() => setShowNotificationsModal(true)}
          onProfileClick={() => setActiveTab("more")}
          unreadNotifications={data.notifications.filter((n) => !n.read).length}
          userInitials={data.driverInfo.driverInitials}
        />

        {/* ── 2. Tab Views Content ──────────────────────────────────── */}
        <main className="flex-1 px-4 py-4 space-y-4 w-full pb-20">
          {activeTab === "dashboard" && (
            <>
              {/* Dashboard Title & Updated Timestamp matching Figma */}
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Dashboard
                </h1>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <Calendar size={13} className="text-slate-400" />
                  <span>{data.driverInfo.currentDate}</span>
                  <span>&bull;</span>
                  <span>{data.driverInfo.lastUpdated}</span>
                </div>
              </div>

              {/* 4 KPI Metric Cards (2x2 Grid) */}
              <WarehouseDriverKPICards
                metrics={data.kpiMetrics}
                onCardClick={(tab) => setActiveTab(tab)}
              />

              {/* Current Active Duty Card with Live GPS & CTA */}
              <WarehouseDriverActiveDutyCard
                activeDuty={data.activeDuty}
                onContinueTracking={() => handleOpenLiveTracking(data.activeDuty)}
                onViewDutyDetails={handleOpenActiveDutyDetails}
              />

              {/* Load Utilization Card with Progress Bar & 3 Metrics */}
              <WarehouseDriverLoadUtilization
                loadData={data.loadUtilization}
              />

              {/* Delivery Management Queue Cards */}
              <WarehouseDriverDeliveryManagement
                duties={data.assignedDutiesQueue}
                onSelectDuty={handleSelectQueueDuty}
                onViewAllDuties={() => setActiveTab("duties")}
              />
            </>
          )}

          {activeTab === "duties" && (
            <WarehouseDriverDutiesView
              dutiesData={data.myDutiesData}
              onSelectDuty={handleSelectQueueDuty}
              onStartTracking={handleOpenLiveTracking}
            />
          )}

          {activeTab === "messages" && (
            <WarehouseDriverMessagesView
              messages={data.messages}
              onStartTracking={handleOpenLiveTracking}
            />
          )}

          {activeTab === "payments" && (
            <WarehouseDriverPaymentsView
              paymentsData={data.paymentsSubmissionData}
              onPaymentSubmitted={handlePaymentRemitted}
            />
          )}

          {activeTab === "more" && (
            <WarehouseDriverMoreView
              driverInfo={data.driverInfo}
              onCloseToDashboard={() => setActiveTab("dashboard")}
              onLogout={() => {
                if (onExternalNavigate) onExternalNavigate("/login");
                else showToast("Logged out from driver session.");
              }}
            />
          )}
        </main>

        {/* ── 3. Bottom Navigation Bar matching Figma ───────────────── */}
        <WarehouseDriverBottomNav
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          unreadMessagesCount={data.kpiMetrics.unread.value}
          pendingPaymentsCount={data.kpiMetrics.pending.value}
        />

      {/* ── Interactive Modals ────────────────────────────────────────── */}
      {/* Duty Details Modal */}
      <WarehouseDriverDutyDetailsModal
        duty={selectedDuty}
        isOpen={isDutyDetailsOpen}
        onClose={() => setIsDutyDetailsOpen(false)}
        onStartTracking={handleOpenLiveTracking}
        onMarkDelivered={handleMarkDelivered}
      />

      {/* Live GPS Navigation Modal */}
      <WarehouseDriverLiveTrackingModal
        duty={selectedDuty || data.activeDuty}
        isOpen={isLiveTrackingOpen}
        onClose={() => setIsLiveTrackingOpen(false)}
        onArrived={handleMarkDelivered}
      />

      {/* Notifications Drawer Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-emerald-700" />
                <h3 className="text-sm font-extrabold text-slate-900">Notifications</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNotificationsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {data.notifications.map((n) => (
                <div
                  key={n.id}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">{n.title}</p>
                    <span className="text-[10px] text-slate-400 font-medium">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{n.desc}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                showToast("All notifications marked as read.");
                setShowNotificationsModal(false);
              }}
              className="w-full py-2.5 bg-[#0d5921] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#0b4b1c]"
            >
              Mark All as Read
            </button>
          </div>
        </div>
      )}

      {/* Quick Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 pt-16">
          <div className="bg-white rounded-3xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search duties, retailers, varieties..."
                className="w-full text-xs text-slate-800 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1.5 text-xs max-h-60 overflow-y-auto">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Quick Results
              </p>
              {data.assignedDutiesQueue
                .filter((d) =>
                  !searchKeyword ||
                  d.batchNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                  d.retailer.toLowerCase().includes(searchKeyword.toLowerCase())
                )
                .map((d) => (
                  <div
                    key={d.id}
                    onClick={() => {
                      setSelectedDuty(d);
                      setIsDutyDetailsOpen(true);
                      setShowSearchModal(false);
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{d.batchNo}</p>
                      <p className="text-[11px] text-slate-400">{d.retailer} &bull; {d.commodity}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      View
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
