import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";
import { createPortal } from "react-dom";

import {
  Search,
  X,
} from "lucide-react";

import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Tabs from "../../../Components/Minor-Components/Tabs";
import Toast from "../../../Components/Modals/Toast";

import ArchiveAccountModal from "../../../Components/Modals/ArchiveAccountModal";
import AccountActionConfirmModal from "../../../Components/Modals/AccountActionConfirmModal";

import useToast from "../../../Components/hooks/useToast";
import useMillerManagement from "../../../Components/hooks/AccountAdmin/useMillerManagement";


// ============================================================
// CONSTANTS
// ============================================================

const ITEMS_PER_PAGE = 10;

const DETAIL_TABS = [
  {
    id: "active-employees",
    label: "Active Employees",
  },
  {
    id: "archived-employees",
    label: "Archived Employees",
  },
  {
    id: "ratings",
    label: "Ratings",
  },
  {
    id: "reports",
    label: "Reports",
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


const formatPosition = (
  value
) => {
  const cleaned =
    String(
      value || ""
    )
      .replace(
        /_/g,
        " "
      )
      .trim();

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


const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return displayValue(value);
  }

  return parsed.toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }
  );
};


const statusBadgeClass = (
  status
) => {
  const normalized =
    String(
      status || ""
    )
      .trim()
      .toLowerCase();

  if (
    normalized ===
    "active"
  ) {
    return `
      bg-emerald-50
      text-emerald-700
      border-emerald-200
    `;
  }

  if (
    normalized ===
    "archived"
  ) {
    return `
      bg-amber-50
      text-amber-700
      border-amber-200
    `;
  }

  if (
    normalized ===
    "deactivated"
  ) {
    return `
      bg-red-50
      text-red-700
      border-red-200
    `;
  }

  return `
    bg-gray-100
    text-gray-600
    border-gray-200
  `;
};


// ============================================================
// OWNER MODAL
// ============================================================

const MillerOwnerModal = ({
  isOpen,
  owner,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !owner) {
    return null;
  }

  const personal = owner.personal_information || {};
  const address = owner.personal_address || {};
  const account = owner.account_information || {};
  const business = owner.business_information || {};
  const documents = owner.documents || {};

  const fullName = [
    personal.first_name,
    personal.middle_initial,
    personal.last_name,
    personal.suffix,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(" ") || "Miller Owner";

  const fullAddress = (addr = {}) =>
    [
      addr.street_address,
      addr.barangay,
      addr.municipality,
      addr.province,
      addr.postal_code,
    ]
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .join(", ") || "Not provided";

  const documentRows = [
    {
      label: "Valid Government-Issued ID",
      document: documents.government_issued_id,
    },
    {
      label: "Mayor's / Business Permit",
      document: documents.business_permit,
    },
    {
      label: "DTI / SEC / CDA Registration",
      document: documents.business_registration,
    },
    {
      label: "BPI / NFA / Milling License",
      document: documents.milling_license,
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="flex max-h-[calc(100vh-40px)] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#08751e]">
              Miller Account
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              Owner Information
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Registered Miller / Supplier and business information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close owner details"
          >
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50/60 p-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-extrabold text-slate-800">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Full Name</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-700">{fullName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Gender</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-700">{displayValue(personal.gender)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Username</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-700">{displayValue(account.username)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Email</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-700">{displayValue(account.email)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Contact Number</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-700">{displayValue(account.contact_number)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Account Status</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-700">{displayValue(owner.status)}</p>
              </div>
            </div>
            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Personal Address</p>
              <p className="mt-1 text-[13px] font-semibold text-slate-700">{fullAddress(address)}</p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-extrabold text-slate-800">
              Miller Business Information
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Business Name</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-700">{displayValue(business.business_name)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Organization Name</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-700">{displayValue(business.organization_name)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Official Email</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-700">{displayValue(business.official_email)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Official Contact Number</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-700">{displayValue(business.official_contact_number)}</p>
              </div>
            </div>
            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Business Address</p>
              <p className="mt-1 text-[13px] font-semibold text-slate-700">{fullAddress(business)}</p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-extrabold text-slate-800">
              Submitted Documents
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {documentRows.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                  {item.document?.url ? (
                    <a
                      href={item.document.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-[#08751e] transition hover:bg-emerald-50"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400">Unavailable</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


// ============================================================
// MILLER INFO
// ============================================================

const MillerInfo = () => {
  const {
    userId,
  } = useParams();

  const navigate =
    useNavigate();


  // =========================================================
  // MILLER API
  // =========================================================

  const {
    millerViewDetails,

    isViewDetailsLoading,

    isArchiving,
    isArchivingEmployee,
    isRestoringEmployee,
    isDeletingEmployee,

    getMillerViewDetails,

    archiveMiller,

    archiveMillerEmployee,
    restoreMillerEmployee,
    deleteMillerEmployee,
  } =
    useMillerManagement(
      "active"
    );


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
    activeTab,
    setActiveTab,
  ] =
    useState(
      "active-employees"
    );


  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");


  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(1);


  const [
    pageError,
    setPageError,
  ] =
    useState("");


  // =========================================================
  // OWNER MODAL
  // =========================================================

  const [
    ownerModal,
    setOwnerModal,
  ] =
    useState(false);


  // =========================================================
  // ACCOUNT ARCHIVE
  // =========================================================

  const [
    archiveAccountModal,
    setArchiveAccountModal,
  ] =
    useState(false);


  // =========================================================
  // EMPLOYEE ACTION STATE
  // =========================================================

  const [
    selectedEmployee,
    setSelectedEmployee,
  ] =
    useState(null);


  const [
    archiveEmployeeModal,
    setArchiveEmployeeModal,
  ] =
    useState(false);


  const [
    restoreEmployeeModal,
    setRestoreEmployeeModal,
  ] =
    useState(false);


  const [
    deleteEmployeeModal,
    setDeleteEmployeeModal,
  ] =
    useState(false);


  // =========================================================
  // LOAD MILLER
  // =========================================================

  useEffect(
    () => {
      if (!userId) {
        setPageError(
          "Miller account ID is missing."
        );

        return;
      }


      let mounted =
        true;


      const load =
        async () => {
          try {
            setPageError("");

            await getMillerViewDetails(
              userId
            );

          } catch (
            requestError
          ) {
            if (!mounted) {
              return;
            }

            setPageError(
              requestError?.message ||
              "Unable to load Miller information."
            );
          }
        };


      load();


      return () => {
        mounted =
          false;
      };
    },
    [
      userId,
      getMillerViewDetails,
    ]
  );


  // =========================================================
  // DATA
  // =========================================================

  const overview =
    millerViewDetails
      ?.overview ||
    {};


  const owner =
    millerViewDetails
      ?.owner ||
    null;


  const activeEmployees =
    Array.isArray(
      millerViewDetails
        ?.active_employees
    )
      ? millerViewDetails
          .active_employees
      : [];


  const archivedEmployees =
    Array.isArray(
      millerViewDetails
        ?.archived_employees
    )
      ? millerViewDetails
          .archived_employees
      : [];


  const ratings =
    Array.isArray(
      millerViewDetails
        ?.ratings
    )
      ? millerViewDetails
          .ratings
      : [];


  const reports =
    Array.isArray(
      millerViewDetails
        ?.reports
    )
      ? millerViewDetails
          .reports
      : [];


  const businessName =
    overview.business_name ||
    owner
      ?.business_information
      ?.business_name ||
    "Miller Account";


  const organizationName =
    overview.organization_name ||
    owner
      ?.business_information
      ?.organization_name ||
    "";


  const accountStatus =
    overview.status ||
    owner?.status ||
    "";


  // =========================================================
  // SUMMARY
  // =========================================================

  const activeEmployeeCount =
    Number(
      overview
        ?.active_employee_count ??
      activeEmployees.length
    );


  const archivedEmployeeCount =
    Number(
      overview
        ?.archived_employee_count ??
      archivedEmployees.length
    );


  const ratingCount =
    Number(
      overview
        ?.rating_count ??
      ratings.length
    );


  const reportCount =
    Number(
      overview
        ?.report_count ??
      reports.length
    );


  // =========================================================
  // ARCHIVE MILLER
  // =========================================================

  const confirmArchiveAccount =
    async (
      reason
    ) => {
      try {
        await archiveMiller(
          userId,
          reason
        );


        setArchiveAccountModal(
          false
        );


        showToast({
          type:
            "success",

          title:
            "Miller Account Archived",

          message:
            "The Miller account was archived successfully.",

          duration:
            5000,
        });


        navigate(
          "/admin/suppliers"
        );

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
            "The Miller account could not be archived.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // EMPLOYEE ARCHIVE
  // =========================================================

  const handleArchiveEmployee =
    (
      employee
    ) => {
      setSelectedEmployee(
        employee
      );

      setArchiveEmployeeModal(
        true
      );
    };


  const confirmArchiveEmployee =
    async (
      reason
    ) => {
      if (
        !selectedEmployee
          ?.employee_id
      ) {
        return;
      }


      try {
        await archiveMillerEmployee(
          userId,
          selectedEmployee.employee_id,
          reason
        );


        setArchiveEmployeeModal(
          false
        );

        setSelectedEmployee(
          null
        );


        showToast({
          type:
            "success",

          title:
            "Employee Archived",

          message:
            "The Miller employee account was archived successfully.",

          duration:
            4500,
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
            "The employee account could not be archived.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // EMPLOYEE RESTORE
  // =========================================================

  const handleRestoreEmployee =
    (
      employee
    ) => {
      setSelectedEmployee(
        employee
      );

      setRestoreEmployeeModal(
        true
      );
    };


  const confirmRestoreEmployee =
    async () => {
      if (
        !selectedEmployee
          ?.employee_id
      ) {
        return;
      }


      try {
        await restoreMillerEmployee(
          userId,
          selectedEmployee.employee_id
        );


        setRestoreEmployeeModal(
          false
        );

        setSelectedEmployee(
          null
        );


        showToast({
          type:
            "success",

          title:
            "Employee Restored",

          message:
            "The employee account is active again.",

          duration:
            4500,
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
            "The employee account could not be restored.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // EMPLOYEE DELETE
  // =========================================================

  const handleDeleteEmployee =
    (
      employee
    ) => {
      setSelectedEmployee(
        employee
      );

      setDeleteEmployeeModal(
        true
      );
    };


  const confirmDeleteEmployee =
    async () => {
      if (
        !selectedEmployee
          ?.employee_id
      ) {
        return;
      }


      try {
        await deleteMillerEmployee(
          userId,
          selectedEmployee.employee_id
        );


        setDeleteEmployeeModal(
          false
        );

        setSelectedEmployee(
          null
        );


        showToast({
          type:
            "success",

          title:
            "Employee Deleted",

          message:
            "The employee account was permanently deleted.",

          duration:
            4500,
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
            "The employee account could not be permanently deleted.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // ACTIVE EMPLOYEE COLUMNS
  // =========================================================

  const activeEmployeeColumns =
    useMemo(
      () => [
        {
          key:
            "employee_name",

          label:
            "Employee Name",

          width:
            "20%",
        },

        {
          key:
            "position",

          label:
            "Position",

          width:
            "18%",

          render:
            (row) =>
              formatPosition(
                row.position
              ),
        },

        {
          key:
            "email",

          label:
            "Email",

          width:
            "23%",
        },

        {
          key:
            "contact_number",

          label:
            "Contact",

          width:
            "17%",
        },

        {
          key:
            "status",

          label:
            "Status",

          width:
            "10%",

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
                  ${statusBadgeClass(
                    row.status
                  )}
                `}
              >
                {
                  formatPosition(
                    row.status
                  )
                }
              </span>
            ),
        },

        {
          key:
            "action",

          label:
            "Action",

          width:
            "12%",

          cellClassName:
            "text-center",

          render:
            (row) => (
              <button
                type="button"
                onClick={() =>
                  handleArchiveEmployee(
                    row
                  )
                }
                className="
                  rounded-lg
                  bg-amber-500
                  px-4
                  py-1.5
                  text-[11px]
                  font-semibold
                  text-white
                  transition
                  hover:bg-amber-600
                "
              >
                Archive
              </button>
            ),
        },
      ],
      []
    );


  // =========================================================
  // ARCHIVED EMPLOYEE COLUMNS
  // =========================================================

  const archivedEmployeeColumns =
    useMemo(
      () => [
        {
          key:
            "employee_name",

          label:
            "Employee Name",

          width:
            "18%",
        },

        {
          key:
            "position",

          label:
            "Position",

          width:
            "15%",

          render:
            (row) =>
              formatPosition(
                row.position
              ),
        },

        {
          key:
            "email",

          label:
            "Email",

          width:
            "20%",
        },

        {
          key:
            "archive_reason",

          label:
            "Archive Reason",

          width:
            "22%",

          render:
            (row) =>
              displayValue(
                row.archive_reason,
                "No reason recorded"
              ),
        },

        {
          key:
            "status",

          label:
            "Status",

          width:
            "10%",

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
                  ${statusBadgeClass(
                    row.status
                  )}
                `}
              >
                {
                  formatPosition(
                    row.status
                  )
                }
              </span>
            ),
        },

        {
          key:
            "action",

          label:
            "Action",

          width:
            "15%",

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
                    handleRestoreEmployee(
                      row
                    )
                  }
                  className="
                    rounded-lg
                    bg-[#08511f]
                    px-3
                    py-1.5
                    text-[11px]
                    font-semibold
                    text-white
                  "
                >
                  Restore
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteEmployee(
                      row
                    )
                  }
                  className="
                    rounded-lg
                    bg-red-600
                    px-3
                    py-1.5
                    text-[11px]
                    font-semibold
                    text-white
                  "
                >
                  Delete
                </button>
              </div>
            ),
        },
      ],
      []
    );


  // =========================================================
  // RATINGS COLUMNS
  // =========================================================

  const ratingsColumns =
    useMemo(
      () => [
        {
          key:
            "reviewer_name",

          label:
            "Reviewer",

          width:
            "22%",
        },

        {
          key:
            "reviewer_role",

          label:
            "Role",

          width:
            "16%",

          render:
            (row) =>
              formatPosition(
                row.reviewer_role
              ),
        },

        {
          key:
            "rating",

          label:
            "Rating",

          width:
            "12%",

          render:
            (row) =>
              `${Number(
                row.rating || 0
              ).toFixed(1)} / 5`,
        },

        {
          key:
            "comment",

          label:
            "Comment",

          width:
            "35%",

          render:
            (row) =>
              displayValue(
                row.comment,
                "No comment"
              ),
        },

        {
          key:
            "created_at",

          label:
            "Date",

          width:
            "15%",

          render:
            (row) =>
              formatDate(
                row.created_at
              ),
        },
      ],
      []
    );


  // =========================================================
  // REPORT COLUMNS
  // =========================================================

  const reportColumns =
    useMemo(
      () => [
        {
          key:
            "reported_by",

          label:
            "Reported By",

          width:
            "20%",
        },

        {
          key:
            "category",

          label:
            "Category",

          width:
            "16%",

          render:
            (row) =>
              formatPosition(
                row.category
              ),
        },

        {
          key:
            "description",

          label:
            "Description",

          width:
            "34%",
        },

        {
          key:
            "status",

          label:
            "Status",

          width:
            "15%",

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
                  ${statusBadgeClass(
                    row.status
                  )}
                `}
              >
                {
                  formatPosition(
                    row.status
                  )
                }
              </span>
            ),
        },

        {
          key:
            "created_at",

          label:
            "Date",

          width:
            "15%",

          render:
            (row) =>
              formatDate(
                row.created_at
              ),
        },
      ],
      []
    );


  // =========================================================
  // ACTIVE TAB ROWS
  // =========================================================

  const currentRows =
    useMemo(
      () => {
        let source =
          [];

        if (
          activeTab ===
          "active-employees"
        ) {
          source =
            activeEmployees;
        }

        if (
          activeTab ===
          "archived-employees"
        ) {
          source =
            archivedEmployees;
        }

        if (
          activeTab ===
          "ratings"
        ) {
          source =
            ratings;
        }

        if (
          activeTab ===
          "reports"
        ) {
          source =
            reports;
        }


        const query =
          searchQuery
            .trim()
            .toLowerCase();


        if (!query) {
          return source;
        }


        return source.filter(
          (row) =>
            Object.values(
              row || {}
            ).some(
              (value) =>
                String(
                  value ?? ""
                )
                  .toLowerCase()
                  .includes(
                    query
                  )
            )
        );
      },
      [
        activeTab,
        activeEmployees,
        archivedEmployees,
        ratings,
        reports,
        searchQuery,
      ]
    );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        currentRows.length /
        ITEMS_PER_PAGE
      )
    );


  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );


  const displayedRows =
    useMemo(
      () => {
        const start =
          (
            safeCurrentPage -
            1
          ) *
          ITEMS_PER_PAGE;

        return currentRows.slice(
          start,
          start +
          ITEMS_PER_PAGE
        );
      },
      [
        currentRows,
        safeCurrentPage,
      ]
    );


  const tableColumns =
    activeTab ===
    "active-employees"
      ? activeEmployeeColumns

      : activeTab ===
        "archived-employees"
        ? archivedEmployeeColumns

        : activeTab ===
          "ratings"
          ? ratingsColumns

          : reportColumns;


  const sections = [
    {
      rows:
        displayedRows,
    },
  ];


  // =========================================================
  // TABS
  // =========================================================

  const tabs =
    DETAIL_TABS.map(
      (tab) => {
        let count = 0;

        if (
          tab.id ===
          "active-employees"
        ) {
          count =
            activeEmployeeCount;
        }

        if (
          tab.id ===
          "archived-employees"
        ) {
          count =
            archivedEmployeeCount;
        }

        if (
          tab.id ===
          "ratings"
        ) {
          count =
            ratingCount;
        }

        if (
          tab.id ===
          "reports"
        ) {
          count =
            reportCount;
        }

        return {
          ...tab,

          label: (
            <>
              <span>
                {tab.label}
              </span>

              <span
                className="
                  ml-2
                  inline-flex
                  min-w-[20px]
                  items-center
                  justify-center
                  rounded-full
                  bg-emerald-100
                  px-1.5
                  py-0.5
                  text-[10px]
                  font-semibold
                  text-emerald-700
                "
              >
                {count}
              </span>
            </>
          ),
        };
      }
    );


  // =========================================================
  // LOADING
  // =========================================================

  if (
    isViewDetailsLoading &&
    !millerViewDetails
  ) {
    return (
      <>
        <Breadcrumbs
          items={[
            {
              label:
                "Management",

              path:
                "/admin/suppliers",
            },

            {
              label:
                "Miller Management",

              path:
                "/admin/suppliers",
            },

            {
              label:
                "View Details",
            },
          ]}
        />

        <div
          className="
            mt-6
            flex
            min-h-[400px]
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
              Loading Miller information...
            </p>
          </div>
        </div>
      </>
    );
  }


  // =========================================================
  // ERROR
  // =========================================================

  if (
    pageError &&
    !millerViewDetails
  ) {
    return (
      <>
        <Breadcrumbs
          items={[
            {
              label:
                "Management",

              path:
                "/admin/suppliers",
            },

            {
              label:
                "Miller Management",

              path:
                "/admin/suppliers",
            },

            {
              label:
                "View Details",
            },
          ]}
        />

        <div
          className="
            mt-6
            rounded-xl
            border
            border-red-200
            bg-red-50
            p-5
          "
        >
          <p
            className="
              font-semibold
              text-red-700
            "
          >
            Unable to load Miller information.
          </p>

          <p
            className="
              mt-1
              text-sm
              text-red-600
            "
          >
            {pageError}
          </p>
        </div>
      </>
    );
  }


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


      {/* =====================================================
          BREADCRUMBS
      ===================================================== */}

      <Breadcrumbs
        items={[
          {
            label:
              "Management",

            path:
              "/admin/suppliers",
          },

          {
            label:
              "Miller Management",

            path:
              "/admin/suppliers",
          },

          {
            label:
              businessName,
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
          flex
          flex-col
          gap-4
          lg:flex-row
          lg:items-start
          lg:justify-between
        "
      >
        <div>
          <div
            className="
              flex
              items-center
              gap-3
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
              {businessName}
            </h1>

            <span
              className={`
                inline-flex
                rounded-full
                border
                px-3
                py-1
                text-[11px]
                font-semibold
                ${statusBadgeClass(
                  accountStatus
                )}
              `}
            >
              {
                formatPosition(
                  accountStatus
                )
              }
            </span>
          </div>

          <p
            className="
              mt-1
              text-sm
              text-gray-500
            "
          >
            {
              organizationName
                ? `${organizationName} • `
                : ""
            }
            Miller account information, employees, ratings, and reports.
          </p>
        </div>


        <div
          className="
            flex
            flex-wrap
            gap-2
          "
        >
          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/suppliers"
              )
            }
            className="
              rounded-lg
              border
              border-gray-300
              bg-white
              px-4
              py-2
              text-xs
              font-semibold
              text-gray-600
              transition
              hover:bg-gray-50
            "
          >
            Back
          </button>


          <button
            type="button"
            onClick={() =>
              setOwnerModal(
                true
              )
            }
            className="
              rounded-lg
              border
              border-emerald-300
              bg-white
              px-4
              py-2
              text-xs
              font-semibold
              text-[#08511f]
              transition
              hover:bg-emerald-50
            "
          >
            View Owner
          </button>


          {
            String(
              accountStatus
            )
              .toLowerCase() ===
              "active" && (
              <button
                type="button"
                onClick={() =>
                  setArchiveAccountModal(
                    true
                  )
                }
                className="
                  rounded-lg
                  bg-amber-500
                  px-4
                  py-2
                  text-xs
                  font-semibold
                  text-white
                  transition
                  hover:bg-amber-600
                "
              >
                Archive Account
              </button>
            )
          }
        </div>
      </div>


      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <div
        className="
          mb-6
          grid
          grid-cols-1
          gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-5
          "
        >
          <p
            className="
              text-xs
              font-semibold
              uppercase
              text-gray-400
            "
          >
            Active Employees
          </p>

          <p
            className="
              mt-2
              text-2xl
              font-bold
              text-gray-900
            "
          >
            {activeEmployeeCount}
          </p>

          <p
            className="
              mt-1
              text-xs
              text-gray-500
            "
          >
            Currently active accounts
          </p>
        </div>


        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-5
          "
        >
          <p
            className="
              text-xs
              font-semibold
              uppercase
              text-gray-400
            "
          >
            Archived Employees
          </p>

          <p
            className="
              mt-2
              text-2xl
              font-bold
              text-gray-900
            "
          >
            {archivedEmployeeCount}
          </p>

          <p
            className="
              mt-1
              text-xs
              text-gray-500
            "
          >
            Archived employee accounts
          </p>
        </div>


        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-5
          "
        >
          <p
            className="
              text-xs
              font-semibold
              uppercase
              text-gray-400
            "
          >
            Ratings
          </p>

          <p
            className="
              mt-2
              text-2xl
              font-bold
              text-gray-900
            "
          >
            {
              Number(
                overview.average_rating ||
                0
              ).toFixed(1)
            }
          </p>

          <p
            className="
              mt-1
              text-xs
              text-gray-500
            "
          >
            {ratingCount} rating(s)
          </p>
        </div>


        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-5
          "
        >
          <p
            className="
              text-xs
              font-semibold
              uppercase
              text-gray-400
            "
          >
            Reports
          </p>

          <p
            className="
              mt-2
              text-2xl
              font-bold
              text-gray-900
            "
          >
            {reportCount}
          </p>

          <p
            className="
              mt-1
              text-xs
              text-gray-500
            "
          >
            Submitted account reports
          </p>
        </div>
      </div>


      {/* =====================================================
          OVERVIEW
      ===================================================== */}

      <div
        className="
          mb-6
          rounded-xl
          border
          border-gray-200
          bg-white
          p-5
        "
      >
        <div
          className="
            mb-4
          "
        >
          <h2
            className="
              text-base
              font-bold
              text-gray-900
            "
          >
            Miller Overview
          </h2>

          <p
            className="
              mt-1
              text-xs
              text-gray-500
            "
          >
            General business and contact information.
          </p>
        </div>


        <div
          className="
            grid
            grid-cols-1
            gap-5
            md:grid-cols-2
            xl:grid-cols-4
          "
        >
          <div>
            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                text-gray-400
              "
            >
              Business Name
            </p>

            <p
              className="
                mt-1
                text-sm
                font-medium
                text-gray-800
              "
            >
              {
                displayValue(
                  overview.business_name
                )
              }
            </p>
          </div>


          <div>
            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                text-gray-400
              "
            >
              Organization Name
            </p>

            <p
              className="
                mt-1
                text-sm
                font-medium
                text-gray-800
              "
            >
              {
                displayValue(
                  overview.organization_name
                )
              }
            </p>
          </div>


          <div>
            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                text-gray-400
              "
            >
              Official Email
            </p>

            <p
              className="
                mt-1
                text-sm
                font-medium
                text-gray-800
              "
            >
              {
                displayValue(
                  overview.official_email
                )
              }
            </p>
          </div>


          <div>
            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                text-gray-400
              "
            >
              Official Contact
            </p>

            <p
              className="
                mt-1
                text-sm
                font-medium
                text-gray-800
              "
            >
              {
                displayValue(
                  overview
                    .official_contact_number
                )
              }
            </p>
          </div>
        </div>
      </div>


      {/* =====================================================
          TABS
      ===================================================== */}

      <Tabs
        tabs={
          tabs
        }
        activeTab={
          activeTab
        }
        onTabChange={(tabId) => {
          setActiveTab(
            tabId
          );

          setSearchQuery(
            ""
          );

          setCurrentPage(
            1
          );
        }}
      />


      {/* =====================================================
          SEARCH
      ===================================================== */}

      <div
        className="
          mt-4
          mb-4
          w-full
          max-w-sm
        "
      >
        <div
          className="
            relative
          "
        >
          <Search
            size={
              16
            }
            className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-gray-400
            "
          />

          <input
            type="text"
            value={
              searchQuery
            }
            onChange={(event) => {
              setSearchQuery(
                event.target.value
              );

              setCurrentPage(
                1
              );
            }}
            placeholder="Search records"
            className="
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
              outline-none
              focus:border-emerald-500
              focus:ring-1
              focus:ring-emerald-500
            "
          />
        </div>
      </div>


      {/* =====================================================
          TABLE
      ===================================================== */}

      <SectionedTableCard
        columns={
          tableColumns
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
        onPageChange={(page) =>
          setCurrentPage(
            page
          )
        }
        footerLabel={
          `Showing ${
            currentRows.length ===
            0
              ? 0
              : (
                  safeCurrentPage -
                  1
                ) *
                  ITEMS_PER_PAGE +
                1
          }-${Math.min(
            safeCurrentPage *
            ITEMS_PER_PAGE,
            currentRows.length
          )} of ${
            currentRows.length
          } records`
        }
      />


      {/* =====================================================
          VIEW OWNER
          CONFIRMED MILLER OWNER INFORMATION
      ===================================================== */}

      <MillerOwnerModal
        isOpen={
          ownerModal
        }
        onClose={() =>
          setOwnerModal(
            false
          )
        }
        owner={
          owner
        }
      />


      {/* =====================================================
          ARCHIVE MILLER ACCOUNT
      ===================================================== */}

      <ArchiveAccountModal
        isOpen={
          archiveAccountModal
        }
        onClose={() => {
          if (
            isArchiving
          ) {
            return;
          }

          setArchiveAccountModal(
            false
          );
        }}
        onArchive={
          confirmArchiveAccount
        }
        accountName={
          businessName
        }
        accountType="Miller Account"
        isArchiving={
          isArchiving
        }
      />


      {/* =====================================================
          ARCHIVE EMPLOYEE
      ===================================================== */}

      <ArchiveAccountModal
        isOpen={
          archiveEmployeeModal
        }
        onClose={() => {
          if (
            isArchivingEmployee
          ) {
            return;
          }

          setArchiveEmployeeModal(
            false
          );

          setSelectedEmployee(
            null
          );
        }}
        onArchive={
          confirmArchiveEmployee
        }
        accountName={
          selectedEmployee
            ?.employee_name ||
          "this employee"
        }
        accountType="Miller Employee Account"
        isArchiving={
          isArchivingEmployee
        }
      />


      {/* =====================================================
          RESTORE EMPLOYEE
      ===================================================== */}

      <AccountActionConfirmModal
        isOpen={
          restoreEmployeeModal
        }
        title="Restore Miller Employee"
        message="This employee account will become active again and return to the Active Employees tab."
        accountName={
          selectedEmployee
            ?.employee_name ||
          ""
        }
        confirmText="Restore"
        variant="primary"
        isProcessing={
          isRestoringEmployee
        }
        onClose={() => {
          if (
            isRestoringEmployee
          ) {
            return;
          }

          setRestoreEmployeeModal(
            false
          );

          setSelectedEmployee(
            null
          );
        }}
        onConfirm={
          confirmRestoreEmployee
        }
      />


      {/* =====================================================
          DELETE EMPLOYEE
      ===================================================== */}

      <AccountActionConfirmModal
        isOpen={
          deleteEmployeeModal
        }
        title="Delete Miller Employee"
        message="This employee account will be permanently removed from GrainRise. This action cannot be undone."
        accountName={
          selectedEmployee
            ?.employee_name ||
          ""
        }
        confirmText="Delete"
        variant="danger"
        isProcessing={
          isDeletingEmployee
        }
        onClose={() => {
          if (
            isDeletingEmployee
          ) {
            return;
          }

          setDeleteEmployeeModal(
            false
          );

          setSelectedEmployee(
            null
          );
        }}
        onConfirm={
          confirmDeleteEmployee
        }
      />
    </>
  );
};


export default MillerInfo;