import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  MapPin,
  Search,
} from "lucide-react";

import useFarmerContracts from "../../Components/hooks/Farmer/useFarmerContracts";
import Dropdown from "../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";

import FarmerContractDetailsModal from "../../Components/Modals/FarmerContractDetailsModal";
import FarmerContractVoidRequestModal from "../../Components/Modals/FarmerContractVoidRequestModal";
import { translations, useLanguagePreference } from "../../lib/translations";


// ============================================================
// CONSTANTS
// ============================================================

const CONTRACT_STATUS_LABELS = {
  active: "Active",
  void_requested: "Void Requested",
  completed: "Completed",
  voided: "Voided",
};


const FULFILLMENT_STATUS_LABELS = {
  pending: "Pending",
  partially_fulfilled:
    "Partially Fulfilled",
  fulfilled: "Fulfilled",
};


const MONTHS = [
  {
    value: "1",
    label: "January",
  },
  {
    value: "2",
    label: "February",
  },
  {
    value: "3",
    label: "March",
  },
  {
    value: "4",
    label: "April",
  },
  {
    value: "5",
    label: "May",
  },
  {
    value: "6",
    label: "June",
  },
  {
    value: "7",
    label: "July",
  },
  {
    value: "8",
    label: "August",
  },
  {
    value: "9",
    label: "September",
  },
  {
    value: "10",
    label: "October",
  },
  {
    value: "11",
    label: "November",
  },
  {
    value: "12",
    label: "December",
  },
];


// ============================================================
// HELPERS
// ============================================================

const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(date);
};


const formatQuantity = (
  value
) => {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return "—";
  }

  return `${new Intl.NumberFormat(
    "en-PH",
    {
      maximumFractionDigits: 2,
    }
  ).format(number)} kg`;
};


const formatPeso = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
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
};


const getContractStatusStyle = (
  status
) => {
  switch (status) {
    case "active":
      return "border-green-200 bg-green-50 text-green-700";

    case "void_requested":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "completed":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "voided":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};


const getFulfillmentStatusStyle = (
  status
) => {
  switch (status) {
    case "pending":
      return "border-slate-200 bg-slate-100 text-slate-600";

    case "partially_fulfilled":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "fulfilled":
      return "border-green-200 bg-green-50 text-green-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerContractsCurrent() {
  const [language] = useLanguagePreference();
  const t = translations[language]?.farmer ?? translations.en.farmer;

  const {
    contracts,
    selectedContract,

    isLoading,
    isSaving,
    error,

    loadContracts,
    loadContractDetails,
    requestVoid,
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
    fulfillmentFilter,
    setFulfillmentFilter,
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
  // MODALS
  // ==========================================================

  const [
    isDetailsOpen,
    setIsDetailsOpen,
  ] = useState(false);

  const [
    isVoidOpen,
    setIsVoidOpen,
  ] = useState(false);


  // ==========================================================
  // LOAD CONTRACTS
  // ==========================================================

  useEffect(
    () => {
      loadContracts().catch(
        () => {}
      );
    },
    [
      loadContracts,
    ]
  );


  // ==========================================================
  // FILTERED CONTRACTS
  // ==========================================================

  const visibleContracts =
    useMemo(
      () => {
        const keyword =
          search
            .trim()
            .toLowerCase();


        const filtered =
          contracts.filter(
            (
              contract
            ) => {
              // STATUS
              if (
                statusFilter &&
                contract.contract_status !==
                  statusFilter
              ) {
                return false;
              }


              // FULFILLMENT STATUS
              if (
                fulfillmentFilter &&
                contract.fulfillment_status !==
                  fulfillmentFilter
              ) {
                return false;
              }


              // YEAR / MONTH
              if (
                yearFilter ||
                monthFilter
              ) {
                const sourceDate =
                  contract.created_at ||
                  contract.contract_start_date;


                if (!sourceDate) {
                  return false;
                }


                const date =
                  new Date(
                    sourceDate
                  );


                if (
                  Number.isNaN(
                    date.getTime()
                  )
                ) {
                  return false;
                }


                if (
                  yearFilter &&
                  String(
                    date.getFullYear()
                  ) !==
                    String(
                      yearFilter
                    )
                ) {
                  return false;
                }


                if (
                  monthFilter &&
                  String(
                    date.getMonth() +
                      1
                  ) !==
                    String(
                      monthFilter
                    )
                ) {
                  return false;
                }
              }


              // SEARCH
              if (keyword) {
                const searchable =
                  [
                    contract.contract_code,
                    contract.business_name,
                    contract.organization_name,
                    contract.miller_name,
                    contract.product_code,
                    contract.product_type,
                    contract.rice_variety,
                    contract.product_grade,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                if (
                  !searchable.includes(
                    keyword
                  )
                ) {
                  return false;
                }
              }


              return true;
            }
          );


        return [
          ...filtered,
        ].sort(
          (
            first,
            second
          ) => {
            const firstDate =
              new Date(
                first.created_at ||
                  first.contract_start_date ||
                  0
              ).getTime();


            const secondDate =
              new Date(
                second.created_at ||
                  second.contract_start_date ||
                  0
              ).getTime();


            if (
              sortBy ===
              "oldest"
            ) {
              return (
                firstDate -
                secondDate
              );
            }


            if (
              sortBy ===
              "highest_value"
            ) {
              return (
                Number(
                  second.total_contract_value ||
                    0
                ) -
                Number(
                  first.total_contract_value ||
                    0
                )
              );
            }


            if (
              sortBy ===
              "lowest_value"
            ) {
              return (
                Number(
                  first.total_contract_value ||
                    0
                ) -
                Number(
                  second.total_contract_value ||
                    0
                )
              );
            }


            return (
              secondDate -
              firstDate
            );
          }
        );
      },
      [
        contracts,
        search,
        statusFilter,
        fulfillmentFilter,
        yearFilter,
        monthFilter,
        sortBy,
      ]
    );


  // ==========================================================
  // VIEW CONTRACT DETAILS
  // ==========================================================

  const handleViewDetails =
    async (
      contractId
    ) => {
      try {
        await loadContractDetails(
          contractId
        );

        setIsDetailsOpen(
          true
        );
      } catch {
        // Hook handles the error.
      }
    };


  // ==========================================================
  // OPEN VOID REQUEST
  // ==========================================================

  const handleOpenVoid =
    () => {
      if (
        selectedContract
          ?.contract_status !==
        "active"
      ) {
        return;
      }


      setIsDetailsOpen(
        false
      );

      setIsVoidOpen(
        true
      );
    };


  // ==========================================================
  // CLOSE VOID REQUEST
  // ==========================================================

  const handleCloseVoid =
    () => {
      if (isSaving) {
        return;
      }


      setIsVoidOpen(
        false
      );

      setIsDetailsOpen(
        true
      );
    };


  // ==========================================================
  // SUBMIT VOID REQUEST
  // ==========================================================

  const handleRequestVoid =
    async ({
      reason,
      remarks,
    }) => {
      if (
        !selectedContract
          ?.contract_id
      ) {
        return;
      }


      try {
        await requestVoid(
          selectedContract
            .contract_id,
          {
            reason,
            remarks,
          }
        );


        setIsVoidOpen(
          false
        );

        setIsDetailsOpen(
          false
        );
      } catch {
        // Hook handles the error.
      }
    };




  // ==========================================================
  // YEAR OPTIONS
  // ==========================================================

  const currentYear =
    new Date().getFullYear();


  const yearOptions =
    Array.from(
      {
        length: 5,
      },
      (
        _,
        index
      ) =>
        currentYear -
        index
    );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <div
        className="
          flex
          flex-col
          gap-6
        "
      >

        {/* ==================================================
            ERROR
        ================================================== */}

        {error &&
          !isDetailsOpen &&
          !isVoidOpen && (
            <div
              className="
                rounded-lg
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-sm
                text-red-700
              "
            >
              {error}
            </div>
          )}


        {/* ==================================================
            SEARCH + FILTERS
        ================================================== */}

        <div
          className="
            flex
            flex-col
            gap-3
            xl:flex-row
            xl:items-center
            xl:justify-between
          "
        >

          {/* SEARCH */}

          <div
            className="
              relative
              w-full
              xl:max-w-sm
            "
          >
            <Search
              size={17}
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />


            <input
              type="text"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder={t.contracts.filter.searchContracts}
              className="
                w-full
                rounded-lg
                border
                border-slate-300
                bg-white
                py-2.5
                pl-9
                pr-3
                text-sm
                text-slate-800
                outline-none
                placeholder:text-slate-400
                focus:border-green-600
                focus:ring-1
                focus:ring-green-600
              "
            />
          </div>


          {/* FILTER CONTROLS */}

          <div
            className="
              flex
              flex-wrap
              gap-3
            "
          >

            {/* CONTRACT STATUS */}
            <div className="w-40">
              <Dropdown
                options={[
                  { label: t.contracts.filter.contractStatus, value: "" },
                  { label: t.contracts.filter.active, value: "active" },
                  { label: t.contracts.filter.voidRequested, value: "void_requested" },
                  { label: t.contracts.filter.completed, value: "completed" },
                  { label: t.contracts.filter.voided, value: "voided" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder={t.contracts.filter.contractStatus}
              />
            </div>

            {/* FULFILLMENT */}
            <div className="w-44">
              <Dropdown
                options={[
                  { label: t.contracts.filter.fulfillmentStatus, value: "" },
                  { label: t.contracts.filter.pendingFulfillment, value: "pending" },
                  { label: t.contracts.filter.partiallyFulfilled, value: "partially_fulfilled" },
                  { label: t.contracts.filter.fulfilled, value: "fulfilled" },
                ]}
                value={fulfillmentFilter}
                onChange={setFulfillmentFilter}
                placeholder={t.contracts.filter.fulfillmentStatus}
              />
            </div>

            {/* YEAR */}
            <div className="w-28">
              <Dropdown
                options={[
                  { label: t.contracts.filter.allYears, value: "" },
                  ...yearOptions.map((y) => ({ label: String(y), value: String(y) })),
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
                  ...MONTHS.map((m) => ({ label: m.label, value: m.value })),
                ]}
                value={monthFilter}
                onChange={setMonthFilter}
                placeholder={t.contracts.filter.month}
              />
            </div>

            {/* SORT */}
            <SortByDropdown
              options={[
                { value: "newest", label: t.contracts.filter.newest },
                { value: "oldest", label: t.contracts.filter.oldest },
                { value: "highest_value", label: t.contracts.filter.highestValue },
                { value: "lowest_value", label: t.contracts.filter.lowestValue },
              ]}
              value={sortBy}
              onChange={setSortBy}
            />

          </div>
        </div>


        {/* ==================================================
            LOADING
        ================================================== */}

        {isLoading &&
          contracts.length ===
            0 && (
            <div
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                p-10
                text-center
                text-sm
                text-slate-500
              "
            >
              {t.contracts.empty.loading}
            </div>
          )}


        {/* ==================================================
            EMPTY
        ================================================== */}

        {!isLoading &&
          visibleContracts.length ===
            0 && (
            <div
              className="
                rounded-xl
                border
                border-dashed
                border-slate-300
                bg-white
                px-6
                py-12
                text-center
              "
            >
              <p
                className="
                  text-base
                  font-bold
                  text-slate-700
                "
              >
                No Contracts Available
              </p>


              <p
                className="
                  mx-auto
                  mt-1
                  max-w-md
                  text-sm
                  leading-6
                  text-slate-500
                "
              >
                Approved applications and accepted bidding offers will appear here as contracts.
              </p>
            </div>
          )}


        {/* ==================================================
            CONTRACT CARDS
        ================================================== */}

        {visibleContracts.length >
          0 && (
          <div
            className="
              grid
              grid-cols-1
              gap-4
              md:grid-cols-2
              xl:grid-cols-3
            "
          >
            {visibleContracts.map(
              (
                contract
              ) => {
                const millerName =
                  contract.business_name ||
                  contract.organization_name ||
                  contract.miller_name ||
                  "Miller / Buyer";


                return (
                  <article
                    key={
                      contract.contract_id
                    }
                    className="
                      flex
                      flex-col
                      overflow-hidden
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      shadow-sm
                      transition
                      hover:border-slate-300
                      hover:shadow-md
                    "
                  >

                    {/* ======================================
                        BODY
                    ====================================== */}

                    <div
                      className="
                        flex
                        flex-1
                        flex-col
                        gap-4
                        p-4
                      "
                    >

                      {/* ID + STATUS */}

                      <div
                        className="
                          flex
                          items-start
                          justify-between
                          gap-3
                        "
                      >
                        <div
                          className="
                            min-w-0
                          "
                        >
                          <span
                            className="
                              inline-flex
                              rounded-md
                              bg-green-100
                              px-2.5
                              py-1
                              text-[10px]
                              font-bold
                              text-green-700
                            "
                          >
                            {contract.contract_code}
                          </span>


                          <h4
                            className="
                              mt-2
                              truncate
                              text-[15px]
                              font-bold
                              text-slate-900
                            "
                            title={
                              millerName
                            }
                          >
                            {millerName}
                          </h4>
                        </div>


                        <span
                          className={`
                            shrink-0
                            rounded-full
                            border
                            px-2.5
                            py-1
                            text-[10px]
                            font-bold
                            ${getContractStatusStyle(
                              contract.contract_status
                            )}
                          `}
                        >
                          {CONTRACT_STATUS_LABELS[
                            contract.contract_status
                          ] ||
                            contract.contract_status}
                        </span>
                      </div>


                      {/* PRODUCT */}

                      <div
                        className="
                          rounded-xl
                          border
                          border-green-100
                          bg-green-50/50
                          p-3
                        "
                      >
                        <p
                          className="
                            text-[10px]
                            font-medium
                            uppercase
                            tracking-wide
                            text-green-700
                          "
                        >
                          {contract.product_type
                            ?.replaceAll(
                              "_",
                              " "
                            ) ||
                            "Rice Product"}
                        </p>


                        <p
                          className="
                            mt-1
                            text-base
                            font-bold
                            text-slate-900
                          "
                        >
                          {contract.rice_variety ||
                            "—"}
                        </p>


                        {contract.product_grade && (
                          <p
                            className="
                              mt-0.5
                              text-xs
                              text-slate-500
                            "
                          >
                            Grade:{" "}
                            <span className="font-semibold text-slate-700">
                              {contract.product_grade}
                            </span>
                          </p>
                        )}
                      </div>


                      {/* QUANTITY + VALUE */}

                      <div
                        className="
                          grid
                          grid-cols-2
                          gap-3
                        "
                      >
                        <div>
                          <p
                            className="
                              text-[10px]
                              font-medium
                              text-slate-400
                            "
                          >
                            Contracted Quantity
                          </p>

                          <p
                            className="
                              mt-1
                              text-sm
                              font-bold
                              text-slate-800
                            "
                          >
                            {formatQuantity(
                              contract.contracted_quantity_kg
                            )}
                          </p>
                        </div>


                        <div>
                          <p
                            className="
                              text-[10px]
                              font-medium
                              text-slate-400
                            "
                          >
                            Total Value
                          </p>

                          <p
                            className="
                              mt-1
                              text-sm
                              font-bold
                              text-slate-800
                            "
                          >
                            {formatPeso(
                              contract.total_contract_value
                            )}
                          </p>
                        </div>
                      </div>


                      {/* FULFILLMENT */}

                      <div
                        className="
                          border-t
                          border-slate-100
                          pt-3
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            gap-3
                          "
                        >
                          <p
                            className="
                              text-[10px]
                              font-medium
                              text-slate-400
                            "
                          >
                            Fulfillment
                          </p>


                          <span
                            className={`
                              rounded-full
                              border
                              px-2
                              py-0.5
                              text-[10px]
                              font-semibold
                              ${getFulfillmentStatusStyle(
                                contract.fulfillment_status
                              )}
                            `}
                          >
                            {FULFILLMENT_STATUS_LABELS[
                              contract.fulfillment_status
                            ] ||
                              contract.fulfillment_status}
                          </span>
                        </div>


                        <div
                          className="
                            mt-3
                            grid
                            grid-cols-2
                            gap-3
                          "
                        >
                          <div>
                            <p
                              className="
                                flex
                                items-center
                                gap-1
                                text-[10px]
                                text-slate-400
                              "
                            >
                              <CalendarDays
                                size={11}
                              />

                              Fulfillment Date
                            </p>

                            <p
                              className="
                                mt-1
                                text-xs
                                font-semibold
                                text-slate-700
                              "
                            >
                              {formatDate(
                                contract.fulfillment_date
                              )}
                            </p>
                          </div>


                          <div>
                            <p
                              className="
                                flex
                                items-center
                                gap-1
                                text-[10px]
                                text-slate-400
                              "
                            >
                              <MapPin
                                size={11}
                              />

                              Remaining
                            </p>

                            <p
                              className="
                                mt-1
                                text-xs
                                font-semibold
                                text-slate-700
                              "
                            >
                              {formatQuantity(
                                contract.remaining_quantity_kg
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>


                    {/* ======================================
                        ACTION
                    ====================================== */}

                    <div
                      className="
                        border-t
                        border-slate-200
                        bg-slate-50/60
                        p-3
                      "
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleViewDetails(
                            contract.contract_id
                          )
                        }
                        className="
                          w-full
                          rounded-lg
                          border
                          border-green-600
                          bg-white
                          px-4
                          py-2
                          text-sm
                          font-semibold
                          text-green-700
                          transition
                          hover:bg-green-50
                        "
                      >
                        View Details
                      </button>
                    </div>

                  </article>
                );
              }
            )}
          </div>
        )}

      </div>


      {/* ====================================================
          CONTRACT DETAILS MODAL
      ==================================================== */}

      <FarmerContractDetailsModal
        open={
          isDetailsOpen
        }
        contract={
          selectedContract
        }
        isLoading={
          isLoading
        }
        error={
          isDetailsOpen
            ? error
            : ""
        }
        onClose={() =>
          setIsDetailsOpen(
            false
          )
        }
        onRequestVoid={
          selectedContract
            ?.contract_status ===
          "active"
            ? handleOpenVoid
            : undefined
        }

        /*
          HINDI PA NATIN IPAPASA:

          onDownload
          onSign
          onMarkCompleted

          Dahil wala pa silang
          implemented backend endpoint.
        */
      />


      {/* ====================================================
          VOID REQUEST MODAL
      ==================================================== */}

      <FarmerContractVoidRequestModal
        open={
          isVoidOpen
        }
        contract={
          selectedContract
        }
        isSaving={
          isSaving
        }
        error={
          isVoidOpen
            ? error
            : ""
        }
        onClose={
          handleCloseVoid
        }
        onConfirm={
          handleRequestVoid
        }
      />

    </>
  );
}