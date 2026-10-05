import {
  useState,
} from "react";

import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";

import AnnouncementPublication from "./Announcements/AnnouncementPublication";
import AnnouncementManagement from "./Announcements/AnnouncementManagement";


const Announcements = () => {

  const [
    segment,
    setSegment,
  ] = useState(
    "publication"
  );


  return (
    <>
      <Breadcrumbs
        items={[
          {
            label:
              "Communication",
          },
          {
            label:
              "Announcements",
          },
        ]}
      />


      {/* HEADER */}

      <div
        className="
          mb-6
          mt-4
        "
      >
        <h1
          className="
            text-3xl
            font-bold
            text-gray-900
          "
        >
          Announcements
        </h1>

        <p
          className="
            mt-1
            text-sm
            text-gray-500
          "
        >
          Create, publish, and manage
          GrainRise announcements for
          millers, warehouses, and retailers.
        </p>
      </div>


      {/* TABS */}

      <div
        className="
          mb-6
          border-b
          border-gray-200
        "
      >
        <div
          className="
            flex
            gap-7
          "
        >
          <button
            type="button"
            onClick={() =>
              setSegment(
                "publication"
              )
            }
            className={`
              border-b-2
              pb-3
              text-sm
              font-semibold
              transition-colors

              ${
                segment ===
                "publication"
                  ? "border-[#08511f] text-[#08511f]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }
            `}
          >
            Announcement Publication
          </button>


          <button
            type="button"
            onClick={() =>
              setSegment(
                "management"
              )
            }
            className={`
              border-b-2
              pb-3
              text-sm
              font-semibold
              transition-colors

              ${
                segment ===
                "management"
                  ? "border-[#08511f] text-[#08511f]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }
            `}
          >
            Manage Announcements
          </button>
        </div>
      </div>


      {/* CONTENT */}

      {segment ===
        "publication" ? (
        <AnnouncementPublication />
      ) : (
        <AnnouncementManagement />
      )}
    </>
  );
};


export default Announcements;