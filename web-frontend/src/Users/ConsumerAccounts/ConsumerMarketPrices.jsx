import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  RotateCcw,
  Bell,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Star,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Sparkles,
  Store,
  MapPin,
  Package,
  Calendar,
  Layers,
  ArrowUp,
  ArrowDown,
  Asterisk,
  Check,
  CheckSquare,
  AlertTriangle,
  Clock,
  SlidersHorizontal,
} from "lucide-react";
import ConsumerNavbar from "../../Components/Major-Components/ConsumerNavbar";

// ============================================================
// DATA SETS - OVERVIEW
// ============================================================

const VARIETIES_OVERVIEW = [
  {
    id: "dinorado",
    name: "Dinorado",
    color: "bg-amber-500",
    dotColor: "#F59E0B",
    avgPrice: 58.0,
    lowPrice: 55.0,
    highPrice: 61.0,
    change: "+₱2.00",
    changeType: "increase",
    trend: "Increasing ↑",
    trendColor: "bg-amber-50 text-amber-700 border-amber-200",
    type: "Specialty / Premium",
    location: "Bulacan, Isabela",
    sellersCount: 6,
    chartData6M: [
      { month: "Apr 2026", price: 54.0 },
      { month: "May 2026", price: 55.0 },
      { month: "Jun 2026", price: 54.0 },
      { month: "Jul 2026", price: 55.0 },
      { month: "Aug 2026", price: 56.0 },
      { month: "Sep 2026", price: 58.0 },
    ],
    chartData3M: [
      { month: "Jul 2026", price: 55.0 },
      { month: "Aug 2026", price: 56.0 },
      { month: "Sep 2026", price: 58.0 },
    ],
    chartData1Y: [
      { month: "Oct 2025", price: 52.0 },
      { month: "Dec 2025", price: 53.0 },
      { month: "Feb 2026", price: 53.5 },
      { month: "Apr 2026", price: 54.0 },
      { month: "Jun 2026", price: 54.0 },
      { month: "Aug 2026", price: 56.0 },
      { month: "Sep 2026", price: 58.0 },
    ],
    prevAvg: 56.0,
    netChange: "+₱2.00 (+3.6%)",
  },
  {
    id: "sinandomeng",
    name: "Sinandomeng",
    color: "bg-emerald-500",
    dotColor: "#10B981",
    avgPrice: 52.0,
    lowPrice: 50.0,
    highPrice: 55.0,
    change: "-₱1.00",
    changeType: "decrease",
    trend: "Decreasing ↓",
    trendColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    type: "Well-Milled",
    location: "Nueva Ecija, Bulacan",
    sellersCount: 8,
    chartData6M: [
      { month: "Apr 2026", price: 55.0 },
      { month: "May 2026", price: 54.5 },
      { month: "Jun 2026", price: 54.0 },
      { month: "Jul 2026", price: 53.5 },
      { month: "Aug 2026", price: 53.0 },
      { month: "Sep 2026", price: 52.0 },
    ],
    chartData3M: [
      { month: "Jul 2026", price: 53.5 },
      { month: "Aug 2026", price: 53.0 },
      { month: "Sep 2026", price: 52.0 },
    ],
    chartData1Y: [
      { month: "Oct 2025", price: 56.0 },
      { month: "Dec 2025", price: 55.5 },
      { month: "Feb 2026", price: 55.0 },
      { month: "Apr 2026", price: 55.0 },
      { month: "Jun 2026", price: 54.0 },
      { month: "Aug 2026", price: 53.0 },
      { month: "Sep 2026", price: 52.0 },
    ],
    prevAvg: 53.0,
    netChange: "-₱1.00 (-1.9%)",
  },
  {
    id: "nsic-222",
    name: "NSIC Rc 222",
    color: "bg-blue-600",
    dotColor: "#2563EB",
    avgPrice: 49.0,
    lowPrice: 47.0,
    highPrice: 52.0,
    change: "₱0.00",
    changeType: "stable",
    trend: "Stable —",
    trendColor: "bg-gray-100 text-gray-700 border-gray-200",
    type: "Regular Milled",
    location: "Pangasinan, Tarlac",
    sellersCount: 10,
    chartData6M: [
      { month: "Apr 2026", price: 49.0 },
      { month: "May 2026", price: 49.0 },
      { month: "Jun 2026", price: 49.5 },
      { month: "Jul 2026", price: 49.0 },
      { month: "Aug 2026", price: 49.0 },
      { month: "Sep 2026", price: 49.0 },
    ],
    chartData3M: [
      { month: "Jul 2026", price: 49.0 },
      { month: "Aug 2026", price: 49.0 },
      { month: "Sep 2026", price: 49.0 },
    ],
    chartData1Y: [
      { month: "Oct 2025", price: 48.0 },
      { month: "Dec 2025", price: 48.5 },
      { month: "Feb 2026", price: 49.0 },
      { month: "Apr 2026", price: 49.0 },
      { month: "Jun 2026", price: 49.5 },
      { month: "Aug 2026", price: 49.0 },
      { month: "Sep 2026", price: 49.0 },
    ],
    prevAvg: 49.0,
    netChange: "₱0.00 (0.0%)",
  },
  {
    id: "jasmine",
    name: "Jasmine",
    color: "bg-purple-600",
    dotColor: "#9333EA",
    avgPrice: 61.0,
    lowPrice: 58.0,
    highPrice: 64.0,
    change: "+₱1.50",
    changeType: "increase",
    trend: "Increasing ↑",
    trendColor: "bg-amber-50 text-amber-700 border-amber-200",
    type: "Aromatic / Premium",
    location: "Isabela, Bulacan",
    sellersCount: 5,
    chartData6M: [
      { month: "Apr 2026", price: 58.0 },
      { month: "May 2026", price: 59.0 },
      { month: "Jun 2026", price: 59.5 },
      { month: "Jul 2026", price: 60.0 },
      { month: "Aug 2026", price: 59.5 },
      { month: "Sep 2026", price: 61.0 },
    ],
    chartData3M: [
      { month: "Jul 2026", price: 60.0 },
      { month: "Aug 2026", price: 59.5 },
      { month: "Sep 2026", price: 61.0 },
    ],
    chartData1Y: [
      { month: "Oct 2025", price: 56.5 },
      { month: "Dec 2025", price: 57.0 },
      { month: "Feb 2026", price: 58.0 },
      { month: "Apr 2026", price: 58.0 },
      { month: "Jun 2026", price: 59.5 },
      { month: "Aug 2026", price: 59.5 },
      { month: "Sep 2026", price: 61.0 },
    ],
    prevAvg: 59.5,
    netChange: "+₱1.50 (+2.5%)",
  },
  {
    id: "nsic-160",
    name: "NSIC Rc 160",
    color: "bg-teal-500",
    dotColor: "#14B8A6",
    avgPrice: 50.5,
    lowPrice: 48.0,
    highPrice: 53.0,
    change: "-₱0.50",
    changeType: "decrease",
    trend: "Decreasing ↓",
    trendColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    type: "Premium Milled",
    location: "Nueva Ecija, Pampanga",
    sellersCount: 7,
    chartData6M: [
      { month: "Apr 2026", price: 52.0 },
      { month: "May 2026", price: 51.5 },
      { month: "Jun 2026", price: 51.0 },
      { month: "Jul 2026", price: 51.0 },
      { month: "Aug 2026", price: 51.0 },
      { month: "Sep 2026", price: 50.5 },
    ],
    chartData3M: [
      { month: "Jul 2026", price: 51.0 },
      { month: "Aug 2026", price: 51.0 },
      { month: "Sep 2026", price: 50.5 },
    ],
    chartData1Y: [
      { month: "Oct 2025", price: 53.0 },
      { month: "Dec 2025", price: 52.5 },
      { month: "Feb 2026", price: 52.0 },
      { month: "Apr 2026", price: 52.0 },
      { month: "Jun 2026", price: 51.0 },
      { month: "Aug 2026", price: 51.0 },
      { month: "Sep 2026", price: 50.5 },
    ],
    prevAvg: 51.0,
    netChange: "-₱0.50 (-1.0%)",
  },
];

// Seller Price Comparison Data per Variety
const SELLERS_BY_VARIETY = {
  Dinorado: [
    {
      id: "sel-1",
      name: "Greenfield Rice Store",
      sellerType: "Retailer",
      location: "Caloocan City",
      packaging: "25 kg sack",
      pricePerKg: 58.0,
      stock: "18 bags",
      rating: 4.8,
      isBestValue: false,
    },
    {
      id: "sel-2",
      name: "Bulacan Grain Milling",
      sellerType: "Miller / Supplier",
      location: "Bulacan",
      packaging: "50 kg sack",
      pricePerKg: 55.0,
      stock: "32 bags",
      rating: 4.7,
      isBestValue: true,
    },
    {
      id: "sel-3",
      name: "North Caloocan Rice Store",
      sellerType: "Retailer",
      location: "Caloocan City",
      packaging: "25 kg sack",
      pricePerKg: 61.0,
      stock: "21 bags",
      rating: 4.9,
      isBestValue: false,
    },
  ],
  Sinandomeng: [
    {
      id: "sel-4",
      name: "Golden Grains Trading",
      sellerType: "Retailer",
      location: "Quezon City",
      packaging: "25 kg sack",
      pricePerKg: 52.0,
      stock: "45 bags",
      rating: 4.8,
      isBestValue: false,
    },
    {
      id: "sel-5",
      name: "Central Luzon Rice Depot",
      sellerType: "Miller / Supplier",
      location: "Bulacan",
      packaging: "50 kg sack",
      pricePerKg: 50.0,
      stock: "50 bags",
      rating: 4.9,
      isBestValue: true,
    },
    {
      id: "sel-6",
      name: "Valenzuela Grain Hub",
      sellerType: "Retailer",
      location: "Valenzuela",
      packaging: "25 kg sack",
      pricePerKg: 54.0,
      stock: "15 bags",
      rating: 4.6,
      isBestValue: false,
    },
  ],
  "NSIC Rc 222": [
    {
      id: "sel-7",
      name: "AgriDirect Farmers Cooperative",
      sellerType: "Farmer / Supplier",
      location: "Tarlac",
      packaging: "50 kg sack",
      pricePerKg: 47.0,
      stock: "80 bags",
      rating: 4.9,
      isBestValue: true,
    },
    {
      id: "sel-8",
      name: "North Luzon Millers Inc.",
      sellerType: "Miller / Supplier",
      location: "Pangasinan",
      packaging: "50 kg sack",
      pricePerKg: 49.0,
      stock: "60 bags",
      rating: 4.7,
      isBestValue: false,
    },
    {
      id: "sel-9",
      name: "Manila Metro Rice Mart",
      sellerType: "Retailer",
      location: "Manila",
      packaging: "25 kg sack",
      pricePerKg: 52.0,
      stock: "24 bags",
      rating: 4.6,
      isBestValue: false,
    },
  ],
  Jasmine: [
    {
      id: "sel-10",
      name: "Isabela Premium Harvest",
      sellerType: "Miller / Supplier",
      location: "Isabela",
      packaging: "50 kg sack",
      pricePerKg: 58.0,
      stock: "25 bags",
      rating: 4.9,
      isBestValue: true,
    },
    {
      id: "sel-11",
      name: "North Caloocan Rice Store",
      sellerType: "Retailer",
      location: "Caloocan City",
      packaging: "25 kg sack",
      pricePerKg: 61.0,
      stock: "19 bags",
      rating: 4.9,
      isBestValue: false,
    },
    {
      id: "sel-12",
      name: "Gourmet Rice Selection Hub",
      sellerType: "Retailer",
      location: "San Juan",
      packaging: "25 kg sack",
      pricePerKg: 64.0,
      stock: "12 bags",
      rating: 4.8,
      isBestValue: false,
    },
  ],
  "NSIC Rc 160": [
    {
      id: "sel-13",
      name: "Nueva Ecija Rice Producers",
      sellerType: "Farmer / Supplier",
      location: "Nueva Ecija",
      packaging: "50 kg sack",
      pricePerKg: 48.0,
      stock: "40 bags",
      rating: 4.8,
      isBestValue: true,
    },
    {
      id: "sel-14",
      name: "Pampanga Grain Supply",
      sellerType: "Miller / Supplier",
      location: "Pampanga",
      packaging: "50 kg sack",
      pricePerKg: 50.5,
      stock: "35 bags",
      rating: 4.7,
      isBestValue: false,
    },
    {
      id: "sel-15",
      name: "Quezon City Rice Terminal",
      sellerType: "Retailer",
      location: "Quezon City",
      packaging: "25 kg sack",
      pricePerKg: 53.0,
      stock: "20 bags",
      rating: 4.5,
      isBestValue: false,
    },
  ],
};

// ============================================================
// DATA SETS - PRICE ALERTS
// ============================================================
const INITIAL_ACTIVE_ALERTS = [
  {
    id: "alt-1",
    variety: "Dinorado",
    dotColor: "#F59E0B",
    condition: "Drops below",
    targetPrice: 55.0,
    currentPrice: 58.0,
    variance: "▲ ₱3.00 variance",
    varianceType: "up",
    location: "All Locations",
    status: "Monitoring",
    created: "Sep 8, 2026",
  },
  {
    id: "alt-2",
    variety: "NSIC Rc 222",
    dotColor: "#2563EB",
    condition: "Drops below",
    targetPrice: 46.0,
    currentPrice: 49.0,
    variance: "▲ ₱1.00 variance",
    varianceType: "up",
    location: "Bulacan",
    status: "Monitoring",
    created: "Sep 6, 2026",
  },
  {
    id: "alt-3",
    variety: "Jasmine",
    dotColor: "#9333EA",
    condition: "Rises above",
    targetPrice: 62.0,
    currentPrice: 61.0,
    variance: "▼ ₱1.00 variance",
    varianceType: "down",
    location: "Caloocan City",
    status: "Monitoring",
    created: "Sep 4, 2026",
  },
  {
    id: "alt-4",
    variety: "Sinandomeng",
    dotColor: "#10B981",
    condition: "Drops below",
    targetPrice: 50.0,
    currentPrice: 52.0,
    variance: "▲ ₱2.00 variance",
    varianceType: "up",
    location: "Quezon City",
    status: "Paused",
    created: "Aug 28, 2026",
  },
];

const INITIAL_TRIGGERED_ALERTS = [
  {
    id: "trig-1",
    title: "Dinorado reached ₱54.50/kg",
    statusBadge: "Triggered",
    badgeType: "green",
    targetText: "Your target: Drops below ₱55.00/kg",
    timestamp: "Sep 8, 2026 • 6:20 AM",
    actionType: "products",
    variety: "Dinorado",
    details: "Bulacan Grain Milling listed 50kg Dinorado sacks at ₱54.50/kg, matching your alert criteria.",
  },
  {
    id: "trig-2",
    title: "Sinandomeng reached ₱51.00/kg",
    statusBadge: "Triggered",
    badgeType: "green",
    targetText: "Your target: Drops below ₱52.00/kg",
    timestamp: "Sep 7, 2026 • 8:30 AM",
    actionType: "products",
    variety: "Sinandomeng",
    details: "Central Luzon Rice Depot updated price to ₱51.00/kg across wholesale listings.",
  },
  {
    id: "trig-3",
    title: "Jasmine reached ₱63.00/kg",
    statusBadge: "Triggered",
    badgeType: "amber",
    targetText: "Your target: Rises above ₱62.00/kg",
    timestamp: "Sep 5, 2026 • 3:15 PM",
    actionType: "market",
    variety: "Jasmine",
    details: "Retail demand in Metro Manila drove Jasmine prices up to ₱63.00/kg benchmark.",
  },
];

export default function ConsumerMarketPrices() {
  const navigate = useNavigate();

  // Primary Tabs: "overview" | "alerts"
  const [activeMainTab, setActiveMainTab] = useState("overview");

  // Chart Controls
  const [selectedChartVariety, setSelectedChartVariety] = useState("Dinorado");
  const [selectedChartTimeframe, setSelectedChartTimeframe] = useState("6M"); // 3M, 6M, 1Y

  // Comparison Seller Variety
  const [selectedComparisonVariety, setSelectedComparisonVariety] = useState("Dinorado");

  // Search & Filters for Market Overview
  const [searchOverview, setSearchOverview] = useState("");
  const [filterProduct, setFilterProduct] = useState("All");
  const [filterOverviewVariety, setFilterOverviewVariety] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterSort, setFilterSort] = useState("Default");

  // Search & Filters for Price Alerts Tab
  const [searchAlerts, setSearchAlerts] = useState("");
  const [filterAlertStatus, setFilterAlertStatus] = useState("All");
  const [filterAlertVariety, setFilterAlertVariety] = useState("All");
  const [filterAlertLocation, setFilterAlertLocation] = useState("All");
  const [filterAlertCondition, setFilterAlertCondition] = useState("All");

  // Alerts State
  const [activeAlertsList, setActiveAlertsList] = useState(INITIAL_ACTIVE_ALERTS);
  const [triggeredAlertsList, setTriggeredAlertsList] = useState(INITIAL_TRIGGERED_ALERTS);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState(null);
  const [alertDetailsModal, setAlertDetailsModal] = useState(null);

  // New Alert Form State
  const [formVariety, setFormVariety] = useState("Dinorado");
  const [formCondition, setFormCondition] = useState("Drops below");
  const [formTargetPrice, setFormTargetPrice] = useState("55.00");
  const [formLocation, setFormLocation] = useState("All Locations");

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Reset Filters for Overview
  const handleResetOverviewFilters = () => {
    setSearchOverview("");
    setFilterProduct("All");
    setFilterOverviewVariety("All");
    setFilterLocation("All");
    setFilterSort("Default");
  };

  // Reset Filters for Price Alerts
  const handleResetAlertFilters = () => {
    setSearchAlerts("");
    setFilterAlertStatus("All");
    setFilterAlertVariety("All");
    setFilterAlertLocation("All");
    setFilterAlertCondition("All");
  };

  // Active chart variety object
  const activeVarietyObj = useMemo(() => {
    return (
      VARIETIES_OVERVIEW.find(
        (v) => v.name.toLowerCase() === selectedChartVariety.toLowerCase()
      ) || VARIETIES_OVERVIEW[0]
    );
  }, [selectedChartVariety]);

  // Chart Points calculation
  const chartData = useMemo(() => {
    if (selectedChartTimeframe === "3M") return activeVarietyObj.chartData3M;
    if (selectedChartTimeframe === "1Y") return activeVarietyObj.chartData1Y;
    return activeVarietyObj.chartData6M;
  }, [activeVarietyObj, selectedChartTimeframe]);

  // Filtered Overview Table
  const filteredVarieties = useMemo(() => {
    return VARIETIES_OVERVIEW.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchOverview.toLowerCase()) ||
        v.type.toLowerCase().includes(searchOverview.toLowerCase());
      const matchesVariety =
        filterOverviewVariety === "All" || v.name === filterOverviewVariety;
      return matchesSearch && matchesVariety;
    }).sort((a, b) => {
      if (filterSort === "Highest Price") return b.avgPrice - a.avgPrice;
      if (filterSort === "Lowest Price") return a.avgPrice - b.avgPrice;
      return 0;
    });
  }, [searchOverview, filterOverviewVariety, filterSort]);

  // Current Seller Listings for Comparison
  const currentSellers = useMemo(() => {
    return (
      SELLERS_BY_VARIETY[selectedComparisonVariety] || SELLERS_BY_VARIETY.Dinorado
    );
  }, [selectedComparisonVariety]);

  // Filtered Price Alerts List
  const filteredAlerts = useMemo(() => {
    return activeAlertsList.filter((alert) => {
      const matchesSearch =
        alert.variety.toLowerCase().includes(searchAlerts.toLowerCase()) ||
        alert.location.toLowerCase().includes(searchAlerts.toLowerCase());
      const matchesStatus =
        filterAlertStatus === "All" || alert.status === filterAlertStatus;
      const matchesVariety =
        filterAlertVariety === "All" || alert.variety === filterAlertVariety;
      const matchesLocation =
        filterAlertLocation === "All" ||
        alert.location.toLowerCase().includes(filterAlertLocation.toLowerCase()) ||
        alert.location === "All Locations";
      const matchesCondition =
        filterAlertCondition === "All" || alert.condition === filterAlertCondition;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesVariety &&
        matchesLocation &&
        matchesCondition
      );
    });
  }, [
    activeAlertsList,
    searchAlerts,
    filterAlertStatus,
    filterAlertVariety,
    filterAlertLocation,
    filterAlertCondition,
  ]);

  // Alert Handlers
  const handleToggleAlertStatus = (id) => {
    setActiveAlertsList(
      activeAlertsList.map((a) => {
        if (a.id === id) {
          const newStatus = a.status === "Monitoring" ? "Paused" : "Monitoring";
          showToast(`Alert for ${a.variety} is now ${newStatus.toLowerCase()}.`);
          return { ...a, status: newStatus };
        }
        return a;
      })
    );
  };

  const handleDeleteAlert = (id) => {
    setActiveAlertsList(activeAlertsList.filter((a) => a.id !== id));
    showToast("Price alert successfully deleted.");
  };

  const handleCreateAlert = (e) => {
    e.preventDefault();
    const dotColors = {
      Dinorado: "#F59E0B",
      Sinandomeng: "#10B981",
      "NSIC Rc 222": "#2563EB",
      Jasmine: "#9333EA",
      "NSIC Rc 160": "#14B8A6",
    };
    const currentPriceObj =
      VARIETIES_OVERVIEW.find((v) => v.name === formVariety)?.avgPrice || 55.0;
    const target = parseFloat(formTargetPrice) || 50.0;
    const diff = target - currentPriceObj;

    const newAlert = {
      id: `alt-${Date.now()}`,
      variety: formVariety,
      dotColor: dotColors[formVariety] || "#F59E0B",
      condition: formCondition,
      targetPrice: target,
      currentPrice: currentPriceObj,
      variance: `${diff >= 0 ? "▲" : "▼"} ₱${Math.abs(diff).toFixed(2)} variance`,
      varianceType: diff >= 0 ? "up" : "down",
      location: formLocation,
      status: "Monitoring",
      created: "Sep 9, 2026",
    };

    setActiveAlertsList([newAlert, ...activeAlertsList]);
    setCreateModalOpen(false);
    showToast(
      `Created new alert for ${formVariety} (${formCondition} ₱${target.toFixed(2)}/kg)`
    );
  };

  const handleUpdateAlert = (e) => {
    e.preventDefault();
    if (!editModalData) return;

    setActiveAlertsList(
      activeAlertsList.map((a) =>
        a.id === editModalData.id
          ? {
              ...a,
              targetPrice: parseFloat(editModalData.targetPrice) || a.targetPrice,
              condition: editModalData.condition,
              location: editModalData.location,
            }
          : a
      )
    );
    setEditModalData(null);
    showToast("Price alert updated successfully.");
  };

  // SVG Chart Calculation
  const minPrice = 50;
  const maxPrice = 60;
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const getCoordinates = (index, total, price) => {
    const x = paddingX + (index / (total - 1)) * (svgWidth - paddingX * 2);
    const clampedPrice = Math.max(minPrice, Math.min(maxPrice, price));
    const normalizedY = (clampedPrice - minPrice) / (maxPrice - minPrice);
    const y = svgHeight - paddingY - normalizedY * (svgHeight - paddingY * 2);
    return { x, y };
  };

  const points = chartData.map((d, i) =>
    getCoordinates(i, chartData.length, d.price)
  );

  const linePath = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const prev = arr[i - 1];
    const cx1 = prev.x + (point.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (point.x - prev.x) / 2;
    const cy2 = point.y;
    return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${point.x},${point.y}`;
  }, "");

  const areaPath = `${linePath} L ${
    points[points.length - 1].x
  },${svgHeight - paddingY} L ${points[0].x},${svgHeight - paddingY} Z`;

  const activeAlertCount = activeAlertsList.filter(
    (a) => a.status === "Monitoring"
  ).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-800 flex flex-col font-sans">
      {/* Top Global Consumer Navbar */}
      <ConsumerNavbar activePath="/consumer/market-prices" />

      {/* Main Page Container */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <button
            onClick={() => setActiveMainTab("overview")}
            className="hover:text-gray-900 transition cursor-pointer"
          >
            Market Prices
          </button>
          <span>&gt;</span>
          <span className="font-semibold text-[#00580C]">
            {activeMainTab === "overview" ? "Market Overview" : "Price Alerts"}
          </span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Market Prices
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Monitor current rice and grain prices, compare marketplace listings, and set alerts before making a purchase.
            </p>
          </div>

          {/* Benchmark Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-gray-600 shadow-xs self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-medium">Price data updated Sep 8, 2026</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500">Daily Benchmark</span>
          </div>
        </div>

        {/* Primary Tabs */}
        <div className="flex items-center gap-6 border-b border-gray-200">
          <button
            onClick={() => setActiveMainTab("overview")}
            className={`flex items-center gap-2 pb-3.5 text-sm font-semibold transition relative cursor-pointer ${
              activeMainTab === "overview"
                ? "text-[#00580C] border-b-2 border-[#00580C]"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>Market Overview</span>
          </button>

          <button
            onClick={() => setActiveMainTab("alerts")}
            className={`flex items-center gap-2 pb-3.5 text-sm font-semibold transition relative cursor-pointer ${
              activeMainTab === "alerts"
                ? "text-[#00580C] border-b-2 border-[#00580C]"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>Price Alerts</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
              {activeAlertCount} Active
            </span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* VIEW 1: MARKET OVERVIEW */}
        {/* ============================================================ */}
        {activeMainTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Average Rice Price */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
                    Average Rice Price
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                    ₱55.00<span className="text-sm font-normal text-gray-500">/kg</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Across monitored rice varieties
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Asterisk size={20} />
                </div>
              </div>

              {/* Card 2: Lowest Marketplace Price */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
                    Lowest Marketplace Price
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1">
                    ₱47.00<span className="text-sm font-normal text-gray-500">/kg</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Lowest available seller listing (NSIC Rc 222)
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ArrowDown size={20} />
                </div>
              </div>

              {/* Card 3: Highest Marketplace Price */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
                    Highest Marketplace Price
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-amber-600 mt-1">
                    ₱64.00<span className="text-sm font-normal text-gray-500">/kg</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Highest available seller listing (Special Jasmine)
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <ArrowUp size={20} />
                </div>
              </div>
            </div>

            {/* Global Search & Filters Bar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Search */}
                <div className="relative lg:col-span-2">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={searchOverview}
                    onChange={(e) => setSearchOverview(e.target.value)}
                    placeholder="Search rice variety or grain..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00580C]/20 focus:border-[#00580C]"
                  />
                  {searchOverview && (
                    <button
                      onClick={() => setSearchOverview("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Dropdown 1: All Products */}
                <div className="relative">
                  <select
                    value={filterProduct}
                    onChange={(e) => setFilterProduct(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
                  >
                    <option value="All">All Products</option>
                    <option value="Rice Sacks">Rice Sacks</option>
                    <option value="Bulk Bags">Bulk Bags (50kg)</option>
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>

                {/* Dropdown 2: All Varieties */}
                <div className="relative">
                  <select
                    value={filterOverviewVariety}
                    onChange={(e) => setFilterOverviewVariety(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
                  >
                    <option value="All">All Varieties</option>
                    <option value="Dinorado">Dinorado</option>
                    <option value="Sinandomeng">Sinandomeng</option>
                    <option value="NSIC Rc 222">NSIC Rc 222</option>
                    <option value="Jasmine">Jasmine</option>
                    <option value="NSIC Rc 160">NSIC Rc 160</option>
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>

                {/* Dropdown 3: All Locations */}
                <div className="relative">
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
                  >
                    <option value="All">All Locations</option>
                    <option value="Bulacan">Bulacan</option>
                    <option value="Caloocan">Caloocan</option>
                    <option value="Isabela">Isabela</option>
                    <option value="Nueva Ecija">Nueva Ecija</option>
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>

                {/* Dropdown 4: Sort & Reset */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={filterSort}
                      onChange={(e) => setFilterSort(e.target.value)}
                      className="w-full appearance-none pl-3 pr-7 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
                    >
                      <option value="Default">Highest Price</option>
                      <option value="Highest Price">Highest Price</option>
                      <option value="Lowest Price">Lowest Price</option>
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                  <button
                    onClick={handleResetOverviewFilters}
                    className="px-3 py-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-xs text-gray-600 font-medium transition cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Market Price Trend Card (Graph) */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              {/* Trend Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Market Price Trend</h2>
                  <p className="text-xs text-gray-500">
                    Historical wholesale and retail price changes over time.
                  </p>
                </div>

                {/* Variety & Range Dropdowns */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={selectedChartVariety}
                      onChange={(e) => setSelectedChartVariety(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 hover:bg-gray-100 focus:outline-none focus:border-[#00580C] cursor-pointer"
                    >
                      <option value="Dinorado">Dinorado (Special)</option>
                      <option value="Sinandomeng">Sinandomeng</option>
                      <option value="NSIC Rc 222">NSIC Rc 222</option>
                      <option value="Jasmine">Jasmine</option>
                      <option value="NSIC Rc 160">NSIC Rc 160</option>
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>

                  <div className="relative">
                    <select
                      value={selectedChartTimeframe}
                      onChange={(e) => setSelectedChartTimeframe(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 hover:bg-gray-100 focus:outline-none focus:border-[#00580C] cursor-pointer"
                    >
                      <option value="6M">Last 6 Months</option>
                      <option value="3M">Last 3 Months</option>
                      <option value="1Y">Last 1 Year</option>
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              {/* Metric Breakdown Pills */}
              <div className="flex flex-wrap items-center gap-6 pt-1 text-xs">
                <div>
                  <span className="text-gray-400 text-[11px] font-medium block uppercase tracking-wider">
                    Current Average
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    ₱{activeVarietyObj.avgPrice.toFixed(2)}
                    <span className="text-xs font-normal text-gray-500">/kg</span>
                  </span>
                </div>

                <div className="border-l border-gray-200 pl-6">
                  <span className="text-gray-400 text-[11px] font-medium block uppercase tracking-wider">
                    Previous Period
                  </span>
                  <span className="text-lg font-bold text-gray-700">
                    ₱{activeVarietyObj.prevAvg.toFixed(2)}
                    <span className="text-xs font-normal text-gray-500">/kg</span>
                  </span>
                </div>

                <div className="border-l border-gray-200 pl-6">
                  <span className="text-gray-400 text-[11px] font-medium block uppercase tracking-wider">
                    Net Change
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      activeVarietyObj.changeType === "increase"
                        ? "text-amber-600"
                        : activeVarietyObj.changeType === "decrease"
                        ? "text-emerald-700"
                        : "text-gray-700"
                    }`}
                  >
                    {activeVarietyObj.netChange}{" "}
                    {activeVarietyObj.changeType === "increase"
                      ? "↑"
                      : activeVarietyObj.changeType === "decrease"
                      ? "↓"
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Area Line Chart Visualization */}
              <div className="pt-2">
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[650px] relative">
                    <svg
                      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                      className="w-full h-48 sm:h-56 overflow-visible"
                    >
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00580C" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#00580C" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      {[60, 58, 56, 54, 52, 50].map((level) => {
                        const { y } = getCoordinates(0, chartData.length, level);
                        return (
                          <g key={level}>
                            <line
                              x1={paddingX}
                              y1={y}
                              x2={svgWidth - paddingX}
                              y2={y}
                              stroke="#F1F5F9"
                              strokeDasharray="4 4"
                              strokeWidth="1"
                            />
                            <text
                              x={paddingX - 10}
                              y={y + 3}
                              fill="#94A3B8"
                              fontSize="10"
                              textAnchor="end"
                              fontFamily="sans-serif"
                            >
                              ₱{level}
                            </text>
                          </g>
                        );
                      })}

                      {/* Area Fill */}
                      <path d={areaPath} fill="url(#chartGradient)" />

                      {/* Primary Line */}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#00580C"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Data Point Circles */}
                      {points.map((pt, idx) => {
                        const item = chartData[idx];
                        const isLatest = idx === points.length - 1;
                        return (
                          <g key={idx} className="group cursor-pointer">
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isLatest ? "5" : "4"}
                              fill="#FFFFFF"
                              stroke="#00580C"
                              strokeWidth="2.5"
                              className="transition-transform group-hover:scale-125"
                            />
                            {/* X-axis label */}
                            <text
                              x={pt.x}
                              y={svgHeight - 10}
                              fill={isLatest ? "#0F172A" : "#94A3B8"}
                              fontWeight={isLatest ? "700" : "500"}
                              fontSize="10"
                              textAnchor="middle"
                            >
                              {item.month}
                            </text>

                            {/* Active Floating Tooltip for Latest */}
                            {isLatest && (
                              <g transform={`translate(${pt.x - 45}, ${pt.y - 30})`}>
                                <rect
                                  width="90"
                                  height="22"
                                  rx="6"
                                  fill="#00580C"
                                  className="shadow-sm"
                                />
                                <text
                                  x="45"
                                  y="15"
                                  fill="#FFFFFF"
                                  fontSize="10"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  Sep: ₱{item.price.toFixed(2)}/kg
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Market Prices Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Current Market Prices</h3>
                  <p className="text-xs text-gray-500">
                    Compare average and marketplace price ranges across rice varieties.
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  {filteredVarieties.length} varieties monitored
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-3 px-5">Rice Variety</th>
                      <th className="py-3 px-4">Average Price / kg</th>
                      <th className="py-3 px-4">Marketplace Low</th>
                      <th className="py-3 px-4">Marketplace High</th>
                      <th className="py-3 px-4">Change</th>
                      <th className="py-3 px-4">Trend</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredVarieties.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition">
                        {/* Variety with Dot */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.dotColor }}
                            />
                            <span className="font-bold text-gray-900 text-xs sm:text-sm">
                              {item.name}
                            </span>
                          </div>
                        </td>

                        {/* Average Price */}
                        <td className="py-4 px-4 font-bold text-gray-900">
                          ₱{item.avgPrice.toFixed(2)}
                        </td>

                        {/* Marketplace Low */}
                        <td className="py-4 px-4 font-semibold text-emerald-700">
                          ₱{item.lowPrice.toFixed(2)}
                        </td>

                        {/* Marketplace High */}
                        <td className="py-4 px-4 text-gray-700 font-medium">
                          ₱{item.highPrice.toFixed(2)}
                        </td>

                        {/* Change */}
                        <td className="py-4 px-4">
                          <span
                            className={`font-semibold ${
                              item.changeType === "increase"
                                ? "text-amber-600"
                                : item.changeType === "decrease"
                                ? "text-emerald-700"
                                : "text-gray-400"
                            }`}
                          >
                            {item.change}
                          </span>
                        </td>

                        {/* Trend Badge */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${item.trendColor}`}
                          >
                            {item.trend}
                          </span>
                        </td>

                        {/* Action Link */}
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => navigate("/consumer/marketplace")}
                            className="inline-flex items-center gap-1 font-semibold text-[#00580C] hover:underline cursor-pointer text-xs"
                          >
                            <span>View Products</span>
                            <ArrowRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seller Price Comparison Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Seller Price Comparison</h3>
                  <p className="text-xs text-gray-500">
                    Compare currently listed seller prices for the selected rice variety.
                  </p>
                </div>

                {/* Variety Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Variety:</span>
                  <div className="relative">
                    <select
                      value={selectedComparisonVariety}
                      onChange={(e) => setSelectedComparisonVariety(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 hover:bg-gray-100 focus:outline-none focus:border-[#00580C] cursor-pointer"
                    >
                      <option value="Dinorado">Dinorado</option>
                      <option value="Sinandomeng">Sinandomeng</option>
                      <option value="NSIC Rc 222">NSIC Rc 222</option>
                      <option value="Jasmine">Jasmine</option>
                      <option value="NSIC Rc 160">NSIC Rc 160</option>
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-3 px-5">Seller</th>
                      <th className="py-3 px-4">Seller Type</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Packaging</th>
                      <th className="py-3 px-4">Price / kg</th>
                      <th className="py-3 px-4">Available Stock</th>
                      <th className="py-3 px-4">Rating</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {currentSellers.map((seller) => (
                      <tr key={seller.id} className="hover:bg-gray-50/80 transition">
                        {/* Seller Name */}
                        <td className="py-4 px-5 font-bold text-gray-900">
                          {seller.name}
                        </td>

                        {/* Seller Type */}
                        <td className="py-4 px-4 text-gray-500 font-medium">
                          {seller.sellerType}
                        </td>

                        {/* Location */}
                        <td className="py-4 px-4 text-gray-600">
                          {seller.location}
                        </td>

                        {/* Packaging */}
                        <td className="py-4 px-4 text-gray-600">
                          {seller.packaging}
                        </td>

                        {/* Price / kg (with Best Value Badge) */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {seller.isBestValue && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                Best Value
                              </span>
                            )}
                            <span
                              className={`font-bold ${
                                seller.isBestValue ? "text-emerald-800" : "text-gray-900"
                              }`}
                            >
                              ₱{seller.pricePerKg.toFixed(2)}/kg
                            </span>
                          </div>
                        </td>

                        {/* Available Stock */}
                        <td className="py-4 px-4 text-gray-600">
                          {seller.stock}
                        </td>

                        {/* Rating */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1 text-amber-600 font-semibold">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            <span>{seller.rating.toFixed(1)}</span>
                          </div>
                        </td>

                        {/* Action Button */}
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => navigate("/consumer/marketplace")}
                            className="px-3.5 py-1.5 rounded-xl bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                          >
                            View Product
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: PRICE ALERTS */}
        {/* ============================================================ */}
        {activeMainTab === "alerts" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Metric Cards & Create Action */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                {/* Metric Card 1: Active Alerts */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
                      Active Alerts
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                      {activeAlertCount}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Price conditions currently being monitored
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Bell size={20} />
                  </div>
                </div>

                {/* Metric Card 2: Triggered Alerts */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
                      Triggered Alerts
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                      {triggeredAlertsList.length}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Price targets reached recently
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                    <CheckSquare size={20} />
                  </div>
                </div>
              </div>

              {/* Right Side Button: + Create Price Alert */}
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-5 py-3.5 rounded-xl bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer self-start lg:self-stretch"
              >
                <Plus size={15} />
                <span>Create Price Alert</span>
              </button>
            </div>

            {/* Price Alerts Search & Filters Bar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Search */}
                <div className="relative lg:col-span-2">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={searchAlerts}
                    onChange={(e) => setSearchAlerts(e.target.value)}
                    placeholder="Search rice variety or location..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00580C]/20 focus:border-[#00580C]"
                  />
                  {searchAlerts && (
                    <button
                      onClick={() => setSearchAlerts("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Dropdown 1: All Statuses */}
                <div className="relative">
                  <select
                    value={filterAlertStatus}
                    onChange={(e) => setFilterAlertStatus(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Monitoring">Monitoring</option>
                    <option value="Paused">Paused</option>
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>

                {/* Dropdown 2: All Varieties */}
                <div className="relative">
                  <select
                    value={filterAlertVariety}
                    onChange={(e) => setFilterAlertVariety(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
                  >
                    <option value="All">All Varieties</option>
                    <option value="Dinorado">Dinorado</option>
                    <option value="Sinandomeng">Sinandomeng</option>
                    <option value="NSIC Rc 222">NSIC Rc 222</option>
                    <option value="Jasmine">Jasmine</option>
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>

                {/* Dropdown 3: All Locations */}
                <div className="relative">
                  <select
                    value={filterAlertLocation}
                    onChange={(e) => setFilterAlertLocation(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
                  >
                    <option value="All">All Locations</option>
                    <option value="Bulacan">Bulacan</option>
                    <option value="Caloocan">Caloocan City</option>
                    <option value="Quezon">Quezon City</option>
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>

                {/* Dropdown 4: All Conditions & Reset */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={filterAlertCondition}
                      onChange={(e) => setFilterAlertCondition(e.target.value)}
                      className="w-full appearance-none pl-3 pr-7 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-[#00580C] cursor-pointer"
                    >
                      <option value="All">All Conditions</option>
                      <option value="Drops below">Drops below</option>
                      <option value="Rises above">Rises above</option>
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                  <button
                    onClick={handleResetAlertFilters}
                    className="px-3 py-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-xs text-gray-600 font-medium transition cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Sub-text row */}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Price data updated Sep 8, 2026 • Daily Benchmark
                </span>
                <span>Showing {filteredAlerts.length} price alerts</span>
              </div>
            </div>

            {/* Section 1: Active Price Alerts Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Active Price Alerts</h3>
                  <p className="text-xs text-gray-500">
                    Monitor your saved target price conditions.
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  {activeAlertsList.length} alerts configured
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-3 px-5">Rice Variety</th>
                      <th className="py-3 px-4">Condition</th>
                      <th className="py-3 px-4">Target Price</th>
                      <th className="py-3 px-4">Current Price</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-gray-50/80 transition">
                        {/* Rice Variety with dot */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: alert.dotColor }}
                            />
                            <span className="font-bold text-gray-900 text-xs sm:text-sm">
                              {alert.variety}
                            </span>
                          </div>
                        </td>

                        {/* Condition */}
                        <td className="py-4 px-4 text-gray-600">
                          {alert.condition}
                        </td>

                        {/* Target Price */}
                        <td className="py-4 px-4 font-bold text-[#00580C]">
                          ₱{alert.targetPrice.toFixed(2)}/kg
                        </td>

                        {/* Current Price + Variance */}
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-gray-900 block">
                              ₱{alert.currentPrice.toFixed(2)}/kg
                            </span>
                            <span
                              className={`text-[10px] font-medium block ${
                                alert.varianceType === "up"
                                  ? "text-amber-600"
                                  : "text-emerald-700"
                              }`}
                            >
                              {alert.variance}
                            </span>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-4 px-4 text-gray-600">
                          {alert.location}
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                              alert.status === "Monitoring"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {alert.status}
                          </span>
                        </td>

                        {/* Created Date */}
                        <td className="py-4 px-4 text-gray-500">
                          {alert.created}
                        </td>

                        {/* Action Links (Edit | Pause/Resume | Delete) */}
                        <td className="py-4 px-5 text-right font-medium text-xs whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 text-gray-500">
                            <button
                              onClick={() => setEditModalData(alert)}
                              className="text-gray-600 hover:text-gray-900 hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleToggleAlertStatus(alert.id)}
                              className={`cursor-pointer hover:underline ${
                                alert.status === "Monitoring"
                                  ? "text-gray-600 hover:text-gray-900"
                                  : "text-[#00580C] font-semibold hover:text-[#0c432f]"
                              }`}
                            >
                              {alert.status === "Monitoring" ? "Pause" : "Resume"}
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleDeleteAlert(alert.id)}
                              className="text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Recently Triggered */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Recently Triggered</h3>
                  <p className="text-xs text-gray-500">
                    Price targets that were recently reached.
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-medium">Last 7 days</span>
              </div>

              {/* Triggered Items List */}
              <div className="space-y-3">
                {triggeredAlertsList.map((trig) => (
                  <div
                    key={trig.id}
                    className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      trig.badgeType === "green"
                        ? "bg-emerald-50/40 border-emerald-200"
                        : "bg-amber-50/40 border-amber-200"
                    }`}
                  >
                    {/* Left side: Icon & Text */}
                    <div className="flex items-start sm:items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          trig.badgeType === "green"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {trig.badgeType === "green" ? (
                          <Check size={16} />
                        ) : (
                          <Minus size={16} />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-xs sm:text-sm">
                            {trig.title}
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded-md text-[10px] font-bold ${
                              trig.badgeType === "green"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-200 text-amber-900"
                            }`}
                          >
                            {trig.statusBadge}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {trig.targetText} • {trig.timestamp}
                        </p>
                      </div>
                    </div>

                    {/* Right side: Alert Details & Action link */}
                    <div className="flex items-center gap-3 self-end sm:self-auto text-xs font-semibold">
                      <button
                        onClick={() => setAlertDetailsModal(trig)}
                        className="text-gray-500 hover:text-gray-900 underline cursor-pointer font-medium"
                      >
                        Alert Details
                      </button>

                      {trig.actionType === "products" ? (
                        <button
                          onClick={() => navigate("/consumer/marketplace")}
                          className="text-[#00580C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>View Products</span>
                          <ArrowRight size={12} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveMainTab("overview")}
                          className="text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>View Market</span>
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: CREATE PRICE ALERT */}
      {/* ============================================================ */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Create Price Alert
                  </h3>
                  <p className="text-xs text-gray-400">
                    Set a target price and get notified when reached
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Rice Variety
                </label>
                <select
                  value={formVariety}
                  onChange={(e) => setFormVariety(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 focus:outline-none focus:border-[#00580C]"
                >
                  <option value="Dinorado">Dinorado (₱58.00/kg avg)</option>
                  <option value="Sinandomeng">Sinandomeng (₱52.00/kg avg)</option>
                  <option value="NSIC Rc 222">NSIC Rc 222 (₱49.00/kg avg)</option>
                  <option value="Jasmine">Jasmine (₱61.00/kg avg)</option>
                  <option value="NSIC Rc 160">NSIC Rc 160 (₱50.50/kg avg)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Condition
                  </label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 focus:outline-none focus:border-[#00580C]"
                  >
                    <option value="Drops below">Drops below</option>
                    <option value="Rises above">Rises above</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Target Price (₱ / kg)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                      ₱
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      value={formTargetPrice}
                      onChange={(e) => setFormTargetPrice(e.target.value)}
                      required
                      placeholder="e.g. 55.00"
                      className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:border-[#00580C]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Location Scope
                </label>
                <select
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 focus:outline-none focus:border-[#00580C]"
                >
                  <option value="All Locations">All Locations</option>
                  <option value="Bulacan">Bulacan</option>
                  <option value="Caloocan City">Caloocan City</option>
                  <option value="Quezon City">Quezon City</option>
                  <option value="Manila">Manila</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#00580C] hover:bg-[#0c432f] rounded-xl cursor-pointer shadow-xs"
                >
                  Create Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: EDIT PRICE ALERT */}
      {/* ============================================================ */}
      {editModalData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Edit Price Alert: {editModalData.variety}
                </h3>
                <p className="text-xs text-gray-400">
                  Modify price threshold and condition
                </p>
              </div>
              <button
                onClick={() => setEditModalData(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateAlert} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Condition
                  </label>
                  <select
                    value={editModalData.condition}
                    onChange={(e) =>
                      setEditModalData({ ...editModalData, condition: e.target.value })
                    }
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 focus:outline-none focus:border-[#00580C]"
                  >
                    <option value="Drops below">Drops below</option>
                    <option value="Rises above">Rises above</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Target Price (₱ / kg)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                      ₱
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      value={editModalData.targetPrice}
                      onChange={(e) =>
                        setEditModalData({ ...editModalData, targetPrice: e.target.value })
                      }
                      required
                      className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:border-[#00580C]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Location Scope
                </label>
                <select
                  value={editModalData.location}
                  onChange={(e) =>
                    setEditModalData({ ...editModalData, location: e.target.value })
                  }
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 focus:outline-none focus:border-[#00580C]"
                >
                  <option value="All Locations">All Locations</option>
                  <option value="Bulacan">Bulacan</option>
                  <option value="Caloocan City">Caloocan City</option>
                  <option value="Quezon City">Quezon City</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalData(null)}
                  className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#00580C] hover:bg-[#0c432f] rounded-xl cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: ALERT DETAILS MODAL */}
      {/* ============================================================ */}
      {alertDetailsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Trigger Event
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">
                  {alertDetailsModal.title}
                </h3>
              </div>
              <button
                onClick={() => setAlertDetailsModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 space-y-2 text-xs">
              <p className="text-gray-600 leading-relaxed">
                {alertDetailsModal.details}
              </p>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-gray-500 text-[11px]">
                <span>{alertDetailsModal.targetText}</span>
                <span>{alertDetailsModal.timestamp}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setAlertDetailsModal(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setAlertDetailsModal(null);
                  navigate("/consumer/marketplace");
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#00580C] hover:bg-[#0c432f] rounded-xl cursor-pointer shadow-xs"
              >
                Browse Marketplace Listings
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
