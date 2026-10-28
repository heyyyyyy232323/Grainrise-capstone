import {
  useState,
} from "react";

import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../Components/Minor-Components/Tabs";

import FarmerContractsApplications from "./FarmerContractsApplications";
import FarmerContractsOffers from "./FarmerContractsOffers";
import FarmerContractsOpportunities from "./FarmerContractsOpportunities";
import FarmerContractsCurrent from "./FarmerContractsCurrent";


// ============================================================
// TABS
// ============================================================

const CONTRACT_TABS = [
  {
    id: "applications",
    label: "Applications",
  },
  {
    id: "offers",
    label: "Offers",
  },
  {
    id: "opportunities",
    label: "Opportunities",
  },
  {
    id: "current",
    label: "Current Contracts",
  },
];


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerContracts() {
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
                "Business",
            },
            {
              label:
                "Contracts",
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
          Contracts
        </h2>


        <p
          className="
            text-sm
            text-slate-500
          "
        >
          Manage your contracts and related activities in one place.
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
