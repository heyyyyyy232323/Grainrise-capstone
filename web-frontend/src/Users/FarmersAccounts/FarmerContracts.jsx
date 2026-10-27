import {
  useState,
} from "react";

import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../Components/Minor-Components/Tabs";

import FarmerContractsApplications from "./FarmerContractsApplications";
import FarmerContractsOffers from "./FarmerContractsOffers";
import FarmerContractsOpportunities from "./FarmerContractsOpportunities";
import FarmerContractsCurrent from "./FarmerContractsCurrent";
import FarmerContractsMessages from "./FarmerContractsMessages";


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
  {
    id: "messages",
    label: "Messages",
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
  // MESSAGE TARGET
  //
  // Used when the Farmer clicks:
  //
  // - Message Miller from Application
  // - Message Miller from Offer
  // - Message Miller from Opportunity
  // - Message Miller from Current Contract
  //
  // The target is passed to FarmerContractsMessages so the
  // correct Miller + transaction conversation opens.
  // ==========================================================

  const [
    messageTarget,
    setMessageTarget,
  ] = useState(
    null
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


      // If the Farmer manually changes tabs,
      // remove any previously requested
      // conversation target.
      setMessageTarget(
        null
      );
    };


  // ==========================================================
  // OPEN MESSAGE CONVERSATION
  // ==========================================================

  const handleOpenMessages =
    (
      target
    ) => {
      if (!target) {
        return;
      }


      const supplierProfileId =
        target.supplierProfileId
        ??
        target.supplier_profile_id;


      const referenceType =
        target.referenceType
        ??
        target.reference_type;


      const referenceId =
        target.referenceId
        ??
        target.reference_id;


      if (
        !supplierProfileId
        ||
        !referenceType
        ||
        !referenceId
      ) {
        return;
      }


      setMessageTarget({
        supplier_profile_id:
          supplierProfileId,

        reference_type:
          referenceType,

        reference_id:
          referenceId,

        // Optional information.
        // Existing buttons do not need to provide these,
        // but FarmerContractsMessages can use them when
        // available.
        miller_name:
          target.millerName
          ??
          target.miller_name
          ??
          null,

        business_name:
          target.businessName
          ??
          target.business_name
          ??
          null,

        reference_code:
          target.referenceCode
          ??
          target.reference_code
          ??
          null,
      });


      setActiveTab(
        "messages"
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
        <FarmerContractsApplications
          onMessage={
            handleOpenMessages
          }
        />
      )}


      {/* ====================================================
          OFFERS
      ==================================================== */}

      {activeTab ===
        "offers" && (
        <FarmerContractsOffers
          onMessage={
            handleOpenMessages
          }
        />
      )}


      {/* ====================================================
          OPPORTUNITIES
      ==================================================== */}

      {activeTab ===
        "opportunities" && (
        <FarmerContractsOpportunities
          onMessage={
            handleOpenMessages
          }
        />
      )}


      {/* ====================================================
          CURRENT CONTRACTS
      ==================================================== */}

      {activeTab ===
        "current" && (
        <FarmerContractsCurrent
          onMessage={
            handleOpenMessages
          }
        />
      )}


      {/* ====================================================
          MESSAGES
      ==================================================== */}

      {activeTab ===
        "messages" && (
        <FarmerContractsMessages
          initialConversation={
            messageTarget
          }
        />
      )}

    </div>
  );
}