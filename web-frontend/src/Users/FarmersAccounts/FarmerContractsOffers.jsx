import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  FileText,
  Hourglass,
  PlusCircle,
  Search,
} from "lucide-react";

import useFarmerContracts from "../../Components/hooks/Farmer/useFarmerContracts";
import useFarmerInventory from "../../Components/hooks/Farmer/useFarmerInventory";
import Dropdown from "../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";

import FarmerContractOpenBiddingModal from "../../Components/Modals/FarmerContractOpenBiddingModal";
import FarmerContractOfferDetailsModal from "../../Components/Modals/FarmerContractOfferDetailsModal";
import FarmerContractAcceptOfferModal from "../../Components/Modals/FarmerContractAcceptOfferModal";
import Toast from "../../Components/Modals/Toast";
import useToast from "../../Components/hooks/useToast";


// ============================================================
// CONSTANTS
// ============================================================

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

const BIDDING_STATUS_LABELS = {
  open: "Open",
  awarded: "Awarded",
  closed: "Closed",
  cancelled: "Cancelled",
  expired: "Expired",
};


const OFFER_STATUS_LABELS = {
  submitted: "Submitted",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
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
    return "0 kg";
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


const getBiddingBadgeStyle = (
  status
) => {
  switch (status) {
    case "open":
      return "border-green-200 bg-green-50 text-green-700";

    case "awarded":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "closed":
      return "border-slate-200 bg-slate-100 text-slate-600";

    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";

    case "expired":
      return "border-orange-200 bg-orange-50 text-orange-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};


const getOfferBadgeStyle = (
  status
) => {
  switch (status) {
    case "submitted":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "accepted":
      return "border-green-200 bg-green-50 text-green-700";

    case "declined":
      return "border-red-200 bg-red-50 text-red-700";

    case "withdrawn":
      return "border-slate-200 bg-slate-100 text-slate-600";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};


// ============================================================
// NORMALIZE BIDDING DETAILS
// Supports both:
//
// {
//   bidding: {...},
//   offers: [...]
// }
//
// and:
//
// {
//   ...bidding fields,
//   offers: [...]
// }
// ============================================================

const normalizeBiddingDetails = (
  data
) => {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return null;
  }


  if (data.bidding) {
    return {
      bidding:
        data.bidding,

      offers:
        Array.isArray(
          data.offers
        )
          ? data.offers
          : Array.isArray(
              data.bidding?.offers
            )
            ? data.bidding.offers
            : [],
    };
  }


  const {
    offers = [],
    ...bidding
  } = data;


  return {
    bidding,

    offers:
      Array.isArray(offers)
        ? offers
        : [],
  };
};


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerContractsOffers() {
  const {
    biddings,
    selectedOffer,

    isLoading,
    isSaving,
    error,

    loadBiddings,
    createBidding,
    loadBiddingDetails,
    loadOfferDetails,
    acceptOffer,
    declineOffer,
  } = useFarmerContracts();

  const { toasts, showToast, removeToast } = useToast();


  const {
    products,
    farmOptions,

    isLoadingProducts,
    isLoadingFarmOptions,

    error: inventoryError,

    loadProducts,
    loadFarmOptions,
  } = useFarmerInventory();


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
  // DETAIL VIEW
  // ==========================================================

  const [
    biddingDetails,
    setBiddingDetails,
  ] = useState(null);


  // ==========================================================
  // RECEIVED OFFER FILTERS
  // ==========================================================

  const [
    offerSearch,
    setOfferSearch,
  ] = useState("");

  const [
    offerStatusFilter,
    setOfferStatusFilter,
  ] = useState("");

  const [
    offerSort,
    setOfferSort,
  ] = useState(
    "highest_price"
  );


  // ==========================================================
  // MODAL STATES
  // ==========================================================

  const [
    isCreateOpen,
    setIsCreateOpen,
  ] = useState(false);

  const [
    isOfferOpen,
    setIsOfferOpen,
  ] = useState(false);

  const [
    isAcceptOpen,
    setIsAcceptOpen,
  ] = useState(false);


  // ==========================================================
  // LOAD FARMER BIDDINGS
  // ==========================================================

  useEffect(
    () => {
      const timeout =
        setTimeout(
          () => {
            loadBiddings({
              search,

              status:
                statusFilter,

              year:
                yearFilter,

              month:
                monthFilter,

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
      statusFilter,
      yearFilter,
      monthFilter,
      sortBy,
      loadBiddings,
    ]
  );


  // ==========================================================
  // OPEN CREATE BIDDING
  // ==========================================================

  const handleOpenCreateBidding =
    async () => {
      setIsCreateOpen(
        true
      );


      try {
        await Promise.all([
          loadProducts({
            status: "active",
            search: "",
            sortBy: "newest",
          }),

          loadFarmOptions(),
        ]);
      } catch {
        // Inventory hook already handles the error.
      }
    };


  // ==========================================================
  // CREATE BIDDING
  // ==========================================================

  const handleCreateBidding =
    async (
      payload
    ) => {
      try {
        await createBidding(
          payload
        );

        setIsCreateOpen(
          false
        );

        showToast({
          type: "success",
          title: "Bidding Created",
          message: "Open bidding listing created successfully.",
          duration: 4000,
        });
      } catch {
        // Contracts hook handles the error.
      }
    };


  // ==========================================================
  // VIEW BIDDING
  // ==========================================================

  const handleViewBidding =
    async (
      biddingId
    ) => {
      try {
        const response =
          await loadBiddingDetails(
            biddingId
          );


        setBiddingDetails(
          normalizeBiddingDetails(
            response
          )
        );


        setOfferSearch("");
        setOfferStatusFilter("");
        setOfferSort(
          "highest_price"
        );
      } catch {
        // Contracts hook handles the error.
      }
    };


  // ==========================================================
  // REFRESH CURRENT BIDDING DETAILS
  // ==========================================================

  const refreshCurrentBidding =
    async () => {
      const biddingId =
        biddingDetails?.bidding
          ?.bidding_id;


      if (!biddingId) {
        return;
      }


      const response =
        await loadBiddingDetails(
          biddingId
        );


      setBiddingDetails(
        normalizeBiddingDetails(
          response
        )
      );
    };


  // ==========================================================
  // VIEW OFFER
  // ==========================================================

  const handleViewOffer =
    async (
      offerId
    ) => {
      try {
        await loadOfferDetails(
          offerId
        );

        setIsOfferOpen(
          true
        );
      } catch {
        // Contracts hook handles the error.
      }
    };




  // ==========================================================
  // DECLINE OFFER
  // ==========================================================

  const handleDeclineOffer =
    async () => {
      if (
        !selectedOffer
          ?.offer_id
      ) {
        return;
      }


      try {
        await declineOffer(
          selectedOffer
            .offer_id
        );


        setIsOfferOpen(
          false
        );


        await refreshCurrentBidding();

        showToast({
          type: "success",
          title: "Offer Declined",
          message: "Buyer offer has been declined.",
          duration: 4000,
        });
      } catch {
        // Contracts hook handles the error.
      }
    };


  // ==========================================================
  // OPEN ACCEPT MODAL
  // ==========================================================

  const handleOpenAcceptOffer =
    () => {
      if (!selectedOffer) {
        return;
      }

      setIsOfferOpen(
        false
      );

      setIsAcceptOpen(
        true
      );
    };


  // ==========================================================
  // BACK FROM ACCEPT MODAL
  // ==========================================================

  const handleCloseAcceptOffer =
    () => {
      if (isSaving) {
        return;
      }


      setIsAcceptOpen(
        false
      );

      setIsOfferOpen(
        true
      );
    };


  // ==========================================================
  // ACCEPT OFFER
  // ==========================================================

  const handleAcceptOffer =
    async ({
      farmerSignaturePath,
    }) => {
      if (
        !selectedOffer
          ?.offer_id
      ) {
        return;
      }


      try {
        await acceptOffer(
          selectedOffer
            .offer_id,

          farmerSignaturePath
        );


        setIsAcceptOpen(
          false
        );

        setIsOfferOpen(
          false
        );


        // Awarded bidding no longer needs
        // to stay on the offer comparison view.
        setBiddingDetails(
          null
        );

        showToast({
          type: "success",
          title: "Offer Accepted",
          message: "Buyer offer accepted and contract created successfully.",
          duration: 4000,
        });
      } catch {
        // Contracts hook handles the error.
      }
    };


  // ==========================================================
  // FILTER RECEIVED OFFERS
  // ==========================================================

  const visibleOffers =
    useMemo(
      () => {
        const source =
          Array.isArray(
            biddingDetails?.offers
          )
            ? [
                ...biddingDetails.offers,
              ]
            : [];


        const keyword =
          offerSearch
            .trim()
            .toLowerCase();


        const filtered =
          source.filter(
            (
              offer
            ) => {
              if (
                offerStatusFilter &&
                offer.offer_status !==
                  offerStatusFilter
              ) {
                return false;
              }


              if (keyword) {
                const searchable =
                  [
                    offer.offer_code,
                    offer.miller_name,
                    offer.business_name,
                    offer.organization_name,
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


        filtered.sort(
          (
            first,
            second
          ) => {
            if (
              offerSort ===
              "highest_price"
            ) {
              return (
                Number(
                  second.offered_buying_price_per_kg ||
                    0
                ) -
                Number(
                  first.offered_buying_price_per_kg ||
                    0
                )
              );
            }


            if (
              offerSort ===
              "lowest_price"
            ) {
              return (
                Number(
                  first.offered_buying_price_per_kg ||
                    0
                ) -
                Number(
                  second.offered_buying_price_per_kg ||
                    0
                )
              );
            }


            const firstDate =
              new Date(
                first.created_at ||
                  first.offer_date ||
                  0
              ).getTime();


            const secondDate =
              new Date(
                second.created_at ||
                  second.offer_date ||
                  0
              ).getTime();


            if (
              offerSort ===
              "oldest"
            ) {
              return (
                firstDate -
                secondDate
              );
            }


            return (
              secondDate -
              firstDate
            );
          }
        );


        return filtered;
      },
      [
        biddingDetails,
        offerSearch,
        offerStatusFilter,
        offerSort,
      ]
    );


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
  // BIDDING DETAILS VIEW
  // ==========================================================

  if (
    biddingDetails?.bidding
  ) {
    const bidding =
      biddingDetails.bidding;


    return (
      <>
        <div
          className="
            flex
            flex-col
            gap-6
          "
        >

          {/* ================================================
              ERROR
          ================================================ */}

          {error &&
            !isOfferOpen &&
            !isAcceptOpen && (
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


          {/* ================================================
              BACK
          ================================================ */}

          <div>
            <button
              type="button"
              onClick={() =>
                setBiddingDetails(
                  null
                )
              }
              className="
                inline-flex
                items-center
                gap-2
                text-sm
                font-semibold
                text-green-700
                transition
                hover:text-green-800
              "
            >
              <ArrowLeft
                size={17}
              />

              Back to Offers
            </button>
          </div>


          {/* ================================================
              BIDDING SUMMARY
          ================================================ */}

          <section
            className="
              rounded-xl
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
                gap-5
                lg:flex-row
                lg:items-start
                lg:justify-between
              "
            >

              {/* PRODUCT */}

              <div
                className="
                  flex
                  min-w-0
                  items-start
                  gap-4
                "
              >

                {bidding.product_image ? (
                  <img
                    src={
                      bidding.product_image
                    }
                    alt={
                      bidding.rice_variety ||
                      "Bidding product"
                    }
                    className="
                      h-24
                      w-24
                      shrink-0
                      rounded-xl
                      border
                      border-slate-200
                      object-cover
                    "
                  />
                ) : (
                  <div
                    className="
                      flex
                      h-24
                      w-24
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-100
                      px-2
                      text-center
                      text-xs
                      text-slate-400
                    "
                  >
                    No Photo
                  </div>
                )}


                <div
                  className="
                    min-w-0
                  "
                >
                  <div
                    className="
                      mb-2
                      flex
                      flex-wrap
                      items-center
                      gap-2
                    "
                  >
                    <span
                      className="
                        rounded-md
                        bg-green-100
                        px-2.5
                        py-1
                        text-xs
                        font-bold
                        text-green-700
                      "
                    >
                      {bidding.bidding_code}
                    </span>


                    <span
                      className={`
                        rounded-full
                        border
                        px-2.5
                        py-1
                        text-xs
                        font-bold
                        ${getBiddingBadgeStyle(
                          bidding.bidding_status
                        )}
                      `}
                    >
                      {BIDDING_STATUS_LABELS[
                        bidding.bidding_status
                      ] ||
                        bidding.bidding_status}
                    </span>
                  </div>


                  <h3
                    className="
                      text-xl
                      font-bold
                      text-slate-900
                    "
                  >
                    {bidding.rice_variety ||
                      "Rice Product"}
                  </h3>


                  <p
                    className="
                      mt-1
                      text-sm
                      text-slate-500
                    "
                  >
                    {bidding.product_grade ||
                      "No product grade"}
                  </p>
                </div>
              </div>


              {/* SUMMARY NUMBERS */}

              <div
                className="
                  grid
                  grid-cols-2
                  gap-x-6
                  gap-y-4
                  sm:grid-cols-4
                "
              >
                <div>
                  <p
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Quantity Open
                  </p>

                  <p
                    className="
                      mt-1
                      font-bold
                      text-slate-900
                    "
                  >
                    {formatQuantity(
                      bidding.quantity_open_for_bidding_kg
                    )}
                  </p>
                </div>


                <div>
                  <p
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Minimum Price
                  </p>

                  <p
                    className="
                      mt-1
                      font-bold
                      text-slate-900
                    "
                  >
                    {bidding.minimum_acceptable_price_per_kg
                      ? `${formatPeso(
                          bidding.minimum_acceptable_price_per_kg
                        )}/kg`
                      : "Not Set"}
                  </p>
                </div>


                <div>
                  <p
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Deadline
                  </p>

                  <p
                    className="
                      mt-1
                      font-bold
                      text-slate-900
                    "
                  >
                    {formatDate(
                      bidding.bidding_deadline
                    )}
                  </p>
                </div>


                <div>
                  <p
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Offers Received
                  </p>

                  <p
                    className="
                      mt-1
                      font-bold
                      text-slate-900
                    "
                  >
                    {bidding.offers_received ??
                      biddingDetails.offers.length}
                  </p>
                </div>
              </div>

            </div>
          </section>


          {/* ================================================
              OFFER FILTERS
          ================================================ */}

          <div
            className="
              flex
              flex-col
              gap-3
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            <div
              className="
                relative
                w-full
                lg:max-w-sm
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
                  offerSearch
                }
                onChange={(
                  event
                ) =>
                  setOfferSearch(
                    event.target.value
                  )
                }
                placeholder="Search Miller / Buyer"
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
                  outline-none
                  focus:border-green-600
                  focus:ring-1
                  focus:ring-green-600
                "
              />
            </div>


            <div className="flex flex-wrap gap-3">
              <div className="w-40">
                <Dropdown
                  options={[
                    { label: "All Offer Status", value: "" },
                    { label: "Submitted", value: "submitted" },
                    { label: "Accepted", value: "accepted" },
                    { label: "Declined", value: "declined" },
                    { label: "Withdrawn", value: "withdrawn" },
                  ]}
                  value={offerStatusFilter}
                  onChange={setOfferStatusFilter}
                  placeholder="Offer Status"
                />
              </div>

              <div className="w-40">
                <SortByDropdown
                  options={[
                    { label: "Highest Price", value: "highest_price" },
                    { label: "Lowest Price", value: "lowest_price" },
                    { label: "Newest", value: "newest" },
                    { label: "Oldest", value: "oldest" },
                  ]}
                  value={offerSort}
                  onChange={setOfferSort}
                />
              </div>
            </div>
          </div>


          {/* ================================================
              EMPTY RECEIVED OFFERS
          ================================================ */}

          {visibleOffers.length ===
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
                  font-bold
                  text-slate-700
                "
              >
                No Offers Available
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                Miller offers for this bidding will appear here.
              </p>
            </div>
          )}


          {/* ================================================
              OFFER CARDS
          ================================================ */}

          {visibleOffers.length >
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
              {visibleOffers.map(
                (
                  offer
                ) => {
                  const millerName =
                    offer.business_name ||
                    offer.organization_name ||
                    offer.miller_name ||
                    "Miller / Buyer";


                  return (
                    <article
                      key={
                        offer.offer_id
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
                      <div
                        className="
                          flex
                          flex-1
                          flex-col
                          gap-4
                          p-4
                        "
                      >

                        {/* HEADER */}

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
                            <h4
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
                            </h4>

                            <p
                              className="
                                mt-1
                                text-xs
                                text-slate-500
                              "
                            >
                              {offer.offer_code}
                            </p>
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
                              ${getOfferBadgeStyle(
                                offer.offer_status
                              )}
                            `}
                          >
                            {OFFER_STATUS_LABELS[
                              offer.offer_status
                            ] ||
                              offer.offer_status}
                          </span>
                        </div>


                        {/* PRICE + QUANTITY */}

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
                                offer.offered_buying_price_per_kg
                              )}
                              /kg
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
                              Offered Quantity
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
                                offer.offered_quantity_kg
                              )}
                            </p>
                          </div>
                        </div>


                        {/* VALUE */}

                        <div>
                          <p
                            className="
                              text-[10px]
                              font-medium
                              text-slate-400
                            "
                          >
                            Estimated Offer Value
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
                              offer.estimated_offer_value
                            )}
                          </p>
                        </div>


                        {/* FULFILLMENT */}

                        <div
                          className="
                            mt-auto
                            border-t
                            border-slate-100
                            pt-3
                          "
                        >
                          <p
                            className="
                              text-[10px]
                              font-medium
                              text-slate-400
                            "
                          >
                            Proposed Fulfillment
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
                              offer.proposed_fulfillment_date
                            )}
                          </p>
                        </div>
                      </div>


                      {/* ACTION */}

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
                            handleViewOffer(
                              offer.offer_id
                            )
                          }
                          className="
                            w-full
                            rounded-lg
                            border
                            border-green-600
                            bg-white
                            py-2
                            text-sm
                            font-semibold
                            text-green-700
                            transition
                            hover:bg-green-50
                          "
                        >
                          View Offer
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}

        </div>


        {/* ================================================
            SEPARATE OFFER DETAILS MODAL
        ================================================ */}

        <FarmerContractOfferDetailsModal
          open={
            isOfferOpen
          }
          offer={
            selectedOffer
          }
          isLoading={
            isLoading
          }
          isSaving={
            isSaving
          }
          error={
            isOfferOpen
              ? error
              : ""
          }
          onClose={() =>
            setIsOfferOpen(
              false
            )
          }
          onDecline={
            handleDeclineOffer
          }
          onAccept={
            handleOpenAcceptOffer
          }
        />


        {/* ================================================
            SEPARATE ACCEPT / E-SIGNATURE MODAL
        ================================================ */}

        <FarmerContractAcceptOfferModal
          open={
            isAcceptOpen
          }
          offer={
            selectedOffer
          }
          isSaving={
            isSaving
          }
          error={
            isAcceptOpen
              ? error
              : ""
          }
          onClose={
            handleCloseAcceptOffer
          }
          onConfirm={
            handleAcceptOffer
          }
        />

      </>
    );
  }


  // ==========================================================
  // MAIN OFFERS / BIDDINGS LIST
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
          !isCreateOpen && (
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
            TOP BAR
        ================================================== */}

        <div
          className="
            flex
            flex-col
            gap-4
            lg:flex-row
            lg:items-start
            lg:justify-between
          "
        >

          <div
            className="
              flex
              flex-1
              flex-col
              gap-3
              xl:flex-row
              xl:items-center
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
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search open biddings"
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
                  outline-none
                  focus:border-green-600
                  focus:ring-1
                  focus:ring-green-600
                "
              />
            </div>


            {/* FILTERS */}

            <div className="flex flex-wrap gap-3">
              {/* STATUS */}
              <div className="w-36">
                <Dropdown
                  options={[
                    { label: "Bidding Status", value: "" },
                    { label: "Open", value: "open" },
                    { label: "Awarded", value: "awarded" },
                    { label: "Closed", value: "closed" },
                    { label: "Cancelled", value: "cancelled" },
                    { label: "Expired", value: "expired" },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="Bidding Status"
                />
              </div>

              {/* YEAR */}
              <div className="w-28">
                <Dropdown
                  options={[
                    { label: "All Years", value: "" },
                    ...yearOptions.map((year) => ({
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


          {/* CREATE */}

          <button
            type="button"
            onClick={
              handleOpenCreateBidding
            }
            className="
              inline-flex
              w-full
              shrink-0
              items-center
              justify-center
              gap-2
              rounded-lg
              bg-green-700
              px-5
              py-2.5
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-green-800
              lg:w-auto
            "
          >
            <PlusCircle
              size={16}
            />

            Create Open Bidding
          </button>

        </div>


        {/* ==================================================
            LOADING
        ================================================== */}

        {isLoading &&
          biddings.length ===
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
              Loading biddings...
            </div>
          )}


        {/* ==================================================
            EMPTY
        ================================================== */}

        {!isLoading &&
          biddings.length ===
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
                No Biddings Available
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
                Create an open bidding from one of your available Farm Inventory products to receive offers from Millers.
              </p>
            </div>
          )}


        {/* ==================================================
            BIDDING CARDS
        ================================================== */}

        {biddings.length >
          0 && (
          <div
            className="
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-4
            "
          >
            {biddings.map(
              (
                bidding
              ) => (
                <article
                  key={
                    bidding.bidding_id
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

                  {/* MAIN CONTENT */}

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
                        items-center
                        justify-between
                        gap-2
                      "
                    >
                      <span
                        className="
                          rounded-md
                          bg-green-100
                          px-2.5
                          py-1
                          text-[10px]
                          font-bold
                          text-green-700
                        "
                      >
                        {bidding.bidding_code}
                      </span>


                      <span
                        className={`
                          rounded-full
                          border
                          px-2.5
                          py-1
                          text-[10px]
                          font-bold
                          ${getBiddingBadgeStyle(
                            bidding.bidding_status
                          )}
                        `}
                      >
                        {BIDDING_STATUS_LABELS[
                          bidding.bidding_status
                        ] ||
                          bidding.bidding_status}
                      </span>
                    </div>


                    {/* VARIETY + QUANTITY */}

                    <div>
                      <p
                        className="
                          mb-1
                          truncate
                          text-sm
                          font-semibold
                          text-slate-900
                        "
                      >
                        {bidding.rice_variety ||
                          "—"}
                      </p>

                      <p
                        className="
                          text-2xl
                          font-black
                          text-slate-900
                        "
                      >
                        {formatQuantity(
                          bidding.quantity_open_for_bidding_kg
                        )}
                      </p>
                    </div>


                    {/* DATES */}

                    <div
                      className="
                        mt-auto
                        flex
                        items-end
                        justify-between
                        gap-4
                        border-t
                        border-slate-100
                        pt-3
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
                          Start Date
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-xs
                            font-semibold
                            text-slate-900
                          "
                        >
                          {formatDate(
                            bidding.created_at
                          )}
                        </p>
                      </div>


                      <div
                        className="
                          text-right
                        "
                      >
                        <p
                          className="
                            flex
                            items-center
                            justify-end
                            gap-1
                            text-[10px]
                            font-bold
                            text-red-500
                          "
                        >
                          <Hourglass
                            size={10}
                          />

                          Deadline
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-xs
                            font-semibold
                            text-slate-900
                          "
                        >
                          {formatDate(
                            bidding.bidding_deadline
                          )}
                        </p>
                      </div>
                    </div>

                  </div>


                  {/* FOOTER */}

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                      border-t
                      border-slate-200
                      bg-slate-50/70
                      p-3
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-1.5
                      "
                    >
                      <FileText
                        size={14}
                        className={
                          Number(
                            bidding.offers_received
                          ) > 0
                            ? "text-green-700"
                            : "text-slate-400"
                        }
                      />

                      <span
                        className="
                          text-xs
                          font-bold
                          text-slate-700
                        "
                      >
                        {bidding.offers_received ||
                          0}{" "}
                        {Number(
                          bidding.offers_received
                        ) === 1
                          ? "Offer"
                          : "Offers"}
                      </span>
                    </div>


                    <button
                      type="button"
                      onClick={() =>
                        handleViewBidding(
                          bidding.bidding_id
                        )
                      }
                      className="
                        rounded-md
                        border
                        border-slate-300
                        bg-white
                        px-3
                        py-1.5
                        text-xs
                        font-semibold
                        text-slate-700
                        transition
                        hover:bg-slate-100
                      "
                    >
                      View Offers
                    </button>
                  </div>

                </article>
              )
            )}
          </div>
        )}

      </div>


      {/* ====================================================
          SEPARATE CREATE OPEN BIDDING MODAL
      ==================================================== */}

      <FarmerContractOpenBiddingModal
        open={
          isCreateOpen
        }
        products={
          products
        }
        farmOptions={
          farmOptions
        }
        isLoadingProducts={
          isLoadingProducts
        }
        isLoadingFarmOptions={
          isLoadingFarmOptions
        }
        isSaving={
          isSaving
        }
        error={
          isCreateOpen
            ? (
                error ||
                inventoryError
              )
            : ""
        }
        onClose={() =>
          setIsCreateOpen(
            false
          )
        }
        onSubmit={
          handleCreateBidding
        }
      />

      <Toast toasts={toasts} removeToast={removeToast} />

    </>
  );
}