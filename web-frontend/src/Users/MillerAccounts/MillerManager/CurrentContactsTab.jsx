import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Eye,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
} from "lucide-react";

import useMillerCurrentContracts from "../../../Components/hooks/Miller/useMillerCurrentContracts";

import MillerCurrentContractDetailsModal from "../../../Components/Modals/Miller/MillerCurrentContractDetailsModal";


const STATUS_OPTIONS = [
  {
    value: "",
    label: "All Statuses",
  },

  {
    value: "active",
    label: "Active",
  },

  {
    value: "void_requested",
    label: "Void Requested",
  },

  {
    value: "completed",
    label: "Completed",
  },

  {
    value: "voided",
    label: "Voided",
  },
];


const PRODUCT_TYPE_OPTIONS = [
  {
    value: "",
    label: "All Product Types",
  },

  {
    value: "unmilled_palay",
    label: "Unmilled Palay",
  },

  {
    value: "milled_rice",
    label: "Milled Rice",
  },
];


const BASE_VARIETIES = [
  "Dinorado",
  "Sinandomeng",
  "Jasmine",
  "NSIC Rc 216",
  "NSIC Rc 222",
  "NSIC Rc 238",
  "NSIC Rc 402",
  "NSIC Rc 480",
  "PSB Rc 18",
];


const MONTH_OPTIONS = [
  {
    value: "",
    label: "All Months",
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


const SORT_OPTIONS = [
  {
    value: "newest",
    label: "Newest",
  },

  {
    value: "oldest",
    label: "Oldest",
  },

  {
    value: "fulfillment",
    label: "Nearest Fulfillment Date",
  },
];


const STATUS_STYLES = {
  active:
    "bg-emerald-100 text-emerald-700",

  void_requested:
    "bg-amber-100 text-amber-700",

  completed:
    "bg-blue-100 text-blue-700",

  voided:
    "bg-red-100 text-red-700",
};


// ============================================================
// HELPERS
// ============================================================

function titleCase(
  value
) {
  return String(
    value || ""
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character.toUpperCase()
    );
}


function productTypeLabel(
  value
) {
  if (
    value
    === "unmilled_palay"
  ) {
    return "Unmilled Palay";
  }


  if (
    value
    === "milled_rice"
  ) {
    return "Milled Rice";
  }


  return titleCase(
    value
  ) || "—";
}


function contractSourceLabel(
  value
) {
  if (
    value
    === "posting_application"
  ) {
    return "Posting Application";
  }


  if (
    value
    === "bidding_offer"
  ) {
    return "Bidding Offer";
  }


  return titleCase(
    value
  ) || "—";
}


function formatDate(
  value
) {
  if (!value) {
    return "—";
  }


  const parsed =
    new Date(
      value
    );


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return String(
      value
    );
  }


  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(
    parsed
  );
}


function formatQuantity(
  value
) {
  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {
    return "0 kg";
  }


  return `${new Intl.NumberFormat(
    "en-PH",
    {
      maximumFractionDigits:
        2,
    }
  ).format(
    number
  )} kg`;
}


function formatPeso(
  value
) {
  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {
    return "—";
  }


  return new Intl.NumberFormat(
    "en-PH",
    {
      style:
        "currency",

      currency:
        "PHP",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  ).format(
    number
  );
}


function FilterSelect({
  value,
  onChange,
  options,
}) {
  return (
    <div
      className="
        relative
      "
    >
      <select
        value={
          value
        }
        onChange={
          (
            event
          ) =>
            onChange(
              event.target.value
            )
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
          font-normal
          text-gray-700
          outline-none
          transition
          focus:border-[#0B5D1E]
          focus:ring-1
          focus:ring-[#0B5D1E]
        "
      >
        {options.map(
          (
            option
          ) => (
            <option
              key={
                option.value
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


      <span
        className="
          pointer-events-none
          absolute
          right-3
          top-1/2
          -translate-y-1/2
          text-xs
          text-gray-400
        "
      >
        ▾
      </span>
    </div>
  );
}


// ============================================================
// CONTRACT CARD
// ============================================================

function ContractCard({
  contract,
  onView,
}) {
  const status =
    String(
      contract.contract_status
      || "active"
    ).toLowerCase();


  const farmLocation =
    [
      contract.farm_municipality,
      contract.farm_province,
    ]
      .filter(Boolean)
      .join(", ")
      || "Location unavailable";


  return (
    <article
      className="
        flex
        min-h-[420px]
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-sm
        transition
        hover:border-slate-300
        hover:shadow-md
      "
    >
      {/* PRODUCT PHOTO */}

      <div
        className="
          relative
          h-40
          overflow-hidden
          bg-slate-100
        "
      >
        {contract.product_image ? (
          <img
            src={
              contract.product_image
            }
            alt={
              contract.rice_variety
              || "Contract product"
            }
            className="
              h-full
              w-full
              object-cover
            "
          />

        ) : (
          <div
            className="
              flex
              h-full
              items-center
              justify-center
              text-sm
              text-slate-400
            "
          >
            No Product Photo
          </div>
        )}


        <span
          className={`
            absolute
            right-3
            top-3
            rounded-full
            px-2.5
            py-1
            text-[10px]
            font-bold
            uppercase
            shadow-sm

            ${
              STATUS_STYLES[
                status
              ]
              || "bg-slate-100 text-slate-600"
            }
          `}
        >
          {titleCase(
            status
          )}
        </span>
      </div>


      {/* BODY */}

      <div
        className="
          flex
          flex-1
          flex-col
          p-5
        "
      >
        <div>
          <p
            className="
              text-xs
              font-semibold
              uppercase
              tracking-wide
              text-[#0B5D1E]
            "
          >
            {contract.contract_code
              || `CON-${contract.contract_id}`}
          </p>


          <h3
            className="
              mt-1
              truncate
              text-lg
              font-bold
              text-slate-900
            "
          >
            {contract.farmer_name
              || "Farmer"}
          </h3>


          <p
            className="
              mt-1
              text-sm
              font-medium
              text-slate-600
            "
          >
            {contract.farm_name
              || "Registered Farm"}
          </p>


          <p
            className="
              mt-1
              flex
              items-start
              gap-1.5
              text-xs
              text-slate-500
            "
          >
            <MapPin
              size={13}
              className="
                mt-0.5
                shrink-0
              "
            />

            {farmLocation}
          </p>
        </div>


        <div
          className="
            mt-4
            rounded-xl
            bg-slate-50
            p-3
          "
        >
          <p
            className="
              text-[10px]
              font-semibold
              uppercase
              tracking-wide
              text-slate-400
            "
          >
            {productTypeLabel(
              contract.product_type
            )}
          </p>

          <p
            className="
              mt-1
              text-base
              font-bold
              text-slate-900
            "
          >
            {contract.rice_variety
              || "Rice Variety"}
          </p>
        </div>


        <div
          className="
            mt-4
            grid
            grid-cols-2
            gap-3
          "
        >
          <div>
            <p
              className="
                text-[11px]
                text-slate-400
              "
            >
              Contracted Quantity
            </p>

            <p
              className="
                mt-1
                text-sm
                font-semibold
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
                text-[11px]
                text-slate-400
              "
            >
              Agreed Price
            </p>

            <p
              className="
                mt-1
                text-sm
                font-semibold
                text-slate-800
              "
            >
              {formatPeso(
                contract.agreed_price_per_kg
              )}
              <span
                className="
                  ml-0.5
                  text-[10px]
                  font-normal
                  text-slate-400
                "
              >
                /kg
              </span>
            </p>
          </div>


          <div>
            <p
              className="
                text-[11px]
                text-slate-400
              "
            >
              Contract Value
            </p>

            <p
              className="
                mt-1
                text-sm
                font-semibold
                text-slate-800
              "
            >
              {formatPeso(
                contract.total_contract_value
              )}
            </p>
          </div>


          <div>
            <p
              className="
                text-[11px]
                text-slate-400
              "
            >
              Fulfillment Date
            </p>

            <p
              className="
                mt-1
                flex
                items-center
                gap-1
                text-sm
                font-semibold
                text-slate-800
              "
            >
              <CalendarDays
                size={13}
              />

              {formatDate(
                contract.fulfillment_date
              )}
            </p>
          </div>
        </div>


        <div
          className="
            mt-4
            border-t
            border-slate-100
            pt-3
          "
        >
          <p
            className="
              text-[11px]
              text-slate-400
            "
          >
            Contract Source
          </p>

          <p
            className="
              mt-1
              text-sm
              font-semibold
              text-slate-700
            "
          >
            {contractSourceLabel(
              contract.contract_source
            )}
          </p>
        </div>


        <button
          type="button"
          onClick={
            () =>
              onView(
                contract.contract_id
              )
          }
          className="
            mt-auto
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            border-[#0B5D1E]
            py-2.5
            text-sm
            font-normal
            text-[#0B5D1E]
            transition
            hover:bg-emerald-50
          "
        >
          <Eye
            size={15}
          />

          View Details
        </button>
      </div>
    </article>
  );
}


// ============================================================
// MAIN TAB
// ============================================================

export default function CurrentContractsTab({
  onOpenMessages,
}) {
  const {
    contracts,
    isContractsLoading,
    contractsError,

    selectedContract,
    isContractLoading,
    contractError,

    isActionLoading,
    actionError,

    loadContracts,
    loadContractDetails,

    signContract,
    completeContract,
    requestVoid,

    clearSelectedContract,
    clearActionError,
  } = useMillerCurrentContracts();


  // ==========================================================
  // FILTER STATE
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
    productType,
    setProductType,
  ] = useState("");


  const [
    riceVariety,
    setRiceVariety,
  ] = useState("");


  const [
    year,
    setYear,
  ] = useState("");


  const [
    month,
    setMonth,
  ] = useState("");


  const [
    sortBy,
    setSortBy,
  ] = useState(
    "newest"
  );


  const [
    detailModalOpen,
    setDetailModalOpen,
  ] = useState(false);


  // ==========================================================
  // QUERY OBJECT
  // ==========================================================

  const currentFilters =
    useMemo(
      () => ({
        search,
        status:
          statusFilter,

        productType,
        riceVariety,
        year,
        month,
        sortBy,
      }),
      [
        search,
        statusFilter,
        productType,
        riceVariety,
        year,
        month,
        sortBy,
      ]
    );


  // ==========================================================
  // LOAD CONTRACTS
  // ==========================================================

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            loadContracts(
              currentFilters
            ).catch(
              () => {}
            );
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
      currentFilters,
      loadContracts,
    ]
  );


  // ==========================================================
  // DYNAMIC VARIETIES
  // ==========================================================

  const varietyOptions =
    useMemo(
      () => {
        const values =
          new Set(
            BASE_VARIETIES
          );


        contracts.forEach(
          (
            contract
          ) => {
            if (
              contract.rice_variety
            ) {
              values.add(
                contract.rice_variety
              );
            }
          }
        );


        return [
          {
            value: "",
            label: "All Varieties",
          },

          ...Array.from(
            values
          )
            .sort(
              (
                a,
                b
              ) =>
                a.localeCompare(
                  b
                )
            )
            .map(
              (
                value
              ) => ({
                value,
                label:
                  value,
              })
            ),
        ];
      },
      [
        contracts,
      ]
    );


  // ==========================================================
  // YEARS
  // ==========================================================

  const yearOptions =
    useMemo(
      () => {
        const years =
          new Set([
            new Date()
              .getFullYear(),
          ]);


        contracts.forEach(
          (
            contract
          ) => {
            const value =
              contract.created_at;


            if (!value) {
              return;
            }


            const parsed =
              new Date(
                value
              );


            if (
              !Number.isNaN(
                parsed.getTime()
              )
            ) {
              years.add(
                parsed.getFullYear()
              );
            }
          }
        );


        return [
          {
            value: "",
            label: "All Years",
          },

          ...Array.from(
            years
          )
            .sort(
              (
                a,
                b
              ) =>
                b - a
            )
            .map(
              (
                value
              ) => ({
                value:
                  String(
                    value
                  ),

                label:
                  String(
                    value
                  ),
              })
            ),
        ];
      },
      [
        contracts,
      ]
    );


  // ==========================================================
  // VIEW
  // ==========================================================

  const handleViewContract =
    async (
      contractId
    ) => {
      clearSelectedContract();

      setDetailModalOpen(
        true
      );


      try {
        await loadContractDetails(
          contractId
        );

      } catch {
        // Modal displays hook error.
      }
    };


  const handleCloseModal =
    () => {
      if (isActionLoading) {
        return;
      }


      setDetailModalOpen(
        false
      );

      clearSelectedContract();
    };


  // ==========================================================
  // REFRESH BOTH DETAIL + LIST
  // ==========================================================

  const refreshCurrentContract =
    async () => {
      if (
        selectedContract?.contract_id
      ) {
        await loadContractDetails(
          selectedContract.contract_id
        );
      }


      await loadContracts(
        currentFilters
      );
    };


  // ==========================================================
  // SIGN
  // ==========================================================

  const handleSign =
    async (
      signature
    ) => {
      if (
        !selectedContract?.contract_id
      ) {
        return false;
      }


      try {
        await signContract(
          selectedContract.contract_id,
          signature
        );


        await refreshCurrentContract();


        return true;

      } catch {
        return false;
      }
    };


  // ==========================================================
  // COMPLETE
  // ==========================================================

  const handleComplete =
    async () => {
      if (
        !selectedContract?.contract_id
      ) {
        return false;
      }


      try {
        await completeContract(
          selectedContract.contract_id
        );


        await refreshCurrentContract();


        return true;

      } catch {
        return false;
      }
    };


  // ==========================================================
  // VOID
  // ==========================================================

  const handleRequestVoid =
    async ({
      reason,
      remarks,
    }) => {
      if (
        !selectedContract?.contract_id
      ) {
        return false;
      }


      try {
        await requestVoid(
          selectedContract.contract_id,
          {
            reason,
            remarks,
          }
        );


        await refreshCurrentContract();


        return true;

      } catch {
        return false;
      }
    };


  // ==========================================================
  // OPEN CONTRACT CONVERSATION IN MESSAGES TAB
  // ==========================================================

  const handleMessageFarmer =
    () => {
      if (!selectedContract) {
        return;
      }


      const target = {
        farmer_user_id:
          selectedContract.farmer_user_id,

        farmer_name:
          selectedContract.farmer_name
          || "Farmer",

        farm_name:
          selectedContract.farm_name
          || "Registered Farm",

        reference_type:
          "contract",

        reference_id:
          selectedContract.contract_id,

        reference_code:
          selectedContract.contract_code
          || null,
      };


      setDetailModalOpen(
        false
      );

      clearSelectedContract();

      onOpenMessages?.(
        target
      );
    };

  return (
    <>
      <div
        className="
          space-y-5
        "
      >
        {/* ==================================================
            SEARCH
        ================================================== */}

        <div
          className="
            relative
            w-full
          "
        >
          <Search
            size={16}
            className="
              absolute
              left-3.5
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
            placeholder="Search Contract ID, Farmer, product, or rice variety"
            className="
              w-full
              rounded-xl
              border
              border-slate-200
              bg-white
              py-2.5
              pl-10
              pr-4
              text-sm
              text-slate-700
              outline-none
              transition
              placeholder:text-slate-400
              focus:border-[#0B5D1E]
              focus:ring-1
              focus:ring-[#0B5D1E]
            "
          />
        </div>


        {/* ==================================================
            FILTERS
        ================================================== */}

        <div
          className="
            flex
            flex-wrap
            items-center
            gap-2
          "
        >
          <FilterSelect
            value={
              statusFilter
            }
            onChange={
              setStatusFilter
            }
            options={
              STATUS_OPTIONS
            }
          />


          <FilterSelect
            value={
              productType
            }
            onChange={
              setProductType
            }
            options={
              PRODUCT_TYPE_OPTIONS
            }
          />


          <FilterSelect
            value={
              riceVariety
            }
            onChange={
              setRiceVariety
            }
            options={
              varietyOptions
            }
          />


          <FilterSelect
            value={
              year
            }
            onChange={
              setYear
            }
            options={
              yearOptions
            }
          />


          <FilterSelect
            value={
              month
            }
            onChange={
              setMonth
            }
            options={
              MONTH_OPTIONS
            }
          />


          <FilterSelect
            value={
              sortBy
            }
            onChange={
              setSortBy
            }
            options={
              SORT_OPTIONS
            }
          />


          <button
            type="button"
            onClick={
              () =>
                loadContracts(
                  currentFilters
                ).catch(
                  () => {}
                )
            }
            disabled={
              isContractsLoading
            }
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3.5
              py-2
              text-sm
              font-normal
              text-slate-600
              transition
              hover:bg-slate-50
              disabled:opacity-50
            "
          >
            <RefreshCw
              size={14}
              className={
                isContractsLoading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>


        {/* ==================================================
            ERROR
        ================================================== */}

        {contractsError && (
          <div
            className="
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-sm
              text-red-700
            "
          >
            {contractsError}
          </div>
        )}


        {/* ==================================================
            LOADING
        ================================================== */}

        {isContractsLoading && (
          <div
            className="
              flex
              min-h-[260px]
              items-center
              justify-center
              rounded-2xl
              border
              border-slate-200
              bg-white
            "
          >
            <div
              className="
                text-center
              "
            >
              <Loader2
                size={26}
                className="
                  mx-auto
                  animate-spin
                  text-[#0B5D1E]
                "
              />

              <p
                className="
                  mt-3
                  text-sm
                  text-slate-500
                "
              >
                Loading Current Contracts...
              </p>
            </div>
          </div>
        )}


        {/* ==================================================
            EMPTY
        ================================================== */}

        {!isContractsLoading
          && !contractsError
          && contracts.length === 0 && (
          <div
            className="
              rounded-2xl
              border
              border-dashed
              border-slate-200
              bg-white
              px-6
              py-16
              text-center
            "
          >
            <p
              className="
                text-sm
                font-semibold
                text-slate-600
              "
            >
              No Current Contracts found.
            </p>

            <p
              className="
                mx-auto
                mt-2
                max-w-xl
                text-xs
                leading-5
                text-slate-400
              "
            >
              Approved Farmer applications and accepted Miller bidding offers will appear here as shared Current Contracts.
            </p>
          </div>
        )}


        {/* ==================================================
            CONTRACT CARDS
        ================================================== */}

        {!isContractsLoading
          && contracts.length > 0 && (
          <div
            className="
              grid
              grid-cols-1
              gap-4
              md:grid-cols-2
              xl:grid-cols-3
            "
          >
            {contracts.map(
              (
                contract
              ) => (
                <ContractCard
                  key={
                    contract.contract_id
                  }
                  contract={
                    contract
                  }
                  onView={
                    handleViewContract
                  }
                />
              )
            )}
          </div>
        )}
      </div>


      {/* ====================================================
          DETAILS MODAL
      ==================================================== */}

      <MillerCurrentContractDetailsModal
        open={
          detailModalOpen
        }

        contract={
          selectedContract
        }

        isLoading={
          isContractLoading
        }

        contractError={
          contractError
        }

        isActionLoading={
          isActionLoading
        }

        actionError={
          actionError
        }

        onClose={
          handleCloseModal
        }

        onSign={
          handleSign
        }

        onComplete={
          handleComplete
        }

        onRequestVoid={
          handleRequestVoid
        }

        onMessageFarmer={
          handleMessageFarmer
        }

        onClearActionError={
          clearActionError
        }
      />
    </>
  );
}