import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
  Send,
} from "lucide-react";

import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import useMillerContracts from "../../../Components/hooks/Miller/useMillerContracts";
import MillerContractOfferApplicationModal from "../../../Components/Modals/Miller/MillerContractOfferApplicationModal";
import PostingsTab from "./PostingTab";
import CurrentContractsTab from "./CurrentContactsTab";
import MessagesTab from "./MessagesTab";


const TABS = [
  {
    id: "bidding",
    label: "Bidding Offers",
  },
  {
    id: "postings",
    label: "Postings",
  },
  {
    id: "contracts",
    label: "Current Contracts",
  },
  {
    id: "messages",
    label: "Messages",
  },
];


const PRODUCT_TYPES = [
  {
    value: "",
    label: "All Types",
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


const BIDDING_STATUSES = [
  {
    value: "",
    label: "All Statuses",
  },
  {
    value: "open",
    label: "Open",
  },
  {
    value: "awarded",
    label: "Awarded",
  },
  {
    value: "closed",
    label: "Closed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
  {
    value: "expired",
    label: "Expired",
  },
];


const SORT_OPTIONS = [
  {
    value: "deadline",
    label: "Deadline: Soonest",
  },
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
    label: "Quantity: High to Low",
  },
  {
    value: "quantity_low",
    label: "Quantity: Low to High",
  },
];


const STATUS_STYLES = {
  Open:
    "bg-emerald-100 text-emerald-700",

  "Ending Soon":
    "bg-amber-100 text-amber-700",

  Awarded:
    "bg-blue-100 text-blue-700",

  Closed:
    "bg-slate-100 text-slate-600",

  Cancelled:
    "bg-red-100 text-red-700",

  Expired:
    "bg-orange-100 text-orange-700",
};


const OFFER_STATUS_STYLES = {
  submitted:
    "border-amber-200 bg-amber-50 text-amber-700",

  accepted:
    "border-emerald-200 bg-emerald-50 text-emerald-700",

  declined:
    "border-red-200 bg-red-50 text-red-700",

  withdrawn:
    "border-slate-200 bg-slate-100 text-slate-600",
};


// ============================================================
// FORMATTERS
// ============================================================

function formatDate(
  value,
  includeTime = false
) {
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
    return String(
      value
    );
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "numeric",

      ...(includeTime
        ? {
            hour:
              "numeric",

            minute:
              "2-digit",
          }
        : {}),
    }
  ).format(
    date
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
  if (
    value === null
    || value === undefined
    || value === ""
  ) {
    return "—";
  }

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


function productTypeLabel(
  value
) {
  if (
    value ===
    "unmilled_palay"
  ) {
    return "Unmilled Palay";
  }

  if (
    value ===
    "milled_rice"
  ) {
    return "Milled Rice";
  }

  return (
    value
    || "—"
  );
}


function titleCase(
  value
) {
  return String(
    value
    || ""
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        char
      ) =>
        char.toUpperCase()
    );
}


function farmAddress(
  item
) {
  return [
    item?.farm_street_address,
    item?.farm_barangay,
    item?.farm_municipality,
    item?.farm_province,
    item?.farm_postal_code,
  ]
    .filter(
      Boolean
    )
    .join(
      ", "
    );
}


function biddingStatusLabel(
  item
) {
  const status =
    item?.bidding_status
    || "open";

  if (
    status === "open"
    && item?.bidding_deadline
  ) {
    const deadline =
      new Date(
        item.bidding_deadline
      ).getTime();

    const now =
      Date.now();

    const hoursLeft =
      (
        deadline
        - now
      )
      / 36e5;

    if (
      hoursLeft > 0
      && hoursLeft <= 24
    ) {
      return "Ending Soon";
    }
  }

  return titleCase(
    status
  );
}


function isBiddingOpen(
  item
) {
  if (
    item?.bidding_status !==
    "open"
  ) {
    return false;
  }

  if (
    !item?.bidding_deadline
  ) {
    return true;
  }

  const deadline =
    new Date(
      item.bidding_deadline
    ).getTime();

  return (
    Number.isFinite(
      deadline
    )
    && deadline >
      Date.now()
  );
}


// ============================================================
// FILTER SELECT
// ============================================================

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
          font-medium
          text-gray-700
          outline-none
          transition
          focus:border-[#0B5D1E]
          focus:ring-1
          focus:ring-[#0B5D1E]
          cursor-pointer
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
              {
                option.label
              }
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
// INFO ITEM
// ============================================================

function InfoItem({
  label,
  value,
}) {
  return (
    <div>
      <p
        className="
          text-xs
          font-medium
          text-slate-400
        "
      >
        {
          label
        }
      </p>

      <p
        className="
          mt-1
          text-sm
          font-semibold
          text-slate-800
        "
      >
        {
          value
          || "—"
        }
      </p>
    </div>
  );
}


// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({
  children,
}) {
  return (
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
          text-gray-500
        "
      >
        {
          children
        }
      </p>
    </div>
  );
}


// ============================================================
// BIDDING CARD
// ============================================================

function BiddingOfferCard({
  offer,
  onView,
}) {
  const statusLabel =
    biddingStatusLabel(
      offer
    );

  const urgent =
    statusLabel ===
    "Ending Soon";

  return (
    <article
      className="
        space-y-4
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        transition
        hover:border-slate-300
        hover:shadow-md
      "
    >
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
          <p
            className="
              text-[11px]
              font-semibold
              uppercase
              tracking-wide
              text-slate-400
            "
          >
            {
              offer.bidding_code
              || `BID-${offer.bidding_id}`
            }
          </p>

          <h3
            className="
              truncate
              text-lg
              font-bold
              text-gray-900
            "
          >
            {
              offer.farmer_name
              || "Farmer"
            }
          </h3>
        </div>

        <span
          className={`
            inline-block
            whitespace-nowrap
            rounded-full
            px-2.5
            py-0.5
            text-[11px]
            font-bold
            uppercase

            ${
              STATUS_STYLES[
                statusLabel
              ]
              || STATUS_STYLES.Closed
            }
          `}
        >
          {
            statusLabel
          }
        </span>
      </div>


      <p
        className="
          flex
          items-start
          gap-1
          text-xs
          text-gray-500
        "
      >
        <MapPin
          size={
            13
          }
          className="
            mt-0.5
            shrink-0
          "
        />

        <span>
          {
            offer.farm_name
            || "Registered Farm"
          }

          {
            farmAddress(
              offer
            )
              ? ` • ${farmAddress(
                  offer
                )}`
              : ""
          }
        </span>
      </p>


      <div
        className="
          flex
          items-center
          gap-3
        "
      >
        {
          offer.product_image
            ? (
              <img
                src={
                  offer.product_image
                }
                alt={
                  offer.rice_variety
                  || "Bidding product"
                }
                className="
                  h-12
                  w-12
                  shrink-0
                  rounded-xl
                  border
                  border-slate-200
                  object-cover
                "
              />
            )
            : (
              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-100
                  px-1
                  text-center
                  text-[9px]
                  text-slate-400
                "
              >
                No Photo
              </div>
            )
        }

        <div
          className="
            min-w-0
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
            {
              productTypeLabel(
                offer.product_type
              )
            }
          </p>

          <p
            className="
              truncate
              text-base
              font-bold
              text-gray-900
            "
          >
            {
              offer.rice_variety
              || "Rice Product"
            }

            {
              offer.product_grade
                ? `, ${offer.product_grade}`
                : ""
            }
          </p>
        </div>
      </div>


      <div
        className="
          grid
          grid-cols-2
          gap-3
          rounded-xl
          bg-slate-50
          p-3
        "
      >
        <div>
          <p
            className="
              text-xs
              text-gray-500
            "
          >
            Available Qty
          </p>

          <p
            className="
              text-sm
              font-bold
              text-gray-900
            "
          >
            {
              formatQuantity(
                offer.available_quantity_kg
              )
            }
          </p>
        </div>


        <div>
          <p
            className="
              text-xs
              text-gray-500
            "
          >
            Open for Bidding
          </p>

          <p
            className="
              text-sm
              font-bold
              text-gray-900
            "
          >
            {
              formatQuantity(
                offer.quantity_open_for_bidding_kg
              )
            }
          </p>
        </div>


        <div
          className="
            col-span-2
            border-t
            border-slate-200
            pt-2
          "
        >
          <p
            className="
              text-xs
              text-gray-500
            "
          >
            Minimum Acceptable Price
          </p>

          <p
            className="
              text-sm
              font-bold
              text-gray-900
            "
          >
            {
              formatPeso(
                offer.minimum_acceptable_price_per_kg
              )
            }

            {
              offer.minimum_acceptable_price_per_kg
                ? (
                  <span
                    className="
                      text-xs
                      font-medium
                      text-gray-500
                    "
                  >
                    /kg
                  </span>
                )
                : null
            }
          </p>
        </div>
      </div>


      <div
        className="
          space-y-1
          text-xs
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
          <span
            className="
              text-gray-500
            "
          >
            Availability:
          </span>

          <span
            className="
              text-right
              font-semibold
              text-gray-800
            "
          >
            {
              formatDate(
                offer.expected_availability_date
              )
            }
          </span>
        </div>


        <div
          className="
            flex
            items-center
            justify-between
            gap-3
          "
        >
          <span
            className={
              urgent
                ? "font-semibold text-red-600"
                : "text-gray-500"
            }
          >
            Deadline:
          </span>

          <span
            className={`
              text-right
              font-semibold

              ${
                urgent
                  ? "text-red-600"
                  : "text-gray-800"
              }
            `}
          >
            {
              formatDate(
                offer.bidding_deadline,
                true
              )
            }
          </span>
        </div>
      </div>


      {
        offer.own_offer_status
          ? (
            <div
              className="
                rounded-xl
                border
                border-slate-200
                px-3
                py-2
              "
            >
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
                    text-xs
                    font-medium
                    text-slate-500
                  "
                >
                  Your Offer
                </span>

                <span
                  className={`
                    rounded-full
                    border
                    px-2
                    py-0.5
                    text-[10px]
                    font-bold
                    uppercase

                    ${
                      OFFER_STATUS_STYLES[
                        offer.own_offer_status
                      ]
                      || OFFER_STATUS_STYLES.withdrawn
                    }
                  `}
                >
                  {
                    titleCase(
                      offer.own_offer_status
                    )
                  }
                </span>
              </div>
            </div>
          )
          : null
      }


      <button
        type="button"
        onClick={
          () =>
            onView(
              offer
            )
        }
        className="
          w-full
          rounded-xl
          border
          border-[#0B5D1E]
          py-2
          text-sm
          font-bold
          text-[#0B5D1E]
          transition
          hover:bg-emerald-50
          cursor-pointer
        "
      >
        View Details
      </button>
    </article>
  );
}


// ============================================================
// BIDDING DETAILS
// ============================================================

function BiddingDetailsView({
  data,

  messages,

  isLoadingMessages,
  isSaving,

  onBack,
  onSubmitOffer,
  onEditOffer,
  onWithdrawOffer,

  onOpenChat,
  onSendMessage,
}) {
  const bidding =
    data?.bidding;

  const competingOffers =
    Array.isArray(
      data?.competing_offers
    )
      ? data.competing_offers
      : [];

  const [
    withdrawConfirm,
    setWithdrawConfirm,
  ] = useState(
    false
  );

  const [
    chatOpen,
    setChatOpen,
  ] = useState(
    false
  );

  const [
    messageText,
    setMessageText,
  ] = useState(
    ""
  );


  if (!bidding) {
    return null;
  }


  const open =
    isBiddingOpen(
      bidding
    );


  const canEditOrWithdraw =
    open
    && bidding.own_offer_status ===
      "submitted";


  const canSubmit =
    open
    && !bidding.own_offer_id;


  const handleChatToggle =
    async () => {
      const next =
        !chatOpen;

      setChatOpen(
        next
      );

      if (next) {
        await onOpenChat();
      }
    };


  const handleSend =
    async (
      event
    ) => {
      event.preventDefault();

      const clean =
        messageText.trim();

      if (
        !clean
        || isSaving
      ) {
        return;
      }

      const result =
        await onSendMessage(
          clean
        );

      if (
        result
        && !result.blocked
      ) {
        setMessageText(
          ""
        );
      }
    };


  return (
    <div
      className="
        space-y-5
      "
    >
      <button
        type="button"
        onClick={
          onBack
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
          size={
            17
          }
        />

        Back to Bidding Offers
      </button>


      <section
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
            gap-5
            lg:flex-row
            lg:items-start
            lg:justify-between
          "
        >
          <div
            className="
              flex
              min-w-0
              items-start
              gap-4
            "
          >
            {
              bidding.product_image
                ? (
                  <img
                    src={
                      bidding.product_image
                    }
                    alt={
                      bidding.rice_variety
                      || "Bidding product"
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
                )
                : (
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
                )
            }


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
                <h3
                  className="
                    text-xl
                    font-bold
                    text-slate-900
                  "
                >
                  {
                    bidding.bidding_code
                    || `BID-${bidding.bidding_id}`
                  }
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
                        biddingStatusLabel(
                          bidding
                        )
                      ]
                      || STATUS_STYLES.Closed
                    }
                  `}
                >
                  {
                    biddingStatusLabel(
                      bidding
                    )
                  }
                </span>
              </div>


              <p
                className="
                  mt-1
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                {
                  bidding.rice_variety
                  || "Rice Product"
                }

                {
                  bidding.product_grade
                    ? ` • ${bidding.product_grade}`
                    : ""
                }
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                {
                  productTypeLabel(
                    bidding.product_type
                  )
                }
              </p>
            </div>
          </div>


          <div
            className="
              flex
              flex-wrap
              gap-2
            "
          >
            {
              canSubmit
                ? (
                  <button
                    type="button"
                    onClick={
                      onSubmitOffer
                    }
                    className="
                      rounded-xl
                      bg-[#0B5D1E]
                      px-4
                      py-2
                      text-sm
                      font-bold
                      text-white
                      transition
                      hover:bg-[#094d19]
                    "
                  >
                    Submit Offer
                  </button>
                )
                : null
            }


            {
              canEditOrWithdraw
                ? (
                  <>
                    <button
                      type="button"
                      onClick={
                        onEditOffer
                      }
                      className="
                        rounded-xl
                        border
                        border-[#0B5D1E]
                        px-4
                        py-2
                        text-sm
                        font-bold
                        text-[#0B5D1E]
                        transition
                        hover:bg-emerald-50
                      "
                    >
                      Edit Offer
                    </button>


                    <button
                      type="button"
                      onClick={
                        () =>
                          setWithdrawConfirm(
                            true
                          )
                      }
                      className="
                        rounded-xl
                        border
                        border-red-200
                        px-4
                        py-2
                        text-sm
                        font-bold
                        text-red-600
                        transition
                        hover:bg-red-50
                      "
                    >
                      Withdraw Offer
                    </button>
                  </>
                )
                : null
            }


            <button
              type="button"
              onClick={
                handleChatToggle
              }
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                px-4
                py-2
                text-sm
                font-bold
                text-slate-700
                transition
                hover:bg-slate-50
              "
            >
              <MessageCircle
                size={
                  16
                }
              />

              Message Farmer
            </button>
          </div>
        </div>


        {
          withdrawConfirm
            ? (
              <div
                className="
                  mt-5
                  flex
                  flex-col
                  gap-3
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  p-4
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div>
                  <p
                    className="
                      text-sm
                      font-bold
                      text-red-700
                    "
                  >
                    Withdraw your submitted offer?
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-xs
                      text-red-600
                    "
                  >
                    You can only withdraw while the Farmer bidding remains open.
                  </p>
                </div>


                <div
                  className="
                    flex
                    gap-2
                  "
                >
                  <button
                    type="button"
                    onClick={
                      () =>
                        setWithdrawConfirm(
                          false
                        )
                    }
                    disabled={
                      isSaving
                    }
                    className="
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-3
                      py-2
                      text-xs
                      font-bold
                      text-slate-600
                      disabled:opacity-50
                    "
                  >
                    Keep Offer
                  </button>


                  <button
                    type="button"
                    onClick={
                      async () => {
                        const ok =
                          await onWithdrawOffer();

                        if (ok) {
                          setWithdrawConfirm(
                            false
                          );
                        }
                      }
                    }
                    disabled={
                      isSaving
                    }
                    className="
                      rounded-xl
                      bg-red-600
                      px-3
                      py-2
                      text-xs
                      font-bold
                      text-white
                      disabled:opacity-50
                    "
                  >
                    {
                      isSaving
                        ? "Withdrawing..."
                        : "Confirm Withdraw"
                    }
                  </button>
                </div>
              </div>
            )
            : null
        }
      </section>


      <div
        className="
          grid
          gap-5
          xl:grid-cols-2
        "
      >
        <section
          className="
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
          "
        >
          <h4
            className="
              text-sm
              font-bold
              text-slate-900
            "
          >
            Bidding Information
          </h4>

          <div
            className="
              mt-4
              grid
              grid-cols-2
              gap-4
            "
          >
            <InfoItem
              label="Bidding Start Date"
              value={
                formatDate(
                  bidding.bidding_start_date,
                  true
                )
              }
            />

            <InfoItem
              label="Bidding Deadline"
              value={
                formatDate(
                  bidding.bidding_deadline,
                  true
                )
              }
            />

            <InfoItem
              label="Quantity Open"
              value={
                formatQuantity(
                  bidding.quantity_open_for_bidding_kg
                )
              }
            />

            <InfoItem
              label="Available Quantity"
              value={
                formatQuantity(
                  bidding.available_quantity_kg
                )
              }
            />

            <InfoItem
              label="Minimum Acceptable Price"
              value={
                `${
                  formatPeso(
                    bidding.minimum_acceptable_price_per_kg
                  )
                }${
                  bidding.minimum_acceptable_price_per_kg
                    ? "/kg"
                    : ""
                }`
              }
            />

            <InfoItem
              label="Expected Availability"
              value={
                formatDate(
                  bidding.expected_availability_date
                )
              }
            />

            <InfoItem
              label="Preferred Fulfillment Date"
              value={
                formatDate(
                  bidding.preferred_fulfillment_date
                )
              }
            />

            <InfoItem
              label="Fulfillment Method"
              value={
                titleCase(
                  bidding.fulfillment_method
                )
              }
            />
          </div>
        </section>


        <section
          className="
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
          "
        >
          <h4
            className="
              text-sm
              font-bold
              text-slate-900
            "
          >
            Farmer & Farm Information
          </h4>

          <div
            className="
              mt-4
              grid
              grid-cols-2
              gap-4
            "
          >
            <InfoItem
              label="Farmer Name"
              value={
                bidding.farmer_name
              }
            />

            <InfoItem
              label="Farm / Farm Lot"
              value={
                bidding.farm_name
                || "Registered Farm"
              }
            />

            <div
              className="
                col-span-2
              "
            >
              <InfoItem
                label="Farm Location"
                value={
                  farmAddress(
                    bidding
                  )
                }
              />
            </div>
          </div>
        </section>
      </div>


      <section
        className="
          rounded-2xl
          border
          border-slate-200
          bg-white
          p-5
          shadow-sm
        "
      >
        <h4
          className="
            text-sm
            font-bold
            text-slate-900
          "
        >
          Product & Bidding Terms
        </h4>

        <div
          className="
            mt-4
            grid
            gap-4
            md:grid-cols-2
            xl:grid-cols-4
          "
        >
          <InfoItem
            label="Product Code"
            value={
              bidding.product_code
            }
          />

          <InfoItem
            label="Product Type"
            value={
              productTypeLabel(
                bidding.product_type
              )
            }
          />

          <InfoItem
            label="Rice Variety"
            value={
              bidding.rice_variety
            }
          />

          <InfoItem
            label="Grade / Classification"
            value={
              bidding.product_grade
            }
          />
        </div>


        <div
          className="
            mt-5
            grid
            gap-4
            md:grid-cols-3
          "
        >
          <div
            className="
              rounded-xl
              bg-slate-50
              p-4
            "
          >
            <p
              className="
                text-xs
                font-medium
                text-slate-400
              "
            >
              Product Description
            </p>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-slate-700
              "
            >
              {
                bidding.product_description
                || "No product description provided."
              }
            </p>
          </div>


          <div
            className="
              rounded-xl
              bg-slate-50
              p-4
            "
          >
            <p
              className="
                text-xs
                font-medium
                text-slate-400
              "
            >
              Additional Terms
            </p>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-slate-700
              "
            >
              {
                bidding.additional_terms
                || "No additional terms provided."
              }
            </p>
          </div>


          <div
            className="
              rounded-xl
              bg-slate-50
              p-4
            "
          >
            <p
              className="
                text-xs
                font-medium
                text-slate-400
              "
            >
              Notes to Millers
            </p>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-slate-700
              "
            >
              {
                bidding.notes_to_millers
                || "No additional notes provided."
              }
            </p>
          </div>
        </div>
      </section>


      {
        bidding.own_offer_id
          ? (
            <section
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
                  flex-wrap
                  items-center
                  justify-between
                  gap-3
                "
              >
                <h4
                  className="
                    text-sm
                    font-bold
                    text-slate-900
                  "
                >
                  Your Submitted Offer
                </h4>

                <span
                  className={`
                    rounded-full
                    border
                    px-2.5
                    py-1
                    text-[11px]
                    font-bold
                    uppercase

                    ${
                      OFFER_STATUS_STYLES[
                        bidding.own_offer_status
                      ]
                      || OFFER_STATUS_STYLES.withdrawn
                    }
                  `}
                >
                  {
                    titleCase(
                      bidding.own_offer_status
                    )
                  }
                </span>
              </div>


              <div
                className="
                  mt-4
                  grid
                  gap-4
                  sm:grid-cols-2
                  lg:grid-cols-4
                "
              >
                <InfoItem
                  label="Offer ID"
                  value={
                    bidding.own_offer_code
                  }
                />

                <InfoItem
                  label="Offered Price"
                  value={
                    `${formatPeso(
                      bidding.offered_buying_price_per_kg
                    )}/kg`
                  }
                />

                <InfoItem
                  label="Offered Quantity"
                  value={
                    formatQuantity(
                      bidding.offered_quantity_kg
                    )
                  }
                />

                <InfoItem
                  label="Estimated Value"
                  value={
                    formatPeso(
                      bidding.estimated_offer_value
                    )
                  }
                />

                <InfoItem
                  label="Proposed Fulfillment"
                  value={
                    formatDate(
                      bidding.proposed_fulfillment_date
                    )
                  }
                />

                <InfoItem
                  label="Fulfillment Method"
                  value={
                    titleCase(
                      bidding.own_offer_fulfillment_method
                    )
                  }
                />

                <InfoItem
                  label="Offer Date"
                  value={
                    formatDate(
                      bidding.own_offer_date,
                      true
                    )
                  }
                />

                <InfoItem
                  label="Signed At"
                  value={
                    formatDate(
                      bidding.miller_signed_at,
                      true
                    )
                  }
                />
              </div>
            </section>
          )
          : null
      }


      <section
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
            items-center
            justify-between
            gap-3
          "
        >
          <div>
            <h4
              className="
                text-sm
                font-bold
                text-slate-900
              "
            >
              Competing Offers
            </h4>

            <p
              className="
                mt-0.5
                text-xs
                text-slate-500
              "
            >
              Only business name, location, and offered price are shown.
            </p>
          </div>

          <span
            className="
              rounded-full
              bg-slate-100
              px-2.5
              py-1
              text-xs
              font-bold
              text-slate-600
            "
          >
            {
              competingOffers.length
            }
          </span>
        </div>


        {
          competingOffers.length
            ? (
              <div
                className="
                  mt-4
                  grid
                  gap-3
                  md:grid-cols-2
                  xl:grid-cols-3
                "
              >
                {
                  competingOffers.map(
                    (
                      offer
                    ) => (
                      <div
                        key={
                          offer.offer_id
                        }
                        className={`
                          rounded-xl
                          border
                          p-4

                          ${
                            offer.is_own_offer
                              ? "border-emerald-200 bg-emerald-50/50"
                              : "border-slate-200 bg-slate-50"
                          }
                        `}
                      >
                        <p
                          className="
                            text-sm
                            font-bold
                            text-slate-900
                          "
                        >
                          {
                            offer.business_name
                            || offer.organization_name
                            || "Miller Business"
                          }

                          {
                            offer.is_own_offer
                              ? " (You)"
                              : ""
                          }
                        </p>

                        <p
                          className="
                            mt-1
                            text-xs
                            text-slate-500
                          "
                        >
                          {
                            [
                              offer.business_municipality,
                              offer.business_province,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                ", "
                              )
                            || "Location unavailable"
                          }
                        </p>

                        <p
                          className="
                            mt-3
                            text-sm
                            font-bold
                            text-[#0B5D1E]
                          "
                        >
                          {
                            formatPeso(
                              offer.offered_buying_price_per_kg
                            )
                          }
                          /kg
                        </p>
                      </div>
                    )
                  )
                }
              </div>
            )
            : (
              <p
                className="
                  mt-4
                  rounded-xl
                  bg-slate-50
                  px-4
                  py-6
                  text-center
                  text-sm
                  text-slate-500
                "
              >
                No active offers have been submitted yet.
              </p>
            )
        }
      </section>


      {
        chatOpen
          ? (
            <section
              className="
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-sm
              "
            >
              <div
                className="
                  border-b
                  border-slate-200
                  px-5
                  py-4
                "
              >
                <h4
                  className="
                    text-sm
                    font-bold
                    text-slate-900
                  "
                >
                  Conversation with {
                    bidding.farmer_name
                  }
                </h4>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-slate-500
                  "
                >
                  Reference: {
                    bidding.bidding_code
                  }
                </p>
              </div>


              <div
                className="
                  max-h-80
                  space-y-3
                  overflow-y-auto
                  bg-slate-50/60
                  p-5
                "
              >
                {
                  isLoadingMessages
                    ? (
                      <div
                        className="
                          flex
                          justify-center
                          py-8
                        "
                      >
                        <Loader2
                          size={
                            22
                          }
                          className="
                            animate-spin
                            text-[#0B5D1E]
                          "
                        />
                      </div>
                    )
                    : messages.length
                      ? (
                        messages.map(
                          (
                            message
                          ) => {
                            const mine =
                              message.sender_type ===
                              "miller";

                            return (
                              <div
                                key={
                                  message.message_id
                                }
                                className={`
                                  flex

                                  ${
                                    mine
                                      ? "justify-end"
                                      : "justify-start"
                                  }
                                `}
                              >
                                <div
                                  className={`
                                    max-w-[75%]
                                    rounded-2xl
                                    px-4
                                    py-3
                                    text-sm

                                    ${
                                      mine
                                        ? "bg-[#0B5D1E] text-white"
                                        : "border border-slate-200 bg-white text-slate-700"
                                    }
                                  `}
                                >
                                  <p>
                                    {
                                      message.message_text
                                    }
                                  </p>

                                  <p
                                    className={`
                                      mt-1
                                      text-[10px]

                                      ${
                                        mine
                                          ? "text-emerald-100"
                                          : "text-slate-400"
                                      }
                                    `}
                                  >
                                    {
                                      formatDate(
                                        message.created_at,
                                        true
                                      )
                                    }
                                  </p>
                                </div>
                              </div>
                            );
                          }
                        )
                      )
                      : (
                        <p
                          className="
                            py-8
                            text-center
                            text-sm
                            text-slate-500
                          "
                        >
                          No messages yet. Start the conversation about this bidding.
                        </p>
                      )
                }
              </div>


              <form
                onSubmit={
                  handleSend
                }
                className="
                  flex
                  gap-2
                  border-t
                  border-slate-200
                  p-3
                "
              >
                <input
                  type="text"
                  value={
                    messageText
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setMessageText(
                        event.target.value
                      )
                  }
                  placeholder="Write a message to the farmer..."
                  className="
                    min-w-0
                    flex-1
                    rounded-xl
                    border
                    border-slate-200
                    px-4
                    py-2.5
                    text-sm
                    outline-none
                    focus:border-[#0B5D1E]
                    focus:ring-1
                    focus:ring-[#0B5D1E]
                  "
                />

                <button
                  type="submit"
                  disabled={
                    !messageText.trim()
                    || isSaving
                  }
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-[#0B5D1E]
                    px-4
                    py-2.5
                    text-sm
                    font-bold
                    text-white
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <Send
                    size={
                      15
                    }
                  />

                  Send
                </button>
              </form>
            </section>
          )
          : null
      }
    </div>
  );
}


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MillerContracts() {
  const {
    biddingOffers,
    messages,

    isLoading,
    isSaving,
    isLoadingMessages,

    error,
    profanityBlock,

    clearError,
    clearProfanityBlock,

    loadBiddingOffers,
    loadBiddingDetails,

    submitOffer,
    editOffer,
    withdrawOffer,

    loadMessages,
    sendMessage,
  } = useMillerContracts();


  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "bidding"
  );


  const [
    search,
    setSearch,
  ] = useState(
    ""
  );


  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState(
    ""
  );


  const [
    productType,
    setProductType,
  ] = useState(
    ""
  );


  const [
    variety,
    setVariety,
  ] = useState(
    ""
  );


  const [
    farmerLocation,
    setFarmerLocation,
  ] = useState(
    ""
  );


  const [
    biddingStatus,
    setBiddingStatus,
  ] = useState(
    ""
  );


  const [
    deadline,
    setDeadline,
  ] = useState(
    ""
  );


  const [
    sortBy,
    setSortBy,
  ] = useState(
    "deadline"
  );


  const [
    biddingDetails,
    setBiddingDetails,
  ] = useState(
    null
  );


  const [
    offerModal,
    setOfferModal,
  ] = useState({
    open:
      false,

    mode:
      "create",
  });


  const [
    notice,
    setNotice,
  ] = useState(
    ""
  );


  const [
    messageTarget,
    setMessageTarget,
  ] = useState(
    null
  );


  const activeTabLabel =
    TABS.find(
      (
        tab
      ) =>
        tab.id ===
        activeTab
    )?.label
    ?? "Contracts";


  // ==========================================================
  // SEARCH DEBOUNCE
  // ==========================================================

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            setDebouncedSearch(
              search.trim()
            );
          },
          350
        );

      return () =>
        window.clearTimeout(
          timer
        );
    },
    [
      search,
    ]
  );


  // ==========================================================
  // LOAD BIDDINGS
  // ==========================================================

  useEffect(
    () => {
      if (
        activeTab !==
        "bidding"
        || biddingDetails
      ) {
        return;
      }

      loadBiddingOffers({
        search:
          debouncedSearch,

        product_type:
          productType,

        rice_variety:
          variety,

        farmer_location:
          farmerLocation,

        status:
          biddingStatus,

        bidding_deadline:
          deadline,

        sort_by:
          sortBy,
      });
    },
    [
      activeTab,
      biddingDetails,
      debouncedSearch,
      productType,
      variety,
      farmerLocation,
      biddingStatus,
      deadline,
      sortBy,
      loadBiddingOffers,
    ]
  );


  // ==========================================================
  // DYNAMIC FILTER OPTIONS
  // ==========================================================

  const varietyOptions =
    useMemo(
      () => {
        const values =
          new Set(
            biddingOffers
              .map(
                (
                  item
                ) =>
                  item.rice_variety
              )
              .filter(
                Boolean
              )
          );

        if (variety) {
          values.add(
            variety
          );
        }

        return [
          {
            value:
              "",

            label:
              "All Varieties",
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
        biddingOffers,
        variety,
      ]
    );


  const locationOptions =
    useMemo(
      () => {
        const values =
          new Set(
            biddingOffers
              .map(
                (
                  item
                ) =>
                  item.farm_province
                  || item.farm_municipality
              )
              .filter(
                Boolean
              )
          );

        if (
          farmerLocation
        ) {
          values.add(
            farmerLocation
          );
        }

        return [
          {
            value:
              "",

            label:
              "All Locations",
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
        biddingOffers,
        farmerLocation,
      ]
    );


  // ==========================================================
  // DETAILS
  // ==========================================================

  const refreshDetails =
    async (
      biddingId
    ) => {
      const data =
        await loadBiddingDetails(
          biddingId
        );

      if (data) {
        setBiddingDetails(
          data
        );
      }

      return data;
    };


  const handleViewDetails =
    async (
      offer
    ) => {
      setNotice(
        ""
      );

      clearError();

      await refreshDetails(
        offer.bidding_id
      );
    };


  // ==========================================================
  // SUBMIT / EDIT OFFER
  // ==========================================================

  const handleSaveOffer =
    async (
      payload
    ) => {
      const bidding =
        biddingDetails?.bidding;

      if (!bidding) {
        return null;
      }

      const result =
        offerModal.mode ===
        "edit"

          ? await editOffer(
              bidding.own_offer_id,
              payload,
              bidding.bidding_id
            )

          : await submitOffer(
              bidding.bidding_id,
              payload
            );


      if (
        result
        && !result.blocked
      ) {
        await refreshDetails(
          bidding.bidding_id
        );

        setOfferModal({
          open:
            false,

          mode:
            "create",
        });


        setNotice(
          offerModal.mode ===
          "edit"

            ? "Offer updated successfully."

            : "Offer submitted successfully."
        );
      }

      return result;
    };


  // ==========================================================
  // WITHDRAW OFFER
  // ==========================================================

  const handleWithdrawOffer =
    async () => {
      const bidding =
        biddingDetails?.bidding;

      if (
        !bidding?.own_offer_id
      ) {
        return null;
      }

      const result =
        await withdrawOffer(
          bidding.own_offer_id,
          bidding.bidding_id
        );

      if (result) {
        await refreshDetails(
          bidding.bidding_id
        );

        setNotice(
          "Offer withdrawn successfully."
        );
      }

      return result;
    };


  // ==========================================================
  // BIDDING MESSAGE CONTEXT
  // ==========================================================

  const messageThread =
    biddingDetails?.bidding
      ? {
          farmer_user_id:
            biddingDetails.bidding.farmer_user_id,

          reference_type:
            "bidding",

          reference_id:
            biddingDetails.bidding.bidding_id,
        }
      : null;


  const handleOpenChat =
    async () => {
      if (
        !messageThread
      ) {
        return null;
      }

      return loadMessages({
        farmerUserId:
          messageThread.farmer_user_id,

        referenceType:
          messageThread.reference_type,

        referenceId:
          messageThread.reference_id,
      });
    };


  const handleSendMessage =
    async (
      text
    ) => {
      if (
        !messageThread
      ) {
        return null;
      }

      return sendMessage(
        text,
        messageThread
      );
    };


  // ==========================================================
  // TAB CHANGE
  // ==========================================================

  const handleTabChange =
    (
      tabId
    ) => {
      setActiveTab(
        tabId
      );

      setBiddingDetails(
        null
      );

      setNotice(
        ""
      );

      setMessageTarget(
        null
      );

      clearError();
    };


  // ==========================================================
  // OPEN CURRENT CONTRACT MESSAGE THREAD
  // ==========================================================

  const handleOpenCurrentContractMessages =
    (
      target
    ) => {
      if (!target) {
        return;
      }

      setMessageTarget(
        target
      );

      setBiddingDetails(
        null
      );

      setNotice(
        ""
      );

      clearError();

      setActiveTab(
        "messages"
      );
    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        space-y-6
      "
    >

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div
        className="
          space-y-1
        "
      >
        <Breadcrumbs
          items={[
            {
              label:
                "Management",
            },

            {
              label:
                activeTabLabel,
            },
          ]}
        />

        <h2
          className="
            text-[clamp(1.75rem,2.5vw,2.25rem)]
            font-bold
            tracking-tight
            text-slate-900
          "
        >
          {
            activeTabLabel
          }
        </h2>

        <p
          className="
            text-sm
            text-slate-500
          "
        >
          Manage procurement contracts, farmer biddings, postings, and related communication in one place.
        </p>
      </div>


      {/* ====================================================
          SEGMENTATION
      ==================================================== */}

      <Tabs
        tabs={
          TABS
        }
        activeTab={
          activeTab
        }
        onTabChange={
          handleTabChange
        }
      />


      {/* ====================================================
          SUCCESS MESSAGE
      ==================================================== */}

      {
        notice
          ? (
            <div
              className="
                rounded-xl
                border
                border-emerald-200
                bg-emerald-50
                px-4
                py-3
                text-sm
                font-medium
                text-emerald-700
              "
            >
              {
                notice
              }
            </div>
          )
          : null
      }


      {/* ====================================================
          ERROR
      ==================================================== */}

      {
        error
          ? (
            <div
              className="
                flex
                items-start
                justify-between
                gap-3
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
              <span>
                {
                  error
                }
              </span>

              <button
                type="button"
                onClick={
                  clearError
                }
                className="
                  font-bold
                "
              >
                ×
              </button>
            </div>
          )
          : null
      }


      {/* ====================================================
          PROFANITY WARNING
      ==================================================== */}

      {
        profanityBlock.open
          ? (
            <div
              className="
                flex
                items-start
                justify-between
                gap-3
                rounded-xl
                border
                border-amber-200
                bg-amber-50
                px-4
                py-3
                text-sm
                text-amber-700
              "
            >
              <span>
                {
                  profanityBlock.message
                }
              </span>

              <button
                type="button"
                onClick={
                  clearProfanityBlock
                }
                className="
                  font-bold
                "
              >
                ×
              </button>
            </div>
          )
          : null
      }


      {/* ====================================================
          BIDDING OFFERS LIST
      ==================================================== */}

      {
        activeTab === "bidding"
        && !biddingDetails
          ? (
            <div
              className="
                space-y-5
              "
            >

              {/* ============================================
                  SEARCH / FILTERS
              ============================================ */}

              <div
                className="
                  flex
                  flex-col
                  gap-3
                  lg:flex-row
                  lg:items-center
                "
              >
                <div
                  className="
                    relative
                    min-w-[240px]
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
                    size={
                      16
                    }
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
                    placeholder="Search farmer, farm, product, or rice variety"
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
                      focus:border-[#0B5D1E]
                      focus:ring-1
                      focus:ring-[#0B5D1E]
                    "
                  />
                </div>


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
                      productType
                    }
                    onChange={
                      setProductType
                    }
                    options={
                      PRODUCT_TYPES
                    }
                  />

                  <FilterSelect
                    value={
                      variety
                    }
                    onChange={
                      setVariety
                    }
                    options={
                      varietyOptions
                    }
                  />

                  <FilterSelect
                    value={
                      farmerLocation
                    }
                    onChange={
                      setFarmerLocation
                    }
                    options={
                      locationOptions
                    }
                  />

                  <FilterSelect
                    value={
                      biddingStatus
                    }
                    onChange={
                      setBiddingStatus
                    }
                    options={
                      BIDDING_STATUSES
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

                  <input
                    type="date"
                    value={
                      deadline
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setDeadline(
                          event.target.value
                        )
                    }
                    aria-label="Bidding deadline"
                    className="
                      rounded-xl
                      border
                      border-gray-200
                      bg-white
                      px-3.5
                      py-2
                      text-sm
                      font-medium
                      text-gray-700
                      outline-none
                      focus:border-[#0B5D1E]
                      focus:ring-1
                      focus:ring-[#0B5D1E]
                    "
                  />
                </div>
              </div>


              {/* ============================================
                  LOADING
              ============================================ */}

              {
                isLoading
                  ? (
                    <div
                      className="
                        flex
                        min-h-72
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
                          size={
                            28
                          }
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
                            font-medium
                            text-slate-500
                          "
                        >
                          Loading farmer biddings...
                        </p>
                      </div>
                    </div>
                  )
                  : biddingOffers.length
                    ? (
                      <div
                        className="
                          grid
                          grid-cols-1
                          gap-4
                          md:grid-cols-2
                          xl:grid-cols-4
                        "
                      >
                        {
                          biddingOffers.map(
                            (
                              offer
                            ) => (
                              <BiddingOfferCard
                                key={
                                  offer.bidding_id
                                }
                                offer={
                                  offer
                                }
                                onView={
                                  handleViewDetails
                                }
                              />
                            )
                          )
                        }
                      </div>
                    )
                    : (
                      <EmptyState>
                        No bidding offers matched your search or filters.
                      </EmptyState>
                    )
              }
            </div>
          )
          : null
      }


      {/* ====================================================
          BIDDING DETAILS
      ==================================================== */}

      {
        activeTab === "bidding"
        && biddingDetails
          ? (
            <BiddingDetailsView
              data={
                biddingDetails
              }

              messages={
                messages
              }

              isLoadingMessages={
                isLoadingMessages
              }

              isSaving={
                isSaving
              }

              onBack={
                () => {
                  setBiddingDetails(
                    null
                  );

                  setNotice(
                    ""
                  );
                }
              }

              onSubmitOffer={
                () =>
                  setOfferModal({
                    open:
                      true,

                    mode:
                      "create",
                  })
              }

              onEditOffer={
                () =>
                  setOfferModal({
                    open:
                      true,

                    mode:
                      "edit",
                  })
              }

              onWithdrawOffer={
                handleWithdrawOffer
              }

              onOpenChat={
                handleOpenChat
              }

              onSendMessage={
                handleSendMessage
              }
            />
          )
          : null
      }


      {/* ====================================================
          OTHER CONTRACT SEGMENTS
      ==================================================== */}

      {
        activeTab ===
        "postings"
          ? (
            <PostingsTab />
          )
          : null
      }


      {
        activeTab ===
        "contracts"
          ? (
            <CurrentContractsTab
              onOpenMessages={
                handleOpenCurrentContractMessages
              }
            />
          )
          : null
      }


      {
        activeTab ===
        "messages"
          ? (
            <MessagesTab
              initialConversation={
                messageTarget
              }
            />
          )
          : null
      }


      {/* ====================================================
          OFFER APPLICATION MODAL
      ==================================================== */}

      <MillerContractOfferApplicationModal
        open={
          offerModal.open
        }

        mode={
          offerModal.mode
        }

        bidding={
          biddingDetails?.bidding
          || null
        }

        isSaving={
          isSaving
        }

        error={
          error
        }

        onClose={
          () => {
            if (
              !isSaving
            ) {
              setOfferModal({
                open:
                  false,

                mode:
                  "create",
              });

              clearError();
            }
          }
        }

        onSubmit={
          handleSaveOffer
        }
      />
    </div>
  );
}