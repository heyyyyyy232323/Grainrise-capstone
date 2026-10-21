import { useState } from "react";

import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import AnnouncementPublication from "./Announcements/AnnouncementPublication";
import AnnouncementManagement from "./Announcements/AnnouncementManagement";

const ANNOUNCEMENT_TABS = [
  { id: "create", label: "Create Announcement" },
  { id: "management", label: "Announcement Management" },
];

const Announcements = () => {
  const [activeTab, setActiveTab] = useState("create");

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Communication" },
          { label: "Announcement" },
        ]}
      />

      <div className="mb-6 mt-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Announcements
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Create, publish, and manage announcements for the GrainRise community.
        </p>
      </div>

      <Tabs
        tabs={ANNOUNCEMENT_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "create" ? (
        <AnnouncementPublication />
      ) : (
        <AnnouncementManagement />
      )}
    </>
  );
};

export default Announcements;
