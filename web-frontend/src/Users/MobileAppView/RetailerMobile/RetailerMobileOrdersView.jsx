import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Eye,
  RotateCcw,
  Building2,
  X,
  CheckCircle2,
  Truck,
  MapPin,
  Clock,
  Phone,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

export default function RetailerMobileOrdersView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Orders dataset matching Figma design screenshots exactly
  const initialOrders = [
    {
      id: "ord-1",
      name: "Dinorado",
      batch: "Batch 2026 - 001",
      batchDotColor: "bg-amber-500",
      orderNo: "WR - 001",
      status: "Preparing for Delivery",
      statusType: "preparing",
      warehouse: "Warehouse ABC",
      quantity: "100 kg",
      price: "₱1,500.00",
      rawPrice: 1500,
      orderDate: "Oct 06, 2026 • 09:30 AM",
      estDelivery: "Oct 08, 2026",
      driverName: "Danilo Santos",
      driverPhone: "+63 917 123 4567",
      plateNumber: "NBD 4821",
    },
    {
      id: "ord-2",
      name: "Dinorado",
      batch: "Batch 2026 - 001",
      batchDotColor: "bg-amber-500",
      orderNo: "WR - 001",
      status: "Preparing for Delivery",
      statusType: "preparing",
      warehouse: "Warehouse ABC",
      quantity: "100 kg",
      price: "₱1,500.00",
      rawPrice: 1500,
      orderDate: "Oct 06, 2026 • 09:15 AM",
      estDelivery: "Oct 08, 2026",
      driverName: "Danilo Santos",
      driverPhone: "+63 917 123 4567",
      plateNumber: "NBD 4821",
    },
    {
      id: "ord-3",
      name: "Sinandomeng Special",
      batch: "Batch 2026 - 003",
      batchDotColor: "bg-emerald-500",
      orderNo: "WR - 2026-021",
      status: "Preparing for Delivery",
      statusType: "preparing",
      warehouse: "Warehouse ABC",
      quantity: "500 kg",
      price: "₱31,500.00",
      rawPrice: 31500,
      orderDate: "Oct 05, 2026 • 02:45 PM",
      estDelivery: "Oct 07, 2026",
      driverName: "Eduardo Ramos",
      driverPhone: "+63 918 555 8901",
      plateNumber: "ABC 1092",
    },
    {
      id: "ord-4",
      name: "Jasmine Fragrant Rice",
      batch: "Batch 2026 - 008",
      batchDotColor: "bg-sky-500",
      orderNo: "WR - 2026-019",
      status: "In Transit",
      statusType: "in-transit",
      warehouse: "North Caloocan...",
      quantity: "300 kg",
      price: "₱18,600.00",
      rawPrice: 18600,
      orderDate: "Oct 05, 2026 • 11:20 AM",
      estDelivery: "Oct 06, 2026 (Today)",
      driverName: "Rogelio Cruz",
      driverPhone: "+63 920 888 2341",
      plateNumber: "NDQ 9024",
    },
    {
      id: "ord-5",
      name: "Dinorado Premium",
      batch: "Batch 2026 - 004",
      batchDotColor: "bg-indigo-500",
      orderNo: "WR - 2026-017",
      status: "Processing",
      statusType: "processing",
      warehouse: "Warehouse XYZ",
      quantity: "250 kg",
      price: "₱14,500.00",
      rawPrice: 14500,
      orderDate: "Oct 06, 2026 • 08:10 AM",
      estDelivery: "Oct 09, 2026",
      driverName: "To be assigned",
      driverPhone: "Pending",
      plateNumber: "Pending dispatch",
    },
    {
      id: "ord-6",
      name: "Brown Rice Health",
      batch: "Batch 2026 - 009",
      batchDotColor: "bg-amber-600",
      orderNo: "WR - 2026-015",
      status: "In Transit",
      statusType: "in-transit",
      warehouse: "South Luzon Hub",
      quantity: "150 kg",
      price: "₱9,750.00",
      rawPrice: 9750,
      orderDate: "Oct 04, 2026 • 04:00 PM",
      estDelivery: "Oct 06, 2026",
      driverName: "Mark Anthony",
      driverPhone: "+63 919 777 4321",
      plateNumber: "XYZ 7812",
    },
    {
      id: "ord-7",
      name: "Milagrosa Classic",
      batch: "Batch 2026 - 010",
      batchDotColor: "bg-emerald-600",
      orderNo: "WR - 2026-014",
      status: "Delivered",
      statusType: "delivered",
      warehouse: "Warehouse ABC",
      quantity: "400 kg",
      price: "₱24,000.00",
      rawPrice: 24000,
      orderDate: "Oct 03, 2026 • 10:00 AM",
      estDelivery: "Delivered Oct 05",
      driverName: "Danilo Santos",
      driverPhone: "+63 917 123 4567",
      plateNumber: "NBD 4821",
    },
    {
      id: "ord-8",
      name: "Dinorado Reserve",
      batch: "Batch 2026 - 011",
      batchDotColor: "bg-purple-500",
      orderNo: "WR - 2026-013",
      status: "Delivered",
      statusType: "delivered",
      warehouse: "Central Rice Depot",
      quantity: "600 kg",
      price: "₱37,200.00",
      rawPrice: 37200,
      orderDate: "Oct 02, 2026 • 01:15 PM",
      estDelivery: "Delivered Oct 04",
      driverName: "Eduardo Ramos",
      driverPhone: "+63 918 555 8901",
      plateNumber: "ABC 1092",
    },
    {
      id: "ord-9",
      name: "Malagkit Sweet Rice",
      batch: "Batch 2026 - 012",
      batchDotColor: "bg-rose-500",
      orderNo: "WR - 2026-012",
      status: "Processing",
      statusType: "processing",
      warehouse: "Warehouse XYZ",
      quantity: "200 kg",
      price: "₱14,400.00",
      rawPrice: 14400,
      orderDate: "Oct 06, 2026 • 10:00 AM",
      estDelivery: "Oct 09, 2026",
      driverName: "To be assigned",
      driverPhone: "Pending",
      plateNumber: "Pending dispatch",
    },
    {
      id: "ord-10",
      name: "Dinorado Harvest",
      batch: "Batch 2026 - 013",
      batchDotColor: "bg-amber-500",
      orderNo: "WR - 2026-011",
      status: "In Transit",
      statusType: "in-transit",
      warehouse: "Warehouse ABC",
      quantity: "500 kg",
      price: "₱31,000.00",
      rawPrice: 31000,
      orderDate: "Oct 05, 2026 • 08:30 AM",
      estDelivery: "Oct 07, 2026",
      driverName: "Rogelio Cruz",
      driverPhone: "+63 920 888 2341",
      plateNumber: "NDQ 9024",
    },
    {
      id: "ord-11",
      name: "Sinandomeng Regular",
      batch: "Batch 2026 - 014",
      batchDotColor: "bg-emerald-500",
      orderNo: "WR - 2026-010",
      status: "Delivered",
      statusType: "delivered",
      warehouse: "North Caloocan...",
      quantity: "1,000 kg",
      price: "₱54,000.00",
      rawPrice: 54000,
      orderDate: "Oct 01, 2026 • 11:00 AM",
      estDelivery: "Delivered Oct 03",
      driverName: "Mark Anthony",
      driverPhone: "+63 919 777 4321",
      plateNumber: "XYZ 7812",
    },
    {
      id: "ord-12",
      name: "Dinorado Special",
      batch: "Batch 2026 - 015",
      batchDotColor: "bg-amber-600",
      orderNo: "WR - 2026-009",
      status: "Preparing for Delivery",
      statusType: "preparing",
      warehouse: "Warehouse ABC",
      quantity: "350 kg",
      price: "₱22,050.00",
      rawPrice: 22050,
      orderDate: "Oct 06, 2026 • 07:45 AM",
      estDelivery: "Oct 08, 2026",
      driverName: "Danilo Santos",
      driverPhone: "+63 917 123 4567",
      plateNumber: "NBD 4821",
    },
    {
      id: "ord-13",
      name: "Jasmine Fragrant",
      batch: "Batch 2026 - 016",
      batchDotColor: "bg-sky-500",
      orderNo: "WR - 2026-008",
      status: "In Transit",
      statusType: "in-transit",
      warehouse: "Central Rice Depot",
      quantity: "450 kg",
      price: "₱27,900.00",
      rawPrice: 27900,
      orderDate: "Oct 04, 2026 • 03:20 PM",
      estDelivery: "Oct 06, 2026",
      driverName: "Eduardo Ramos",
      driverPhone: "+63 918 555 8901",
      plateNumber: "ABC 1092",
    },
    {
      id: "ord-14",
      name: "Red Rice Organic",
      batch: "Batch 2026 - 017",
      batchDotColor: "bg-rose-600",
      orderNo: "WR - 2026-007",
      status: "Processing",
      statusType: "processing",
      warehouse: "South Luzon Hub",
      quantity: "120 kg",
      price: "₱9,120.00",
      rawPrice: 9120,
      orderDate: "Oct 06, 2026 • 09:00 AM",
      estDelivery: "Oct 09, 2026",
      driverName: "To be assigned",
      driverPhone: "Pending",
      plateNumber: "Pending dispatch",
    },
    {
      id: "ord-15",
      name: "Dinorado Super",
      batch: "Batch 2026 - 018",
      batchDotColor: "bg-amber-500",
      orderNo: "WR - 2026-006",
      status: "Delivered",
      statusType: "delivered",
      warehouse: "Warehouse ABC",
      quantity: "800 kg",
      price: "₱49,600.00",
      rawPrice: 49600,
      orderDate: "Sep 30, 2026 • 02:00 PM",
      estDelivery: "Delivered Oct 02",
      driverName: "Danilo Santos",
      driverPhone: "+63 917 123 4567",
      plateNumber: "NBD 4821",
    },
  ];

  const [orders] = useState(initialOrders);

  const statusFilterOptions = [
    "All",
    "Preparing for Delivery",
    "In Transit",
    "Processing",
    "Delivered",
  ];

  const filteredOrders = orders.filter((ord) => {
    if (selectedStatus !== "All" && ord.status !== selectedStatus) {
      return false;
    }
    if (
      searchQuery &&
      !ord.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !ord.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !ord.warehouse.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !ord.batch.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const displayedOrders = filteredOrders.slice(0, visibleCount);

  // Status Badge matching Figma screenshots exactly
  const getStatusBadge = (statusType, statusText) => {
    switch (statusType) {
      case "preparing":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{statusText}</span>
          </span>
        );
      case "in-transit":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-600 border border-sky-200/80 shadow-2xs">
            <span className="text-[10px] font-black">✦</span>
            <span>{statusText}</span>
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>{statusText}</span>
          </span>
        );
      case "delivered":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{statusText}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-24 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-xs">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. Header Title ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Order Tracking
        </h1>
      </div>

      {/* ── 2. Search & Filter Bar (Figma Exact) ────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search order number....."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2.5 bg-white border border-gray-200/90 rounded-2xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0d6928] shadow-2xs transition-colors"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200/90 rounded-2xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
          >
            <SlidersHorizontal size={14} className="text-gray-500" />
            <span>{selectedStatus}</span>
            <span className="text-gray-400 text-[10px]">▼</span>
          </button>

          {isFilterDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-30">
              {statusFilterOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSelectedStatus(s);
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer ${
                    selectedStatus === s
                      ? "text-[#0d6928] font-bold bg-emerald-50"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Sub-header: Active Deliveries & Counter Pill ─────────── */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span className="text-xs font-semibold text-gray-500">
            Active Marketplace Deliveries
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100/90 text-slate-700 border border-slate-200/60">
          20 total
        </span>
      </div>

      {/* ── 4. Order Cards List (Figma Exact) ────────────────────────── */}
      <div className="space-y-3 pt-1">
        {displayedOrders.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-gray-100 text-center text-xs text-gray-400">
            No matching orders found.
          </div>
        ) : (
          displayedOrders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white rounded-2xl border border-gray-100/90 p-4 shadow-2xs space-y-3.5 hover:border-emerald-200 transition-all"
            >
              {/* Card Header: Product Name + Batch & Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">
                    {ord.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${ord.batchDotColor}`} />
                    <span className="text-[11px] text-gray-400 font-medium">
                      {ord.batch}
                    </span>
                  </div>
                </div>

                {getStatusBadge(ord.statusType, ord.status)}
              </div>

              {/* 2x2 Info Grid (Order No, Warehouse, Quantity, Total Price) */}
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 pt-0.5">
                {/* Order No */}
                <div>
                  <span className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-tight">
                    ORDER NO.
                  </span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100/90 text-slate-700 border border-slate-200/60">
                    {ord.orderNo}
                  </span>
                </div>

                {/* Warehouse */}
                <div>
                  <span className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-tight">
                    WAREHOUSE
                  </span>
                  <div className="flex items-center gap-1 mt-0.5 text-xs font-semibold text-gray-700 truncate">
                    <Building2 size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{ord.warehouse}</span>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <span className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-tight">
                    QUANTITY
                  </span>
                  <span className="block text-xs font-bold text-gray-900 mt-0.5">
                    {ord.quantity}
                  </span>
                </div>

                {/* Total Price */}
                <div>
                  <span className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-tight">
                    TOTAL PRICE
                  </span>
                  <span className="block text-xs font-black text-gray-900 mt-0.5">
                    {ord.price}
                  </span>
                </div>
              </div>

              {/* Action Button: "View Details & Tracking" */}
              <div className="pt-1">
                <button
                  onClick={() => setSelectedOrder(ord)}
                  className="w-full py-2.5 px-3 bg-[#f6f9fa] hover:bg-[#eaf2f5] active:scale-[0.99] border border-slate-200/80 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye size={14} className="text-slate-500" />
                  <span>View Details & Tracking</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── 5. Pagination / Load More Section (Figma Exact) ──────────── */}
      <div className="pt-2 text-center space-y-2">
        <p className="text-xs font-medium text-gray-500">
          Showing {displayedOrders.length} of {filteredOrders.length} orders
        </p>

        {visibleCount < filteredOrders.length && (
          <button
            onClick={() => setVisibleCount((prev) => prev + 5)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-[#0d6928] transition-colors cursor-pointer py-1"
          >
            <RotateCcw size={13} strokeWidth={2.4} />
            <span>Load More Products</span>
          </button>
        )}
      </div>

      {/* ── 6. Interactive Modal: View Details & Live Tracking ───────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 shadow-2xl border border-gray-100 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Order Details
                </span>
                <h3 className="text-sm font-black text-gray-900">
                  {selectedOrder.orderNo}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Product & Current Status Banner */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-gray-900">
                  {selectedOrder.name}
                </h4>
                <p className="text-[11px] text-gray-500">
                  {selectedOrder.batch} • {selectedOrder.quantity}
                </p>
              </div>
              {getStatusBadge(selectedOrder.statusType, selectedOrder.status)}
            </div>

            {/* Live Delivery Timeline */}
            <div className="space-y-2 pt-1">
              <span className="text-[10.5px] font-bold text-gray-400 uppercase tracking-tight">
                Shipment Progress
              </span>
              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 pl-7 text-xs">
                {/* Step 1: Order Confirmed */}
                <div className="relative">
                  <span className="absolute -left-7 top-0.5 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                  <p className="font-bold text-gray-900">Order Confirmed</p>
                  <p className="text-[11px] text-gray-400">{selectedOrder.orderDate}</p>
                </div>

                {/* Step 2: Warehouse Packed */}
                <div className="relative">
                  <span className="absolute -left-7 top-0.5 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                  <p className="font-bold text-gray-900">Packed at {selectedOrder.warehouse}</p>
                  <p className="text-[11px] text-gray-400">Quality check passed (Grade A)</p>
                </div>

                {/* Step 3: Dispatch / Transit */}
                <div className="relative">
                  <span
                    className={`absolute -left-7 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                      selectedOrder.statusType === "in-transit" ||
                      selectedOrder.statusType === "delivered"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {selectedOrder.statusType === "delivered" ? "✓" : "●"}
                  </span>
                  <p className="font-bold text-gray-900">
                    {selectedOrder.statusType === "preparing"
                      ? "Preparing for Courier Handover"
                      : "Dispatched with Courier"}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Est. Delivery: {selectedOrder.estDelivery}
                  </p>
                </div>

                {/* Step 4: Final Delivery */}
                <div className="relative">
                  <span
                    className={`absolute -left-7 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                      selectedOrder.statusType === "delivered"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {selectedOrder.statusType === "delivered" ? "✓" : "○"}
                  </span>
                  <p className="font-bold text-gray-900">Delivery at Store</p>
                  <p className="text-[11px] text-gray-400">Retailer Storefront</p>
                </div>
              </div>
            </div>

            {/* Courier & Warehouse Info */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Truck size={13} /> Driver:
                </span>
                <span className="font-bold text-gray-900">{selectedOrder.driverName}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <MapPin size={13} /> Plate:
                </span>
                <span className="font-bold text-gray-900">{selectedOrder.plateNumber}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Phone size={13} /> Contact:
                </span>
                <span className="font-bold text-emerald-700">{selectedOrder.driverPhone}</span>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">Total Paid Amount:</span>
              <span className="text-sm font-black text-emerald-900">{selectedOrder.price}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  showToast(`Calling driver: ${selectedOrder.driverPhone}`);
                }}
                className="flex-1 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center shadow-2xs"
              >
                Call Driver
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-2.5 bg-[#0d6928] text-white font-bold text-xs rounded-xl hover:bg-emerald-900 transition-colors cursor-pointer text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
