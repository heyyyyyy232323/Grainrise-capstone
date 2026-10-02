import {
  useMemo,
  useState,
} from "react";

import { Search } from "lucide-react";

import { useNavigate } from "react-router-dom";

import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";

import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import CustomAmberButton from "../../../Components/Minor-Components/CustomAmberButton";
import CustomRedButton from "../../../Components/Minor-Components/CustomRedButton";

import Toast from "../../../Components/Minor-Components/Toast";

import ArchiveAccountModal from "../../../Components/Modals/ArchiveAccountModal";
import AccountActionConfirmModal from "../../../Components/Modals/AccountActionConfirmModal";
import WarehouseReviewModal from "../../../Components/Modals/WarehouseReviewModal";

import useToast from "../../../Components/hooks/useToast";
import useWarehouseManagement from "../../../Components/hooks/AccountAdmin/useWarehouseManagement";


const ITEMS_PER_PAGE = 10;


// ============================================================
// SORT OPTIONS
// ============================================================

const SORT_OPTIONS = [
  {
    value: "name-asc",
    label: "Manager Name (A-Z)",
  },
  {
    value: "name-desc",
    label: "Manager Name (Z-A)",
  },
  {
    value: "company-asc",
    label: "Company (A-Z)",
  },
];


// ============================================================
// TAB BADGE STYLES
// ============================================================

const TAB_BADGE_STYLES = {
  "to-review":
    "bg-amber-400 text-white",

  active:
    "bg-emerald-500 text-white",

  inactive:
    "bg-rose-500 text-white",
};


// ============================================================
// TABS
// ============================================================

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


const normalizeWarehouseRow = (
  row
) => ({
  id:
    row?.id,

  manager:
  row?.manager_name ||
  row?.manager ||
  row?.name ||
  row?.full_name ||
  row?.applicant_name ||
  "",

  company:
    row?.business_name ||
    row?.company ||
    "",

  organization:
    row?.organization_name ||
    row?.organization ||
    "",

  email:
    row?.email ||
    "",

  contact:
    row?.contact_number ||
    row?.contact ||
    "",

  status:
    row?.status ||
    "",

  archiveReason:
    row?.archive_reason ||
    row?.archiveReason ||
    "",

  archivedAt:
    row?.archived_at ||
    row?.archivedAt ||
    null,

  joined:
    row?.created_at ||
    row?.joined ||
    null,

  updatedAt:
    row?.updated_at ||
    row?.updatedAt ||
    null,
});


// ============================================================
// WAREHOUSE MANAGEMENT
// ============================================================

const WarehouseManagement = () => {
  const navigate =
    useNavigate();


  // =========================================================
  // API / MANAGEMENT HOOK
  // =========================================================

  const {
    activeTab,
    rows,
    counts,

    isLoading,
    isReviewLoading,

    isConfirming,
    isArchiving,
    isRestoring,
    isDeleting,

    error,

    changeTab,

    getWarehouseDetails,

    confirmWarehouse,
    archiveWarehouse,
    restoreWarehouse,
    deleteWarehouse,
  } = useWarehouseManagement();


  // =========================================================
  // TOAST
  // =========================================================

  const {
    toasts,
    showToast,
    removeToast,
  } = useToast();


  // =========================================================
  // PAGE STATE
  // =========================================================

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);


  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");


  const [
    sortBy,
    setSortBy,
  ] = useState(
    "name-asc"
  );


  // =========================================================
  // SELECTED WAREHOUSE
  // =========================================================

  const [
    selectedWarehouse,
    setSelectedWarehouse,
  ] = useState(null);


  // =========================================================
  // REVIEW MODAL
  // =========================================================

  const [
    reviewModal,
    setReviewModal,
  ] = useState(false);


  const [
    selectedWarehouseDetails,
    setSelectedWarehouseDetails,
  ] = useState(null);


  // =========================================================
  // ARCHIVE MODAL
  // =========================================================

  const [
    archiveModal,
    setArchiveModal,
  ] = useState(false);


  // =========================================================
  // RESTORE MODAL
  // =========================================================

  const [
    restoreModal,
    setRestoreModal,
  ] = useState(false);


  // =========================================================
  // DELETE MODAL
  // =========================================================

  const [
    deleteModal,
    setDeleteModal,
  ] = useState(false);


  // =========================================================
  // NORMALIZED DATABASE ROWS
  // =========================================================

  const warehouseRows =
    useMemo(
      () =>
        Array.isArray(rows)
          ? rows.map(
              normalizeWarehouseRow
            )
          : [],
      [
        rows,
      ]
    );


  // =========================================================
  // OPEN REVIEW
  // =========================================================

  const handleReview =
    async (
      row
    ) => {
      setSelectedWarehouse(
        row
      );

      setSelectedWarehouseDetails(
        null
      );

      setReviewModal(
        true
      );


      try {
        const details =
          await getWarehouseDetails(
            row.id
          );


        setSelectedWarehouseDetails(
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
            "The Warehouse Manager application details could not be loaded.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // CLOSE REVIEW
  // =========================================================

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

      setSelectedWarehouse(
        null
      );

      setSelectedWarehouseDetails(
        null
      );
    };


  // =========================================================
  // CONFIRM APPLICATION
  // =========================================================

  const handleConfirmApplication =
    async () => {
      const userId =
        selectedWarehouseDetails
          ?.user_id ||
        selectedWarehouse
          ?.id;


      if (!userId) {
        showToast({
          type: "error",

          title:
            "Confirmation Failed",

          message:
            "The Warehouse Manager account could not be identified.",

          duration:
            4500,
        });

        return;
      }


      try {
        const response =
          await confirmWarehouse(
            userId
          );


        const result =
          response?.data ||
          {};


        setReviewModal(
          false
        );

        setSelectedWarehouse(
          null
        );

        setSelectedWarehouseDetails(
          null
        );


        if (
          result.email_sent
        ) {
          showToast({
            type: "success",

            title:
              "Warehouse Application Confirmed",

            message:
              "The account is now active and the confirmation email was sent successfully.",

            duration:
              5000,
          });

        } else {
          showToast({
            type: "warning",

            title:
              "Account Activated",

            message:
              "The Warehouse Manager account is active, but the confirmation email could not be sent.",

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
            "The Warehouse Manager application could not be confirmed.",

          duration:
            5500,
        });
      }
    };


  // =========================================================
  // MESSAGE WAREHOUSE MANAGER
  // =========================================================

  const handleMessage =
    (target) => {
      const details =
        target ||
        selectedWarehouseDetails ||
        selectedWarehouse;

      const account =
        details?.account_information;

      const personal =
        details?.personal_information;

      const business =
        details?.business_information;

      const recipientId =
        details?.user_id ||
        details?.id ||
        selectedWarehouseDetails?.user_id ||
        selectedWarehouse?.id;

      const isPartnership = Boolean(
        details?.is_partnership ||
        selectedWarehouseDetails?.is_partnership ||
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
                account?.email ||
                details?.email ||
                selectedWarehouse?.email ||
                "",

              firstName:
                personal?.first_name ||
                details?.first_name ||
                "",

              lastName:
                personal?.last_name ||
                details?.last_name ||
                "",

              businessName:
                business?.business_name ||
                details?.business_name ||
                selectedWarehouse?.company ||
                "",

              source:
                "warehouse-management",
            },
          },
        }
      );
    };


  // =========================================================
  // OPEN ARCHIVE
  // =========================================================

  const handleArchive =
    (
      row
    ) => {
      setSelectedWarehouse(
        row
      );

      setArchiveModal(
        true
      );
    };


  // =========================================================
  // CONFIRM ARCHIVE
  // =========================================================

  const confirmArchive =
    async (
      reason
    ) => {
      if (
        !selectedWarehouse
          ?.id
      ) {
        return;
      }


      try {
        await archiveWarehouse(
          selectedWarehouse.id,
          reason
        );


        setArchiveModal(
          false
        );

        setSelectedWarehouse(
          null
        );


        showToast({
          type: "success",

          title:
            "Warehouse Account Archived",

          message:
            "The Warehouse Manager account was archived successfully.",

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
            "The Warehouse Manager account could not be archived.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // OPEN RESTORE
  // =========================================================

  const handleRestore =
    (
      row
    ) => {
      setSelectedWarehouse(
        row
      );

      setRestoreModal(
        true
      );
    };


  // =========================================================
  // CONFIRM RESTORE
  // =========================================================

  const confirmRestore =
    async () => {
      if (
        !selectedWarehouse
          ?.id
      ) {
        return;
      }


      try {
        await restoreWarehouse(
          selectedWarehouse.id
        );


        setRestoreModal(
          false
        );

        setSelectedWarehouse(
          null
        );


        showToast({
          type: "success",

          title:
            "Warehouse Account Restored",

          message:
            "The Warehouse Manager account is active again.",

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
            "The Warehouse Manager account could not be restored.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // OPEN DELETE
  // =========================================================

  const handleDelete =
    (
      row
    ) => {
      setSelectedWarehouse(
        row
      );

      setDeleteModal(
        true
      );
    };


  // =========================================================
  // CONFIRM DELETE
  // =========================================================

  const confirmDelete =
    async () => {
      if (
        !selectedWarehouse
          ?.id
      ) {
        return;
      }


      try {
        await deleteWarehouse(
          selectedWarehouse.id
        );


        setDeleteModal(
          false
        );

        setSelectedWarehouse(
          null
        );


        showToast({
          type: "success",

          title:
            "Warehouse Account Deleted",

          message:
            "The Warehouse Manager account was permanently deleted.",

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
            "The Warehouse Manager account could not be permanently deleted.",

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
        // INACTIVE TAB
        // ====================================================

        if (
          activeTab ===
          "inactive"
        ) {
          return [
            {
              key: "manager",

              label:
                "Manager Name",

              width:
                "22%",
            },


            {
              key: "company",

              label:
                "Company Name",

              width:
                "22%",
            },


            {
              key: "email",

              label:
                "Email",

              width:
                "20%",
            },


            {
              key:
                "archiveReason",

              label:
                "Archive Reason",

              width:
                "20%",

              render:
                (
                  row
                ) => (
                  <p
                    className="
                      whitespace-normal
                      break-words
                      text-[11px]
                      leading-5
                      text-slate-500
                    "
                  >
                    {displayValue(
                      row.archiveReason,
                      "No archive reason recorded."
                    )}
                  </p>
                ),
            },


            {
              key: "action",

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
                      items-center
                      justify-center
                      gap-2
                    "
                  >

                    <CustomGreenButton
                      text="Restore"
                      className="
                        whitespace-nowrap
                        rounded-lg
                        px-3
                        py-1.5
                        text-[11px]
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
                        whitespace-nowrap
                        rounded-lg
                        px-4
                        py-1.5
                        text-[11px]
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
            key: "manager",

            label:
              "Manager Name",

            width:
              "22%",
          },


          {
            key: "company",

            label:
              "Company Name",

            width:
              "22%",
          },


          {
            key: "email",

            label:
              "Email",

            width:
              "20%",
          },


          {
            key: "contact",

            label:
              "Contact",

            width:
              "16%",
          },


          {
            key: "action",

            label:
              "Action",

            width:
              "20%",

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
                          whitespace-nowrap
                          rounded-lg
                          px-3
                          py-1.5
                          text-[11px]
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
                        onClick={() =>
                          navigate(
                            `/admin/warehouses/${row.id}`,
                            {
                              state: {
                                warehouse:
                                  row,
                              },
                            }
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
                          cursor-pointer
                        "
                      >
                        View Details
                      </button>


                      <CustomAmberButton
                        text="Archive"
                        className="
                          whitespace-nowrap
                          rounded-lg
                          px-3
                          py-1.5
                          text-[11px]
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
        navigate,
      ]
    );


  // =========================================================
  // SEARCH + SORT
  // =========================================================

  const filteredRows =
    useMemo(
      () => {
        const query =
          searchQuery
            .trim()
            .toLowerCase();


        const list =
          warehouseRows.filter(
            (
              row
            ) => {
              if (!query) {
                return true;
              }


              return (
                String(
                  row.manager ||
                  ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  ) ||

                String(
                  row.company ||
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


        const sorted =
          [
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
                a.manager ||
                ""
              ).localeCompare(
                String(
                  b.manager ||
                  ""
                )
              )
          );

        } else if (
          sortBy ===
          "name-desc"
        ) {
          sorted.sort(
            (
              a,
              b
            ) =>
              String(
                b.manager ||
                ""
              ).localeCompare(
                String(
                  a.manager ||
                  ""
                )
              )
          );

        } else if (
          sortBy ===
          "company-asc"
        ) {
          sorted.sort(
            (
              a,
              b
            ) =>
              String(
                a.company ||
                ""
              ).localeCompare(
                String(
                  b.company ||
                  ""
                )
              )
          );
        }


        return sorted;
      },
      [
        warehouseRows,
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


        const endIndex =
          startIndex +
          ITEMS_PER_PAGE;


        return filteredRows.slice(
          startIndex,
          endIndex
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
              {tab.id ===
              "to-review"
                ? counts
                    .to_review

                : tab.id ===
                    "active"
                  ? counts
                      .active

                  : counts
                      .inactive}
            </span>
          </>
        ),
      })
    );


  // =========================================================
  // PAGE
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
              "/admin/warehouses",
          },
          {
            label:
              "Warehouse Management",
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
            md:text-3xl
            font-bold
            text-gray-900
          "
        >
          Warehouse Management
        </h1>


        <p
          className="
            text-sm
            text-gray-500
            mt-1
          "
        >
          Manage warehouse accounts and approvals.
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
          id
        ) => {
          changeTab(
            id
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
          flex
          flex-wrap
          items-center
          gap-3
          mb-4
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
                absolute
                inset-y-0
                left-0
                pl-3
                flex
                items-center
                pointer-events-none
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
              placeholder={
                activeTab ===
                "inactive"
                  ? "Search manager, company, email, or reason"
                  : "Search by manager, company, or email"
              }
              className="
                block
                w-full
                pl-10
                pr-3
                py-2
                border
                border-gray-200
                rounded-lg
                text-sm
                focus:outline-none
                focus:ring-1
                focus:ring-emerald-500
                focus:border-emerald-500
                bg-white
                placeholder-gray-400
                text-gray-700
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


      {error &&
        !isLoading && (

        <div
          className="
            mb-4
            rounded-lg
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
            Unable to load Warehouse Management.
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
      )}


      {isLoading ? (

        <div
          className="
            flex
            min-h-[320px]
            items-center
            justify-center
            rounded-xl
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
              Loading warehouse accounts...
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
            `Showing ${firstVisible}-${lastVisible} of ${filteredRows.length} warehouses`
          }
        />

      )}


      <WarehouseReviewModal
        isOpen={
          reviewModal
        }
        onClose={
          closeReviewModal
        }
        warehouse={
          selectedWarehouseDetails
        }
        isLoading={
          isReviewLoading
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

          setSelectedWarehouse(
            null
          );
        }}
        onArchive={
          confirmArchive
        }
        accountName={
          selectedWarehouse
            ?.company ||
          selectedWarehouse
            ?.manager ||
          "this warehouse"
        }
        accountType="Warehouse Manager Account"
        isArchiving={
          isArchiving
        }
      />


      <AccountActionConfirmModal
        isOpen={
          restoreModal
        }
        title="Restore Warehouse Account"
        message="This Warehouse Manager account will become active again and return to the Active tab."
        accountName={
          selectedWarehouse
            ?.company ||
          selectedWarehouse
            ?.manager ||
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

          setSelectedWarehouse(
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
        title="Delete Warehouse Account"
        message="This Warehouse Manager account and its related account data will be permanently removed from GrainRise."
        accountName={
          selectedWarehouse
            ?.company ||
          selectedWarehouse
            ?.manager ||
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

          setSelectedWarehouse(
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


export default WarehouseManagement;