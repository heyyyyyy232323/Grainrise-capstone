import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingCart,
  Bell,
  ChevronDown,
  ChevronRight,
  Star,
  ArrowRight,
  Truck,
  RefreshCcw,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  LogOut,
  CircleUserRound,
  ShoppingBag,
  Package,
  Sparkles,
  Sprout,
  LayoutGrid,
  Clock,
  Check,
} from "lucide-react";
import Logo from "../../assets/Logo.png";
import ConsumerNavbar from "../../Components/Major-Components/ConsumerNavbar";

// ============================================================
// STATIC DATA & MOCK CONSTANTS
// ============================================================

const NAV_LINKS = [
  { label: "Home",                 path: "/consumer/home"          },
  { label: "Marketplace",          path: "/consumer/marketplace"   },
  { label: "Orders",               path: "/consumer/orders"        },
  { label: "Promotions & Rewards", path: "/consumer/promotions"    },
  { label: "Market Prices",        path: "/consumer/market-prices" },
];

const CATEGORIES = [
  {
    icon: <Package size={20} className="text-[#00580C]" />,
    iconBg: "bg-[#EFF9F3]",
    title: "Milled Rice",
    desc: "Ready-to-cook daily rice products for home consumption.",
  },
  {
    icon: <Sparkles size={20} className="text-[#D97706]" />,
    iconBg: "bg-[#FEF9EE]",
    title: "Premium Rice",
    desc: "Selected fragrant and export-grade high-quality varieties.",
  },
  {
    icon: <Sprout size={20} className="text-[#16A34A]" />,
    iconBg: "bg-[#F0FDF4]",
    title: "Palay",
    desc: "Direct unmilled dry palay grain direct from agricultural co-ops.",
  },
  {
    icon: <LayoutGrid size={20} className="text-[#2563EB]" />,
    iconBg: "bg-[#EFF6FF]",
    title: "Bulk Rice",
    desc: "Larger 50 kg sacks for household reserves and business supply.",
  },
  {
    icon: <ShoppingBag size={20} className="text-[#9333EA]" />,
    iconBg: "bg-[#FAF5FF]",
    title: "Specialty Rice",
    desc: "Organic brown, glutinous malagkit, and specialty grains.",
  },
];

const QUICK_ACCESS = [
  {
    icon: <Truck size={18} className="text-[#00580C]" />,
    iconBg: "bg-[#EFF9F3]",
    label: "Track My Order",
    desc: "See where your order is",
    path: "/consumer/orders",
  },
  {
    icon: <RefreshCcw size={18} className="text-[#2563EB]" />,
    iconBg: "bg-[#EFF6FF]",
    label: "Buy Again",
    desc: "Reorder past purchases",
    path: "/consumer/buy-again",
  },
  {
    icon: <Heart size={18} className="text-[#E11D48]" />,
    iconBg: "bg-[#FFF1F2]",
    label: "My Wishlist",
    desc: "View saved items",
    badge: 12,
    path: "/consumer/wishlist",
  },
  {
    icon: <Bell size={18} className="text-[#D97706]" />,
    iconBg: "bg-[#FEF9EE]",
    label: "Price Alerts",
    desc: "Check monitored prices",
    path: "/consumer/price-alerts",
  },
  {
    icon: <BarChart2 size={18} className="text-[#16A34A]" />,
    iconBg: "bg-[#F0FDF4]",
    label: "Market Trends",
    desc: "Compare daily rates",
    path: "/consumer/market-prices",
  },
];

const RECOMMENDED = [
  {
    id: 1,
    variety: "DINORADO",
    weightText: "25 KG",
    theme: "dinorado",
    categoryGrade: "Dinorado • Premium Grade",
    name: "Premium Dinorado Rice",
    store: "Greenfield Rice Store • Caloocan City",
    price: "₱1,450.00",
    pricePerKg: "₱58.00/kg",
    rating: 4.8,
    reviews: 126,
    weightBadge: "25 kg",
    tag: "In Stock",
    tagType: "stock",
  },
  {
    id: 2,
    variety: "RC 222",
    weightText: "50 KG",
    theme: "rc222",
    categoryGrade: "NSIC Rc 222 • Grade A",
    name: "NSIC Rc 222 Rice",
    store: "Bulacan Grain Milling • Bulacan",
    price: "₱2,450.00",
    pricePerKg: "₱49.00/kg",
    rating: 4.7,
    reviews: 94,
    weightBadge: "50 kg",
    tag: "In Stock",
    tagType: "stock",
  },
  {
    id: 3,
    variety: "SINANDOMENG",
    weightText: "25 KG",
    theme: "sinandomeng",
    categoryGrade: "Sinandomeng • Well-Milled",
    name: "Sinandomeng Rice",
    store: "GrainMart • Quezon City",
    price: "₱1,300.00",
    pricePerKg: "₱52.00/kg",
    rating: 4.6,
    reviews: 78,
    weightBadge: "25 kg",
    tag: "Limited Stock",
    tagType: "limited",
  },
  {
    id: 4,
    variety: "JASMINE",
    weightText: "25 KG",
    theme: "jasmine",
    categoryGrade: "Jasmine • Premium Grade",
    name: "Premium Jasmine Rice",
    store: "North Caloocan Rice Store",
    price: "₱1,525.00",
    pricePerKg: "₱61.00/kg",
    rating: 4.9,
    reviews: 152,
    weightBadge: "25 kg",
    tag: "In Stock",
    tagType: "stock",
  },
  {
    id: 5,
    variety: "RC 160",
    weightText: "50 KG",
    theme: "rc222",
    categoryGrade: "NSIC Rc 160 • Well-Milled",
    name: "NSIC Rc 160 Special",
    store: "Central Luzon Miller Co.",
    price: "₱2,350.00",
    pricePerKg: "₱47.00/kg",
    rating: 4.7,
    reviews: 63,
    weightBadge: "50 kg",
    tag: "In Stock",
    tagType: "stock",
  },
];

const BUY_AGAIN_ITEMS = [
  {
    variety: "SINANDOMENG",
    weightText: "20 KG",
    theme: "sinandomeng",
    name: "Sinandomeng Rice",
    detail: "20 kg • GrainMart",
    purchased: "Purchased Aug 28, 2026",
    price: "₱980.00",
  },
  {
    variety: "JASMINE",
    weightText: "25 KG",
    theme: "jasmine",
    name: "Jasmine Rice",
    detail: "25 kg • North Caloocan Store",
    purchased: "Purchased Aug 14, 2026",
    price: "₱1,725.00",
  },
  {
    variety: "RC 222",
    weightText: "50 KG",
    theme: "rc222",
    name: "NSIC Rc 222",
    detail: "50 kg • Bulacan Rice Hub",
    purchased: "Purchased Jul 29, 2026",
    price: "₱2,400.00",
  },
];

const OFFERS = [
  {
    label: "₱100 OFF Rice Orders",
    desc: "Min. spend ₱2,000 across participating stores.",
    badge: "GRAIN100",
    badgeStyle: "border border-dashed border-emerald-400 bg-emerald-50 text-[#00580C]",
    cardBorder: "border-emerald-100 bg-[#F9FDFB]",
    sub: "Valid until Sep 30, 2026",
    cta: "View Products →",
    ctaColor: "text-[#00580C]",
  },
  {
    label: "Free Delivery",
    desc: "Applies automatically on orders ₱3,000 and above.",
    badge: "FREE SHIPPING",
    badgeStyle: "bg-[#FEF3C7] text-[#D97706]",
    cardBorder: "border-amber-100 bg-[#FEFDF9]",
    sub: "Valid until Sep 25, 2026",
    cta: "Shop Now →",
    ctaColor: "text-amber-800",
  },
  {
    label: "Double Loyalty Points",
    desc: "Earn 2× points on selected 50 kg packages.",
    badge: "2× PTS",
    badgeStyle: "bg-[#EFF6FF] text-[#2563EB]",
    cardBorder: "border-blue-100 bg-[#F8FAFD]",
    sub: "Valid until Sep 15, 2026",
    cta: "View Eligible Products →",
    ctaColor: "text-blue-700",
  },
];

const MARKET_PRICES = [
  { variety: "Dinorado",    avg: "₱58.00 / kg", trend: "+ ₱2.00", trendType: "up",    grade: "Premium Grade"    },
  { variety: "Sinandomeng",  avg: "₱52.00 / kg", trend: "↓ ₱1.00", trendType: "down",   grade: "Well-Milled"      },
  { variety: "NSIC Rc 222",  avg: "₱49.00 / kg", trend: "— Stable", trendType: "stable", grade: "Grade A"          },
  { variety: "Jasmine",      avg: "₱61.00 / kg", trend: "+ ₱1.50", trendType: "up",    grade: "Special Fragrant" },
];

const POPULAR_TAGS = ["Dinorado", "NSIC Rc 222", "Jasmine", "Sinandomeng", "Malagkit", "Brown Rice"];

// ============================================================
// REUSABLE SACK MOCKUP COMPONENT
// ============================================================

function RiceSackCard({ variety, weight, theme = "dinorado", size = "normal" }) {
  const themes = {
    dinorado: {
      card: "bg-[#FFF9EA] border-[#F5E7C4] text-[#8C5E2D]",
      accent: "bg-[#D97706]",
    },
    rc222: {
      card: "bg-[#F8FAFC] border-[#E2E8F0] text-[#334155]",
      accent: "bg-[#64748B]",
    },
    sinandomeng: {
      card: "bg-[#F0FDF4] border-[#BBF7D0] text-[#00580C]",
      accent: "bg-[#00580C]",
    },
    jasmine: {
      card: "bg-[#F0F9FF] border-[#BAE6FD] text-[#0284C7]",
      accent: "bg-[#0284C7]",
    },
  };

  const style = themes[theme] || themes.dinorado;

  if (size === "small") {
    return (
      <div className={`w-12 h-14 rounded-lg border flex flex-col items-center justify-center p-1 relative select-none shrink-0 ${style.card}`}>
        <span className="text-[7px] font-black tracking-wider uppercase leading-tight text-center">{variety}</span>
        <span className="text-[6px] text-gray-500 font-medium mt-0.5">{weight}</span>
        <div className={`w-3 h-0.5 mt-0.5 rounded-full ${style.accent}`} />
      </div>
    );
  }

  return (
    <div className={`w-20 h-28 rounded-xl border flex flex-col items-center justify-center p-2 relative shadow-inner select-none ${style.card}`}>
      <span className="text-[9px] font-black tracking-wider uppercase text-center leading-snug">{variety}</span>
      <span className="text-[8px] text-gray-500 font-semibold mt-0.5">{weight}</span>
      <div className={`w-6 h-0.5 mt-1.5 rounded-full ${style.accent}`} />
    </div>
  );
}

// ============================================================
// HERO SEARCH SECTION
// ============================================================

function HeroSection() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e?.preventDefault();
    navigate(`/consumer/marketplace?search=${encodeURIComponent(query)}`);
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-lg border border-emerald-900/40 text-white"
      style={{
        backgroundColor: "#00580C",
        backgroundImage: `
          radial-gradient(circle at 68% 30%, rgba(34, 197, 94, 0.40) 0%, rgba(132, 204, 22, 0.18) 35%, rgba(0, 88, 12, 0) 70%),
          linear-gradient(135deg, #004509 0%, #00580C 50%, #003d07 100%)
        `,
      }}
    >
      <div className="absolute -top-16 right-[12%] w-[420px] h-[420px] rounded-full bg-emerald-400/25 blur-[95px] pointer-events-none" />
      <div className="absolute top-4 right-[-40px] w-[340px] h-[340px] rounded-full bg-lime-400/18 blur-[85px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 w-[280px] h-[280px] rounded-full bg-emerald-950/50 blur-[75px] pointer-events-none" />

      <div className="relative z-10 p-6 sm:p-8 md:p-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/25 border border-white/15 text-white/95 text-[11px] sm:text-xs font-semibold backdrop-blur-md mb-3 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs" />
          <span>Direct Farm &amp; Market Sourced</span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight mb-2">
          Find Rice Products That Fit Your Needs
        </h1>

        <p className="text-xs sm:text-sm text-white/85 font-normal leading-relaxed mb-6 max-w-2xl">
          Browse rice and grain products from verified GrainRise sellers and compare prices before you buy.
        </p>

        <form onSubmit={handleSearch} className="w-full mb-4">
          <div className="w-full bg-white rounded-full p-1.5 flex items-center shadow-lg border border-white/30">
            <Search size={18} className="text-gray-400 ml-3.5 shrink-0" />
            <input
              id="consumer-hero-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rice, variety, or seller (e.g. Dinorado, NSIC Rc 222, Jasmine, Sinandomeng)"
              className="w-full pl-3 pr-3 py-2 bg-transparent text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 outline-none font-normal"
            />
            <button
              id="consumer-hero-search-btn"
              type="submit"
              className="px-7 sm:px-9 py-2.5 bg-[#00580C] hover:bg-[#004709] text-white text-xs sm:text-sm font-bold rounded-full transition shadow-xs cursor-pointer shrink-0 mr-0.5"
            >
              Search
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          <button
            onClick={() => navigate("/consumer/marketplace")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/25 hover:bg-black/35 border border-white/15 text-white text-xs font-semibold backdrop-blur-md transition cursor-pointer"
          >
            <span>Browse Marketplace</span>
            <ArrowRight size={13} />
          </button>
          <button
            onClick={() => navigate("/consumer/market-prices")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/25 hover:bg-black/35 border border-white/15 text-white/95 text-xs font-semibold backdrop-blur-md transition cursor-pointer"
          >
            <TrendingUp size={13} className="text-emerald-300" />
            <span>Check Market Prices</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/70 font-normal mr-1">Popular:</span>
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setQuery(tag);
                navigate(`/consumer/marketplace?search=${encodeURIComponent(tag)}`);
              }}
              className="px-3 py-1 rounded-full bg-black/20 hover:bg-black/35 border border-white/15 text-white/90 text-[11px] font-medium transition cursor-pointer backdrop-blur-md"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SHOP BY CATEGORY (5 COLUMNS ON DESKTOP)
// ============================================================

function ShopByCategory() {
  const navigate = useNavigate();

  return (
    <section>
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Shop by Category</h2>
          <p className="text-xs text-gray-500">Browse products based on what you need.</p>
        </div>
        <button
          onClick={() => navigate("/consumer/marketplace")}
          className="text-xs font-semibold text-[#00580C] hover:underline flex items-center gap-1 cursor-pointer"
        >
          View All Categories <ArrowRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3.5">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.title}
            onClick={() => navigate("/consumer/marketplace")}
            className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-gray-200/90 hover:border-[#00580C]/40 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className={`w-9 h-9 rounded-xl ${cat.iconBg} flex items-center justify-center shrink-0`}>
              {cat.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 group-hover:text-[#00580C] transition-colors">{cat.title}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{cat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// QUICK ACCESS (5 COLUMNS ON DESKTOP)
// ============================================================

function QuickAccess() {
  const navigate = useNavigate();

  return (
    <section>
      <div className="mb-3.5">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Quick Access</h2>
        <p className="text-xs text-gray-500">Get to your most-used GrainRise features quickly.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3.5">
        {QUICK_ACCESS.map((item) => (
          <div
            key={item.label}
            onClick={() => navigate(item.path)}
            className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-200/90 hover:border-[#00580C]/40 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
                {item.icon}
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-gray-900 flex items-center gap-1 truncate">
                  {item.label}
                  {item.badge && (
                    <span className="text-[9px] font-bold bg-[#FFE4E6] text-[#E11D48] rounded-full px-1.5 py-0.2 leading-tight">
                      {item.badge}
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-gray-500 leading-tight truncate">{item.desc}</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-[#00580C] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// RECOMMENDED FOR YOU (5 COLUMNS ON DESKTOP)
// ============================================================

function RecommendedProducts() {
  const [wishlisted, setWishlisted] = useState({});
  const navigate = useNavigate();

  const toggleWish = (id) => setWishlisted((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section>
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Recommended for You</h2>
          <p className="text-xs text-gray-500">Products you may want to check based on your GrainRise activity.</p>
        </div>
        <button
          onClick={() => navigate("/consumer/marketplace")}
          className="text-xs font-semibold text-[#00580C] hover:underline flex items-center gap-1 cursor-pointer"
        >
          View More Products <ArrowRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
        {RECOMMENDED.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl border border-gray-200/90 hover:border-[#00580C]/40 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden p-3.5 group"
            style={{ minHeight: "385px" }}
          >
            <div>
              {/* Top Image Mockup Canvas */}
              <div className="relative bg-[#F8FAFC] border border-gray-100 rounded-xl p-2.5 flex flex-col items-center justify-between min-h-[145px] mb-2.5">
                <div className="w-full flex items-center justify-between z-10">
                  {p.tagType === "stock" ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-[#E8F5E9] text-[#00580C] border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00580C]" /> In Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-[#FEF3C7] text-[#D97706] border border-amber-200 px-2 py-0.5 rounded-full shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" /> Limited
                    </span>
                  )}

                  <button
                    id={`consumer-wish-${p.id}`}
                    onClick={() => toggleWish(p.id)}
                    className="p-1 rounded-full bg-white/80 hover:bg-white border border-gray-100 shadow-2xs text-gray-400 hover:text-rose-500 transition cursor-pointer"
                  >
                    <Heart size={14} fill={wishlisted[p.id] ? "#E11D48" : "none"} className={wishlisted[p.id] ? "text-[#E11D48]" : "text-gray-400"} />
                  </button>
                </div>

                <div className="py-1 flex justify-center items-center my-auto">
                  <RiceSackCard variety={p.variety} weight={p.weightText} theme={p.theme} />
                </div>
              </div>

              {/* Category & Weight */}
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <span className="text-gray-400 font-medium truncate">{p.categoryGrade}</span>
                <span className="text-gray-400 font-medium shrink-0">{p.weightBadge}</span>
              </div>

              {/* Product Title */}
              <h3 className="font-bold text-gray-900 text-xs mt-0.5 leading-snug group-hover:text-[#00580C] transition line-clamp-1">{p.name}</h3>
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">{p.store}</p>

              {/* Price & Rating */}
              <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-gray-100">
                <div>
                  <span className="text-sm sm:text-base font-black text-gray-900 leading-tight">{p.price}</span>
                  <p className="text-[10px] text-gray-400 font-medium">{p.pricePerKg}</p>
                </div>
                <div className="flex items-center gap-0.5 text-[10px]">
                  <Star size={10} className="text-amber-400 fill-amber-400" />
                  <span className="font-bold text-gray-800">{p.rating}</span>
                  <span className="text-gray-400">({p.reviews})</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-col gap-1">
              <button
                id={`consumer-add-cart-${p.id}`}
                onClick={() => alert(`Added ${p.name} to cart`)}
                className="w-full py-1.5 rounded-xl bg-[#00580C] hover:bg-[#004709] text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs active:scale-[0.99]"
              >
                <ShoppingBag size={12} /> Add to Cart
              </button>
              <button
                onClick={() => navigate("/consumer/marketplace")}
                className="w-full py-0.5 text-[10px] font-semibold text-gray-500 hover:text-gray-900 transition cursor-pointer text-center"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// OFFERS & MARKET PRICE SNAPSHOT
// ============================================================

function OffersAndMarket() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* OFFERS YOU CAN USE */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Offers You Can Use</h2>
            <p className="text-xs text-gray-500">Save on eligible GrainRise purchases.</p>
          </div>
          <button
            onClick={() => navigate("/consumer/promotions")}
            className="text-xs font-semibold text-[#00580C] hover:underline flex items-center gap-1 cursor-pointer"
          >
            View All Promotions <ArrowRight size={12} />
          </button>
        </div>

        <div className="space-y-2.5">
          {OFFERS.map((offer, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-xl border ${offer.cardBorder} hover:border-[#00580C]/40 transition cursor-pointer flex flex-col justify-between gap-2`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">{offer.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{offer.desc}</p>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${offer.badgeStyle}`}>
                  {offer.badge}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-100/80">
                <span className="text-[11px] text-gray-400">{offer.sub}</span>
                <button className={`text-xs font-bold hover:underline cursor-pointer ${offer.ctaColor}`}>
                  {offer.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TODAY'S MARKET PRICE SNAPSHOT */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Today's Market Price Snapshot</h2>
              <p className="text-xs text-gray-500">Check current average prices before you buy.</p>
            </div>
            <span className="text-[10px] font-semibold bg-[#EFF6FF] text-[#3B82F6] px-2 py-0.5 rounded">
              DA Updated Today
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="pb-2 text-left font-semibold">VARIETY</th>
                  <th className="pb-2 text-left font-semibold">AVERAGE PRICE</th>
                  <th className="pb-2 text-left font-semibold">TREND</th>
                  <th className="pb-2 text-left font-semibold">STANDARD / GRADE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MARKET_PRICES.map((row) => (
                  <tr key={row.variety} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-2.5 font-bold text-gray-900">{row.variety}</td>
                    <td className="py-2.5 text-gray-600 font-medium">{row.avg}</td>
                    <td className="py-2.5">
                      {row.trendType === "up" && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded bg-[#FEF3C7] text-[#D97706]">
                          <TrendingUp size={11} /> {row.trend}
                        </span>
                      )}
                      {row.trendType === "down" && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#16A34A]">
                          <TrendingDown size={11} /> {row.trend}
                        </span>
                      )}
                      {row.trendType === "stable" && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                          <Minus size={11} /> Stable
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span className="text-[11px] font-medium bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded">
                        {row.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock size={13} className="text-[#00580C]" />
              <span>Benchmark prices updated 10:42 AM</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/consumer/price-alerts")}
                className="px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Create Price Alert
              </button>
              <button
                onClick={() => navigate("/consumer/market-prices")}
                className="px-4 py-2 bg-[#00580C] hover:bg-[#016f0e] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
              >
                View Market Prices
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// YOUR LATEST ORDER
// ============================================================

function LatestOrderTracker() {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">Your Latest Order</h2>
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#FEF3C7] text-[#D97706] px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" /> Out for Delivery
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Order <span className="font-semibold text-gray-800">ORD-2026-0184</span> • Greenfield Rice Store
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] text-gray-400">Estimated Arrival</p>
          <p className="text-xs font-bold text-gray-800">Today, Sep 10, 2026</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3 w-full lg:w-auto shrink-0">
          <RiceSackCard variety="DINORADO" weight="25 KG" theme="dinorado" size="small" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">Premium Dinorado Rice</h3>
            <p className="text-xs text-gray-500 mt-0.5">25 kg bag • Quantity: 1</p>
            <p className="text-xs font-bold text-gray-900 mt-1">Total: ₱1,850.00</p>
          </div>
        </div>

        <div className="flex-1 w-full max-w-xl">
          <div className="relative flex items-center justify-between">
            <div className="flex flex-col items-center text-center z-10">
              <div className="w-7 h-7 rounded-full bg-[#00580C] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                <Check size={14} />
              </div>
              <p className="text-xs font-bold text-gray-800 mt-1.5">Order Placed</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Sep 08, 9:20 AM</p>
            </div>

            <div className="flex-1 h-0.5 bg-[#00580C] -mt-6 mx-1" />

            <div className="flex flex-col items-center text-center z-10">
              <div className="w-7 h-7 rounded-full bg-[#00580C] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                <Check size={14} />
              </div>
              <p className="text-xs font-bold text-gray-800 mt-1.5">Confirmed</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Sep 08, 11:45 AM</p>
            </div>

            <div className="flex-1 h-0.5 bg-[#00580C] -mt-6 mx-1" />

            <div className="flex flex-col items-center text-center z-10">
              <div className="w-7 h-7 rounded-full bg-[#00580C] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                <Check size={14} />
              </div>
              <p className="text-xs font-bold text-gray-800 mt-1.5">Shipped</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Sep 09, 3:10 PM</p>
            </div>

            <div className="flex-1 h-0.5 bg-[#F59E0B] -mt-6 mx-1" />

            <div className="flex flex-col items-center text-center z-10">
              <div className="w-7 h-7 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-xs font-bold shadow-md ring-4 ring-[#FEF3C7]">
                <span className="w-2 h-2 bg-white rounded-full" />
              </div>
              <p className="text-xs font-bold text-[#D97706] mt-1.5">Out for Delivery</p>
              <p className="text-[10px] text-[#D97706] font-semibold mt-0.5">Rider assigned</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full lg:w-32 shrink-0">
          <button
            id="consumer-track-order-btn"
            onClick={() => navigate("/consumer/orders")}
            className="w-full py-2 bg-[#00580C] hover:bg-[#016f0e] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm text-center"
          >
            Track Order
          </button>
          <button
            onClick={() => navigate("/consumer/orders")}
            className="w-full py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer text-center"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BUY AGAIN
// ============================================================

function BuyAgainSection() {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Buy Again</h2>
          <p className="text-xs text-gray-500">Quickly reorder products from your previous purchases.</p>
        </div>
        <button
          onClick={() => navigate("/consumer/orders")}
          className="text-xs font-semibold text-[#00580C] hover:underline flex items-center gap-1 cursor-pointer"
        >
          All Previous Orders <ArrowRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {BUY_AGAIN_ITEMS.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-200/80 hover:border-[#00580C]/40 bg-white shadow-xs transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <RiceSackCard variety={item.variety} weight={item.weightText} theme={item.theme} size="small" />
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-gray-900 truncate">{item.name}</h3>
                <p className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">{item.detail}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.purchased}</p>
                <p className="text-xs font-bold text-gray-900 mt-1">{item.price}</p>
              </div>
            </div>

            <button
              onClick={() => alert(`Reordering ${item.name}`)}
              className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#00580C] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              <RefreshCcw size={12} /> Buy Again
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// YOUR GRAINRISE REWARDS
// ============================================================

function RewardsBanner() {
  const navigate = useNavigate();
  const points = 1240;
  const nextTier = 1500;
  const pct = Math.min((points / nextTier) * 100, 100);

  return (
    <div
      className="rounded-2xl border border-[#D1E7DD] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs"
      style={{
        background: "linear-gradient(90deg, #FEF9EE 0%, #F5FBF7 40%, #EDF8F2 100%)",
      }}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#F59E0B] flex items-center justify-center text-white shrink-0 shadow-sm">
          <Star size={22} className="fill-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-700 tracking-wider uppercase">
              YOUR GRAINRISE REWARDS
            </span>
            <span className="text-[10px] font-bold bg-[#FEF3C7] text-[#B45309] px-2 py-0.2 rounded">
              Tier: Gold Patron
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mt-0.5">
            1,240 <span className="text-sm font-semibold text-gray-700">Points Available</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            You're only <span className="font-bold text-[#00580C]">260 points</span> away from your next ₱50 discount voucher.
          </p>
        </div>
      </div>

      <div className="w-full md:w-auto flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="w-full md:w-48">
          <div className="flex justify-between text-[11px] font-semibold text-gray-500 mb-1">
            <span>{points.toLocaleString()} pts</span>
            <span>{nextTier.toLocaleString()} pts</span>
          </div>
          <div className="h-2 bg-gray-200/80 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #F59E0B 0%, #84CC16 60%, #00580C 100%)",
              }}
            />
          </div>
        </div>

        <button
          id="consumer-view-rewards"
          onClick={() => navigate("/consumer/promotions")}
          className="px-5 py-2.5 bg-[#00580C] hover:bg-[#016f0e] text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0 shadow-sm flex items-center justify-center gap-1"
        >
          View Rewards <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function ConsumerLandingPage() {
  const navigate = useNavigate();
  const [activePath, setActivePath] = useState("/consumer/home");

  const handleNavigate = (path) => {
    setActivePath(path);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] font-sans antialiased text-gray-800">
      <ConsumerNavbar activePath={activePath} onNavigate={handleNavigate} />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 pb-16">
        <HeroSection />
        <ShopByCategory />
        <QuickAccess />
        <RecommendedProducts />
        <OffersAndMarket />
        <LatestOrderTracker />
        <BuyAgainSection />
        <RewardsBanner />
      </main>
    </div>
  );
}