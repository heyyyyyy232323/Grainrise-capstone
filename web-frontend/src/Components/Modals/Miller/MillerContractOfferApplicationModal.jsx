import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  FileSignature,
  Gavel,
  Loader2,
  Package,
  PhilippinePeso,
  Scale,
  UserRound,
  X,
} from "lucide-react";

import SignaturePad from "../../Minor-Components/SignaturePad";

const EMPTY_FORM = {
  offeredBuyingPrice: "",
  offeredQuantity: "",
  proposedFulfillmentDate: "",
  fulfillmentMethod: "buyer_pickup",
  proposedTerms: "",
  additionalNotes: "",
  signature: "",
};

const FULFILLMENT_METHODS = [
  { value: "buyer_pickup", label: "Buyer Pickup" },
  { value: "farmer_delivery", label: "Farmer Delivery" },
];

function getTodayInputValue() {
  const now = new Date();

  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return local
    .toISOString()
    .slice(0, 10);
}

function formatDate(
  value,
  includeTime = false
) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",

      ...(includeTime
        ? {
            hour: "numeric",
            minute: "2-digit",
          }
        : {}),
    }
  ).format(parsed);
}

function formatPeso(value) {
  if (
    value === null
    || value === undefined
    || value === ""
  ) {
    return "—";
  }

  const number = Number(value);

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
}

function formatQuantity(value) {
  const number = Number(value);

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
}

function productTypeLabel(value) {
  if (
    value === "unmilled_palay"
  ) {
    return "Unmilled Palay";
  }

  if (
    value === "milled_rice"
  ) {
    return "Milled Rice";
  }

  return String(
    value || "—"
  )
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function FieldError({
  children,
}) {
  if (!children) {
    return null;
  }

  return (
    <p className="mt-1.5 text-xs font-medium text-red-600">
      {children}
    </p>
  );
}

function InfoItem({
  label,
  value,
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

function getDefaultForm(
  bidding,
  mode
) {
  if (
    mode === "edit"
    && bidding
  ) {
    return {
      offeredBuyingPrice:
        bidding.offered_buying_price_per_kg
        ?? "",

      offeredQuantity:
        bidding.offered_quantity_kg
        ?? "",

      proposedFulfillmentDate:
        bidding.proposed_fulfillment_date
          ? String(
              bidding.proposed_fulfillment_date
            ).slice(0, 10)
          : "",

      fulfillmentMethod:
        bidding.own_offer_fulfillment_method
        || bidding.fulfillment_method
        || "buyer_pickup",

      proposedTerms:
        bidding.proposed_terms
        || "",

      additionalNotes:
        bidding.additional_notes_to_farmer
        || "",

      signature:
        bidding.miller_signature_path
        || "",
    };
  }

  return {
    ...EMPTY_FORM,

    fulfillmentMethod:
      bidding?.fulfillment_method
      || "buyer_pickup",
  };
}

export default function MillerContractOfferApplicationModal({
  open,
  mode = "create",
  bidding = null,
  isSaving = false,
  error = "",
  onClose,
  onSubmit,
}) {
  const [
    form,
    setForm,
  ] = useState(
    EMPTY_FORM
  );

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState({});

  const [
    localError,
    setLocalError,
  ] = useState("");

  const isEdit =
    mode === "edit";

  const today =
    useMemo(
      () =>
        getTodayInputValue(),
      []
    );

  useEffect(
    () => {
      if (!open) {
        return;
      }

      setForm(
        getDefaultForm(
          bidding,
          mode
        )
      );

      setFieldErrors({});
      setLocalError("");
    },
    [
      open,
      bidding,
      mode,
    ]
  );

  useEffect(
    () => {
      if (!open) {
        return undefined;
      }

      const previous =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      return () => {
        document.body.style.overflow =
          previous;
      };
    },
    [
      open,
    ]
  );

  const estimatedOfferValue =
    useMemo(
      () => {
        const price =
          Number(
            form.offeredBuyingPrice
          );

        const quantity =
          Number(
            form.offeredQuantity
          );

        if (
          !Number.isFinite(price)
          || !Number.isFinite(quantity)
          || price <= 0
          || quantity <= 0
        ) {
          return null;
        }

        return price * quantity;
      },
      [
        form.offeredBuyingPrice,
        form.offeredQuantity,
      ]
    );

  if (!open) {
    return null;
  }

  const updateField =
    (
      field,
      value
    ) => {
      setForm(
        (
          current
        ) => ({
          ...current,
          [field]: value,
        })
      );

      setFieldErrors(
        (
          current
        ) => {
          const next = {
            ...current,
          };

          delete next[field];

          return next;
        }
      );

      setLocalError("");
    };

  const inputClass =
    (
      field
    ) =>
      [
        "mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm",
        "text-slate-700 outline-none transition disabled:cursor-not-allowed",
        "disabled:bg-slate-100 disabled:text-slate-400",

        fieldErrors[field]
          ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-1 focus:ring-red-200"
          : "border-slate-200 focus:border-[#0B5D1E] focus:ring-1 focus:ring-[#0B5D1E]",
      ].join(" ");

  const validateForm =
    () => {
      const errors = {};

      const price =
        Number(
          form.offeredBuyingPrice
        );

      const quantity =
        Number(
          form.offeredQuantity
        );

      const openQuantity =
        Number(
          bidding?.quantity_open_for_bidding_kg
        );

      const minimumPrice =
        bidding?.minimum_acceptable_price_per_kg === null
        || bidding?.minimum_acceptable_price_per_kg === undefined
        || bidding?.minimum_acceptable_price_per_kg === ""
          ? null
          : Number(
              bidding.minimum_acceptable_price_per_kg
            );

      if (!bidding?.bidding_id) {
        setLocalError(
          "The Farmer bidding reference is unavailable."
        );

        return false;
      }

      if (
        bidding.bidding_status
        && bidding.bidding_status !== "open"
      ) {
        setLocalError(
          "This Farmer bidding is no longer open."
        );

        return false;
      }

      if (
        bidding.bidding_deadline
      ) {
        const deadline =
          new Date(
            bidding.bidding_deadline
          );

        if (
          !Number.isNaN(
            deadline.getTime()
          )
          && deadline.getTime()
            <= Date.now()
        ) {
          setLocalError(
            "The bidding deadline has already passed."
          );

          return false;
        }
      }

      if (
        form.offeredBuyingPrice === ""
        || !Number.isFinite(price)
        || price <= 0
      ) {
        errors.offeredBuyingPrice =
          "Offered buying price must be greater than zero.";

      } else if (
        minimumPrice !== null
        && Number.isFinite(
          minimumPrice
        )
        && price < minimumPrice
      ) {
        errors.offeredBuyingPrice =
          `Offer must be at least ${formatPeso(
            minimumPrice
          )} per kg.`;
      }

      if (
        form.offeredQuantity === ""
        || !Number.isFinite(quantity)
        || quantity <= 0
      ) {
        errors.offeredQuantity =
          "Offered quantity must be greater than zero.";

      } else if (
        Number.isFinite(
          openQuantity
        )
        && openQuantity > 0
        && quantity > openQuantity
      ) {
        errors.offeredQuantity =
          `Offered quantity cannot exceed ${formatQuantity(
            openQuantity
          )}.`;
      }

      if (
        !form.proposedFulfillmentDate
      ) {
        errors.proposedFulfillmentDate =
          "Proposed fulfillment date is required.";

      } else if (
        form.proposedFulfillmentDate
        < today
      ) {
        errors.proposedFulfillmentDate =
          "Proposed fulfillment date cannot be in the past.";
      }

      if (
        !FULFILLMENT_METHODS.some(
          (
            option
          ) =>
            option.value
            === form.fulfillmentMethod
        )
      ) {
        errors.fulfillmentMethod =
          "Select a valid fulfillment method.";
      }

      if (
        form.proposedTerms.length
        > 3000
      ) {
        errors.proposedTerms =
          "Proposed deal / terms cannot exceed 3000 characters.";
      }

      if (
        form.additionalNotes.length
        > 3000
      ) {
        errors.additionalNotes =
          "Additional notes cannot exceed 3000 characters.";
      }

      if (
        !form.signature
        || !String(
          form.signature
        ).startsWith(
          "data:image/"
        )
      ) {
        errors.signature =
          "Electronic signature is required.";
      }

      setFieldErrors(
        errors
      );

      return (
        Object.keys(
          errors
        ).length === 0
      );
    };

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (isSaving) {
        return;
      }

      setLocalError("");

      if (!validateForm()) {
        return;
      }

      await onSubmit?.({
        offered_buying_price_per_kg:
          Number(
            form.offeredBuyingPrice
          ),

        offered_quantity_kg:
          Number(
            form.offeredQuantity
          ),

        proposed_fulfillment_date:
          form.proposedFulfillmentDate,

        fulfillment_method:
          form.fulfillmentMethod,

        proposed_terms:
          form.proposedTerms.trim()
          || null,

        additional_notes_to_farmer:
          form.additionalNotes.trim()
          || null,

        miller_signature_path:
          form.signature,
      });
    };

  const handleClear =
    () => {
      if (isSaving) {
        return;
      }

      setForm({
        ...EMPTY_FORM,

        fulfillmentMethod:
          bidding?.fulfillment_method
          || "buyer_pickup",
      });

      setFieldErrors({});
      setLocalError("");
    };

  const handleClose =
    () => {
      if (isSaving) {
        return;
      }

      setFieldErrors({});
      setLocalError("");

      onClose?.();
    };

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/55 p-3 sm:p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="miller-offer-modal-title"
        onSubmit={
          handleSubmit
        }
        className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* HEADER */}

        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-[#0B5D1E]">
              <Gavel
                size={20}
              />
            </div>

            <div>
              <h2
                id="miller-offer-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                {isEdit
                  ? "Edit Offer"
                  : "Submit Offer"}
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                {isEdit
                  ? "Update your submitted offer while this Farmer bidding remains open."
                  : "Submit your Miller offer for this Farmer bidding."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              handleClose
            }
            disabled={
              isSaving
            }
            aria-label="Close offer modal"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X
              size={20}
            />
          </button>
        </div>


        {/* BODY */}

        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          {/* BIDDING REFERENCE */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
              <h3 className="text-sm font-bold text-slate-900">
                Bidding Reference
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                Review the Farmer's bidding details before submitting your offer.
              </p>
            </div>

            <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[150px_1fr]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {bidding?.product_image ? (
                  <img
                    src={
                      bidding.product_image
                    }
                    alt={
                      bidding.rice_variety
                      || "Farmer product"
                    }
                    className="h-36 w-full object-cover md:h-full"
                  />

                ) : (
                  <div className="flex h-36 items-center justify-center text-slate-300 md:h-full md:min-h-[150px]">
                    <Package
                      size={30}
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoItem
                  label="Bidding ID"
                  value={
                    bidding?.bidding_code
                    || (
                      bidding?.bidding_id
                        ? `BID-${bidding.bidding_id}`
                        : "—"
                    )
                  }
                />

                <InfoItem
                  label="Farmer Name"
                  value={
                    bidding?.farmer_name
                  }
                />

                <InfoItem
                  label="Product Type"
                  value={
                    productTypeLabel(
                      bidding?.product_type
                    )
                  }
                />

                <InfoItem
                  label="Rice Variety"
                  value={
                    bidding?.rice_variety
                  }
                />

                <InfoItem
                  label="Quantity Open for Bidding"
                  value={
                    formatQuantity(
                      bidding?.quantity_open_for_bidding_kg
                    )
                  }
                />

                <InfoItem
                  label="Minimum Acceptable Price"
                  value={
                    bidding?.minimum_acceptable_price_per_kg !== null
                    && bidding?.minimum_acceptable_price_per_kg !== undefined
                      ? `${formatPeso(
                          bidding.minimum_acceptable_price_per_kg
                        )}/kg`
                      : "No minimum price"
                  }
                />

                <InfoItem
                  label="Preferred Fulfillment Date"
                  value={
                    formatDate(
                      bidding?.preferred_fulfillment_date
                    )
                  }
                />

                <InfoItem
                  label="Bidding Deadline"
                  value={
                    formatDate(
                      bidding?.bidding_deadline,
                      true
                    )
                  }
                />
              </div>
            </div>
          </section>


          {/* MILLER OFFER */}

          <section>
            <h3 className="text-sm font-bold text-slate-900">
              Miller's Offer
            </h3>

            <p className="mt-0.5 text-xs text-slate-500">
              Enter the commercial and fulfillment terms you are proposing to the Farmer.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <PhilippinePeso
                    size={13}
                  />

                  Offered Buying Price per kg *
                </span>

                <input
                  type="number"
                  min={
                    bidding?.minimum_acceptable_price_per_kg
                    || "0.01"
                  }
                  step="0.01"
                  inputMode="decimal"
                  value={
                    form.offeredBuyingPrice
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "offeredBuyingPrice",
                        event.target.value
                      )
                  }
                  placeholder="0.00"
                  className={
                    inputClass(
                      "offeredBuyingPrice"
                    )
                  }
                />

                <FieldError>
                  {fieldErrors.offeredBuyingPrice}
                </FieldError>
              </label>


              <label>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Scale
                    size={13}
                  />

                  Quantity (kg) *
                </span>

                <input
                  type="number"
                  min="0.01"
                  max={
                    bidding?.quantity_open_for_bidding_kg
                    || undefined
                  }
                  step="0.01"
                  inputMode="decimal"
                  value={
                    form.offeredQuantity
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "offeredQuantity",
                        event.target.value
                      )
                  }
                  placeholder="0.00"
                  className={
                    inputClass(
                      "offeredQuantity"
                    )
                  }
                />

                <FieldError>
                  {fieldErrors.offeredQuantity}
                </FieldError>
              </label>


              <label>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <CalendarDays
                    size={13}
                  />

                  Proposed Fulfillment Date *
                </span>

                <input
                  type="date"
                  min={
                    today
                  }
                  value={
                    form.proposedFulfillmentDate
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "proposedFulfillmentDate",
                        event.target.value
                      )
                  }
                  className={
                    inputClass(
                      "proposedFulfillmentDate"
                    )
                  }
                />

                <FieldError>
                  {fieldErrors.proposedFulfillmentDate}
                </FieldError>
              </label>


              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Fulfillment Method *
                </span>

                <select
                  value={
                    form.fulfillmentMethod
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "fulfillmentMethod",
                        event.target.value
                      )
                  }
                  className={
                    inputClass(
                      "fulfillmentMethod"
                    )
                  }
                >
                  {FULFILLMENT_METHODS.map(
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

                <FieldError>
                  {fieldErrors.fulfillmentMethod}
                </FieldError>
              </label>
            </div>


            {/* ESTIMATED OFFER VALUE */}

            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="text-[11px] font-medium text-emerald-700">
                Estimated Offer Value
              </p>

              <p className="mt-1 text-lg font-bold text-[#0B5D1E]">
                {estimatedOfferValue !== null
                  ? formatPeso(
                      estimatedOfferValue
                    )
                  : "—"}
              </p>

              <p className="mt-0.5 text-[11px] text-emerald-700/70">
                Offered price × offered quantity
              </p>
            </div>


            {/* TERMS */}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Proposed Deal / Terms
                </span>

                <textarea
                  rows={5}
                  maxLength={3000}
                  value={
                    form.proposedTerms
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "proposedTerms",
                        event.target.value
                      )
                  }
                  placeholder="Enter your proposed purchasing or fulfillment terms..."
                  className={`${inputClass(
                    "proposedTerms"
                  )} resize-none`}
                />

                <div className="mt-1 flex items-center justify-between gap-3">
                  <FieldError>
                    {fieldErrors.proposedTerms}
                  </FieldError>

                  <span className="ml-auto text-[10px] text-slate-400">
                    {form.proposedTerms.length}/3000
                  </span>
                </div>
              </label>


              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Additional Notes to Farmer
                </span>

                <textarea
                  rows={5}
                  maxLength={3000}
                  value={
                    form.additionalNotes
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "additionalNotes",
                        event.target.value
                      )
                  }
                  placeholder="Optional message or additional proposal details..."
                  className={`${inputClass(
                    "additionalNotes"
                  )} resize-none`}
                />

                <div className="mt-1 flex items-center justify-between gap-3">
                  <FieldError>
                    {fieldErrors.additionalNotes}
                  </FieldError>

                  <span className="ml-auto text-[10px] text-slate-400">
                    {form.additionalNotes.length}/3000
                  </span>
                </div>
              </label>
            </div>
          </section>


          {/* SIGNATURE */}

          <section>
            <div className="flex items-start gap-2">
              <FileSignature
                size={17}
                className="mt-0.5 shrink-0 text-[#0B5D1E]"
              />

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Electronic Signature *
                </h3>

                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  Draw your signature using your mouse on desktop or your finger/stylus on mobile.
                  Your signature confirms this Miller offer.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <SignaturePad
                value={
                  form.signature
                }
                onChange={
                  (
                    signature
                  ) =>
                    updateField(
                      "signature",
                      signature
                    )
                }
                disabled={
                  isSaving
                }
                error={
                  fieldErrors.signature
                  || ""
                }
              />
            </div>
          </section>


          {/* ERRORS */}

          {(localError || error) && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {localError || error}
            </div>
          )}
        </div>


        {/* FOOTER */}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={
              handleClear
            }
            disabled={
              isSaving
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-normal text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>

          <button
            type="submit"
            disabled={
              isSaving
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B5D1E] px-5 py-2.5 text-sm font-normal text-white transition hover:bg-[#094d19] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && (
              <Loader2
                size={16}
                className="animate-spin"
              />
            )}

            <UserRound
              size={16}
            />

            {isSaving
              ? (
                  isEdit
                    ? "Updating Offer..."
                    : "Submitting Offer..."
                )
              : (
                  isEdit
                    ? "Update Offer"
                    : "Submit Offer"
                )}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}