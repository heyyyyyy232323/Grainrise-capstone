import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  ExternalLink,
  FileText,
  MapPin,
  X,
} from "lucide-react";


// ============================================================
// CONSTANTS
// ============================================================

const RSBSA_FINDER_URL =
  "https://finder-rsbsa.da.gov.ph/";


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


const buildFarmAddress = (
  farm
) => {
  if (
    farm?.location
      ?.complete_address
  ) {
    return farm.location
      .complete_address;
  }


  const location =
    farm?.location || {};


  const result = [
    location?.street_address,
    location?.barangay,
    location?.municipality,
    location?.province,
    location?.postal_code,
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
      )
      .replace(
        /-/g,
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


const formatFarmArea = (
  value
) => {
  const numericValue =
    Number(value);


  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return "—";
  }


  return `${numericValue.toLocaleString()} ha`;
};


const formatCount = (
  value
) => {
  const numericValue =
    Number(value);


  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return "0";
  }


  return numericValue.toLocaleString();
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
    normalized === "inactive"
  ) {
    return `
      border-amber-200
      bg-amber-50
      text-amber-700
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
            href={url}
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
// SUMMARY CARD
// ============================================================

const SummaryCard = ({
  label,
  value,
  subtext,
}) => (
  <div
    className="
      rounded-xl
      border
      border-gray-200
      bg-gray-50
      p-4
    "
  >
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
        text-lg
        font-bold
        text-gray-900
      "
    >
      {value}
    </p>

    {
      subtext && (
        <p
          className="
            mt-0.5
            text-[11px]
            text-gray-400
          "
        >
          {subtext}
        </p>
      )
    }
  </div>
);


// ============================================================
// FARM CARD
// ============================================================

const FarmCard = ({
  farm,
  index,
}) => {
  return (
    <div
      className="
        overflow-hidden
        rounded-xl
        border
        border-gray-200
        bg-white
      "
    >
      <div
        className="
          flex
          flex-col
          gap-3
          border-b
          border-gray-100
          bg-gray-50
          px-4
          py-3
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
              text-xs
              font-semibold
              text-gray-400
            "
          >
            Farm {index + 1}
          </p>

          <p
            className="
              mt-0.5
              truncate
              text-sm
              font-bold
              text-gray-900
            "
          >
            {
              displayValue(
                farm?.farm_name,
                `Farm ${index + 1}`
              )
            }
          </p>
        </div>


        <span
          className="
            inline-flex
            w-fit
            rounded-full
            border
            border-gray-200
            bg-white
            px-2.5
            py-1
            text-[10px]
            font-semibold
            text-gray-600
          "
        >
          {
            formatStatus(
              farm?.farm_status
            )
          }
        </span>
      </div>


      <div
        className="
          space-y-4
          p-4
        "
      >
        <div
          className="
            flex
            items-start
            gap-2
          "
        >
          <MapPin
            size={15}
            className="
              mt-0.5
              shrink-0
              text-gray-400
            "
          />

          <p
            className="
              text-xs
              leading-5
              text-gray-600
            "
          >
            {
              buildFarmAddress(
                farm
              )
            }
          </p>
        </div>


        <div
          className="
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-2
            lg:grid-cols-4
          "
        >
          <InfoField
            label="Farm Area"
            value={
              formatFarmArea(
                farm?.total_farm_area
              )
            }
          />

          <InfoField
            label="Land Ownership"
            value={
              formatStatus(
                farm?.land_ownership_status
              )
            }
          />

          <InfoField
            label="Rice Variety"
            value={
              farm
                ?.rice_variety_currently_planted
            }
          />

          <InfoField
            label="Cropping Cycles / Year"
            value={
              farm
                ?.cropping_cycles_per_year
            }
          />
        </div>
      </div>
    </div>
  );
};


// ============================================================
// FARMER REVIEW MODAL
// ============================================================

const FarmerReviewModal = ({
  isOpen,
  onClose,

  farmer,

  isLoading = false,
  isConfirming = false,

  onMessage,
  onConfirm,
}) => {
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


  if (!isOpen) {
    return null;
  }


  // =========================================================
  // DATA
  // =========================================================

  const personal =
    farmer
      ?.personal_information ||
    {};


  const address =
    farmer
      ?.address_information ||
    {};


  const account =
    farmer
      ?.account_information ||
    {};


  const compliance =
    farmer
      ?.compliance ||
    {};


  const farmSummary =
    farmer
      ?.farm_summary ||
    {};


  const farms =
    Array.isArray(
      farmer?.farms
    )
      ? farmer.farms
      : [];


  const status =
    farmer
      ?.status ||
    "";


  // =========================================================
  // CLOSE
  // =========================================================

  const handleClose = () => {
    if (
      isConfirming
    ) {
      return;
    }


    onClose?.();
  };


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
        handleClose
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
            max-w-4xl
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
                  Review Farmer Application
                </h2>


                {
                  !isLoading &&
                  farmer && (
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
                Review the Farmer information, RSBSA compliance,
                and registered farm details before confirming the account.
              </p>
            </div>


            <button
              type="button"
              onClick={
                handleClose
              }
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
                rounded-lg
                border
                border-gray-200
                bg-white
                text-gray-400
                transition
                hover:bg-gray-50
                hover:text-gray-600
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
              aria-label="Close Farmer review"
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
                    min-h-[440px]
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
                      Loading Farmer application...
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
                        Registered Farmer account holder.
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
                          formatStatus(
                            personal
                              ?.gender
                          )
                        }
                      />
                    </div>
                  </section>


                  {/* =========================================
                      ADDRESS
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
                      ACCOUNT
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
                      RSBSA COMPLIANCE
                  ========================================= */}

                  <section>
                    <div
                      className="
                        mb-3
                        flex
                        flex-col
                        gap-3
                        sm:flex-row
                        sm:items-start
                        sm:justify-between
                      "
                    >
                      <div>
                        <h3
                          className="
                            text-sm
                            font-bold
                            text-gray-900
                          "
                        >
                          RSBSA Compliance
                        </h3>

                        <p
                          className="
                            mt-0.5
                            text-[11px]
                            leading-5
                            text-gray-400
                          "
                        >
                          Review the submitted RSBSA information and
                          verify the registration through the official
                          Department of Agriculture RSBSA Finder when needed.
                        </p>
                      </div>


                      {/* =====================================
                          OFFICIAL RSBSA FINDER
                      ===================================== */}

                      <a
                        href={
                          RSBSA_FINDER_URL
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                          inline-flex
                          w-fit
                          shrink-0
                          items-center
                          justify-center
                          gap-2
                          rounded-lg
                          border
                          border-[#08511f]
                          bg-white
                          px-3
                          py-2
                          text-xs
                          font-semibold
                          text-[#08511f]
                          transition
                          hover:bg-emerald-50
                        "
                      >
                        Open RSBSA Finder

                        <ExternalLink
                          size={14}
                        />
                      </a>
                    </div>


                    <div
                      className="
                        rounded-xl
                        border
                        border-gray-200
                        bg-gray-50
                        p-4
                      "
                    >
                      <div
                        className="
                          grid
                          grid-cols-1
                          gap-4
                          sm:grid-cols-2
                        "
                      >
                        <InfoField
                          label="RSBSA Number"
                          value={
                            compliance
                              ?.rsbsa_number
                          }
                        />

                        <InfoField
                          label="Submission Method"
                          value={
                            formatStatus(
                              compliance
                                ?.submission_method
                            )
                          }
                        />
                      </div>


                      <div
                        className="
                          mt-4
                          rounded-lg
                          border
                          border-amber-200
                          bg-amber-50
                          px-4
                          py-3
                        "
                      >
                        <p
                          className="
                            text-xs
                            font-semibold
                            text-amber-800
                          "
                        >
                          Manual RSBSA Verification
                        </p>

                        <p
                          className="
                            mt-1
                            text-[11px]
                            leading-5
                            text-amber-700
                          "
                        >
                          GrainRise does not automatically verify records
                          from the RSBSA database. Use the official RSBSA
                          Finder above to manually verify the applicant's
                          registration before confirmation.
                        </p>
                      </div>
                    </div>


                    <div
                      className="
                        mt-3
                      "
                    >
                      <DocumentCard
                        label="RSBSA Document"
                        document={
                          compliance
                            ?.rsbsa_document
                        }
                      />
                    </div>
                  </section>


                  {/* =========================================
                      FARM SUMMARY
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
                        Farm Summary
                      </h3>

                      <p
                        className="
                          mt-0.5
                          text-[11px]
                          text-gray-400
                        "
                      >
                        Summary of farms registered under this Farmer account.
                      </p>
                    </div>


                    <div
                      className="
                        grid
                        grid-cols-1
                        gap-3
                        sm:grid-cols-2
                        lg:grid-cols-4
                      "
                    >
                      <SummaryCard
                        label="Registered Farms"
                        value={
                          formatCount(
                            farmSummary
                              ?.farm_count
                          )
                        }
                      />

                      <SummaryCard
                        label="Active Farms"
                        value={
                          formatCount(
                            farmSummary
                              ?.active_farm_count
                          )
                        }
                      />

                      <SummaryCard
                        label="Inactive Farms"
                        value={
                          formatCount(
                            farmSummary
                              ?.inactive_farm_count
                          )
                        }
                      />

                      <SummaryCard
                        label="Total Farm Area"
                        value={
                          formatFarmArea(
                            farmSummary
                              ?.total_farm_area
                          )
                        }
                      />
                    </div>
                  </section>


                  {/* =========================================
                      REGISTERED FARMS
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
                        Registered Farms
                      </h3>

                      <p
                        className="
                          mt-0.5
                          text-[11px]
                          text-gray-400
                        "
                      >
                        Farm information currently associated with the applicant.
                      </p>
                    </div>


                    {
                      farms.length > 0 ? (
                        <div
                          className="
                            space-y-3
                          "
                        >
                          {
                            farms.map(
                              (
                                farm,
                                index
                              ) => (
                                <FarmCard
                                  key={
                                    farm?.farm_id ||
                                    index
                                  }
                                  farm={
                                    farm
                                  }
                                  index={
                                    index
                                  }
                                />
                              )
                            )
                          }
                        </div>
                      ) : (
                        <div
                          className="
                            rounded-xl
                            border
                            border-dashed
                            border-gray-300
                            bg-gray-50
                            px-4
                            py-8
                            text-center
                          "
                        >
                          <p
                            className="
                              text-sm
                              font-semibold
                              text-gray-600
                            "
                          >
                            No registered farms found.
                          </p>

                          <p
                            className="
                              mt-1
                              text-xs
                              text-gray-400
                            "
                          >
                            This Farmer account currently has no farm
                            information associated with it.
                          </p>
                        </div>
                      )
                    }
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
                  flex-col-reverse
                  gap-2
                  border-t
                  border-gray-100
                  bg-white
                  px-6
                  py-4
                  sm:flex-row
                  sm:items-center
                  sm:justify-end
                "
              >
                <button
                  type="button"
                  onClick={
                    handleClose
                  }
                  disabled={
                    isConfirming
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
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Close
                </button>


                {
                  typeof onMessage ===
                    "function" && (
                    <button
                      type="button"
                      onClick={
                        onMessage
                      }
                      disabled={
                        isConfirming
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
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      Message
                    </button>
                  )
                }


                <button
                  type="button"
                  onClick={
                    onConfirm
                  }
                  disabled={
                    isConfirming ||
                    !farmer
                  }
                  className="
                    rounded-lg
                    bg-[#08511f]
                    px-4
                    py-2
                    text-xs
                    font-semibold
                    text-white
                    transition
                    hover:bg-[#063d18]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {
                    isConfirming
                      ? "Confirming..."
                      : "Confirm"
                  }
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


export default FarmerReviewModal;