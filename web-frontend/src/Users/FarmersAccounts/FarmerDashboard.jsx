import React, { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Warehouse,
  FileText,
  Leaf,
  Map,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileDown,
  ChevronDown,
  Droplets,
  Thermometer,
  Layers,
} from "lucide-react";
import { jsPDF } from "jspdf";

import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../Components/Graphs/KPICard";
import useFarmerDashboard from "../../Components/hooks/Farmer/useFarmerDashboard";
import { translations, useLanguagePreference } from "../../lib/translations";

// ============================================================
// STYLING & RISK CONFIGURATIONS (MATCHING MILLER ENCODER UI)
// ============================================================

const RISK_STYLES = {
  LOW: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    icon: ShieldCheck,
  },
  MODERATE: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    icon: AlertTriangle,
  },
  HIGH: {
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    icon: ShieldAlert,
  },
};

const CROP_STATUS_STYLES = {
  "Planted and Growing": "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Land Preparation": "border-blue-200 bg-blue-50 text-blue-800",
  "Harvested": "border-slate-200 bg-slate-50 text-slate-800",
  "Failed Crop": "border-rose-200 bg-rose-50 text-rose-800",
  "Available for Planting": "border-amber-200 bg-amber-50 text-amber-800",
};

// ============================================================
// NUMBER & DATE FORMATTERS
// ============================================================

const formatDashboardDate = (date) =>
  date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const formatDashboardTime = (date) =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const formatMonth = (dateValue, format = "short") => {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: format });
};

const formatArea = (value) => {
  const number = Number(value) || 0;
  return `${number.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ha`;
};

const formatPeso = (value) => {
  const number = Number(value) || 0;
  return `₱${number.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const formatQuantity = (value) => {
  const number = Number(value) || 0;
  return number.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

// ============================================================
// CHART GENERATION HELPERS
// ============================================================

const createMarketChart = (records) => {
  const width = 400;
  const height = 150;
  const left = 42;
  const right = 18;
  const top = 15;
  const bottom = 28;

  const values = records
    .map((record) => record.average_price_per_kg)
    .filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)))
    .map(Number);

  if (values.length === 0) {
    return {
      available: false,
      points: [],
      polyline: "",
      area: "",
      min: 0,
      middle: 0,
      max: 0,
    };
  }

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding =
    rawMax === rawMin
      ? Math.max(rawMax * 0.1, 1)
      : Math.max((rawMax - rawMin) * 0.15, 0.5);

  const min = Math.max(0, rawMin - padding);
  const max = rawMax + padding;
  const range = Math.max(max - min, 1);
  const totalRecords = Math.max(records.length, 1);

  const points = records
    .map((record, index) => {
      const value = record.average_price_per_kg;
      if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return null;
      }
      const x =
        totalRecords === 1
          ? left + (width - left - right) / 2
          : left + (index / (totalRecords - 1)) * (width - left - right);
      const y = top + ((max - Number(value)) / range) * (height - top - bottom);
      return {
        x,
        y,
        value: Number(value),
        record,
      };
    })
    .filter(Boolean);

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const baselineY = height - bottom;
  const area =
    points.length > 1
      ? `${points[0].x},${baselineY} ${polyline} ${points[points.length - 1].x},${baselineY}`
      : "";

  return {
    available: true,
    points,
    polyline,
    area,
    min,
    middle: (min + max) / 2,
    max,
  };
};

const createYieldChart = (records) => {
  const width = 400;
  const height = 150;
  const left = 42;
  const right = 12;
  const top = 12;
  const bottom = 30;

  if (!Array.isArray(records) || records.length === 0) {
    return {
      available: false,
      bars: [],
      max: 0,
    };
  }

  const values = records
    .map((record) => Number(record.actual_yield_kg) || 0)
    .filter((value) => value > 0);

  if (values.length === 0) {
    return {
      available: false,
      bars: [],
      max: 0,
    };
  }

  const rawMax = Math.max(...values);
  const max = Math.max(rawMax * 1.15, 100);
  const drawableWidth = width - left - right;
  const drawableHeight = height - top - bottom;
  const slotWidth = drawableWidth / records.length;
  const barWidth = Math.min(slotWidth * 0.55, 42);

  const bars = records.map((record, index) => {
    const value = Number(record.actual_yield_kg) || 0;
    const barHeight = (value / max) * drawableHeight;
    const centerX = left + slotWidth * index + slotWidth / 2;

    return {
      ...record,
      value,
      x: centerX - barWidth / 2,
      centerX,
      y: top + drawableHeight - barHeight,
      height: barHeight,
      width: barWidth,
      label: record.crop_cycle_name || `Cycle ${index + 1}`,
    };
  });

  return {
    available: true,
    bars,
    max,
  };
};

const createClimateChart = (records) => {
  const width = 800;
  const height = 200;
  const left = 28;
  const right = 28;
  const top = 18;
  const bottom = 28;

  if (!Array.isArray(records) || records.length === 0) {
    return {
      available: false,
      bars: [],
      temperaturePoints: [],
      temperaturePolyline: "",
      rainfallMax: 0,
      temperatureMin: 0,
      temperatureMax: 0,
    };
  }

  const rainfallValues = records.map((record) => Number(record.rainfall_mm) || 0);
  const temperatureValues = records
    .map((record) => record.temperature_c)
    .filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)))
    .map(Number);

  const rawRainfallMax = rainfallValues.length > 0 ? Math.max(...rainfallValues) : 0;
  const rainfallMax = Math.max(rawRainfallMax * 1.15, 1);

  let temperatureMin = 20;
  let temperatureMax = 35;
  if (temperatureValues.length > 0) {
    const rawMin = Math.min(...temperatureValues);
    const rawMax = Math.max(...temperatureValues);
    const padding = rawMax === rawMin ? 1 : Math.max((rawMax - rawMin) * 0.2, 0.5);
    temperatureMin = Math.max(0, rawMin - padding);
    temperatureMax = rawMax + padding;
  }

  const temperatureRange = Math.max(temperatureMax - temperatureMin, 1);
  const drawableWidth = width - left - right;
  const drawableHeight = height - top - bottom;
  const slotWidth = drawableWidth / records.length;
  const barWidth = Math.min(slotWidth * 0.5, 52);

  const bars = records.map((record, index) => {
    const rainfall = Number(record.rainfall_mm) || 0;
    const barHeight = (rainfall / rainfallMax) * drawableHeight;
    const centerX = left + slotWidth * index + slotWidth / 2;

    return {
      ...record,
      rainfall,
      x: centerX - barWidth / 2,
      centerX,
      y: top + drawableHeight - barHeight,
      height: barHeight,
      width: barWidth,
      label: record.label || record.month || `M${index + 1}`,
    };
  });

  const temperaturePoints = records
    .map((record, index) => {
      const value = record.temperature_c;
      if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return null;
      }
      const centerX = left + slotWidth * index + slotWidth / 2;
      const y = top + ((temperatureMax - Number(value)) / temperatureRange) * drawableHeight;

      return {
        x: centerX,
        y,
        value: Number(value),
        record,
      };
    })
    .filter(Boolean);

  const temperaturePolyline = temperaturePoints.map((p) => `${p.x},${p.y}`).join(" ");

  return {
    available: true,
    bars,
    temperaturePoints,
    temperaturePolyline,
    rainfallMax,
    temperatureMin,
    temperatureMax,
  };
};

const EmptyChartState = ({ message }) => (
  <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
    <p className="text-xs font-medium text-slate-400">{message}</p>
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function FarmerDashboard() {
  const navigate = useNavigate();
  const [language] = useLanguagePreference();
  const t = translations[language]?.farmer ?? translations.en.farmer;

  const {
    kpis,
    palayMarketPriceTrend,
    yieldHistory,
    climateOutlook,
    shelfHealth,
    farmHealth,
    farms,
    selectedFarm,
    selectedFarmId,
    setSelectedFarmId,
    currentCrop,
    isLoading,
    isRefreshing,
    error,
    refreshDashboard,
    farmerUser,
  } = useFarmerDashboard();

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const now = new Date();
  const formattedDate = formatDashboardDate(now);
  const formattedTime = formatDashboardTime(now);

  // ==========================================================
  // KPI METRICS
  // ==========================================================
  const kpiMetrics = useMemo(
    () => [
      {
        title: t.dashboard.kpis.availableMillers.toUpperCase(),
        value: isLoading ? "—" : kpis.available_millers,
        footer: "Millers available in the system",
        tone: "success",
        icon: <Warehouse size={18} strokeWidth={2.2} />,
        shortcutPath: "/farmer/contracts?tab=opportunities",
        shortcutLabel: "View available miller opportunities",
      },
      {
        title: t.dashboard.kpis.contractedMillers.toUpperCase(),
        value: isLoading ? "—" : kpis.contracted_millers,
        footer: "Millers with active contracts",
        tone: "neutral",
        icon: <FileText size={18} strokeWidth={2.2} />,
        shortcutPath: "/farmer/contracts?tab=current",
        shortcutLabel: "View current contracts with millers",
      },
      {
        title: t.dashboard.kpis.registeredHarvestArea.toUpperCase(),
        value: isLoading ? "—" : formatArea(kpis.registered_harvest_area_ha),
        footer: "Registered area currently planted",
        tone: "success",
        icon: <Leaf size={18} strokeWidth={2.2} />,
        shortcutPath: "/farmer/farm-management?segment=my-farms&crop_status=planted_and_growing",
        shortcutLabel: "View farms with planted and growing crops",
      },
      {
        title: t.dashboard.kpis.potentialCroppingArea.toUpperCase(),
        value: isLoading ? "—" : formatArea(kpis.potential_cropping_area_ha),
        footer: "Total area available for cropping",
        tone: "warning",
        icon: <Map size={18} strokeWidth={2.2} />,
        shortcutPath: "/farmer/farm-management?segment=my-farms&crop_status=available_for_planting",
        shortcutLabel: "View farms available for cropping",
      },
    ],
    [isLoading, kpis, t]
  );

  // ==========================================================
  // CHART COMPUTATIONS
  // ==========================================================
  const marketChart = useMemo(() => createMarketChart(palayMarketPriceTrend), [palayMarketPriceTrend]);
  const yieldChart = useMemo(() => createYieldChart(yieldHistory), [yieldHistory]);
  const climateChart = useMemo(() => createClimateChart(climateOutlook?.series || []), [climateOutlook]);

  const shelfRiskLevel = String(shelfHealth?.risk_level || "LOW").toUpperCase();
  const shelfRiskConfig = RISK_STYLES[shelfRiskLevel] || RISK_STYLES.LOW;
  const ShelfRiskIcon = shelfRiskConfig.icon;

  const farmRiskLevel = String(farmHealth?.risk_level || "LOW").toUpperCase();
  const farmRiskConfig = RISK_STYLES[farmRiskLevel] || RISK_STYLES.LOW;
  const FarmRiskIcon = farmRiskConfig.icon;
  const cropStatusLabel = farmHealth?.crop_status || currentCrop?.crop_status || "Available for Planting";
  const cropStatusBadgeStyle = CROP_STATUS_STYLES[cropStatusLabel] || "border-slate-200 bg-slate-50 text-slate-700";

  // ==========================================================
  // EXPORT TO CSV
  // ==========================================================
  const exportToCsv = (section = "all") => {
    let rows = [];
    let filename = `grainrise-farmer-dashboard-${section}-${new Date().toISOString().split("T")[0]}.csv`;

    const escapeField = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    if (section === "kpi" || section === "all") {
      rows.push(["KEY PERFORMANCE INDICATORS (KPIS)"]);
      rows.push(["Metric", "Value", "Description"]);
      rows.push(["Available Millers", kpis.available_millers, "Active registered millers in GrainRise"]);
      rows.push(["Contracted Millers", kpis.contracted_millers, "Distinct millers with active farmer contracts"]);
      rows.push(["Registered Harvest Area", `${kpis.registered_harvest_area_ha} ha`, "Currently planted and growing area"]);
      rows.push(["Potential Cropping Area", `${kpis.potential_cropping_area_ha} ha`, "Remaining registered farm area available"]);
      rows.push(["Total Registered Farm Area", `${kpis.total_farm_area_ha} ha`, "Total eligible farm area registered"]);
      rows.push([]);
    }

    if (section === "market_prices" || section === "all") {
      rows.push(["PALAY MARKET PRICE TREND"]);
      rows.push(["Date", "Price (PHP/kg)", "Rice Variety", "Market Location", "Category", "Source"]);
      palayMarketPriceTrend.forEach((p) => {
        rows.push([
          p.period_start,
          p.average_price_per_kg,
          p.rice_variety,
          p.market_location,
          p.price_category,
          p.source_name,
        ]);
      });
      rows.push([]);
    }

    if (section === "yield_history" || section === "all") {
      rows.push(["HARVEST & YIELD HISTORY"]);
      rows.push(["Crop Cycle", "Farm Lot", "Rice Variety", "Harvest Date", "Actual Yield (kg)"]);
      yieldHistory.forEach((y) => {
        rows.push([
          y.crop_cycle_name,
          y.farm_name,
          y.rice_variety,
          y.actual_harvest_date,
          y.actual_yield_kg,
        ]);
      });
      rows.push([]);
    }

    if (section === "climate" || section === "all") {
      rows.push(["6-MONTH CLIMATE OUTLOOK (COPERNICUS CDS)"]);
      rows.push(["Location", climateOutlook?.location || ""]);
      rows.push(["Data Source", climateOutlook?.source || ""]);
      rows.push(["Month", "Period Start", "Projected Rainfall (mm)", "Projected Temperature (°C)"]);
      (climateOutlook?.series || []).forEach((c) => {
        rows.push([
          c.month || c.label,
          c.period_start,
          c.rainfall_mm,
          c.temperature_c,
        ]);
      });
      rows.push([]);
    }

    if (section === "shelf_health" || section === "all") {
      rows.push(["AI MOISTURE & SHELF HEALTH INSIGHT"]);
      rows.push(["Risk Level", shelfRiskLevel]);
      rows.push(["Storage Assessment", shelfHealth?.explanation || ""]);
      rows.push(["Recommended Actions"]);
      (shelfHealth?.recommended_actions || []).forEach((a, idx) => {
        rows.push([`Action ${idx + 1}`, a]);
      });
      rows.push([]);
    }

    if (section === "farm_health" || section === "all") {
      rows.push(["AI FARM HEALTH INSIGHT"]);
      rows.push(["Risk Level", farmRiskLevel]);
      rows.push(["Crop Status", cropStatusLabel]);
      rows.push(["Agronomic Assessment", farmHealth?.explanation || ""]);
      rows.push(["Irrigation Advisory", farmHealth?.irrigation_advisory || ""]);
      rows.push(["Fertilizer Advisory", farmHealth?.fertilizer_advisory || ""]);
      rows.push(["Recommended Actions"]);
      (farmHealth?.recommended_actions || []).forEach((a, idx) => {
        rows.push([`Action ${idx + 1}`, a]);
      });
      rows.push([]);
    }

    const csvContent = "\uFEFF" + rows.map((r) => r.map(escapeField).join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  // ==========================================================
  // EXPORT TO PDF
  // ==========================================================
  const exportToPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const primaryColor = [22, 101, 52]; // Dark green (#166534)
      const slateColor = [51, 65, 85];
      let y = 18;

      // Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 26, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("GRAINRISE AGRICULTURAL PLATFORM", 14, 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Executive Farmer Performance & Farm Health Report", 14, 18);
      doc.text(`Generated: ${formattedDate} ${formattedTime}`, 145, 18);

      y = 35;

      // Farmer & Farm Details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
      const farmerFullName = `${farmerUser?.first_name || "Registered"} ${farmerUser?.last_name || "Farmer"}`;
      doc.text(`Farmer: ${farmerFullName}`, 14, y);

      const farmLocStr = selectedFarm
        ? `${selectedFarm.farm_lot_name} — ${selectedFarm.municipality}, ${selectedFarm.province}`
        : "All Registered Farm Lots";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Target Farm: ${farmLocStr}`, 14, y + 5);

      y += 15;

      // Section 1: KPIs
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("1. KEY PERFORMANCE INDICATORS", 14, y);
      y += 4;

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 18, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("AVAILABLE MILLERS", 18, y + 6);
      doc.text("CONTRACTED MILLERS", 62, y + 6);
      doc.text("REGISTERED HARVEST AREA", 106, y + 6);
      doc.text("POTENTIAL CROPPING AREA", 150, y + 6);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(String(kpis.available_millers), 18, y + 14);
      doc.text(String(kpis.contracted_millers), 62, y + 14);
      doc.text(`${kpis.registered_harvest_area_ha} ha`, 106, y + 14);
      doc.text(`${kpis.potential_cropping_area_ha} ha`, 150, y + 14);

      y += 26;

      // Section 2: Palay Prices & Harvest History Summary
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("2. PALAY MARKET PRICES & YIELD PERFORMANCE", 14, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      const latestPrice = palayMarketPriceTrend[palayMarketPriceTrend.length - 1];
      const latestPriceStr = latestPrice
        ? `Latest Farmgate Price: ₱${latestPrice.average_price_per_kg}/kg (${latestPrice.period_start}, ${latestPrice.source_name})`
        : "No price records available.";
      doc.text(latestPriceStr, 14, y);
      y += 5;

      const latestYield = yieldHistory[yieldHistory.length - 1];
      const latestYieldStr = latestYield
        ? `Latest Completed Harvest: ${latestYield.crop_cycle_name} — ${formatQuantity(latestYield.actual_yield_kg)} kg (${latestYield.rice_variety})`
        : "No completed harvest records available.";
      doc.text(latestYieldStr, 14, y);

      y += 12;

      // Section 3: 6-Month Climate Forecast
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("3. 6-MONTH CLIMATE OUTLOOK (COPERNICUS CDS)", 14, y);
      y += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Location: ${climateOutlook?.location || farmLocStr} • Source: Copernicus CDS`, 14, y + 2);
      y += 6;

      // Mini climate table
      const series = climateOutlook?.series || [];
      if (series.length > 0) {
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, 182, 6, "F");
        doc.setFont("helvetica", "bold");
        doc.text("Month", 18, y + 4.5);
        doc.text("Rainfall (mm)", 75, y + 4.5);
        doc.text("Mean Temp (°C)", 140, y + 4.5);
        y += 7;

        doc.setFont("helvetica", "normal");
        series.forEach((s) => {
          doc.text(s.month || s.label || "", 18, y + 4);
          doc.text(`${s.rainfall_mm} mm`, 75, y + 4);
          doc.text(`${s.temperature_c}°C`, 140, y + 4);
          y += 5;
        });
      }

      y += 6;

      // Section 4: AI Insights
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("4. AI STORAGE & AGRONOMIC GUIDANCE", 14, y);
      y += 5;

      // Shelf Health Box
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`• Post-Harvest Shelf Health [${shelfRiskLevel} RISK]`, 14, y);
      y += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const shelfTextLines = doc.splitTextToSize(
        shelfHealth?.explanation?.replace(/\n\n/g, " ") || "No shelf health assessment available.",
        182
      );
      doc.text(shelfTextLines.slice(0, 4), 14, y);
      y += Math.min(shelfTextLines.length, 4) * 3.5 + 3;

      // Farm Health Box
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`• Agronomic Field Health [${farmRiskLevel} RISK — ${cropStatusLabel}]`, 14, y);
      y += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const farmTextLines = doc.splitTextToSize(
        farmHealth?.explanation?.replace(/\n\n/g, " ") || "No farm health assessment available.",
        182
      );
      doc.text(farmTextLines.slice(0, 4), 14, y);
      y += Math.min(farmTextLines.length, 4) * 3.5 + 5;

      // Official Footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        "Disclaimer: GrainRise AI and Copernicus CDS climate guidance provide predictive decision-support only. Always corroborate with physical field conditions.",
        14,
        282
      );

      doc.save(`grainrise-farmer-report-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF Export error:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="space-y-5">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: t.sidebar.main }, { label: t.sidebar.dashboard }]} />
          <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
            {farmerUser?.first_name ? `Welcome, ${farmerUser.first_name}` : t.dashboard.title}
          </h2>
          <p className="text-sm text-slate-500">
            {isLoading ? "Loading dashboard data..." : `Last Updated: Today · ${formattedTime}`}
          </p>
        </div>

        {/* Header Actions Area */}
        <div className="flex flex-wrap items-center gap-2.5 self-start">
          {/* Farm Selector Dropdown */}
          {farms && farms.length > 0 && (
            <div className="relative">
              <select
                value={selectedFarmId || ""}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="appearance-none rounded-full border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-emerald-500 focus:outline-none cursor-pointer"
                title="Select registered farm"
              >
                <option value="">All Farms</option>
                {farms.map((f) => (
                  <option key={f.farm_profile_id} value={f.farm_profile_id}>
                    {f.farm_lot_name || "Farm"} ({f.municipality}, {f.province})
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-3 text-slate-400" />
            </div>
          )}

          {/* Date Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm">
            <CalendarDays size={14} className="text-slate-500" />
            <span>{formattedDate}</span>
          </div>

          {/* Refresh AI Insights Button */}
          <button
            type="button"
            onClick={() => refreshDashboard({ force: true })}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-60 cursor-pointer"
            title="Refresh AI Insights and Climate Data"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-emerald-600" : "text-slate-500"} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export Controls: Dropdown CSV + PDF Button */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 active:scale-95 cursor-pointer"
              title="Export dashboard data to CSV"
            >
              <FileSpreadsheet size={14} className="text-emerald-700" />
              <span>Export CSV</span>
              <ChevronDown size={12} className="text-emerald-700" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 z-50 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Select Dataset
                </div>
                <button
                  type="button"
                  onClick={() => exportToCsv("all")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition cursor-pointer text-left"
                >
                  <Layers size={13} /> All Dashboard Data
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => exportToCsv("kpi")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <Warehouse size={13} /> KPI Summary
                </button>
                <button
                  type="button"
                  onClick={() => exportToCsv("market_prices")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <FileText size={13} /> Palay Market Prices
                </button>
                <button
                  type="button"
                  onClick={() => exportToCsv("yield_history")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <Leaf size={13} /> Harvest & Yield History
                </button>
                <button
                  type="button"
                  onClick={() => exportToCsv("climate")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <Map size={13} /> 6-Month Climate Outlook
                </button>
                <button
                  type="button"
                  onClick={() => exportToCsv("shelf_health")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <Sparkles size={13} /> AI Shelf Health Insight
                </button>
                <button
                  type="button"
                  onClick={() => exportToCsv("farm_health")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <Leaf size={13} /> AI Farm Health Insight
                </button>
              </div>
            )}
          </div>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={exportToPdf}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900 active:scale-95 cursor-pointer"
            title="Download executive PDF summary"
          >
            <FileDown size={14} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* =====================================================
          ERROR BANNER
      ====================================================== */}
      {error && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-red-700">Unable to load some dashboard information.</p>
            <p className="mt-0.5 text-xs text-red-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => refreshDashboard()}
            className="self-start rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* =====================================================
          KPI ROW (EXACTLY 1 ROW ON DESKTOP)
      ====================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiMetrics.map(({ shortcutPath, shortcutLabel, ...metric }) => (
          <KPICard
            key={metric.title}
            {...metric}
            ariaLabel={shortcutLabel}
            onClick={() => navigate(shortcutPath)}
          />
        ))}
      </div>

      {/* =====================================================
          CHARTS ROW 1: PALAY MARKET PRICES & YIELD HISTORY
      ====================================================== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Palay Market Price Trend */}
        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Palay Market Price Trend</h3>
              <span className="rounded-full border border-emerald-100 bg-emerald-50/70 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                Official PSA
              </span>
            </div>
            <p className="mb-4 text-xs text-gray-500">
              Historical official farmgate buying price records (₱/kg)
            </p>
          </div>

          <div className="relative h-48 w-full">
            {isLoading ? (
              <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
            ) : !marketChart.available ? (
              <EmptyChartState message="No Palay buying price records are available yet." />
            ) : (
              <svg viewBox="0 0 400 150" className="h-full w-full overflow-visible">
                <defs>
                  <linearGradient id="farmerMarketPriceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F9D2A" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#0F9D2A" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid */}
                <line x1="42" y1="15" x2="382" y2="15" stroke="#f1f5f9" />
                <line x1="42" y1="68" x2="382" y2="68" stroke="#f1f5f9" />
                <line x1="42" y1="122" x2="382" y2="122" stroke="#f1f5f9" />

                {/* Y-Axis */}
                <text x="0" y="19" className="fill-gray-400 text-[9px]">
                  {formatPeso(marketChart.max)}
                </text>
                <text x="0" y="72" className="fill-gray-400 text-[9px]">
                  {formatPeso(marketChart.middle)}
                </text>
                <text x="0" y="126" className="fill-gray-400 text-[9px]">
                  {formatPeso(marketChart.min)}
                </text>

                {/* Area Fill */}
                {marketChart.area && (
                  <polygon points={marketChart.area} fill="url(#farmerMarketPriceGradient)" />
                )}

                {/* Line */}
                {marketChart.points.length > 1 && (
                  <polyline
                    points={marketChart.polyline}
                    fill="none"
                    stroke="#0F9D2A"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Points */}
                {marketChart.points.map((point, index) => (
                  <circle
                    key={`${point.record.period_start}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="white"
                    stroke="#0F9D2A"
                    strokeWidth="2"
                  >
                    <title>{`${formatMonth(point.record.period_start, "long")}: ${formatPeso(point.value)}/kg`}</title>
                  </circle>
                ))}

                {/* X-Axis */}
                {palayMarketPriceTrend.map((record, index) => {
                  const total = Math.max(palayMarketPriceTrend.length - 1, 1);
                  const x = 42 + (index / total) * 340;
                  return (
                    <text
                      key={record.period_start || index}
                      x={x}
                      y="146"
                      className="fill-gray-400 text-[9px]"
                      textAnchor="middle"
                    >
                      {formatMonth(record.period_start)}
                    </text>
                  );
                })}
              </svg>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400">
            <span>Source: Philippine Statistics Authority (PSA)</span>
            <span>Monthly Farmgate (Dry Palay)</span>
          </div>
        </div>

        {/* Harvest & Yield History */}
        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Harvest & Yield History</h3>
            <p className="mb-4 text-xs text-gray-500">Actual yield (kg) per completed cropping cycle</p>
          </div>

          <div className="relative h-48 w-full">
            {isLoading ? (
              <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
            ) : !yieldChart.available ? (
              <EmptyChartState message="No completed harvest records with actual yield are available yet." />
            ) : (
              <svg viewBox="0 0 400 150" className="h-full w-full overflow-visible">
                {/* Grid */}
                <line x1="42" y1="12" x2="388" y2="12" stroke="#f1f5f9" />
                <line x1="42" y1="66" x2="388" y2="66" stroke="#f1f5f9" />
                <line x1="42" y1="120" x2="388" y2="120" stroke="#f1f5f9" />

                {/* Y-Axis */}
                <text x="0" y="16" className="fill-gray-400 text-[9px]">
                  {`${formatQuantity(yieldChart.max)} kg`}
                </text>
                <text x="0" y="70" className="fill-gray-400 text-[9px]">
                  {`${formatQuantity(yieldChart.max / 2)} kg`}
                </text>
                <text x="0" y="124" className="fill-gray-400 text-[9px]">
                  0 kg
                </text>

                {/* Bars */}
                {yieldChart.bars.map((bar, index) => (
                  <g key={bar.crop_cycle_id || index}>
                    <rect x={bar.x} y="12" width={bar.width} height="108" rx="3" fill="#F8FAFC" />
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      rx="3"
                      fill="#166534"
                    >
                      <title>{`${bar.farm_name || "Farm"} • ${bar.rice_variety || "Rice"} • ${formatQuantity(bar.value)} kg`}</title>
                    </rect>
                    <text x={bar.centerX} y="145" className="fill-gray-400 text-[9px]" textAnchor="middle">
                      {bar.label}
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400">
            <span>Verified Crop Cycle Records</span>
            <span>Completed Harvests</span>
          </div>
        </div>
      </div>

      {/* =====================================================
          ROW 2: AI INSIGHTS (MATCHING MILLER ENCODER UI)
      ====================================================== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left Card: AI Moisture & Shelf Health Insight */}
        <article className="dark-readable-graph w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)] flex flex-col justify-between">
          <header className="border-b border-slate-100 px-4 py-3 sm:px-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Sparkles size={14} />
              </div>
              <div>
                <h3 className="text-[17px] font-bold leading-tight tracking-[-0.02em] text-slate-900">
                  AI Moisture & Shelf Health Insight
                </h3>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                  Climate-Driven Storage Risk Guidance
                </p>
              </div>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase shrink-0 ${shelfRiskConfig.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${shelfRiskConfig.dot}`} />
              <ShelfRiskIcon size={13} />
              <span>{shelfRiskLevel} RISK</span>
            </div>
          </header>

          <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto max-h-[360px]">
            {/* Advisory Disclaimer Banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-800">
              <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11.5px]">
                <span className="font-bold">Climate Advisory Guidance:</span> This insight evaluates regional Copernicus CDS weather conditions and current on-farm grain inventory. It is not an indoor electronic moisture sensor measurement.
              </p>
            </div>

            {/* Assessment Text */}
            <div className="space-y-2 text-xs sm:text-[12.5px] leading-relaxed text-slate-600">
              {shelfHealth?.explanation ? (
                shelfHealth.explanation
                  .split("\n\n")
                  .filter(Boolean)
                  .map((para, pIdx) => (
                    <p key={pIdx} className="text-slate-700">
                      {para}
                    </p>
                  ))
              ) : (
                <p className="text-slate-500 italic">
                  Storage health assessment is being generated based on seasonal conditions.
                </p>
              )}
            </div>

            {/* Practical Recommendations */}
            {Array.isArray(shelfHealth?.recommended_actions) && shelfHealth.recommended_actions.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                  Recommended Storage Actions:
                </span>
                <ul className="space-y-1.5">
                  {shelfHealth.recommended_actions.map((action, aIdx) => (
                    <li key={aIdx} className="flex items-start gap-2 text-[11.5px] text-slate-700 leading-snug">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <footer className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 sm:px-5 flex items-center justify-between text-[11px] text-slate-400">
            <span>GrainRise AI Preservation Engine</span>
            <span className="font-medium text-slate-500">Stored in 14-day snapshot</span>
          </footer>
        </article>

        {/* Right Card: AI Farm Health Insight */}
        <article className="dark-readable-graph w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)] flex flex-col justify-between">
          <header className="border-b border-slate-100 px-4 py-3 sm:px-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Leaf size={14} />
              </div>
              <div>
                <h3 className="text-[17px] font-bold leading-tight tracking-[-0.02em] text-slate-900">
                  AI Farm Health Insight
                </h3>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                  Climate-Driven Agronomic Guidance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Crop Status Badge */}
              <div
                className={`hidden sm:inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cropStatusBadgeStyle}`}
              >
                <span>{cropStatusLabel}</span>
              </div>

              {/* Risk Badge */}
              <div
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase ${farmRiskConfig.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${farmRiskConfig.dot}`} />
                <FarmRiskIcon size={13} />
                <span>{farmRiskLevel} RISK</span>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto max-h-[360px]">
            {/* Advisory Disclaimer Banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 text-xs text-blue-900">
              <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11.5px]">
                <span className="font-bold">Agronomic Advisory Guidance:</span> Recommendations are projected based on seasonal Copernicus CDS weather conditions and crop cycle stages. Adjust according to physical field scouting.
              </p>
            </div>

            {/* Assessment Text */}
            <div className="space-y-2 text-xs sm:text-[12.5px] leading-relaxed text-slate-600">
              {farmHealth?.explanation ? (
                farmHealth.explanation
                  .split("\n\n")
                  .filter(Boolean)
                  .map((para, pIdx) => (
                    <p key={pIdx} className="text-slate-700">
                      {para}
                    </p>
                  ))
              ) : (
                <p className="text-slate-500 italic">
                  Agronomic health assessment is being prepared for your registered farm lot.
                </p>
              )}
            </div>

            {/* Irrigation & Fertilizer Advisories */}
            {(farmHealth?.irrigation_advisory || farmHealth?.fertilizer_advisory) && (
              <div className="space-y-2 pt-1 border-t border-slate-100">
                {farmHealth.irrigation_advisory && (
                  <div className="rounded-lg bg-slate-50 p-2.5 text-[11.5px] text-slate-700">
                    <span className="font-bold text-slate-800 block mb-0.5">Water & Irrigation:</span>
                    {farmHealth.irrigation_advisory}
                  </div>
                )}
                {farmHealth.fertilizer_advisory && (
                  <div className="rounded-lg bg-slate-50 p-2.5 text-[11.5px] text-slate-700">
                    <span className="font-bold text-slate-800 block mb-0.5">Nutrient Management:</span>
                    {farmHealth.fertilizer_advisory}
                  </div>
                )}
              </div>
            )}

            {/* Practical Recommendations */}
            {Array.isArray(farmHealth?.recommended_actions) && farmHealth.recommended_actions.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                  Recommended Field Actions:
                </span>
                <ul className="space-y-1.5">
                  {farmHealth.recommended_actions.map((action, aIdx) => (
                    <li key={aIdx} className="flex items-start gap-2 text-[11.5px] text-slate-700 leading-snug">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <footer className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 sm:px-5 flex items-center justify-between text-[11px] text-slate-400">
            <span>GrainRise Agronomic AI</span>
            <span className="font-medium text-slate-500">Stored in 14-day snapshot</span>
          </footer>
        </article>
      </div>

      {/* =====================================================
          ROW 3: 6-MONTH CLIMATE OUTLOOK (COPERNICUS CDS)
      ====================================================== */}
      <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">6-Month Climate Outlook</h3>
            <p className="mt-1 text-xs text-gray-500">
              Projected rainfall and mean temperature for your registered farm location.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-bold text-blue-700">
              <Droplets size={12} className="text-blue-600 shrink-0" />
              <span>Copernicus CDS</span>
            </div>

            <div className="flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">
              <Map size={12} className="shrink-0 text-slate-500" />
              <span className="truncate max-w-[200px]">
                {climateOutlook?.location || selectedFarm?.municipality || "Registered Farm"}
              </span>
            </div>
          </div>
        </div>

        {!isLoading && climateChart.available && (
          <div className="mb-2 flex justify-end gap-4 pr-4 text-[10px] font-medium text-gray-600">
            <span className="flex items-center gap-1">
              <span className="block h-2 w-2 rounded-xs bg-green-700" />
              Rainfall (mm)
            </span>
            <span className="flex items-center gap-1">
              <span className="block h-0.5 w-2 bg-yellow-500" />
              Temp (°C)
            </span>
          </div>
        )}

        <div className="relative h-56 w-full px-4">
          {isLoading ? (
            <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
          ) : !climateChart.available ? (
            <EmptyChartState message="No completed 6-month climate forecast is stored yet." />
          ) : (
            <svg viewBox="0 0 800 200" className="h-full w-full overflow-visible">
              {/* Horizontal Gridlines */}
              <line x1="28" y1="18" x2="772" y2="18" stroke="#f1f5f9" />
              <line x1="28" y1="69" x2="772" y2="69" stroke="#f1f5f9" />
              <line x1="28" y1="120" x2="772" y2="120" stroke="#f1f5f9" />
              <line x1="28" y1="172" x2="772" y2="172" stroke="#f1f5f9" />

              {/* Left Y-Axis (Rainfall) */}
              <text x="20" y="22" className="fill-gray-400 text-[9px]" textAnchor="end">
                {`${formatQuantity(climateChart.rainfallMax)}mm`}
              </text>
              <text x="20" y="73" className="fill-gray-400 text-[9px]" textAnchor="end">
                {`${formatQuantity(climateChart.rainfallMax * 0.67)}mm`}
              </text>
              <text x="20" y="124" className="fill-gray-400 text-[9px]" textAnchor="end">
                {`${formatQuantity(climateChart.rainfallMax * 0.33)}mm`}
              </text>
              <text x="20" y="176" className="fill-gray-400 text-[9px]" textAnchor="end">
                0mm
              </text>

              {/* Right Y-Axis (Temperature) */}
              <text x="780" y="22" className="fill-gray-400 text-[9px]">
                {`${climateChart.temperatureMax.toFixed(1)}°C`}
              </text>
              <text x="780" y="98" className="fill-gray-400 text-[9px]">
                {`${((climateChart.temperatureMax + climateChart.temperatureMin) / 2).toFixed(1)}°C`}
              </text>
              <text x="780" y="176" className="fill-gray-400 text-[9px]">
                {`${climateChart.temperatureMin.toFixed(1)}°C`}
              </text>

              {/* Rainfall Bars */}
              {climateChart.bars.map((bar, index) => (
                <g key={bar.period_start || index}>
                  <rect
                    x={bar.x}
                    y={bar.y}
                    width={bar.width}
                    height={bar.height}
                    rx="2"
                    fill="#0B7A2A"
                  >
                    <title>{`${formatMonth(bar.period_start, "long") || bar.label}: ${formatQuantity(bar.rainfall)} mm rainfall`}</title>
                  </rect>
                  <text
                    x={bar.centerX}
                    y="194"
                    className="fill-gray-500 text-[10px] font-medium"
                    textAnchor="middle"
                  >
                    {formatMonth(bar.period_start) || bar.label}
                  </text>
                </g>
              ))}

              {/* Temperature Line */}
              {climateChart.temperaturePoints.length > 1 && (
                <polyline
                  points={climateChart.temperaturePolyline}
                  fill="none"
                  stroke="#EAB308"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Temperature Points */}
              {climateChart.temperaturePoints.map((point, index) => (
                <circle key={`temperature-${index}`} cx={point.x} cy={point.y} r="3.5" fill="#EAB308">
                  <title>{`${formatMonth(point.record.period_start, "long") || point.record.label}: ${point.value.toFixed(1)}°C`}</title>
                </circle>
              ))}
            </svg>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
          <span>Copernicus Climate Data Store (CDS) • Monthly Snapshot</span>
          <span className="font-medium text-slate-500">Auto-refreshes monthly</span>
        </div>
      </div>
    </div>
  );
}
