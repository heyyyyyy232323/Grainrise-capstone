import { useState } from "react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../Components/Minor-Components/Tabs";
import DemandForecasting from "./DemandForecasting";
import ClimateForecasting from "./ClimateForecasting";

const FORECAST_TABS = [
  { id: "climate", label: "Climate Forecasting" },
  { id: "demand", label: "Demand Forecasting" },
  { id: "insights", label: "Forecast Insights" },
];

export default function FarmerForecasting() {
  const [activeTab, setActiveTab] = useState("demand"); // Defaulting to demand as in first screenshot

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Farm" }, { label: "Forecasting" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Forecasting
        </h2>
        <p className="text-sm text-slate-500">
          Make informed farming decisions using climate, demand, and data-driven insights.
        </p>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs tabs={FORECAST_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      {activeTab === "climate" && <ClimateForecasting />}
      {activeTab === "demand" && <DemandForecasting />}
      {activeTab === "insights" && (
        <div className="p-8 text-center text-gray-500 border rounded-xl bg-white shadow-sm">
          Forecast Insights are currently being generated.
        </div>
      )}
    </div>
  );
}
