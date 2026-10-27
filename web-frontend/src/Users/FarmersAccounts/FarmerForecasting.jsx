import { useState } from "react";

import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../Components/Minor-Components/Tabs";

import ClimateForecasting from "./ClimateForecasting";
import DemandForecasting from "./DemandForecasting";
import ForecastInsights from "./ForecastInsights";


const FORECAST_TABS = [
  {
    id: "climate",
    label: "Climate Forecasting",
  },
  {
    id: "demand",
    label: "Demand Forecasting",
  },
  {
    id: "insights",
    label: "Forecast Insights",
  },
];


export default function FarmerForecasting() {

  const [
    activeTab,
    setActiveTab,
  ] = useState("demand");


  return (
    <div className="space-y-6">

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div className="space-y-1">

        <Breadcrumbs
          items={[
            {
              label: "Farm",
            },
            {
              label: "Forecasting",
            },
          ]}
        />


        <h2
          className="
            text-[clamp(2rem,3vw,2.5rem)]
            font-extrabold
            tracking-[-0.03em]
            text-slate-900
          "
        >
          Forecasting
        </h2>


        <p className="text-sm text-slate-500">
          Make informed farming decisions using climate, demand,
          and data-driven insights.
        </p>

      </div>


      {/* =====================================================
          FORECASTING TABS
      ====================================================== */}

      <Tabs
        tabs={FORECAST_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />


      {/* =====================================================
          TAB CONTENT
      ====================================================== */}

      {activeTab === "climate" && (
        <ClimateForecasting />
      )}


      {activeTab === "demand" && (
        <DemandForecasting />
      )}


      {activeTab === "insights" && (
        <ForecastInsights />
      )}

    </div>
  );
}