import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import AnnouncementPublication from "./Announcements/AnnouncementPublication";

const Announcements = () => {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Communication" },
          { label: "Announcement" },
        ]}
      />

      <AnnouncementPublication />
    </>
  );
};

export default Announcements;
