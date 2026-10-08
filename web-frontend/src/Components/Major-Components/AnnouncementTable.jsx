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
        overflow-hidden
        rounded-xl
        border
        border-gray-200
        bg-white
      "
    >

      {/* HEADER */}

      <div
        className="
          border-b
          border-gray-200
          px-5
          py-4
        "
      >
        <h3
          className="
            text-sm
            font-bold
            text-gray-900
          "
        >
          Announcement Records
        </h3>

        <p
          className="
            mt-1
            text-xs
            text-gray-500
          "
        >
          View and manage published,
          draft, and archived
          announcements.
        </p>
      </div>


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
              text-sm
              font-semibold
              text-gray-700
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
              className="
                min-w-full
                divide-y
                divide-gray-200
              "
            >
              <thead
                className="
                  bg-gray-50
                "
              >
                <tr>

                  <th
                    className="
                      px-5
                      py-3
                      text-left
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-gray-500
                    "
                  >
                    Announcement
                  </th>

                  <th
                    className="
                      px-5
                      py-3
                      text-left
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-gray-500
                    "
                  >
                    Audience
                  </th>

                  <th
                    className="
                      px-5
                      py-3
                      text-left
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-gray-500
                    "
                  >
                    Status
                  </th>

                  <th
                    className="
                      px-5
                      py-3
                      text-left
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-gray-500
                    "
                  >
                    Date Published
                  </th>

                  <th
                    className="
                      px-5
                      py-3
                      text-right
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-gray-500
                    "
                  >
                    Actions
                  </th>
                </tr>
              </thead>


              <tbody
                className="
                  divide-y
                  divide-gray-100
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
                          transition
                          hover:bg-gray-50
                        "
                      >

                        {/* TITLE */}

                        <td
                          className="
                            px-5
                            py-4
                            align-top
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
                                text-sm
                                font-semibold
                                text-gray-900
                              "
                            >
                              {announcement?.title ||
                                "Untitled announcement"}
                            </p>

                            <p
                              className="
                                mt-1
                                text-xs
                                text-gray-400
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
                            px-5
                            py-4
                            align-top
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
                            px-5
                            py-4
                            align-top
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
                            px-5
                            py-4
                            align-top
                            text-sm
                            text-gray-600
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
                            px-5
                            py-4
                            align-top
                          "
                        >
                          <div
                            className="
                              flex
                              items-center
                              justify-end
                              gap-2
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
                                h-9
                                w-9
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
                                size={16}
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
                                  h-9
                                  w-9
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
                                  size={16}
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
                                  h-9
                                  w-9
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
                                  size={16}
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
                                  h-9
                                  w-9
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
                                  size={16}
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
                                  h-9
                                  w-9
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
                                  size={16}
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
