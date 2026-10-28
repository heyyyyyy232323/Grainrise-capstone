import {
  useEffect,
  useState,
} from "react";

import {
  Search,
} from "lucide-react";

import useFarmerContracts from "../../Components/hooks/Farmer/useFarmerContracts";
import Dropdown from "../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";
import FarmerContractApplicationDetailsModal from "../../Components/Modals/FarmerContractApplicationDetailsModal";
import FarmerContractCancelApplicationModal from "../../Components/Modals/FarmerContractCancelApplicationModal";
import { translations, useLanguagePreference } from "../../lib/translations";

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const STATUS_LABELS = {
  pending: "Pending",
  under_review: "Under Review",
  declined: "Declined",
  cancelled: "Cancelled",
};


const getStatusBadgeColors = (status) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-700";

    case "under_review":
      return "bg-blue-100 text-blue-700";

    case "declined":
      return "bg-red-100 text-red-700";

    case "cancelled":
      return "bg-gray-100 text-gray-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};


const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
};


const formatQuantity = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0 kg";
  }

  return `${number.toLocaleString()} kg`;
};


const formatCurrency = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `₱${number.toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};


export default function FarmerContractsApplications() {
  const [language] = useLanguagePreference();
  const t = translations[language]?.farmer ?? translations.en.farmer;

  const {
    applications,
    selectedApplication,

    isLoading,
    isSaving,
    error,

    loadApplications,
    loadApplicationDetails,
    cancelApplication,
  } = useFarmerContracts();


  // ==========================================================
  // FILTERS
  // ==========================================================

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    yearFilter,
    setYearFilter,
  ] = useState("");

  const [
    monthFilter,
    setMonthFilter,
  ] = useState("");

  const [
    sortBy,
    setSortBy,
  ] = useState("newest");


  // ==========================================================
  // DETAILS MODAL
  // ==========================================================

  const [
    isDetailsOpen,
    setIsDetailsOpen,
  ] = useState(false);


  // ==========================================================
  // CANCEL MODAL
  // ==========================================================

  const [
    isCancelOpen,
    setIsCancelOpen,
  ] = useState(false);


  // ==========================================================
  // LOAD APPLICATIONS
  // ==========================================================

  useEffect(() => {
    const timer = setTimeout(
      () => {
        loadApplications({
          search,
          status: statusFilter,
          year: yearFilter,
          month: monthFilter,
          sortBy,
        }).catch(() => {
          // Error is already handled by the hook.
        });
      },
      300
    );

    return () => {
      clearTimeout(timer);
    };
  }, [
    search,
    statusFilter,
    yearFilter,
    monthFilter,
    sortBy,
    loadApplications,
  ]);


  // ==========================================================
  // VIEW DETAILS
  // ==========================================================

  const handleViewDetails = async (
    applicationId
  ) => {
    setIsDetailsOpen(true);

    try {
      await loadApplicationDetails(
        applicationId
      );
    } catch {
      // Hook handles error message.
    }
  };


  // ==========================================================
  // CANCEL APPLICATION
  // ==========================================================

  const openCancelModal = () => {
    setIsDetailsOpen(false);
    setIsCancelOpen(true);
  };


  const handleCloseCancelModal = () => {
    setIsCancelOpen(false);

    if (selectedApplication) {
      setIsDetailsOpen(true);
    }
  };


  const handleCancelApplication =
    async (payload) => {
      if (!selectedApplication) {
        return;
      }

      try {
        await cancelApplication(
          selectedApplication.application_id,
          payload
        );

        setIsCancelOpen(false);
        setIsDetailsOpen(false);
      } catch {
        // Hook handles error message.
      }
    };




  const currentYear =
    new Date().getFullYear();

  const years = Array.from(
    {
      length: 5,
    },
    (_, index) =>
      currentYear - index
  );


  return (
    <div className="flex flex-col gap-6">

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}


      {/* =====================================================
          SEARCH AND FILTERS
      ====================================================== */}

      <div className="flex flex-col gap-4 mb-2 xl:flex-row xl:items-center">

        <div className="relative flex-1 max-w-sm">

          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder={t.contracts.filter.searchApplications}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
          />

        </div>


        <div className="flex flex-wrap gap-3">
          {/* STATUS */}
          <div className="w-36">
            <Dropdown
              options={[
                { label: t.contracts.filter.allStatus, value: "" },
                { label: t.contracts.filter.pending, value: "pending" },
                { label: t.contracts.filter.underReview, value: "under_review" },
                { label: t.contracts.filter.declined, value: "declined" },
                { label: t.contracts.filter.cancelled, value: "cancelled" },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder={t.contracts.filter.status}
            />
          </div>

          {/* YEAR */}
          <div className="w-28">
            <Dropdown
              options={[
                { label: t.contracts.filter.allYears, value: "" },
                ...years.map((year) => ({
                  label: String(year),
                  value: String(year),
                })),
              ]}
              value={yearFilter}
              onChange={setYearFilter}
              placeholder={t.contracts.filter.year}
            />
          </div>

          {/* MONTH */}
          <div className="w-32">
            <Dropdown
              options={[
                { label: t.contracts.filter.allMonths, value: "" },
                ...MONTHS.map((m) => ({
                  label: m.label,
                  value: m.value,
                })),
              ]}
              value={monthFilter}
              onChange={setMonthFilter}
              placeholder={t.contracts.filter.month}
            />
          </div>

          {/* SORT */}
          <div className="w-36">
            <SortByDropdown
              options={[
                { label: t.contracts.filter.newest, value: "newest" },
                { label: t.contracts.filter.oldest, value: "oldest" },
              ]}
              value={sortBy}
              onChange={setSortBy}
            />
          </div>
        </div>
      </div>


      {/* =====================================================
          LOADING
      ====================================================== */}

      {isLoading && applications.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          {t.contracts.empty.loading}
        </div>
      )}


      {/* =====================================================
          NO DATA
      ====================================================== */}

      {!isLoading &&
        applications.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-semibold text-slate-700">
              {t.contracts.empty.noApplications}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {t.contracts.empty.noApplicationsDesc}
            </p>
          </div>
        )}


      {/* =====================================================
          APPLICATION CARDS
      ====================================================== */}

      {applications.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {applications.map(
            (application) => (
              <div
                key={
                  application.application_id
                }
                className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >

                {/* HEADER */}

                <div className="flex items-start justify-between gap-3">

                  <div className="min-w-0">

                    <h4 className="truncate text-[15px] font-bold text-gray-900">
                      {application.business_name ||
                        application.organization_name ||
                        application.miller_name ||
                        "Miller / Buyer"}
                    </h4>

                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {formatDate(
                        application.application_date
                      )}
                    </p>

                  </div>


                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${getStatusBadgeColors(
                      application.application_status
                    )}`}
                  >
                    {STATUS_LABELS[
                      application.application_status
                    ] ||
                      application.application_status}
                  </span>

                </div>


                {/* DETAILS */}

                <div className="flex justify-between gap-4 rounded-lg border border-green-50 bg-green-50/50 p-3">

                  <div>

                    <p className="mb-0.5 text-[10px] text-gray-500">
                      Rice Variety
                    </p>

                    <p className="text-sm font-bold text-gray-900">
                      {application.rice_variety ||
                        "—"}
                    </p>

                  </div>


                  <div>

                    <p className="mb-0.5 text-[10px] text-gray-500">
                      Quantity
                    </p>

                    <p className="text-sm font-bold text-gray-900">
                      {formatQuantity(
                        application.quantity_to_commit_kg
                      )}
                    </p>

                  </div>

                </div>


                {/* ACTION */}

                <button
                  type="button"
                  onClick={() =>
                    handleViewDetails(
                      application.application_id
                    )
                  }
                  className="mt-auto w-full rounded-lg border border-green-600 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50"
                >
                  View Details
                </button>

              </div>
            )
          )}

        </div>
      )}


      {/* =====================================================
          APPLICATION DETAILS MODAL
      ====================================================== */}

      <FarmerContractApplicationDetailsModal
        open={isDetailsOpen}
        application={selectedApplication}
        isLoading={isLoading}
        error={isDetailsOpen ? error : ""}
        onClose={() => setIsDetailsOpen(false)}
        onCancel={openCancelModal}
      />


      {/* =====================================================
          CANCEL CONFIRMATION
      ====================================================== */}

      <FarmerContractCancelApplicationModal
        open={isCancelOpen}
        application={selectedApplication}
        isSaving={isSaving}
        error={isCancelOpen ? error : ""}
        onClose={handleCloseCancelModal}
        onConfirm={handleCancelApplication}
      />

    </div>
  );
}