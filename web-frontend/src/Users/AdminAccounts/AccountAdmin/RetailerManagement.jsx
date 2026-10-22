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

import Toast from "../../../Components/Modals/Toast";

import RetailerReviewModal from "../../../Components/Modals/RetailerReviewModal";
import RetailerDetailsModal from "../../../Components/Modals/RetailerDetailsModal";

import ArchiveAccountModal from "../../../Components/Modals/ArchiveAccountModal";
import AccountActionConfirmModal from "../../../Components/Modals/AccountActionConfirmModal";

import useToast from "../../../Components/hooks/useToast";
import useRetailerManagement from "../../../Components/hooks/AccountAdmin/useRetailerManagement";


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
    label: "Retailer (A-Z)",
  },

  {
    value: "name-desc",
    label: "Retailer (Z-A)",
  },

  {
    value: "newest",
    label: "Newest",
  },

  {
    value: "oldest",
    label: "Oldest",
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


const getStatusClasses = (
  status
) => {
  const normalized =
    String(
      status || ""
    )
      .trim()
      .toLowerCase();


  if (
    normalized === "active"
  ) {
    return `
      border-emerald-200
      bg-emerald-50
      text-emerald-700
    `;
  }


  if (
    normalized === "archived"
  ) {
    return `
      border-amber-200
      bg-amber-50
      text-amber-700
    `;
  }


  if (
    normalized === "deactivated"
  ) {
    return `
      border-rose-200
      bg-rose-50
      text-rose-700
    `;
  }


  return `
    border-gray-200
    bg-gray-100
    text-gray-600
  `;
};


// ============================================================
// RETAILER MANAGEMENT
// ============================================================

const RetailerManagement = () => {
  const navigate =
    useNavigate();


  // =========================================================
  // API
  // =========================================================

  const {
    activeTab,
    changeTab,

    rows,
    counts,

    isLoading,
    isDetailsLoading,
    isConfirming,
    isArchiving,
    isRestoring,
    isDeleting,

    error,

    getRetailerDetails,

    confirmRetailer,
    archiveRetailer,
    restoreRetailer,
    deleteRetailer,
  } =
    useRetailerManagement();


  // =========================================================
  // TOAST
  // =========================================================

  const {
    toasts,
    showToast,
    removeToast,
  } =
    useToast();


  // =========================================================
  // PAGE STATE
  // =========================================================

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");


  const [
    sortBy,
    setSortBy,
  ] =
    useState(
      "name-asc"
    );


  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(1);


  // =========================================================
  // SELECTED RETAILER
  // =========================================================

  const [
    selectedRetailer,
    setSelectedRetailer,
  ] =
    useState(null);


  const [
    selectedRetailerDetails,
    setSelectedRetailerDetails,
  ] =
    useState(null);


  // =========================================================
  // MODALS
  // =========================================================

  const [
    reviewModal,
    setReviewModal,
  ] =
    useState(false);


  const [
    detailsModal,
    setDetailsModal,
  ] =
    useState(false);


  const [
    archiveModal,
    setArchiveModal,
  ] =
    useState(false);


  const [
    restoreModal,
    setRestoreModal,
  ] =
    useState(false);


  const [
    deleteModal,
    setDeleteModal,
  ] =
    useState(false);


  // =========================================================
  // REVIEW
  // =========================================================

  const handleReview =
    async (
      row
    ) => {
      setSelectedRetailer(
        row
      );

      setSelectedRetailerDetails(
        null
      );

      setReviewModal(
        true
      );


      try {
        const details =
          await getRetailerDetails(
            row.id
          );


        setSelectedRetailerDetails(
          details
        );

      } catch (
        requestError
      ) {
        showToast({
          type: "error",

          title:
            "Unable to Load Application",

          message:
            requestError?.message ||
            "The Retailer application details could not be loaded.",

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

      setSelectedRetailer(
        null
      );

      setSelectedRetailerDetails(
        null
      );
    };


  // =========================================================
  // CONFIRM
  // =========================================================

  const handleConfirmApplication =
    async () => {
      const userId =
        selectedRetailerDetails
          ?.user_id ||
        selectedRetailer
          ?.id;


      if (!userId) {
        showToast({
          type: "error",

          title:
            "Confirmation Failed",

          message:
            "The Retailer account could not be identified.",

          duration:
            4500,
        });

        return;
      }


      try {
        const response =
          await confirmRetailer(
            userId
          );


        const result =
          response?.data ||
          {};


        setReviewModal(
          false
        );

        setSelectedRetailer(
          null
        );

        setSelectedRetailerDetails(
          null
        );


        if (
          result.email_sent
        ) {
          showToast({
            type: "success",

            title:
              "Retailer Application Confirmed",

            message:
              "The Retailer account is now active and the confirmation email was sent successfully.",

            duration:
              5000,
          });

        } else {
          showToast({
            type: "warning",

            title:
              "Account Activated",

            message:
              "The Retailer account is active, but the confirmation email could not be sent.",

            duration:
              6000,
          });
        }

      } catch (
        requestError
      ) {
        showToast({
          type: "error",

          title:
            "Confirmation Failed",

          message:
            requestError?.message ||
            "The Retailer application could not be confirmed.",

          duration:
            5500,
        });
      }
    };


  // =========================================================
  // MESSAGE
  // =========================================================

  const handleMessage =
    (target) => {
      const details =
        target ||
        selectedRetailerDetails ||
        selectedRetailer;

      const account =
        details?.account_information ||
        {};

      const personal =
        details?.personal_information ||
        {};

      const recipientId =
        details?.user_id ||
        details?.id ||
        selectedRetailerDetails?.user_id ||
        selectedRetailer?.id;

      const isPartnership = Boolean(
        details?.is_partnership ||
        selectedRetailerDetails?.is_partnership ||
        (typeof recipientId === "string" && recipientId.includes("-"))
      );

      navigate(
        "/admin/email-users",
        {
          state: {
            recipient: {
              recipientType:
                isPartnership
                  ? "partnership_inquiry"
                  : "user",

              recipientId:
                recipientId,

              userId:
                recipientId,

              email:
                account.email ||
                details?.email ||
                selectedRetailer?.email ||
                "",

              firstName:
                personal.first_name ||
                details?.first_name ||
                "",

              lastName:
                personal.last_name ||
                details?.last_name ||
                "",

              businessName:
                details?.business_name ||
                selectedRetailer?.company ||
                "",

              source:
                "retailer-management",
            },
          },
        }
      );
    };


  // =========================================================
  // VIEW DETAILS
  // =========================================================

  const handleViewDetails =
    async (
      row
    ) => {
      setSelectedRetailer(
        row
      );

      setSelectedRetailerDetails(
        null
      );

      setDetailsModal(
        true
      );


      try {
        const details =
          await getRetailerDetails(
            row.id
          );


        setSelectedRetailerDetails(
          details
        );

      } catch (
        requestError
      ) {
        showToast({
          type: "error",

          title:
            "Unable to Load Details",

          message:
            requestError?.message ||
            "The Retailer account details could not be loaded.",

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

      setSelectedRetailer(
        null
      );

      setSelectedRetailerDetails(
        null
      );
    };


  // =========================================================
  // ARCHIVE
  // =========================================================

  const handleArchive =
    (
      row
    ) => {
      setSelectedRetailer(
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
        !selectedRetailer
          ?.id
      ) {
        return;
      }


      try {
        await archiveRetailer(
          selectedRetailer.id,
          reason
        );


        setArchiveModal(
          false
        );

        setSelectedRetailer(
          null
        );


        showToast({
          type: "success",

          title:
            "Retailer Account Archived",

          message:
            "The Retailer account was archived successfully.",

          duration:
            5000,
        });

      } catch (
        requestError
      ) {
        showToast({
          type: "error",

          title:
            "Archive Failed",

          message:
            requestError?.message ||
            "The Retailer account could not be archived.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // RESTORE
  // =========================================================

  const handleRestore =
    (
      row
    ) => {
      setSelectedRetailer(
        row
      );

      setRestoreModal(
        true
      );
    };


  const confirmRestore =
    async () => {
      if (
        !selectedRetailer
          ?.id
      ) {
        return;
      }


      try {
        await restoreRetailer(
          selectedRetailer.id
        );


        setRestoreModal(
          false
        );

        setSelectedRetailer(
          null
        );


        showToast({
          type: "success",

          title:
            "Retailer Account Restored",

          message:
            "The Retailer account is active again.",

          duration:
            5000,
        });

      } catch (
        requestError
      ) {
        showToast({
          type: "error",

          title:
            "Restore Failed",

          message:
            requestError?.message ||
            "The Retailer account could not be restored.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete =
    (
      row
    ) => {
      setSelectedRetailer(
        row
      );

      setDeleteModal(
        true
      );
    };


  const confirmDelete =
    async () => {
      if (
        !selectedRetailer
          ?.id
      ) {
        return;
      }


      try {
        await deleteRetailer(
          selectedRetailer.id
        );


        setDeleteModal(
          false
        );

        setSelectedRetailer(
          null
        );


        showToast({
          type: "success",

          title:
            "Retailer Account Deleted",

          message:
            "The Retailer account was permanently deleted.",

          duration:
            5000,
        });

      } catch (
        requestError
      ) {
        showToast({
          type: "error",

          title:
            "Delete Failed",

          message:
            requestError?.message ||
            "The Retailer account could not be permanently deleted.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // COLUMNS
  // =========================================================

  const columns =
    useMemo(
      () => {
        if (
          activeTab ===
          "inactive"
        ) {
          return [
            {
              key: "retailer",
              label: "Retailer Name",
              width: "20%",
            },

            {
              key: "email",
              label: "Email",
              width: "20%",
            },

            {
              key: "contact",
              label: "Contact",
              width: "15%",
            },

            {
              key: "status",
              label: "Status",
              width: "12%",

              render:
                (row) => (
                  <span
                    className={`
                      inline-flex
                      rounded-full
                      border
                      px-2.5
                      py-1
                      text-[10px]
                      font-semibold
                      ${getStatusClasses(
                        row.status
                      )}
                    `}
                  >
                    {
                      formatStatus(
                        row.status
                      )
                    }
                  </span>
                ),
            },

            {
              key: "archiveReason",
              label: "Archive Reason",
              width: "18%",

              render:
                (row) =>
                  displayValue(
                    row.archiveReason,
                    "No reason recorded"
                  ),
            },

            {
              key: "action",
              label: "Action",
              width: "25%",

              cellClassName:
                "text-center",

              render:
                (row) => (
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
                      onClick={() =>
                        handleViewDetails(
                          row
                        )
                      }
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
                      "
                    >
                      View Details
                    </button>


                    <CustomGreenButton
                      text="Restore"
                      className="whitespace-nowrap px-3 py-1.5 text-[11px] rounded-lg"
                      onClick={() =>
                        handleRestore(
                          row
                        )
                      }
                    />


                    <CustomRedButton
                      text="Delete"
                      className="whitespace-nowrap px-3 py-1.5 text-[11px] rounded-lg"
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


        return [
          {
            key: "retailer",
            label: "Retailer Name",
            width: "23%",
          },

          {
            key: "email",
            label: "Email",
            width: "23%",
          },

          {
            key: "contact",
            label: "Contact",
            width: "18%",
          },

          {
            key: "username",
            label: "Username",
            width: "16%",

            render:
              (row) =>
                displayValue(
                  row.username
                ),
          },

          {
            key: "action",
            label: "Action",
            width: "20%",

            cellClassName:
              "text-center",

            render:
              (row) => {
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
                        className="px-3 py-1.5 text-[11px] rounded-lg"
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
                        onClick={() =>
                          handleViewDetails(
                            row
                          )
                        }
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
                        "
                      >
                        View Details
                      </button>


                      <CustomAmberButton
                        text="Archive"
                        className="whitespace-nowrap px-3 py-1.5 text-[11px] rounded-lg"
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
          rows.filter(
            (row) => {
              if (!query) {
                return true;
              }


              return (
                String(
                  row.retailer ||
                  ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  ) ||

                String(
                  row.email ||
                  ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  ) ||

                String(
                  row.contact ||
                  ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  ) ||

                String(
                  row.username ||
                  ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  ) ||

                String(
                  row.archiveReason ||
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
                a.retailer ||
                ""
              ).localeCompare(
                String(
                  b.retailer ||
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
                b.retailer ||
                ""
              ).localeCompare(
                String(
                  a.retailer ||
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
                b.joined ||
                0
              ).getTime() -
              new Date(
                a.joined ||
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
                a.joined ||
                0
              ).getTime() -
              new Date(
                b.joined ||
                0
              ).getTime()
          );
        }


        return sorted;
      },
      [
        rows,
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
          (
            safeCurrentPage -
            1
          ) *
          ITEMS_PER_PAGE
        ) + 1;


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
  // TABS + COUNTS
  // =========================================================

  const tabsWithCounts =
    TABS.map(
      (tab) => ({
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
                ${TAB_BADGE_STYLES[
                  tab.id
                ]}
              `}
            >
              {
                tab.id ===
                "to-review"
                  ? counts.to_review

                  : tab.id ===
                    "active"
                    ? counts.active

                    : counts.inactive
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
      <Toast
        toasts={
          toasts
        }
        removeToast={
          removeToast
        }
      />


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
              "Retailer Management",
          },
        ]}
      />


      <div
        className="
          mt-4
          mb-6
        "
      >
        <h1
          className="
            text-2xl
            font-bold
            text-gray-900
            md:text-3xl
          "
        >
          Retailer Management
        </h1>

        <p
          className="
            mt-1
            text-sm
            text-gray-500
          "
        >
          Review Retailer applications and manage active or inactive Retailer accounts.
        </p>
      </div>


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
              placeholder="Search by Retailer, email, contact, or username"
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
              Unable to load Retailer Management.
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
                Loading Retailer accounts...
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
              `Showing ${firstVisible}-${lastVisible} of ${filteredRows.length} Retailers`
            }
          />
        )
      }


      <RetailerReviewModal
        isOpen={
          reviewModal
        }
        onClose={
          closeReviewModal
        }
        retailer={
          selectedRetailerDetails
        }
        isLoading={
          isDetailsLoading
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


      <RetailerDetailsModal
        isOpen={
          detailsModal
        }
        onClose={
          closeDetailsModal
        }
        retailer={
          selectedRetailerDetails
        }
        isLoading={
          isDetailsLoading
        }
      />


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

          setSelectedRetailer(
            null
          );
        }}
        onArchive={
          confirmArchive
        }
        accountName={
          selectedRetailer
            ?.retailer ||
          "this Retailer"
        }
        accountType="Retailer Account"
        isArchiving={
          isArchiving
        }
      />


      <AccountActionConfirmModal
        isOpen={
          restoreModal
        }
        title="Restore Retailer Account"
        message="This Retailer account will become active again and return to the Active tab."
        accountName={
          selectedRetailer
            ?.retailer ||
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

          setSelectedRetailer(
            null
          );
        }}
        onConfirm={
          confirmRestore
        }
      />


      <AccountActionConfirmModal
        isOpen={
          deleteModal
        }
        title="Delete Retailer Account"
        message="This Retailer account and its related account data will be permanently removed from GrainRise. This action cannot be undone."
        accountName={
          selectedRetailer
            ?.retailer ||
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

          setSelectedRetailer(
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


export default RetailerManagement;