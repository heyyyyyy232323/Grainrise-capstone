import { useState } from "react";

import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../Components/Minor-Components/Tabs";
import { translations, useLanguagePreference } from "../../lib/translations";

import ClimateForecasting from "./ClimateForecasting";
import DemandForecasting from "./DemandForecasting";
import ForecastInsights from "./ForecastInsights";


export default function FarmerForecasting() {
  const [language] = useLanguagePreference();
  const t = translations[language]?.farmer ?? translations.en.farmer;

  const FORECAST_TABS = [
    {
      id: "climate",
      label: t.forecasting.tabs.climate,
    },
    {
      id: "demand",
      label: t.forecasting.tabs.demand,
    },
    {
      id: "insights",
      label: t.forecasting.tabs.insights,
    },
  ];

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
              label: t.sidebar.farm,
            },
            {
              label: t.forecasting.title,
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
          {t.forecasting.title}
        </h2>


        <p className="text-sm text-slate-500">
          {t.forecasting.subtitle}
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