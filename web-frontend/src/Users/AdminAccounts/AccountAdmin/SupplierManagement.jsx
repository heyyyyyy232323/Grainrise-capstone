import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";

import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import CustomAmberButton from "../../../Components/Minor-Components/CustomAmberButton";
import CustomRedButton from "../../../Components/Minor-Components/CustomRedButton";

import Toast from "../../../Components/Modals/Toast";

import ArchiveAccountModal from "../../../Components/Modals/ArchiveAccountModal";
import AccountActionConfirmModal from "../../../Components/Modals/AccountActionConfirmModal";

import MillerReviewModal from "./MillerReviewModal";

import useToast from "../../../Components/hooks/useToast";
import useMillerManagement from "../../../Components/hooks/AccountAdmin/useMillerManagement";


// ============================================================
// CONSTANTS
// ============================================================

const ITEMS_PER_PAGE = 10;

const TAB_BADGE_STYLES = {
  "to-review": "bg-amber-400 text-white",
  active: "bg-emerald-500 text-white",
  inactive: "bg-rose-500 text-white",
};

const SORT_OPTIONS = [
  {
    value: "name-asc",
    label: "Miller (A-Z)",
  },
  {
    value: "name-desc",
    label: "Miller (Z-A)",
  },
];

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

const displayValue = (value, fallback = "—") => {
  const cleaned = String(value ?? "").trim();

  return cleaned || fallback;
};


// ============================================================
// MILLER MANAGEMENT
// FILE NAME REMAINS SupplierManagement.jsx
// ============================================================

const SupplierManagement = () => {
  const navigate = useNavigate();


  // =========================================================
  // PAGE STATE
  // ============================================================

  const [activeTab, setActiveTab] = useState("to-review");

  const [currentPage, setCurrentPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");

  const [sortBy, setSortBy] = useState("name-asc");


  // =========================================================
  // API
  // ============================================================

  const {
    millers,
    counts,

    isLoading,
    isLoadingDetails,

    isConfirming,
    isArchiving,
    isRestoring,
    isDeleting,

    error,

    getMillerDetails,

    confirmMiller,
    archiveMiller,
    restoreMiller,
    deleteMiller,
  } = useMillerManagement(activeTab);


  // =========================================================
  // TOAST
  // ============================================================

  const {
    toasts,
    showToast,
    removeToast,
  } = useToast();


  // =========================================================
  // SELECTED MILLER
  // ============================================================

  const [
    selectedMiller,
    setSelectedMiller,
  ] = useState(null);


  const [
    selectedMillerDetails,
    setSelectedMillerDetails,
  ] = useState(null);


  // =========================================================
  // MODALS
  // ============================================================

  const [
    reviewModal,
    setReviewModal,
  ] = useState(false);


  const [
    archiveModal,
    setArchiveModal,
  ] = useState(false);


  const [
    restoreModal,
    setRestoreModal,
  ] = useState(false);


  const [
    deleteModal,
    setDeleteModal,
  ] = useState(false);


  // =========================================================
  // REVIEW APPLICATION
  // ============================================================

  const handleReview = async (row) => {
    setSelectedMiller(row);

    setSelectedMillerDetails(null);

    setReviewModal(true);

    try {
      const details =
        await getMillerDetails(
          row.id
        );

      setSelectedMillerDetails(
        details
      );
    } catch (requestError) {
      showToast({
        type: "error",

        title:
          "Unable to Load Application",

        message:
          requestError?.message ||
          "The Miller application details could not be loaded.",

        duration: 5000,
      });
    }
  };


  const closeReviewModal = () => {
    if (isConfirming) {
      return;
    }

    setReviewModal(false);

    setSelectedMiller(null);

    setSelectedMillerDetails(null);
  };


  // =========================================================
  // CONFIRM APPLICATION
  // ============================================================

  const handleConfirmApplication = async () => {
    const userId =
      selectedMillerDetails?.user_id ||
      selectedMiller?.id;

    if (!userId) {
      showToast({
        type: "error",

        title:
          "Confirmation Failed",

        message:
          "The Miller account could not be identified.",

        duration: 4500,
      });

      return;
    }

    try {
      const response =
        await confirmMiller(
          userId
        );

      const result =
        response?.data ||
        {};

      setReviewModal(false);

      setSelectedMiller(null);

      setSelectedMillerDetails(null);

      if (result.email_sent) {
        showToast({
          type: "success",

          title:
            "Miller Application Confirmed",

          message:
            "The account is now active and the confirmation email was sent successfully.",

          duration: 5000,
        });
      } else {
        showToast({
          type: "warning",

          title:
            "Account Activated",

          message:
            "The Miller account is active, but the confirmation email could not be sent.",

          duration: 6000,
        });
      }
    } catch (requestError) {
      showToast({
        type: "error",

        title:
          "Confirmation Failed",

        message:
          requestError?.message ||
          "The Miller application could not be confirmed.",

        duration: 5500,
      });
    }
  };


  // =========================================================
  // MESSAGE MILLER
  // ============================================================

  const handleMessage = (target) => {
    const details =
      target ||
      selectedMillerDetails ||
      selectedMiller;

    const account =
      details?.account_information;

    const personal =
      details?.personal_information;

    const business =
      details?.business_information;

    const recipientId =
      details?.user_id ||
      details?.id ||
      selectedMillerDetails?.user_id ||
      selectedMiller?.id;

    const isPartnership = Boolean(
      details?.is_partnership ||
      selectedMillerDetails?.is_partnership ||
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
              selectedMiller?.email ||
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
              selectedMiller?.company ||
              "",

            source:
              "miller-management",
          },
        },
      }
    );
  };


  // =========================================================
  // ARCHIVE MILLER
  // ============================================================

  const handleArchive = (row) => {
    setSelectedMiller(row);

    setArchiveModal(true);
  };


  const confirmArchive = async (reason) => {
    if (!selectedMiller?.id) {
      return;
    }

    try {
      await archiveMiller(
        selectedMiller.id,
        reason
      );

      setArchiveModal(false);

      setSelectedMiller(null);

      showToast({
        type: "success",

        title:
          "Miller Account Archived",

        message:
          "The Miller account was archived successfully.",

        duration: 5000,
      });
    } catch (requestError) {
      showToast({
        type: "error",

        title:
          "Archive Failed",

        message:
          requestError?.message ||
          "The Miller account could not be archived.",

        duration: 5000,
      });
    }
  };


  // =========================================================
  // RESTORE MILLER
  // ============================================================

  const handleRestore = (row) => {
    setSelectedMiller(row);

    setRestoreModal(true);
  };


  const confirmRestore = async () => {
    if (!selectedMiller?.id) {
      return;
    }

    try {
      await restoreMiller(
        selectedMiller.id
      );

      setRestoreModal(false);

      setSelectedMiller(null);

      showToast({
        type: "success",

        title:
          "Miller Account Restored",

        message:
          "The Miller account is active again.",

        duration: 5000,
      });
    } catch (requestError) {
      showToast({
        type: "error",

        title:
          "Restore Failed",

        message:
          requestError?.message ||
          "The Miller account could not be restored.",

        duration: 5000,
      });
    }
  };


  // =========================================================
  // DELETE MILLER
  // ============================================================

  const handleDelete = (row) => {
    setSelectedMiller(row);

    setDeleteModal(true);
  };


  const confirmDelete = async () => {
    if (!selectedMiller?.id) {
      return;
    }

    try {
      await deleteMiller(
        selectedMiller.id
      );

      setDeleteModal(false);

      setSelectedMiller(null);

      showToast({
        type: "success",

        title:
          "Miller Account Deleted",

        message:
          "The Miller account was permanently deleted.",

        duration: 5000,
      });
    } catch (requestError) {
      showToast({
        type: "error",

        title:
          "Delete Failed",

        message:
          requestError?.message ||
          "The Miller account could not be permanently deleted.",

        duration: 5000,
      });
    }
  };


  // =========================================================
  // TABLE COLUMNS
  // ============================================================

  const columns = useMemo(() => {
    // ========================================================
    // INACTIVE
    // ========================================================

    if (activeTab === "inactive") {
      return [
        {
          key: "miller",
          label: "Miller Name",
          width: "30%",
        },
        {
          key: "email",
          label: "Email",
          width: "28%",
        },
        {
          key: "archiveReason",
          label: "Archive Reason",
          width: "26%",
          render: (row) => (
            <span className="text-[13px] text-slate-500">
              {displayValue(row?.archiveReason, "No reason recorded")}
            </span>
          ),
        },
        {
          key: "action",
          label: "Action",
          width: "16%",
          render: (row) => (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                onClick={() => handleRestore(row)}
              >
                Restore
              </button>
              <button
                type="button"
                className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 cursor-pointer"
                onClick={() => handleDelete(row)}
              >
                Delete
              </button>
            </div>
          ),
        },
      ];
    }

    // ========================================================
    // TO REVIEW
    // ========================================================

    if (activeTab === "to-review") {
      return [
        {
          key: "miller",
          label: "Miller Name",
          width: "35%",
        },
        {
          key: "email",
          label: "Email",
          width: "35%",
        },
        {
          key: "contact",
          label: "Contact",
          width: "18%",
        },
        {
          key: "action",
          label: "Action",
          width: "12%",
          render: (row) => (
            <div className="flex justify-center">
              <button
                type="button"
                className="whitespace-nowrap rounded-full border border-amber-300 bg-amber-50/60 px-3.5 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 cursor-pointer"
                onClick={() => handleReview(row)}
              >
                Review
              </button>
            </div>
          ),
        },
      ];
    }

    // ========================================================
    // ACTIVE
    // ========================================================

    return [
      {
        key: "miller",
        label: "Miller Name",
        width: "32%",
      },
      {
        key: "email",
        label: "Email",
        width: "32%",
      },
      {
        key: "contact",
        label: "Contact",
        width: "18%",
      },
      {
        key: "action",
        label: "Action",
        width: "18%",
        render: (row) => (
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              className="whitespace-nowrap rounded-full border border-slate-300 bg-white px-3.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              onClick={() =>
                navigate(`/admin/millers/${row.id}`, { state: { miller: row } })
              }
            >
              View Details
            </button>
            <button
              type="button"
              className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-50 cursor-pointer"
              onClick={() => handleArchive(row)}
            >
              Archive
            </button>
          </div>
        ),
      },
    ];
  }, [
    activeTab,
    navigate,
  ]);


  // =========================================================
  // FILTER + SORT
  // ============================================================

  const filteredRows =
    useMemo(
      () => {
        const query =
          searchQuery
            .trim()
            .toLowerCase();

        const list =
          millers.filter(
            (row) => {
              if (!query) {
                return true;
              }

              return (
                String(
                  row.miller ||
                  ""
                )
                  .toLowerCase()
                  .includes(query) ||

                String(
                  row.company ||
                  ""
                )
                  .toLowerCase()
                  .includes(query) ||

                String(
                  row.email ||
                  ""
                )
                  .toLowerCase()
                  .includes(query)
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
            (a, b) =>
              String(
                a.miller ||
                ""
              ).localeCompare(
                String(
                  b.miller ||
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
            (a, b) =>
              String(
                b.miller ||
                ""
              ).localeCompare(
                String(
                  a.miller ||
                  ""
                )
              )
          );
        }

        return sorted;
      },
      [
        millers,
        searchQuery,
        sortBy,
      ]
    );


  // =========================================================
  // PAGINATION
  // ============================================================

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
    filteredRows.length === 0
      ? 0
      : (
          safeCurrentPage -
          1
        ) *
          ITEMS_PER_PAGE +
        1;


  const lastVisible =
    filteredRows.length === 0
      ? 0
      : Math.min(
          safeCurrentPage *
          ITEMS_PER_PAGE,

          filteredRows.length
        );


  // =========================================================
  // TAB COUNTS
  // ============================================================

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
  // ============================================================

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
              "Miller Management",
          },
        ]}
      />


      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Miller Management
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Manage Miller accounts, application reviews, and account status.
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
        onTabChange={(tabId) => {
          setActiveTab(
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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search miller, company, or email"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <SortByDropdown
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(value) => {
            setSortBy(value);
            setCurrentPage(1);
          }}
        />
      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {
        error &&
        !isLoading && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-700">
              Unable to load Miller Management.
            </p>

            <p className="mt-1 text-xs text-red-600">
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
          <div className="flex min-h-[320px] items-center justify-center rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#08511f]" />
              <p className="text-sm font-medium text-slate-600">
                Loading Miller accounts...
              </p>
            </div>
          </div>
        ) : (
          <SectionedTableCard
            columns={columns}
            sections={sections}
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
            footerLabel={`Showing ${firstVisible}–${lastVisible} of ${filteredRows.length} Miller${filteredRows.length !== 1 ? "s" : ""}`}
          />
        )
      }


      {/* =====================================================
          REVIEW APPLICATION MODAL
      ===================================================== */}

      <MillerReviewModal
        isOpen={
          reviewModal
        }
        onClose={
          closeReviewModal
        }
        miller={
          selectedMillerDetails
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
          ARCHIVE MILLER
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

          setSelectedMiller(
            null
          );
        }}
        onArchive={
          confirmArchive
        }
        accountName={
          selectedMiller?.company ||
          selectedMiller?.miller ||
          "this Miller"
        }
        accountType="Miller Account"
        isArchiving={
          isArchiving
        }
      />


      {/* =====================================================
          RESTORE MILLER
      ===================================================== */}

      <AccountActionConfirmModal
        isOpen={
          restoreModal
        }
        title="Restore Miller Account"
        message="This Miller account will become active again and return to the Active tab."
        accountName={
          selectedMiller?.company ||
          selectedMiller?.miller ||
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

          setSelectedMiller(
            null
          );
        }}
        onConfirm={
          confirmRestore
        }
      />


      {/* =====================================================
          DELETE MILLER
      ===================================================== */}

      <AccountActionConfirmModal
        isOpen={
          deleteModal
        }
        title="Delete Miller Account"
        message="This Miller account and its related account data will be permanently removed from GrainRise."
        accountName={
          selectedMiller?.company ||
          selectedMiller?.miller ||
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

          setSelectedMiller(
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


export default SupplierManagement;