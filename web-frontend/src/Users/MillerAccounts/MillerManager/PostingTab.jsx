import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  MapPin,
  Plus,
  Search,
  Users,
} from "lucide-react";

import useMillerContracts from "../../../Components/hooks/Miller/useMillerContracts";
import MillerCreatePostingModal from "../../../Components/Modals/Miller/MillerCreatePostingModal";
import MillerApplicationDetailsModal from "../../../Components/Modals/Miller/MillerApplicationDetailsModal";


const PRODUCT_TYPES = [
  { value: "", label: "All Product Types" },
  { value: "unmilled_palay", label: "Unmilled Palay" },
  { value: "milled_rice", label: "Milled Rice" },
];


const POSTING_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];


const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  {
    value: "fulfillment",
    label: "Nearest Fulfillment Date",
  },
];


const MONTH_OPTIONS = [
  { value: "", label: "All Months" },
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


const STATUS_STYLES = {
  open: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
};


function titleCase(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}


function productTypeLabel(value) {
  if (value === "unmilled_palay") {
    return "Unmilled Palay";
  }

  if (value === "milled_rice") {
    return "Milled Rice";
  }

  return value || "—";
}


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(date);
}


function formatPeso(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(number);
}


function formatQuantity(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0 kg";
  }

  return `${new Intl.NumberFormat(
    "en-PH",
    {
      maximumFractionDigits: 2,
    }
  ).format(number)} kg`;
}


function fullLocation(posting) {
  return [
    posting?.fulfillment_street_address,
    posting?.fulfillment_barangay,
    posting?.fulfillment_municipality,
    posting?.fulfillment_province,
    posting?.fulfillment_postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}


function FilterSelect({
  value,
  onChange,
  options,
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="
          appearance-none
          rounded-xl
          border
          border-gray-200
          bg-white
          px-3.5
          py-2
          pr-8
          text-sm
          font-medium
          text-gray-700
          outline-none
          transition
          focus:border-[#0B5D1E]
          focus:ring-1
          focus:ring-[#0B5D1E]
        "
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
        ▾
      </span>
    </div>
  );
}


function InfoItem({
  label,
  value,
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}


function PostingCard({
  posting,
  onView,
}) {
  const status =
    posting.posting_status || "closed";

  return (
    <article
      className="
        flex
        flex-col
        justify-between
        space-y-4
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-sm
        transition
        hover:border-slate-300
        hover:shadow-md
      "
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {posting.posting_code
              || `PST-${posting.posting_id}`}
          </span>

          <span
            className={`
              rounded-full
              px-2.5
              py-0.5
              text-[10px]
              font-bold
              uppercase

              ${
                STATUS_STYLES[status]
                || STATUS_STYLES.closed
              }
            `}
          >
            {titleCase(status)}
          </span>
        </div>


        <div className="flex items-center gap-3">
          {posting.product_image ? (
            <img
              src={posting.product_image}
              alt={posting.rice_variety || "Rice"}
              className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-1 text-center text-[9px] text-slate-400">
              No Photo
            </div>
          )}

          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-500">
              {productTypeLabel(
                posting.product_type
              )}
            </p>

            <h3 className="truncate text-lg font-bold leading-tight text-gray-900">
              {posting.rice_variety || "Rice Product"}
            </h3>

            <p className="truncate text-xs font-medium text-gray-400">
              {posting.product_grade || "No classification"}
            </p>
          </div>
        </div>


        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3">
          <div>
            <p className="text-[11px] font-medium text-gray-500">
              Required Qty
            </p>

            <p className="text-sm font-bold text-emerald-700">
              {formatQuantity(
                posting.required_quantity_kg
              )}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-gray-500">
              Buying Price
            </p>

            <p className="text-sm font-bold text-gray-900">
              {formatPeso(
                posting.buying_price_per_kg
              )}
              <span className="text-[10px] font-medium text-gray-500">
                /kg
              </span>
            </p>
          </div>
        </div>


        <div className="space-y-2 text-xs font-medium text-gray-500">
          <p className="flex items-start gap-1.5">
            <CalendarDays
              size={13}
              className="mt-0.5 shrink-0 text-gray-400"
            />

            <span>
              Fulfillment:{" "}
              <strong className="text-gray-700">
                {formatDate(
                  posting.required_fulfillment_date
                )}
              </strong>
            </span>
          </p>

          <p className="flex items-start gap-1.5">
            <CalendarDays
              size={13}
              className="mt-0.5 shrink-0 text-gray-400"
            />

            <span>
              Application Deadline:{" "}
              <strong className="text-gray-700">
                {formatDate(
                  posting.application_deadline
                )}
              </strong>
            </span>
          </p>
        </div>


        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          <Users size={14} />

          <span>
            {Number(posting.applications_received || 0)}{" "}
            {Number(posting.applications_received || 0) === 1
              ? "Application"
              : "Applications"}{" "}
            Received
          </span>
        </div>
      </div>


      <button
        type="button"
        onClick={() => onView(posting)}
        className="
          w-full
          rounded-xl
          border
          border-emerald-600
          py-2
          text-xs
          font-bold
          text-emerald-700
          transition
          hover:bg-emerald-50
        "
      >
        View Applications
      </button>
    </article>
  );
}


function ApplicationCard({
  application,
  onView,
}) {
  const STATUS = {
    pending: "bg-amber-100 text-amber-700",
    under_review: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    declined: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-600",
  };

  const location = [
    application.farm_municipality,
    application.farm_province,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {application.application_code}
          </p>

          <h4 className="mt-1 text-base font-bold text-slate-900">
            {application.farmer_name || "Farmer"}
          </h4>

          <p className="mt-0.5 text-xs text-slate-500">
            {application.farm_name || "Registered Farm"}
          </p>
        </div>

        <span
          className={`
            whitespace-nowrap
            rounded-full
            px-2.5
            py-1
            text-[10px]
            font-bold
            uppercase

            ${
              STATUS[application.application_status]
              || STATUS.cancelled
            }
          `}
        >
          {titleCase(
            application.application_status
          )}
        </span>
      </div>


      {location && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
          <MapPin
            size={13}
            className="mt-0.5 shrink-0"
          />

          {location}
        </p>
      )}


      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
        <InfoItem
          label="Quantity to Commit"
          value={formatQuantity(
            application.quantity_to_commit_kg
          )}
        />

        <InfoItem
          label="Proposed Price"
          value={
            application.proposed_selling_price_per_kg
              ? `${formatPeso(
                  application.proposed_selling_price_per_kg
                )}/kg`
              : "Posting Price"
          }
        />

        <InfoItem
          label="Expected Availability"
          value={formatDate(
            application.expected_availability_date
          )}
        />

        <InfoItem
          label="Application Date"
          value={formatDate(
            application.application_date
          )}
        />
      </div>


      <button
        type="button"
        onClick={() => onView(application)}
        className="mt-4 w-full rounded-xl border border-[#0B5D1E] py-2 text-xs font-bold text-[#0B5D1E] transition hover:bg-emerald-50"
      >
        View Application
      </button>
    </article>
  );
}


export default function PostingsTab() {
  const {
    postings,
    messages,

    isLoading,
    isSaving,
    isLoadingMessages,

    error,
    profanityBlock,

    clearError,
    clearProfanityBlock,

    loadPostings,
    createPosting,
    loadPostingDetails,
    editPosting,
    closePosting,

    loadApplicationDetails,
    startApplicationReview,
    approveApplication,
    declineApplication,

    loadMessages,
    sendMessage,
  } = useMillerContracts();


  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [productType, setProductType] = useState("");
  const [variety, setVariety] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [postingDetails, setPostingDetails] = useState(null);

  const [applicationSearch, setApplicationSearch] = useState("");
  const [debouncedApplicationSearch, setDebouncedApplicationSearch] = useState("");
  const [applicationStatus, setApplicationStatus] = useState("");
  const [farmerLocation, setFarmerLocation] = useState("");
  const [applicationSort, setApplicationSort] = useState("newest");

  const [postingModal, setPostingModal] = useState({
    open: false,
    mode: "create",
  });

  const [applicationModal, setApplicationModal] = useState({
    open: false,
    application: null,
  });

  const [closeConfirm, setCloseConfirm] = useState(false);
  const [notice, setNotice] = useState("");


  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      350
    );

    return () =>
      window.clearTimeout(timer);
  }, [search]);


  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setDebouncedApplicationSearch(
          applicationSearch.trim()
        ),
      350
    );

    return () =>
      window.clearTimeout(timer);
  }, [applicationSearch]);


  useEffect(() => {
    if (postingDetails) {
      return;
    }

    loadPostings({
      search: debouncedSearch,
      status: statusFilter,
      product_type: productType,
      rice_variety: variety,
      year,
      month,
      sort_by: sortBy,
    });
  }, [
    postingDetails,
    debouncedSearch,
    statusFilter,
    productType,
    variety,
    year,
    month,
    sortBy,
    loadPostings,
  ]);


  useEffect(() => {
    if (!postingDetails?.posting?.posting_id) {
      return;
    }

    loadPostingDetails(
      postingDetails.posting.posting_id,
      {
        search: debouncedApplicationSearch,
        application_status: applicationStatus,
        farmer_location: farmerLocation,
        sort_by: applicationSort,
      }
    ).then((data) => {
      if (data) {
        setPostingDetails(data);
      }
    });
  }, [
    debouncedApplicationSearch,
    applicationStatus,
    farmerLocation,
    applicationSort,
  ]);


  const varietyOptions = useMemo(() => {
    const values = new Set(
      postings
        .map((posting) => posting.rice_variety)
        .filter(Boolean)
    );

    if (variety) {
      values.add(variety);
    }

    return [
      {
        value: "",
        label: "All Varieties",
      },
      ...Array.from(values)
        .sort()
        .map((item) => ({
          value: item,
          label: item,
        })),
    ];
  }, [postings, variety]);


  const yearOptions = useMemo(() => {
    const values = new Set(
      postings
        .map((posting) => {
          if (!posting.posting_date) {
            return null;
          }

          const date =
            new Date(posting.posting_date);

          return Number.isNaN(date.getTime())
            ? null
            : String(date.getFullYear());
        })
        .filter(Boolean)
    );

    if (year) {
      values.add(String(year));
    }

    return [
      {
        value: "",
        label: "All Years",
      },
      ...Array.from(values)
        .sort((a, b) => Number(b) - Number(a))
        .map((item) => ({
          value: item,
          label: item,
        })),
    ];
  }, [postings, year]);


  const applicationLocationOptions =
    useMemo(() => {
      const applications =
        postingDetails?.applications || [];

      const values = new Set(
        applications
          .flatMap((application) => [
            application.farm_province,
            application.farm_municipality,
          ])
          .filter(Boolean)
      );

      if (farmerLocation) {
        values.add(farmerLocation);
      }

      return [
        {
          value: "",
          label: "All Locations",
        },
        ...Array.from(values)
          .sort()
          .map((item) => ({
            value: item,
            label: item,
          })),
      ];
    }, [
      postingDetails,
      farmerLocation,
    ]);


  const refreshPostingDetails =
    async (postingId) => {
      const data =
        await loadPostingDetails(
          postingId,
          {
            search:
              debouncedApplicationSearch,

            application_status:
              applicationStatus,

            farmer_location:
              farmerLocation,

            sort_by:
              applicationSort,
          }
        );

      if (data) {
        setPostingDetails(data);
      }

      return data;
    };


  const handleViewPosting =
    async (posting) => {
      clearError();
      setNotice("");
      setCloseConfirm(false);

      const data =
        await loadPostingDetails(
          posting.posting_id
        );

      if (data) {
        setPostingDetails(data);
      }
    };


  const handleCreatePosting =
    async (payload) => {
      const result =
        await createPosting(payload);

      if (result) {
        setPostingModal({
          open: false,
          mode: "create",
        });

        setNotice(
          "Posting published successfully."
        );
      }

      return result;
    };


  const handleEditPosting =
    async (payload) => {
      const postingId =
        postingDetails?.posting?.posting_id;

      if (!postingId) {
        return null;
      }

      const result =
        await editPosting(
          postingId,
          payload
        );

      if (result) {
        setPostingModal({
          open: false,
          mode: "create",
        });

        await refreshPostingDetails(
          postingId
        );

        setNotice(
          "Posting updated successfully."
        );
      }

      return result;
    };


  const handleConfirmClose =
    async () => {
      const postingId =
        postingDetails?.posting?.posting_id;

      if (!postingId) {
        return;
      }

      const result =
        await closePosting(
          postingId
        );

      if (result) {
        await refreshPostingDetails(
          postingId
        );

        setCloseConfirm(false);

        setNotice(
          "Posting closed successfully."
        );
      }
    };


  const handleViewApplication =
    async (application) => {
      let data =
        await loadApplicationDetails(
          application.application_id
        );

      let details =
        data?.application || data;

      if (!details) {
        return;
      }

      if (
        details.application_status ===
        "pending"
      ) {
        const reviewed =
          await startApplicationReview(
            details.application_id,
            details.posting_id
          );

        if (reviewed) {
          data =
            await loadApplicationDetails(
              details.application_id
            );

          details =
            data?.application || data;

          await refreshPostingDetails(
            details.posting_id
          );
        }
      }

      setApplicationModal({
        open: true,
        application: details,
      });
    };


  const handleApprove =
    async (application) => {
      const result =
        await approveApplication(
          application.application_id,
          {},
          application.posting_id
        );

      if (result) {
        setApplicationModal({
          open: false,
          application: null,
        });

        await refreshPostingDetails(
          application.posting_id
        );

        setNotice(
          "Farmer application approved. A Current Contract has been created."
        );
      }

      return result;
    };


  const handleDecline =
    async (
      application,
      declineData
    ) => {
      const result =
        await declineApplication(
          application.application_id,
          declineData,
          application.posting_id
        );

      if (result) {
        const data =
          await loadApplicationDetails(
            application.application_id
          );

        const updated =
          data?.application || data;

        setApplicationModal({
          open: true,
          application: updated,
        });

        await refreshPostingDetails(
          application.posting_id
        );

        setNotice(
          "Farmer application declined."
        );
      }

      return result;
    };


  const handleLoadApplicationMessages =
    async (application) => {
      return loadMessages({
        farmerUserId:
          application.farmer_user_id,

        referenceType:
          "application",

        referenceId:
          application.application_id,
      });
    };


  const handleSendApplicationMessage =
    async (
      application,
      text
    ) => {
      return sendMessage(
        text,
        {
          farmer_user_id:
            application.farmer_user_id,

          reference_type:
            "application",

          reference_id:
            application.application_id,
        }
      );
    };


  if (postingDetails?.posting) {
    const posting =
      postingDetails.posting;

    const applications =
      postingDetails.applications || [];

    const canEdit =
      posting.posting_status === "open"
      && Number(
        posting.applications_received || 0
      ) === 0;

    const canClose =
      posting.posting_status === "open";

    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => {
            setPostingDetails(null);
            setCloseConfirm(false);
            setNotice("");
            clearError();
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B5D1E] hover:text-[#094d19]"
        >
          <ArrowLeft size={17} />
          Back to Postings
        </button>


        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {notice}
          </div>
        )}


        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={clearError}
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}


        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              {posting.product_image ? (
                <img
                  src={posting.product_image}
                  alt={posting.rice_variety}
                  className="h-24 w-24 shrink-0 rounded-xl border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-400">
                  No Photo
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    {posting.posting_code}
                  </h3>

                  <span
                    className={`
                      rounded-full
                      px-2.5
                      py-1
                      text-[11px]
                      font-bold
                      uppercase

                      ${
                        STATUS_STYLES[
                          posting.posting_status
                        ]
                        || STATUS_STYLES.closed
                      }
                    `}
                  >
                    {titleCase(
                      posting.posting_status
                    )}
                  </span>
                </div>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {posting.rice_variety}
                  {posting.product_grade
                    ? ` • ${posting.product_grade}`
                    : ""}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {productTypeLabel(
                    posting.product_type
                  )}
                </p>
              </div>
            </div>


            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={() =>
                    setPostingModal({
                      open: true,
                      mode: "edit",
                    })
                  }
                  className="rounded-xl border border-[#0B5D1E] px-4 py-2 text-sm font-bold text-[#0B5D1E] hover:bg-emerald-50"
                >
                  Edit Posting
                </button>
              )}

              {canClose && (
                <button
                  type="button"
                  onClick={() =>
                    setCloseConfirm(true)
                  }
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                >
                  Close Posting
                </button>
              )}
            </div>
          </div>


          {closeConfirm && (
            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-red-700">
                  Close this Posting?
                </p>

                <p className="mt-1 text-xs text-red-600">
                  Farmers will no longer be able to submit new applications.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCloseConfirm(false)
                  }
                  disabled={isSaving}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                >
                  Keep Open
                </button>

                <button
                  type="button"
                  onClick={handleConfirmClose}
                  disabled={isSaving}
                  className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {isSaving
                    ? "Closing..."
                    : "Confirm Close"}
                </button>
              </div>
            </div>
          )}
        </section>


        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900">
              Posting Information
            </h4>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <InfoItem
                label="Posting ID"
                value={posting.posting_code}
              />

              <InfoItem
                label="Posting Date"
                value={formatDate(
                  posting.created_at
                  || posting.posting_date
                )}
              />

              <InfoItem
                label="Application Deadline"
                value={formatDate(
                  posting.application_deadline
                )}
              />

              <InfoItem
                label="Applications Received"
                value={String(
                  posting.applications_received || 0
                )}
              />
            </div>
          </section>


          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900">
              Procurement Information
            </h4>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <InfoItem
                label="Required Quantity"
                value={formatQuantity(
                  posting.required_quantity_kg
                )}
              />

              <InfoItem
                label="Buying Price"
                value={`${formatPeso(
                  posting.buying_price_per_kg
                )}/kg`}
              />

              <InfoItem
                label="Required Fulfillment"
                value={formatDate(
                  posting.required_fulfillment_date
                )}
              />

              <InfoItem
                label="Partial Applications"
                value={
                  posting.partial_quantity_allowed
                    ? "Allowed"
                    : "Not Allowed"
                }
              />

              <InfoItem
                label="Fulfillment Method"
                value={titleCase(
                  posting.fulfillment_method
                )}
              />

              <InfoItem
                label="Price Negotiation"
                value={
                  posting.price_negotiation_allowed
                    ? "Allowed"
                    : "Not Allowed"
                }
              />
            </div>

            <div className="mt-4">
              <InfoItem
                label="Pickup / Delivery Location"
                value={fullLocation(posting)}
              />
            </div>
          </section>
        </div>


        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900">
            Product Requirements
          </h4>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoItem
              label="Product Type"
              value={productTypeLabel(
                posting.product_type
              )}
            />

            <InfoItem
              label="Rice Variety"
              value={posting.rice_variety}
            />

            <InfoItem
              label="Grade / Classification"
              value={posting.product_grade}
            />

            <InfoItem
              label="Required Quantity"
              value={formatQuantity(
                posting.required_quantity_kg
              )}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-400">
                Product Description
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                {posting.product_description
                  || "No description provided."}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-400">
                Proposed Deal / Terms
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                {posting.proposed_deal_terms
                  || "No additional terms provided."}
              </p>

              <p className="mt-4 text-xs font-medium text-slate-400">
                Additional Notes to Farmers
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                {posting.additional_notes_to_farmers
                  || "No additional notes provided."}
              </p>
            </div>
          </div>
        </section>


        <section className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={applicationSearch}
                onChange={(event) =>
                  setApplicationSearch(
                    event.target.value
                  )
                }
                placeholder="Search farmer"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0B5D1E] focus:ring-1 focus:ring-[#0B5D1E]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterSelect
                value={applicationStatus}
                onChange={setApplicationStatus}
                options={[
                  {
                    value: "",
                    label: "All Application Statuses",
                  },
                  {
                    value: "pending",
                    label: "Pending",
                  },
                  {
                    value: "under_review",
                    label: "Under Review",
                  },
                  {
                    value: "approved",
                    label: "Approved",
                  },
                  {
                    value: "declined",
                    label: "Declined",
                  },
                  {
                    value: "cancelled",
                    label: "Cancelled",
                  },
                ]}
              />

              <FilterSelect
                value={farmerLocation}
                onChange={setFarmerLocation}
                options={applicationLocationOptions}
              />

              <FilterSelect
                value={applicationSort}
                onChange={setApplicationSort}
                options={[
                  {
                    value: "newest",
                    label: "Newest",
                  },
                  {
                    value: "oldest",
                    label: "Oldest",
                  },
                  {
                    value: "quantity_high",
                    label: "Highest Quantity",
                  },
                  {
                    value: "quantity_low",
                    label: "Lowest Quantity",
                  },
                ]}
              />
            </div>
          </div>


          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Farmer Applications
              </h4>

              <p className="text-xs text-slate-500">
                Applications submitted for this procurement requirement.
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {applications.length} displayed
            </span>
          </div>


          {applications.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {applications.map((application) => (
                <ApplicationCard
                  key={application.application_id}
                  application={application}
                  onView={handleViewApplication}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
              <p className="text-sm font-semibold text-slate-500">
                No farmer applications found.
              </p>
            </div>
          )}
        </section>


        <MillerCreatePostingModal
          open={postingModal.open}
          mode={postingModal.mode}
          posting={posting}
          isSaving={isSaving}
          error={error}
          onClose={() => {
            if (!isSaving) {
              setPostingModal({
                open: false,
                mode: "create",
              });

              clearError();
            }
          }}
          onSubmit={handleEditPosting}
        />


        <MillerApplicationDetailsModal
          open={applicationModal.open}
          application={applicationModal.application}
          messages={messages}
          isSaving={isSaving}
          isLoadingMessages={isLoadingMessages}
          error={error}
          profanityBlock={profanityBlock}
          onClearProfanity={clearProfanityBlock}
          onClose={() => {
            if (!isSaving) {
              setApplicationModal({
                open: false,
                application: null,
              });

              clearError();
            }
          }}
          onApprove={handleApprove}
          onDecline={handleDecline}
          onLoadMessages={handleLoadApplicationMessages}
          onSendMessage={handleSendApplicationMessage}
        />
      </div>
    );
  }


  return (
    <div className="space-y-5">
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}


      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            type="button"
            onClick={clearError}
            className="font-bold"
          >
            ×
          </button>
        </div>
      )}


{/* ==========================================================
    SEARCH + CREATE POSTING
========================================================== */}

<div className="space-y-3">

  {/* TOP ROW */}

  <div
    className="
      flex
      items-center
      gap-3
    "
  >
    <div
      className="
        relative
        flex-1
      "
    >
      <Search
        className="
          absolute
          left-3.5
          top-1/2
          -translate-y-1/2
          text-gray-400
        "
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
        placeholder="Search Posting ID, product, or rice variety"
        className="
          w-full
          rounded-xl
          border
          border-gray-200
          bg-white
          py-2.5
          pl-10
          pr-4
          text-sm
          text-gray-700
          outline-none
          placeholder-gray-400
          transition
          focus:border-[#0B5D1E]
          focus:ring-1
          focus:ring-[#0B5D1E]
        "
      />
    </div>


    <button
      type="button"
      onClick={() => {
        clearError();

        setPostingModal({
          open: true,
          mode: "create",
        });
      }}
      className="
        inline-flex
        shrink-0
        items-center
        justify-center
        gap-1.5
        whitespace-nowrap
        rounded-xl
        bg-[#0B5D1E]
        px-4
        py-2.5
        text-sm
        font-normal
        text-white
        shadow-sm
        transition
        hover:bg-[#094d19]
      "
    >
      <Plus
        size={16}
        strokeWidth={2}
      />

      Create Posting
    </button>
  </div>


  {/* FILTER ROW */}

  <div
    className="
      flex
      flex-wrap
      items-center
      gap-2
    "
  >
    <FilterSelect
      value={statusFilter}
      onChange={setStatusFilter}
      options={POSTING_STATUSES}
    />

    <FilterSelect
      value={productType}
      onChange={setProductType}
      options={PRODUCT_TYPES}
    />

    <FilterSelect
      value={variety}
      onChange={setVariety}
      options={varietyOptions}
    />

    <FilterSelect
      value={year}
      onChange={setYear}
      options={yearOptions}
    />

    <FilterSelect
      value={month}
      onChange={setMonth}
      options={MONTH_OPTIONS}
    />

    <FilterSelect
      value={sortBy}
      onChange={setSortBy}
      options={SORT_OPTIONS}
    />
  </div>
</div>


      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2
              size={28}
              className="mx-auto animate-spin text-[#0B5D1E]"
            />

            <p className="mt-3 text-sm font-medium text-slate-500">
              Loading procurement postings...
            </p>
          </div>
        </div>
      ) : postings.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {postings.map((posting) => (
            <PostingCard
              key={posting.posting_id}
              posting={posting}
              onView={handleViewPosting}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-sm font-semibold text-gray-500">
            No postings found matching your filters.
          </p>
        </div>
      )}


      <MillerCreatePostingModal
        open={postingModal.open}
        mode="create"
        posting={null}
        isSaving={isSaving}
        error={error}
        onClose={() => {
          if (!isSaving) {
            setPostingModal({
              open: false,
              mode: "create",
            });

            clearError();
          }
        }}
        onSubmit={handleCreatePosting}
      />
    </div>
  );
}