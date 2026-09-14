import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
  Truck,
  RotateCcw,
  X,
  Check,
  MapPin,
  Phone,
  MessageSquare,
  FileText,
  AlertCircle,
  HelpCircle,
  Package,
  CheckCircle2,
  Download,
  Star,
  Building2,
  Navigation,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ConsumerNavbar from "../../Components/Major-Components/ConsumerNavbar";

// ============================================================
// MOCK DATA — ACTIVE ORDERS
// ============================================================
const ACTIVE_ORDERS_DATA = [
  {
    id: "ORD-2026-0184",
    orderNumber: "ORD-2026-0184",
    placedDate: "Sep 7, 2026",
    estArrival: "Today, 1:00 PM – 3:00 PM",
    status: "out_for_delivery",
    statusLabel: "Out for Delivery",
    statusTheme: "amber",
    productName: "Premium Dinorado Rice",
    varietyDisplay: "DINORADO",
    weightDisplay: "25 KG",
    theme: "dinorado",
    seller: "Greenfield Rice Store",
    sellerLocation: "Caloocan City",
    sellerType: "Retailer",
    packageInfo: "Package: 25 kg sack × 1 bag • Delivery to Bagong Silang, Caloocan City",
    price: 1850.0,
    priceFormatted: "₱1,850.00",
    paymentMethod: "GCash",
    paymentStatus: "Paid",
    paymentType: "paid",
    courierHeader: "COURIER ASSIGNED",
    courierName: "Mario D. • Greenfield Express",
    courierSub: "Plate: NBD-4821 (Motorcycle)",
    courierPhone: "+63 917 555 3821",
    canLiveTrack: true,
    canCancel: false,
    progressPercent: 90,
    timelineSteps: [
      { key: "placed", label: "Order Placed", time: "Sep 7, 9:42 AM", completed: true, active: false },
      { key: "confirmed", label: "Confirmed", time: "Sep 7, 9:50 AM", completed: true, active: false },
      { key: "processing", label: "Processing", time: "Sep 7, 10:24 AM", completed: true, active: false },
      { key: "transit", label: "In Transit", time: "Sep 7, 4:30 PM", completed: true, active: false },
      { key: "out_for_delivery", label: "Out for Delivery", time: "Today, 8:15 AM", completed: false, active: true, activeColor: "text-amber-600" },
    ],
    trackingLogs: [
      { time: "8:15 AM", title: "Rider out for delivery", desc: "Rider Mario D. is en route to Bagong Silang with your parcel." },
      { time: "7:30 AM", title: "Arrived at Local Hub", desc: "Package scanned at Caloocan North Hub." },
      { time: "4:30 PM (Yesterday)", title: "Departed Sorting Center", desc: "In transit to delivery hub." },
      { time: "10:24 AM (Yesterday)", title: "Order Processed", desc: "Packed and sealed at Greenfield Rice Store warehouse." },
    ],
  },
  {
    id: "ORD-2026-0181",
    orderNumber: "ORD-2026-0181",
    placedDate: "Sep 7, 2026",
    estArrival: "Tomorrow, Sep 8, 2026",
    status: "in_transit",
    statusLabel: "In Transit",
    statusTheme: "purple",
    productName: "NSIC Rc 222 Rice",
    varietyDisplay: "RC 222",
    weightDisplay: "50 KG",
    theme: "rc222",
    seller: "Bulacan Rice Hub",
    sellerLocation: "Bulacan",
    sellerType: "Miller / Supplier",
    packageInfo: "Package: 50 kg sack × 1 bag • Delivery to Bagong Silang, Caloocan City",
    price: 2450.0,
    priceFormatted: "₱2,450.00",
    paymentMethod: "Cash on Delivery (COD)",
    paymentStatus: "Pending",
    paymentType: "cod",
    courierHeader: "LOGISTICS PARTNER",
    courierName: "Bulacan Agri-Freight Truck #3",
    courierSub: "Waybill: BAF-89201-MNL",
    courierPhone: "+63 928 444 8920",
    canLiveTrack: false,
    canCancel: false,
    progressPercent: 70,
    timelineSteps: [
      { key: "placed", label: "Placed", time: "Sep 7, 11:15 AM", completed: true, active: false },
      { key: "confirmed", label: "Confirmed", time: "Sep 7, 1:20 PM", completed: true, active: false },
      { key: "processing", label: "Processing", time: "Sep 7, 3:10 PM", completed: true, active: false },
      { key: "transit", label: "In Transit", time: "Sep 7, 7:45 PM", completed: false, active: true, activeColor: "text-purple-600" },
      { key: "out_for_delivery", label: "Out for Delivery", time: "--", completed: false, active: false },
    ],
    trackingLogs: [
      { time: "7:45 PM", title: "Departed Origin Terminal", desc: "Bulacan Agri-Freight Truck #3 en route to Metro Manila Hub." },
      { time: "3:10 PM", title: "Loaded onto Freight Truck", desc: "Waybill generated and verified at Bulacan Milling." },
      { time: "1:20 PM", title: "Order Confirmed by Miller", desc: "Reserved from Batch RC-222-09." },
    ],
  },
  {
    id: "ORD-2026-0178",
    orderNumber: "ORD-2026-0178",
    placedDate: "Sep 6, 2026",
    estArrival: "Sep 10, 2026",
    status: "processing",
    statusLabel: "Processing",
    statusTheme: "blue",
    productName: "Sinandomeng Rice (Well-Milled)",
    varietyDisplay: "SINANDOMENG",
    weightDisplay: "25 KG",
    theme: "sinandomeng",
    seller: "GrainMart",
    sellerLocation: "Quezon City",
    sellerType: "Retailer",
    packageInfo: "Package: 25 kg sack × 1 bag • Delivery to Bagong Silang, Caloocan City",
    price: 1300.0,
    priceFormatted: "₱1,300.00",
    paymentMethod: "GCash",
    paymentStatus: "Paid",
    paymentType: "paid",
    courierHeader: "ORDER STATUS",
    courierName: "Packaging at GrainMart Warehouse",
    courierSub: "Preparing for logistics pickup",
    courierPhone: "+63 919 123 4567",
    canLiveTrack: false,
    canCancel: true,
    progressPercent: 48,
    timelineSteps: [
      { key: "placed", label: "Placed", time: "Sep 6, 3:40 PM", completed: true, active: false },
      { key: "confirmed", label: "Confirmed", time: "Sep 6, 4:00 PM", completed: true, active: false },
      { key: "processing", label: "Processing", time: "Sep 7, 9:00 AM", completed: false, active: true, activeColor: "text-blue-600" },
      { key: "transit", label: "In Transit", time: "--", completed: false, active: false },
      { key: "out_for_delivery", label: "Out for Delivery", time: "--", completed: false, active: false },
    ],
    trackingLogs: [
      { time: "9:00 AM", title: "Warehouse Packing", desc: "Warehouse staff weighing and packaging 25kg Sinandomeng." },
      { time: "4:00 PM (Sep 6)", title: "Payment Verified", desc: "GCash reference ref# 908124 verified." },
    ],
  },
  {
    id: "ORD-2026-0177",
    orderNumber: "ORD-2026-0177",
    placedDate: "Sep 6, 2026",
    estArrival: "Sep 11, 2026",
    status: "confirmed",
    statusLabel: "Order Confirmed",
    statusTheme: "emerald",
    productName: "Premium Jasmine Rice (Special Fragrant)",
    varietyDisplay: "JASMINE",
    weightDisplay: "25 KG",
    theme: "jasmine",
    seller: "North Caloocan Rice Store",
    sellerLocation: "Caloocan City",
    sellerType: "Retailer",
    packageInfo: "Package: 25 kg sack × 1 bag • Delivery to Bagong Silang, Caloocan City",
    price: 1520.0,
    priceFormatted: "₱1,520.00",
    paymentMethod: "GCash",
    paymentStatus: "Paid",
    paymentType: "paid",
    courierHeader: "STORE NOTE",
    courierName: "Order accepted by Merchant",
    courierSub: "Awaiting logistics slot allocation",
    courierPhone: "+63 920 987 6543",
    canLiveTrack: false,
    canCancel: true,
    progressPercent: 25,
    timelineSteps: [
      { key: "placed", label: "Placed", time: "Sep 6, 5:10 PM", completed: true, active: false },
      { key: "confirmed", label: "Confirmed", time: "Sep 6, 5:45 PM", completed: false, active: true, activeColor: "text-emerald-700" },
      { key: "processing", label: "Processing", time: "--", completed: false, active: false },
      { key: "transit", label: "In Transit", time: "--", completed: false, active: false },
      { key: "out_for_delivery", label: "Out for Delivery", time: "--", completed: false, active: false },
    ],
    trackingLogs: [
      { time: "5:45 PM (Sep 6)", title: "Order Accepted", desc: "Merchant accepted order and confirmed stock allocation." },
      { time: "5:10 PM (Sep 6)", title: "Order Placed", desc: "Order received through GrainRise Marketplace." },
    ],
  },
];

// ============================================================
// MOCK DATA — PURCHASE HISTORY (TABLE FORMAT)
// ============================================================
const ALL_HISTORY_DATA = [
  {
    id: "ORD-2026-0168",
    orderNumber: "ORD-2026-0168",
    placedDate: "Sep 4, 2026",
    placedTime: "2:15 PM",
    isNew: true,
    retailer: "GrainMart",
    retailerCity: "Quezon City",
    productName: "Sinandomeng Rice",
    productSpec: "Well-Milled Grade • 20 kg sack",
    theme: "sinandomeng",
    qty: "1 sack (20 kg)",
    totalAmount: "₱980.00",
    paymentLabel: "Paid (GCash)",
    paymentTheme: "green",
    orderStatus: "Delivered",
    orderStatusSub: "Delivered Sep 5",
    orderStatusTheme: "emerald",
    hasReview: true,
    reviewScore: 4.8,
    canBuyAgain: true,
  },
  {
    id: "ORD-2026-0162",
    orderNumber: "ORD-2026-0162",
    placedDate: "Sep 2, 2026",
    placedTime: "10:40 AM",
    isNew: false,
    retailer: "North Caloocan Rice Store",
    retailerCity: "Caloocan City",
    productName: "Premium Jasmine Rice",
    productSpec: "Special Fragrant • 25 kg sack",
    theme: "jasmine",
    qty: "1 sack (25 kg)",
    totalAmount: "₱1,725.00",
    paymentLabel: "Paid (GCash)",
    paymentTheme: "green",
    orderStatus: "Delivered",
    orderStatusSub: "Delivered Sep 3",
    orderStatusTheme: "emerald",
    hasReview: false,
    canBuyAgain: true,
  },
  {
    id: "ORD-2026-0158",
    orderNumber: "ORD-2026-0158",
    placedDate: "Aug 30, 2026",
    placedTime: "5:12 PM",
    isNew: false,
    retailer: "Baliwag Rice Center",
    retailerCity: "Bulacan Hub",
    productName: "Well-Milled Rice",
    productSpec: "Household Grade • 10 kg sack",
    theme: "rc222",
    qty: "1 sack (10 kg)",
    totalAmount: "₱620.00",
    paymentLabel: "COD (Paid)",
    paymentTheme: "amber",
    orderStatus: "Delivered",
    orderStatusSub: "Delivered Sep 1",
    orderStatusTheme: "emerald",
    hasReview: false,
    canBuyAgain: true,
  },
  {
    id: "ORD-2026-0149",
    orderNumber: "ORD-2026-0149",
    placedDate: "Aug 29, 2026",
    placedTime: "9:50 AM",
    isNew: false,
    retailer: "Greenfield Rice Store",
    retailerCity: "Caloocan City",
    productName: "Premium Dinorado Rice",
    productSpec: "Dinorado Grade • 25 kg sack",
    theme: "dinorado",
    qty: "1 sack (25 kg)",
    totalAmount: "₱1,450.00",
    paymentLabel: "Refunded",
    paymentTheme: "red",
    orderStatus: "Refunded",
    orderStatusSub: "Full Refund Issued",
    orderStatusTheme: "red",
    hasReview: false,
    canBuyAgain: false,
    isRefunded: true,
  },
  {
    id: "ORD-2026-0140",
    orderNumber: "ORD-2026-0140",
    placedDate: "Aug 27, 2026",
    placedTime: "1:16 PM",
    isNew: false,
    retailer: "Bulacan Rice Hub",
    retailerCity: "Bulacan • Miller Supp...",
    productName: "NSIC Rc 222 Rice",
    productSpec: "Commercial Grade • 50 kg sack",
    theme: "rc222",
    qty: "1 sack (50 kg)",
    totalAmount: "₱2,450.00",
    paymentLabel: "Paid",
    paymentTheme: "green",
    orderStatus: "Received & Exchanged",
    orderStatusSub: "",
    orderStatusTheme: "amber",
    hasReview: false,
    canBuyAgain: false,
    isExchanged: true,
  },
  {
    id: "ORD-2026-0135",
    orderNumber: "ORD-2026-0135",
    placedDate: "Aug 14, 2026",
    placedTime: "9:08 AM",
    isNew: false,
    retailer: "GrainMart",
    retailerCity: "Quezon City",
    productName: "Sinandomeng Rice",
    productSpec: "Premium Milled • 25 kg sack",
    theme: "sinandomeng",
    qty: "2 sacks (50 kg total)",
    totalAmount: "₱2,800.00",
    paymentLabel: "Paid (GCash)",
    paymentTheme: "green",
    orderStatus: "Delivered",
    orderStatusSub: "Delivered Aug 9",
    orderStatusTheme: "emerald",
    hasReview: true,
    reviewScore: 5.0,
    canBuyAgain: true,
  },
];

// ============================================================
// SACK MINI GRAPHIC
// ============================================================
function SackMini({ theme = "sinandomeng" }) {
  const themes = {
    dinorado:   { bg: "bg-[#FEF3C7]", border: "border-[#FCD34D]", bar: "bg-[#D97706]", text: "text-[#92400E]", label: "DIN" },
    rc222:      { bg: "bg-[#F1F5F9]", border: "border-[#CBD5E1]", bar: "bg-[#64748B]", text: "text-[#334155]", label: "RC2" },
    sinandomeng:{ bg: "bg-[#F0FDF4]", border: "border-[#BBF7D0]", bar: "bg-[#00580C]", text: "text-[#00580C]", label: "SIN" },
    jasmine:    { bg: "bg-[#F0F9FF]", border: "border-[#BAE6FD]", bar: "bg-[#0284C7]", text: "text-[#0284C7]", label: "JAS" },
    wm_rice:    { bg: "bg-[#F5F3FF]", border: "border-[#DDD6FE]", bar: "bg-[#7C3AED]", text: "text-[#5B21B6]", label: "WM" },
  };
  const s = themes[theme] || themes.sinandomeng;
  return (
    <div className={`w-10 h-12 rounded border flex flex-col items-center justify-between p-1 shrink-0 ${s.bg} ${s.border}`}>
      <div className="w-5 h-px border-t border-dashed border-black/20" />
      <span className={`text-[7px] font-black tracking-wider uppercase ${s.text}`}>{s.label}</span>
      <div className={`w-5 h-0.5 rounded-full ${s.bar}`} />
      <div className="w-5 h-px border-b border-dashed border-black/20" />
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ConsumerOrders() {
  const navigate = useNavigate();

  // ── Tab ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("active");

  // ── Active Orders filters ─────────────────────────────────
  const [activeSearch, setActiveSearch] = useState("");
  const [activeRetailer, setActiveRetailer] = useState("All Retailers");
  const [activeStatus, setActiveStatus] = useState("All Statuses");
  const [activeSort, setActiveSort] = useState("Soonest Delivery");

  // ── History filters ───────────────────────────────────────
  const [histSearch, setHistSearch] = useState("");
  const [histYear, setHistYear] = useState("All");
  const [histMonth, setHistMonth] = useState("All");
  const [histStatus, setHistStatus] = useState("All");
  const [histPayment, setHistPayment] = useState("All");
  const [histRetailer, setHistRetailer] = useState("All Retailers");
  const [histSort, setHistSort] = useState("Newest First");
  const [histPage, setHistPage] = useState(1);
  const HIST_PAGE_SIZE = 6;

  // ── Modals ────────────────────────────────────────────────
  const [trackModal, setTrackModal] = useState(null);
  const [detailsModal, setDetailsModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [contactModal, setContactModal] = useState(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  // ── Active orders (filtered) ──────────────────────────────
  const filteredActive = useMemo(() => {
    return ACTIVE_ORDERS_DATA.filter((o) => {
      if (activeSearch.trim()) {
        const q = activeSearch.toLowerCase();
        if (![o.orderNumber, o.productName, o.seller, o.varietyDisplay].some(v => v.toLowerCase().includes(q))) return false;
      }
      if (activeRetailer !== "All Retailers" && !o.seller.toLowerCase().includes(activeRetailer.toLowerCase())) return false;
      if (activeStatus !== "All Statuses" && o.statusLabel.toLowerCase() !== activeStatus.toLowerCase()) return false;
      return true;
    });
  }, [activeSearch, activeRetailer, activeStatus]);

  // ── History (filtered + paginated) ───────────────────────
  const filteredHistory = useMemo(() => {
    return ALL_HISTORY_DATA.filter((o) => {
      if (histSearch.trim()) {
        const q = histSearch.toLowerCase();
        if (![o.orderNumber, o.productName, o.retailer].some(v => v.toLowerCase().includes(q))) return false;
      }
      if (histStatus !== "All" && o.orderStatus.toLowerCase() !== histStatus.toLowerCase()) return false;
      if (histPayment !== "All") {
        const pm = histPayment.toLowerCase();
        if (!o.paymentLabel.toLowerCase().includes(pm)) return false;
      }
      if (histRetailer !== "All Retailers" && !o.retailer.toLowerCase().includes(histRetailer.toLowerCase())) return false;
      return true;
    });
  }, [histSearch, histYear, histMonth, histStatus, histPayment, histRetailer]);

  const totalPages = Math.ceil(filteredHistory.length / HIST_PAGE_SIZE);
  const pagedHistory = filteredHistory.slice((histPage - 1) * HIST_PAGE_SIZE, histPage * HIST_PAGE_SIZE);

  const resetHistFilters = () => {
    setHistSearch(""); setHistYear("All"); setHistMonth("All");
    setHistStatus("All"); setHistPayment("All"); setHistRetailer("All Retailers");
    setHistSort("Newest First"); setHistPage(1);
  };

  // ── Status pill styles ────────────────────────────────────
  const activePillStyles = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-[#00580C] border-emerald-200",
  };
  const activeDotStyles = {
    amber: "bg-amber-500", purple: "bg-purple-500",
    blue: "bg-blue-500", emerald: "bg-[#00580C]",
  };

  return (
    <div className="consumer-page min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-gray-800 antialiased">
      <ConsumerNavbar activePath="/consumer/orders" />

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-2 select-none">
          <span className="hover:text-gray-600 cursor-pointer" onClick={() => navigate("/consumer/home")}>Orders</span>
          <span>&gt;</span>
          <span className="font-semibold text-[#00580C]">
            {activeTab === "active" ? "Active Orders" : "Purchase History"}
          </span>
        </div>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">My Orders</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Track active purchases and review your previous GrainRise orders.
            </p>
          </div>
          <button
            onClick={() => setSupportOpen(true)}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 transition shadow-2xs cursor-pointer"
          >
            <HelpCircle size={14} className="text-emerald-700" />
            Need Help? <span className="font-bold text-[#00580C]">Contact Support</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-gray-200 mb-5 select-none">
          {[
            { key: "active", label: "Active Orders", count: "4" },
            { key: "history", label: "Purchase History", count: "18" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 relative transition cursor-pointer ${
                activeTab === tab.key ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
              <span className={`px-1.5 rounded-full text-[11px] font-bold ${
                activeTab === tab.key ? "bg-emerald-100 text-[#00580C]" : "bg-gray-100 text-gray-500"
              }`}>{tab.count}</span>
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00580C] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════
            TAB 1: ACTIVE ORDERS
        ══════════════════════════════════════════════ */}
        {activeTab === "active" && (
          <>
            {/* Filter row */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 mb-5 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={activeSearch}
                  onChange={(e) => setActiveSearch(e.target.value)}
                  placeholder="Search order number, product, or retailer..."
                  className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:border-[#00580C] focus:ring-1 focus:ring-[#00580C] shadow-2xs transition"
                />
                {activeSearch && (
                  <button
                    type="button"
                    onClick={() => setActiveSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {[
                  { val: activeRetailer, set: setActiveRetailer, opts: ["All Retailers","Greenfield Rice Store","Bulacan Rice Hub","GrainMart","North Caloocan Rice Store"], prefix: "Retailer: " },
                  { val: activeStatus, set: setActiveStatus, opts: ["All Statuses","Out for Delivery","In Transit","Processing","Order Confirmed"], prefix: "Status: " },
                  { val: activeSort, set: setActiveSort, opts: ["Soonest Delivery","Latest Placed","Highest Total"], prefix: "Sort: " },
                ].map((f, i) => (
                  <div key={i} className="relative">
                    <select
                      value={f.val}
                      onChange={(e) => f.set(e.target.value)}
                      className="appearance-none bg-white border border-gray-200 rounded-xl pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 hover:border-gray-300 focus:border-[#00580C] focus:ring-1 focus:ring-[#00580C] outline-none shadow-2xs cursor-pointer transition"
                    >
                      {f.opts.map((o) => (
                        <option key={o} value={o}>
                          {i < 2 ? f.prefix : ""}{o}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setActiveSearch("");
                    setActiveRetailer("All Retailers");
                    setActiveStatus("All Statuses");
                    setActiveSort("Soonest Delivery");
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#00580C] hover:bg-emerald-50/60 px-3 py-2.5 rounded-xl transition cursor-pointer"
                >
                  <RotateCcw size={13} />
                  Reset
                </button>
              </div>
            </div>

            {/* Order cards */}
            <div className="space-y-4">
              {filteredActive.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                  <Package size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-700">No active orders found</p>
                  <p className="text-xs text-gray-400 mt-1">Adjust your filters or search term.</p>
                </div>
              ) : filteredActive.map((order) => (
                <div key={order.id} className="bg-white border border-gray-200 rounded-2xl shadow-2xs hover:shadow-sm transition p-4 sm:p-5">
                  {/* Top row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-extrabold text-gray-900 text-sm">{order.orderNumber}</span>
                      <span className="text-gray-400">Placed on {order.placedDate}</span>
                      <span className="text-gray-700 font-semibold">
                        Est. Arrival: <span className="font-bold text-gray-900">{order.estArrival}</span>
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${activePillStyles[order.statusTheme]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${activeDotStyles[order.statusTheme]}`} />
                      {order.statusLabel}
                    </span>
                  </div>

                  {/* Product row */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 py-4 items-start">
                    <div className="lg:col-span-7 flex items-start gap-3.5">
                      <SackMini theme={order.theme} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-gray-900 text-sm sm:text-base">{order.productName}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.seller} • {order.sellerLocation} • <span className="text-gray-400">{order.sellerType}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{order.packageInfo}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-black text-gray-900 text-sm sm:text-base">{order.priceFormatted}</span>
                          {order.paymentType === "paid"
                            ? <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{order.paymentMethod} • {order.paymentStatus}</span>
                            : <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">{order.paymentMethod}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 flex flex-col items-start lg:items-end justify-between gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100">
                      <div className="text-left lg:text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{order.courierHeader}</p>
                        <p className="text-xs font-bold text-gray-900 mt-0.5">{order.courierName}</p>
                        <p className="text-[11px] text-gray-500">{order.courierSub}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => setTrackModal(order)}
                          className="px-3.5 py-1.5 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer">
                          {order.canLiveTrack ? <><Truck size={13} /> Live Track Order</> : "Track Order"}
                        </button>
                        <button onClick={() => setDetailsModal(order)}
                          className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg transition cursor-pointer">
                          View Details
                        </button>
                        {order.canCancel
                          ? <button onClick={() => setCancelModal(order)} className="text-xs font-semibold text-gray-400 hover:text-red-600 transition cursor-pointer px-1">Cancel Order</button>
                          : <button onClick={() => setContactModal(order)} className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition cursor-pointer px-1">Contact Retailer</button>}
                      </div>
                    </div>
                  </div>

                  {/* Progress timeline */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-[#00580C] rounded-full transition-all duration-500" style={{ width: `${order.progressPercent}%` }} />
                    </div>
                    <div className="grid grid-cols-5 text-center text-[9px] sm:text-[10px]">
                      {order.timelineSteps.map((step) => (
                        <div key={step.key} className="flex flex-col items-center gap-0.5">
                          {step.completed
                            ? <span className="font-bold text-[#00580C]">✓ {step.label}</span>
                            : step.active
                              ? <span className={`font-bold flex items-center gap-0.5 ${step.activeColor || "text-[#00580C]"}`}><span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />{step.label}</span>
                              : <span className="text-gray-300">○ {step.label}</span>}
                          {step.time !== "--" && <span className="text-gray-400 text-[8px]">{step.time}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════
            TAB 2: PURCHASE HISTORY (TABLE LAYOUT)
        ══════════════════════════════════════════════ */}
        {activeTab === "history" && (
          <>
            {/* Search & Filters Container */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 mb-5 shadow-xs flex flex-col gap-3.5">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={histSearch}
                  onChange={(e) => { setHistSearch(e.target.value); setHistPage(1); }}
                  placeholder="Search order number, product, or retailer..."
                  className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:border-[#00580C] focus:ring-1 focus:ring-[#00580C] shadow-2xs transition"
                />
                {histSearch && (
                  <button
                    type="button"
                    onClick={() => { setHistSearch(""); setHistPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Second filter row */}
              <div className="flex flex-wrap items-center justify-between gap-y-3 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { label: "Year", val: histYear, set: setHistYear, opts: ["All","2026","2025"] },
                    { label: "Month", val: histMonth, set: setHistMonth, opts: ["All","January","February","March","April","May","June","July","August","September","October","November","December"] },
                    { label: "Status", val: histStatus, set: setHistStatus, opts: ["All","Delivered","Refunded","Received & Exchanged"] },
                    { label: "Payment", val: histPayment, set: setHistPayment, opts: ["All","GCash","COD","Refunded"] },
                    { label: "Retailer", val: histRetailer, set: setHistRetailer, opts: ["All Retailers","GrainMart","North Caloocan Rice Store","Baliwag Rice Center","Greenfield Rice Store","Bulacan Rice Hub"] },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-600">{f.label}:</span>
                      <div className="relative">
                        <select
                          value={f.val}
                          onChange={(e) => { f.set(e.target.value); setHistPage(1); }}
                          className="appearance-none bg-white border border-gray-200 rounded-xl pl-3 pr-7 py-1.5 text-xs sm:text-sm font-medium text-gray-700 hover:border-gray-300 focus:border-[#00580C] focus:ring-1 focus:ring-[#00580C] outline-none shadow-2xs cursor-pointer transition"
                        >
                          {f.opts.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                        <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-600">Sort:</span>
                    <div className="relative">
                      <select
                        value={histSort}
                        onChange={(e) => setHistSort(e.target.value)}
                        className="appearance-none bg-white border border-gray-200 rounded-xl pl-3 pr-7 py-1.5 text-xs sm:text-sm font-semibold text-gray-800 hover:border-gray-300 focus:border-[#00580C] focus:ring-1 focus:ring-[#00580C] outline-none shadow-2xs cursor-pointer transition"
                      >
                        <option>Newest First</option>
                        <option>Oldest First</option>
                        <option>Highest Amount</option>
                      </select>
                      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetHistFilters}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#00580C] transition cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-50"
                  >
                    <RotateCcw size={13} />
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Records header row */}
            <div className="flex items-center justify-between mt-4 mb-2">
              <div>
                <p className="text-sm font-bold text-gray-900">{filteredHistory.length} Purchase Records</p>
                <p className="text-xs text-gray-400">Showing completed, delivered, and past GrainRise transactions.</p>
              </div>
              <button onClick={() => showToast("Receipt history exported to your email.")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs">
                <Download size={13} /> Export Receipt History
              </button>
            </div>

            {/* TABLE */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-xs">
                  {/* Table head */}
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Order Details</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Retailer</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Product Spec</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Order Status</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {pagedHistory.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/60 transition group">
                        {/* Order Details */}
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 text-[12px]">{row.orderNumber}</span>
                            {row.isNew && (
                              <span className="px-1.5 py-0.5 bg-[#00580C] text-white text-[9px] font-bold rounded-full">New</span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">{row.placedDate} • {row.placedTime}</p>
                        </td>

                        {/* Retailer */}
                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold text-gray-900">{row.retailer}</p>
                          <p className="text-gray-400 text-[11px] mt-0.5">{row.retailerCity}</p>
                        </td>

                        {/* Product Spec */}
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <SackMini theme={row.theme} />
                            <div>
                              <p className="font-semibold text-gray-900">{row.productName}</p>
                              <p className="text-gray-400 text-[11px] mt-0.5">{row.productSpec}</p>
                            </div>
                          </div>
                        </td>

                        {/* Qty */}
                        <td className="px-4 py-4 align-top text-gray-600">{row.qty}</td>

                        {/* Total Amount */}
                        <td className="px-4 py-4 align-top">
                          <span className="font-black text-gray-900 text-sm">{row.totalAmount}</span>
                        </td>

                        {/* Payment */}
                        <td className="px-4 py-4 align-top">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            row.paymentTheme === "green"  ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            row.paymentTheme === "amber"  ? "bg-amber-50 text-amber-700 border-amber-200" :
                            row.paymentTheme === "red"    ? "bg-red-50 text-red-600 border-red-200" :
                            "bg-gray-100 text-gray-600 border-gray-200"
                          }`}>{row.paymentLabel}</span>
                        </td>

                        {/* Order Status */}
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              row.orderStatusTheme === "emerald" ? "bg-[#00580C]" :
                              row.orderStatusTheme === "red" ? "bg-red-500" :
                              "bg-amber-500"
                            }`} />
                            <span className={`font-bold ${
                              row.orderStatusTheme === "emerald" ? "text-[#00580C]" :
                              row.orderStatusTheme === "red" ? "text-red-600" :
                              "text-amber-700"
                            }`}>{row.orderStatus}</span>
                          </div>
                          {row.orderStatusSub && (
                            <p className="text-[11px] text-gray-400 mt-0.5 ml-3">{row.orderStatusSub}</p>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => setDetailsModal(row)}
                                className="text-xs font-semibold text-gray-600 hover:text-gray-900 hover:underline cursor-pointer transition">
                                View Details
                              </button>
                              {row.canBuyAgain && (
                                <button onClick={() => navigate("/consumer/marketplace")}
                                  className="px-3 py-1 bg-[#00580C] hover:bg-[#0c432f] text-white text-[11px] font-bold rounded-lg transition cursor-pointer shadow-2xs">
                                  Buy Again
                                </button>
                              )}
                              {row.isRefunded && (
                                <button onClick={() => showToast("Viewing refund status for " + row.orderNumber)}
                                  className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold rounded-lg border border-red-200 transition cursor-pointer">
                                  Refund Status
                                </button>
                              )}
                              {row.isExchanged && (
                                <button onClick={() => showToast("Viewing return details for " + row.orderNumber)}
                                  className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold rounded-lg border border-amber-200 transition cursor-pointer">
                                  Return Details
                                </button>
                              )}
                            </div>
                            {/* Review line */}
                            {row.hasReview ? (
                              <div className="flex items-center gap-1 text-amber-500">
                                <Star size={11} fill="currentColor" />
                                <span className="text-[10px] font-bold text-amber-600">{row.reviewScore.toFixed(1)} (Reviewed)</span>
                              </div>
                            ) : row.canBuyAgain && (
                              <button onClick={() => setReviewModal(row)}
                                className="text-[10px] font-bold text-[#00580C] hover:underline cursor-pointer transition">
                                Write a Review
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
                <p className="text-xs text-gray-500">
                  Showing {Math.min((histPage - 1) * HIST_PAGE_SIZE + 1, filteredHistory.length)}–{Math.min(histPage * HIST_PAGE_SIZE, filteredHistory.length)} of {filteredHistory.length} purchase records
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setHistPage(p => Math.max(1, p - 1))}
                    disabled={histPage === 1}
                    className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft size={13} /> Previous
                  </button>
                  {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setHistPage(p)}
                      className={`w-7 h-7 text-xs font-bold rounded-md transition cursor-pointer ${
                        histPage === p ? "bg-[#00580C] text-white" : "text-gray-600 hover:bg-gray-100"
                      }`}>
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setHistPage(p => Math.min(totalPages, p + 1))}
                    disabled={histPage === totalPages || totalPages === 0}
                    className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ══ MODAL: LIVE TRACK ══════════════════════════════════════ */}
      {trackModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#00580C] uppercase tracking-wider">Live Shipment Tracker</span>
                <h3 className="text-base font-black text-gray-900">{trackModal.orderNumber}</h3>
              </div>
              <button onClick={() => setTrackModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="h-40 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 flex flex-col justify-between p-3.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00580C] bg-white/90 px-2.5 py-1 rounded-full">
                    <Navigation size={11} className="animate-pulse" /> Live GPS Active
                  </span>
                  <span className="text-xs font-bold bg-white/90 px-2.5 py-1 rounded-full">ETA: {trackModal.estArrival}</span>
                </div>
                <div className="flex items-center justify-between px-6">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-[#00580C] flex items-center justify-center shadow-sm">
                      <Building2 size={14} className="text-[#00580C]" />
                    </div>
                    <span className="text-[9px] font-bold text-gray-700 mt-1 text-center">{trackModal.seller}</span>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-[#00580C]/50 mx-3 relative">
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#00580C] text-white flex items-center justify-center shadow">
                      <Truck size={13} />
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-amber-500 flex items-center justify-center shadow-sm">
                      <MapPin size={14} className="text-amber-600" />
                    </div>
                    <span className="text-[9px] font-bold text-gray-700 mt-1">Bagong Silang</span>
                  </div>
                </div>
                <p className="text-[11px] bg-white/80 px-3 py-1 rounded-lg text-gray-700">
                  Assigned: <span className="font-bold">{trackModal.courierName}</span>
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#00580C] text-white flex items-center justify-center font-bold text-sm">M</div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{trackModal.courierName}</p>
                    <p className="text-[11px] text-gray-500">{trackModal.courierSub}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => showToast("Calling rider...")} className="p-2 bg-white border border-gray-200 hover:bg-emerald-50 text-[#00580C] rounded-lg cursor-pointer"><Phone size={14} /></button>
                  <button onClick={() => showToast("Opening chat...")} className="p-2 bg-white border border-gray-200 hover:bg-emerald-50 text-[#00580C] rounded-lg cursor-pointer"><MessageSquare size={14} /></button>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Tracking Activity</p>
                <div className="space-y-3 pl-2 border-l-2 border-emerald-100">
                  {trackModal.trackingLogs?.map((log, i) => (
                    <div key={i} className="relative pl-4">
                      <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-[#00580C] border-2 border-white ring-2 ring-emerald-100" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">{log.title}</span>
                        <span className="text-[10px] text-gray-400">{log.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{log.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setTrackModal(null)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100 cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: ORDER DETAILS ══════════════════════════════════ */}
      {detailsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#00580C] uppercase tracking-wider">Order Invoice & Receipt</span>
                <h3 className="text-base font-black text-gray-900">{detailsModal.orderNumber}</h3>
              </div>
              <button onClick={() => setDetailsModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
                <p className="font-bold text-gray-800 mb-1 flex items-center gap-1.5"><MapPin size={13} className="text-[#00580C]" />Delivery Destination</p>
                <p className="text-gray-600">Kerbie Hector Abanid • (+63) 917 123 4567</p>
                <p className="text-gray-500 mt-0.5">Phase 2, Bagong Silang, Caloocan City, Metro Manila</p>
              </div>
              <div className="border border-gray-200 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between pb-2 border-b border-gray-100">
                  <span className="font-bold text-gray-800">Product Item</span>
                  <span className="font-bold text-gray-800">Amount</span>
                </div>
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{detailsModal.productName}</p>
                    <p className="text-[11px] text-gray-500">{detailsModal.retailer || detailsModal.seller} • {detailsModal.qty || "1 Sack"}</p>
                  </div>
                  <span className="font-bold text-gray-900">{detailsModal.totalAmount || detailsModal.priceFormatted}</span>
                </div>
              </div>
              <div className="space-y-1.5 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{detailsModal.totalAmount || detailsModal.priceFormatted}</span></div>
                <div className="flex justify-between text-gray-600"><span>Shipping Fee</span><span>₱80.00</span></div>
                <div className="flex justify-between text-emerald-700 font-semibold"><span>Discount (GrainRise Voucher)</span><span>-₱80.00</span></div>
                <hr className="border-gray-200" />
                <div className="flex justify-between text-sm font-black text-gray-900"><span>Total Paid</span><span className="text-[#00580C]">{detailsModal.totalAmount || detailsModal.priceFormatted}</span></div>
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button onClick={() => showToast("Invoice downloaded.")} className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer">
                <FileText size={13} /> Download PDF
              </button>
              <button onClick={() => setDetailsModal(null)} className="px-4 py-2 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-bold rounded-xl cursor-pointer">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: CANCEL ORDER ════════════════════════════════════ */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3"><AlertCircle size={24} /></div>
            <h3 className="text-base font-black text-gray-900 text-center">Cancel {cancelModal.orderNumber}?</h3>
            <p className="text-xs text-gray-500 text-center mt-1">Your payment will be refunded to the original payment method.</p>
            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold text-gray-700">Reason:</label>
              <select className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-red-500">
                <option>Changed mind</option>
                <option>Delivery date too late</option>
                <option>Incorrect order details</option>
              </select>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setCancelModal(null)} className="flex-1 py-2.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer">Keep Order</button>
              <button onClick={() => { setCancelModal(null); showToast("Order cancelled successfully."); }} className="flex-1 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer">Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: WRITE REVIEW ════════════════════════════════════ */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900">Write a Review</h3>
              <button onClick={() => setReviewModal(null)} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 cursor-pointer"><X size={15} /></button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <p className="font-bold text-gray-800">{reviewModal.productName}</p>
              <p className="text-gray-500">Purchased from {reviewModal.retailer}</p>
              <div className="flex items-center gap-2 mt-2">
                {[1,2,3,4,5].map(s => <Star key={s} size={22} className="text-amber-400 cursor-pointer hover:fill-amber-400" fill="none" />)}
              </div>
              <textarea placeholder="Share your experience with this product..." rows={3}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs resize-none focus:outline-none focus:border-[#00580C] mt-2" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setReviewModal(null)} className="flex-1 py-2 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer">Cancel</button>
              <button onClick={() => { setReviewModal(null); showToast("Review submitted! Thank you."); }} className="flex-1 py-2 text-xs font-bold bg-[#00580C] hover:bg-[#0c432f] text-white rounded-xl cursor-pointer">Submit Review</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: SUPPORT ═════════════════════════════════════════ */}
      {(contactModal || supportOpen) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                <HelpCircle size={15} className="text-[#00580C]" />
                {contactModal ? `Contact ${contactModal.seller}` : "GrainRise Customer Support"}
              </h3>
              <button onClick={() => { setContactModal(null); setSupportOpen(false); }} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 cursor-pointer"><X size={15} /></button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="font-bold text-[#00580C]">GrainRise Hotline</p>
                <p className="font-semibold text-emerald-900 mt-0.5">+63 (02) 8888-RICE (7423)</p>
                <p className="text-[10px] text-emerald-700 mt-0.5">Mon–Sat: 7:00 AM – 8:00 PM</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="font-bold text-gray-800">Email Support</p>
                <p className="font-semibold text-gray-700 mt-0.5">support@grainrise.ph</p>
              </div>
            </div>
            <button onClick={() => { setContactModal(null); setSupportOpen(false); showToast("Support chat started. An agent will assist you shortly."); }}
              className="w-full py-2.5 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-bold rounded-xl cursor-pointer">
              Start Live Support Chat
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-5 z-50 bg-[#00580C] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top-2 duration-150">
          <Check size={15} className="text-emerald-300 shrink-0" /> {toast}
        </div>
      )}
    </div>
  );
}
