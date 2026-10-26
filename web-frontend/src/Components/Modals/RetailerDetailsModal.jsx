import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  CheckCircle2,
  FileText,
  Flag,
  X,
} from "lucide-react";


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


const buildFullName = (
  personal
) => {
  const result = [
    personal?.first_name,
    personal?.middle_initial,
    personal?.last_name,
    personal?.suffix,
  ]
    .filter(
      (value) =>
        String(
          value || ""
        ).trim()
    )
    .join(" ");

  return result || "—";
};


const buildAddress = (
  address
) => {
  const result = [
    address?.street_address,
    address?.barangay,
    address?.municipality,
    address?.province,
    address?.postal_code,
  ]
    .filter(
      (value) =>
        String(
          value || ""
        ).trim()
    )
    .join(", ");

  return result || "—";
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

  if (
    normalized === "inactive"
  ) {
    return `
      border-gray-200
      bg-gray-100
      text-gray-600
    `;
  }

  return `
    border-gray-200
    bg-gray-100
    text-gray-600
  `;
};


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
        text-[11px]
        font-semibold
        uppercase
        tracking-wide
        text-gray-400
      "
    >
      {label}
    </p>

    <p
      className="
        mt-1
        break-words
        text-sm
        font-medium
        text-gray-800
      "
    >
      {
        displayValue(
          value
        )
      }
    </p>
  </div>
);


// ============================================================
// DOCUMENT CARD
// ============================================================

const DocumentCard = ({
  label,
  document,
}) => {
  const path =
    document?.path;

  const url =
    document?.url;


  return (
    <div
      className="
        flex
        min-w-0
        items-center
        justify-between
        gap-4
        rounded-xl
        border
        border-gray-200
        bg-white
        px-4
        py-3
      "
    >
      <div
        className="
          flex
          min-w-0
          items-center
          gap-3
        "
      >
        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-emerald-50
            text-[#08511f]
          "
        >
          <FileText
            size={18}
          />
        </div>


        <div
          className="
            min-w-0
          "
        >
          <p
            className="
              text-xs
              font-semibold
              text-gray-800
            "
          >
            {label}
          </p>

          <p
            className="
              mt-0.5
              max-w-[240px]
              truncate
              text-[11px]
              text-gray-400
            "
          >
            {
              path ||
              "No document uploaded"
            }
          </p>
        </div>
      </div>


      {
        url ? (
          <a
            href={
              url
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
              py-1.5
              text-[11px]
              font-semibold
              text-[#08511f]
              transition
              hover:bg-emerald-50
            "
          >
            View
          </a>
        ) : (
          <span
            className="
              shrink-0
              text-[11px]
              font-medium
              text-gray-400
            "
          >
            Unavailable
          </span>
        )
      }
    </div>
  );
};


// ============================================================
// RETAILER DETAILS MODAL
// ============================================================

const RetailerDetailsModal = ({
  isOpen,
  onClose,

  retailer,

  isLoading = false,
  onResolveReport,
}) => {
  const [resolvingId, setResolvingId] = useState(null);
  // =========================================================
  // LOCK BACKGROUND SCROLL
  // =========================================================

  useEffect(
    () => {
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
    },
    [
      isOpen,
    ]
  );


  if (
    !isOpen
  ) {
    return null;
  }


  // =========================================================
  // DATA
  // =========================================================

  const personal =
    retailer
      ?.personal_information ||
    {};


  const address =
    retailer
      ?.address_information ||
    {};


  const account =
    retailer
      ?.account_information ||
    {};


  const documents =
    retailer
      ?.documents ||
    {};


  const status =
    retailer
      ?.status ||
    "";


  // =========================================================
  // MODAL CONTENT
  // =========================================================

  const modalContent = (
    <div
      className="
        fixed
        inset-0
        z-[9999]
        overflow-y-auto
        bg-black/50
        px-4
        py-6
      "
      onMouseDown={
        onClose
      }
    >
      <div
        className="
          flex
          min-h-full
          items-center
          justify-center
        "
      >
        <div
          className="
            relative
            flex
            w-full
            max-w-3xl
            flex-col
            overflow-hidden
            rounded-2xl
            bg-white
            shadow-2xl
          "
          style={{
            maxHeight:
              "calc(100dvh - 48px)",
          }}
          onMouseDown={(
            event
          ) => {
            event.stopPropagation();
          }}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <div
            className="
              flex
              shrink-0
              items-start
              justify-between
              gap-4
              border-b
              border-gray-100
              bg-white
              px-6
              py-5
            "
          >
            <div
              className="
                min-w-0
              "
            >
              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >
                <h2
                  className="
                    text-xl
                    font-bold
                    text-gray-900
                  "
                >
                  Retailer Details
                </h2>


                {
                  !isLoading &&
                  retailer && (
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
                          status
                        )}
                      `}
                    >
                      {
                        formatStatus(
                          status
                        )
                      }
                    </span>
                  )
                }
              </div>


              <p
                className="
                  mt-1
                  text-xs
                  leading-5
                  text-gray-500
                "
              >
                View the Retailer account information and submitted documents.
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
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-gray-200
                bg-white
                text-gray-400
                transition
                hover:bg-gray-50
                hover:text-gray-600
              "
              aria-label="Close Retailer details"
            >
              <X
                size={18}
              />
            </button>
          </div>


          {/* =================================================
              SCROLLABLE BODY
          ================================================= */}

          <div
            className="
              min-h-0
              flex-1
              overflow-y-auto
            "
          >
            {
              isLoading ? (
                <div
                  className="
                    flex
                    min-h-[420px]
                    items-center
                    justify-center
                    px-6
                    py-8
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
                      Loading Retailer details...
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="
                    space-y-6
                    px-6
                    py-6
                  "
                >
                  {/* =========================================
                      PERSONAL INFORMATION
                  ========================================= */}

                  <section>
                    <div
                      className="
                        mb-3
                      "
                    >
                      <h3
                        className="
                          text-sm
                          font-bold
                          text-gray-900
                        "
                      >
                        Personal Information
                      </h3>

                      <p
                        className="
                          mt-0.5
                          text-[11px]
                          text-gray-400
                        "
                      >
                        Basic information of the registered Retailer.
                      </p>
                    </div>


                    <div
                      className="
                        grid
                        grid-cols-1
                        gap-4
                        rounded-xl
                        border
                        border-gray-200
                        bg-gray-50
                        p-4
                        sm:grid-cols-2
                      "
                    >
                      <InfoField
                        label="Full Name"
                        value={
                          buildFullName(
                            personal
                          )
                        }
                      />

                      <InfoField
                        label="Gender"
                        value={
                          personal
                            ?.gender
                        }
                      />
                    </div>
                  </section>


                  {/* =========================================
                      ADDRESS INFORMATION
                  ========================================= */}

                  <section>
                    <h3
                      className="
                        mb-3
                        text-sm
                        font-bold
                        text-gray-900
                      "
                    >
                      Address Information
                    </h3>


                    <div
                      className="
                        rounded-xl
                        border
                        border-gray-200
                        bg-gray-50
                        p-4
                      "
                    >
                      <InfoField
                        label="Complete Address"
                        value={
                          buildAddress(
                            address
                          )
                        }
                      />
                    </div>
                  </section>


                  {/* =========================================
                      ACCOUNT INFORMATION
                  ========================================= */}

                  <section>
                    <h3
                      className="
                        mb-3
                        text-sm
                        font-bold
                        text-gray-900
                      "
                    >
                      Account Information
                    </h3>


                    <div
                      className="
                        grid
                        grid-cols-1
                        gap-4
                        rounded-xl
                        border
                        border-gray-200
                        bg-gray-50
                        p-4
                        sm:grid-cols-2
                      "
                    >
                      <InfoField
                        label="Email"
                        value={
                          account
                            ?.email
                        }
                      />

                      <InfoField
                        label="Contact Number"
                        value={
                          account
                            ?.contact_number
                        }
                      />

                      <InfoField
                        label="Username"
                        value={
                          account
                            ?.username
                        }
                      />

                      <InfoField
                        label="Account Status"
                        value={
                          formatStatus(
                            status
                          )
                        }
                      />
                    </div>
                  </section>


                  {/* =========================================
                      DOCUMENTS
                  ========================================= */}

                  <section>
                    <div
                      className="
                        mb-3
                      "
                    >
                      <h3
                        className="
                          text-sm
                          font-bold
                          text-gray-900
                        "
                      >
                        Submitted Documents
                      </h3>

                      <p
                        className="
                          mt-0.5
                          text-[11px]
                          text-gray-400
                        "
                      >
                        Compliance documents submitted during Retailer registration.
                      </p>
                    </div>


                    <div
                      className="
                        grid
                        grid-cols-1
                        gap-3
                        md:grid-cols-2
                      "
                    >
                      <DocumentCard
                        label="Barangay Permit"
                        document={
                          documents
                            ?.barangay_permit
                        }
                      />

                      <DocumentCard
                        label="Valid ID"
                        document={
                          documents
                            ?.valid_id
                        }
                      />
                    </div>
                  </section>


                  {/* =========================================
                      ACCOUNT REPORTS
                  ========================================= */}

                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <Flag size={15} className="text-[#08511f]" />
                          Account Reports
                          {(retailer?.reports || []).length > 0 && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                              {(retailer?.reports || []).length}
                            </span>
                          )}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-gray-400">
                          Reports submitted against this Retailer account.
                        </p>
                      </div>

                      {(retailer?.reports || []).filter((r) => (r.status || "").toLowerCase() === "pending").length > 0 && (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                          {(retailer?.reports || []).filter((r) => (r.status || "").toLowerCase() === "pending").length} Pending
                        </span>
                      )}
                    </div>

                    {!(retailer?.reports || []).length ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center text-xs text-gray-400">
                        No reports submitted for this Retailer account.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(retailer?.reports || []).map((rep) => {
                          const repId = rep.report_id || rep.id;
                          const isPending = (rep.status || "").toLowerCase() === "pending";
                          const isResolving = resolvingId === repId;

                          return (
                            <div
                              key={repId}
                              className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-800">
                                    {rep.reported_by || "Anonymous User"}
                                  </span>
                                  {rep.reporter_role && (
                                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 uppercase">
                                      {rep.reporter_role.replace(/_/g, " ")}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                      isPending
                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    }`}
                                  >
                                    {isPending ? "Pending" : "Resolved"}
                                  </span>
                                  {rep.created_at && (
                                    <span className="text-[11px] text-gray-400">
                                      {new Date(rep.created_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-xs">
                                <span className="font-semibold text-gray-600">Category: </span>
                                <span className="text-gray-800 font-medium">{rep.category}</span>
                              </div>

                              <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 leading-relaxed">
                                {rep.description}
                              </div>

                              {isPending && onResolveReport && (
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    disabled={isResolving}
                                    onClick={async () => {
                                      setResolvingId(repId);
                                      try {
                                        await onResolveReport(repId);
                                      } finally {
                                        setResolvingId(null);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#08511f] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#063f18] disabled:opacity-50 cursor-pointer"
                                  >
                                    <CheckCircle2 size={13} />
                                    {isResolving ? "Resolving..." : "Resolve Report"}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              )
            }
          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          {
            !isLoading && (
              <div
                className="
                  flex
                  shrink-0
                  justify-end
                  border-t
                  border-gray-100
                  bg-white
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
                  Close
                </button>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );


  // =========================================================
  // PORTAL
  // =========================================================

  return createPortal(
    modalContent,
    document.body
  );
};


export default RetailerDetailsModal;