import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Search,
  RotateCcw,
  ChevronDown,
  Star,
  Plus,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  X,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Eye,
  Check,
  ShieldCheck,
  Store,
  MapPin,
  Package,
} from "lucide-react";
import ConsumerNavbar from "../../Components/Major-Components/ConsumerNavbar";

// ============================================================
// MOCK DATA - 12 WISHLIST PRODUCTS
// ============================================================
const INITIAL_WISHLIST_ITEMS = [
  {
    id: "wish-1",
    name: "Premium Dinorado Rice",
    spec: "Dinorado • Premium Grade • 25 kg sack",
    variety: "Dinorado",
    grade: "Premium Grade",
    weight: "25 kg sack",
    retailer: "Greenfield Rice Store",
    rating: 4.8,
    reviewsCount: 126,
    price: 1450.0,
    pricePerKg: "₱58.00/kg",
    priceChange: "↓ ₱50 since you saved this",
    priceChangeType: "drop",
    stockStatus: "IN STOCK",
    availableStock: "18 bags available",
    inStock: true,
    bagColor: "bg-amber-100/70 border-amber-300 text-amber-900",
    bagTag: "DINORADO 25 KG",
    description: "Aromatic pink-tinged native Philippine rice grain known for its soft, sweet, and sticky texture when freshly cooked.",
    location: "Caloocan City",
    savedDate: "Sep 07, 2026",
  },
  {
    id: "wish-2",
    name: "NSIC Rc 222 Rice",
    spec: "NSIC Rc 222 • Grade A • 50 kg sack",
    variety: "NSIC Rc 222",
    grade: "Grade A",
    weight: "50 kg sack",
    retailer: "Bulacan Grain Milling",
    rating: 4.7,
    reviewsCount: 94,
    price: 2450.0,
    pricePerKg: "₱49.00/kg",
    priceChange: "Stable benchmark price",
    priceChangeType: "stable",
    stockStatus: "IN STOCK",
    availableStock: "32 bags available",
    inStock: true,
    bagColor: "bg-blue-100/70 border-blue-300 text-blue-900",
    bagTag: "RC 222 50 KG",
    description: "High-yielding certified inbred rice variety tested for consistent kernel length, excellent milling recovery, and high volume expansion.",
    location: "Bulacan",
    savedDate: "Sep 06, 2026",
  },
  {
    id: "wish-3",
    name: "Sinandomeng Rice",
    spec: "Sinandomeng • Well-Milled • 25 kg sack",
    variety: "Sinandomeng",
    grade: "Well-Milled",
    weight: "25 kg sack",
    retailer: "FarmMart",
    rating: 4.6,
    reviewsCount: 78,
    price: 1300.0,
    pricePerKg: "₱52.00/kg",
    priceChange: "↑ ₱25 since you saved this",
    priceChangeType: "rise",
    stockStatus: "LIMITED STOCK",
    availableStock: "Only 3 bags left!",
    inStock: true,
    bagColor: "bg-emerald-100/70 border-emerald-300 text-emerald-900",
    bagTag: "SINANDOMENG 25 KG",
    description: "Traditional Filipino household favorite variety with soft white grains that remain fluffy even after reheating.",
    location: "Quezon City",
    savedDate: "Sep 05, 2026",
  },
  {
    id: "wish-4",
    name: "Premium Jasmine Rice",
    spec: "Jasmine • Premium Grade • 25 kg sack",
    variety: "Jasmine",
    grade: "Premium Grade",
    weight: "25 kg sack",
    retailer: "North Caloocan Rice Store",
    rating: 4.9,
    reviewsCount: 152,
    price: 1525.0,
    pricePerKg: "₱61.00/kg",
    priceChange: "Notify me when restocked",
    priceChangeType: "notify",
    stockStatus: "OUT OF STOCK",
    availableStock: "Temporarily Out of Stock",
    inStock: false,
    bagColor: "bg-gray-100 border-gray-300 text-gray-700",
    bagTag: "JASMINE 25 KG",
    description: "Long-grain fragrant rice from Northern Luzon certified growers, providing authentic pandan-like natural aroma.",
    location: "North Caloocan",
    savedDate: "Sep 04, 2026",
  },
  {
    id: "wish-5",
    name: "Special NSIC Rc 160 Rice",
    spec: "NSIC Rc 160 • Grade A • 50 kg sack",
    variety: "NSIC Rc 160",
    grade: "Grade A",
    weight: "50 kg sack",
    retailer: "Central Luzon Agritech",
    rating: 4.8,
    reviewsCount: 84,
    price: 2525.0,
    pricePerKg: "₱50.50/kg",
    priceChange: "↓ ₱75 since you saved this",
    priceChangeType: "drop",
    stockStatus: "IN STOCK",
    availableStock: "45 bags available",
    inStock: true,
    bagColor: "bg-teal-100/70 border-teal-300 text-teal-900",
    bagTag: "RC 160 50 KG",
    description: "Premium intermediate amylose inbred rice producing soft cooked rice favored by food caterers and large restaurants.",
    location: "Pampanga",
    savedDate: "Sep 03, 2026",
  },
  {
    id: "wish-6",
    name: "Organic Brown Rice",
    spec: "Specialty Rice • Unpolished • 10 kg pack",
    variety: "Organic Brown",
    grade: "Unpolished",
    weight: "10 kg pack",
    retailer: "Healthy Harvest Hub",
    rating: 4.9,
    reviewsCount: 66,
    price: 720.0,
    pricePerKg: "₱72.00/kg",
    priceChange: "Direct from Laguna Farmers",
    priceChangeType: "stable",
    stockStatus: "IN STOCK",
    availableStock: "28 bags available",
    inStock: true,
    bagColor: "bg-amber-200/80 border-amber-400 text-amber-950",
    bagTag: "BROWN RICE 10 KG",
    description: "100% whole grain organic unpolished rice packed with dietary fiber, B-vitamins, and essential minerals.",
    location: "Laguna / Metro Manila",
    savedDate: "Sep 02, 2026",
  },
  {
    id: "wish-7",
    name: "Premium Red Cargo Rice",
    spec: "Specialty Grain • Grade A • 25 kg sack",
    variety: "Red Cargo",
    grade: "Grade A",
    weight: "25 kg sack",
    retailer: "Greenfield Rice Store",
    rating: 4.7,
    reviewsCount: 42,
    price: 1650.0,
    pricePerKg: "₱66.00/kg",
    priceChange: "↓ ₱30 since you saved this",
    priceChangeType: "drop",
    stockStatus: "IN STOCK",
    availableStock: "14 bags available",
    inStock: true,
    bagColor: "bg-rose-100/70 border-rose-300 text-rose-950",
    bagTag: "RED CARGO 25 KG",
    description: "Nutritious red pericarp rice with pleasant nutty flavor, rich anthocyanin antioxidants, and firmer mouthfeel.",
    location: "Caloocan City",
    savedDate: "Aug 30, 2026",
  },
  {
    id: "wish-8",
    name: "Malagkit Glutinous Rice",
    spec: "Malagkit • Premium White • 25 kg sack",
    variety: "Malagkit",
    grade: "Premium White",
    weight: "25 kg sack",
    retailer: "Bulacan Grain Milling",
    rating: 4.8,
    reviewsCount: 110,
    price: 1750.0,
    pricePerKg: "₱70.00/kg",
    priceChange: "Perfect for native delicacies",
    priceChangeType: "stable",
    stockStatus: "LIMITED STOCK",
    availableStock: "Only 4 bags left!",
    inStock: true,
    bagColor: "bg-slate-100 border-slate-300 text-slate-800",
    bagTag: "MALAGKIT 25 KG",
    description: "Authentic sticky glutinous rice essential for traditional kakanin, biko, champorado, and holiday delicacies.",
    location: "Bulacan",
    savedDate: "Aug 29, 2026",
  },
  {
    id: "wish-9",
    name: "Angelica White Rice",
    spec: "Angelica • Well-Milled • 25 kg sack",
    variety: "Angelica",
    grade: "Well-Milled",
    weight: "25 kg sack",
    retailer: "Golden Grains Trading",
    rating: 4.6,
    reviewsCount: 54,
    price: 1250.0,
    pricePerKg: "₱50.00/kg",
    priceChange: "Stable benchmark price",
    priceChangeType: "stable",
    stockStatus: "IN STOCK",
    availableStock: "22 bags available",
    inStock: true,
    bagColor: "bg-yellow-100/70 border-yellow-300 text-yellow-900",
    bagTag: "ANGELICA 25 KG",
    description: "Versatile, soft cooking table rice suitable for daily household consumption with low chalkiness.",
    location: "Quezon City",
    savedDate: "Aug 25, 2026",
  },
  {
    id: "wish-10",
    name: "Japanese Short Grain Rice",
    spec: "Japonica • Premium White • 25 kg sack",
    variety: "Japonica",
    grade: "Premium White",
    weight: "25 kg sack",
    retailer: "Gourmet Rice Selection Hub",
    rating: 4.9,
    reviewsCount: 88,
    price: 2150.0,
    pricePerKg: "₱86.00/kg",
    priceChange: "↓ ₱100 since you saved this",
    priceChangeType: "drop",
    stockStatus: "IN STOCK",
    availableStock: "15 bags available",
    inStock: true,
    bagColor: "bg-indigo-100/70 border-indigo-300 text-indigo-900",
    bagTag: "JAPONICA 25 KG",
    description: "Short-grain sushi rice variety with high moisture retention, ideal for Japanese cuisine and donburi bowls.",
    location: "San Juan",
    savedDate: "Aug 22, 2026",
  },
  {
    id: "wish-11",
    name: "Organic Black Rice",
    spec: "Specialty Grain • Heirloom • 10 kg pack",
    variety: "Black Rice",
    grade: "Heirloom",
    weight: "10 kg pack",
    retailer: "Cordillera Heirloom Hub",
    rating: 4.9,
    reviewsCount: 39,
    price: 850.0,
    pricePerKg: "₱85.00/kg",
    priceChange: "Direct from Mountain Province",
    priceChangeType: "stable",
    stockStatus: "LIMITED STOCK",
    availableStock: "Only 5 bags left!",
    inStock: true,
    bagColor: "bg-purple-100/70 border-purple-300 text-purple-950",
    bagTag: "BLACK RICE 10 KG",
    description: "Heirloom organic forbidden black rice rich in antioxidants, iron, and rich nutty sweetness.",
    location: "Baguio / Metro Manila",
    savedDate: "Aug 18, 2026",
  },
  {
    id: "wish-12",
    name: "Maharlika Premium Rice",
    spec: "Maharlika • Grade A • 50 kg sack",
    variety: "Maharlika",
    grade: "Grade A",
    weight: "50 kg sack",
    retailer: "Nueva Ecija Rice Producers",
    rating: 4.7,
    reviewsCount: 71,
    price: 2480.0,
    pricePerKg: "₱49.60/kg",
    priceChange: "Stable benchmark price",
    priceChangeType: "stable",
    stockStatus: "IN STOCK",
    availableStock: "40 bags available",
    inStock: true,
    bagColor: "bg-orange-100/70 border-orange-300 text-orange-950",
    bagTag: "MAHARLIKA 50 KG",
    description: "Reliable commercial rice sack with high expansion ratio and clean white milled appearance.",
    location: "Nueva Ecija",
    savedDate: "Aug 15, 2026",
  },
];

export default function ConsumerWishlist() {
  const navigate = useNavigate();

  // Wishlist items state
  const [wishlistItems, setWishlistItems] = useState(INITIAL_WISHLIST_ITEMS);
  const [cartCount, setCartCount] = useState(3);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterVariety, setFilterVariety] = useState("All");
  const [sortBy, setSortBy] = useState("Recently Saved");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals & Feedback
  const [productDetailsModal, setProductDetailsModal] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterStatus("All");
    setFilterVariety("All");
    setSortBy("Recently Saved");
    setCurrentPage(1);
  };

  // Filtered and Sorted Items
  const filteredItems = useMemo(() => {
    return wishlistItems
      .filter((item) => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.retailer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.spec.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          filterStatus === "All" || item.stockStatus === filterStatus;

        const matchesVariety =
          filterVariety === "All" ||
          item.variety.toLowerCase().includes(filterVariety.toLowerCase());

        return matchesSearch && matchesStatus && matchesVariety;
      })
      .sort((a, b) => {
        if (sortBy === "Price: Low to High") return a.price - b.price;
        if (sortBy === "Price: High to Low") return b.price - a.price;
        if (sortBy === "Highest Rated") return b.rating - a.rating;
        return 0; // default recently saved
      });
  }, [wishlistItems, searchQuery, filterStatus, filterVariety, sortBy]);

  // Paginated Slice
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  // Remove Item
  const handleRemoveItem = (id, name) => {
    setWishlistItems((prev) => prev.filter((item) => item.id !== id));
    showToast(`Removed "${name}" from your wishlist.`);
  };

  // Add Single Item to Cart
  const handleAddToCart = (item) => {
    if (!item.inStock) return;
    setCartCount((c) => c + 1);
    showToast(`Added 1 sack of "${item.name}" to your cart!`);
  };

  // Add All Available Items to Cart
  const handleAddAllAvailable = () => {
    const availableItems = wishlistItems.filter((i) => i.inStock);
    if (availableItems.length === 0) {
      showToast("No in-stock items currently available to add.");
      return;
    }
    setCartCount((c) => c + availableItems.length);
    showToast(`Added ${availableItems.length} available items to your cart!`);
  };

  return (
    <div className="consumer-page min-h-screen bg-[#F8FAFC] text-gray-800 flex flex-col font-sans">
      {/* Top Global Consumer Navbar */}
      <ConsumerNavbar
        wishlistCount={wishlistItems.length}
        cartCount={cartCount}
        onWishlistClick={() => navigate("/consumer/wishlist")}
      />

      {/* Main Page Container */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 flex-1">
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 font-medium">
          <span>Wishlist</span>
        </div>

        {/* Page Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              My Wishlist
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Keep track of products you've saved and add them to your cart when you're ready to buy.
            </p>
          </div>

          {/* Top Right Action Button: + Add Available to Cart */}
          <button
            onClick={handleAddAllAvailable}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00580C] hover:bg-[#0c432f] text-white text-xs sm:text-sm font-semibold shadow-xs transition self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Available to Cart</span>
          </button>
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search saved product, rice variety, or seller..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00580C]/20 focus:border-[#00580C]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Dropdown 1: All Statuses */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="IN STOCK">In Stock</option>
                <option value="LIMITED STOCK">Limited Stock</option>
                <option value="OUT OF STOCK">Out of Stock</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>

            {/* Dropdown 2: All Varieties */}
            <div className="relative">
              <select
                value={filterVariety}
                onChange={(e) => {
                  setFilterVariety(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
              >
                <option value="All">All Varieties</option>
                <option value="Dinorado">Dinorado</option>
                <option value="NSIC Rc 222">NSIC Rc 222</option>
                <option value="Sinandomeng">Sinandomeng</option>
                <option value="Jasmine">Jasmine</option>
                <option value="NSIC Rc 160">NSIC Rc 160</option>
                <option value="Organic Brown">Organic Brown</option>
                <option value="Red Cargo">Red Cargo</option>
                <option value="Malagkit">Malagkit</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>

            {/* Dropdown 3: Sort by & Reset */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full appearance-none pl-3 pr-7 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
                >
                  <option value="Recently Saved">Sort by: Recently Saved</option>
                  <option value="Price: Low to High">Price: Low to High</option>
                  <option value="Price: High to Low">Price: High to Low</option>
                  <option value="Highest Rated">Highest Rated</option>
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-xs text-gray-600 font-medium transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Sub-text Row */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Showing {paginatedItems.length} of {wishlistItems.length} saved items • Prices synced with live supplier rates
            </span>
            <span className="font-medium text-gray-500">Active View: Grid</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* WISHLIST PRODUCTS GRID (4 COLUMNS) */}
        {/* ============================================================ */}
        {paginatedItems.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center text-gray-400 space-y-3">
            <Heart size={44} className="mx-auto text-gray-300" />
            <h3 className="text-base font-bold text-gray-800">No Saved Items Found</h3>
            <p className="text-xs max-w-sm mx-auto">
              You haven't added any products matching your filters to your wishlist yet.
            </p>
            <button
              onClick={() => navigate("/consumer/marketplace")}
              className="mt-3 px-4 py-2 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Explore Marketplace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in duration-150">
            {paginatedItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200"
              >
                <div>
                  {/* Top Row: Stock Badge & Heart Button */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        item.stockStatus === "IN STOCK"
                          ? "bg-teal-50 text-teal-700 border border-teal-200"
                          : item.stockStatus === "LIMITED STOCK"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}
                    >
                      {item.stockStatus}
                    </span>

                    {/* Red Filled Heart (Remove from wishlist) */}
                    <button
                      onClick={() => handleRemoveItem(item.id, item.name)}
                      className="p-1 rounded-full text-red-500 hover:bg-red-50 transition cursor-pointer"
                      title="Remove from Wishlist"
                    >
                      <Heart size={16} className="fill-red-500 text-red-500" />
                    </button>
                  </div>

                  {/* Product Bag Graphic Container */}
                  <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 flex items-center justify-center mb-3">
                    <div
                      className={`w-20 h-24 rounded-lg border-2 flex flex-col items-center justify-center p-2 text-center shadow-2xs ${item.bagColor}`}
                    >
                      <span className="w-4 h-1 bg-current opacity-30 rounded-full mb-2" />
                      <p className="text-[9px] font-bold tracking-tight uppercase leading-tight">
                        {item.bagTag}
                      </p>
                      <span className="text-[7px] tracking-widest mt-1 opacity-70 uppercase font-semibold">
                        Certified Grain
                      </span>
                    </div>
                  </div>

                  {/* Category / Specs subtitle */}
                  <p className="text-[10px] text-gray-400 font-medium truncate">
                    {item.spec}
                  </p>

                  {/* Product Title */}
                  <h3 className="text-sm font-bold text-gray-900 mt-0.5 tracking-tight truncate">
                    {item.name}
                  </h3>

                  {/* Retailer & Rating Row */}
                  <div className="flex items-center justify-between text-xs mt-1 text-gray-500">
                    <span className="truncate text-[11px]">{item.retailer}</span>
                    <div className="flex items-center gap-1 font-semibold text-gray-800 text-[11px] shrink-0">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span>{item.rating}</span>
                      <span className="text-gray-400 font-normal">
                        ({item.reviewsCount})
                      </span>
                    </div>
                  </div>

                  {/* Price & Change Sub-text */}
                  <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-bold text-gray-900">
                        ₱{item.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-gray-400">{item.pricePerKg}</span>
                    </div>

                    {/* Price change badge */}
                    {item.priceChangeType === "drop" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {item.priceChange}
                      </span>
                    ) : item.priceChangeType === "rise" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {item.priceChange}
                      </span>
                    ) : (
                      <p className="text-[10px] text-gray-400">
                        {item.priceChange}
                      </p>
                    )}

                    <p
                      className={`text-[10px] font-medium pt-0.5 ${
                        item.stockStatus === "LIMITED STOCK"
                          ? "text-amber-600"
                          : item.stockStatus === "OUT OF STOCK"
                          ? "text-red-500"
                          : "text-gray-400"
                      }`}
                    >
                      {item.availableStock}
                    </p>
                  </div>
                </div>

                {/* Card Bottom: Add to Cart Button & View Details / Remove Links */}
                <div className="mt-4 space-y-2">
                  {item.inStock ? (
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="w-full py-2 rounded-xl bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add to Cart</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl bg-gray-100 text-gray-400 text-xs font-semibold flex items-center justify-center gap-1 cursor-not-allowed"
                    >
                      <span>Out of Stock</span>
                    </button>
                  )}

                  {/* Footer Links: View Details | Remove */}
                  <div className="flex items-center justify-between text-[11px] pt-1 text-gray-400">
                    <button
                      onClick={() => setProductDetailsModal(item)}
                      className="text-gray-500 hover:text-gray-900 underline font-medium cursor-pointer"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id, item.name)}
                      className="text-gray-400 hover:text-red-600 font-medium cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================ */}
        {/* PAGINATION FOOTER */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-gray-500 border-t border-gray-200">
          <span>
            Showing {(currentPage - 1) * itemsPerPage + 1}–
            {Math.min(currentPage * itemsPerPage, filteredItems.length)} of{" "}
            {wishlistItems.length} saved items
          </span>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  currentPage === pageNum
                    ? "bg-[#00580C] text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* PRODUCT DETAILS PREVIEW MODAL */}
      {/* ============================================================ */}
      {productDetailsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                  {productDetailsModal.stockStatus}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">
                  {productDetailsModal.name}
                </h3>
                <p className="text-xs text-gray-400">
                  {productDetailsModal.spec}
                </p>
              </div>
              <button
                onClick={() => setProductDetailsModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {productDetailsModal.description}
            </p>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Retailer / Hub:</span>
                <span className="font-bold text-gray-900">
                  {productDetailsModal.retailer}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Origin Location:</span>
                <span className="font-medium text-gray-800">
                  {productDetailsModal.location}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Price per Sack:</span>
                <span className="font-bold text-gray-900">
                  ₱{productDetailsModal.price.toFixed(2)} ({productDetailsModal.pricePerKg})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Availability:</span>
                <span className="font-semibold text-emerald-700">
                  {productDetailsModal.availableStock}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setProductDetailsModal(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
              {productDetailsModal.inStock && (
                <button
                  onClick={() => {
                    handleAddToCart(productDetailsModal);
                    setProductDetailsModal(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#00580C] hover:bg-[#0c432f] rounded-xl cursor-pointer shadow-xs"
                >
                  Add to Cart
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
