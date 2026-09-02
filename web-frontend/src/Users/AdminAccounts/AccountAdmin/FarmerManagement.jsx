import {
  useMemo,
  useState,
} from "react";

import {
  Search,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";

import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import CustomAmberButton from "../../../Components/Minor-Components/CustomAmberButton";
import CustomRedButton from "../../../Components/Minor-Components/CustomRedButton";

import Toast from "../../../Components/Minor-Components/Toast";

import FarmerReviewModal from "../../../Components/Modals/FarmerReviewModal";
import FarmerDetailsModal from "../../../Components/Modals/FarmerDetailsModal";

import ArchiveAccountModal from "../../../Components/Modals/ArchiveAccountModal";
import AccountActionConfirmModal from "../../../Components/Modals/AccountActionConfirmModal";

import useToast from "../../../Components/hooks/useToast";

import useFarmerManagement from "../../../Components/hooks/AccountAdmin/useFarmerManagement";

// ============================================================
// CONSTANTS
// ============================================================

const ITEMS_PER_PAGE = 10;


const TAB_BADGE_STYLES = {
  "to-review":
    "bg-amber-400 text-white",

  active:
    "bg-emerald-500 text-white",

  inactive:
    "bg-rose-500 text-white",
};


const TABS = [
  {
    id: "to-review",
    label: "To Review",
  },

  {
    id: "active",
    label: "Active",
  },

  {
    id: "inactive",
    label: "Inactive",
  },
];


const SORT_OPTIONS = [
  {
    value: "name-asc",
    label: "Farmer (A-Z)",
  },

  {
    value: "name-desc",
    label: "Farmer (Z-A)",
  },

  {
    value: "newest",
    label: "Newest",
  },

  {
    value: "oldest",
    label: "Oldest",
  },

  {
    value: "farms-desc",
    label: "Most Farms",
  },
];


// ============================================================
// HELPERS
// ============================================================

const displayValue = (
  value,
  fallback = "—"
) => {
  const cleaned =
    String(
      value ?? ""
    ).trim();

  return cleaned || fallback;
};


const formatStatus = (
  value
) => {
  const cleaned =
    String(
      value || ""
    )
      .trim()
      .replace(
        /_/g,
        " "
      )
      .replace(
        /-/g,
        " "
      );

  if (!cleaned) {
    return "—";
  }


  return cleaned
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};


const formatFarmCount = (
  value
) => {
  const count =
    Number(
      value || 0
    );

  if (
    Number.isNaN(
      count
    )
  ) {
    return "0";
  }

  return count.toLocaleString();
};


// ============================================================
// FARMER MANAGEMENT
// ============================================================

const FarmerManagement = () => {
  const navigate =
    useNavigate();


  // =========================================================
  // API
  // =========================================================

  const {
    activeTab,
    changeTab,

    farmers,
    counts,

    isLoading,
    isLoadingDetails,

    isConfirming,
    isArchiving,
    isRestoring,
    isDeleting,

    error,

    getFarmerDetails,

    confirmFarmer,
    archiveFarmer,
    restoreFarmer,
    deleteFarmer,
  } = useFarmerManagement();


  // =========================================================
  // PAGE STATE
  // =========================================================

  const [
    currentPage,
    setCurrentPage,
  ] = useState(
    1
  );


  const [
    searchQuery,
    setSearchQuery,
  ] = useState(
    ""
  );


  const [
    sortBy,
    setSortBy,
  ] = useState(
    "name-asc"
  );


  // =========================================================
  // TOAST
  // =========================================================

  const {
    toasts,
    showToast,
    removeToast,
  } = useToast();


  // =========================================================
  // SELECTED FARMER
  // =========================================================

  const [
    selectedFarmer,
    setSelectedFarmer,
  ] = useState(
    null
  );


  const [
    selectedFarmerDetails,
    setSelectedFarmerDetails,
  ] = useState(
    null
  );


  // =========================================================
  // MODALS
  // =========================================================

  const [
    reviewModal,
    setReviewModal,
  ] = useState(
    false
  );


  const [
    detailsModal,
    setDetailsModal,
  ] = useState(
    false
  );


  const [
    archiveModal,
    setArchiveModal,
  ] = useState(
    false
  );


  const [
    restoreModal,
    setRestoreModal,
  ] = useState(
    false
  );


  const [
    deleteModal,
    setDeleteModal,
  ] = useState(
    false
  );


  // =========================================================
  // REVIEW FARMER APPLICATION
  // =========================================================

  const handleReview =
    async (
      row
    ) => {
      setSelectedFarmer(
        row
      );

      setSelectedFarmerDetails(
        null
      );

      setReviewModal(
        true
      );


      try {
        const details =
          await getFarmerDetails(
            row.id
          );


        setSelectedFarmerDetails(
          details
        );

      } catch (
        requestError
      ) {
        setReviewModal(
          false
        );

        setSelectedFarmer(
          null
        );

        setSelectedFarmerDetails(
          null
        );


        showToast({
          type:
            "error",

          title:
            "Unable to Load Application",

          message:
            requestError?.message ||
            "The Farmer application details could not be loaded.",

          duration:
            5000,
        });
      }
    };


  const closeReviewModal =
    () => {
      if (
        isConfirming
      ) {
        return;
      }


      setReviewModal(
        false
      );

      setSelectedFarmer(
        null
      );

      setSelectedFarmerDetails(
        null
      );
    };


  // =========================================================
  // CONFIRM FARMER
  // =========================================================

  const handleConfirmApplication =
    async () => {
      const userId =
        selectedFarmerDetails
          ?.user_id ||
        selectedFarmer
          ?.id;


      if (!userId) {
        showToast({
          type:
            "error",

          title:
            "Confirmation Failed",

          message:
            "The Farmer account could not be identified.",

          duration:
            4500,
        });

        return;
      }


      try {
        const response =
          await confirmFarmer(
            userId
          );


        const result =
          response?.data ||
          {};


        setReviewModal(
          false
        );

        setSelectedFarmer(
          null
        );

        setSelectedFarmerDetails(
          null
        );


        if (
          result.email_sent
        ) {
          showToast({
            type:
              "success",

            title:
              "Farmer Application Confirmed",

            message:
              "The Farmer account is now active and the confirmation email was sent successfully.",

            duration:
              5000,
          });

          return;
        }


        showToast({
          type:
            "warning",

          title:
            "Account Activated",

          message:
            "The Farmer account is active, but the confirmation email could not be sent.",

          duration:
            6000,
        });

      } catch (
        requestError
      ) {
        showToast({
          type:
            "error",

          title:
            "Confirmation Failed",

          message:
            requestError?.message ||
            "The Farmer application could not be confirmed.",

          duration:
            5500,
        });
      }
    };


  // =========================================================
  // MESSAGE FARMER
  // =========================================================

  const handleMessage =
    () => {
      const account =
        selectedFarmerDetails
          ?.account_information;


      const personal =
        selectedFarmerDetails
          ?.personal_information;


      navigate(
        "/admin/email-users",
        {
          state: {
            recipient: {
              userId:
                selectedFarmerDetails
                  ?.user_id ||
                selectedFarmer
                  ?.id,

              email:
                account?.email ||
                selectedFarmer
                  ?.email ||
                "",

              firstName:
                personal
                  ?.first_name ||
                "",

              lastName:
                personal
                  ?.last_name ||
                "",

              source:
                "farmer-management",
            },
          },
        }
      );
    };


  // =========================================================
  // VIEW FARMER DETAILS
  // =========================================================

  const handleViewDetails =
    async (
      row
    ) => {
      setSelectedFarmer(
        row
      );

      setSelectedFarmerDetails(
        null
      );

      setDetailsModal(
        true
      );


      try {
        const details =
          await getFarmerDetails(
            row.id
          );


        setSelectedFarmerDetails(
          details
        );

      } catch (
        requestError
      ) {
        setDetailsModal(
          false
        );

        setSelectedFarmer(
          null
        );

        setSelectedFarmerDetails(
          null
        );


        showToast({
          type:
            "error",

          title:
            "Unable to Load Farmer",

          message:
            requestError?.message ||
            "The Farmer details could not be loaded.",

          duration:
            5000,
        });
      }
    };


  const closeDetailsModal =
    () => {
      setDetailsModal(
        false
      );

      setSelectedFarmer(
        null
      );

      setSelectedFarmerDetails(
        null
      );
    };


  // =========================================================
  // ARCHIVE FARMER
  // =========================================================

  const handleArchive =
    (
      row
    ) => {
      setSelectedFarmer(
        row
      );

      setArchiveModal(
        true
      );
    };


  const confirmArchive =
    async (
      reason
    ) => {
      if (
        !selectedFarmer
          ?.id
      ) {
        return;
      }


      try {
        await archiveFarmer(
          selectedFarmer.id,
          reason
        );


        setArchiveModal(
          false
        );

        setSelectedFarmer(
          null
        );


        showToast({
          type:
            "success",

          title:
            "Farmer Account Archived",

          message:
            "The Farmer account was archived successfully.",

          duration:
            5000,
        });

      } catch (
        requestError
      ) {
        showToast({
          type:
            "error",

          title:
            "Archive Failed",

          message:
            requestError?.message ||
            "The Farmer account could not be archived.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // RESTORE FARMER
  // =========================================================

  const handleRestore =
    (
      row
    ) => {
      setSelectedFarmer(
        row
      );

      setRestoreModal(
        true
      );
    };


  const confirmRestore =
    async () => {
      if (
        !selectedFarmer
          ?.id
      ) {
        return;
      }


      try {
        await restoreFarmer(
          selectedFarmer.id
        );


        setRestoreModal(
          false
        );

        setSelectedFarmer(
          null
        );


        showToast({
          type:
            "success",

          title:
            "Farmer Account Restored",

          message:
            "The Farmer account is active again.",

          duration:
            5000,
        });

      } catch (
        requestError
      ) {
        showToast({
          type:
            "error",

          title:
            "Restore Failed",

          message:
            requestError?.message ||
            "The Farmer account could not be restored.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // DELETE FARMER
  // =========================================================

  const handleDelete =
    (
      row
    ) => {
      setSelectedFarmer(
        row
      );

      setDeleteModal(
        true
      );
    };


  const confirmDelete =
    async () => {
      if (
        !selectedFarmer
          ?.id
      ) {
        return;
      }


      try {
        await deleteFarmer(
          selectedFarmer.id
        );


        setDeleteModal(
          false
        );

        setSelectedFarmer(
          null
        );


        showToast({
          type:
            "success",

          title:
            "Farmer Account Deleted",

          message:
            "The Farmer account was permanently deleted.",

          duration:
            5000,
        });

      } catch (
        requestError
      ) {
        showToast({
          type:
            "error",

          title:
            "Delete Failed",

          message:
            requestError?.message ||
            "The Farmer account could not be permanently deleted.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // TABLE COLUMNS
  // =========================================================

  const columns =
    useMemo(
      () => {
        // ====================================================
        // INACTIVE
        // ====================================================

        if (
          activeTab ===
          "inactive"
        ) {
          return [
            {
              key:
                "farmer",

              label:
                "Farmer Name",

              width:
                "18%",
            },

            {
              key:
                "email",

              label:
                "Email",

              width:
                "19%",
            },

            {
              key:
                "contact",

              label:
                "Contact",

              width:
                "14%",

              render:
                (
                  row
                ) =>
                  displayValue(
                    row?.contact
                  ),
            },

            {
              key:
                "status",

              label:
                "Status",

              width:
                "11%",

              render:
                (
                  row
                ) => (
                  <span
                    className="
                      inline-flex
                      rounded-full
                      border
                      border-rose-200
                      bg-rose-50
                      px-2.5
                      py-1
                      text-[10px]
                      font-semibold
                      text-rose-700
                    "
                  >
                    {
                      formatStatus(
                        row?.status
                      )
                    }
                  </span>
                ),
            },

            {
              key:
                "archiveReason",

              label:
                "Archive Reason",

              width:
                "18%",

              render:
                (
                  row
                ) =>
                  displayValue(
                    row?.archiveReason,
                    "No reason recorded"
                  ),
            },

            {
              key:
                "action",

              label:
                "Action",

              width:
                "20%",

              cellClassName:
                "text-center",

              render:
                (
                  row
                ) => (
                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      justify-center
                      gap-2
                    "
                  >
                    <button
                      type="button"
                      className="
                        whitespace-nowrap
                        rounded-lg
                        border
                        border-slate-300
                        px-3
                        py-1.5
                        text-[11px]
                        font-semibold
                        text-slate-500
                        transition
                        hover:border-emerald-300
                        hover:text-emerald-700
                        cursor-pointer
                      "
                      onClick={() =>
                        handleViewDetails(
                          row
                        )
                      }
                    >
                      View Details
                    </button>


                    <CustomGreenButton
                      text="Restore"
                      className="
                        px-3
                        py-1.5
                        text-[11px]
                        rounded-lg
                      "
                      onClick={() =>
                        handleRestore(
                          row
                        )
                      }
                    />


                    <CustomRedButton
                      text="Delete"
                      className="
                        px-3
                        py-1.5
                        text-[11px]
                        rounded-lg
                      "
                      onClick={() =>
                        handleDelete(
                          row
                        )
                      }
                    />
                  </div>
                ),
            },
          ];
        }


        // ====================================================
        // TO REVIEW + ACTIVE
        // ====================================================

        return [
          {
            key:
              "farmer",

            label:
              "Farmer Name",

            width:
              "22%",

            render:
              (
                row
              ) =>
                displayValue(
                  row?.farmer,
                  "Unnamed Farmer"
                ),
          },

          {
            key:
              "email",

            label:
              "Email",

            width:
              "21%",

            render:
              (
                row
              ) =>
                displayValue(
                  row?.email
                ),
          },

          {
            key:
              "contact",

            label:
              "Contact",

            width:
              "15%",

            render:
              (
                row
              ) =>
                displayValue(
                  row?.contact
                ),
          },

          {
            key:
              "rsbsaNumber",

            label:
              "RSBSA Number",

            width:
              "18%",

            render:
              (
                row
              ) =>
                displayValue(
                  row?.rsbsaNumber,
                  "Not provided"
                ),
          },

          {
            key:
              "farmCount",

            label:
              "Farms",

            width:
              "8%",

            cellClassName:
              "text-center",

            render:
              (
                row
              ) =>
                formatFarmCount(
                  row?.farmCount
                ),
          },

          {
            key:
              "action",

            label:
              "Action",

            width:
              "16%",

            cellClassName:
              "text-center",

            render:
              (
                row
              ) => {
                if (
                  activeTab ===
                  "to-review"
                ) {
                  return (
                    <div
                      className="
                        flex
                        justify-center
                      "
                    >
                      <CustomAmberButton
                        text="Review"
                        className="
                          px-3
                          py-1.5
                          text-[11px]
                          rounded-lg
                        "
                        onClick={() =>
                          handleReview(
                            row
                          )
                        }
                      />
                    </div>
                  );
                }


                if (
                  activeTab ===
                  "active"
                ) {
                  return (
                    <div
                      className="
                        flex
                        items-center
                        justify-center
                        gap-2
                      "
                    >
                      <button
                        type="button"
                        className="
                          whitespace-nowrap
                          rounded-lg
                          border
                          border-slate-300
                          px-3
                          py-1.5
                          text-[11px]
                          font-semibold
                          text-slate-500
                          transition
                          hover:border-emerald-300
                          hover:text-emerald-700
                          cursor-pointer
                        "
                        onClick={() =>
                          handleViewDetails(
                            row
                          )
                        }
                      >
                        View Details
                      </button>


                      <CustomAmberButton
                        text="Archive"
                        className="
                          whitespace-nowrap
                          px-3
                          py-1.5
                          text-[11px]
                          rounded-lg
                        "
                        onClick={() =>
                          handleArchive(
                            row
                          )
                        }
                      />
                    </div>
                  );
                }


                return null;
              },
          },
        ];
      },
      [
        activeTab,
      ]
    );


  // =========================================================
  // FILTER + SORT
  // =========================================================

  const filteredRows =
    useMemo(
      () => {
        const query =
          searchQuery
            .trim()
            .toLowerCase();


        const list =
          farmers.filter(
            (
              row
            ) => {
              if (!query) {
                return true;
              }


              return (
                String(
                  row?.farmer ||
                  ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  ) ||

                String(
                  row?.email ||
                  ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  ) ||

                String(
                  row?.contact ||
                  ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  ) ||

                String(
                  row?.rsbsaNumber ||
                  ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  )
              );
            }
          );


        const sorted = [
          ...list,
        ];


        if (
          sortBy ===
          "name-asc"
        ) {
          sorted.sort(
            (
              a,
              b
            ) =>
              String(
                a?.farmer ||
                ""
              ).localeCompare(
                String(
                  b?.farmer ||
                  ""
                )
              )
          );
        }


        if (
          sortBy ===
          "name-desc"
        ) {
          sorted.sort(
            (
              a,
              b
            ) =>
              String(
                b?.farmer ||
                ""
              ).localeCompare(
                String(
                  a?.farmer ||
                  ""
                )
              )
          );
        }


        if (
          sortBy ===
          "newest"
        ) {
          sorted.sort(
            (
              a,
              b
            ) =>
              new Date(
                b?.joined ||
                0
              ).getTime() -
              new Date(
                a?.joined ||
                0
              ).getTime()
          );
        }


        if (
          sortBy ===
          "oldest"
        ) {
          sorted.sort(
            (
              a,
              b
            ) =>
              new Date(
                a?.joined ||
                0
              ).getTime() -
              new Date(
                b?.joined ||
                0
              ).getTime()
          );
        }


        if (
          sortBy ===
          "farms-desc"
        ) {
          sorted.sort(
            (
              a,
              b
            ) =>
              Number(
                b?.farmCount ||
                0
              ) -
              Number(
                a?.farmCount ||
                0
              )
          );
        }


        return sorted;
      },
      [
        farmers,
        searchQuery,
        sortBy,
      ]
    );


  // =========================================================
  // PAGINATION
  // =========================================================

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredRows.length /
        ITEMS_PER_PAGE
      )
    );


  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );


  const paginatedRows =
    useMemo(
      () => {
        const startIndex =
          (
            safeCurrentPage -
            1
          ) *
          ITEMS_PER_PAGE;


        return filteredRows.slice(
          startIndex,
          startIndex +
          ITEMS_PER_PAGE
        );
      },
      [
        filteredRows,
        safeCurrentPage,
      ]
    );


  const sections =
    useMemo(
      () => [
        {
          rows:
            paginatedRows,
        },
      ],
      [
        paginatedRows,
      ]
    );


  const firstVisible =
    filteredRows.length ===
    0
      ? 0
      : (
          safeCurrentPage -
          1
        ) *
          ITEMS_PER_PAGE +
        1;


  const lastVisible =
    filteredRows.length ===
    0
      ? 0
      : Math.min(
          safeCurrentPage *
          ITEMS_PER_PAGE,
          filteredRows.length
        );


  // =========================================================
  // TAB COUNTS
  // =========================================================

  const tabsWithCounts =
    TABS.map(
      (
        tab
      ) => ({
        ...tab,

        label: (
          <>
            <span>
              {tab.label}
            </span>

            <span
              className={`
                ml-2
                inline-flex
                items-center
                justify-center
                rounded-full
                px-2
                py-0.5
                text-xs
                font-semibold
                ${
                  TAB_BADGE_STYLES[
                    tab.id
                  ]
                }
              `}
            >
              {
                tab.id ===
                "to-review"
                  ? counts
                      ?.to_review ||
                    0

                  : tab.id ===
                    "active"
                    ? counts
                        ?.active ||
                      0

                    : counts
                        ?.inactive ||
                      0
              }
            </span>
          </>
        ),
      })
    );


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      {/* =====================================================
          TOAST
      ===================================================== */}

      <Toast
        toasts={
          toasts
        }
        removeToast={
          removeToast
        }
      />


      {/* =====================================================
          BREADCRUMBS
      ===================================================== */}

      <Breadcrumbs
        items={[
          {
            label:
              "Management",

            path:
              "/admin/dashboard",
          },

          {
            label:
              "Farmer Management",
          },
        ]}
      />


      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="
          mt-4
          mb-6
        "
      >
        <h1
          className="
            text-2xl
            md:text-3xl
            font-bold
            text-gray-900
          "
        >
          Farmer Management
        </h1>

        <p
          className="
            mt-1
            text-sm
            text-gray-500
          "
        >
          Manage Farmer applications, account status, RSBSA compliance, farms, and account information.
        </p>
      </div>


      {/* =====================================================
          TABS
      ===================================================== */}

      <Tabs
        tabs={
          tabsWithCounts
        }
        activeTab={
          activeTab
        }
        onTabChange={(
          tabId
        ) => {
          changeTab(
            tabId
          );

          setCurrentPage(
            1
          );

          setSearchQuery(
            ""
          );
        }}
      />


      {/* =====================================================
          SEARCH + SORT
      ===================================================== */}

      <div
        className="
          mb-4
          flex
          flex-wrap
          items-center
          gap-3
        "
      >
        <div
          className="
            w-full
            max-w-sm
          "
        >
          <div
            className="
              relative
            "
          >
            <div
              className="
                pointer-events-none
                absolute
                inset-y-0
                left-0
                flex
                items-center
                pl-3
              "
            >
              <Search
                size={16}
                className="
                  text-gray-400
                "
              />
            </div>


            <input
              type="text"
              value={
                searchQuery
              }
              onChange={(
                event
              ) => {
                setSearchQuery(
                  event.target.value
                );

                setCurrentPage(
                  1
                );
              }}
              placeholder="Search Farmer, email, contact, or RSBSA"
              className="
                block
                w-full
                rounded-lg
                border
                border-gray-200
                bg-white
                py-2
                pl-10
                pr-3
                text-sm
                text-gray-700
                placeholder-gray-400
                focus:border-emerald-500
                focus:outline-none
                focus:ring-1
                focus:ring-emerald-500
              "
            />
          </div>
        </div>


        <div>
          <SortByDropdown
            options={
              SORT_OPTIONS
            }
            value={
              sortBy
            }
            onChange={(
              value
            ) => {
              setSortBy(
                value
              );

              setCurrentPage(
                1
              );
            }}
          />
        </div>
      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {
        error &&
        !isLoading && (
          <div
            className="
              mb-4
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
            "
          >
            <p
              className="
                text-sm
                font-semibold
                text-red-700
              "
            >
              Unable to load Farmer Management.
            </p>

            <p
              className="
                mt-1
                text-xs
                text-red-600
              "
            >
              {error}
            </p>
          </div>
        )
      }


      {/* =====================================================
          LOADING / TABLE
      ===================================================== */}

      {
        isLoading ? (
          <div
            className="
              flex
              min-h-[320px]
              items-center
              justify-center
              rounded-2xl
              border
              border-gray-200
              bg-white
            "
          >
            <div
              className="
                text-center
              "
            >
              <div
                className="
                  mx-auto
                  mb-3
                  h-8
                  w-8
                  animate-spin
                  rounded-full
                  border-4
                  border-gray-200
                  border-t-[#08511f]
                "
              />

              <p
                className="
                  text-sm
                  font-semibold
                  text-gray-700
                "
              >
                Loading Farmer accounts...
              </p>
            </div>
          </div>
        ) : (
          <SectionedTableCard
            columns={
              columns
            }
            sections={
              sections
            }
            currentPage={
              safeCurrentPage
            }
            totalPages={
              totalPages
            }
            onPageChange={(
              page
            ) =>
              setCurrentPage(
                page
              )
            }
            footerLabel={
              `Showing ${firstVisible}-${lastVisible} of ${filteredRows.length} Farmers`
            }
          />
        )
      }


      {/* =====================================================
          REVIEW FARMER
      ===================================================== */}

      <FarmerReviewModal
        isOpen={
          reviewModal
        }
        onClose={
          closeReviewModal
        }
        farmer={
          selectedFarmerDetails
        }
        isLoading={
          isLoadingDetails
        }
        isConfirming={
          isConfirming
        }
        onMessage={
          handleMessage
        }
        onConfirm={
          handleConfirmApplication
        }
      />


      {/* =====================================================
          FARMER DETAILS
      ===================================================== */}

      <FarmerDetailsModal
        isOpen={
          detailsModal
        }
        onClose={
          closeDetailsModal
        }
        farmer={
          selectedFarmerDetails
        }
        isLoading={
          isLoadingDetails
        }
      />


      {/* =====================================================
          ARCHIVE FARMER
      ===================================================== */}

      <ArchiveAccountModal
        isOpen={
          archiveModal
        }
        onClose={() => {
          if (
            isArchiving
          ) {
            return;
          }


          setArchiveModal(
            false
          );

          setSelectedFarmer(
            null
          );
        }}
        onArchive={
          confirmArchive
        }
        accountName={
          selectedFarmer
            ?.farmer ||
          "this Farmer"
        }
        accountType="Farmer Account"
        isArchiving={
          isArchiving
        }
      />


      {/* =====================================================
          RESTORE FARMER
      ===================================================== */}

      <AccountActionConfirmModal
        isOpen={
          restoreModal
        }
        title="Restore Farmer Account"
        message="This Farmer account will become active again and return to the Active tab."
        accountName={
          selectedFarmer
            ?.farmer ||
          ""
        }
        confirmText="Restore"
        variant="primary"
        isProcessing={
          isRestoring
        }
        onClose={() => {
          if (
            isRestoring
          ) {
            return;
          }


          setRestoreModal(
            false
          );

          setSelectedFarmer(
            null
          );
        }}
        onConfirm={
          confirmRestore
        }
      />


      {/* =====================================================
          DELETE FARMER
      ===================================================== */}

      <AccountActionConfirmModal
        isOpen={
          deleteModal
        }
        title="Delete Farmer Account"
        message="This Farmer account and its related farm, compliance, rating, and account data will be permanently removed from GrainRise."
        accountName={
          selectedFarmer
            ?.farmer ||
          ""
        }
        confirmText="Delete"
        variant="danger"
        isProcessing={
          isDeleting
        }
        onClose={() => {
          if (
            isDeleting
          ) {
            return;
          }


          setDeleteModal(
            false
          );

          setSelectedFarmer(
            null
          );
        }}
        onConfirm={
          confirmDelete
        }
      />
    </>
  );
};


export default FarmerManagement;