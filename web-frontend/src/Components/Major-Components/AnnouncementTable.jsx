import React from "react";

import {
  Archive,
  Eye,
  FileEdit,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";


const getAudienceLabel = (value) => {
  const labels = {
    all: "All",
    miller: "Miller",
    warehouse: "Warehouse",
    retailer: "Retailer",
  };

  return (
    labels[value] ||
    value ||
    "—"
  );
};


const getStatusClasses = (status) => {
  switch (
    String(
      status || ""
    ).toLowerCase()
  ) {

    case "active":
      return (
        "border-green-200 bg-green-50 text-green-700"
      );

    case "draft":
      return (
        "border-yellow-200 bg-yellow-50 text-yellow-700"
      );

    case "archived":
      return (
        "border-orange-200 bg-orange-50 text-orange-700"
      );

    default:
      return (
        "border-gray-200 bg-gray-50 text-gray-600"
      );
  }
};


const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-PH",
      {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
      }
    ).format(
      new Date(value)
    );

  } catch {
    return value;
  }
};


const AnnouncementTable = ({
  announcements = [],
  loading = false,

  onView,
  onEdit,
  onArchive,
  onReactivate,
  onDelete,
}) => {

  return (
    <div
      className="
        dark-readable-table
        w-full
        overflow-hidden
        rounded-[14px]
        border
        border-slate-200
        bg-white
        shadow-[0_6px_18px_rgba(15,23,42,0.06)]
      "
    >

      {/* LOADING */}

      {loading && (
        <div
          className="
            flex
            min-h-[260px]
            flex-col
            items-center
            justify-center
            px-6
            text-center
          "
        >
          <Loader2
            size={26}
            className="
              animate-spin
              text-[#08511f]
            "
          />

          <p
            className="
              mt-3
              text-[13px]
              font-semibold
              text-slate-700
            "
          >
            Loading announcements...
          </p>
        </div>
      )}


      {/* EMPTY */}

      {!loading &&
        announcements.length === 0 && (
          <div
            className="
              flex
              min-h-[260px]
              flex-col
              items-center
              justify-center
              px-6
              text-center
            "
          >
            <p
              className="
                text-sm
                font-semibold
                text-gray-700
              "
            >
              No announcements found
            </p>

            <p
              className="
                mt-1
                text-xs
                text-gray-500
              "
            >
              Try changing the search
              or filter options.
            </p>
          </div>
        )}


      {/* TABLE */}

      {!loading &&
        announcements.length > 0 && (
          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="w-full border-collapse text-[13px]"
            >
              <thead
                className="
                  bg-[#EDEDED]
                "
              >
                <tr>

                  <th
                    className="
                      px-3
                      py-3
                      text-left
                      text-[11px]
                      font-bold
                      tracking-[0.03em]
                      text-slate-600
                      sm:px-4
                    "
                  >
                    Announcement
                  </th>

                  <th
                    className="
                      px-3
                      py-3
                      text-left
                      text-[11px]
                      font-bold
                      tracking-[0.03em]
                      text-slate-600
                      sm:px-4
                    "
                  >
                    Audience
                  </th>

                  <th
                    className="
                      px-3
                      py-3
                      text-left
                      text-[11px]
                      font-bold
                      tracking-[0.03em]
                      text-slate-600
                      sm:px-4
                    "
                  >
                    Status
                  </th>

                  <th
                    className="
                      px-3
                      py-3
                      text-left
                      text-[11px]
                      font-bold
                      tracking-[0.03em]
                      text-slate-600
                      sm:px-4
                    "
                  >
                    Date Published
                  </th>

                  <th
                    className="
                      px-3
                      py-3
                      text-right
                      text-[11px]
                      font-bold
                      tracking-[0.03em]
                      text-slate-600
                      sm:px-4
                    "
                  >
                    Actions
                  </th>
                </tr>
              </thead>


              <tbody
                className="
                  bg-white
                "
              >
                {announcements.map(
                  (
                    announcement
                  ) => {

                    const status =
                      String(
                        announcement?.status ||
                        ""
                      ).toLowerCase();


                    const isArchived =
                      status ===
                      "archived";


                    const canArchive =
                      status ===
                      "active";


                    const canEdit =
                      status !==
                      "archived";


                    return (
                      <tr
                        key={
                          announcement?.announcement_id
                        }
                        className="
                          border-b border-slate-100
                          transition
                          hover:bg-slate-50/70
                        "
                      >

                        {/* TITLE */}

                        <td
                          className="
                            px-3
                            py-3
                            align-top
                            sm:px-4
                          "
                        >
                          <div
                            className="
                              max-w-md
                            "
                          >
                            <p
                              className="
                                line-clamp-2
                                text-[13px]
                                font-semibold
                                text-slate-900
                              "
                            >
                              {announcement?.title ||
                                "Untitled announcement"}
                            </p>

                            <p
                              className="
                                mt-1
                                text-[11px]
                                text-slate-400
                              "
                            >
                              ID:{" "}
                              {announcement?.announcement_id ||
                                "—"}
                            </p>
                          </div>
                        </td>


                        {/* AUDIENCE */}

                        <td
                          className="
                            px-3
                            py-3
                            align-top
                            sm:px-4
                          "
                        >
                          <span
                            className="
                              inline-flex
                              rounded-full
                              border
                              border-gray-200
                              bg-gray-50
                              px-2.5
                              py-1
                              text-xs
                              font-semibold
                              text-gray-700
                            "
                          >
                            {getAudienceLabel(
                              announcement?.audience
                            )}
                          </span>
                        </td>


                        {/* STATUS */}

                        <td
                          className="
                            px-3
                            py-3
                            align-top
                            sm:px-4
                          "
                        >
                          <span
                            className={`
                              inline-flex
                              rounded-full
                              border
                              px-2.5
                              py-1
                              text-xs
                              font-semibold
                              capitalize
                              ${getStatusClasses(
                                status
                              )}
                            `}
                          >
                            {status ||
                              "unknown"}
                          </span>
                        </td>


                        {/* DATE */}

                        <td
                          className="
                            px-3
                            py-3
                            align-top
                            text-[13px]
                            text-slate-600
                            sm:px-4
                          "
                        >
                          {status === "draft"
                            ? "Not published"
                            : formatDate(
                                announcement?.date_published
                              )}
                        </td>


                        {/* ACTIONS */}

                        <td
                          className="
                            px-3
                            py-3
                            align-top
                            sm:px-4
                          "
                        >
                          <div
                            className="
                              flex
                              items-center
                              justify-end
                              gap-1.5
                            "
                          >

                            {/* VIEW */}

                            <button
                              type="button"
                              onClick={() =>
                                onView?.(
                                  announcement
                                )
                              }
                              title="View"
                              className="
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-gray-200
                                bg-white
                                text-gray-600
                                transition
                                hover:bg-gray-50
                                hover:text-gray-900
                              "
                            >
                              <Eye
                                size={14}
                              />
                            </button>


                            {/* EDIT */}

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() =>
                                  onEdit?.(
                                    announcement
                                  )
                                }
                                title="Edit"
                                className="
                                  flex
                                  h-8
                                  w-8
                                  items-center
                                  justify-center
                                  rounded-lg
                                  border
                                  border-gray-200
                                  bg-white
                                  text-[#08511f]
                                  transition
                                  hover:bg-green-50
                                "
                              >
                                <FileEdit
                                  size={14}
                                />
                              </button>
                            )}


                            {/* ARCHIVE */}

                            {canArchive && (
                              <button
                                type="button"
                                onClick={() =>
                                  onArchive?.(
                                    announcement
                                  )
                                }
                                title="Archive Announcement"
                                aria-label="Archive Announcement"
                                className="
                                  flex
                                  h-8
                                  w-8
                                  items-center
                                  justify-center
                                  rounded-lg
                                  border
                                  border-orange-200
                                  bg-orange-50
                                  text-orange-700
                                  transition
                                  hover:bg-orange-100
                                  hover:text-orange-800
                                "
                              >
                                <Archive
                                  size={14}
                                />
                              </button>
                            )}


                            {/* REACTIVATE */}

                            {isArchived && (
                              <button
                                type="button"
                                onClick={() =>
                                  onReactivate?.(
                                    announcement
                                  )
                                }
                                title="Reactivate Announcement"
                                aria-label="Reactivate Announcement"
                                className="
                                  flex
                                  h-8
                                  w-8
                                  items-center
                                  justify-center
                                  rounded-lg
                                  border
                                  border-green-200
                                  bg-green-50
                                  text-[#08511f]
                                  transition
                                  hover:bg-green-100
                                "
                              >
                                <RotateCcw
                                  size={14}
                                />
                              </button>
                            )}


                            {/* DELETE */}

                            {(status === "active" || status === "archived") && (
                              <button
                                type="button"
                                onClick={() =>
                                  onDelete?.(
                                    announcement
                                  )
                                }
                                title="Delete Announcement"
                                aria-label="Delete Announcement"
                                className="
                                  flex
                                  h-8
                                  w-8
                                  items-center
                                  justify-center
                                  rounded-lg
                                  border
                                  border-red-200
                                  bg-red-50
                                  text-red-600
                                  transition
                                  hover:bg-red-100
                                  hover:text-red-700
                                "
                              >
                                <Trash2
                                  size={14}
                                />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
};


export default AnnouncementTable;
