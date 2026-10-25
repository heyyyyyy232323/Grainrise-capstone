import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  ChevronDown,
  Star,
  Users,
  Archive,
  Flag,
  Search,
  X,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Tabs from "../../../Components/Minor-Components/Tabs";
import Toast from "../../../Components/Modals/Toast";

import ArchiveAccountModal from "../../../Components/Modals/ArchiveAccountModal";
import AccountActionConfirmModal from "../../../Components/Modals/AccountActionConfirmModal";

import useToast from "../../../Components/hooks/useToast";
import useWarehouseManagement from "../../../Components/hooks/AccountAdmin/useWarehouseManagement";


const ITEMS_PER_PAGE = 10;


// ============================================================
// TABS
// ============================================================

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

  return (
    cleaned ||
    fallback
  );
};


const formatLabel = (
  value
) => {
  const cleaned =
    String(
      value || ""
    ).trim();

  if (!cleaned) {
    return "—";
  }

  return cleaned
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};


const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return displayValue(
      value
    );
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
};


const formatAddress = (
  data = {}
) => {
  const parts = [
    data.street_address,
    data.barangay,
    data.municipality,
    data.province,
    data.postal_code,
  ]
    .map(
      (item) =>
        String(
          item || ""
        ).trim()
    )
    .filter(
      Boolean
    );

  return (
    parts.join(", ") ||
    "—"
  );
};


const buildOwnerName = (
  owner = {}
) => {
  const personal =
    owner?.personal_information ||
    {};

  const parts = [
    personal.first_name,
    personal.middle_initial,
    personal.last_name,
    personal.suffix,
  ]
    .map(
      (item) =>
        String(
          item || ""
        ).trim()
    )
    .filter(
      Boolean
    );

  return (
    parts.join(" ") ||
    "Warehouse Manager"
  );
};


const normalizeEmployee = (
  employee
) => ({
  id:
    employee?.employee_id,

  warehouseProfileId:
    employee?.warehouse_profile_id,

  name:
    employee?.employee_name ||
    "",

  role:
    employee?.position ||
    "",

  email:
    employee?.email ||
    "",

  contact:
    employee?.contact_number ||
    "",

  status:
    employee?.status ||
    "",

  dateAdded:
    employee?.created_at ||
    null,

  archiveReason:
    employee?.archive_reason ||
    "",

  archivedAt:
    employee?.archived_at ||
    null,
});


const normalizeRating = (
  rating
) => ({
  id:
    rating?.rating_id,

  warehouseProfileId:
    rating?.warehouse_profile_id,

  reviewer:
    rating?.reviewer_name ||
    "",

  reviewerRole:
    rating?.reviewer_role ||
    "",

  email:
    rating?.reviewer_email ||
    "",

  rating:
    Number(
      rating?.rating ||
      0
    ),

  comment:
    rating?.comment ||
    "",

  createdAt:
    rating?.created_at ||
    null,
});


const normalizeReport = (
  report
) => ({
  id:
    report?.report_id,

  warehouseProfileId:
    report?.warehouse_profile_id,

  reportedBy:
    report?.reported_by ||
    "",

  reporterRole:
    report?.reporter_role ||
    "",

  reporterEmail:
    report?.reporter_email ||
    "",

  category:
    report?.category ||
    "",

  description:
    report?.description ||
    "",

  status:
    report?.status ||
    "",

  createdAt:
    report?.created_at ||
    null,

  updatedAt:
    report?.updated_at ||
    null,
});


// ============================================================
// SUMMARY CARD
// ============================================================

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  helper,
}) => (
  <div
    className="
      rounded-xl
      border
      border-slate-200
      bg-white
      p-5
      shadow-sm
    "
  >
    <div
      className="
        flex
        items-center
        justify-between
        gap-4
      "
    >
      <div
        className="
          min-w-0
        "
      >
        <p
          className="
            text-xs
            font-semibold
            text-slate-500
          "
        >
          {label}
        </p>

        <p
          className="
            mt-2
            text-2xl
            font-extrabold
            text-slate-900
          "
        >
          {value}
        </p>

        {helper && (
          <p
            className="
              mt-1
              text-[11px]
              text-slate-400
            "
          >
            {helper}
          </p>
        )}
      </div>

      <div
        className="
          flex
          h-11
          w-11
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-emerald-50
          text-[#08751e]
        "
      >
        <Icon
          size={20}
        />
      </div>
    </div>
  </div>
);


// ============================================================
// INFO FIELD
// ============================================================

const InfoField = ({
  label,
  value,
}) => (
  <div>
    <p
      className="
        text-[10px]
        font-bold
        uppercase
        tracking-wide
        text-slate-400
      "
    >
      {label}
    </p>

    <p
      className="
        mt-1
        break-words
        text-[13px]
        font-semibold
        text-slate-700
      "
    >
      {displayValue(
        value
      )}
    </p>
  </div>
);


// ============================================================
// OWNER MODAL
// ============================================================

const WarehouseOwnerModal = ({
  isOpen,
  owner,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    isOpen,
  ]);


  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown =
      (event) => {
        if (
          event.key ===
          "Escape"
        ) {
          onClose?.();
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isOpen,
    onClose,
  ]);


  if (
    !isOpen ||
    !owner
  ) {
    return null;
  }


  const personal =
    owner.personal_information ||
    {};

  const address =
    owner.personal_address ||
    {};

  const account =
    owner.account_information ||
    {};

  const business =
    owner.business_information ||
    {};

  const documents =
    owner.documents ||
    {};


  const documentRows = [
    {
      label:
        "Valid Government-Issued ID",

      document:
        documents.government_issued_id,
    },
    {
      label:
        "Mayor's / Business Permit",

      document:
        documents.business_permit,
    },
    {
      label:
        "DTI / SEC / CDA Registration",

      document:
        documents.business_registration,
    },
    {
      label:
        "BPI License to Operate / Warehouse License",

      document:
        documents.warehouse_license,
    },
  ];


  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-slate-950/55
        p-4
      "
    >
      <div
        className="
          flex
          max-h-[calc(100vh-40px)]
          w-full
          max-w-[900px]
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
        "
      >
        <div
          className="
            flex
            items-start
            justify-between
            gap-4
            border-b
            border-slate-200
            px-6
            py-5
          "
        >
          <div>
            <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-wide
                text-[#08751e]
              "
            >
              Warehouse Account
            </p>

            <h2
              className="
                mt-1
                text-xl
                font-extrabold
                text-slate-900
              "
            >
              Owner Information
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              Registered Warehouse Manager and business information.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              border
              border-slate-200
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
            "
          >
            <X
              size={17}
            />
          </button>
        </div>


        <div
          className="
            min-h-0
            flex-1
            space-y-5
            overflow-y-auto
            bg-slate-50/60
            p-6
          "
        >
          <section
            className="
              rounded-xl
              border
              border-slate-200
              bg-white
              p-5
            "
          >
            <h3
              className="
                mb-4
                text-sm
                font-extrabold
                text-slate-800
              "
            >
              Personal Information
            </h3>

            <div
              className="
                grid
                grid-cols-1
                gap-5
                sm:grid-cols-2
                lg:grid-cols-3
              "
            >
              <InfoField
                label="Full Name"
                value={
                  buildOwnerName(
                    owner
                  )
                }
              />

              <InfoField
                label="Gender"
                value={
                  formatLabel(
                    personal.gender
                  )
                }
              />

              <InfoField
                label="Username"
                value={
                  account.username
                }
              />

              <InfoField
                label="Email"
                value={
                  account.email
                }
              />

              <InfoField
                label="Contact Number"
                value={
                  account.contact_number
                }
              />

              <InfoField
                label="Account Status"
                value={
                  formatLabel(
                    owner.status
                  )
                }
              />
            </div>

            <div
              className="
                mt-5
              "
            >
              <InfoField
                label="Personal Address"
                value={
                  formatAddress(
                    address
                  )
                }
              />
            </div>
          </section>


          <section
            className="
              rounded-xl
              border
              border-slate-200
              bg-white
              p-5
            "
          >
            <h3
              className="
                mb-4
                text-sm
                font-extrabold
                text-slate-800
              "
            >
              Warehouse Information
            </h3>

            <div
              className="
                grid
                grid-cols-1
                gap-5
                sm:grid-cols-2
              "
            >
              <InfoField
                label="Business Name"
                value={
                  business.business_name
                }
              />

              <InfoField
                label="Organization Name"
                value={
                  business.organization_name
                }
              />

              <InfoField
                label="Official Email"
                value={
                  business.official_email
                }
              />

              <InfoField
                label="Official Contact Number"
                value={
                  business.official_contact_number
                }
              />
            </div>

            <div
              className="
                mt-5
              "
            >
              <InfoField
                label="Warehouse Address"
                value={
                  formatAddress(
                    business
                  )
                }
              />
            </div>
          </section>


          <section
            className="
              rounded-xl
              border
              border-slate-200
              bg-white
              p-5
            "
          >
            <h3
              className="
                mb-4
                text-sm
                font-extrabold
                text-slate-800
              "
            >
              Submitted Documents
            </h3>

            <div
              className="
                grid
                grid-cols-1
                gap-3
                sm:grid-cols-2
              "
            >
              {documentRows.map(
                (
                  item
                ) => (
                  <div
                    key={
                      item.label
                    }
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                      rounded-lg
                      border
                      border-slate-200
                      bg-slate-50
                      p-4
                    "
                  >
                    <p
                      className="
                        text-xs
                        font-semibold
                        text-slate-700
                      "
                    >
                      {item.label}
                    </p>

                    {item.document
                      ?.url ? (
                      <a
                        href={
                          item.document
                            .url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="
                          shrink-0
                          rounded-lg
                          border
                          border-emerald-200
                          bg-white
                          px-3
                          py-2
                          text-[11px]
                          font-bold
                          text-[#08751e]
                          transition
                          hover:bg-emerald-50
                        "
                      >
                        View
                      </a>
                    ) : (
                      <span
                        className="
                          text-[11px]
                          text-slate-400
                        "
                      >
                        Unavailable
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          </section>
        </div>


        <div
          className="
            flex
            justify-end
            border-t
            border-slate-200
            px-6
            py-4
          "
        >
          <button
            type="button"
            onClick={
              onClose
            }
            className="
              rounded-lg
              border
              border-slate-300
              bg-white
              px-5
              py-2
              text-xs
              font-bold
              text-slate-600
              transition
              hover:bg-slate-50
            "
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
// REPORT DETAILS MODAL
// ============================================================

const ReportDetailsModal = ({
  isOpen,
  report,
  onClose,
  onResolve,
}) => {
  const [isResolving, setIsResolving] = useState(false);
  if (
    !isOpen ||
    !report
  ) {
    return null;
  }


  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-slate-950/55
        p-4
      "
    >
      <div
        className="
          w-full
          max-w-xl
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >
        <div
          className="
            flex
            items-start
            justify-between
            border-b
            border-slate-200
            px-6
            py-5
          "
        >
          <div>
            <h2
              className="
                text-lg
                font-extrabold
                text-slate-900
              "
            >
              Report Details
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              Report submitted against this warehouse account.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              border
              border-slate-200
              text-slate-400
            "
          >
            <X
              size={17}
            />
          </button>
        </div>

        <div
          className="
            space-y-5
            p-6
          "
        >
          <div
            className="
              grid
              grid-cols-1
              gap-5
              sm:grid-cols-2
            "
          >
            <InfoField
              label="Reported By"
              value={
                report.reportedBy
              }
            />

            <InfoField
              label="Reporter Role"
              value={
                formatLabel(
                  report.reporterRole
                )
              }
            />

            <InfoField
              label="Category"
              value={
                report.category
              }
            />

            <InfoField
              label="Status"
              value={
                formatLabel(
                  report.status
                )
              }
            />

            <InfoField
              label="Date Submitted"
              value={
                formatDate(
                  report.createdAt
                )
              }
            />
          </div>

          <div>
            <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-wide
                text-slate-400
              "
            >
              Description
            </p>

            <div
              className="
                mt-2
                rounded-lg
                border
                border-slate-200
                bg-slate-50
                p-4
                text-sm
                leading-6
                text-slate-700
              "
            >
              {displayValue(
                report.description
              )}
            </div>
          </div>
        </div>

        <div
          className="
            flex
            justify-end
            border-t
            border-slate-200
            px-6
            py-4
          "
        >
          <button
            type="button"
            onClick={
              onClose
            }
            className="
              rounded-lg
              border
              border-slate-300
              px-5
              py-2
              text-xs
              font-bold
              text-slate-600
            "
          >
            Close
          </button>

          {(report?.status || "").toLowerCase() === "pending" && onResolve && (
            <button
              type="button"
              disabled={isResolving}
              onClick={async () => {
                setIsResolving(true);
                try {
                  await onResolve(report.id);
                  onClose();
                } finally {
                  setIsResolving(false);
                }
              }}
              className="
                rounded-lg
                bg-[#08511f]
                px-5
                py-2
                text-xs
                font-bold
                text-white
                hover:bg-[#063f18]
                transition-colors
                disabled:opacity-50
                cursor-pointer
              "
            >
              {isResolving ? "Resolving..." : "Resolve Report"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};


// ============================================================
// WAREHOUSE INFO
// ============================================================

const WarehouseInfo = () => {
  const {
    userId,
  } = useParams();


  const navigate =
    useNavigate();


  const {
    warehouseViewDetails,
    isViewDetailsLoading,

    isArchiving,
    isArchivingEmployee,
    isRestoringEmployee,
    isDeletingEmployee,

    error,

    getWarehouseViewDetails,
    archiveWarehouse,
    archiveWarehouseEmployee,
    restoreWarehouseEmployee,
    deleteWarehouseEmployee,
    resolveWarehouseReport,
  } = useWarehouseManagement();

  const handleResolveReport = async (reportId) => {
    try {
      await resolveWarehouseReport(reportId);
      if (userId) {
        await getWarehouseViewDetails(userId);
      }
      showToast({
        type: "success",
        title: "Report Resolved",
        message: "Warehouse report marked as resolved successfully.",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Resolution Failed",
        message: err?.message || "Unable to resolve report.",
      });
    }
  };


  const {
    toasts,
    showToast,
    removeToast,
  } = useToast();


  // =========================================================
  // STATE
  // =========================================================

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "active-employees"
  );


  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);


  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");


  const [
    ownerModal,
    setOwnerModal,
  ] = useState(false);


  const [
    archiveAccountModal,
    setArchiveAccountModal,
  ] = useState(false);


  const [
    selectedEmployee,
    setSelectedEmployee,
  ] = useState(null);


  const [
    archiveEmployeeModal,
    setArchiveEmployeeModal,
  ] = useState(false);


  const [
    restoreEmployeeModal,
    setRestoreEmployeeModal,
  ] = useState(false);


  const [
    deleteEmployeeModal,
    setDeleteEmployeeModal,
  ] = useState(false);


  const [
    selectedReport,
    setSelectedReport,
  ] = useState(null);


  const [
    reportModal,
    setReportModal,
  ] = useState(false);


  // =========================================================
  // LOAD WAREHOUSE
  // =========================================================

  useEffect(() => {
    if (!userId) {
      return;
    }


    getWarehouseViewDetails(
      userId
    ).catch(() => {
      // Hook already stores the API error.
    });
  }, [
    userId,
    getWarehouseViewDetails,
  ]);


  // =========================================================
  // DATA
  // =========================================================

  const data =
    warehouseViewDetails ||
    {};


  const overview =
    data.overview ||
    {};


  const owner =
    data.owner ||
    null;


  const business =
    owner
      ?.business_information ||
    {};


  const warehouseProfiles = useMemo(() => {
    if (Array.isArray(data.profiles) && data.profiles.length > 0) {
      return data.profiles;
    }
    if (overview.warehouse_profile_id) {
      return [
        {
          warehouse_profile_id: overview.warehouse_profile_id,
          business_name: overview.business_name || business.business_name || "Warehouse",
          organization_name: overview.organization_name || business.organization_name || "",
          official_email: overview.official_email || business.official_email || "",
          official_contact_number: overview.official_contact_number || business.official_contact_number || "",
          province: overview.province || business.province || "",
          municipality: overview.municipality || business.municipality || "",
          barangay: overview.barangay || business.barangay || "",
          street_address: overview.street_address || business.street_address || "",
          postal_code: overview.postal_code || business.postal_code || "",
        },
      ];
    }
    return [];
  }, [data.profiles, overview, business]);


  const [
    selectedProfileId,
    setSelectedProfileId,
  ] = useState("");


  useEffect(() => {
    if (warehouseProfiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(
        String(warehouseProfiles[0].warehouse_profile_id)
      );
    }
  }, [warehouseProfiles, selectedProfileId]);


  const activeProfile = useMemo(() => {
    if (!warehouseProfiles.length) return null;
    return (
      warehouseProfiles.find(
        (p) =>
          String(p.warehouse_profile_id) ===
          String(selectedProfileId)
      ) || warehouseProfiles[0]
    );
  }, [warehouseProfiles, selectedProfileId]);


  const activeProfileAddress = useMemo(() => {
    if (!activeProfile) return "";
    return [
      activeProfile.street_address,
      activeProfile.barangay,
      activeProfile.municipality,
      activeProfile.province,
      activeProfile.postal_code,
    ]
      .filter(Boolean)
      .join(", ");
  }, [activeProfile]);


  const warehouseName =
    activeProfile?.business_name ||
    business.business_name ||
    overview.business_name ||
    "Warehouse";


  const organizationName =
    activeProfile?.organization_name ||
    business.organization_name ||
    overview.organization_name ||
    "";


  const activeEmployees =
    useMemo(
      () =>
        Array.isArray(
          data.active_employees
        )
          ? data.active_employees.map(
              normalizeEmployee
            )
          : [],
      [
        data.active_employees,
      ]
    );


  const archivedEmployees =
    useMemo(
      () =>
        Array.isArray(
          data.archived_employees
        )
          ? data.archived_employees.map(
              normalizeEmployee
            )
          : [],
      [
        data.archived_employees,
      ]
    );


  const ratings =
    useMemo(
      () =>
        Array.isArray(
          data.ratings
        )
          ? data.ratings.map(
              normalizeRating
            )
          : [],
      [
        data.ratings,
      ]
    );


  const reports =
    useMemo(
      () =>
        Array.isArray(
          data.reports
        )
          ? data.reports.map(
              normalizeReport
            )
          : [],
      [
        data.reports,
      ]
    );


  // =========================================================
  // PROFILE-SCOPED DATA
  // =========================================================

  const profileActiveEmployees = useMemo(() => {
    if (!selectedProfileId) return activeEmployees;
    return activeEmployees.filter((e) => {
      if (e.warehouseProfileId) {
        return String(e.warehouseProfileId) === String(selectedProfileId);
      }
      return true;
    });
  }, [activeEmployees, selectedProfileId]);


  const profileArchivedEmployees = useMemo(() => {
    if (!selectedProfileId) return archivedEmployees;
    return archivedEmployees.filter((e) => {
      if (e.warehouseProfileId) {
        return String(e.warehouseProfileId) === String(selectedProfileId);
      }
      return true;
    });
  }, [archivedEmployees, selectedProfileId]);


  const profileRatings = useMemo(() => {
    if (!selectedProfileId) return ratings;
    return ratings.filter((r) => {
      if (r.warehouseProfileId) {
        return String(r.warehouseProfileId) === String(selectedProfileId);
      }
      return true;
    });
  }, [ratings, selectedProfileId]);


  const profileReports = useMemo(() => {
    if (!selectedProfileId) return reports;
    return reports.filter((rep) => {
      if (rep.warehouseProfileId) {
        return String(rep.warehouseProfileId) === String(selectedProfileId);
      }
      return true;
    });
  }, [reports, selectedProfileId]);


  const profileAverageRating = useMemo(() => {
    if (profileRatings.length === 0) return 0;
    const total = profileRatings.reduce(
      (sum, r) => sum + (Number(r.rating) || 0),
      0
    );
    return total / profileRatings.length;
  }, [profileRatings]);


  const activeEmployeeCount = profileActiveEmployees.length;
  const archivedEmployeeCount = profileArchivedEmployees.length;
  const ratingCount = profileRatings.length;
  const reportCount = profileReports.length;


  // =========================================================
  // ACCOUNT ARCHIVE
  // =========================================================

  const confirmArchiveAccount =
    async (
      reason
    ) => {
      try {
        await archiveWarehouse(
          userId,
          reason
        );


        setArchiveAccountModal(
          false
        );


        showToast({
          type: "success",
          title:
            "Warehouse Account Archived",
          message:
            "The Warehouse Manager account was archived successfully.",
          duration:
            4500,
        });


        navigate(
          "/admin/warehouses"
        );

      } catch (
        requestError
      ) {
        showToast({
          type: "error",
          title:
            "Archive Failed",
          message:
            requestError?.message ||
            "The Warehouse account could not be archived.",
          duration:
            5000,
        });
      }
    };


  // =========================================================
  // EMPLOYEE ARCHIVE
  // =========================================================

  const confirmArchiveEmployee =
    async (
      reason
    ) => {
      if (
        !selectedEmployee
          ?.id
      ) {
        return;
      }


      try {
        await archiveWarehouseEmployee(
          userId,
          selectedEmployee.id,
          reason
        );


        setArchiveEmployeeModal(
          false
        );

        setSelectedEmployee(
          null
        );


        showToast({
          type: "success",
          title:
            "Employee Archived",
          message:
            "The employee account was archived successfully.",
          duration:
            4500,
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
            "The employee account could not be archived.",
          duration:
            5000,
        });
      }
    };


  // =========================================================
  // EMPLOYEE RESTORE
  // =========================================================

  const confirmRestoreEmployee =
    async () => {
      if (
        !selectedEmployee
          ?.id
      ) {
        return;
      }


      try {
        await restoreWarehouseEmployee(
          userId,
          selectedEmployee.id
        );


        setRestoreEmployeeModal(
          false
        );

        setSelectedEmployee(
          null
        );


        showToast({
          type: "success",
          title:
            "Employee Account Retrieved",
          message:
            "The employee account is active again.",
          duration:
            4500,
        });

      } catch (
        requestError
      ) {
        showToast({
          type: "error",
          title:
            "Retrieve Failed",
          message:
            requestError?.message ||
            "The employee account could not be retrieved.",
          duration:
            5000,
        });
      }
    };


  // =========================================================
  // EMPLOYEE DELETE
  // =========================================================

  const confirmDeleteEmployee =
    async () => {
      if (
        !selectedEmployee
          ?.id
      ) {
        return;
      }


      try {
        await deleteWarehouseEmployee(
          userId,
          selectedEmployee.id
        );


        setDeleteEmployeeModal(
          false
        );

        setSelectedEmployee(
          null
        );


        showToast({
          type: "success",
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
          type: "error",
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
  // SEARCH
  // =========================================================

  const query =
    searchQuery
      .trim()
      .toLowerCase();


  const searchedActiveEmployees =
    useMemo(
      () =>
        profileActiveEmployees.filter(
          (
            employee
          ) =>
            !query ||
            employee.name
              .toLowerCase()
              .includes(
                query
              ) ||
            employee.role
              .toLowerCase()
              .includes(
                query
              ) ||
            employee.email
              .toLowerCase()
              .includes(
                query
              )
        ),
      [
        profileActiveEmployees,
        query,
      ]
    );


  const searchedArchivedEmployees =
    useMemo(
      () =>
        profileArchivedEmployees.filter(
          (
            employee
          ) =>
            !query ||
            employee.name
              .toLowerCase()
              .includes(
                query
              ) ||
            employee.role
              .toLowerCase()
              .includes(
                query
              ) ||
            employee.archiveReason
              .toLowerCase()
              .includes(
                query
              )
        ),
      [
        profileArchivedEmployees,
        query,
      ]
    );


  const searchedRatings =
    useMemo(
      () =>
        profileRatings.filter(
          (
            rating
          ) =>
            !query ||
            rating.reviewer
              .toLowerCase()
              .includes(
                query
              ) ||
            rating.comment
              .toLowerCase()
              .includes(
                query
              )
        ),
      [
        profileRatings,
        query,
      ]
    );


  const searchedReports =
    useMemo(
      () =>
        profileReports.filter(
          (
            report
          ) =>
            !query ||
            report.reportedBy
              .toLowerCase()
              .includes(
                query
              ) ||
            report.category
              .toLowerCase()
              .includes(
                query
              ) ||
            report.description
              .toLowerCase()
              .includes(
                query
              )
        ),
      [
        profileReports,
        query,
      ]
    );


  // =========================================================
  // CURRENT ROWS
  // =========================================================

  const currentRows =
    activeTab ===
    "active-employees"
      ? searchedActiveEmployees

      : activeTab ===
          "archived-employees"
        ? searchedArchivedEmployees

        : activeTab ===
            "ratings"
          ? searchedRatings

          : searchedReports;


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


  const paginatedRows =
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


  // =========================================================
  // TABLE COLUMNS
  // =========================================================

  const columns =
    useMemo(
      () => {

        if (
          activeTab ===
          "active-employees"
        ) {
          return [
            {
              key: "name",
              label: "Employee Name",
              width: "20%",
            },
            {
              key: "role",
              label: "Role",
              width: "15%",
              render:
                (
                  row
                ) =>
                  formatLabel(
                    row.role
                  ),
            },
            {
              key: "email",
              label: "Email",
              width: "18%",
            },
            {
              key: "contact",
              label: "Contact",
              width: "14%",
            },
            {
              key: "status",
              label: "Status",
              width: "10%",
              render:
                () => (
                  <span
                    className="
                      rounded-full
                      bg-emerald-50
                      px-2.5
                      py-1
                      text-[10px]
                      font-bold
                      text-emerald-700
                    "
                  >
                    Active
                  </span>
                ),
            },
            {
              key: "dateAdded",
              label: "Date Added",
              width: "13%",
              render:
                (
                  row
                ) =>
                  formatDate(
                    row.dateAdded
                  ),
            },
            {
              key: "action",
              label: "Action",
              width: "10%",
              cellClassName:
                "text-center",
              render:
                (
                  row
                ) => (
                  <div
                    className="
                      flex
                      justify-center
                    "
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(
                          row
                        );

                        setArchiveEmployeeModal(
                          true
                        );
                      }}
                      className="
                        rounded-lg
                        bg-orange-500
                        px-4
                        py-2
                        text-xs
                        font-bold
                        text-white
                        transition
                        hover:bg-orange-600
                      "
                    >
                      Archive
                    </button>
                  </div>
                ),
            },
          ];
        }


        if (
          activeTab ===
          "archived-employees"
        ) {
          return [
            {
              key: "name",
              label: "Employee Name",
              width: "25%",
            },
            {
              key: "role",
              label: "Role",
              width: "20%",
              render:
                (
                  row
                ) =>
                  formatLabel(
                    row.role
                  ),
            },
            {
              key:
                "archiveReason",
              label:
                "Archive Reason",
              width:
                "30%",
              render:
                (
                  row
                ) => (
                  <p
                    className="
                      whitespace-normal
                      break-words
                      text-xs
                      leading-5
                      text-slate-600
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
              label: "Action",
              width: "25%",
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
                      onClick={() => {
                        setSelectedEmployee(
                          row
                        );

                        setRestoreEmployeeModal(
                          true
                        );
                      }}
                      className="
                        whitespace-nowrap
                        rounded-lg
                        bg-emerald-600
                        px-3
                        py-2
                        text-[11px]
                        font-bold
                        text-white
                        transition
                        hover:bg-emerald-700
                      "
                    >
                      Retrieve Account
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(
                          row
                        );

                        setDeleteEmployeeModal(
                          true
                        );
                      }}
                      className="
                        whitespace-nowrap
                        rounded-lg
                        bg-red-600
                        px-3
                        py-2
                        text-[11px]
                        font-bold
                        text-white
                        transition
                        hover:bg-red-700
                      "
                    >
                      Delete Permanently
                    </button>
                  </div>
                ),
            },
          ];
        }


        if (
          activeTab ===
          "ratings"
        ) {
          return [
            {
              key: "reviewer",
              label: "Reviewer",
              width: "22%",
            },
            {
              key: "reviewerRole",
              label: "Role",
              width: "16%",
              render:
                (
                  row
                ) =>
                  formatLabel(
                    row.reviewerRole
                  ),
            },
            {
              key: "rating",
              label: "Rating",
              width: "14%",
              render:
                (
                  row
                ) => (
                  <div
                    className="
                      flex
                      items-center
                      gap-1
                    "
                  >
                    <Star
                      size={14}
                      className="
                        fill-amber-400
                        text-amber-400
                      "
                    />

                    <span
                      className="
                        font-bold
                        text-slate-700
                      "
                    >
                      {row.rating}/5
                    </span>
                  </div>
                ),
            },
            {
              key: "comment",
              label: "Comment",
              width: "34%",
              render:
                (
                  row
                ) => (
                  <p
                    className="
                      whitespace-normal
                      break-words
                      text-xs
                      leading-5
                      text-slate-600
                    "
                  >
                    {displayValue(
                      row.comment,
                      "No comment"
                    )}
                  </p>
                ),
            },
            {
              key: "createdAt",
              label: "Date",
              width: "14%",
              render:
                (
                  row
                ) =>
                  formatDate(
                    row.createdAt
                  ),
            },
          ];
        }


        return [
          {
            key:
              "reportedBy",
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
              "20%",
          },
          {
            key:
              "status",
            label:
              "Status",
            width:
              "15%",
            render:
              (
                row
              ) => (
                <span
                  className="
                    rounded-full
                    bg-amber-50
                    px-2.5
                    py-1
                    text-[10px]
                    font-bold
                    text-amber-700
                  "
                >
                  {formatLabel(
                    row.status
                  )}
                </span>
              ),
          },
          {
            key:
              "createdAt",
            label:
              "Date",
            width:
              "15%",
            render:
              (
                row
              ) =>
                formatDate(
                  row.createdAt
                ),
          },
          {
            key: "action",
            label: "Action",
            width: "15%",
            cellClassName:
              "text-center",
            render:
              (
                row
              ) => (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReport(
                      row
                    );

                    setReportModal(
                      true
                    );
                  }}
                  className="
                    rounded-lg
                    border
                    border-slate-300
                    px-4
                    py-2
                    text-[11px]
                    font-semibold
                    text-slate-600
                    transition
                    hover:border-emerald-300
                    hover:text-emerald-700
                  "
                >
                  View Details
                </button>
              ),
          },
        ];
      },
      [
        activeTab,
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
    currentRows.length ===
    0
      ? 0
      : (
          safeCurrentPage -
          1
        ) *
          ITEMS_PER_PAGE +
        1;


  const lastVisible =
    currentRows.length ===
    0
      ? 0
      : Math.min(
          safeCurrentPage *
            ITEMS_PER_PAGE,
          currentRows.length
        );


  const tabs =
    DETAIL_TABS.map(
      (
        tab
      ) => {
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
                  min-w-5
                  items-center
                  justify-center
                  rounded-full
                  bg-slate-100
                  px-1.5
                  py-0.5
                  text-[10px]
                  font-bold
                  text-slate-600
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
    !warehouseViewDetails
  ) {
    return (
      <div
        className="
          flex
          min-h-[500px]
          items-center
          justify-center
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
              h-9
              w-9
              animate-spin
              rounded-full
              border-4
              border-slate-200
              border-t-[#08751e]
            "
          />

          <p
            className="
              text-sm
              font-semibold
              text-slate-700
            "
          >
            Loading warehouse details...
          </p>
        </div>
      </div>
    );
  }


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

            path:
              "/admin/warehouses",
          },
          {
            label:
              "View Details",
          },
        ]}
      />


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
        <div
          className="
            flex
            items-center
            gap-3
          "
        >
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl
              bg-emerald-50
              text-[#08751e]
            "
          >
            <Building2
              size={23}
            />
          </div>

          <div>
            <h1
              className="
                text-2xl
                font-bold
                text-gray-900
                md:text-3xl
              "
            >
              Warehouse Account Details
            </h1>

            <p
              className="
                mt-1
                text-sm
                text-gray-500
              "
            >
              Warehouse account details and employee management.
            </p>

            {warehouseProfiles.length > 0 && (
              <div className="mt-2.5 flex items-center gap-2">
                <label
                  htmlFor="warehouse-header-profile-select"
                  className="text-xs font-semibold text-gray-600 shrink-0"
                >
                  Warehouse:
                </label>
                <div className="relative min-w-[220px] max-w-xs">
                  <select
                    id="warehouse-header-profile-select"
                    value={
                      selectedProfileId ||
                      warehouseProfiles[0]?.warehouse_profile_id ||
                      ""
                    }
                    onChange={(e) => {
                      setSelectedProfileId(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="
                      w-full
                      appearance-none
                      rounded-lg
                      border
                      border-gray-300
                      bg-white
                      py-1.5
                      pl-3
                      pr-8
                      text-xs
                      font-medium
                      text-gray-800
                      shadow-xs
                      transition
                      hover:border-gray-400
                      focus:border-[#08511f]
                      focus:outline-none
                      focus:ring-1
                      focus:ring-[#08511f]
                      cursor-pointer
                    "
                  >
                    {warehouseProfiles.map((p) => (
                      <option
                        key={p.warehouse_profile_id}
                        value={p.warehouse_profile_id}
                      >
                        {p.business_name ||
                          p.organization_name ||
                          `Warehouse #${p.warehouse_profile_id}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>


        <div
          className="
            flex
            flex-wrap
            items-center
            gap-2
          "
        >
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
              border-slate-300
              bg-white
              px-4
              py-2.5
              text-xs
              font-bold
              text-slate-600
              transition
              hover:border-emerald-300
              hover:text-emerald-700
            "
          >
            View Owner
          </button>

          <button
            type="button"
            onClick={() =>
              setArchiveAccountModal(
                true
              )
            }
            className="
              rounded-lg
              bg-orange-500
              px-4
              py-2.5
              text-xs
              font-bold
              text-white
              transition
              hover:bg-orange-600
            "
          >
            Archive Account
          </button>
        </div>
      </div>


      {error && (
        <div
          className="
            mb-5
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
              text-red-700
            "
          >
            {error}
          </p>
        </div>
      )}


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
        <SummaryCard
          icon={
            Users
          }
          label="Active Employees"
          value={
            activeEmployeeCount
          }
        />

        <SummaryCard
          icon={
            Archive
          }
          label="Archived Employees"
          value={
            archivedEmployeeCount
          }
        />

        <SummaryCard
          icon={
            Star
          }
          label="Ratings"
          value={
            Number(
              profileAverageRating ||
              0
            ).toFixed(1)
          }
          helper={
            `${ratingCount} total rating(s)`
          }
        />

        <SummaryCard
          icon={
            Flag
          }
          label="Reports"
          value={
            reportCount
          }
        />
      </div>


      {/* =====================================================
          WAREHOUSE OVERVIEW
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
            Warehouse Overview
          </h2>

          <p
            className="
              mt-1
              text-xs
              text-gray-500
            "
          >
            General business and warehouse information.
          </p>
        </div>

        <div
          className="
            grid
            grid-cols-1
            gap-5
            md:grid-cols-3
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
                  activeProfile?.business_name ||
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
                  activeProfile?.organization_name ||
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
              Address
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
                  activeProfileAddress ||
                  formatAddress(business)
                )
              }
            </p>
          </div>
        </div>
      </div>


      <Tabs
        tabs={
          tabs
        }
        activeTab={
          activeTab
        }
        onTabChange={(
          tabId
        ) => {
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


      <div
        className="
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
            placeholder={
              activeTab ===
              "ratings"
                ? "Search reviewer or comment"

                : activeTab ===
                    "reports"
                  ? "Search reporter, category, or description"

                  : "Search employee name, role, or email"
            }
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
        onPageChange={
          setCurrentPage
        }
        footerLabel={
          `Showing ${firstVisible}-${lastVisible} of ${currentRows.length}`
        }
      />


      <WarehouseOwnerModal
        isOpen={
          ownerModal
        }
        owner={
          owner
        }
        onClose={() =>
          setOwnerModal(
            false
          )
        }
      />


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
          warehouseName
        }
        accountType="Warehouse Manager Account"
        isArchiving={
          isArchiving
        }
      />


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
            ?.name ||
          "this employee"
        }
        accountType="Warehouse Employee Account"
        isArchiving={
          isArchivingEmployee
        }
      />


      <AccountActionConfirmModal
        isOpen={
          restoreEmployeeModal
        }
        title="Retrieve Employee Account"
        message="This employee account will become active again and return to Active Employees."
        accountName={
          selectedEmployee
            ?.name ||
          ""
        }
        confirmText="Retrieve Account"
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


      <AccountActionConfirmModal
        isOpen={
          deleteEmployeeModal
        }
        title="Delete Employee Permanently"
        message="This employee account will be permanently removed from the warehouse."
        accountName={
          selectedEmployee
            ?.name ||
          ""
        }
        confirmText="Delete Permanently"
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


      <ReportDetailsModal
        isOpen={
          reportModal
        }
        report={
          selectedReport
        }
        onResolve={handleResolveReport}
        onClose={() => {
          setReportModal(
            false
          );

          setSelectedReport(
            null
          );
        }}
      />

    </>
  );
};


export default WarehouseInfo;