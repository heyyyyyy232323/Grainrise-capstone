import React, { useState } from "react";
import { Calendar, Search, Bell, X, CheckCircle2, AlertCircle } from "lucide-react";
import { INITIAL_MILLER_DRIVER_DATA } from "./MillerDriverMockData";
import MillerDriverHeader from "./MillerDriverHeader";
import MillerDriverKPICards from "./MillerDriverKPICards";
import MillerDriverActiveDutyCard from "./MillerDriverActiveDutyCard";
import MillerDriverLoadUtilization from "./MillerDriverLoadUtilization";
import MillerDriverDeliveryManagement from "./MillerDriverDeliveryManagement";
import MillerDriverBottomNav from "./MillerDriverBottomNav";
import MillerDriverDutiesView from "./MillerDriverDutiesView";
import MillerDriverMessagesView from "./MillerDriverMessagesView";
import MillerDriverPaymentsView from "./MillerDriverPaymentsView";
import MillerDriverMoreView from "./MillerDriverMoreView";
import MillerDriverDutyDetailsModal from "./MillerDriverDutyDetailsModal";
import MillerDriverLiveTrackingModal from "./MillerDriverLiveTrackingModal";

export default function MillerDriverApp({ onExternalNavigate }) {
  const [data, setData] = useState(INITIAL_MILLER_DRIVER_DATA);
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
      <MillerDriverHeader
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
            <MillerDriverKPICards
              metrics={data.kpiMetrics}
              onCardClick={(tab) => setActiveTab(tab)}
            />

            {/* Current Active Duty Card with Live GPS & CTA */}
            <MillerDriverActiveDutyCard
              activeDuty={data.activeDuty}
              onContinueTracking={() => handleOpenLiveTracking(data.activeDuty)}
              onViewDutyDetails={handleOpenActiveDutyDetails}
            />

            {/* Load Utilization Card with Progress Bar & 3 Metrics */}
            <MillerDriverLoadUtilization
              loadData={data.loadUtilization}
            />

            {/* Delivery Management Queue Cards */}
            <MillerDriverDeliveryManagement
              duties={data.assignedDutiesQueue}
              onSelectDuty={handleSelectQueueDuty}
              onViewAllDuties={() => setActiveTab("duties")}
            />
          </>
        )}

        {activeTab === "duties" && (
          <MillerDriverDutiesView
            dutiesData={data.myDutiesData}
            onSelectDuty={handleSelectQueueDuty}
            onStartTracking={handleOpenLiveTracking}
          />
        )}

        {activeTab === "messages" && (
          <MillerDriverMessagesView
            messages={data.messages}
            onStartTracking={handleOpenLiveTracking}
          />
        )}

        {activeTab === "payments" && (
          <MillerDriverPaymentsView
            paymentsData={data.paymentsSubmissionData}
            onPaymentSubmitted={handlePaymentRemitted}
          />
        )}

        {activeTab === "more" && (
          <MillerDriverMoreView
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
      <MillerDriverBottomNav
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId)}
        unreadMessagesCount={data.messages.filter((m) => m.unreadCount > 0).length}
      />

      {/* ── 4. Modals ─────────────────────────────────────────────── */}
      {/* Duty Details Modal */}
      <MillerDriverDutyDetailsModal
        isOpen={isDutyDetailsOpen}
        duty={selectedDuty}
        onClose={() => setIsDutyDetailsOpen(false)}
        onStartTracking={handleOpenLiveTracking}
      />

      {/* Live GPS Tracking Modal */}
      <MillerDriverLiveTrackingModal
        isOpen={isLiveTrackingOpen}
        duty={selectedDuty}
        onClose={() => setIsLiveTrackingOpen(false)}
        onDeliveredSuccess={handleMarkDelivered}
      />

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[#0d5921]" />
                <h3 className="text-sm font-black text-slate-900">Notifications</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNotificationsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {data.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    n.read ? "bg-white border-slate-100" : "bg-emerald-50/50 border-emerald-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">{n.title}</span>
                    <span className="text-[10px] text-slate-400">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{n.desc}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setData((prev) => ({
                  ...prev,
                  notifications: prev.notifications.map((n) => ({ ...n, read: true })),
                }));
                showToast("All notifications marked as read");
                setShowNotificationsModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-[#0d5921] text-white text-xs font-bold hover:bg-[#0a461a] transition-all cursor-pointer shadow-xs"
            >
              Mark All as Read
            </button>
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 pt-16">
          <div className="bg-white rounded-3xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="flex items-center gap-2">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search duties, batches, retailers..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full text-xs font-bold text-slate-800 outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchKeyword("");
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="border-t border-slate-100 pt-2 space-y-1.5 text-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Results
              </p>
              {data.assignedDutiesQueue
                .filter(
                  (d) =>
                    !searchKeyword ||
                    d.batchNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                    d.retailer.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                    d.commodity.toLowerCase().includes(searchKeyword.toLowerCase())
                )
                .slice(0, 4)
                .map((d) => (
                  <div
                    key={d.id}
                    onClick={() => {
                      setSelectedDuty(d);
                      setIsDutyDetailsOpen(true);
                      setShowSearchModal(false);
                    }}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{d.batchNo}</p>
                      <p className="text-[10px] text-slate-500">
                        {d.retailer} &bull; {d.commodity}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#0d5921]">View &rarr;</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
