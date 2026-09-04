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
import useFarmerInventory from "../../Components/hooks/Farmer/useFarmerInventory";

import FarmerContractOpportunityDetailsModal from "../../Components/Modals/FarmerContractOpportunityDetailsModal";
import FarmerContractApplicationModal from "../../Components/Modals/FarmerContractApplicationModal";


// ============================================================
// CONSTANTS
// ============================================================

const PRODUCT_TYPE_LABELS = {
  unmilled_palay: "Unmilled Palay",
  milled_rice: "Milled Rice",
};


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


const buildOpportunityLocation = (
  opportunity
) => {
  const parts = [
    opportunity.fulfillment_barangay,
    opportunity.fulfillment_municipality,
    opportunity.fulfillment_province,
  ]
    .map(
      (value) =>
        String(
          value || ""
        ).trim()
    )
    .filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }


  const businessParts = [
    opportunity.business_barangay,
    opportunity.business_municipality,
    opportunity.business_province,
  ]
    .map(
      (value) =>
        String(
          value || ""
        ).trim()
    )
    .filter(Boolean);


  return (
    businessParts.join(", ") ||
    "—"
  );
};


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerContractsOpportunities({
  onMessage,
}) {
  const {
    opportunities,
    selectedOpportunity,

    isLoading,
    isSaving,
    error,

    loadOpportunities,
    loadOpportunityDetails,
    submitApplication,
  } = useFarmerContracts();


  const {
    products,
    isLoadingProducts,

    error: inventoryError,

    loadProducts,
  } = useFarmerInventory();


  // ==========================================================
  // FILTERS
  // ==========================================================

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    productTypeFilter,
    setProductTypeFilter,
  ] = useState("");

  const [
    riceVarietyFilter,
    setRiceVarietyFilter,
  ] = useState("");

  const [
    locationFilter,
    setLocationFilter,
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
    isApplicationOpen,
    setIsApplicationOpen,
  ] = useState(false);


  // ==========================================================
  // LOAD OPPORTUNITIES
  // ==========================================================

  useEffect(
    () => {
      const timeout =
        setTimeout(
          () => {
            loadOpportunities({
              search,

              productType:
                productTypeFilter,

              riceVariety:
                riceVarietyFilter,

              location:
                locationFilter,

              sortBy,
            }).catch(
              () => {}
            );
          },
          300
        );


      return () => {
        clearTimeout(
          timeout
        );
      };
    },
    [
      search,
      productTypeFilter,
      riceVarietyFilter,
      locationFilter,
      sortBy,
      loadOpportunities,
    ]
  );


  // ==========================================================
  // RICE VARIETY OPTIONS
  // ==========================================================

  const riceVarietyOptions =
    useMemo(
      () => {
        const varieties =
          opportunities
            .filter(
              (
                opportunity
              ) =>
                !productTypeFilter ||
                opportunity.product_type ===
                  productTypeFilter
            )
            .map(
              (
                opportunity
              ) =>
                opportunity.rice_variety
            )
            .filter(Boolean);


        return [
          ...new Set(
            varieties
          ),
        ].sort();
      },
      [
        opportunities,
        productTypeFilter,
      ]
    );


  // ==========================================================
  // PRODUCT TYPE CHANGE
  // ==========================================================

  const handleProductTypeChange = (
    value
  ) => {
    setProductTypeFilter(
      value
    );

    setRiceVarietyFilter(
      ""
    );
  };


  // ==========================================================
  // VIEW DETAILS
  // ==========================================================

  const handleViewDetails =
    async (
      postingId
    ) => {
      try {
        await loadOpportunityDetails(
          postingId
        );

        setIsDetailsOpen(
          true
        );
      } catch {
        // Hook handles error.
      }
    };


  // ==========================================================
  // LOAD FARMER PRODUCTS FOR APPLICATION
  // ==========================================================

  const loadApplicationProducts =
    async () => {
      await loadProducts({
        status: "active",
        search: "",
        sortBy: "newest",
      });
    };


  // ==========================================================
  // APPLY FROM DETAILS
  // ==========================================================

  const handleApply =
    async () => {
      if (
        !selectedOpportunity
          ?.posting_id
      ) {
        return;
      }


      try {
        await loadApplicationProducts();

        setIsDetailsOpen(
          false
        );

        setIsApplicationOpen(
          true
        );
      } catch {
        // Inventory hook handles error.
      }
    };


  // ==========================================================
  // APPLY DIRECTLY FROM CARD
  // ==========================================================

  const handleApplyFromCard =
    async (
      postingId
    ) => {
      try {
        await Promise.all([
          loadOpportunityDetails(
            postingId
          ),

          loadApplicationProducts(),
        ]);


        setIsApplicationOpen(
          true
        );
      } catch {
        // Hooks handle errors.
      }
    };


  // ==========================================================
  // SUBMIT APPLICATION
  // ==========================================================

  const handleSubmitApplication =
    async (
      payload
    ) => {
      if (
        !selectedOpportunity
          ?.posting_id
      ) {
        return;
      }


      try {
        await submitApplication(
          selectedOpportunity
            .posting_id,

          payload
        );


        setIsApplicationOpen(
          false
        );
      } catch {
        // Contracts hook handles error.
      }
    };


  // ==========================================================
  // MESSAGE MILLER
  // ==========================================================

  const handleMessage =
    () => {
      if (
        !selectedOpportunity ||
        !onMessage
      ) {
        return;
      }


      setIsDetailsOpen(
        false
      );


      onMessage({
        supplierProfileId:
          selectedOpportunity
            .supplier_profile_id,

        referenceType:
          "posting",

        referenceId:
          selectedOpportunity
            .posting_id,
      });
    };


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

        {(error ||
          inventoryError) &&
          !isDetailsOpen &&
          !isApplicationOpen && (
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
              {error ||
                inventoryError}
            </div>
          )}


        {/* ==================================================
            FILTERS
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
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search Miller, Product, or Variety"
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
                transition
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

            {/* PRODUCT TYPE */}

            <select
              value={
                productTypeFilter
              }
              onChange={(
                event
              ) =>
                handleProductTypeChange(
                  event.target.value
                )
              }
              className="
                min-w-[150px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                py-2.5
                text-sm
                text-slate-700
                outline-none
                focus:border-green-600
              "
            >
              <option value="">
                Product Type
              </option>

              <option value="unmilled_palay">
                Unmilled Palay
              </option>

              <option value="milled_rice">
                Milled Rice
              </option>
            </select>


            {/* RICE VARIETY */}

            <select
              value={
                riceVarietyFilter
              }
              onChange={(
                event
              ) =>
                setRiceVarietyFilter(
                  event.target.value
                )
              }
              className="
                min-w-[145px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                py-2.5
                text-sm
                text-slate-700
                outline-none
                focus:border-green-600
              "
            >
              <option value="">
                Rice Variety
              </option>

              {riceVarietyOptions.map(
                (
                  variety
                ) => (
                  <option
                    key={
                      variety
                    }
                    value={
                      variety
                    }
                  >
                    {variety}
                  </option>
                )
              )}
            </select>


            {/* LOCATION */}

            <input
              type="text"
              value={
                locationFilter
              }
              onChange={(
                event
              ) =>
                setLocationFilter(
                  event.target.value
                )
              }
              placeholder="Location"
              className="
                w-[155px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                py-2.5
                text-sm
                text-slate-700
                outline-none
                placeholder:text-slate-400
                focus:border-green-600
              "
            />


            {/* SORT */}

            <select
              value={sortBy}
              onChange={(
                event
              ) =>
                setSortBy(
                  event.target.value
                )
              }
              className="
                min-w-[145px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                py-2.5
                text-sm
                text-slate-700
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

              <option value="highest_price">
                Highest Price
              </option>

              <option value="lowest_price">
                Lowest Price
              </option>
            </select>

          </div>
        </div>


        {/* ==================================================
            IMPORTANT:
            NO OPEN BIDDING BUTTON HERE
        ================================================== */}


        {/* ==================================================
            LOADING
        ================================================== */}

        {isLoading &&
          opportunities.length ===
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
              Loading opportunities...
            </div>
          )}


        {/* ==================================================
            EMPTY
        ================================================== */}

        {!isLoading &&
          opportunities.length ===
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
                No Opportunities Available
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
                Active procurement opportunities posted by Millers will appear here.
              </p>
            </div>
          )}


        {/* ==================================================
            OPPORTUNITY CARDS
        ================================================== */}

        {opportunities.length >
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
            {opportunities.map(
              (
                opportunity
              ) => {
                const millerName =
                  opportunity.business_name ||
                  opportunity.organization_name ||
                  opportunity.miller_name ||
                  "Miller / Buyer";


                const alreadyApplied =
                  Boolean(
                    opportunity.has_active_application
                  );


                return (
                  <article
                    key={
                      opportunity.posting_id
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
                        PRODUCT IMAGE
                    ====================================== */}

                    <div
                      className="
                        relative
                        h-36
                        w-full
                        overflow-hidden
                        bg-slate-100
                      "
                    >
                      {opportunity.product_image ? (
                        <img
                          src={
                            opportunity.product_image
                          }
                          alt={
                            opportunity.rice_variety ||
                            "Rice opportunity"
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


                      <div
                        className="
                          absolute
                          left-3
                          top-3
                          rounded-md
                          bg-white/95
                          px-2.5
                          py-1
                          text-[10px]
                          font-bold
                          text-green-700
                          shadow-sm
                        "
                      >
                        {opportunity.posting_code}
                      </div>


                      {alreadyApplied && (
                        <div
                          className="
                            absolute
                            right-3
                            top-3
                            rounded-full
                            border
                            border-blue-200
                            bg-blue-50
                            px-2.5
                            py-1
                            text-[10px]
                            font-bold
                            text-blue-700
                          "
                        >
                          Applied
                        </div>
                      )}
                    </div>


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

                      {/* MILLER */}

                      <div>
                        <p
                          className="
                            truncate
                            text-sm
                            font-bold
                            text-slate-900
                          "
                          title={
                            millerName
                          }
                        >
                          {millerName}
                        </p>


                        <div
                          className="
                            mt-1
                            flex
                            items-center
                            gap-1.5
                            text-xs
                            text-slate-500
                          "
                        >
                          <MapPin
                            size={13}
                            className="shrink-0"
                          />

                          <span
                            className="
                              truncate
                            "
                          >
                            {buildOpportunityLocation(
                              opportunity
                            )}
                          </span>
                        </div>
                      </div>


                      {/* PRODUCT */}

                      <div>
                        <p
                          className="
                            text-xs
                            font-semibold
                            uppercase
                            tracking-wide
                            text-green-700
                          "
                        >
                          {PRODUCT_TYPE_LABELS[
                            opportunity.product_type
                          ] ||
                            opportunity.product_type ||
                            "Rice Product"}
                        </p>


                        <h4
                          className="
                            mt-1
                            text-lg
                            font-bold
                            text-slate-900
                          "
                        >
                          {opportunity.rice_variety ||
                            "—"}
                        </h4>


                        {opportunity.product_grade && (
                          <p
                            className="
                              mt-0.5
                              text-xs
                              text-slate-500
                            "
                          >
                            Grade:{" "}
                            <span
                              className="
                                font-semibold
                                text-slate-700
                              "
                            >
                              {opportunity.product_grade}
                            </span>
                          </p>
                        )}
                      </div>


                      {/* QUANTITY + PRICE */}

                      <div
                        className="
                          grid
                          grid-cols-2
                          gap-3
                          rounded-xl
                          border
                          border-green-100
                          bg-green-50/50
                          p-3
                        "
                      >
                        <div>
                          <p
                            className="
                              text-[10px]
                              font-medium
                              text-slate-500
                            "
                          >
                            Required Quantity
                          </p>

                          <p
                            className="
                              mt-1
                              text-sm
                              font-bold
                              text-slate-900
                            "
                          >
                            {formatQuantity(
                              opportunity.required_quantity_kg
                            )}
                          </p>
                        </div>


                        <div>
                          <p
                            className="
                              text-[10px]
                              font-medium
                              text-slate-500
                            "
                          >
                            Buying Price
                          </p>

                          <p
                            className="
                              mt-1
                              text-sm
                              font-bold
                              text-slate-900
                            "
                          >
                            {formatPeso(
                              opportunity.buying_price_per_kg
                            )}
                            /kg
                          </p>
                        </div>
                      </div>


                      {/* DATES */}

                      <div
                        className="
                          mt-auto
                          grid
                          grid-cols-2
                          gap-3
                          border-t
                          border-slate-100
                          pt-3
                        "
                      >
                        <div>
                          <p
                            className="
                              flex
                              items-center
                              gap-1
                              text-[10px]
                              font-medium
                              text-slate-400
                            "
                          >
                            <CalendarDays
                              size={11}
                            />

                            Application Deadline
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
                              opportunity.application_deadline
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
                              opportunity.required_fulfillment_date
                            )}
                          </p>
                        </div>
                      </div>

                    </div>


                    {/* ======================================
                        ACTIONS
                    ====================================== */}

                    <div
                      className="
                        flex
                        gap-2
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
                            opportunity.posting_id
                          )
                        }
                        className="
                          flex-1
                          rounded-lg
                          border
                          border-green-600
                          bg-white
                          px-3
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


                      {!alreadyApplied && (
                        <button
                          type="button"
                          onClick={() =>
                            handleApplyFromCard(
                              opportunity.posting_id
                            )
                          }
                          className="
                            flex-1
                            rounded-lg
                            bg-green-700
                            px-3
                            py-2
                            text-sm
                            font-semibold
                            text-white
                            transition
                            hover:bg-green-800
                          "
                        >
                          Apply
                        </button>
                      )}
                    </div>

                  </article>
                );
              }
            )}
          </div>
        )}

      </div>


      {/* ====================================================
          OPPORTUNITY DETAILS MODAL
      ==================================================== */}

      <FarmerContractOpportunityDetailsModal
        open={
          isDetailsOpen
        }
        opportunity={
          selectedOpportunity
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
        onApply={
          handleApply
        }
        onMessage={
          handleMessage
        }
      />


      {/* ====================================================
          APPLICATION MODAL
      ==================================================== */}

      <FarmerContractApplicationModal
        open={
          isApplicationOpen
        }
        opportunity={
          selectedOpportunity
        }
        products={
          products
        }
        isLoadingProducts={
          isLoadingProducts
        }
        isSaving={
          isSaving
        }
        error={
          isApplicationOpen
            ? (
                error ||
                inventoryError
              )
            : ""
        }
        onClose={() =>
          setIsApplicationOpen(
            false
          )
        }
        onSubmit={
          handleSubmitApplication
        }
      />

    </>
  );
}