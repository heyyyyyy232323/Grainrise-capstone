import {
  useEffect,
  useState,
} from "react";

import {
  Search,
  X,
} from "lucide-react";

import useFarmerContracts from "../../Components/hooks/Farmer/useFarmerContracts";
import Dropdown from "../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";

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


export default function FarmerContractsApplications({
  onMessage,
}) {
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

  const [
    cancellationReason,
    setCancellationReason,
  ] = useState("");

  const [
    cancellationRemarks,
    setCancellationRemarks,
  ] = useState("");


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
    try {
      await loadApplicationDetails(
        applicationId
      );

      setIsDetailsOpen(true);
    } catch {
      // Hook handles error message.
    }
  };


  // ==========================================================
  // CANCEL APPLICATION
  // ==========================================================

  const openCancelModal = () => {
    setCancellationReason("");
    setCancellationRemarks("");
    setIsCancelOpen(true);
  };


  const handleCancelApplication =
    async () => {
      if (!selectedApplication) {
        return;
      }

      if (!cancellationReason.trim()) {
        return;
      }

      try {
        await cancelApplication(
          selectedApplication.application_id,
          {
            cancellationReason:
              cancellationReason.trim(),

            cancellationRemarks:
              cancellationRemarks.trim(),
          }
        );

        setIsCancelOpen(false);
        setIsDetailsOpen(false);

        setCancellationReason("");
        setCancellationRemarks("");
      } catch {
        // Hook handles error message.
      }
    };


  // ==========================================================
  // MESSAGE
  // ==========================================================

  const handleMessage = () => {
    if (
      !selectedApplication ||
      !onMessage
    ) {
      return;
    }

    onMessage({
      supplierProfileId:
        selectedApplication.supplier_profile_id,

      referenceType: "application",

      referenceId:
        selectedApplication.application_id,
    });
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
            placeholder="Search applications"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
          />

        </div>


        <div className="flex flex-wrap gap-3">
          {/* STATUS */}
          <div className="w-36">
            <Dropdown
              options={[
                { label: "All Status", value: "" },
                { label: "Pending", value: "pending" },
                { label: "Under Review", value: "under_review" },
                { label: "Declined", value: "declined" },
                { label: "Cancelled", value: "cancelled" },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Status"
            />
          </div>

          {/* YEAR */}
          <div className="w-28">
            <Dropdown
              options={[
                { label: "All Years", value: "" },
                ...years.map((year) => ({
                  label: String(year),
                  value: String(year),
                })),
              ]}
              value={yearFilter}
              onChange={setYearFilter}
              placeholder="Year"
            />
          </div>

          {/* MONTH */}
          <div className="w-32">
            <Dropdown
              options={[
                { label: "All Months", value: "" },
                ...MONTHS.map((m) => ({
                  label: m.label,
                  value: m.value,
                })),
              ]}
              value={monthFilter}
              onChange={setMonthFilter}
              placeholder="Month"
            />
          </div>

          {/* SORT */}
          <div className="w-36">
            <SortByDropdown
              options={[
                { label: "Newest", value: "newest" },
                { label: "Oldest", value: "oldest" },
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
          Loading applications...
        </div>
      )}


      {/* =====================================================
          NO DATA
      ====================================================== */}

      {!isLoading &&
        applications.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-semibold text-slate-700">
              No Applications Available
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Your submitted contract applications
              will appear here.
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

      {isDetailsOpen &&
        selectedApplication && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">

            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">

              {/* MODAL HEADER */}

              <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">

                <div>

                  <h3 className="text-xl font-bold text-slate-900">
                    Application Details
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedApplication.application_code}
                  </p>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setIsDetailsOpen(false)
                  }
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>

              </div>


              <div className="space-y-6 p-6">

                {/* APPLICATION INFORMATION */}

                <section>

                  <h4 className="mb-3 font-bold text-slate-900">
                    Application Information
                  </h4>

                  <div className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-3">

                    <div>
                      <p className="text-xs text-slate-500">
                        Application ID
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedApplication.application_code}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs text-slate-500">
                        Application Date
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDate(
                          selectedApplication.application_date
                        )}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs text-slate-500">
                        Status
                      </p>

                      <span
                        className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-bold ${getStatusBadgeColors(
                          selectedApplication.application_status
                        )}`}
                      >
                        {STATUS_LABELS[
                          selectedApplication.application_status
                        ] ||
                          selectedApplication.application_status}
                      </span>
                    </div>

                  </div>


                  <div className="mt-4">

                    <p className="text-xs text-slate-500">
                      Proposed Deal / Terms
                    </p>

                    <div className="mt-1 min-h-[90px] whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                      {selectedApplication.proposed_deal_terms ||
                        "No additional proposed terms."}
                    </div>

                  </div>

                </section>


                {/* MILLER INFORMATION */}

                <section>

                  <h4 className="mb-3 font-bold text-slate-900">
                    Miller / Buyer Information
                  </h4>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div>
                      <p className="text-xs text-slate-500">
                        Miller / Buyer Name
                      </p>

                      <p className="font-medium text-slate-900">
                        {selectedApplication.miller_name ||
                          "—"}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs text-slate-500">
                        Business / Organization
                      </p>

                      <p className="font-medium text-slate-900">
                        {selectedApplication.business_name ||
                          selectedApplication.organization_name ||
                          "—"}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs text-slate-500">
                        Contact Details
                      </p>

                      <p className="font-medium text-slate-900">
                        {selectedApplication.official_contact_number ||
                          "—"}
                      </p>

                      <p className="text-sm text-slate-500">
                        {selectedApplication.official_email ||
                          ""}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs text-slate-500">
                        Business Location
                      </p>

                      <p className="font-medium text-slate-900">
                        {[
                          selectedApplication.business_street_address,
                          selectedApplication.business_barangay,
                          selectedApplication.business_municipality,
                          selectedApplication.business_province,
                          selectedApplication.business_postal_code,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>

                  </div>

                </section>


                {/* OPPORTUNITY */}

                <section>

                  <h4 className="mb-3 font-bold text-slate-900">
                    Opportunity Information
                  </h4>

                  <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2 lg:grid-cols-3">

                    <div>
                      <p className="text-xs text-slate-500">
                        Opportunity ID
                      </p>

                      <p className="font-semibold text-slate-900">
                        {selectedApplication.posting_code}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs text-slate-500">
                        Required Rice Variety
                      </p>

                      <p className="font-semibold text-slate-900">
                        {selectedApplication.required_rice_variety}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs text-slate-500">
                        Required Quantity
                      </p>

                      <p className="font-semibold text-slate-900">
                        {formatQuantity(
                          selectedApplication.required_quantity_kg
                        )}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs text-slate-500">
                        Required Fulfillment Date
                      </p>

                      <p className="font-semibold text-slate-900">
                        {formatDate(
                          selectedApplication.required_fulfillment_date
                        )}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs text-slate-500">
                        Buying Price
                      </p>

                      <p className="font-semibold text-slate-900">
                        {formatCurrency(
                          selectedApplication.buying_price_per_kg
                        )}{" "}
                        / kg
                      </p>
                    </div>

                  </div>

                </section>


                {/* FARMER APPLICATION */}

                <section>

                  <h4 className="mb-3 font-bold text-slate-900">
                    Farmer&apos;s Application
                  </h4>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

                    <div>
                      <p className="text-xs text-slate-500">
                        Rice Variety to Supply
                      </p>

                      <p className="font-medium text-slate-900">
                        {selectedApplication.rice_variety ||
                          "—"}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs text-slate-500">
                        Quantity to Commit
                      </p>

                      <p className="font-medium text-slate-900">
                        {formatQuantity(
                          selectedApplication.quantity_to_commit_kg
                        )}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs text-slate-500">
                        Expected Availability
                      </p>

                      <p className="font-medium text-slate-900">
                        {formatDate(
                          selectedApplication.expected_availability_date
                        )}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs text-slate-500">
                        Proposed Selling Price
                      </p>

                      <p className="font-medium text-slate-900">
                        {formatCurrency(
                          selectedApplication.proposed_selling_price_per_kg
                        )}
                      </p>
                    </div>


                    <div className="md:col-span-2">
                      <p className="text-xs text-slate-500">
                        Additional Notes
                      </p>

                      <p className="whitespace-pre-wrap font-medium text-slate-900">
                        {selectedApplication.additional_notes_to_miller ||
                          "—"}
                      </p>
                    </div>

                  </div>


                  {selectedApplication.product_image && (
                    <div className="mt-4">

                      <p className="mb-2 text-xs text-slate-500">
                        Product Photo
                      </p>

                      <img
                        src={
                          selectedApplication.product_image
                        }
                        alt={
                          selectedApplication.rice_variety ||
                          "Farmer product"
                        }
                        className="h-40 w-40 rounded-xl border border-slate-200 object-cover"
                      />

                    </div>
                  )}

                </section>


                {/* DECLINE / CANCEL INFO */}

                {selectedApplication.application_status ===
                  "declined" && (
                  <section className="rounded-xl border border-red-200 bg-red-50 p-4">

                    <p className="font-semibold text-red-800">
                      Application Declined
                    </p>

                    <p className="mt-2 text-sm text-red-700">
                      {selectedApplication.decline_reason ||
                        "No decline reason provided."}
                    </p>

                    {selectedApplication.decline_remarks && (
                      <p className="mt-1 text-sm text-red-700">
                        {selectedApplication.decline_remarks}
                      </p>
                    )}

                  </section>
                )}


                {selectedApplication.application_status ===
                  "cancelled" && (
                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                    <p className="font-semibold text-slate-800">
                      Application Cancelled
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                      {selectedApplication.cancellation_reason ||
                        "No cancellation reason provided."}
                    </p>

                    {selectedApplication.cancellation_remarks && (
                      <p className="mt-1 text-sm text-slate-600">
                        {selectedApplication.cancellation_remarks}
                      </p>
                    )}

                  </section>
                )}

              </div>


              {/* =================================================
                  ACTIONS
              ================================================== */}

              <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">

                {[
                  "pending",
                  "under_review",
                ].includes(
                  selectedApplication.application_status
                ) &&
                  onMessage && (
                    <button
                      type="button"
                      onClick={handleMessage}
                      className="rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
                    >
                      Message Miller / Buyer
                    </button>
                  )}


                {selectedApplication.application_status ===
                  "pending" && (
                  <button
                    type="button"
                    onClick={openCancelModal}
                    className="rounded-lg border border-red-500 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Cancel Application
                  </button>
                )}


                <button
                  type="button"
                  onClick={() =>
                    setIsDetailsOpen(false)
                  }
                  className="rounded-lg bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800"
                >
                  Close
                </button>

              </div>

            </div>
          </div>
        )}


      {/* =====================================================
          CANCEL CONFIRMATION
      ====================================================== */}

      {isCancelOpen &&
        selectedApplication && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">

            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

              <h3 className="text-lg font-bold text-slate-900">
                Cancel Application
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Please provide a reason for cancelling this application.
              </p>


              <div className="mt-5 space-y-4">

                <div>

                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Reason for Cancellation *
                  </label>

                  <input
                    type="text"
                    value={cancellationReason}
                    onChange={(event) =>
                      setCancellationReason(
                        event.target.value
                      )
                    }
                    placeholder="Enter cancellation reason"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
                  />

                </div>


                <div>

                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Additional Remarks
                  </label>

                  <textarea
                    rows={4}
                    value={cancellationRemarks}
                    onChange={(event) =>
                      setCancellationRemarks(
                        event.target.value
                      )
                    }
                    placeholder="Optional remarks"
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
                  />

                </div>

              </div>


              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    setIsCancelOpen(false)
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Back
                </button>


                <button
                  type="button"
                  disabled={
                    isSaving ||
                    !cancellationReason.trim()
                  }
                  onClick={
                    handleCancelApplication
                  }
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? "Cancelling..."
                    : "Confirm Cancellation"}
                </button>

              </div>

            </div>
          </div>
        )}

    </div>
  );
}