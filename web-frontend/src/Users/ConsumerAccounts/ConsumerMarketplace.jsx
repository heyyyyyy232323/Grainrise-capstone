import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingCart,
  Bell,
  ChevronDown,
  Star,
  RotateCcw,
  BarChart2,
  LogOut,
  CircleUserRound,
  Package,
  X,
  Ban,
  Clock,
  LayoutGrid,
  List,
  ShieldCheck,
} from "lucide-react";
import Logo from "../../assets/Logo.png";
import ConsumerNavbar from "../../Components/Major-Components/ConsumerNavbar";

// ============================================================
// MOCK DATA & CONSTANTS (MATCHING FIGMA SPECIFICATIONS)
// ============================================================

const NAV_LINKS = [
  { label: "Home", path: "/consumer/home" },
  { label: "Marketplace", path: "/consumer/marketplace" },
  { label: "Orders", path: "/consumer/orders" },
  { label: "Promotions & Rewards", path: "/consumer/promotions" },
  { label: "Market Prices", path: "/consumer/market-prices" },
];

const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: "Premium Dinorado Rice",
    varietyDisplay: "DINORADO",
    weightDisplay: "25 KG",
    categoryGrade: "Dinorado • Premium Grade",
    variety: "Dinorado",
    grade: "Premium Grade",
    packageSize: "25 kg",
    seller: "Greenfield Rice Store",
    sellerType: "Retailer",
    location: "Caloocan City",
    price: 1450.0,
    pricePerKg: "₱58.00/kg",
    rawPricePerKg: 58,
    stock: 18,
    stockText: "18 bags left",
    stockStatus: "In Stock",
    stockType: "in_stock",
    rating: 4.8,
    reviews: 126,
    theme: "dinorado",
    productType: "Premium Rice",
    grainType: "Long Grain",
    millingDegree: "Well-Milled",
    moistureContent: "13.5%",
    brokenRate: "< 5%",
    origin: "Nueva Ecija, Philippines",
    description:
      "Fragrant, naturally soft, and fluffy texture with a distinctive pinkish hue. Highly sought after for home meals and fine dining.",
  },
  {
    id: 2,
    name: "NSIC Rc 222 Rice",
    varietyDisplay: "RC 222",
    weightDisplay: "50 KG",
    categoryGrade: "NSIC Rc 222 • Grade A",
    variety: "NSIC Rc 222",
    grade: "Grade A",
    packageSize: "50 kg",
    seller: "Bulacan Grain Milling",
    sellerType: "Miller / Supplier",
    location: "Bulacan",
    price: 2450.0,
    pricePerKg: "₱49.00/kg",
    rawPricePerKg: 49,
    stock: 32,
    stockText: "32 bags left",
    stockStatus: "In Stock",
    stockType: "in_stock",
    rating: 4.7,
    reviews: 94,
    theme: "rc222",
    productType: "Milled Rice",
    grainType: "Medium Grain",
    millingDegree: "Grade A Milled",
    moistureContent: "14.0%",
    brokenRate: "< 8%",
    origin: "Bulacan, Central Luzon",
    description:
      "High yield commercial rice variety known for uniform kernel shape, reliable cooking consistency, and affordability for bulk consumption.",
  },
  {
    id: 3,
    name: "Sinandomeng Rice",
    varietyDisplay: "SINANDOMENG",
    weightDisplay: "25 KG",
    categoryGrade: "Sinandomeng • Well-Milled",
    variety: "Sinandomeng",
    grade: "Well-Milled",
    packageSize: "25 kg",
    seller: "GrainMart",
    sellerType: "Retailer",
    location: "Quezon City",
    price: 1300.0,
    pricePerKg: "₱52.00/kg",
    rawPricePerKg: 52,
    stock: 9,
    stockText: "9 bags left",
    stockStatus: "Limited Stock",
    stockType: "limited",
    rating: 4.6,
    reviews: 78,
    theme: "sinandomeng",
    productType: "Milled Rice",
    grainType: "Long Grain",
    millingDegree: "Well-Milled",
    moistureContent: "13.8%",
    brokenRate: "< 7%",
    origin: "Tarlac, Philippines",
    description:
      "Traditional Filipino household staple. Fluffy when warm, mild aroma, and versatile pairing with any local dish.",
  },
  {
    id: 4,
    name: "Premium Jasmine Rice",
    varietyDisplay: "JASMINE",
    weightDisplay: "25 KG",
    categoryGrade: "Jasmine • Premium Grade",
    variety: "Jasmine",
    grade: "Premium Grade",
    packageSize: "25 kg",
    seller: "North Caloocan Rice Store",
    sellerType: "Retailer",
    location: "Caloocan City",
    price: 1525.0,
    pricePerKg: "₱61.00/kg",
    rawPricePerKg: 61,
    stock: 21,
    stockText: "21 bags left",
    stockStatus: "In Stock",
    stockType: "in_stock",
    rating: 4.9,
    reviews: 152,
    theme: "jasmine",
    productType: "Premium Rice",
    grainType: "Long Grain Fragrant",
    millingDegree: "Extra Well-Milled",
    moistureContent: "13.2%",
    brokenRate: "< 3%",
    origin: "Pangasinan, Philippines",
    description:
      "Silky smooth texture with naturally sweet floral fragrance. Superior aroma retention and pearl-white appearance.",
  },
  {
    id: 5,
    name: "NSIC Rc 160 Special",
    varietyDisplay: "RC 160",
    weightDisplay: "50 KG",
    categoryGrade: "NSIC Rc 160 • Well-Milled",
    variety: "NSIC Rc 160",
    grade: "Well-Milled",
    packageSize: "50 kg",
    seller: "Central Luzon Miller Co.",
    sellerType: "Miller / Supplier",
    location: "Nueva Ecija",
    price: 2350.0,
    pricePerKg: "₱47.00/kg",
    rawPricePerKg: 47,
    stock: 45,
    stockText: "45 bags left",
    stockStatus: "In Stock",
    stockType: "in_stock",
    rating: 4.7,
    reviews: 63,
    theme: "rc160",
    productType: "Milled Rice",
    grainType: "Long Grain",
    millingDegree: "Well-Milled",
    moistureContent: "13.9%",
    brokenRate: "< 6%",
    origin: "Nueva Ecija, Central Luzon",
    description:
      "Excellent cooking quality, soft when cooked, and remains tender even after cooling. Popular among eateries and catering businesses.",
  },
  {
    id: 6,
    name: "Brown Rice Organic",
    varietyDisplay: "ORGANIC",
    weightDisplay: "10 KG",
    categoryGrade: "Organic Brown • Whole Grain",
    variety: "Organic Brown",
    grade: "Whole Grain",
    packageSize: "10 kg",
    seller: "Isabela Agri-Ventures",
    sellerType: "Miller / Supplier",
    location: "Isabela",
    price: 720.0,
    pricePerKg: "₱72.00/kg",
    rawPricePerKg: 72,
    stock: 14,
    stockText: "14 bags left",
    stockStatus: "In Stock",
    stockType: "in_stock",
    rating: 4.9,
    reviews: 88,
    theme: "organic",
    productType: "Organic Rice",
    grainType: "Unpolished Whole Grain",
    millingDegree: "Dehulled Whole Bran",
    moistureContent: "13.0%",
    brokenRate: "< 4%",
    origin: "Isabela Valley, Philippines",
    description:
      "Nutrient-dense whole grain rice packed with natural fiber, B-vitamins, and minerals. Earthy flavor with wholesome chewy texture.",
  },
  {
    id: 7,
    name: "Regular Milled Rice",
    varietyDisplay: "RC 10",
    weightDisplay: "25 KG",
    categoryGrade: "Rc 10 • Regular Milled",
    variety: "Rc 10",
    grade: "Regular Milled",
    packageSize: "25 kg",
    seller: "Baliuag Rice Center",
    sellerType: "Retailer",
    location: "Bulacan",
    price: 1050.0,
    pricePerKg: "₱42.00/kg",
    rawPricePerKg: 42,
    stock: 0,
    stockText: "0 bags available",
    stockStatus: "Out of Stock",
    stockType: "out_of_stock",
    rating: 4.3,
    reviews: 41,
    theme: "rc10",
    productType: "Milled Rice",
    grainType: "Medium Grain",
    millingDegree: "Regular Milled",
    moistureContent: "14.2%",
    brokenRate: "< 15%",
    origin: "Bulacan, Philippines",
    description:
      "Economical everyday choice offering good sustenance and volume. Ideal for budget-conscious families and community kitchens.",
  },
  {
    id: 8,
    name: "Premium Malagkit (Glutinous)",
    varietyDisplay: "MALAGKIT",
    weightDisplay: "10 KG",
    categoryGrade: "Malagkit • Special Grade",
    variety: "Malagkit",
    grade: "Special Grade",
    packageSize: "10 kg",
    seller: "Golden Fields Retail",
    sellerType: "Retailer",
    location: "Manila",
    price: 850.0,
    pricePerKg: "₱85.00/kg",
    rawPricePerKg: 85,
    stock: 6,
    stockText: "6 bags left",
    stockStatus: "Limited Stock",
    stockType: "limited",
    rating: 4.8,
    reviews: 53,
    theme: "malagkit",
    productType: "Glutinous Rice",
    grainType: "Sticky / Waxy Short Grain",
    millingDegree: "Special Grade Polish",
    moistureContent: "12.8%",
    brokenRate: "< 4%",
    origin: "Laguna, Philippines",
    description:
      "Sweet glutinous sticky rice perfect for Filipino traditional kakanin like biko, suman, champorado, and bibingka.",
  },
];

// ============================================================
// RICE SACK MOCKUP COMPONENT
// ============================================================

function RiceSackCard({ variety, weight, theme = "dinorado" }) {
  const themes = {
    dinorado: {
      card: "bg-[#FFFDF4] border-[#FCE788] text-[#8C5E2D]",
      accent: "bg-[#EAB308]",
      textTitle: "text-[#8C5E2D]",
    },
    rc222: {
      card: "bg-[#CBD5E1] border-[#94A3B8] text-[#475569]",
      accent: "bg-[#64748B]",
      textTitle: "text-[#334155]",
    },
    sinandomeng: {
      card: "bg-[#F0FDF4] border-[#BBF7D0] text-[#00580C]",
      accent: "bg-[#00580C]",
      textTitle: "text-[#00580C]",
    },
    jasmine: {
      card: "bg-[#F0F9FF] border-[#BAE6FD] text-[#0284C7]",
      accent: "bg-[#38BDF8]",
      textTitle: "text-[#0284C7]",
    },
    rc160: {
      card: "bg-[#F1F5F9] border-[#CBD5E1] text-[#475569]",
      accent: "bg-[#94A3B8]",
      textTitle: "text-[#334155]",
    },
    organic: {
      card: "bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]",
      accent: "bg-[#F59E0B]",
      textTitle: "text-[#B45309]",
    },
    rc10: {
      card: "bg-[#CBD5E1] border-[#94A3B8] text-[#64748B]",
      accent: "bg-[#94A3B8]",
      textTitle: "text-[#64748B]",
    },
    malagkit: {
      card: "bg-[#FAF5FF] border-[#E9D5FF] text-[#7E22CE]",
      accent: "bg-[#C084FC]",
      textTitle: "text-[#7E22CE]",
    },
  };

  const style = themes[theme] || themes.dinorado;

  return (
    <div
      className={`w-28 h-36 rounded-xl border-2 flex flex-col items-center justify-center p-3 relative shadow-sm select-none transition-transform duration-200 group-hover:scale-105 ${style.card}`}
    >
      {/* Sack top stitch accent */}
      <div className="w-12 h-1 rounded-full bg-black/10 mb-auto" />

      {/* Sack Label Content */}
      <div className="flex flex-col items-center justify-center my-auto text-center">
        <span
          className={`text-[11px] font-black tracking-widest uppercase leading-tight ${style.textTitle}`}
        >
          {variety}
        </span>
        <div className={`w-6 h-0.5 my-1.5 rounded-full ${style.accent}`} />
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          {weight}
        </span>
      </div>

      {/* Sack bottom stitch line */}
      <div className="w-10 h-0.5 border-b border-dashed border-black/20 mt-auto" />
    </div>
  );
}

// ============================================================
// MAIN COMPONENT: ConsumerMarketplace
// ============================================================

export default function ConsumerMarketplace() {
  const navigate = useNavigate();

  // Navigation State
  const [profileOpen, setProfileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(3);
  const [wishlistCount, setWishlistCount] = useState(12);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [productType, setProductType] = useState("All Products");
  const [riceVariety, setRiceVariety] = useState("All Varieties");
  const [qualityGrade, setQualityGrade] = useState("All Grades");
  const [packagingSize, setPackagingSize] = useState("All Sizes");
  const [sellerLocation, setSellerLocation] = useState("All Locations");
  const [availability, setAvailability] = useState("All Availability");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sellerType, setSellerType] = useState("All Sellers");
  const [ratingFilter, setRatingFilter] = useState("All Ratings");

  // Sorting & View States
  const [sortBy, setSortBy] = useState("Recommended");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [currentPage, setCurrentPage] = useState(1);

  // Interactivity States
  const [favorites, setFavorites] = useState({});
  const [compareList, setCompareList] = useState([
    INITIAL_PRODUCTS[0], // Pre-selected as in Figma screenshot
    INITIAL_PRODUCTS[1], // Pre-selected as in Figma screenshot
  ]);
  const [detailsModalProduct, setDetailsModalProduct] = useState(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Toggle Favorite
  const toggleFavorite = (id, name) => {
    setFavorites((prev) => {
      const next = !prev[id];
      if (next) {
        setWishlistCount((c) => c + 1);
        showToast(`Added "${name}" to Wishlist!`);
      } else {
        setWishlistCount((c) => Math.max(0, c - 1));
        showToast(`Removed "${name}" from Wishlist.`);
      }
      return { ...prev, [id]: next };
    });
  };

  // Toggle Compare
  const toggleCompare = (product) => {
    setCompareList((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      } else {
        if (prev.length >= 3) {
          showToast("You can compare up to 3 products at a time.");
          return prev;
        }
        return [...prev, product];
      }
    });
  };

  const removeCompareItem = (id) => {
    setCompareList((prev) => prev.filter((p) => p.id !== id));
  };

  const clearAllCompare = () => {
    setCompareList([]);
  };

  // Add to Cart Action
  const handleAddToCart = (product) => {
    if (product.stockStatus === "Out of Stock") return;
    setCartCount((c) => c + 1);
    showToast(`Added 1 bag of ${product.name} (${product.packageSize}) to cart!`);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setProductType("All Products");
    setRiceVariety("All Varieties");
    setQualityGrade("All Grades");
    setPackagingSize("All Sizes");
    setSellerLocation("All Locations");
    setAvailability("All Availability");
    setMinPrice("");
    setMaxPrice("");
    setSellerType("All Sellers");
    setRatingFilter("All Ratings");
    setSortBy("Recommended");
    showToast("All filters have been reset.");
  };

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return INITIAL_PRODUCTS.filter((prod) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = prod.name.toLowerCase().includes(q);
        const matchVariety = prod.variety.toLowerCase().includes(q);
        const matchSeller = prod.seller.toLowerCase().includes(q);
        const matchLoc = prod.location.toLowerCase().includes(q);
        if (!matchName && !matchVariety && !matchSeller && !matchLoc) return false;
      }

      // Product Type
      if (productType !== "All Products" && prod.productType !== productType) {
        return false;
      }

      // Rice Variety
      if (riceVariety !== "All Varieties" && prod.variety !== riceVariety) {
        return false;
      }

      // Quality Grade
      if (qualityGrade !== "All Grades" && prod.grade !== qualityGrade) {
        return false;
      }

      // Packaging Size
      if (packagingSize !== "All Sizes" && prod.packageSize !== packagingSize) {
        return false;
      }

      // Seller Location
      if (sellerLocation !== "All Locations" && prod.location !== sellerLocation) {
        return false;
      }

      // Availability
      if (availability !== "All Availability" && prod.stockStatus !== availability) {
        return false;
      }

      // Seller Type
      if (sellerType !== "All Sellers" && prod.sellerType !== sellerType) {
        return false;
      }

      // Price Range
      if (minPrice && prod.price < parseFloat(minPrice)) return false;
      if (maxPrice && prod.price > parseFloat(maxPrice)) return false;

      // Rating
      if (ratingFilter !== "All Ratings") {
        const minRate = parseFloat(ratingFilter);
        if (!isNaN(minRate) && prod.rating < minRate) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "Price: Low to High") return a.price - b.price;
      if (sortBy === "Price: High to Low") return b.price - a.price;
      if (sortBy === "Highest Rated") return b.rating - a.rating;
      if (sortBy === "Popularity") return b.reviews - a.reviews;
      return 0; // Recommended default order
    });
  }, [
    searchQuery,
    productType,
    riceVariety,
    qualityGrade,
    packagingSize,
    sellerLocation,
    availability,
    minPrice,
    maxPrice,
    sellerType,
    ratingFilter,
    sortBy,
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 flex flex-col font-sans relative pb-16">
      {/* ========================================================
          1. HEADER / NAVBAR (SHARED ACROSS ALL CONSUMER PAGES)
      ======================================================== */}
      <ConsumerNavbar
        activePath="/consumer/marketplace"
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        onWishlistClick={() => showToast(`You have ${wishlistCount} items in your wishlist.`)}
        onCartClick={() => showToast(`Cart contains ${cartCount} items.`)}
      />

      {/* ========================================================
          2. PAGE TITLE & STATUS BAR
      ======================================================== */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 flex flex-col gap-6">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-[#00580C] uppercase tracking-wider">
              Marketplace
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5">
              Browse Products
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Explore available rice and grain products from verified GrainRise sellers.
            </p>
          </div>

          {/* Sync Time Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 text-xs shadow-2xs self-start md:self-auto">
            <Clock size={13} className="text-[#00580C]" />
            <span>Market prices synced today: <strong className="font-semibold text-gray-800">10:42 AM</strong></span>
          </div>
        </div>

        {/* ========================================================
            3. SEARCH & COMPREHENSIVE FILTERS PANEL (EXACT FIGMA REPLICA)
        ======================================================== */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-none">
          {/* Row 1: Search Input & Search Button */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rice variety, product, or seller (e.g. Dinorado, NSIC Rc 222, Greenfield Rice Store)"
                className="w-full pl-9 pr-4 py-2 rounded-md text-xs bg-white border border-gray-200 focus:bg-white focus:border-[#00580C] text-gray-700 placeholder:text-gray-400 outline-none transition"
              />
            </div>

            <button
              id="search-button"
              className="px-5 py-2 bg-[#00580C] hover:bg-[#016f0e] text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
            >
              <Search size={14} /> Search
            </button>
          </div>

          {/* Row 2: Filter Selects (6 Dropdowns in 1 row) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Product Type */}
            <div className="flex flex-col">
              <label className="text-[11px] font-normal text-gray-500 mb-1">
                Product Type
              </label>
              <div className="relative">
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700 font-normal focus:border-[#00580C] outline-none pr-7 cursor-pointer"
                >
                  <option>All Products</option>
                  <option>Milled Rice</option>
                  <option>Premium Rice</option>
                  <option>Organic Rice</option>
                  <option>Glutinous Rice</option>
                  <option>Palay</option>
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Rice Variety */}
            <div className="flex flex-col">
              <label className="text-[11px] font-normal text-gray-500 mb-1">
                Rice Variety
              </label>
              <div className="relative">
                <select
                  value={riceVariety}
                  onChange={(e) => setRiceVariety(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700 font-normal focus:border-[#00580C] outline-none pr-7 cursor-pointer"
                >
                  <option>All Varieties</option>
                  <option>Dinorado</option>
                  <option>NSIC Rc 222</option>
                  <option>Sinandomeng</option>
                  <option>Jasmine</option>
                  <option>NSIC Rc 160</option>
                  <option>Organic Brown</option>
                  <option>Rc 10</option>
                  <option>Malagkit</option>
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Quality Grade */}
            <div className="flex flex-col">
              <label className="text-[11px] font-normal text-gray-500 mb-1">
                Quality Grade
              </label>
              <div className="relative">
                <select
                  value={qualityGrade}
                  onChange={(e) => setQualityGrade(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700 font-normal focus:border-[#00580C] outline-none pr-7 cursor-pointer"
                >
                  <option>All Grades</option>
                  <option>Premium Grade</option>
                  <option>Grade A</option>
                  <option>Well-Milled</option>
                  <option>Special Grade</option>
                  <option>Regular Milled</option>
                  <option>Whole Grain</option>
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Packaging Size */}
            <div className="flex flex-col">
              <label className="text-[11px] font-normal text-gray-500 mb-1">
                Packaging Size
              </label>
              <div className="relative">
                <select
                  value={packagingSize}
                  onChange={(e) => setPackagingSize(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700 font-normal focus:border-[#00580C] outline-none pr-7 cursor-pointer"
                >
                  <option>All Sizes</option>
                  <option>10 kg</option>
                  <option>25 kg</option>
                  <option>50 kg</option>
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Seller Location */}
            <div className="flex flex-col">
              <label className="text-[11px] font-normal text-gray-500 mb-1">
                Seller Location
              </label>
              <div className="relative">
                <select
                  value={sellerLocation}
                  onChange={(e) => setSellerLocation(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700 font-normal focus:border-[#00580C] outline-none pr-7 cursor-pointer"
                >
                  <option>All Locations</option>
                  <option>Caloocan City</option>
                  <option>Bulacan</option>
                  <option>Quezon City</option>
                  <option>Nueva Ecija</option>
                  <option>Isabela</option>
                  <option>Manila</option>
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Availability */}
            <div className="flex flex-col">
              <label className="text-[11px] font-normal text-gray-500 mb-1">
                Availability
              </label>
              <div className="relative">
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700 font-normal focus:border-[#00580C] outline-none pr-7 cursor-pointer"
                >
                  <option>All Availability</option>
                  <option>In Stock</option>
                  <option>Limited Stock</option>
                  <option>Out of Stock</option>
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Horizontal Inline Secondary Filters & Reset */}
          <div className="flex flex-wrap items-center justify-between gap-y-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {/* Price (₱): Min — Max */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 text-xs font-normal">Price (₱):</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-14 bg-white border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#00580C] text-center"
                />
                <span className="text-gray-400 text-xs">—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-14 bg-white border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#00580C] text-center"
                />
              </div>

              {/* Seller Type: Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 text-xs font-normal">Seller Type:</span>
                <div className="relative">
                  <select
                    value={sellerType}
                    onChange={(e) => setSellerType(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-md px-2.5 py-1 text-xs text-gray-700 focus:outline-none focus:border-[#00580C] pr-6 cursor-pointer"
                  >
                    <option>All Sellers</option>
                    <option>Retailer</option>
                    <option>Miller / Supplier</option>
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Rating: Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 text-xs font-normal">Rating:</span>
                <div className="relative">
                  <select
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-md px-2.5 py-1 text-xs text-gray-700 focus:outline-none focus:border-[#00580C] pr-6 cursor-pointer"
                  >
                    <option>All Ratings</option>
                    <option value="4.8">4.8 &amp; above</option>
                    <option value="4.5">4.5 &amp; above</option>
                    <option value="4.0">4.0 &amp; above</option>
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* Reset All Filters link on right */}
            <button
              onClick={handleResetFilters}
              className="text-xs text-gray-400 hover:text-gray-600 transition cursor-pointer font-normal"
            >
              Reset All Filters
            </button>
          </div>
        </div>

        {/* ========================================================
            4. RESULTS COUNT & SORTING CONTROLS
        ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-sm font-bold text-gray-900">
              124 Products Available{" "}
              <span className="font-normal text-xs text-gray-500 ml-1 hidden sm:inline">
                Showing products that match your selected filters.
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="font-medium">Sort by:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 font-semibold focus:border-[#00580C] outline-none pr-7 shadow-2xs cursor-pointer"
                >
                  <option>Recommended</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Highest Rated</option>
                  <option>Popularity</option>
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-white shadow-2xs">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded transition cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[#00580C] text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                title="Grid View"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded transition cursor-pointer ${
                  viewMode === "list"
                    ? "bg-[#00580C] text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                title="List View"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
            5. PRODUCTS GRID / LIST (EXACT FIGMA REPLICA)
        ======================================================== */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center my-6">
            <Package size={48} className="text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-gray-800">No products found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              We couldn't find any products matching your selected search criteria. Try adjusting or resetting your filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 bg-[#00580C] text-white text-xs font-semibold rounded-lg hover:bg-[#016f0e] transition cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {filteredProducts.map((prod) => {
              const isFav = !!favorites[prod.id];
              const isCompared = compareList.some((p) => p.id === prod.id);
              const isOutOfStock = prod.stockStatus === "Out of Stock";

              return (
                <div
                  key={prod.id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative"
                  style={{ minHeight: "429px" }}
                >
                  <div>
                    {/* Top Image Canvas Container */}
                    <div className="bg-[#F8FAFC] border border-gray-100/80 rounded-xl p-3 relative flex flex-col justify-between items-center min-h-[160px] mb-3">
                      {/* Top Badges & Wishlist Heart */}
                      <div className="w-full flex items-center justify-between z-10">
                        {/* Status Badge */}
                        {prod.stockType === "in_stock" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#0F533A] border border-emerald-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0F533A]" />
                            In Stock
                          </span>
                        )}
                        {prod.stockType === "limited" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] border border-amber-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                            Limited Stock
                          </span>
                        )}
                        {prod.stockType === "out_of_stock" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Out of Stock
                          </span>
                        )}

                        {/* Wishlist Heart Toggle */}
                        <button
                          onClick={() => toggleFavorite(prod.id, prod.name)}
                          className="p-1 rounded-full bg-white/80 hover:bg-white border border-gray-100 shadow-2xs transition cursor-pointer text-gray-400 hover:text-rose-500"
                          title={isFav ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <Heart
                            size={16}
                            className={
                              isFav
                                ? "fill-rose-500 text-rose-500"
                                : "text-gray-400 hover:text-rose-500"
                            }
                          />
                        </button>
                      </div>

                      {/* Center Rice Sack Graphic */}
                      <div className="py-1 flex justify-center items-center my-auto">
                        <RiceSackCard
                          variety={prod.varietyDisplay}
                          weight={prod.weightDisplay}
                          theme={prod.theme}
                        />
                      </div>
                    </div>

                    {/* Category / Grade & Weight Row */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-400 font-medium text-[11px] truncate">
                        {prod.categoryGrade}
                      </span>
                      <span className="text-gray-400 font-medium text-[11px] shrink-0">
                        {prod.packageSize}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base mt-0.5 leading-snug group-hover:text-[#00580C] transition line-clamp-1">
                      {prod.name}
                    </h3>

                    {/* Seller Details */}
                    <div className="mt-1">
                      <p className="text-xs font-semibold text-gray-700 leading-tight">
                        {prod.seller}
                      </p>
                      <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                        {prod.sellerType} • {prod.location}
                      </p>
                    </div>

                    {/* Price & Stock Stats Row */}
                    <div className="flex items-end justify-between mt-3 pt-2.5 border-t border-gray-100">
                      <div>
                        <div className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                          ₱{prod.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-gray-400 font-medium">
                          {prod.pricePerKg}
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-xs font-bold leading-tight ${
                            isOutOfStock
                              ? "text-rose-500"
                              : prod.stockType === "limited"
                              ? "text-amber-600"
                              : "text-[#0F533A]"
                          }`}
                        >
                          {prod.stockText}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[11px] text-gray-500 mt-0.5">
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          <span className="font-bold text-gray-800">{prod.rating}</span>
                          <span className="text-gray-400">({prod.reviews})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Compare Checkbox, View Details & Add to Cart */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      {/* Compare Checkbox */}
                      <label className="flex items-center gap-1.5 text-gray-600 font-medium cursor-pointer select-none text-[11px]">
                        <input
                          type="checkbox"
                          checked={isCompared}
                          onChange={() => toggleCompare(prod)}
                          className="w-3.5 h-3.5 rounded text-[#00580C] accent-[#00580C] focus:ring-0 cursor-pointer"
                        />
                        <span>Compare</span>
                      </label>

                      {/* View Details Link */}
                      <button
                        onClick={() => setDetailsModalProduct(prod)}
                        className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 transition cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>

                    {/* Add to Cart Button */}
                    {isOutOfStock ? (
                      <button
                        disabled
                        className="w-full py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-400 border border-gray-200 flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <Ban size={13} /> Out of Stock
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(prod)}
                        className="w-full py-2 rounded-xl text-xs font-bold bg-[#00580C] hover:bg-[#016f0e] text-white flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer active:scale-[0.99]"
                      >
                        <ShoppingCart size={13} /> Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View Alternative */
          <div className="flex flex-col gap-3">
            {filteredProducts.map((prod) => {
              const isFav = !!favorites[prod.id];
              const isCompared = compareList.some((p) => p.id === prod.id);
              const isOutOfStock = prod.stockStatus === "Out of Stock";

              return (
                <div
                  key={prod.id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="shrink-0">
                      <RiceSackCard
                        variety={prod.varietyDisplay}
                        weight={prod.weightDisplay}
                        theme={prod.theme}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {prod.stockType === "in_stock" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4e8] text-[#00580C] border border-[#c4e8c8]">
                            In Stock
                          </span>
                        )}
                        {prod.stockType === "limited" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Limited Stock
                          </span>
                        )}
                        {prod.stockType === "out_of_stock" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                            Out of Stock
                          </span>
                        )}
                        <span className="text-xs text-gray-400 font-medium">
                          {prod.categoryGrade}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg mt-0.5">
                        {prod.name}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {prod.seller} • {prod.sellerType} • {prod.location}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1 font-bold text-gray-800">
                          <Star size={12} className="fill-amber-400 text-amber-400" /> {prod.rating} ({prod.reviews})
                        </span>
                        <span>•</span>
                        <span>{prod.packageSize}</span>
                        <span>•</span>
                        <span className="text-[#00580C] font-semibold">{prod.stockText}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-48 gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    <div className="text-left sm:text-right">
                      <div className="text-xl font-black text-gray-900">
                        ₱{prod.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500">{prod.pricePerKg}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDetailsModalProduct(prod)}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        Details
                      </button>
                      {isOutOfStock ? (
                        <button
                          disabled
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                        >
                          Out of Stock
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(prod)}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#00580C] hover:bg-[#016f0e] text-white shadow-xs cursor-pointer"
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================
            6. PAGINATION BAR (MATCHING FIGMA SPEC)
        ======================================================== */}
        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            Showing <strong className="font-bold text-gray-900">1–8</strong> of{" "}
            <strong className="font-bold text-gray-900">124</strong> products
          </p>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-lg border border-gray-200 font-medium transition cursor-pointer ${
                currentPage === 1
                  ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Previous
            </button>

            {[1, 2, 3, 4].map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg font-bold text-xs transition cursor-pointer ${
                  currentPage === page
                    ? "bg-[#00580C] text-white shadow-xs"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}

            <span className="px-1 text-gray-400 font-bold">...</span>

            <button
              onClick={() => setCurrentPage(16)}
              className={`w-8 h-8 rounded-lg font-bold text-xs transition cursor-pointer ${
                currentPage === 16
                  ? "bg-[#00580C] text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              16
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(16, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </main>

      {/* ========================================================
          7. FLOATING COMPARISON BAR (EXACT FIGMA REPLICA)
      ======================================================== */}
      {compareList.length > 0 && (
        <div className="fixed bottom-5 left-0 right-0 z-40 px-4 pointer-events-none">
          <div className="max-w-3xl mx-auto bg-[#18181B] text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700 flex flex-wrap items-center justify-between gap-4 pointer-events-auto animate-in slide-in-from-bottom duration-200">
            {/* Left: Icon & Count */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00580C] text-white flex items-center justify-center shrink-0">
                <BarChart2 size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-tight">
                  Compare Products
                </div>
                <div className="text-[11px] text-emerald-400 font-medium">
                  {compareList.length} of 3 selected
                </div>
              </div>
            </div>

            {/* Middle: Selected Item Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {compareList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/10 border border-white/15 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2"
                >
                  <span className="font-medium max-w-[120px] sm:max-w-[160px] truncate">
                    {item.name}
                  </span>
                  <button
                    onClick={() => removeCompareItem(item.id)}
                    className="text-gray-400 hover:text-white transition cursor-pointer"
                    title="Remove from comparison"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={clearAllCompare}
                className="text-xs text-gray-400 hover:text-white underline transition cursor-pointer"
              >
                Clear All
              </button>

              <button
                onClick={() => setCompareModalOpen(true)}
                className="px-4 py-2 bg-[#00580C] hover:bg-[#016f0e] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                Compare Products ({compareList.length}) →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          8. PRODUCT DETAILS MODAL
      ======================================================== */}
      {detailsModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-6 relative animate-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              onClick={() => setDetailsModalProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Modal Content */}
            <div className="flex flex-col sm:flex-row gap-6 items-start mt-2">
              <div className="mx-auto sm:mx-0 shrink-0">
                <RiceSackCard
                  variety={detailsModalProduct.varietyDisplay}
                  weight={detailsModalProduct.weightDisplay}
                  theme={detailsModalProduct.theme}
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e6f4e8] text-[#00580C] border border-[#c4e8c8]">
                    {detailsModalProduct.stockStatus}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {detailsModalProduct.categoryGrade}
                  </span>
                </div>

                <h2 className="text-2xl font-black text-gray-900 mt-1">
                  {detailsModalProduct.name}
                </h2>

                <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                  <span className="font-semibold text-gray-900">
                    {detailsModalProduct.seller}
                  </span>
                  <span>•</span>
                  <span>{detailsModalProduct.sellerType}</span>
                  <span>•</span>
                  <span>{detailsModalProduct.location}</span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < Math.floor(detailsModalProduct.rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-800">
                    {detailsModalProduct.rating}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({detailsModalProduct.reviews} customer reviews)
                  </span>
                </div>

                <div className="mt-4 p-3.5 bg-gray-50 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500 font-medium">Selling Price</span>
                    <div className="text-2xl font-black text-[#00580C]">
                      ₱{detailsModalProduct.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 font-medium">Unit Rate</span>
                    <div className="text-sm font-bold text-gray-800">
                      {detailsModalProduct.pricePerKg}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description & Specifications Matrix */}
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Product Overview
              </h4>
              <p className="text-xs sm:text-sm text-gray-700 mt-1 leading-relaxed">
                {detailsModalProduct.description}
              </p>

              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-4">
                Grain Quality Specifications
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">Grain Type</span>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{detailsModalProduct.grainType}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">Milling Degree</span>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{detailsModalProduct.millingDegree}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">Moisture Content</span>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{detailsModalProduct.moistureContent}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">Broken Kernels</span>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{detailsModalProduct.brokenRate}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">Origin</span>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{detailsModalProduct.origin}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">Stock Available</span>
                  <p className="text-xs font-bold text-[#00580C] mt-0.5">{detailsModalProduct.stockText}</p>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                onClick={() => toggleCompare(detailsModalProduct)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50 text-gray-700 transition cursor-pointer"
              >
                {compareList.some((p) => p.id === detailsModalProduct.id)
                  ? "✓ Added to Compare"
                  : "+ Add to Compare"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(detailsModalProduct.id, detailsModalProduct.name)}
                  className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition cursor-pointer"
                  title="Save to Wishlist"
                >
                  <Heart
                    size={16}
                    className={
                      favorites[detailsModalProduct.id]
                        ? "fill-rose-500 text-rose-500"
                        : "text-gray-500"
                    }
                  />
                </button>

                <button
                  onClick={() => {
                    handleAddToCart(detailsModalProduct);
                    setDetailsModalProduct(null);
                  }}
                  disabled={detailsModalProduct.stockStatus === "Out of Stock"}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#00580C] hover:bg-[#016f0e] text-white flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart size={15} /> Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          9. COMPARE PRODUCTS MODAL
      ======================================================== */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-6 relative animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00580C] text-white flex items-center justify-center">
                  <BarChart2 size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    Product Comparison Matrix
                  </h3>
                  <p className="text-xs text-gray-500">
                    Comparing {compareList.length} selected grain varieties side by side
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Comparison Columns */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {compareList.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50/70 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-center mb-3">
                      <RiceSackCard
                        variety={item.varietyDisplay}
                        weight={item.weightDisplay}
                        theme={item.theme}
                      />
                    </div>
                    <h4 className="font-bold text-gray-900 text-center text-sm">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 text-center mt-0.5">
                      {item.categoryGrade}
                    </p>

                    <div className="my-3 py-2 bg-white rounded-xl border border-gray-200 text-center">
                      <span className="text-base font-black text-[#00580C]">
                        ₱{item.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-gray-500 ml-1.5">({item.pricePerKg})</span>
                    </div>

                    {/* Feature Rows */}
                    <div className="space-y-2 text-xs text-gray-700">
                      <div className="flex justify-between py-1 border-b border-gray-200/60">
                        <span className="text-gray-500">Package Size</span>
                        <strong className="font-semibold">{item.packageSize}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200/60">
                        <span className="text-gray-500">Seller</span>
                        <strong className="font-semibold">{item.seller}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200/60">
                        <span className="text-gray-500">Location</span>
                        <strong className="font-semibold">{item.location}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200/60">
                        <span className="text-gray-500">Grain Type</span>
                        <strong className="font-semibold">{item.grainType}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200/60">
                        <span className="text-gray-500">Milling Degree</span>
                        <strong className="font-semibold">{item.millingDegree}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200/60">
                        <span className="text-gray-500">Moisture</span>
                        <strong className="font-semibold">{item.moistureContent}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200/60">
                        <span className="text-gray-500">Broken Kernels</span>
                        <strong className="font-semibold">{item.brokenRate}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200/60">
                        <span className="text-gray-500">Rating</span>
                        <span className="flex items-center gap-1 font-bold text-amber-600">
                          ★ {item.rating} ({item.reviews})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 flex items-center gap-2">
                    <button
                      onClick={() => removeCompareItem(item.id)}
                      className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => {
                        handleAddToCart(item);
                        setCompareModalOpen(false);
                      }}
                      className="flex-1 py-2 text-xs font-bold bg-[#00580C] hover:bg-[#016f0e] text-white rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      {/* ========================================================
          9.5 STICKY COMPARE PRODUCTS FLOATING BAR
      ======================================================== */}
      {compareList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-4xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-[#18181B] text-white rounded-2xl px-4 py-3.5 sm:px-6 sm:py-4 shadow-2xl border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left Info */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-10 h-10 rounded-xl bg-[#00580C] text-white flex items-center justify-center shrink-0 shadow-sm">
                <BarChart2 size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm leading-tight">Compare Products</h4>
                <p className="text-[#00C853] text-xs font-semibold mt-0.5">
                  {compareList.length} of 3 selected
                </p>
              </div>
            </div>

            {/* Middle Pills */}
            <div className="flex items-center gap-2 flex-wrap justify-start md:justify-center w-full md:w-auto flex-1 px-0 md:px-3">
              {compareList.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#27272A] border border-zinc-700/70 text-zinc-200 text-xs font-medium px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-xs"
                >
                  <span className="truncate max-w-[150px]">{item.name}</span>
                  <button
                    onClick={() => removeCompareItem(item.id)}
                    className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title={`Remove ${item.name}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center justify-end gap-4 w-full md:w-auto shrink-0">
              <button
                onClick={clearAllCompare}
                className="text-xs text-zinc-400 hover:text-zinc-100 underline underline-offset-2 transition-colors cursor-pointer"
              >
                Clear All
              </button>
              <button
                onClick={() => setCompareModalOpen(true)}
                className="bg-[#00580C] hover:bg-[#016f0e] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
              >
                Compare Products ({compareList.length}) →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          10. INTERACTION TOAST NOTIFICATION
      ======================================================== */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 bg-[#00580C] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top-2 duration-150">
          <ShieldCheck size={16} className="text-white" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
