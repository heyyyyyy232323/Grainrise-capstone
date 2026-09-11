import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Navigation,
  ChevronDown,
  Star,
  Package,
  Compass,
  CheckCircle2,
  X,
  ExternalLink,
  Plus,
  Minus,
  Crosshair,
  Store,
  Layers,
  Clock,
  Phone,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import ConsumerNavbar from "../../Components/Major-Components/ConsumerNavbar";

// ============================================================
// MOCK RETAILER DATA (FIGMA SPEC)
// ============================================================

const MOCK_RETAILERS = [
  {
    id: 1,
    name: "Greenfield Rice Store",
    isVerified: true,
    distanceKm: 1.2,
    address: "Bagong Silang, Caloocan City",
    rating: 4.8,
    reviewsCount: 126,
    status: "Open Now",
    closesAt: "7:00 PM",
    isOpen: true,
    varieties: ["Dinorado", "Sinandomeng", "Jasmine", "NSIC Rc 222"],
    extraVarietiesCount: 15,
    productCount: 18,
    phone: "+63 917 234 5678",
    lat: 14.775,
    lng: 121.042,
    mapX: 62, // percentage coordinates for stylized SVG map
    mapY: 48,
    directions: [
      "Head north on Quirino Highway toward Langit Road (450 m)",
      "Turn right onto Langit Road at the intersection (500 m)",
      "Turn left onto Susano Road (250 m)",
      "Destination will be on your right (Greenfield Rice Store)",
    ],
  },
  {
    id: 2,
    name: "North Caloocan Rice Store",
    isVerified: true,
    distanceKm: 2.7,
    address: "North Caloocan, Caloocan City",
    rating: 4.7,
    reviewsCount: 88,
    status: "Open Now",
    closesAt: "8:00 PM",
    isOpen: true,
    varieties: ["Jasmine", "Dinorado", "Well-Milled Rice"],
    extraVarietiesCount: 8,
    productCount: 14,
    phone: "+63 918 345 6789",
    lat: 14.782,
    lng: 121.035,
    mapX: 74,
    mapY: 21,
    directions: [
      "Head northwest on Quirino Highway (1.2 km)",
      "Turn right onto North Caloocan Avenue (1.0 km)",
      "Pass by Barangay Hall and turn right (500 m)",
      "Destination on the left",
    ],
  },
  {
    id: 3,
    name: "GrainMart",
    isVerified: true,
    distanceKm: 4.3,
    address: "Novaliches, Quezon City",
    rating: 4.6,
    reviewsCount: 78,
    status: "Open Now",
    closesAt: "6:30 PM",
    isOpen: true,
    varieties: ["Sinandomeng", "NSIC Rc 222", "Regular Milled"],
    extraVarietiesCount: 6,
    productCount: 12,
    phone: "+63 920 456 7890",
    lat: 14.755,
    lng: 121.048,
    mapX: 67,
    mapY: 74,
    directions: [
      "Take Quirino Highway south towards Novaliches Bayan (2.8 km)",
      "Turn left onto General Luis Street (1.2 km)",
      "Destination will be inside Novaliches Commercial Center",
    ],
  },
  {
    id: 4,
    name: "Bulacan Grain Milling & Retail",
    shortName: "Bulacan Milling",
    isVerified: true,
    distanceKm: 6.5,
    address: "San Jose del Monte, Bulacan",
    rating: 4.9,
    reviewsCount: 142,
    status: "Open Now",
    closesAt: "6:00 PM",
    isOpen: true,
    varieties: ["Sinandomeng", "Dinorado", "Jasmine", "Malagkit", "Brown Rice"],
    extraVarietiesCount: 12,
    productCount: 22,
    phone: "+63 922 567 8901",
    lat: 14.81,
    lng: 121.06,
    mapX: 86,
    mapY: 14,
    directions: [
      "Follow Quirino Highway Northbound toward SJDM Bulacan (4.5 km)",
      "Continue straight past Tungkong Mangga (1.8 km)",
      "Destination on the right beside Central Agricultural Terminal",
    ],
  },
  {
    id: 5,
    name: "Golden Grains Rice Hub",
    isVerified: true,
    distanceKm: 7.8,
    address: "Camarin, Caloocan City",
    rating: 4.5,
    reviewsCount: 64,
    status: "Open Now",
    closesAt: "7:30 PM",
    isOpen: true,
    varieties: ["Well-Milled Rice", "Sinandomeng", "NSIC Rc 222"],
    extraVarietiesCount: 4,
    productCount: 9,
    phone: "+63 927 678 9012",
    lat: 14.76,
    lng: 121.03,
    mapX: 38,
    mapY: 65,
    directions: [
      "Take Camarin Road eastbound (3.5 km)",
      "Turn left at Zapote intersection (2.0 km)",
      "Destination will be at Camarin Market Stalls #12-14",
    ],
  },
  {
    id: 6,
    name: "Evergreen Agri-Retail Store",
    isVerified: true,
    distanceKm: 9.4,
    address: "Fairview, Quezon City",
    rating: 4.8,
    reviewsCount: 110,
    status: "Open Now",
    closesAt: "8:30 PM",
    isOpen: true,
    varieties: ["Dinorado", "Jasmine", "Sinandomeng", "Japanese Rice"],
    extraVarietiesCount: 10,
    productCount: 16,
    phone: "+63 930 789 0123",
    lat: 14.72,
    lng: 121.065,
    mapX: 80,
    mapY: 88,
    directions: [
      "Follow Commonwealth Avenue extension toward Fairview (6.0 km)",
      "Turn right into Regalado Highway (2.5 km)",
      "Destination will be on your left",
    ],
  },
];

const PRESET_LOCATIONS = [
  { label: "Home — Bagong Silang, Caloocan City", address: "Bagong Silang, Caloocan City" },
  { label: "Work — Fairview, Quezon City", address: "Fairview, Quezon City" },
  { label: "Branch — Novaliches, Quezon City", address: "Novaliches, Quezon City" },
];

const VARIETY_OPTIONS = [
  "All Varieties",
  "Dinorado",
  "Sinandomeng",
  "Jasmine",
  "NSIC Rc 222",
  "Well-Milled Rice",
  "Malagkit",
];

const DISTANCE_OPTIONS = [
  { label: "Distance: 5 km", value: 5 },
  { label: "Distance: 10 km", value: 10 },
  { label: "Distance: 15 km", value: 15 },
  { label: "Distance: 25 km", value: 25 },
  { label: "Distance: 50 km", value: 50 },
];

const OPERATING_OPTIONS = [
  { label: "Operating: All Retailers", value: "all" },
  { label: "Operating: Open Now", value: "open" },
  { label: "Operating: Verified Only", value: "verified" },
];

const SORT_OPTIONS = [
  { label: "Sort by: Nearest", value: "nearest" },
  { label: "Sort by: Highest Rated", value: "rating" },
  { label: "Sort by: Most Products", value: "products" },
];

export default function ConsumerRetailersNearby() {
  const navigate = useNavigate();

  // ── States ──────────────────────────────────────────────────────────────
  const [selectedLocationText, setSelectedLocationText] = useState("Bagong Silang, Caloocan City");
  const [activeLocationPreset, setActiveLocationPreset] = useState("Home — Bagong Silang, Caloocan City");
  const [selectedDistance, setSelectedDistance] = useState(10);
  const [selectedVariety, setSelectedVariety] = useState("All Varieties");
  const [selectedOperating, setSelectedOperating] = useState("all");
  const [selectedSort, setSelectedSort] = useState("nearest");

  const [activeRetailerId, setActiveRetailerId] = useState(1);
  const [mapType, setMapType] = useState("standard"); // 'standard' | 'terrain'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeModalDirections, setActiveModalDirections] = useState(null);
  const [isUsingGps, setIsUsingGps] = useState(false);

  // ── Filtered & Sorted Retailers ─────────────────────────────────────────
  const filteredRetailers = useMemo(() => {
    return MOCK_RETAILERS.filter((r) => {
      // Distance filter
      if (r.distanceKm > selectedDistance) return false;

      // Variety filter
      if (
        selectedVariety !== "All Varieties" &&
        !r.varieties.includes(selectedVariety)
      ) {
        return false;
      }

      // Operating filter
      if (selectedOperating === "open" && !r.isOpen) return false;
      if (selectedOperating === "verified" && !r.isVerified) return false;

      // Search keyword filter (if typed)
      if (
        selectedLocationText.trim() &&
        !r.address.toLowerCase().includes(selectedLocationText.toLowerCase().split(",")[0].trim().toLowerCase()) &&
        !r.name.toLowerCase().includes(selectedLocationText.toLowerCase())
      ) {
        // Soft match: if user location query matches general district or store name
      }

      return true;
    }).sort((a, b) => {
      if (selectedSort === "nearest") return a.distanceKm - b.distanceKm;
      if (selectedSort === "rating") return b.rating - a.rating;
      if (selectedSort === "products") return b.productCount - a.productCount;
      return 0;
    });
  }, [selectedDistance, selectedVariety, selectedOperating, selectedSort, selectedLocationText]);

  const activeRetailer = useMemo(() => {
    return MOCK_RETAILERS.find((r) => r.id === activeRetailerId) || filteredRetailers[0] || MOCK_RETAILERS[0];
  }, [activeRetailerId, filteredRetailers]);

  const handleClearFilters = () => {
    setSelectedDistance(10);
    setSelectedVariety("All Varieties");
    setSelectedOperating("all");
    setSelectedSort("nearest");
    setSelectedLocationText("Bagong Silang, Caloocan City");
  };

  const handleUseCurrentLocation = () => {
    setIsUsingGps(true);
    setSelectedLocationText("Bagong Silang, Caloocan City (GPS Active)");
    setTimeout(() => setIsUsingGps(false), 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <ConsumerNavbar activePath="/consumer/retailers-nearby" />

      {/* ── Main Container ────────────────────────────────────────────── */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-5 flex flex-col gap-4">
        
        {/* ── Header Row ──────────────────────────────────────────────── */}
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-gray-500">Retailers Nearby</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Retailers Nearby
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Find GrainRise retailers near your selected location and explore the products they offer.
          </p>
        </div>

        {/* ── Location & Search Bar Row ───────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          {/* Location text input */}
          <div className="relative flex-1">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700" size={17} />
            <input
              type="text"
              value={selectedLocationText}
              onChange={(e) => setSelectedLocationText(e.target.value)}
              placeholder="Search or enter location..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:border-emerald-700 shadow-2xs"
            />
          </div>

          {/* Use Current Location button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 border border-emerald-200 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 ${
              isUsingGps ? "animate-pulse" : ""
            }`}
          >
            <Compass size={16} className="text-emerald-700" />
            <span>Use Current Location</span>
          </button>

          {/* Preset location dropdown */}
          <div className="relative shrink-0">
            <select
              value={activeLocationPreset}
              onChange={(e) => {
                setActiveLocationPreset(e.target.value);
                const loc = PRESET_LOCATIONS.find((p) => p.label === e.target.value);
                if (loc) setSelectedLocationText(loc.address);
              }}
              className="appearance-none w-full md:w-auto pl-4 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 shadow-2xs cursor-pointer"
            >
              {PRESET_LOCATIONS.map((preset) => (
                <option key={preset.label} value={preset.label}>
                  {preset.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* ── Filters & Sort Bar ───────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 pb-1 border-b border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2">
            {/* Distance Filter */}
            <div className="relative">
              <select
                value={selectedDistance}
                onChange={(e) => setSelectedDistance(Number(e.target.value))}
                className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer shadow-2xs"
              >
                {DISTANCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Variety Filter */}
            <div className="relative">
              <select
                value={selectedVariety}
                onChange={(e) => setSelectedVariety(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer shadow-2xs"
              >
                {VARIETY_OPTIONS.map((variety) => (
                  <option key={variety} value={variety}>
                    {variety === "All Varieties" ? "Rice Variety: All Varieties" : `Variety: ${variety}`}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Operating Filter */}
            <div className="relative">
              <select
                value={selectedOperating}
                onChange={(e) => setSelectedOperating(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer shadow-2xs"
              >
                {OPERATING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Clear Filters */}
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-medium text-gray-500 hover:text-emerald-800 transition px-2 py-1 cursor-pointer"
            >
              Clear Filters
            </button>
          </div>

          {/* Right: Sort by */}
          <div className="relative ml-auto">
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer shadow-2xs"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* ── Two-Column Main Content View ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[640px] items-start">
          
          {/* ── Left Column: Retailers List (5 cols) ────────────────────── */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* List Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Retailers Near Bagong Silang
                </h2>
                <p className="text-[11px] text-gray-500">
                  Showing GrainRise retailers within {selectedDistance} km
                </p>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                {filteredRetailers.length} retailers found
              </span>
            </div>

            {/* Retailer Cards Scroll Container */}
            <div className="flex flex-col gap-3.5 max-h-[700px] overflow-y-auto pr-1 pb-4">
              {filteredRetailers.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
                  <Store className="mx-auto text-gray-300 mb-2" size={36} />
                  <p className="text-sm font-semibold text-gray-700">No retailers found</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try adjusting your distance or variety filters to see more results.
                  </p>
                  <button
                    onClick={handleClearFilters}
                    className="mt-4 px-4 py-1.5 bg-emerald-800 text-white rounded-xl text-xs font-semibold hover:bg-emerald-900 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredRetailers.map((retailer) => {
                  const isSelected = retailer.id === activeRetailer.id;

                  return (
                    <div
                      key={retailer.id}
                      onClick={() => setActiveRetailerId(retailer.id)}
                      className={`relative bg-white rounded-2xl p-4 sm:p-4.5 border transition duration-200 cursor-pointer shadow-xs ${
                        isSelected
                          ? "border-emerald-600 ring-2 ring-emerald-500/20 shadow-md bg-emerald-50/20"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      {/* Top Badges Row */}
                      <div className="flex items-center justify-between mb-2">
                        {retailer.isVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
                            <CheckCircle2 size={11} className="text-emerald-700" />
                            Verified Retailer
                          </span>
                        )}

                        <span className="text-[11px] font-medium text-gray-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {retailer.distanceKm} km away
                        </span>
                      </div>

                      {/* Store Name & Address */}
                      <h3 className="text-base font-bold text-gray-900">
                        {retailer.name}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        <span className="truncate">{retailer.address}</span>
                      </div>

                      {/* Ratings & Operating Status */}
                      <div className="flex items-center gap-2 text-xs mt-2 text-gray-600 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Star size={13} className="fill-amber-400 text-amber-400" />
                          <span className="font-bold text-gray-900">{retailer.rating}</span>
                          <span className="text-gray-400 text-[11px]">
                            ({retailer.reviewsCount} reviews)
                          </span>
                        </div>

                        <span className="text-gray-300">•</span>

                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                          <span className="text-emerald-700 font-semibold">{retailer.status}</span>
                          <span className="text-gray-400">- Closes {retailer.closesAt}</span>
                        </div>
                      </div>

                      {/* Available Varieties Section */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Available Varieties
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {retailer.varieties.map((v) => (
                            <span
                              key={v}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-md"
                            >
                              {v}
                            </span>
                          ))}
                          {retailer.extraVarietiesCount > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[11px] font-semibold rounded-md border border-emerald-100">
                              +{retailer.extraVarietiesCount} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Products Listed Count */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-3 font-medium">
                        <Package size={14} className="text-emerald-700" />
                        <span>
                          <strong className="text-gray-900">{retailer.productCount} products</strong> listed in catalog
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/consumer/marketplace?seller=${encodeURIComponent(retailer.name)}`);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#00580C] hover:bg-[#00480a] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <span>View Store</span>
                          <ArrowRight size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModalDirections(retailer);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                        >
                          <Navigation size={13} className="text-emerald-700" />
                          <span>Get Directions</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Right Column: Interactive Map View (7 cols) ────────────── */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[700px] sticky top-20">
            
            {/* Map Canvas with SVG Road Network Simulation */}
            <div
              className={`relative flex-1 w-full overflow-hidden select-none transition-colors duration-300 ${
                mapType === "terrain" ? "bg-[#eaf2e8]" : "bg-[#f1f5f9]"
              }`}
            >
              {/* Map Controls: Top Right */}
              <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2.5">
                {/* Standard / Terrain toggle */}
                <div className="inline-flex bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setMapType("standard")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      mapType === "standard"
                        ? "bg-[#00580C] text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapType("terrain")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      mapType === "terrain"
                        ? "bg-[#00580C] text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Terrain
                  </button>
                </div>

                {/* Zoom and Crosshair tools */}
                <div className="flex flex-col bg-white/95 backdrop-blur-xs rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    title="Zoom in"
                    onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.6))}
                    className="p-2 text-gray-700 hover:bg-gray-100 transition border-b border-gray-100 cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    type="button"
                    title="Zoom out"
                    onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.8))}
                    className="p-2 text-gray-700 hover:bg-gray-100 transition border-b border-gray-100 cursor-pointer"
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    type="button"
                    title="Recenter"
                    onClick={() => {
                      setZoomLevel(1);
                      setActiveRetailerId(1);
                    }}
                    className="p-2 text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
                  >
                    <Crosshair size={16} />
                  </button>
                </div>
              </div>

              {/* Stylized Vector Map Surface */}
              <div
                className="w-full h-full relative transition-transform duration-300 origin-center"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {/* SVG Roads, Highway, River */}
                <svg className="w-full h-full absolute inset-0 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  {/* Subtle Grid / Land outlines */}
                  <defs>
                    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                      <path d="M 60 0 L 0 0 0 60" fill="none" stroke={mapType === "terrain" ? "#d4e6d2" : "#e2e8f0"} strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* River Waterway Ribbon */}
                  <path
                    d="M -50 420 C 150 420, 300 480, 500 440 C 700 400, 900 460, 1100 440"
                    fill="none"
                    stroke="#bae6fd"
                    strokeWidth="24"
                    strokeLinecap="round"
                  />

                  {/* Minor Secondary Roads */}
                  <path d="M 200 150 L 900 240" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 200 150 L 900 240" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />

                  <path d="M 520 600 L 850 80" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 520 600 L 850 80" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />

                  {/* Primary Highways (Quirino Highway / Susano Rd) */}
                  <path d="M 450 0 L 820 620" fill="none" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 450 0 L 820 620" fill="none" stroke="#fdba74" strokeWidth="5" strokeLinecap="round" />

                  <path d="M 510 180 L 800 200" fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 510 180 L 800 200" fill="none" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
                </svg>

                {/* Street / Road Text Labels */}
                <span className="absolute top-[180px] left-[520px] text-[10px] font-bold tracking-wider text-amber-900/60 rotate-50 select-none uppercase">
                  Quirino Highway
                </span>
                <span className="absolute top-[188px] left-[560px] text-[9px] font-semibold tracking-wider text-slate-500/70 select-none uppercase">
                  Langit Road
                </span>
                <span className="absolute top-[280px] left-[640px] text-[9px] font-semibold tracking-wider text-slate-500/70 -rotate-45 select-none uppercase">
                  Susano Road
                </span>

                {/* ── User Marker (Home) ── */}
                <div
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{ left: "61%", top: "25%" }}
                  title="Your Selected Location: Bagong Silang"
                >
                  <div className="relative flex items-center justify-center">
                    <span className="absolute h-10 w-10 rounded-full bg-blue-500/20 animate-ping" />
                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                      <MapPin size={16} className="fill-white" />
                    </div>
                  </div>
                  <div className="mt-1 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md">
                    You (Home)
                  </div>
                </div>

                {/* ── Retailer Marker 2: North Caloocan ── */}
                <div
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition transform hover:scale-110"
                  style={{ left: "76%", top: "15%" }}
                  onClick={() => setActiveRetailerId(2)}
                >
                  <div className="inline-flex items-center gap-1 bg-[#00580C] text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-lg border border-white/80 hover:bg-[#00480a]">
                    <span>North Caloocan</span>
                    <span className="text-amber-300 font-normal">★ 4.7</span>
                  </div>
                </div>

                {/* ── Retailer Marker 4: Bulacan Milling ── */}
                <div
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition transform hover:scale-110"
                  style={{ left: "87%", top: "10%" }}
                  onClick={() => setActiveRetailerId(4)}
                >
                  <div className="inline-flex items-center gap-1 bg-[#00580C] text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-lg border border-white/80 hover:bg-[#00480a]">
                    <span>Bulacan Milling</span>
                    <span className="text-amber-300 font-normal">★ 4.9</span>
                  </div>
                </div>

                {/* ── Retailer Marker 3: GrainMart ── */}
                <div
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition transform hover:scale-110"
                  style={{ left: "67%", top: "68%" }}
                  onClick={() => setActiveRetailerId(3)}
                >
                  <div className="inline-flex items-center gap-1 bg-[#00580C] text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-lg border border-white/80 hover:bg-[#00480a]">
                    <span>GrainMart</span>
                    <span className="text-amber-300 font-normal">★ 4.6</span>
                  </div>
                </div>

                {/* ── Active Retailer Popup Callout Box (Greenfield Rice Store) ── */}
                <div
                  className="absolute z-30 -translate-x-1/2 -translate-y-full mb-3"
                  style={{ left: "74%", top: "46%" }}
                >
                  <div className="bg-white rounded-2xl p-3.5 shadow-2xl border border-gray-200 w-72 sm:w-80 text-left animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900 truncate">
                        {activeRetailer.name}
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {activeRetailer.distanceKm} km
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={11} /> Verified GrainRise Retailer
                    </p>

                    <p className="text-[10px] text-gray-500 mt-1">
                      <span className="text-amber-500 font-bold">★ {activeRetailer.rating}</span> • {activeRetailer.productCount} products listed
                    </p>

                    <p className="text-[10px] text-gray-400 truncate mt-0.5">
                      {activeRetailer.varieties.join(", ")}
                    </p>

                    {/* Popup Actions */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/consumer/marketplace?seller=${encodeURIComponent(activeRetailer.name)}`)}
                        className="py-1.5 px-3 rounded-lg bg-[#00580C] text-white text-[11px] font-bold hover:bg-emerald-900 transition text-center cursor-pointer shadow-xs"
                      >
                        View Store
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveModalDirections(activeRetailer)}
                        className="py-1.5 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 text-[11px] font-bold hover:bg-gray-50 transition text-center cursor-pointer"
                      >
                        Get Directions
                      </button>
                    </div>
                  </div>

                  {/* Marker Pin Below Callout */}
                  <div className="flex flex-col items-center mt-1">
                    <div className="h-6 w-6 rounded-full bg-[#00580C] text-white text-[11px] font-bold flex items-center justify-center shadow-md border-2 border-white">
                      1
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Legend */}
              <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-xl shadow-md border border-gray-200 flex items-center gap-4 text-xs font-medium text-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block" />
                  <span>Your Selected Location</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#00580C] inline-block" />
                  <span>Verified Retailer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Directions Modal ────────────────────────────────────────── */}
      {activeModalDirections && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Route & Directions
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                  {activeModalDirections.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeModalDirections.distanceKm} km away • Approx. 4-8 mins travel time
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalDirections(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Turn-by-Turn Steps */}
            <div className="my-4 space-y-3 max-h-60 overflow-y-auto pr-1">
              {activeModalDirections.directions.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs text-gray-700">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="flex-1 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  activeModalDirections.name + " " + activeModalDirections.address
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 hover:bg-emerald-50 border border-emerald-200 transition"
              >
                <span>Open in Google Maps</span>
                <ExternalLink size={13} />
              </a>

              <button
                type="button"
                onClick={() => setActiveModalDirections(null)}
                className="px-4 py-2 bg-[#00580C] hover:bg-[#00480a] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
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
