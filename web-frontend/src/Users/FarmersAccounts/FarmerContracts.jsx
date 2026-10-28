import {
  useState,
} from "react";

import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../Components/Minor-Components/Tabs";
import { translations, useLanguagePreference } from "../../lib/translations";

import FarmerContractsApplications from "./FarmerContractsApplications";
import FarmerContractsOffers from "./FarmerContractsOffers";
import FarmerContractsOpportunities from "./FarmerContractsOpportunities";
import FarmerContractsCurrent from "./FarmerContractsCurrent";


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerContracts() {
  const [language] = useLanguagePreference();
  const t = translations[language]?.farmer ?? translations.en.farmer;

  const CONTRACT_TABS = [
    {
      id: "applications",
      label: t.contracts.tabs.applications,
    },
    {
      id: "offers",
      label: t.contracts.tabs.offers,
    },
    {
      id: "opportunities",
      label: t.contracts.tabs.opportunities,
    },
    {
      id: "current",
      label: t.contracts.tabs.current,
    },
  ];

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "applications"
  );


  // ==========================================================
  // NORMAL TAB CHANGE
  // ==========================================================

  const handleTabChange =
    (
      tabId
    ) => {
      setActiveTab(
        tabId
      );
    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        space-y-6
      "
    >

      {/* ====================================================
          PAGE HEADER
      ==================================================== */}

      <div
        className="
          space-y-1
        "
      >
        <Breadcrumbs
          items={[
            {
              label:
                t.sidebar.business,
            },
            {
              label:
                t.contracts.title,
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
          {t.contracts.title}
        </h2>


        <p
          className="
            text-sm
            text-slate-500
          "
        >
          {t.contracts.subtitle}
        </p>
      </div>


      {/* ====================================================
          TABS
      ==================================================== */}

      <Tabs
        tabs={
          CONTRACT_TABS
        }
        activeTab={
          activeTab
        }
        onTabChange={
          handleTabChange
        }
      />


      {/* ====================================================
          APPLICATIONS
      ==================================================== */}

      {activeTab ===
        "applications" && (
        <FarmerContractsApplications />
      )}


      {/* ====================================================
          OFFERS
      ==================================================== */}

      {activeTab ===
        "offers" && (
        <FarmerContractsOffers />
      )}


      {/* ====================================================
          OPPORTUNITIES
      ==================================================== */}

      {activeTab ===
        "opportunities" && (
        <FarmerContractsOpportunities />
      )}


      {/* ====================================================
          CURRENT CONTRACTS
      ==================================================== */}

      {activeTab ===
        "current" && (
        <FarmerContractsCurrent />
      )}

    </div>
  );
}
