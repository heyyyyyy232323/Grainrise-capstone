import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tag,
  Clock,
  Wallet,
  Coins,
  TrendingUp,
  Gift,
  Copy,
  Check,
  CheckCircle2,
  Headphones,
  Info,
  Sparkles,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Search,
  RotateCcw,
  X,
  Percent,
  ShieldCheck,
  AlertCircle,
  ShoppingBag,
  Award,
  HelpCircle,
  Phone,
  Mail,
  MessageSquare,
} from "lucide-react";
import ConsumerNavbar from "../../Components/Major-Components/ConsumerNavbar";

// ============================================================
// MOCK DATA - PROMOTIONS
// ============================================================
const PROMOTIONS_DATA = [
  {
    id: "promo-1",
    tag: "Fixed Discount",
    tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    status: "Available",
    statusColor: "text-emerald-700",
    title: "₱100 OFF Rice Orders",
    description: "Save ₱100 when you spend at least ₱2,000 on eligible rice products.",
    type: "Fixed Discount",
    variety: "Dinorado, Sinandomeng",
    minSpend: "₱2,000.00",
    validUntil: "Sep 30, 2026",
    applicableRice: "Dinorado, Sinandomeng",
    code: "GRAIN100",
    hasCode: true,
    actionLabel: "View Products",
    terms: [
      "Minimum order value of ₱2,000.00 on eligible rice sacks.",
      "Applicable to Dinorado and Sinandomeng varieties only.",
      "Can be used once per customer account during the promotional period.",
      "Cannot be combined with other bulk tier discount codes.",
      "Valid until September 30, 2026, 11:59 PM PHT.",
    ],
  },
  {
    id: "promo-2",
    tag: "Bulk Order Discount",
    tagColor: "bg-blue-50 text-blue-700 border-blue-200",
    status: "Ending Soon",
    statusColor: "text-amber-600",
    title: "5% Bulk Order Discount",
    description: "Get 5% off selected 50 kg rice packages when buying 2 or more sacks.",
    type: "Bulk Order Discount",
    variety: "All Rice Varieties",
    minQuantity: "2 × 50 kg packages",
    validUntil: "Sep 20, 2026 (7 days left)",
    validUntilWarning: true,
    application: "Auto-applied at checkout",
    hasCode: false,
    autoNote: "No code required. Discount automatically calculated.",
    actionLabel: "View Bulk Rice",
    terms: [
      "Valid for purchases of 2 or more 50kg rice sacks from any certified warehouse.",
      "Discount is automatically calculated and reflected in your cart upon checkout.",
      "Includes standard wholesale warranty and moisture-tested batch quality.",
      "Valid until September 20, 2026.",
    ],
  },
  {
    id: "promo-3",
    tag: "Bonus Points",
    tagColor: "bg-purple-50 text-purple-700 border-purple-200",
    status: "Ending Soon",
    statusColor: "text-amber-600",
    title: "Double Loyalty Points (2×)",
    description: "Earn double loyalty points on selected GrainRise purchases across certified millers.",
    type: "Bonus Points",
    variety: "Certified Miller Hub Rice",
    validUntil: "Sep 15, 2026 (2 days left)",
    validUntilWarning: true,
    applicableTo: "Certified Miller Hub Rice Orders",
    rewardCredit: "Credited upon order delivery",
    hasCode: false,
    autoNote: "Automatic 2× multiplier on loyalty point accrual",
    autoNoteIcon: "award",
    actionLabel: "View Eligible Products",
    terms: [
      "Double points will automatically be credited to your account once the delivery is marked completed.",
      "Applicable only to orders sourced directly from certified miller hubs.",
      "Points do not expire for 12 months from accrual date.",
      "Valid until September 15, 2026.",
    ],
  },
  {
    id: "promo-4",
    tag: "Free Delivery",
    tagColor: "bg-teal-50 text-teal-700 border-teal-200",
    status: "Available",
    statusColor: "text-emerald-700",
    title: "Free Standard Delivery",
    description: "Get free delivery on retail or wholesale orders worth ₱3,000 or more.",
    type: "Free Delivery",
    variety: "All Rice Varieties",
    minSpend: "₱3,000.00",
    validUntil: "Sep 25, 2026",
    coverage: "Metro Manila & Bulacan Hubs",
    code: "FREEDEL",
    hasCode: true,
    actionLabel: "View Products",
    terms: [
      "Applicable for standard logistics deliveries within Metro Manila and Bulacan hub zones.",
      "Requires a minimum total order value of ₱3,000.00.",
      "Applicable for up to 4 sacks (200kg total maximum per delivery run).",
      "Valid until September 25, 2026.",
    ],
  },
  {
    id: "promo-5",
    tag: "Special Variety",
    tagColor: "bg-amber-50 text-amber-800 border-amber-200",
    status: "Available",
    statusColor: "text-emerald-700",
    title: "10% OFF Premium Jasmine Rice",
    description: "Special price reduction for fragrant jasmine rice bags from North Caloocan store.",
    type: "Special Variety",
    variety: "Special Fragrant Jasmine",
    retailer: "North Caloocan Rice Store",
    validUntil: "Sep 28, 2026",
    product: "Special Fragrant Jasmine (25kg)",
    code: "JASMINE10",
    hasCode: true,
    actionLabel: "View Products",
    terms: [
      "Applies exclusively to Special Fragrant Jasmine (25kg) bags.",
      "Order must be fulfilled from North Caloocan Rice Store inventory.",
      "Discount applies on up to 5 bags per customer transaction.",
      "Valid until September 28, 2026.",
    ],
  },
  {
    id: "promo-6",
    tag: "Fixed Discount",
    tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    status: "Available",
    statusColor: "text-emerald-700",
    title: "₱50 OFF First Repeat Order",
    description: "Enjoy ₱50 off when ordering again from your favorite retailer within 30 days.",
    type: "Fixed Discount",
    variety: "All Rice Varieties",
    minSpend: "₱1,200.00",
    validUntil: "Oct 15, 2026",
    eligibility: "Repeat Orders only",
    code: "REPEAT50",
    hasCode: true,
    actionLabel: "View Products",
    terms: [
      "Valid for consumers who completed at least 1 previous order with the same merchant.",
      "Requires minimum cart value of ₱1,200.00.",
      "Must be used within 30 days of the previous order completion date.",
      "Valid until October 15, 2026.",
    ],
  },
];

// ============================================================
// MOCK DATA - REWARDS & POINTS
// ============================================================
const INITIAL_POINTS = 1240;
const NEXT_REWARD_TARGET = 1500;

const AVAILABLE_REWARDS = [
  {
    id: "rew-1",
    points: 500,
    title: "₱50 Order Discount",
    description: "Use 500 points to get ₱50 off an eligible GrainRise purchase.",
    eligible: true,
    popular: false,
    codePrefix: "REW50",
  },
  {
    id: "rew-2",
    points: 900,
    title: "₱100 Order Discount",
    description: "Redeem 900 points for a ₱100 discount on your next eligible order.",
    eligible: true,
    popular: true,
    codePrefix: "REW100",
  },
  {
    id: "rew-3",
    points: 700,
    title: "Free Delivery Voucher",
    description: "Redeem points for free delivery on an eligible GrainRise order.",
    eligible: true,
    popular: false,
    codePrefix: "REWFD",
  },
  {
    id: "rew-4",
    points: 1500,
    title: "₱150 Bulk Purchase Discount",
    description: "Get ₱150 off an eligible bulk rice purchase.",
    eligible: false,
    popular: false,
    codePrefix: "REW150",
  },
];

const INITIAL_MY_REWARDS = [
  {
    id: "my-1",
    title: "₱50 Order Discount Voucher",
    code: "REWARD-50-8481",
    pointsSpent: 500,
    expiresAt: "Oct 20, 2026",
    status: "Active",
    discount: "₱50 OFF",
  },
  {
    id: "my-2",
    title: "Free Delivery Voucher",
    code: "REWARD-FD-9921",
    pointsSpent: 700,
    expiresAt: "Nov 15, 2026",
    status: "Active",
    discount: "Free Delivery",
  },
  {
    id: "my-3",
    title: "10% Off Premium Grain Voucher",
    code: "REWARD-10-3342",
    pointsSpent: 650,
    expiresAt: "Oct 30, 2026",
    status: "Active",
    discount: "10% OFF",
  },
];

const INITIAL_POINTS_HISTORY = [
  {
    id: "hist-1",
    title: "Order Completed - #GR-88421",
    details: "2 × 50kg Dinorado Rice from Golden Grains",
    date: "Sep 05, 2026",
    type: "Purchase Accrual",
    points: "+120 pts",
    positive: true,
  },
  {
    id: "hist-2",
    title: "Redeemed Voucher - ₱50 Order Discount",
    details: "Code: REWARD-50-8481",
    date: "Aug 28, 2026",
    type: "Reward Redemption",
    points: "-500 pts",
    positive: false,
  },
  {
    id: "hist-3",
    title: "Verified Product Review",
    details: "Reviewed: Special Fragrant Jasmine Rice (25kg)",
    date: "Aug 20, 2026",
    type: "Review Bonus",
    points: "+50 pts",
    positive: true,
  },
  {
    id: "hist-4",
    title: "GrainRise Welcome Bonus",
    details: "New verified consumer account registration",
    date: "Aug 01, 2026",
    type: "Account Activation",
    points: "+500 pts",
    positive: true,
  },
];

export default function ConsumerPromotions() {
  const navigate = useNavigate();

  // Navigation Tabs: "promotions" | "rewards"
  const [activeMainTab, setActiveMainTab] = useState("promotions");

  // Rewards Subtabs: "available" | "my_rewards" | "history"
  const [activeRewardsSubTab, setActiveRewardsSubTab] = useState("available");

  // Filter States for Promotions
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterVariety, setFilterVariety] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("Ending Soon");

  // State for user rewards & points
  const [currentPoints, setCurrentPoints] = useState(INITIAL_POINTS);
  const [myRewards, setMyRewards] = useState(INITIAL_MY_REWARDS);
  const [pointsHistory, setPointsHistory] = useState(INITIAL_POINTS_HISTORY);

  // Modals & Feedback
  const [termsModalData, setTermsModalData] = useState(null);
  const [redeemModalData, setRedeemModalData] = useState(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Copy code helper
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Code "${code}" copied to clipboard!`);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterType("All");
    setFilterVariety("All");
    setFilterStatus("All");
    setSortBy("Ending Soon");
  };

  // Filtered & Sorted Promotions
  const filteredPromotions = useMemo(() => {
    return PROMOTIONS_DATA.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.applicableRice && item.applicableRice.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = filterType === "All" || item.type === filterType;
      const matchesVariety =
        filterVariety === "All" ||
        item.variety.toLowerCase().includes(filterVariety.toLowerCase()) ||
        item.variety === "All Rice Varieties";
      const matchesStatus = filterStatus === "All" || item.status === filterStatus;

      return matchesSearch && matchesType && matchesVariety && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === "Ending Soon") {
        if (a.status === "Ending Soon" && b.status !== "Ending Soon") return -1;
        if (b.status === "Ending Soon" && a.status !== "Ending Soon") return 1;
        return 0;
      }
      return 0;
    });
  }, [searchQuery, filterType, filterVariety, filterStatus, sortBy]);

  // Handle Reward Redemption
  const confirmRedeemReward = (reward) => {
    if (currentPoints < reward.points) return;

    const newPoints = currentPoints - reward.points;
    const uniqueCode = `${reward.codePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRewardItem = {
      id: `my-${Date.now()}`,
      title: reward.title,
      code: uniqueCode,
      pointsSpent: reward.points,
      expiresAt: "Nov 30, 2026",
      status: "Active",
      discount: reward.title.includes("Free") ? "Free Delivery" : reward.title.split(" ")[0],
    };

    const newHistoryItem = {
      id: `hist-${Date.now()}`,
      title: `Redeemed Voucher - ${reward.title}`,
      details: `Code: ${uniqueCode}`,
      date: "Today",
      type: "Reward Redemption",
      points: `-${reward.points} pts`,
      positive: false,
    };

    setCurrentPoints(newPoints);
    setMyRewards([newRewardItem, ...myRewards]);
    setPointsHistory([newHistoryItem, ...pointsHistory]);
    setRedeemModalData(null);
    showToast(`Successfully redeemed "${reward.title}"! Code: ${uniqueCode}`);
  };

  const progressPercentage = Math.min(100, Math.round((currentPoints / NEXT_REWARD_TARGET) * 100));
  const pointsRemaining = Math.max(0, NEXT_REWARD_TARGET - currentPoints);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-800 flex flex-col font-sans">
      {/* Top Global Consumer Navbar */}
      <ConsumerNavbar activePath="/consumer/promotions" />

      {/* Main Page Container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <button
            onClick={() => setActiveMainTab("promotions")}
            className="hover:text-gray-900 transition cursor-pointer"
          >
            Promotion & Rewards
          </button>
          <span>&gt;</span>
          <span className="font-semibold text-[#00580C]">
            {activeMainTab === "promotions" ? "Promotions" : "Rewards & Points"}
          </span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Promotions & Rewards
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Save on your purchases and earn rewards every time you shop through GrainRise.
            </p>
          </div>

          {/* Need Help? Contact Support Button */}
          <button
            onClick={() => setSupportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-xs text-gray-700 shadow-xs transition self-start sm:self-auto cursor-pointer"
          >
            <Headphones size={15} className="text-gray-500" />
            <span>Need Help?</span>
            <span className="font-semibold text-[#00580C]">Contact Support</span>
          </button>
        </div>

        {/* Primary Tabs */}
        <div className="flex items-center gap-6 border-b border-gray-200">
          <button
            onClick={() => setActiveMainTab("promotions")}
            className={`flex items-center gap-2 pb-3.5 text-sm font-semibold transition relative cursor-pointer ${
              activeMainTab === "promotions"
                ? "text-[#00580C] border-b-2 border-[#00580C]"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>Promotions</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              6
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab("rewards")}
            className={`flex items-center gap-2 pb-3.5 text-sm font-semibold transition relative cursor-pointer ${
              activeMainTab === "rewards"
                ? "text-[#00580C] border-b-2 border-[#00580C]"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>Rewards & Points</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {currentPoints.toLocaleString()} pts
            </span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* VIEW 1: PROMOTIONS TAB */}
        {/* ============================================================ */}
        {activeMainTab === "promotions" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Available Offers */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
                    Available Offers
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">6</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Promotions you can currently use
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Tag size={20} />
                </div>
              </div>

              {/* Card 2: Expiring Soon */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
                    Expiring Soon
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">2</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Offers ending within 7 days
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <Clock size={20} />
                </div>
              </div>

              {/* Card 3: Saved This Month */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
                    Saved This Month
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">₱420.00</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Total discounts from your purchases
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Wallet size={20} />
                </div>
              </div>
            </div>

            {/* Search and Filters Section */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search promotions or promo codes..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00580C]/20 focus:border-[#00580C] transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filter Dropdowns Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Type Filter */}
                  <div className="relative">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
                    >
                      <option value="All">Type: All Promotions</option>
                      <option value="Fixed Discount">Fixed Discount</option>
                      <option value="Bulk Order Discount">Bulk Order Discount</option>
                      <option value="Bonus Points">Bonus Points</option>
                      <option value="Free Delivery">Free Delivery</option>
                      <option value="Special Variety">Special Variety</option>
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>

                  {/* Product Filter */}
                  <div className="relative">
                    <select
                      value={filterVariety}
                      onChange={(e) => setFilterVariety(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
                    >
                      <option value="All">Product: All Rice Varieties</option>
                      <option value="Dinorado">Dinorado</option>
                      <option value="Sinandomeng">Sinandomeng</option>
                      <option value="Jasmine">Fragrant Jasmine</option>
                      <option value="Certified Miller">Certified Miller Hub Rice</option>
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="relative">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
                    >
                      <option value="All">Status: All Statuses</option>
                      <option value="Available">Available</option>
                      <option value="Ending Soon">Ending Soon</option>
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Right Sort & Reset */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
                    >
                      <option value="Ending Soon">Sort: Ending Soon</option>
                      <option value="Newest">Sort: Newest First</option>
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>

                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-gray-500 hover:text-gray-900 transition flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Reset Filters</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Available Promotions Grid Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Available Promotions</h2>
                  <p className="text-xs text-gray-500">
                    Browse discounts and rewards currently available in the GrainRise marketplace.
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  Showing {filteredPromotions.length} of {PROMOTIONS_DATA.length} offers
                </span>
              </div>

              {/* 3-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPromotions.map((promo) => (
                  <div
                    key={promo.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200"
                  >
                    {/* Top Row: Tag & Status */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${promo.tagColor}`}
                        >
                          {promo.tag}
                        </span>
                        <span
                          className={`flex items-center gap-1 text-xs font-medium ${
                            promo.status === "Ending Soon"
                              ? "text-amber-600"
                              : "text-emerald-700"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              promo.status === "Ending Soon"
                                ? "bg-amber-500"
                                : "bg-emerald-600"
                            }`}
                          />
                          {promo.status}
                        </span>
                      </div>

                      {/* Promo Title & Description */}
                      <h3 className="text-base font-bold text-gray-900 tracking-tight">
                        {promo.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {promo.description}
                      </p>

                      {/* Key-Value Details */}
                      <div className="border-t border-b border-gray-100 my-3.5 py-3 space-y-1.5 text-xs">
                        {promo.minSpend && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Minimum Spend:</span>
                            <span className="font-semibold text-gray-900">{promo.minSpend}</span>
                          </div>
                        )}
                        {promo.minQuantity && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Minimum Quantity:</span>
                            <span className="font-semibold text-gray-900">{promo.minQuantity}</span>
                          </div>
                        )}
                        {promo.retailer && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Retailer:</span>
                            <span className="font-semibold text-gray-900">{promo.retailer}</span>
                          </div>
                        )}
                        {promo.validUntil && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Valid Until:</span>
                            <span
                              className={`font-semibold ${
                                promo.validUntilWarning
                                  ? "text-amber-600"
                                  : "text-gray-900"
                              }`}
                            >
                              {promo.validUntil}
                            </span>
                          </div>
                        )}
                        {promo.applicableRice && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Applicable Rice:</span>
                            <span className="font-semibold text-gray-900 text-right">
                              {promo.applicableRice}
                            </span>
                          </div>
                        )}
                        {promo.product && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Product:</span>
                            <span className="font-semibold text-gray-900 text-right">
                              {promo.product}
                            </span>
                          </div>
                        )}
                        {promo.applicableTo && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Applicable To:</span>
                            <span className="font-semibold text-gray-900 text-right">
                              {promo.applicableTo}
                            </span>
                          </div>
                        )}
                        {promo.application && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Application:</span>
                            <span className="font-semibold text-emerald-700">
                              {promo.application}
                            </span>
                          </div>
                        )}
                        {promo.rewardCredit && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Reward Credit:</span>
                            <span className="font-semibold text-emerald-700">
                              {promo.rewardCredit}
                            </span>
                          </div>
                        )}
                        {promo.coverage && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Coverage:</span>
                            <span className="font-semibold text-gray-900 text-right">
                              {promo.coverage}
                            </span>
                          </div>
                        )}
                        {promo.eligibility && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Eligibility:</span>
                            <span className="font-semibold text-gray-900">
                              {promo.eligibility}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Promo Code Box OR Auto Note */}
                      {promo.hasCode ? (
                        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-2.5 flex items-center justify-between mb-4">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              Promo Code
                            </p>
                            <p className="text-xs font-bold text-gray-900 font-mono tracking-wider">
                              {promo.code}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopyCode(promo.code)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-2xs cursor-pointer"
                          >
                            {copiedCode === promo.code ? (
                              <>
                                <Check size={13} className="text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} className="text-gray-500" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`rounded-xl p-2.5 flex items-center gap-2 text-xs mb-4 ${
                            promo.autoNoteIcon === "award"
                              ? "bg-purple-50/60 border border-purple-100 text-purple-800"
                              : "bg-blue-50/60 border border-blue-100 text-blue-800"
                          }`}
                        >
                          {promo.autoNoteIcon === "award" ? (
                            <Sparkles size={14} className="text-purple-600 shrink-0" />
                          ) : (
                            <Info size={14} className="text-blue-600 shrink-0" />
                          )}
                          <span className="text-[11px] leading-tight font-medium">
                            {promo.autoNote}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Bottom: Terms link & Action Button */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        onClick={() => setTermsModalData(promo)}
                        className="text-xs text-gray-500 hover:text-gray-800 underline font-medium cursor-pointer"
                      >
                        Terms & Details
                      </button>

                      <button
                        onClick={() => navigate("/consumer/marketplace")}
                        className="px-4 py-2 rounded-xl bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        {promo.actionLabel}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: REWARDS & POINTS TAB */}
        {/* ============================================================ */}
        {activeMainTab === "rewards" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Current Points */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
                    Current Points
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                    {currentPoints.toLocaleString()} <span className="text-base font-medium">pts</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Available to redeem</p>
                  <button
                    onClick={() => setActiveRewardsSubTab("available")}
                    className="text-xs font-semibold text-[#00580C] hover:underline mt-2 inline-flex items-center gap-1 cursor-pointer"
                  >
                    View Rewards <ArrowRight size={12} />
                  </button>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Coins size={20} />
                </div>
              </div>

              {/* Card 2: Points Earned This Month */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
                    Points Earned This Month
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                    320 <span className="text-base font-medium">pts</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    From eligible completed purchases
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <TrendingUp size={20} />
                </div>
              </div>

              {/* Card 3: Total Points Redeemed */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
                    Total Points Redeemed
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                    850 <span className="text-base font-medium">pts</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Lifetime redeemed points
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <Gift size={20} />
                </div>
              </div>
            </div>

            {/* Reward Progress Bar Section */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">Reward Progress</span>
                  <span className="text-gray-500 font-medium">
                    {currentPoints.toLocaleString()} / {NEXT_REWARD_TARGET.toLocaleString()} pts
                  </span>
                </div>
                <span className="font-semibold text-gray-700">
                  Next Reward: <span className="text-[#00580C]">₱150 Bulk Purchase Discount</span>
                </span>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#00580C] h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {/* Bottom labels */}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-0.5">
                <span>0 pts</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  {pointsRemaining > 0
                    ? `${pointsRemaining} more points to unlock the next reward.`
                    : "Congratulations! You have unlocked the highest reward tier!"}
                </span>
                <span>{NEXT_REWARD_TARGET.toLocaleString()} pts</span>
              </div>
            </div>

            {/* Rewards Sub-navigation */}
            <div className="flex items-center gap-6 border-b border-gray-200 text-xs sm:text-sm font-semibold">
              <button
                onClick={() => setActiveRewardsSubTab("available")}
                className={`pb-3 transition cursor-pointer ${
                  activeRewardsSubTab === "available"
                    ? "text-[#00580C] border-b-2 border-[#00580C]"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                Available Rewards
              </button>

              <button
                onClick={() => setActiveRewardsSubTab("my_rewards")}
                className={`pb-3 transition cursor-pointer ${
                  activeRewardsSubTab === "my_rewards"
                    ? "text-[#00580C] border-b-2 border-[#00580C]"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                My Rewards ({myRewards.length})
              </button>

              <button
                onClick={() => setActiveRewardsSubTab("history")}
                className={`pb-3 transition cursor-pointer ${
                  activeRewardsSubTab === "history"
                    ? "text-[#00580C] border-b-2 border-[#00580C]"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                Points History ({pointsHistory.length})
              </button>
            </div>

            {/* Sub-tab 1: Available Rewards Grid */}
            {activeRewardsSubTab === "available" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-150">
                {AVAILABLE_REWARDS.map((rew) => {
                  const isEligible = currentPoints >= rew.points;
                  return (
                    <div
                      key={rew.id}
                      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative hover:shadow-md transition"
                    >
                      {/* Popular ribbon */}
                      {rew.popular && (
                        <div className="absolute -top-2.5 right-4 bg-amber-400 text-amber-950 font-bold text-[10px] tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
                          POPULAR
                        </div>
                      )}

                      <div>
                        {/* Top: Points & Eligibility */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                              isEligible
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {rew.points.toLocaleString()} pts
                          </span>

                          <span
                            className={`text-[11px] font-semibold ${
                              isEligible ? "text-emerald-700" : "text-amber-600"
                            }`}
                          >
                            {isEligible ? "Eligible" : "Not Enough Points"}
                          </span>
                        </div>

                        {/* Title & Subtitle */}
                        <h3 className="text-sm font-bold text-gray-900">{rew.title}</h3>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {rew.description}
                        </p>

                        {!isEligible && (
                          <p className="text-[11px] text-gray-400 mt-2">
                            Current Balance: {currentPoints.toLocaleString()} pts
                          </p>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-4">
                        {isEligible ? (
                          <button
                            onClick={() => setRedeemModalData(rew)}
                            className="w-full py-2 rounded-xl bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                          >
                            Redeem
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-full py-2 rounded-xl bg-gray-100 text-gray-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
                          >
                            <Lock size={13} />
                            <span>Need {rew.points - currentPoints} More Points</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sub-tab 2: My Rewards */}
            {activeRewardsSubTab === "my_rewards" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {myRewards.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 space-y-2">
                    <Gift size={36} className="mx-auto text-gray-300" />
                    <p className="font-semibold text-gray-700">No Redeemed Vouchers Yet</p>
                    <p className="text-xs">
                      Redeem available rewards using your loyalty points above!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {myRewards.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                              {item.discount}
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700">
                              ● {item.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                          <p className="text-xs text-gray-400 mt-1">
                            Expires on {item.expiresAt}
                          </p>

                          {/* Voucher Code Box */}
                          <div className="mt-3 p-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-gray-800">
                              {item.code}
                            </span>
                            <button
                              onClick={() => handleCopyCode(item.code)}
                              className="text-xs text-[#00580C] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Copy size={12} />
                              Copy
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate("/consumer/marketplace")}
                          className="mt-4 w-full py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                          Use in Marketplace
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Points History */}
            {activeRewardsSubTab === "history" && (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs animate-in fade-in duration-150">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Points Activity Log</h3>
                  <span className="text-xs text-gray-400">
                    Showing latest transactions
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {pointsHistory.map((hist) => (
                    <div
                      key={hist.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            hist.positive
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {hist.positive ? <TrendingUp size={16} /> : <Gift size={16} />}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-gray-900">
                            {hist.title}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {hist.details} • {hist.date}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xs sm:text-sm font-bold ${
                            hist.positive ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          {hist.points}
                        </span>
                        <p className="text-[10px] text-gray-400">{hist.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Info Box: How to Earn Points */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <Info size={16} className="text-[#00580C]" />
                <span>How to Earn Points</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1 */}
                <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-gray-900">
                    1. Complete Eligible Purchases
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Earn loyalty points after eligible GrainRise orders are successfully completed and delivered.
                  </p>
                </div>

                {/* 2 */}
                <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-gray-900">
                    2. Join Special Promotions
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Earn bonus or double (2×) points during selected promotional campaigns and seasonal harvest periods.
                  </p>
                </div>

                {/* 3 */}
                <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-gray-900">
                    3. Write Verified Reviews
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Help fellow consumers with honest feedback on delivered rice sacks to earn points upon publication.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: TERMS & DETAILS MODAL */}
      {/* ============================================================ */}
      {termsModalData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  {termsModalData.tag}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">
                  {termsModalData.title}
                </h3>
              </div>
              <button
                onClick={() => setTermsModalData(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {termsModalData.description}
            </p>

            <div className="bg-gray-50 rounded-xl p-3.5 space-y-2 text-xs">
              <p className="font-bold text-gray-900">Terms & Conditions:</p>
              <ul className="space-y-1.5 list-disc pl-4 text-gray-600">
                {termsModalData.terms.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>

            {termsModalData.hasCode && (
              <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-800">
                    Promo Code
                  </p>
                  <p className="text-sm font-mono font-bold text-emerald-950">
                    {termsModalData.code}
                  </p>
                </div>
                <button
                  onClick={() => handleCopyCode(termsModalData.code)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 cursor-pointer shadow-2xs"
                >
                  Copy Code
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTermsModalData(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setTermsModalData(null);
                  navigate("/consumer/marketplace");
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#00580C] hover:bg-[#0c432f] rounded-xl cursor-pointer shadow-xs"
              >
                Shop Eligible Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: REDEEM REWARD CONFIRMATION MODAL */}
      {/* ============================================================ */}
      {redeemModalData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <Gift size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-gray-900">
                Redeem Reward
              </h3>
              <p className="text-xs text-gray-500">
                Are you sure you want to redeem this reward voucher?
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Reward:</span>
                <span className="font-bold text-gray-900">{redeemModalData.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Points Required:</span>
                <span className="font-bold text-emerald-700">
                  {redeemModalData.points.toLocaleString()} pts
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-500">Remaining Balance:</span>
                <span className="font-bold text-gray-900">
                  {(currentPoints - redeemModalData.points).toLocaleString()} pts
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRedeemModalData(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmRedeemReward(redeemModalData)}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-[#00580C] hover:bg-[#0c432f] rounded-xl cursor-pointer shadow-xs"
              >
                Confirm & Redeem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: CONTACT SUPPORT MODAL */}
      {/* ============================================================ */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Headphones size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    GrainRise Customer Support
                  </h3>
                  <p className="text-xs text-gray-400">
                    We're here to help with promotions, vouchers, and orders
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSupportModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Contact Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 border border-gray-200 rounded-xl bg-gray-50/50 space-y-1">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <Phone size={14} />
                  <span>Hotline</span>
                </div>
                <p className="font-semibold text-gray-900">(02) 8842-4724</p>
                <p className="text-[10px] text-gray-400">Mon - Sat, 8:00 AM - 6:00 PM</p>
              </div>

              <div className="p-3.5 border border-gray-200 rounded-xl bg-gray-50/50 space-y-1">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <Mail size={14} />
                  <span>Email Support</span>
                </div>
                <p className="font-semibold text-gray-900">support@grainrise.ph</p>
                <p className="text-[10px] text-gray-400">Response within 24 hours</p>
              </div>
            </div>

            {/* FAQ Topics */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-900">Frequently Asked Questions:</p>
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 text-xs">
                <details className="p-3 cursor-pointer group">
                  <summary className="font-semibold text-gray-800 flex items-center justify-between">
                    <span>How do I apply a promo code at checkout?</span>
                    <ChevronDown size={14} className="text-gray-400 group-open:rotate-180 transition" />
                  </summary>
                  <p className="text-gray-500 mt-2 text-[11px] leading-relaxed">
                    Copy the promo code and paste it into the "Promo Code / Voucher" field in your cart summary before clicking Proceed to Checkout.
                  </p>
                </details>

                <details className="p-3 cursor-pointer group">
                  <summary className="font-semibold text-gray-800 flex items-center justify-between">
                    <span>When do my loyalty points expire?</span>
                    <ChevronDown size={14} className="text-gray-400 group-open:rotate-180 transition" />
                  </summary>
                  <p className="text-gray-500 mt-2 text-[11px] leading-relaxed">
                    Loyalty points remain valid for 12 months from the date of the completed delivery transaction.
                  </p>
                </details>

                <details className="p-3 cursor-pointer group">
                  <summary className="font-semibold text-gray-800 flex items-center justify-between">
                    <span>Can I combine multiple discount vouchers?</span>
                    <ChevronDown size={14} className="text-gray-400 group-open:rotate-180 transition" />
                  </summary>
                  <p className="text-gray-500 mt-2 text-[11px] leading-relaxed">
                    Only 1 promo code or reward voucher may be applied per checkout order unless specified in special promotion terms.
                  </p>
                </details>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSupportModalOpen(false)}
                className="px-4 py-2 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs"
              >
                Got It
              </button>
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
