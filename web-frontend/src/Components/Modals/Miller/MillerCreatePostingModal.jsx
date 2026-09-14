import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Building2,
  FileImage,
  Loader2,
  MapPin,
  PlusCircle,
  Trash2,
  X,
} from "lucide-react";

import useApi from "../../hooks/useApi";
import usePhilippineAddress from "../../hooks/usePhilippineAddress";


// ============================================================
// FORM DEFAULT
// ============================================================

const EMPTY_FORM = {
  applicationDeadline: "",

  productType: "",

  riceVariety: "",
  customVariety: "",

  productImage: "",
  productDescription: "",

  productGrade: "",
  customGrade: "",

  requiredQuantity: "",
  buyingPrice: "",

  fulfillmentDate: "",

  partialQuantityAllowed: "false",
  priceNegotiationAllowed: "false",

  fulfillmentMethod: "buyer_pickup",

  pickupStreetAddress: "",

  proposedTerms: "",
  additionalNotes: "",
};


// ============================================================
// OPTIONS
// ============================================================

const PRODUCT_TYPES = [
  {
    value: "unmilled_palay",
    label: "Unmilled Palay",
  },
  {
    value: "milled_rice",
    label: "Milled Rice",
  },
];


const RICE_VARIETIES = [
  "Dinorado",
  "Sinandomeng",
  "Jasmine",
  "NSIC Rc 216",
  "NSIC Rc 222",
  "NSIC Rc 238",
  "NSIC Rc 402",
  "NSIC Rc 480",
  "PSB Rc 18",
  "Other / Specify",
];


const PRODUCT_GRADES = [
  "Grade A",
  "Grade B",
  "Premium Grade",
  "Commercial Grade",
  "Other / Specify",
];


const FULFILLMENT_METHODS = [
  {
    value: "buyer_pickup",
    label: "Buyer Pickup",
  },
  {
    value: "farmer_delivery",
    label: "Farmer Delivery",
  },
];


// ============================================================
// HELPERS
// ============================================================

function getTodayInputValue() {
  const now =
    new Date();

  const localDate =
    new Date(
      now.getTime()
      - now.getTimezoneOffset() * 60000
    );

  return localDate
    .toISOString()
    .slice(0, 10);
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


function SectionTitle({
  title,
  description,
}) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-slate-900">
        {title}
      </h3>

      {description && (
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}


function getBusinessAddressText(
  businessAddress
) {
  if (!businessAddress) {
    return "";
  }

  return [
    businessAddress.street_address,
    businessAddress.barangay,
    businessAddress.municipality,
    businessAddress.province,
    businessAddress.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MillerCreatePostingModal({
  open,
  mode = "create",
  posting = null,
  isSaving = false,
  error = "",
  onClose,
  onSubmit,
}) {
  const {
    request,
  } = useApi();


  // ==========================================================
  // REUSABLE PSGC ADDRESS
  // ==========================================================

  const address =
    usePhilippineAddress();


  // ==========================================================
  // FORM STATE
  // ==========================================================

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


  // ==========================================================
  // MILLER BUSINESS ADDRESS
  // ==========================================================

  const [
    businessAddress,
    setBusinessAddress,
  ] = useState(null);


  const [
    businessAddressLoading,
    setBusinessAddressLoading,
  ] = useState(false);


  const [
    businessAddressError,
    setBusinessAddressError,
  ] = useState("");


  // ==========================================================
  // EDIT MODE PICKUP ADDRESS HYDRATION
  // ==========================================================

  const [
    pickupAddressSeed,
    setPickupAddressSeed,
  ] = useState(null);


  const isEdit =
    mode === "edit";


  const today =
    useMemo(
      () =>
        getTodayInputValue(),
      []
    );


  // ==========================================================
  // EXISTING POSTING -> FORM
  // ==========================================================

  const getPostingForm =
    () => {
      if (!posting) {
        return {
          ...EMPTY_FORM,
        };
      }


      const existingVariety =
        String(
          posting.rice_variety || ""
        );


      const knownVariety =
        RICE_VARIETIES.includes(
          existingVariety
        );


      const existingGrade =
        String(
          posting.product_grade || ""
        );


      const knownGrade =
        PRODUCT_GRADES.includes(
          existingGrade
        );


      return {
        applicationDeadline:
          posting.application_deadline
            ? String(
                posting.application_deadline
              ).slice(0, 10)
            : "",


        productType:
          posting.product_type
          || "",


        riceVariety:
          knownVariety
            ? existingVariety
            : existingVariety
              ? "Other / Specify"
              : "",


        customVariety:
          knownVariety
            ? ""
            : existingVariety,


        productImage:
          posting.product_image
          || "",


        productDescription:
          posting.product_description
          || "",


        productGrade:
          knownGrade
            ? existingGrade
            : existingGrade
              ? "Other / Specify"
              : "",


        customGrade:
          knownGrade
            ? ""
            : existingGrade,


        requiredQuantity:
          posting.required_quantity_kg
          ?? "",


        buyingPrice:
          posting.buying_price_per_kg
          ?? "",


        fulfillmentDate:
          posting.required_fulfillment_date
            ? String(
                posting.required_fulfillment_date
              ).slice(0, 10)
            : "",


        partialQuantityAllowed:
          posting.partial_quantity_allowed
            ? "true"
            : "false",


        priceNegotiationAllowed:
          posting.price_negotiation_allowed
            ? "true"
            : "false",


        fulfillmentMethod:
          posting.fulfillment_method
          || "buyer_pickup",


        pickupStreetAddress:
          posting.fulfillment_method
          === "buyer_pickup"
            ? posting.fulfillment_street_address
              || ""
            : "",


        proposedTerms:
          posting.proposed_deal_terms
          || "",


        additionalNotes:
          posting.additional_notes_to_farmers
          || "",
      };
    };


  // ==========================================================
  // INITIALIZE MODAL
  // ==========================================================

  useEffect(
    () => {
      if (!open) {
        return;
      }


      setFieldErrors({});

      address.resetAddress();


      if (
        isEdit
        && posting
      ) {
        setForm(
          getPostingForm()
        );


        if (
          posting.fulfillment_method
          === "buyer_pickup"
        ) {
          setPickupAddressSeed({
            province:
              posting.fulfillment_province
              || "",

            municipality:
              posting.fulfillment_municipality
              || "",

            barangay:
              posting.fulfillment_barangay
              || "",

            postalCode:
              posting.fulfillment_postal_code
              || "",
          });

        } else {
          setPickupAddressSeed(
            null
          );
        }


        return;
      }


      setForm({
        ...EMPTY_FORM,
      });

      setPickupAddressSeed(
        null
      );
    },
    [
      open,
      isEdit,
      posting,
    ]
  );


  // ==========================================================
  // HYDRATE EDIT MODE - PROVINCE
  // ==========================================================

  useEffect(
    () => {
      if (
        !open
        || !pickupAddressSeed?.province
        || address.province
      ) {
        return;
      }


      if (
        address.provinceOptions.includes(
          pickupAddressSeed.province
        )
      ) {
        address.selectProvince(
          pickupAddressSeed.province
        );
      }
    },
    [
      open,
      pickupAddressSeed,
      address.province,
      address.provinceOptions,
      address.selectProvince,
    ]
  );


  // ==========================================================
  // HYDRATE EDIT MODE - MUNICIPALITY
  // ==========================================================

  useEffect(
    () => {
      if (
        !open
        || !pickupAddressSeed?.municipality
        || !address.province
        || address.municipality
      ) {
        return;
      }


      if (
        address.municipalityOptions.includes(
          pickupAddressSeed.municipality
        )
      ) {
        address.selectMunicipality(
          pickupAddressSeed.municipality
        );
      }
    },
    [
      open,
      pickupAddressSeed,
      address.province,
      address.municipality,
      address.municipalityOptions,
      address.selectMunicipality,
    ]
  );


  // ==========================================================
  // HYDRATE EDIT MODE - BARANGAY
  // ==========================================================

  useEffect(
    () => {
      if (
        !open
        || !pickupAddressSeed?.barangay
        || !address.municipality
        || address.barangay
      ) {
        return;
      }


      if (
        address.barangayOptions.includes(
          pickupAddressSeed.barangay
        )
      ) {
        address.selectBarangay(
          pickupAddressSeed.barangay
        );


        if (
          pickupAddressSeed.postalCode
          && !address.postalCode
        ) {
          address.updatePostalCode(
            pickupAddressSeed.postalCode
          );
        }
      }
    },
    [
      open,
      pickupAddressSeed,
      address.municipality,
      address.barangay,
      address.barangayOptions,
      address.postalCode,
      address.selectBarangay,
      address.updatePostalCode,
    ]
  );


  // ==========================================================
  // LOAD AUTHENTICATED MILLER BUSINESS ADDRESS
  // ==========================================================

  useEffect(
    () => {
      if (!open) {
        return undefined;
      }


      let cancelled =
        false;


      const loadBusinessAddress =
        async () => {
          setBusinessAddressLoading(
            true
          );

          setBusinessAddressError(
            ""
          );


          try {
            const response =
              await request(
                "/miller/contracts/business-address/",
                {
                  method: "GET",
                  throwOnError: true,
                }
              );


            if (cancelled) {
              return;
            }


            setBusinessAddress(
              response?.data
              || response
              || null
            );

          } catch (
            loadError
          ) {
            if (cancelled) {
              return;
            }


            setBusinessAddress(
              null
            );


            setBusinessAddressError(
              loadError?.message
              || "Unable to retrieve the registered Miller business address."
            );

          } finally {
            if (!cancelled) {
              setBusinessAddressLoading(
                false
              );
            }
          }
        };


      loadBusinessAddress();


      return () => {
        cancelled = true;
      };
    },
    [
      open,
      request,
    ]
  );


  // ==========================================================
  // LOCK PAGE SCROLL
  // ==========================================================

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


  if (!open) {
    return null;
  }


  // ==========================================================
  // FIELD UPDATE
  // ==========================================================

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
    };


  // ==========================================================
  // INPUT CLASS
  // ==========================================================

  const inputClass =
    (
      field
    ) => `
      mt-1.5
      w-full
      rounded-xl
      border
      px-3.5
      py-2.5
      text-sm
      text-slate-700
      outline-none
      transition
      focus:ring-1
      disabled:cursor-not-allowed
      disabled:bg-slate-100
      disabled:text-slate-400

      ${
        fieldErrors[field]
          ? `
            border-red-400
            bg-red-50/30
            focus:border-red-500
            focus:ring-red-200
          `
          : `
            border-slate-200
            bg-white
            focus:border-[#0B5D1E]
            focus:ring-[#0B5D1E]
          `
      }
    `;


  // ==========================================================
  // PSGC HANDLERS
  // ==========================================================

  const handleProvinceChange =
    async (
      province
    ) => {
      setPickupAddressSeed(
        null
      );


      setFieldErrors(
        (
          current
        ) => {
          const next = {
            ...current,
          };

          delete next.province;
          delete next.municipality;
          delete next.barangay;
          delete next.postalCode;

          return next;
        }
      );


      await address.selectProvince(
        province
      );
    };


  const handleMunicipalityChange =
    async (
      municipality
    ) => {
      setPickupAddressSeed(
        null
      );


      setFieldErrors(
        (
          current
        ) => {
          const next = {
            ...current,
          };

          delete next.municipality;
          delete next.barangay;
          delete next.postalCode;

          return next;
        }
      );


      await address.selectMunicipality(
        municipality
      );
    };


  const handleBarangayChange =
    (
      barangay
    ) => {
      setPickupAddressSeed(
        null
      );


      setFieldErrors(
        (
          current
        ) => {
          const next = {
            ...current,
          };

          delete next.barangay;

          return next;
        }
      );


      address.selectBarangay(
        barangay
      );
    };


  const handlePostalCodeChange =
    (
      event
    ) => {
      address.updatePostalCode(
        event.target.value
      );


      setFieldErrors(
        (
          current
        ) => {
          const next = {
            ...current,
          };

          delete next.postalCode;

          return next;
        }
      );
    };


  // ==========================================================
  // FULFILLMENT METHOD CHANGE
  // ==========================================================

  const handleFulfillmentMethodChange =
    (
      value
    ) => {
      updateField(
        "fulfillmentMethod",
        value
      );


      setFieldErrors(
        (
          current
        ) => {
          const next = {
            ...current,
          };

          delete next.province;
          delete next.municipality;
          delete next.barangay;
          delete next.postalCode;
          delete next.pickupStreetAddress;

          return next;
        }
      );


      if (
        value ===
        "farmer_delivery"
      ) {
        address.resetAddress();

        setPickupAddressSeed(
          null
        );
      }
    };


  // ==========================================================
  // IMAGE UPLOAD
  // ==========================================================

  const handleImageChange =
    (
      event
    ) => {
      const file =
        event.target.files?.[0];


      if (!file) {
        return;
      }


      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        setFieldErrors(
          (
            current
          ) => ({
            ...current,

            productImage:
              "Please select a valid image file.",
          })
        );

        return;
      }


      if (
        file.size >
        2 * 1024 * 1024
      ) {
        setFieldErrors(
          (
            current
          ) => ({
            ...current,

            productImage:
              "Product image must not exceed 2 MB.",
          })
        );

        return;
      }


      const reader =
        new FileReader();


      reader.onload =
        () => {
          updateField(
            "productImage",
            reader.result
          );
        };


      reader.readAsDataURL(
        file
      );
    };


  const removeImage =
    () => {
      if (isSaving) {
        return;
      }

      updateField(
        "productImage",
        ""
      );
    };


  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validateForm =
    () => {
      const errors = {};


      const quantity =
        Number(
          form.requiredQuantity
        );


      const price =
        Number(
          form.buyingPrice
        );


      const finalVariety =
        form.riceVariety ===
        "Other / Specify"
          ? form.customVariety.trim()
          : form.riceVariety.trim();


      const finalGrade =
        form.productGrade ===
        "Other / Specify"
          ? form.customGrade.trim()
          : form.productGrade.trim();


      // ------------------------------------------------------
      // APPLICATION DEADLINE
      // ------------------------------------------------------

      if (
        !form.applicationDeadline
      ) {
        errors.applicationDeadline =
          "Application deadline is required.";

      } else if (
        form.applicationDeadline <
        today
      ) {
        errors.applicationDeadline =
          "Application deadline cannot be in the past.";
      }


      // ------------------------------------------------------
      // PRODUCT TYPE
      // ------------------------------------------------------

      if (
        !PRODUCT_TYPES.some(
          (
            item
          ) =>
            item.value ===
            form.productType
        )
      ) {
        errors.productType =
          "Product type is required.";
      }


      // ------------------------------------------------------
      // RICE VARIETY
      // ------------------------------------------------------

      if (!finalVariety) {
        errors.riceVariety =
          "Rice variety is required.";
      }


      if (
        finalVariety.length >
        150
      ) {
        errors.riceVariety =
          "Rice variety cannot exceed 150 characters.";
      }


      // ------------------------------------------------------
      // PRODUCT GRADE
      // ------------------------------------------------------

      if (
        form.productGrade ===
        "Other / Specify"
        && !finalGrade
      ) {
        errors.customGrade =
          "Please specify the product grade.";
      }


      if (
        finalGrade.length >
        150
      ) {
        errors.customGrade =
          "Product grade cannot exceed 150 characters.";
      }


      // ------------------------------------------------------
      // DESCRIPTION
      // ------------------------------------------------------

      if (
        form.productDescription.length >
        3000
      ) {
        errors.productDescription =
          "Product description cannot exceed 3000 characters.";
      }


      // ------------------------------------------------------
      // QUANTITY
      // ------------------------------------------------------

      if (
        form.requiredQuantity === ""
        || !Number.isFinite(
          quantity
        )
        || quantity <= 0
      ) {
        errors.requiredQuantity =
          "Required quantity must be greater than zero.";
      }


      // ------------------------------------------------------
      // BUYING PRICE
      // ------------------------------------------------------

      if (
        form.buyingPrice === ""
        || !Number.isFinite(
          price
        )
        || price <= 0
      ) {
        errors.buyingPrice =
          "Buying price must be greater than zero.";
      }


      // ------------------------------------------------------
      // FULFILLMENT DATE
      // ------------------------------------------------------

      if (
        !form.fulfillmentDate
      ) {
        errors.fulfillmentDate =
          "Required fulfillment date is required.";

      } else if (
        form.fulfillmentDate <
        today
      ) {
        errors.fulfillmentDate =
          "Fulfillment date cannot be in the past.";

      } else if (
        form.applicationDeadline
        && form.fulfillmentDate <
          form.applicationDeadline
      ) {
        errors.fulfillmentDate =
          "Fulfillment date cannot be before the application deadline.";
      }


      // ------------------------------------------------------
      // FULFILLMENT METHOD
      // ------------------------------------------------------

      if (
        !FULFILLMENT_METHODS.some(
          (
            item
          ) =>
            item.value ===
            form.fulfillmentMethod
        )
      ) {
        errors.fulfillmentMethod =
          "Select a valid fulfillment method.";
      }


      // ------------------------------------------------------
      // BUYER PICKUP ADDRESS
      // ------------------------------------------------------

      if (
        form.fulfillmentMethod ===
        "buyer_pickup"
      ) {
        if (!address.province) {
          errors.province =
            "Province is required.";
        }


        if (!address.municipality) {
          errors.municipality =
            "Municipality / City is required.";
        }


        if (!address.barangay) {
          errors.barangay =
            "Barangay is required.";
        }


        if (
          !form.pickupStreetAddress.trim()
        ) {
          errors.pickupStreetAddress =
            "Street address is required.";
        }


        if (
          address.postalCode
          && !/^\d{4}$/.test(
            address.postalCode
          )
        ) {
          errors.postalCode =
            "Postal code must contain exactly 4 digits.";
        }
      }


      // ------------------------------------------------------
      // FARMER DELIVERY
      // ------------------------------------------------------

      if (
        form.fulfillmentMethod ===
        "farmer_delivery"
      ) {
        if (
          !businessAddress
          || !businessAddress.province
          || !businessAddress.municipality
          || !businessAddress.barangay
          || !businessAddress.street_address
        ) {
          errors.fulfillmentMethod =
            "Registered Miller business address is incomplete or unavailable.";
        }
      }


      // ------------------------------------------------------
      // TERMS / NOTES
      // ------------------------------------------------------

      if (
        form.proposedTerms.length >
        3000
      ) {
        errors.proposedTerms =
          "Proposed terms cannot exceed 3000 characters.";
      }


      if (
        form.additionalNotes.length >
        3000
      ) {
        errors.additionalNotes =
          "Additional notes cannot exceed 3000 characters.";
      }


      setFieldErrors(
        errors
      );


      return {
        valid:
          Object.keys(
            errors
          ).length === 0,

        finalVariety,

        finalGrade,
      };
    };


  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();


      if (isSaving) {
        return;
      }


      const validation =
        validateForm();


      if (
        !validation.valid
      ) {
        return;
      }


      const isFarmerDelivery =
        form.fulfillmentMethod ===
        "farmer_delivery";


      await onSubmit?.({
        application_deadline:
          form.applicationDeadline,


        product_type:
          form.productType,


        rice_variety:
          validation.finalVariety,


        product_image:
          form.productImage
          || null,


        product_description:
          form.productDescription.trim()
          || null,


        product_grade:
          validation.finalGrade
          || null,


        required_quantity_kg:
          Number(
            form.requiredQuantity
          ),


        buying_price_per_kg:
          Number(
            form.buyingPrice
          ),


        required_fulfillment_date:
          form.fulfillmentDate,


        partial_quantity_allowed:
          form.partialQuantityAllowed ===
          "true",


        price_negotiation_allowed:
          form.priceNegotiationAllowed ===
          "true",


        fulfillment_method:
          form.fulfillmentMethod,


        fulfillment_province:
          isFarmerDelivery
            ? businessAddress.province
            : address.province,


        fulfillment_municipality:
          isFarmerDelivery
            ? businessAddress.municipality
            : address.municipality,


        fulfillment_barangay:
          isFarmerDelivery
            ? businessAddress.barangay
            : address.barangay,


        fulfillment_postal_code:
          isFarmerDelivery
            ? businessAddress.postal_code
              || null
            : address.postalCode
              || null,


        fulfillment_street_address:
          isFarmerDelivery
            ? businessAddress.street_address
            : form.pickupStreetAddress.trim(),


        proposed_deal_terms:
          form.proposedTerms.trim()
          || null,


        additional_notes_to_farmers:
          form.additionalNotes.trim()
          || null,
      });
    };


  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear =
    () => {
      if (isSaving) {
        return;
      }


      setFieldErrors({});

      address.resetAddress();


      if (
        isEdit
        && posting
      ) {
        setForm(
          getPostingForm()
        );


        if (
          posting.fulfillment_method ===
          "buyer_pickup"
        ) {
          setPickupAddressSeed({
            province:
              posting.fulfillment_province
              || "",

            municipality:
              posting.fulfillment_municipality
              || "",

            barangay:
              posting.fulfillment_barangay
              || "",

            postalCode:
              posting.fulfillment_postal_code
              || "",
          });

        } else {
          setPickupAddressSeed(
            null
          );
        }


        return;
      }


      setForm({
        ...EMPTY_FORM,
      });

      setPickupAddressSeed(
        null
      );
    };


  // ==========================================================
  // CLOSE
  // ==========================================================

  const handleClose =
    () => {
      if (isSaving) {
        return;
      }


      setFieldErrors({});

      onClose?.();
    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[100000]
        flex
        items-center
        justify-center
        bg-slate-950/55
        p-3
        sm:p-4
      "
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="miller-create-posting-title"
        onSubmit={
          handleSubmit
        }
        className="
          flex
          max-h-[94vh]
          w-full
          max-w-5xl
          flex-col
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <div
          className="
            flex
            items-start
            justify-between
            gap-4
            border-b
            border-slate-200
            px-5
            py-4
            sm:px-6
            sm:py-5
          "
        >
          <div
            className="
              flex
              items-start
              gap-3
            "
          >
            <div
              className="
                rounded-xl
                bg-emerald-50
                p-2.5
                text-[#0B5D1E]
              "
            >
              <PlusCircle
                size={20}
              />
            </div>


            <div>
              <h2
                id="miller-create-posting-title"
                className="
                  text-lg
                  font-bold
                  text-slate-900
                "
              >
                {isEdit
                  ? "Edit Posting"
                  : "Create Posting"}
              </h2>

              <p
                className="
                  mt-0.5
                  text-sm
                  text-slate-500
                "
              >
                {isEdit
                  ? "Update this procurement opportunity."
                  : "Publish a procurement opportunity for GrainRise farmers."}
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
            aria-label="Close posting modal"
            className="
              rounded-lg
              p-2
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-600
              disabled:opacity-50
            "
          >
            <X size={20} />
          </button>
        </div>


        {/* ==================================================
            CONTENT
        ================================================== */}

        <div
          className="
            flex-1
            space-y-7
            overflow-y-auto
            p-5
            sm:p-6
          "
        >

          {/* ==================================================
              POSTING INFORMATION
          ================================================== */}

          <section
            className="
              rounded-2xl
              border
              border-slate-200
              bg-slate-50/60
              p-4
              sm:p-5
            "
          >
            <SectionTitle
              title="Posting Information"
              description="Posting ID and posting date are generated automatically by GrainRise."
            />


            <div
              className="
                grid
                gap-4
                sm:grid-cols-3
              "
            >
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Posting ID
                </p>

                <p className="mt-1 text-sm font-bold text-slate-800">
                  {posting?.posting_code
                    || "System-generated"}
                </p>
              </div>


              <div>
                <p className="text-xs font-medium text-slate-400">
                  Posting Date
                </p>

                <p className="mt-1 text-sm font-bold text-slate-800">
                  {posting?.created_at
                    ? new Date(
                        posting.created_at
                      ).toLocaleDateString(
                        "en-PH"
                      )
                    : "System-generated"}
                </p>
              </div>


              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Application Deadline *
                </span>

                <input
                  type="date"
                  min={today}
                  value={
                    form.applicationDeadline
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "applicationDeadline",
                        event.target.value
                      )
                  }
                  className={
                    inputClass(
                      "applicationDeadline"
                    )
                  }
                />

                <FieldError>
                  {fieldErrors.applicationDeadline}
                </FieldError>
              </label>
            </div>
          </section>


          {/* ==================================================
              PRODUCT REQUIREMENTS
          ================================================== */}

          <section>
            <SectionTitle
              title="Product Requirements"
              description="Specify the rice product that your Miller business needs to procure."
            />


            <div
              className="
                grid
                gap-4
                md:grid-cols-2
              "
            >
              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Product Type *
                </span>

                <select
                  value={
                    form.productType
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "productType",
                        event.target.value
                      )
                  }
                  className={
                    inputClass(
                      "productType"
                    )
                  }
                >
                  <option value="">
                    Select Product Type
                  </option>

                  {PRODUCT_TYPES.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
                      </option>
                    )
                  )}
                </select>

                <FieldError>
                  {fieldErrors.productType}
                </FieldError>
              </label>


              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Rice Variety *
                </span>

                <select
                  value={
                    form.riceVariety
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "riceVariety",
                        event.target.value
                      )
                  }
                  className={
                    inputClass(
                      "riceVariety"
                    )
                  }
                >
                  <option value="">
                    Select Rice Variety
                  </option>

                  {RICE_VARIETIES.map(
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

                <FieldError>
                  {fieldErrors.riceVariety}
                </FieldError>
              </label>


              {form.riceVariety ===
                "Other / Specify" && (
                <label>
                  <span className="text-xs font-semibold text-slate-700">
                    Specify Rice Variety *
                  </span>

                  <input
                    type="text"
                    maxLength={150}
                    value={
                      form.customVariety
                    }
                    onChange={
                      (
                        event
                      ) =>
                        updateField(
                          "customVariety",
                          event.target.value
                        )
                    }
                    className={
                      inputClass(
                        "customVariety"
                      )
                    }
                  />

                  <FieldError>
                    {fieldErrors.customVariety}
                  </FieldError>
                </label>
              )}


              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Grade / Classification
                </span>

                <select
                  value={
                    form.productGrade
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "productGrade",
                        event.target.value
                      )
                  }
                  className={
                    inputClass(
                      "productGrade"
                    )
                  }
                >
                  <option value="">
                    Select Grade
                  </option>

                  {PRODUCT_GRADES.map(
                    (
                      grade
                    ) => (
                      <option
                        key={
                          grade
                        }
                        value={
                          grade
                        }
                      >
                        {grade}
                      </option>
                    )
                  )}
                </select>
              </label>


              {form.productGrade ===
                "Other / Specify" && (
                <label>
                  <span className="text-xs font-semibold text-slate-700">
                    Specify Grade *
                  </span>

                  <input
                    type="text"
                    maxLength={150}
                    value={
                      form.customGrade
                    }
                    onChange={
                      (
                        event
                      ) =>
                        updateField(
                          "customGrade",
                          event.target.value
                        )
                    }
                    className={
                      inputClass(
                        "customGrade"
                      )
                    }
                  />

                  <FieldError>
                    {fieldErrors.customGrade}
                  </FieldError>
                </label>
              )}


              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Required Quantity (kg) *
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={
                    form.requiredQuantity
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "requiredQuantity",
                        event.target.value
                      )
                  }
                  className={
                    inputClass(
                      "requiredQuantity"
                    )
                  }
                />

                <FieldError>
                  {fieldErrors.requiredQuantity}
                </FieldError>
              </label>
            </div>


            <div
              className="
                mt-4
                grid
                gap-4
                md:grid-cols-2
              "
            >
              <div>
                <span className="text-xs font-semibold text-slate-700">
                  Product Photo
                </span>


                {!form.productImage ? (
                  <label
                    className="
                      mt-1.5
                      flex
                      min-h-40
                      cursor-pointer
                      flex-col
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-dashed
                      border-slate-300
                      bg-slate-50
                      px-4
                      text-center
                      transition
                      hover:border-[#0B5D1E]
                    "
                  >
                    <FileImage
                      size={26}
                      className="text-slate-400"
                    />

                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      Upload Product Photo
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      JPG, JPEG, PNG or WEBP • Max 2 MB
                    </p>

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        handleImageChange
                      }
                      className="hidden"
                    />
                  </label>

                ) : (
                  <div
                    className="
                      mt-1.5
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-50
                      p-3
                    "
                  >
                    <img
                      src={
                        form.productImage
                      }
                      alt="Product preview"
                      className="
                        h-40
                        w-full
                        rounded-lg
                        object-cover
                      "
                    />


                    <div className="mt-3 flex gap-2">
                      <label
                        className="
                          flex-1
                          cursor-pointer
                          rounded-lg
                          border
                          border-slate-200
                          bg-white
                          px-3
                          py-2
                          text-center
                          text-xs
                          font-medium
                          text-slate-600
                        "
                      >
                        Change Photo

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={
                            handleImageChange
                          }
                          className="hidden"
                        />
                      </label>


                      <button
                        type="button"
                        onClick={
                          removeImage
                        }
                        className="
                          inline-flex
                          items-center
                          gap-1.5
                          rounded-lg
                          border
                          border-red-200
                          bg-white
                          px-3
                          py-2
                          text-xs
                          font-medium
                          text-red-600
                          hover:bg-red-50
                        "
                      >
                        <Trash2 size={13} />

                        Remove
                      </button>
                    </div>
                  </div>
                )}


                <FieldError>
                  {fieldErrors.productImage}
                </FieldError>
              </div>


              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Product Description
                </span>

                <textarea
                  rows={7}
                  maxLength={3000}
                  value={
                    form.productDescription
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "productDescription",
                        event.target.value
                      )
                  }
                  className={`
                    ${inputClass(
                      "productDescription"
                    )}
                    resize-none
                  `}
                />

                <p className="mt-1 text-right text-[11px] text-slate-400">
                  {form.productDescription.length}/3000
                </p>
              </label>
            </div>
          </section>


          {/* ==================================================
              PROCUREMENT DETAILS
          ================================================== */}

          <section>
            <SectionTitle
              title="Procurement Details"
              description="Set your buying price, fulfillment date, and application rules."
            />


            <div
              className="
                grid
                gap-4
                md:grid-cols-2
              "
            >
              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Buying Price per kg *
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={
                    form.buyingPrice
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "buyingPrice",
                        event.target.value
                      )
                  }
                  className={
                    inputClass(
                      "buyingPrice"
                    )
                  }
                />

                <FieldError>
                  {fieldErrors.buyingPrice}
                </FieldError>
              </label>


              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Required Fulfillment Date *
                </span>

                <input
                  type="date"
                  min={
                    form.applicationDeadline
                    || today
                  }
                  value={
                    form.fulfillmentDate
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "fulfillmentDate",
                        event.target.value
                      )
                  }
                  className={
                    inputClass(
                      "fulfillmentDate"
                    )
                  }
                />

                <FieldError>
                  {fieldErrors.fulfillmentDate}
                </FieldError>
              </label>


              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Partial Quantity Allowed *
                </span>

                <select
                  value={
                    form.partialQuantityAllowed
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "partialQuantityAllowed",
                        event.target.value
                      )
                  }
                  className={
                    inputClass(
                      "partialQuantityAllowed"
                    )
                  }
                >
                  <option value="false">
                    Not Allowed
                  </option>

                  <option value="true">
                    Allowed
                  </option>
                </select>

                <p className="mt-1 text-[11px] text-slate-400">
                  Allow Farmers to apply for only part of the required quantity.
                </p>
              </label>


              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Price Negotiation
                </span>

                <select
                  value={
                    form.priceNegotiationAllowed
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateField(
                        "priceNegotiationAllowed",
                        event.target.value
                      )
                  }
                  className={
                    inputClass(
                      "priceNegotiationAllowed"
                    )
                  }
                >
                  <option value="false">
                    Not Allowed
                  </option>

                  <option value="true">
                    Allowed
                  </option>
                </select>

                <p className="mt-1 text-[11px] text-slate-400">
                  Allow Farmers to propose a different selling price.
                </p>
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
                      handleFulfillmentMethodChange(
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
          </section>


          {/* ==================================================
              BUYER PICKUP
          ================================================== */}

          {form.fulfillmentMethod ===
            "buyer_pickup" && (
            <section
              className="
                rounded-2xl
                border
                border-slate-200
                bg-slate-50/60
                p-4
                sm:p-5
              "
            >
              <SectionTitle
                title="Pickup Location"
                description="Select the pickup location using the same automatic Philippine address flow used during registration."
              />


              {(
                address.errors.provinces
                || address.errors.municipalities
                || address.errors.barangays
                || address.errors.postalCode
              ) && (
                <div
                  className="
                    mb-4
                    rounded-xl
                    border
                    border-amber-200
                    bg-amber-50
                    px-4
                    py-3
                    text-xs
                    text-amber-700
                  "
                >
                  {address.errors.provinces
                    || address.errors.municipalities
                    || address.errors.barangays
                    || address.errors.postalCode}
                </div>
              )}


              <div
                className="
                  grid
                  gap-4
                  md:grid-cols-2
                "
              >

                {/* PROVINCE */}

                <label>
                  <span className="text-xs font-semibold text-slate-700">
                    Province *
                  </span>

                  <select
                    value={
                      address.province
                    }
                    disabled={
                      address.loading.provinces
                    }
                    onChange={
                      (
                        event
                      ) =>
                        handleProvinceChange(
                          event.target.value
                        )
                    }
                    className={
                      inputClass(
                        "province"
                      )
                    }
                  >
                    <option value="">
                      {address.loading.provinces
                        ? "Loading Provinces..."
                        : "Select Province"}
                    </option>


                    {address.provinceOptions.map(
                      (
                        province
                      ) => (
                        <option
                          key={
                            province
                          }
                          value={
                            province
                          }
                        >
                          {province}
                        </option>
                      )
                    )}
                  </select>

                  <FieldError>
                    {fieldErrors.province}
                  </FieldError>
                </label>


                {/* MUNICIPALITY */}

                <label>
                  <span className="text-xs font-semibold text-slate-700">
                    Municipality / City *
                  </span>

                  <select
                    value={
                      address.municipality
                    }
                    disabled={
                      !address.province
                      || address.loading.municipalities
                    }
                    onChange={
                      (
                        event
                      ) =>
                        handleMunicipalityChange(
                          event.target.value
                        )
                    }
                    className={
                      inputClass(
                        "municipality"
                      )
                    }
                  >
                    <option value="">
                      {address.loading.municipalities
                        ? "Loading Municipalities..."
                        : address.province
                          ? "Select Municipality / City"
                          : "Select Province First"}
                    </option>


                    {address.municipalityOptions.map(
                      (
                        municipality
                      ) => (
                        <option
                          key={
                            municipality
                          }
                          value={
                            municipality
                          }
                        >
                          {municipality}
                        </option>
                      )
                    )}
                  </select>

                  <FieldError>
                    {fieldErrors.municipality}
                  </FieldError>
                </label>


                {/* BARANGAY */}

                <label>
                  <span className="text-xs font-semibold text-slate-700">
                    Barangay *
                  </span>

                  <select
                    value={
                      address.barangay
                    }
                    disabled={
                      !address.municipality
                      || address.loading.barangays
                    }
                    onChange={
                      (
                        event
                      ) =>
                        handleBarangayChange(
                          event.target.value
                        )
                    }
                    className={
                      inputClass(
                        "barangay"
                      )
                    }
                  >
                    <option value="">
                      {address.loading.barangays
                        ? "Loading Barangays..."
                        : address.municipality
                          ? "Select Barangay"
                          : "Select Municipality First"}
                    </option>


                    {address.barangayOptions.map(
                      (
                        barangay
                      ) => (
                        <option
                          key={
                            barangay
                          }
                          value={
                            barangay
                          }
                        >
                          {barangay}
                        </option>
                      )
                    )}
                  </select>

                  <FieldError>
                    {fieldErrors.barangay}
                  </FieldError>
                </label>


                {/* POSTAL CODE */}

                <label>
                  <span className="text-xs font-semibold text-slate-700">
                    Postal Code
                  </span>

                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={
                        address.postalCode
                      }
                      onChange={
                        handlePostalCodeChange
                      }
                      placeholder={
                        address.loading.postalCode
                          ? "Loading..."
                          : "Auto-filled"
                      }
                      className={
                        inputClass(
                          "postalCode"
                        )
                      }
                    />


                    {address.loading.postalCode && (
                      <Loader2
                        size={15}
                        className="
                          absolute
                          right-3
                          top-1/2
                          -translate-y-1/2
                          animate-spin
                          text-slate-400
                        "
                      />
                    )}
                  </div>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Automatically filled when available. You may correct it if necessary.
                  </p>

                  <FieldError>
                    {fieldErrors.postalCode}
                  </FieldError>
                </label>


                {/* STREET ADDRESS */}

                <label
                  className="
                    md:col-span-2
                  "
                >
                  <span className="text-xs font-semibold text-slate-700">
                    Street Address *
                  </span>

                  <input
                    type="text"
                    maxLength={255}
                    value={
                      form.pickupStreetAddress
                    }
                    onChange={
                      (
                        event
                      ) =>
                        updateField(
                          "pickupStreetAddress",
                          event.target.value
                        )
                    }
                    placeholder="House / Building / Street"
                    className={
                      inputClass(
                        "pickupStreetAddress"
                      )
                    }
                  />

                  <FieldError>
                    {fieldErrors.pickupStreetAddress}
                  </FieldError>
                </label>
              </div>
            </section>
          )}


          {/* ==================================================
              FARMER DELIVERY
          ================================================== */}

          {form.fulfillmentMethod ===
            "farmer_delivery" && (
            <section
              className="
                rounded-2xl
                border
                border-emerald-100
                bg-emerald-50/40
                p-4
                sm:p-5
              "
            >
              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >
                <div
                  className="
                    rounded-xl
                    bg-white
                    p-2.5
                    text-[#0B5D1E]
                    shadow-sm
                  "
                >
                  <Building2
                    size={19}
                  />
                </div>


                <div>
                  <h3
                    className="
                      text-sm
                      font-bold
                      text-slate-900
                    "
                  >
                    Miller Business Delivery Address
                  </h3>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-slate-500
                    "
                  >
                    The Farmer will deliver to the registered business address of this Miller account.
                  </p>
                </div>
              </div>


              {businessAddressLoading ? (
                <div
                  className="
                    mt-5
                    flex
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-emerald-100
                    bg-white
                    p-4
                    text-sm
                    text-slate-500
                  "
                >
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />

                  Loading Miller business address...
                </div>

              ) : businessAddress ? (
                <div
                  className="
                    mt-5
                    rounded-xl
                    border
                    border-emerald-100
                    bg-white
                    p-4
                  "
                >
                  <div
                    className="
                      flex
                      items-start
                      gap-3
                    "
                  >
                    <MapPin
                      size={18}
                      className="
                        mt-0.5
                        shrink-0
                        text-[#0B5D1E]
                      "
                    />


                    <div className="min-w-0">
                      <p
                        className="
                          text-sm
                          font-semibold
                          text-slate-900
                        "
                      >
                        {businessAddress.business_name
                          || "Registered Miller Business"}
                      </p>


                      {businessAddress.organization_name && (
                        <p
                          className="
                            mt-0.5
                            text-xs
                            text-slate-500
                          "
                        >
                          {businessAddress.organization_name}
                        </p>
                      )}


                      <p
                        className="
                          mt-2
                          break-words
                          text-sm
                          leading-6
                          text-slate-700
                        "
                      >
                        {getBusinessAddressText(
                          businessAddress
                        )
                        || "No registered business address available."}
                      </p>


                      <div
                        className="
                          mt-3
                          rounded-lg
                          bg-emerald-50
                          px-3
                          py-2
                          text-xs
                          leading-5
                          text-emerald-700
                        "
                      >
                        This address is automatically retrieved from the Miller business profile and cannot be edited from this Posting.
                      </div>
                    </div>
                  </div>
                </div>

              ) : (
                <div
                  className="
                    mt-5
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
                  {businessAddressError
                    || "Unable to retrieve the registered Miller business address."}
                </div>
              )}
            </section>
          )}


          {/* ==================================================
              TERMS & NOTES
          ================================================== */}

          <section>
            <SectionTitle
              title="Deal Terms & Notes"
              description="Provide additional procurement conditions or information for Farmers."
            />


            <div
              className="
                grid
                gap-4
                md:grid-cols-2
              "
            >
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
                  className={`
                    ${inputClass(
                      "proposedTerms"
                    )}
                    resize-none
                  `}
                />

                <p className="mt-1 text-right text-[11px] text-slate-400">
                  {form.proposedTerms.length}/3000
                </p>
              </label>


              <label>
                <span className="text-xs font-semibold text-slate-700">
                  Additional Notes to Farmers
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
                  className={`
                    ${inputClass(
                      "additionalNotes"
                    )}
                    resize-none
                  `}
                />

                <p className="mt-1 text-right text-[11px] text-slate-400">
                  {form.additionalNotes.length}/3000
                </p>
              </label>
            </div>
          </section>


          {/* ==================================================
              API ERROR
          ================================================== */}

          {error && (
            <div
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-sm
                font-medium
                text-red-700
              "
            >
              {error}
            </div>
          )}
        </div>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <div
          className="
            flex
            flex-col-reverse
            gap-2
            border-t
            border-slate-200
            bg-white
            px-5
            py-4
            sm:flex-row
            sm:justify-end
            sm:px-6
          "
        >
          <button
            type="button"
            onClick={
              handleClear
            }
            disabled={
              isSaving
            }
            className="
              rounded-xl
              border
              border-slate-200
              px-4
              py-2.5
              text-sm
              font-normal
              text-slate-600
              transition
              hover:bg-slate-50
              disabled:opacity-50
            "
          >
            Clear
          </button>


          <button
            type="submit"
            disabled={
              isSaving
              || (
                form.fulfillmentMethod ===
                "farmer_delivery"
                && businessAddressLoading
              )
            }
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#0B5D1E]
              px-5
              py-2.5
              text-sm
              font-normal
              text-white
              transition
              hover:bg-[#094d19]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {isSaving && (
              <Loader2
                size={16}
                className="animate-spin"
              />
            )}


            {isSaving
              ? (
                  isEdit
                    ? "Saving Changes..."
                    : "Publishing..."
                )
              : (
                  isEdit
                    ? "Save Posting Changes"
                    : "Publish Posting"
                )}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}