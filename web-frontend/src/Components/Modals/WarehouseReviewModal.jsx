import {
  Building2,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  User,
  X,
} from "lucide-react";

import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";


// ============================================================
// HELPERS
// ============================================================

const displayValue = (
  value,
  fallback = "Not provided"
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


const formatDate = (
  value
) => {
  if (!value) {
    return "Not provided";
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
      month:
        "long",

      day:
        "numeric",

      year:
        "numeric",
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
      (value) =>
        String(
          value || ""
        ).trim()
    )
    .filter(
      Boolean
    );


  return (
    parts.join(
      ", "
    ) ||
    "Not provided"
  );
};


const formatLabel = (
  value
) => {
  const text =
    String(
      value || ""
    ).trim();


  if (!text) {
    return "Not provided";
  }


  return text
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


const buildFullName = (
  personal = {}
) => {
  const name = [
    personal.first_name,
    personal.middle_initial,
    personal.last_name,
    personal.suffix,
  ]
    .map(
      (value) =>
        String(
          value || ""
        ).trim()
    )
    .filter(
      Boolean
    )
    .join(
      " "
    );


  return (
    name ||
    "Warehouse Manager"
  );
};


// ============================================================
// SECTION HEADER
// ============================================================

const SectionHeader = ({
  icon: Icon,
  title,
  description,
}) => (
  <div
    className="
      mb-5
      flex
      items-start
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
        text-[#08751e]
      "
    >
      <Icon
        size={17}
      />
    </div>


    <div>
      <h3
        className="
          text-sm
          font-extrabold
          text-slate-800
        "
      >
        {title}
      </h3>


      {description && (
        <p
          className="
            mt-0.5
            text-[11px]
            leading-4
            text-slate-400
          "
        >
          {description}
        </p>
      )}
    </div>
  </div>
);


// ============================================================
// INFO FIELD
// ============================================================

const InfoField = ({
  label,
  value,
  fullWidth = false,
}) => (
  <div
    className={
      fullWidth
        ? "md:col-span-2"
        : ""
    }
  >
    <p
      className="
        text-[10px]
        font-bold
        uppercase
        tracking-[0.05em]
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
        leading-5
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
// DOCUMENT ITEM
// ============================================================

const DocumentItem = ({
  label,
  document,
}) => {
  const url =
    document?.url ||
    null;


  const path =
    document?.path ||
    "";


  return (
    <div
      className="
        rounded-xl
        border
        border-slate-200
        bg-slate-50/70
        p-4
      "
    >
      <div
        className="
          flex
          flex-col
          gap-3
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div
          className="
            min-w-0
          "
        >
          <p
            className="
              text-[12px]
              font-bold
              text-slate-700
            "
          >
            {label}
          </p>


          <p
            className="
              mt-1
              truncate
              text-[10px]
              text-slate-400
            "
          >
            {path
              ? path
              : "No document uploaded"}
          </p>
        </div>


        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="
              inline-flex
              h-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              border
              border-emerald-200
              bg-white
              px-4
              text-[11px]
              font-bold
              text-[#08751e]
              transition
              hover:bg-emerald-50
            "
          >
            View Document
          </a>
        ) : (
          <span
            className="
              inline-flex
              h-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              border
              border-slate-200
              bg-slate-100
              px-4
              text-[11px]
              font-semibold
              text-slate-400
            "
          >
            Unavailable
          </span>
        )}
      </div>
    </div>
  );
};


// ============================================================
// LOADING CONTENT
// ============================================================

const LoadingContent = () => (
  <div
    className="
      flex
      min-h-[420px]
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
          font-bold
          text-slate-700
        "
      >
        Loading warehouse application...
      </p>


      <p
        className="
          mt-1
          text-xs
          text-slate-400
        "
      >
        Retrieving registered information and documents.
      </p>
    </div>
  </div>
);


// ============================================================
// WAREHOUSE REVIEW MODAL
// ============================================================

const WarehouseReviewModal = ({
  isOpen = false,
  warehouse = null,
  isLoading = false,
  isConfirming = false,
  onClose,
  onMessage,
  onConfirm,
}) => {

  // =========================================================
  // LOCK PAGE SCROLL
  // =========================================================

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


  // =========================================================
  // ESCAPE KEY
  // =========================================================

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }


    const handleKeyDown =
      (event) => {
        if (
          event.key ===
            "Escape" &&
          !isConfirming
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
    isConfirming,
    onClose,
  ]);


  if (!isOpen) {
    return null;
  }


  // =========================================================
  // DATA
  // =========================================================

  const personal =
    warehouse
      ?.personal_information ||
    {};


  const personalAddress =
    warehouse
      ?.personal_address ||
    {};


  const account =
    warehouse
      ?.account_information ||
    {};


  const business =
    warehouse
      ?.business_information ||
    {};


  const documents =
    warehouse
      ?.documents ||
    {};


  const isPartnership = Boolean(
    warehouse?.is_partnership ||
    (typeof warehouse?.user_id === "string" && warehouse?.user_id.includes("-"))
  );


  const fullName =
    buildFullName(
      personal
    );


  const businessName =
    displayValue(
      business.business_name,
      "Warehouse Business"
    );

  const inquiryMessage = String(
    warehouse?.message ||
    account?.message ||
    ""
  ).trim();


  // =========================================================
  // MODAL
  // =========================================================

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
        backdrop-blur-[2px]
      "
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Warehouse Manager Application Review"
        className="
          flex
          max-h-[calc(100vh-40px)]
          w-full
          max-w-[980px]
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-[0_25px_80px_rgba(15,23,42,0.30)]
        "
      >

        {/* ===================================================
            HEADER
        =================================================== */}

        <div
          className="
            flex
            shrink-0
            items-start
            justify-between
            gap-5
            border-b
            border-slate-200
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
            <p
              className="
                text-[10px]
                font-extrabold
                uppercase
                tracking-[0.08em]
                text-[#08751e]
              "
            >
              Warehouse Manager Application
            </p>


            <h2
              className="
                mt-1
                truncate
                text-xl
                font-extrabold
                text-slate-900
              "
            >
              Review Application
            </h2>


            {!isLoading &&
              warehouse && (

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Review the applicant information and compliance documents before confirming the account.
              </p>
            )}
          </div>


          <button
            type="button"
            onClick={() => {
              if (
                !isConfirming
              ) {
                onClose?.();
              }
            }}
            disabled={
              isConfirming
            }
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              border-slate-200
              bg-white
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <X
              size={17}
            />
          </button>
        </div>


        {/* ===================================================
            BODY
        =================================================== */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            bg-slate-50/50
          "
        >
          {isLoading ? (

            <LoadingContent />

          ) : !warehouse ? (

            <div
              className="
                flex
                min-h-[420px]
                items-center
                justify-center
                px-6
              "
            >
              <div
                className="
                  text-center
                "
              >
                <p
                  className="
                    text-sm
                    font-bold
                    text-slate-700
                  "
                >
                  Application information is unavailable.
                </p>


                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-400
                  "
                >
                  Close this modal and try loading the application again.
                </p>
              </div>
            </div>

          ) : (

            <div
              className="
                space-y-5
                p-6
              "
            >

              {/* =============================================
                  APPLICATION SUMMARY
              ============================================= */}

              <div
                className="
                  rounded-2xl
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
                    flex-col
                    gap-4
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <div
                    className="
                      flex
                      min-w-0
                      items-center
                      gap-4
                    "
                  >
                    <div
                      className="
                        flex
                        h-12
                        w-12
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-[#08751e]
                        text-white
                      "
                    >
                      <Building2
                        size={22}
                      />
                    </div>


                    <div
                      className="
                        min-w-0
                      "
                    >
                      <h3
                        className="
                          truncate
                          text-[17px]
                          font-extrabold
                          text-slate-900
                        "
                      >
                        {businessName}
                      </h3>


                      <p
                        className="
                          mt-0.5
                          truncate
                          text-xs
                          text-slate-500
                        "
                      >
                        Managed by{" "}
                        <span
                          className="
                            font-semibold
                            text-slate-700
                          "
                        >
                          {fullName}
                        </span>
                      </p>
                    </div>
                  </div>


                  <span
                    className="
                      inline-flex
                      w-fit
                      rounded-full
                      border
                      border-amber-200
                      bg-amber-50
                      px-3
                      py-1.5
                      text-[10px]
                      font-extrabold
                      uppercase
                      tracking-wide
                      text-amber-700
                    "
                  >
                    To Review
                  </span>
                </div>
              </div>


              {/* =============================================
                  PERSONAL INFORMATION
              ============================================= */}

              <section
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  p-5
                "
              >
                <SectionHeader
                  icon={User}
                  title="Personal Information"
                  description="Registered information of the Warehouse Manager."
                />


                <div
                  className="
                    grid
                    grid-cols-1
                    gap-x-6
                    gap-y-5
                    sm:grid-cols-2
                    lg:grid-cols-5
                  "
                >
                  <InfoField
                    label="First Name"
                    value={
                      personal.first_name
                    }
                  />

                  <InfoField
                    label="Middle Initial"
                    value={
                      personal.middle_initial
                    }
                  />

                  <InfoField
                    label="Last Name"
                    value={
                      personal.last_name
                    }
                  />

                  <InfoField
                    label="Suffix"
                    value={
                      personal.suffix
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
                </div>
              </section>


              


              {/* =============================================
                  ACCOUNT INFORMATION
              ============================================= */}

              <section
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  p-5
                "
              >
                <SectionHeader
                  icon={Mail}
                  title="Account Information"
                  description="Login and contact information associated with the Warehouse Manager account."
                />


                <div
                  className="
                    grid
                    grid-cols-1
                    gap-5
                    md:grid-cols-2
                    lg:grid-cols-3
                  "
                >
                  <InfoField
                    label="Email Address"
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
                    label="Username"
                    value={
                      account.username
                    }
                  />

                  <InfoField
                    label="Account Status"
                    value={
                      formatLabel(
                        warehouse.status
                      )
                    }
                  />

                  <InfoField
                    label="Date Registered"
                    value={
                      formatDate(
                        account.created_at
                      )
                    }
                  />
                </div>
              </section>


              {/* =============================================
                  WAREHOUSE BUSINESS INFORMATION
              ============================================= */}

              <section
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  p-5
                "
              >
                <SectionHeader
                  icon={Building2}
                  title="Warehouse Information"
                  description="Registered warehouse business and official contact information."
                />


                <div
                  className="
                    grid
                    grid-cols-1
                    gap-5
                    md:grid-cols-2
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
                    rounded-xl
                    border
                    border-slate-100
                    bg-slate-50
                    px-4
                    py-4
                  "
                >
                  <div
                    className="
                      mb-2
                      flex
                      items-center
                      gap-2
                    "
                  >
                    <MapPin
                      size={14}
                      className="
                        text-[#08751e]
                      "
                    />

                    <p
                      className="
                        text-[10px]
                        font-extrabold
                        uppercase
                        tracking-wide
                        text-slate-400
                      "
                    >
                      Warehouse Address
                    </p>
                  </div>


                  <p
                    className="
                      text-[13px]
                      font-semibold
                      leading-6
                      text-slate-700
                    "
                  >
                    {formatAddress(
                      business
                    )}
                  </p>
                </div>
              </section>


              {/* =============================================
                  OFFICIAL CONTACT SUMMARY
              ============================================= */}

              <section
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  p-5
                "
              >
                <SectionHeader
                  icon={Phone}
                  title="Contact Summary"
                  description="Primary contact channels submitted for the warehouse."
                />


                <div
                  className="
                    grid
                    grid-cols-1
                    gap-3
                    md:grid-cols-2
                  "
                >
                  <div
                    className="
                      rounded-xl
                      bg-slate-50
                      px-4
                      py-4
                    "
                  >
                    <p
                      className="
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-wide
                        text-slate-400
                      "
                    >
                      Warehouse Email
                    </p>

                    <p
                      className="
                        mt-1
                        break-all
                        text-[13px]
                        font-semibold
                        text-slate-700
                      "
                    >
                      {displayValue(
                        business.official_email
                      )}
                    </p>
                  </div>


                  <div
                    className="
                      rounded-xl
                      bg-slate-50
                      px-4
                      py-4
                    "
                  >
                    <p
                      className="
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-wide
                        text-slate-400
                      "
                    >
                      Warehouse Contact
                    </p>

                    <p
                      className="
                        mt-1
                        text-[13px]
                        font-semibold
                        text-slate-700
                      "
                    >
                      {displayValue(
                        business.official_contact_number
                      )}
                    </p>
                  </div>
                </div>
              </section>


              {/* =============================================
                  PARTNERSHIP INQUIRY MESSAGE
              ============================================= */}

              <section
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  p-5
                "
              >
                <SectionHeader
                  icon={MessageSquare}
                  title="Partnership Inquiry Message"
                  description="Message submitted by the applicant through Partner With Us."
                />

                <div
                  className="
                    rounded-xl
                    border
                    border-slate-100
                    bg-slate-50
                    p-4
                  "
                >
                  <p
                    className="
                      whitespace-pre-wrap
                      break-words
                      text-[13px]
                      leading-6
                      text-slate-700
                    "
                  >
                    {inquiryMessage || "No message provided."}
                  </p>
                </div>
              </section>


              {/* =============================================
                  COMPLIANCE DOCUMENTS
              ============================================= */}

              <section
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  p-5
                "
              >
                <SectionHeader
                  icon={FileText}
                  title="Required Documents"
                  description={
                    isPartnership
                      ? "Verify the submitted documents before confirming the application."
                      : "Verify all submitted compliance documents before confirming the application."
                  }
                />


                {isPartnership ? (
                  <div
                    className="
                      grid
                      grid-cols-1
                      gap-3
                      md:grid-cols-2
                    "
                  >
                    <DocumentItem
                      label="Valid Government-Issued ID"
                      document={
                        documents.government_issued_id
                      }
                    />

                    <DocumentItem
                      label="Valid Business Document"
                      document={
                        documents.business_registration ||
                        documents.business_permit ||
                        documents.business_verification_document
                      }
                    />
                  </div>
                ) : (
                  <div
                    className="
                      grid
                      grid-cols-1
                      gap-3
                      md:grid-cols-2
                    "
                  >
                    <DocumentItem
                      label="Valid Government-Issued ID"
                      document={
                        documents.government_issued_id
                      }
                    />


                    <DocumentItem
                      label="Mayor’s / Business Permit"
                      document={
                        documents.business_permit
                      }
                    />


                    <DocumentItem
                      label="DTI / SEC / CDA Registration"
                      document={
                        documents.business_registration
                      }
                    />


                    <DocumentItem
                      label="BPI License to Operate / Warehouse License"
                      document={
                        documents.warehouse_license
                      }
                    />
                  </div>
                )}
              </section>

            </div>
          )}
        </div>


        {/* ===================================================
            FOOTER ACTIONS
        =================================================== */}

        {!isLoading &&
          warehouse && (

          <div
            className="
              flex
              shrink-0
              flex-col-reverse
              gap-3
              border-t
              border-slate-200
              bg-white
              px-6
              py-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <button
              type="button"
              onClick={() =>
                onMessage?.()
              }
              disabled={
                isConfirming
              }
              className="
                h-10
                rounded-lg
                border
                border-slate-300
                bg-white
                px-5
                text-[12px]
                font-bold
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Message Warehouse Manager
            </button>


            <div
              className="
                flex
                flex-col-reverse
                gap-3
                sm:flex-row
              "
            >
              <button
                type="button"
                onClick={() => {
                  if (
                    !isConfirming
                  ) {
                    onClose?.();
                  }
                }}
                disabled={
                  isConfirming
                }
                className="
                  h-10
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-5
                  text-[12px]
                  font-bold
                  text-slate-600
                  transition
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Close
              </button>


              <button
                type="button"
                onClick={() =>
                  onConfirm?.()
                }
                disabled={
                  isConfirming
                }
                className="
                  h-10
                  min-w-[170px]
                  rounded-lg
                  bg-[#08751e]
                  px-5
                  text-[12px]
                  font-bold
                  text-white
                  transition
                  hover:bg-[#066319]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {isConfirming
                  ? "Confirming..."
                  : "Confirm Application"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};


export default WarehouseReviewModal;