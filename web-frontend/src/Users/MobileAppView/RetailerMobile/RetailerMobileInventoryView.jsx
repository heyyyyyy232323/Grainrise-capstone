import React, { useState } from "react";
import Toast from "../../../Components/Modals/Toast";
import {
  Search,
  SlidersHorizontal,
  Eye,
  Archive,
  RotateCcw,
  Trash2,
  X,
  CheckCircle2,
} from "lucide-react";

export default function RetailerMobileInventoryView({ onRestockClick }) {
  const [activeTab, setActiveTab] = useState("active"); // "active" | "archive"
  const [subFilter, setSubFilter] = useState("all"); // "all" | "low" | "out"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Inventory dataset matching Figma screenshots exactly (Active + Archive)
  const initialProducts = [
    // --- Active Products ---
    {
      id: "inv-act-1",
      name: "Dinorado",
      code: "WR-001",
      desc: "Premium rice, locally sourced",
      status: "Out of Stock",
      statusType: "out",
      expiration: "Oct 17, 2026",
      expiryBadge: null,
      stockQty: "0 kg",
      stockColor: "text-rose-600",
      price: "₱1,500.00",
      category: "Premium",
      isArchived: false,
    },
    {
      id: "inv-act-2",
      name: "Dinorado",
      code: "WR-001",
      desc: "Premium rice, locally sourced :",
      status: "Low Stock",
      statusType: "low",
      expiration: "Oct 17, 2026",
      expiryBadge: "Expiring Soon",
      stockQty: "100 kg",
      stockColor: "text-amber-600",
      price: "₱1,500.00",
      category: "Premium",
      isArchived: false,
    },
    {
      id: "inv-act-3",
      name: "Dinorado",
      code: "WR-001",
      desc: "Premium rice, locally sourced :",
      status: "Low Stock",
      statusType: "low",
      expiration: "Jul 24, 2026",
      expiryBadge: "Expired",
      stockQty: "100 kg",
      stockColor: "text-amber-600",
      price: "₱1,500.00",
      category: "Premium",
      isArchived: false,
    },
    {
      id: "inv-act-4",
      name: "Dinorado",
      code: "WR-001",
      desc: "Premium rice, locally sourced spe",
      status: "In Stock",
      statusType: "in-stock",
      expiration: "May 20, 2027",
      expiryBadge: null,
      stockQty: "2,500 kg",
      stockColor: "text-emerald-700",
      price: "₱1,500.00",
      category: "Premium",
      isArchived: false,
    },
    {
      id: "inv-act-5",
      name: "Sinandomeng S...",
      code: "WR-002",
      desc: "50kg regular white milled grain...",
      status: "In Stock",
      statusType: "in-stock",
      expiration: "Jun 15, 2027",
      expiryBadge: null,
      stockQty: "1,800 kg",
      stockColor: "text-emerald-700",
      price: "₱1,350.00",
      category: "Commercial",
      isArchived: false,
    },
    {
      id: "inv-act-6",
      name: "Jasmine Fragrant",
      code: "WR-003",
      desc: "50kg supreme aromatic fragrant rice",
      status: "In Stock",
      statusType: "in-stock",
      expiration: "Aug 10, 2027",
      expiryBadge: null,
      stockQty: "3,200 kg",
      stockColor: "text-emerald-700",
      price: "₱1,650.00",
      category: "Premium",
      isArchived: false,
    },
    {
      id: "inv-act-7",
      name: "Brown Rice Health",
      code: "WR-004",
      desc: "Whole grain organic rice unpolished",
      status: "Low Stock",
      statusType: "low",
      expiration: "Nov 02, 2026",
      expiryBadge: "Expiring Soon",
      stockQty: "150 kg",
      stockColor: "text-amber-600",
      price: "₱1,750.00",
      category: "Specialty",
      isArchived: false,
    },

    // --- Archived Products (Figma Archive Screenshot Exact - 15 items) ---
    {
      id: "inv-arc-1",
      name: "Dinorado",
      code: "WR-001",
      desc: "Premium rice, locally sourced",
      status: "Out of Stock",
      statusType: "out",
      expiration: "Oct 17, 2026",
      expiryBadge: null,
      stockQty: "0 kg",
      stockColor: "text-rose-600",
      price: "₱1,500.00",
      category: "Premium",
      isArchived: true,
    },
    {
      id: "inv-arc-2",
      name: "Dinorado",
      code: "WR-001",
      desc: "Premium rice, locally sourced :",
      status: "Low Stock",
      statusType: "low",
      expiration: "Oct 17, 2026",
      expiryBadge: null,
      stockQty: "100 kg",
      stockColor: "text-amber-600",
      price: "₱1,500.00",
      category: "Premium",
      isArchived: true,
    },
    {
      id: "inv-arc-3",
      name: "Dinorado",
      code: "WR-001",
      desc: "Premium rice, locally sourced spe",
      status: "In Stock",
      statusType: "in-stock",
      expiration: "May 20, 2027",
      expiryBadge: null,
      stockQty: "2,500 kg",
      stockColor: "text-emerald-700",
      price: "₱1,500.00",
      category: "Premium",
      isArchived: true,
    },
    {
      id: "inv-arc-4",
      name: "Sinandomeng S...",
      code: "WR-002",
      desc: "50kg regular white milled grain...",
      status: "In Stock",
      statusType: "in-stock",
      expiration: "Jun 15, 2027",
      expiryBadge: null,
      stockQty: "1,800 kg",
      stockColor: "text-emerald-700",
      price: "₱1,350.00",
      category: "Commercial",
      isArchived: true,
    },
    {
      id: "inv-arc-5",
      name: "Jasmine Fragrant",
      code: "WR-003",
      desc: "50kg supreme aromatic fragrant rice",
      status: "In Stock",
      statusType: "in-stock",
      expiration: "Aug 10, 2027",
      expiryBadge: null,
      stockQty: "3,200 kg",
      stockColor: "text-emerald-700",
      price: "₱1,650.00",
      category: "Premium",
      isArchived: true,
    },
    {
      id: "inv-arc-6",
      name: "Brown Rice Health",
      code: "WR-004",
      desc: "Whole grain organic rice unpolished",
      status: "Low Stock",
      statusType: "low",
      expiration: "Nov 02, 2026",
      expiryBadge: "Expiring Soon",
      stockQty: "150 kg",
      stockColor: "text-amber-600",
      price: "₱1,750.00",
      category: "Specialty",
      isArchived: true,
    },
    {
      id: "inv-arc-7",
      name: "Dinorado Special",
      code: "WR-005",
      desc: "Premium milled long-grain rice",
      status: "Out of Stock",
      statusType: "out",
      expiration: "Jul 24, 2026",
      expiryBadge: "Expired",
      stockQty: "0 kg",
      stockColor: "text-rose-600",
      price: "₱1,550.00",
      category: "Premium",
      isArchived: true,
    },
    {
      id: "inv-arc-8",
      name: "Dinorado Select",
      code: "WR-006",
      desc: "50kg aromatic table rice",
      status: "Low Stock",
      statusType: "low",
      expiration: "Oct 17, 2026",
      expiryBadge: null,
      stockQty: "80 kg",
      stockColor: "text-amber-600",
      price: "₱1,500.00",
      category: "Premium",
      isArchived: true,
    },
    {
      id: "inv-arc-9",
      name: "Milagrosa Classic",
      code: "WR-007",
      desc: "Naturally fragrant polished rice",
      status: "In Stock",
      statusType: "in-stock",
      expiration: "Dec 18, 2027",
      expiryBadge: null,
      stockQty: "1,200 kg",
      stockColor: "text-emerald-700",
      price: "₱1,400.00",
      category: "Commercial",
      isArchived: true,
    },
    {
      id: "inv-arc-10",
      name: "Malagkit Rice",
      code: "WR-008",
      desc: "Glutinous sticky sweet rice",
      status: "In Stock",
      statusType: "in-stock",
      expiration: "Jan 12, 2028",
      expiryBadge: null,
      stockQty: "900 kg",
      stockColor: "text-emerald-700",
      price: "₱1,800.00",
      category: "Specialty",
      isArchived: true,
    },
    {
      id: "inv-arc-11",
      name: "Dinorado Gold",
      code: "WR-009",
      desc: "Extra fragrance premium grain",
      status: "In Stock",
      statusType: "in-stock",
      expiration: "Feb 14, 2028",
      expiryBadge: null,
      stockQty: "2,100 kg",
      stockColor: "text-emerald-700",
      price: "₱1,600.00",
      category: "Premium",
      isArchived: true,
    },
    {
      id: "inv-arc-12",
      name: "Sinandomeng Regular",
      code: "WR-010",
      desc: "Affordable family daily staple",
      status: "In Stock",
      statusType: "in-stock",
      expiration: "Mar 22, 2028",
      expiryBadge: null,
      stockQty: "3,500 kg",
      stockColor: "text-emerald-700",
      price: "₱1,250.00",
      category: "Commercial",
      isArchived: true,
    },
    {
      id: "inv-arc-13",
      name: "Dinorado Harvest",
      code: "WR-011",
      desc: "Fresh crop seasonal harvest",
      status: "Low Stock",
      statusType: "low",
      expiration: "Sep 30, 2026",
      expiryBadge: "Expiring Soon",
      stockQty: "95 kg",
      stockColor: "text-amber-600",
      price: "₱1,500.00",
      category: "Premium",
      isArchived: true,
    },
    {
      id: "inv-arc-14",
      name: "Red Rice Organic",
      code: "WR-012",
      desc: "Nutrient dense red grain rice",
      status: "In Stock",
      statusType: "in-stock",
      expiration: "May 05, 2028",
      expiryBadge: null,
      stockQty: "450 kg",
      stockColor: "text-emerald-700",
      price: "₱1,900.00",
      category: "Specialty",
      isArchived: true,
    },
    {
      id: "inv-arc-15",
      name: "Dinorado Reserve",
      code: "WR-013",
      desc: "Aged premium grain reserve",
      status: "In Stock",
      statusType: "in-stock",
      expiration: "Jun 19, 2028",
      expiryBadge: null,
      stockQty: "1,150 kg",
      stockColor: "text-emerald-700",
      price: "₱1,650.00",
      category: "Premium",
      isArchived: true,
    },
  ];

  const [products, setProducts] = useState(initialProducts);

  const categories = ["All", "Premium", "Commercial", "Specialty"];

  // Filter based on active/archive, subFilter, search, category
  const filteredProducts = products.filter((p) => {
    if (activeTab === "active" && p.isArchived) return false;
    if (activeTab === "archive" && !p.isArchived) return false;

    if (subFilter === "low" && p.statusType !== "low") return false;
    if (subFilter === "out" && p.statusType !== "out") return false;

    if (selectedCategory !== "All" && p.category !== selectedCategory) return false;

    if (
      searchQuery &&
      !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.desc.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  const handleArchiveToggle = (id) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isArchived: !item.isArchived } : item
      )
    );
    showToast(activeTab === "archive" ? "Product restored to active inventory!" : "Product moved to archive!");
  };

  const handleDeleteProduct = (id) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));
    showToast("Product deleted permanently!");
  };

  const getStatusBadge = (statusType, status) => {
    switch (statusType) {
      case "out":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {status}
          </span>
        );
      case "low":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {status}
          </span>
        );
      case "in-stock":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {status}
          </span>
        );
    }
  };

  const activeCount = products.filter((p) => !p.isArchived).length;
  const archiveCount = products.filter((p) => p.isArchived).length;

  return (
    <div className="space-y-4 pb-24 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          isOpen
          type="success"
          message={toastMessage}
          duration={2500}
          onClose={() => setToastMessage(null)}
          position="top-center"
        />
      )}

      {/* ── 1. Title ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Inventory
        </h1>
      </div>

      {/* ── 2. Active vs Archive Segmented Control (Full Width) ─────── */}
      <div className="w-full grid grid-cols-2 gap-2 p-1 bg-gray-100/90 rounded-2xl">
        {/* Active Tab */}
        <button
          onClick={() => {
            setActiveTab("active");
            setSubFilter("all");
          }}
          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "active"
              ? "bg-[#0d6928] text-white shadow-xs"
              : "bg-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <span>Active</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-black ${
              activeTab === "active"
                ? "bg-white text-[#0d6928]"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            56
          </span>
        </button>

        {/* Archive Tab */}
        <button
          onClick={() => {
            setActiveTab("archive");
            setSubFilter("all");
          }}
          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "archive"
              ? "bg-[#0d6928] text-white shadow-xs"
              : "bg-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <span>Archive</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-black ${
              activeTab === "archive"
                ? "bg-white text-[#0d6928]"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            12
          </span>
        </button>
      </div>

      {/* ── 3. Search & Category Filter Bar (Figma Exact) ────────────── */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search product code....."
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
            <span>{selectedCategory}</span>
            <span className="text-gray-400 text-[10px]">▼</span>
          </button>

          {isFilterDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-30">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setSelectedCategory(c);
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer ${
                    selectedCategory === c
                      ? "text-[#0d6928] font-bold bg-emerald-50"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Sub-Filter Counters (All / Low / Out) ─────────────────── */}
      <div className="flex items-center gap-4 text-xs font-bold pt-1">
        <button
          onClick={() => setSubFilter("all")}
          className={`cursor-pointer transition-colors ${
            subFilter === "all"
              ? "text-[#0d6928] font-black"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          All ({activeTab === "archive" ? "56" : "56"})
        </button>

        <button
          onClick={() => setSubFilter("low")}
          className={`cursor-pointer transition-colors ${
            subFilter === "low"
              ? "text-[#c88d10] font-black"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Low (4)
        </button>

        <button
          onClick={() => setSubFilter("out")}
          className={`cursor-pointer transition-colors ${
            subFilter === "out"
              ? "text-rose-600 font-black"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Out (1)
        </button>
      </div>

      {/* ── 5. Product Cards List (Figma Exact) ──────────────────────── */}
      <div className="space-y-3 pt-1">
        {displayedProducts.map((prod) => (
          <div
            key={prod.id}
            className="bg-white rounded-2xl border border-gray-100/90 p-4 shadow-2xs space-y-3 hover:border-emerald-200 transition-all"
          >
            {/* Top row: Name, Code & Status Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">
                  {prod.name}
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60 uppercase">
                  {prod.code}
                </span>
              </div>

              {getStatusBadge(prod.statusType, prod.status)}
            </div>

            {/* Subtitle description */}
            <p className="text-[11.5px] text-gray-400 truncate">
              {prod.desc}
            </p>

            {/* 3-Column Info Matrix (Expiration, Stock Qty, Price) inside subtle pill container */}
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50/70 rounded-xl border border-slate-100/60">
              {/* Expiration */}
              <div>
                <span className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-tight">
                  Expiration
                </span>
                <span className="block text-xs font-bold text-gray-800 mt-0.5">
                  {prod.expiration}
                </span>
                {prod.expiryBadge === "Expired" && (
                  <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-rose-100 text-rose-700">
                    Expired
                  </span>
                )}
                {prod.expiryBadge === "Expiring Soon" && (
                  <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800">
                    Expiring Soon
                  </span>
                )}
              </div>

              {/* Stock Qty */}
              <div>
                <span className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-tight">
                  Stock Qty
                </span>
                <span className={`block text-xs font-black mt-0.5 ${prod.stockColor}`}>
                  {prod.stockQty}
                </span>
              </div>

              {/* Price */}
              <div className="text-right">
                <span className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-tight">
                  Price
                </span>
                <span className="block text-xs font-black text-gray-900 mt-0.5">
                  {prod.price}
                </span>
              </div>
            </div>

            {/* Action Buttons: (Active: View Details + Archive | Archive: Restore + Delete) */}
            <div className="flex items-center gap-2.5 pt-1">
              {activeTab === "active" ? (
                <>
                  {/* View Details Button */}
                  <button
                    onClick={() => setSelectedProduct(prod)}
                    className="flex-1 py-2 px-3 bg-white hover:bg-gray-50 active:scale-[0.99] border border-gray-200/90 text-gray-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Eye size={14} className="text-gray-500" />
                    <span>View Details</span>
                  </button>

                  {/* Archive Button */}
                  <button
                    onClick={() => handleArchiveToggle(prod.id)}
                    className="flex-1 py-2 px-3 bg-white hover:bg-amber-50/60 active:scale-[0.99] border border-amber-300/80 text-amber-600 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Archive size={14} className="text-amber-500" />
                    <span>Archive</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Restore Button (Green border) */}
                  <button
                    onClick={() => handleArchiveToggle(prod.id)}
                    className="flex-1 py-2 px-3 bg-white hover:bg-emerald-50/60 active:scale-[0.99] border border-[#0d6928] text-[#0d6928] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RotateCcw size={14} className="text-[#0d6928]" />
                    <span>Restore</span>
                  </button>

                  {/* Delete Button (Red border) */}
                  <button
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="flex-1 py-2 px-3 bg-white hover:bg-rose-50/60 active:scale-[0.99] border border-rose-400 text-rose-600 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Trash2 size={14} className="text-rose-500" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── 6. Pagination / Load More Section (Figma Exact) ───────────── */}
      <div className="pt-2 text-center space-y-2">
        <p className="text-xs font-medium text-gray-500">
          Showing {displayedProducts.length} of {filteredProducts.length} {activeTab === "archive" ? "archived " : ""}products
        </p>

        {visibleCount < filteredProducts.length && (
          <button
            onClick={() => setVisibleCount((prev) => prev + 5)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-[#0d6928] transition-colors cursor-pointer py-1"
          >
            <RotateCcw size={13} strokeWidth={2.4} />
            <span>Load More Products</span>
          </button>
        )}
      </div>

      {/* ── 7. View Details Modal ────────────────────────────────────── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-gray-100 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-black text-gray-900">
                  {selectedProduct.name} Details
                </h3>
                <span className="text-[11px] font-bold text-emerald-700">
                  Batch Code: {selectedProduct.code}
                </span>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Details List */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-50 text-gray-600">
                <span>Category</span>
                <span className="font-bold text-gray-900">{selectedProduct.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50 text-gray-600">
                <span>Stock On Hand</span>
                <span className={`font-black ${selectedProduct.stockColor}`}>
                  {selectedProduct.stockQty}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50 text-gray-600">
                <span>Retail Price</span>
                <span className="font-black text-gray-900">{selectedProduct.price}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50 text-gray-600">
                <span>Expiration Date</span>
                <span className="font-bold text-gray-900">{selectedProduct.expiration}</span>
              </div>
              <div className="flex justify-between py-1 text-gray-600">
                <span>Status</span>
                <span>{getStatusBadge(selectedProduct.statusType, selectedProduct.status)}</span>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  handleArchiveToggle(selectedProduct.id);
                  setSelectedProduct(null);
                }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
              >
                {selectedProduct.isArchived ? "Restore to Active" : "Archive Product"}
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
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
