import { useState } from "react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../Components/Minor-Components/Tabs";
import FarmerContractsApplications from "./FarmerContractsApplications";
import FarmerContractsOffers from "./FarmerContractsOffers";
import FarmerContractsOpportunities from "./FarmerContractsOpportunities";
import FarmerContractsCurrent from "./FarmerContractsCurrent";
import FarmerContractsMessages from "./FarmerContractsMessages";

const CONTRACT_TABS = [
  { id: "applications", label: "Applications" },
  { id: "offers", label: "Offers" },
  { id: "opportunities", label: "Opportunities" },
  { id: "current", label: "Current Contracts" },
  { id: "messages", label: "Messages" },
];

export default function FarmerContracts() {
  const [activeTab, setActiveTab] = useState("applications");

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Business" }, { label: "Contracts" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Contracts
        </h2>
        <p className="text-sm text-slate-500">
          Manage your contracts and related activities in one place.
        </p>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs tabs={CONTRACT_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      {activeTab === "applications" && <FarmerContractsApplications />}
      {activeTab === "offers" && <FarmerContractsOffers />}
      {activeTab === "opportunities" && <FarmerContractsOpportunities />}
      {activeTab === "current" && <FarmerContractsCurrent />}
      {activeTab === "messages" && <FarmerContractsMessages />}
    </div>
  );
}
