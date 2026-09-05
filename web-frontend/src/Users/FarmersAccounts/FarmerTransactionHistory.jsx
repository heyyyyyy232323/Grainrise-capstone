import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Search,
} from "lucide-react";

import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../Components/Minor-Components/Tabs";

import FarmerContractHistoryDetailsModal from "../../Components/Modals/FarmerContractHistoryDetailsModal";

import useFarmerTransactionHistory from "../../Components/hooks/Farmer/useFarmerTransactionHistory";


// ============================================================
// GRAINRISE
// FARMER > TRANSACTION HISTORY
// ============================================================
//
// UI STYLE:
//
// Matches Farmer > Contracts:
//
// - Standard underline segmentation tabs
// - Filters are NOT inside a card/container
// - Simple table layout
// - Dashed empty state
//
// SEGMENTATION:
//
// 1. POS Transactions
//
// 2. Contract History
//
// ============================================================


// ============================================================
// CONSTANTS
// ============================================================

const ITEMS_PER_PAGE = 10;


const TRANSACTION_TABS = [
  {
    id: "pos",
    label: "POS Transactions",
  },
  {
    id: "contracts",
    label: "Contract History",
  },
];


const MONTHS = [
  {
    value: "",
    label: "Month",
  },
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

const formatCurrency = (
  value
) => {

  const numeric =
    Number(
      value
    );


  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return "—";
  }


  return numeric.toLocaleString(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

};


const formatQuantity = (
  value
) => {

  const numeric =
    Number(
      value
    );


  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return "—";
  }


  return `${numeric.toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )} kg`;

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
    return "—";
  }


  return date.toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }
  );

};


const formatLabel = (
  value
) => {

  if (!value) {
    return "—";
  }


  return String(
    value
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );

};


const formatProductType = (
  value
) => {

  switch (value) {

    case "unmilled_palay":
      return "Unmilled Palay";

    case "milled_rice":
      return "Milled Rice";

    default:
      return formatLabel(
        value
      );

  }

};


const getProductName = (
  item
) => {

  const variety =
    item?.rice_variety
    ||
    "Product";


  const grade =
    item?.product_grade
      ? ` · ${item.product_grade}`
      : "";


  return `${variety}${grade}`;

};


// ============================================================
// STATUS BADGE
// ============================================================

const getStatusStyle = (
  status
) => {

  switch (
    String(
      status || ""
    ).toLowerCase()
  ) {

    case "completed":
      return (
        "border-green-200 " +
        "bg-green-50 " +
        "text-green-700"
      );

    case "voided":
      return (
        "border-red-200 " +
        "bg-red-50 " +
        "text-red-700"
      );

    default:
      return (
        "border-slate-200 " +
        "bg-slate-100 " +
        "text-slate-600"
      );

  }

};


// ============================================================
// YEAR OPTIONS
// ============================================================

const buildYearOptions =
  () => {

    const currentYear =
      new Date().getFullYear();


    const years = [];


    for (
      let year = currentYear;
      year >= currentYear - 10;
      year -= 1
    ) {

      years.push(
        year
      );

    }


    return years;

  };


// ============================================================
// EMPTY STATE
// ============================================================

const EmptyState = ({
  title,
  description,
}) => {

  return (

    <div
      className="
        flex
        min-h-[120px]
        flex-col
        items-center
        justify-center
        rounded-xl
        border
        border-dashed
        border-slate-300
        bg-white
        px-6
        py-8
        text-center
      "
    >

      <p
        className="
          text-sm
          font-semibold
          text-slate-700
        "
      >
        {title}
      </p>


      <p
        className="
          mt-1
          text-sm
          text-slate-500
        "
      >
        {description}
      </p>

    </div>

  );

};


// ============================================================
// LOADING STATE
// ============================================================

const LoadingState = ({
  label,
}) => {

  return (

    <div
      className="
        flex
        min-h-[120px]
        items-center
        justify-center
        rounded-xl
        border
        border-dashed
        border-slate-300
        bg-white
      "
    >

      <div
        className="
          flex
          items-center
          gap-2
          text-sm
          font-medium
          text-slate-500
        "
      >

        <Loader2
          size={17}
          className="
            animate-spin
            text-green-700
          "
        />

        {label}

      </div>

    </div>

  );

};


// ============================================================
// PAGE
// ============================================================

export default function FarmerTransactionHistory() {

  // =========================================================
  // HOOK
  // =========================================================

  const {
    posTransactions,
    posPagination,

    contractHistory,
    contractPagination,
    selectedContract,

    isLoadingPos,
    isLoadingContracts,
    isLoadingContractDetails,

    error,

    loadPosTransactions,
    loadContractHistory,
    loadContractDetails,

    clearSelectedContract,
    clearError,
  } = useFarmerTransactionHistory();


  // =========================================================
  // ACTIVE TAB
  // =========================================================

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "pos"
  );


  // =========================================================
  // COMMON FILTERS
  // =========================================================

  const [
    search,
    setSearch,
  ] = useState(
    ""
  );


  const [
    year,
    setYear,
  ] = useState(
    ""
  );


  const [
    month,
    setMonth,
  ] = useState(
    ""
  );


  const [
    sortBy,
    setSortBy,
  ] = useState(
    "newest"
  );


  // =========================================================
  // POS FILTERS
  // =========================================================

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState(
    ""
  );


  const [
    transactionStatus,
    setTransactionStatus,
  ] = useState(
    ""
  );


  // =========================================================
  // PAGINATION
  // =========================================================

  const [
    posPage,
    setPosPage,
  ] = useState(
    1
  );


  const [
    contractPage,
    setContractPage,
  ] = useState(
    1
  );


  // =========================================================
  // CONTRACT MODAL
  // =========================================================

  const [
    showContractDetails,
    setShowContractDetails,
  ] = useState(
    false
  );


  // =========================================================
  // YEAR OPTIONS
  // =========================================================

  const yearOptions =
    useMemo(
      () =>
        buildYearOptions(),
      []
    );


  // =========================================================
  // RESET PAGE WHEN FILTER CHANGES
  // =========================================================

  useEffect(
    () => {

      if (
        activeTab === "pos"
      ) {

        setPosPage(
          1
        );

      } else {

        setContractPage(
          1
        );

      }

    },
    [
      activeTab,
      search,
      year,
      month,
      sortBy,
      paymentMethod,
      transactionStatus,
    ]
  );


  // =========================================================
  // LOAD POS TRANSACTIONS
  // =========================================================

  useEffect(
    () => {

      if (
        activeTab !== "pos"
      ) {
        return undefined;
      }


      const timer =
        window.setTimeout(
          async () => {

            try {

              await loadPosTransactions(
                {
                  search,
                  paymentMethod,
                  transactionStatus,
                  year,
                  month,
                  sortBy,
                  page:
                    posPage,
                  pageSize:
                    ITEMS_PER_PAGE,
                }
              );

            } catch {

              // Hook manages error.

            }

          },
          250
        );


      return () => {

        window.clearTimeout(
          timer
        );

      };

    },
    [
      activeTab,
      search,
      paymentMethod,
      transactionStatus,
      year,
      month,
      sortBy,
      posPage,
      loadPosTransactions,
    ]
  );


  // =========================================================
  // LOAD CONTRACT HISTORY
  // =========================================================

  useEffect(
    () => {

      if (
        activeTab !== "contracts"
      ) {
        return undefined;
      }


      const timer =
        window.setTimeout(
          async () => {

            try {

              await loadContractHistory(
                {
                  search,
                  year,
                  month,
                  sortBy,
                  page:
                    contractPage,
                  pageSize:
                    ITEMS_PER_PAGE,
                }
              );

            } catch {

              // Hook manages error.

            }

          },
          250
        );


      return () => {

        window.clearTimeout(
          timer
        );

      };

    },
    [
      activeTab,
      search,
      year,
      month,
      sortBy,
      contractPage,
      loadContractHistory,
    ]
  );


  // =========================================================
  // TAB CHANGE
  // =========================================================

  const handleTabChange = (
    tabId
  ) => {

    clearError();


    setActiveTab(
      tabId
    );


    setSearch(
      ""
    );


    setYear(
      ""
    );


    setMonth(
      ""
    );


    setSortBy(
      "newest"
    );


    setPaymentMethod(
      ""
    );


    setTransactionStatus(
      ""
    );


    setPosPage(
      1
    );


    setContractPage(
      1
    );

  };


  // =========================================================
  // VIEW CONTRACT
  // =========================================================

  const handleViewContract =
    async (
      contractId
    ) => {

      clearError();

      clearSelectedContract();


      setShowContractDetails(
        true
      );


      try {

        await loadContractDetails(
          contractId
        );

      } catch {

        // Hook manages error.

      }

    };


  // =========================================================
  // CLOSE CONTRACT
  // =========================================================

  const handleCloseContractDetails =
    () => {

      setShowContractDetails(
        false
      );


      clearSelectedContract();

    };


  // =========================================================
  // CURRENT PAGINATION
  // =========================================================

  const currentPagination =
    activeTab === "pos"
      ? posPagination
      : contractPagination;


  const currentPage =
    activeTab === "pos"
      ? posPage
      : contractPage;


  // =========================================================
  // PREVIOUS PAGE
  // =========================================================

  const goToPreviousPage =
    () => {

      if (
        currentPage <= 1
      ) {
        return;
      }


      if (
        activeTab === "pos"
      ) {

        setPosPage(
          (
            previous
          ) =>
            Math.max(
              1,
              previous - 1
            )
        );

      } else {

        setContractPage(
          (
            previous
          ) =>
            Math.max(
              1,
              previous - 1
            )
        );

      }

    };


  // =========================================================
  // NEXT PAGE
  // =========================================================

  const goToNextPage =
    () => {

      if (
        !currentPagination
          ?.has_next
      ) {
        return;
      }


      if (
        activeTab === "pos"
      ) {

        setPosPage(
          (
            previous
          ) =>
            previous + 1
        );

      } else {

        setContractPage(
          (
            previous
          ) =>
            previous + 1
        );

      }

    };


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="space-y-1">

        <Breadcrumbs
          items={[
            {
              label:
                "Business",
            },
            {
              label:
                "Transaction History",
            },
          ]}
        />


        <h2
          className="
            text-[clamp(2rem,3vw,2.5rem)]
            font-extrabold
            tracking-[-0.03em]
            text-slate-900
          "
        >
          Transaction History
        </h2>


        <p
          className="
            text-sm
            text-slate-500
          "
        >
          Review your recorded POS sales and previous contract transactions.
        </p>

      </div>


      {/* =====================================================
          SEGMENTATION
          SAME STYLE AS CONTRACTS
      ====================================================== */}

      <Tabs
        tabs={
          TRANSACTION_TABS
        }
        activeTab={
          activeTab
        }
        onTabChange={
          handleTabChange
        }
      />


      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (

        <div
          className="
            flex
            items-start
            gap-3
            rounded-lg
            border
            border-red-200
            bg-red-50
            px-4
            py-3
          "
        >

          <AlertCircle
            size={17}
            className="
              mt-0.5
              shrink-0
              text-red-600
            "
          />


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


      {/* =====================================================
          POS TRANSACTIONS
      ====================================================== */}

      {activeTab === "pos" && (

        <div className="space-y-5">

          {/* =================================================
              POS FILTERS

              NO OUTER CARD / CONTAINER
          ================================================== */}

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-3
            "
          >

            {/* SEARCH */}

            <div
              className="
                relative
                w-full
                md:w-[360px]
              "
            >

              <Search
                size={16}
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
                onChange={
                  (
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                }
                placeholder="Search transactions"
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  pl-9
                  pr-3
                  text-sm
                  text-slate-700
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:border-green-600
                  focus:ring-1
                  focus:ring-green-600
                "
              />

            </div>


            {/* STATUS */}

            <select
              value={
                transactionStatus
              }
              onChange={
                (
                  event
                ) =>
                  setTransactionStatus(
                    event.target.value
                  )
              }
              className="
                h-10
                min-w-[135px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                text-sm
                text-slate-600
                outline-none
                focus:border-green-600
              "
            >

              <option value="">
                All Status
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="voided">
                Voided
              </option>

            </select>


            {/* YEAR */}

            <select
              value={
                year
              }
              onChange={
                (
                  event
                ) =>
                  setYear(
                    event.target.value
                  )
              }
              className="
                h-10
                min-w-[110px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                text-sm
                text-slate-600
                outline-none
                focus:border-green-600
              "
            >

              <option value="">
                Year
              </option>


              {yearOptions.map(
                (
                  option
                ) => (

                  <option
                    key={
                      option
                    }
                    value={
                      option
                    }
                  >
                    {option}
                  </option>

                )
              )}

            </select>


            {/* MONTH */}

            <select
              value={
                month
              }
              onChange={
                (
                  event
                ) =>
                  setMonth(
                    event.target.value
                  )
              }
              className="
                h-10
                min-w-[125px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                text-sm
                text-slate-600
                outline-none
                focus:border-green-600
              "
            >

              {MONTHS.map(
                (
                  option
                ) => (

                  <option
                    key={
                      option.value ||
                      "month"
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>

                )
              )}

            </select>


            {/* PAYMENT */}

            <select
              value={
                paymentMethod
              }
              onChange={
                (
                  event
                ) =>
                  setPaymentMethod(
                    event.target.value
                  )
              }
              className="
                h-10
                min-w-[140px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                text-sm
                text-slate-600
                outline-none
                focus:border-green-600
              "
            >

              <option value="">
                All Payments
              </option>

              <option value="cash">
                Cash
              </option>

              <option value="card">
                Card
              </option>

            </select>


            {/* SORT */}

            <select
              value={
                sortBy
              }
              onChange={
                (
                  event
                ) =>
                  setSortBy(
                    event.target.value
                  )
              }
              className="
                h-10
                min-w-[140px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                text-sm
                text-slate-600
                outline-none
                focus:border-green-600
              "
            >

              <option value="newest">
                Newest
              </option>

              <option value="oldest">
                Oldest
              </option>

            </select>

          </div>


          {/* =================================================
              POS CONTENT
          ================================================== */}

          {isLoadingPos ? (

            <LoadingState
              label="Loading POS transactions..."
            />

          ) : posTransactions.length === 0 ? (

            <EmptyState
              title="No POS Transactions Available"
              description="Your recorded Point of Sale transactions will appear here."
            />

          ) : (

            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-slate-200
                bg-white
              "
            >

              <div className="overflow-x-auto">

                <table className="min-w-full">

                  <thead
                    className="
                      border-b
                      border-slate-200
                      bg-slate-50
                    "
                  >

                    <tr>

                      {[
                        "Transaction ID",
                        "Date",
                        "Buyer / Payee",
                        "Type",
                        "Product",
                        "Qty",
                        "Amount",
                        "Payment",
                        "Status",
                      ].map(
                        (
                          heading
                        ) => (

                          <th
                            key={
                              heading
                            }
                            className="
                              whitespace-nowrap
                              px-4
                              py-3
                              text-left
                              text-[11px]
                              font-semibold
                              uppercase
                              tracking-wide
                              text-slate-500
                            "
                          >
                            {heading}
                          </th>

                        )
                      )}

                    </tr>

                  </thead>


                  <tbody
                    className="
                      divide-y
                      divide-slate-100
                    "
                  >

                    {posTransactions.map(
                      (
                        item
                      ) => (

                        <tr
                          key={
                            item.transaction_id
                          }
                          className="
                            transition
                            hover:bg-slate-50
                          "
                        >

                          <td
                            className="
                              whitespace-nowrap
                              px-4
                              py-4
                              text-sm
                              font-semibold
                              text-slate-800
                            "
                          >
                            {item.transaction_code}
                          </td>


                          <td
                            className="
                              whitespace-nowrap
                              px-4
                              py-4
                              text-sm
                              text-slate-600
                            "
                          >
                            {formatDate(
                              item.transaction_date
                            )}
                          </td>


                          <td
                            className="
                              whitespace-nowrap
                              px-4
                              py-4
                              text-sm
                              text-slate-600
                            "
                          >
                            {item.buyer_name ||
                              "Walk-in Buyer"}
                          </td>


                          <td
                            className="
                              whitespace-nowrap
                              px-4
                              py-4
                              text-sm
                              text-slate-600
                            "
                          >
                            {item.transaction_type ||
                              "Sale"}
                          </td>


                          <td
                            className="
                              min-w-[180px]
                              px-4
                              py-4
                            "
                          >

                            <p
                              className="
                                text-sm
                                font-semibold
                                text-slate-800
                              "
                            >
                              {getProductName(
                                item
                              )}
                            </p>


                            <p
                              className="
                                mt-0.5
                                text-xs
                                text-slate-400
                              "
                            >
                              {formatProductType(
                                item.product_type
                              )}
                            </p>

                          </td>


                          <td
                            className="
                              whitespace-nowrap
                              px-4
                              py-4
                              text-sm
                              text-slate-600
                            "
                          >
                            {formatQuantity(
                              item.quantity_sold_kg
                            )}
                          </td>


                          <td
                            className="
                              whitespace-nowrap
                              px-4
                              py-4
                              text-sm
                              font-semibold
                              text-slate-800
                            "
                          >
                            {formatCurrency(
                              item.amount
                            )}
                          </td>


                          <td
                            className="
                              whitespace-nowrap
                              px-4
                              py-4
                              text-sm
                              text-slate-600
                            "
                          >
                            {formatLabel(
                              item.payment_method
                            )}
                          </td>


                          <td
                            className="
                              whitespace-nowrap
                              px-4
                              py-4
                            "
                          >

                            <span
                              className={`
                                inline-flex
                                rounded-full
                                border
                                px-2.5
                                py-1
                                text-xs
                                font-semibold
                                ${getStatusStyle(
                                  item.transaction_status
                                )}
                              `}
                            >
                              {formatLabel(
                                item.transaction_status
                              )}
                            </span>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          )}

        </div>

      )}


      {/* =====================================================
          CONTRACT HISTORY
      ====================================================== */}

      {activeTab === "contracts" && (

        <div className="space-y-5">

          {/* =================================================
              CONTRACT FILTERS
              SAME CONTRACTS PAGE STYLE
          ================================================== */}

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-3
            "
          >

            {/* SEARCH */}

            <div
              className="
                relative
                w-full
                md:w-[360px]
              "
            >

              <Search
                size={16}
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
                onChange={
                  (
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                }
                placeholder="Search contracts"
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  pl-9
                  pr-3
                  text-sm
                  text-slate-700
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:border-green-600
                  focus:ring-1
                  focus:ring-green-600
                "
              />

            </div>


            {/* YEAR */}

            <select
              value={
                year
              }
              onChange={
                (
                  event
                ) =>
                  setYear(
                    event.target.value
                  )
              }
              className="
                h-10
                min-w-[110px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                text-sm
                text-slate-600
                outline-none
                focus:border-green-600
              "
            >

              <option value="">
                Year
              </option>


              {yearOptions.map(
                (
                  option
                ) => (

                  <option
                    key={
                      option
                    }
                    value={
                      option
                    }
                  >
                    {option}
                  </option>

                )
              )}

            </select>


            {/* MONTH */}

            <select
              value={
                month
              }
              onChange={
                (
                  event
                ) =>
                  setMonth(
                    event.target.value
                  )
              }
              className="
                h-10
                min-w-[125px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                text-sm
                text-slate-600
                outline-none
                focus:border-green-600
              "
            >

              {MONTHS.map(
                (
                  option
                ) => (

                  <option
                    key={
                      option.value ||
                      "month"
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>

                )
              )}

            </select>


            {/* SORT */}

            <select
              value={
                sortBy
              }
              onChange={
                (
                  event
                ) =>
                  setSortBy(
                    event.target.value
                  )
              }
              className="
                h-10
                min-w-[140px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                text-sm
                text-slate-600
                outline-none
                focus:border-green-600
              "
            >

              <option value="newest">
                Newest
              </option>

              <option value="oldest">
                Oldest
              </option>

            </select>

          </div>


          {/* =================================================
              CONTRACT CONTENT
          ================================================== */}

          {isLoadingContracts ? (

            <LoadingState
              label="Loading Contract History..."
            />

          ) : contractHistory.length === 0 ? (

            <EmptyState
              title="No Contract History Available"
              description="Your completed or voided contracts will appear here."
            />

          ) : (

            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-slate-200
                bg-white
              "
            >

              <div className="overflow-x-auto">

                <table className="min-w-full">

                  <thead
                    className="
                      border-b
                      border-slate-200
                      bg-slate-50
                    "
                  >

                    <tr>

                      {[
                        "Contract ID",
                        "Date",
                        "Product",
                        "Qty",
                        "Price/kg",
                        "Action",
                      ].map(
                        (
                          heading
                        ) => (

                          <th
                            key={
                              heading
                            }
                            className="
                              whitespace-nowrap
                              px-5
                              py-3
                              text-left
                              text-[11px]
                              font-semibold
                              uppercase
                              tracking-wide
                              text-slate-500
                            "
                          >
                            {heading}
                          </th>

                        )
                      )}

                    </tr>

                  </thead>


                  <tbody
                    className="
                      divide-y
                      divide-slate-100
                    "
                  >

                    {contractHistory.map(
                      (
                        contract
                      ) => (

                        <tr
                          key={
                            contract.contract_id
                          }
                          className="
                            transition
                            hover:bg-slate-50
                          "
                        >

                          {/* CONTRACT ID */}

                          <td
                            className="
                              whitespace-nowrap
                              px-5
                              py-4
                              text-sm
                              font-semibold
                              text-slate-800
                            "
                          >
                            {contract.contract_code}
                          </td>


                          {/* DATE */}

                          <td
                            className="
                              whitespace-nowrap
                              px-5
                              py-4
                              text-sm
                              text-slate-600
                            "
                          >
                            {formatDate(
                              contract.contract_date
                            )}
                          </td>


                          {/* PRODUCT */}

                          <td
                            className="
                              min-w-[200px]
                              px-5
                              py-4
                            "
                          >

                            <p
                              className="
                                text-sm
                                font-semibold
                                text-slate-800
                              "
                            >
                              {getProductName(
                                contract
                              )}
                            </p>


                            <p
                              className="
                                mt-0.5
                                text-xs
                                text-slate-400
                              "
                            >
                              {formatProductType(
                                contract.product_type
                              )}
                            </p>

                          </td>


                          {/* QTY */}

                          <td
                            className="
                              whitespace-nowrap
                              px-5
                              py-4
                              text-sm
                              text-slate-600
                            "
                          >
                            {formatQuantity(
                              contract.contracted_quantity_kg
                            )}
                          </td>


                          {/* PRICE */}

                          <td
                            className="
                              whitespace-nowrap
                              px-5
                              py-4
                              text-sm
                              font-semibold
                              text-slate-800
                            "
                          >
                            {formatCurrency(
                              contract.agreed_price_per_kg
                            )}
                          </td>


                          {/* ACTION */}

                          <td
                            className="
                              whitespace-nowrap
                              px-5
                              py-4
                            "
                          >

                            <button
                              type="button"
                              onClick={
                                () =>
                                  handleViewContract(
                                    contract.contract_id
                                  )
                              }
                              className="
                                text-sm
                                font-semibold
                                text-green-700
                                transition
                                hover:text-green-800
                                hover:underline
                              "
                            >
                              View Details
                            </button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          )}

        </div>

      )}


      {/* =====================================================
          PAGINATION
      ====================================================== */}

      {Number(
        currentPagination
          ?.total_items
        ||
        0
      ) > 0 && (

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

          <p
            className="
              text-xs
              text-slate-500
            "
          >
            Page{" "}

            <span
              className="
                font-semibold
                text-slate-700
              "
            >
              {currentPage}
            </span>

            {" "}of{" "}

            <span
              className="
                font-semibold
                text-slate-700
              "
            >
              {Math.max(
                1,
                Number(
                  currentPagination
                    ?.total_pages
                  ||
                  1
                )
              )}
            </span>

          </p>


          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <button
              type="button"
              onClick={
                goToPreviousPage
              }
              disabled={
                !currentPagination
                  ?.has_previous
              }
              className="
                inline-flex
                h-9
                items-center
                gap-1
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                text-xs
                font-semibold
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >

              <ChevronLeft
                size={14}
              />

              Previous

            </button>


            <button
              type="button"
              onClick={
                goToNextPage
              }
              disabled={
                !currentPagination
                  ?.has_next
              }
              className="
                inline-flex
                h-9
                items-center
                gap-1
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                text-xs
                font-semibold
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >

              Next

              <ChevronRight
                size={14}
              />

            </button>

          </div>

        </div>

      )}


      {/* =====================================================
          CONTRACT HISTORY DETAILS MODAL
      ====================================================== */}

      <FarmerContractHistoryDetailsModal
        open={
          showContractDetails
        }
        contract={
          selectedContract
        }
        isLoading={
          isLoadingContractDetails
        }
        onClose={
          handleCloseContractDetails
        }
      />

    </div>

  );

}