import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  Banknote,
  CreditCard,
  Loader2,
  Minus,
  PackageOpen,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";

import TransactionSuccessModal from "../../Components/Modals/TransactionSuccessModal";

import PrintableReceiptModal from "../../Components/Modals/PrintableReceiptModal";

import useFarmerPointOfSale from "../../Components/hooks/Farmer/useFarmerPointOfSale";


// ============================================================
// GRAINRISE
// FARMER > POINT OF SALE
// ============================================================
//
// FLOW:
//
// Farmer Inventory
//      ↓
// POS
//      ↓
// Checkout
//      ↓
// Backend:
//   - validates ownership
//   - locks Inventory
//   - validates available stock
//   - saves POS transaction
//   - deducts sold stock
//      ↓
// Transaction Success Modal
//      ↓
// Confirm
//      ↓
// Printable Receipt Modal
//
//
// IMPORTANT:
//
// - Buyer / Payee is optional.
// - Quantity cannot exceed available stock.
// - Out-of-stock products do not appear in POS.
// - Selling price comes from Farmer Inventory.
// - Farmer ownership comes from JWT/session.
// - No farmer_user_id is supplied by frontend.
// - No automatic VAT.
// - Shared modal components are rendered through portal.
// ============================================================


// ============================================================
// FORMAT CURRENCY
// ============================================================

const formatCurrency = (
  value
) => {

  return Number(
    value || 0
  ).toLocaleString(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

};


// ============================================================
// FORMAT QUANTITY
// ============================================================

const formatQuantity = (
  value
) => {

  return Number(
    value || 0
  ).toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );

};


// ============================================================
// FORMAT PRODUCT TYPE
// ============================================================

const formatProductType = (
  value
) => {

  switch (value) {

    case "unmilled_palay":
      return "Unmilled Palay";

    case "milled_rice":
      return "Milled Rice";

    default:
      return value || "Product";

  }

};


// ============================================================
// PAGE
// ============================================================

export default function FarmerPointOfSale() {

  // =========================================================
  // API HOOK
  // =========================================================

  const {
    products,
    lastTransaction,

    isLoadingProducts,
    isCheckingOut,

    error: apiError,

    loadProducts,
    checkout,

    clearError,
    clearLastTransaction,
  } = useFarmerPointOfSale();


  // =========================================================
  // SEARCH
  // =========================================================

  const [
    search,
    setSearch,
  ] = useState(
    ""
  );


  // =========================================================
  // CART
  // =========================================================

  const [
    cart,
    setCart,
  ] = useState(
    []
  );


  // =========================================================
  // BUYER
  // =========================================================

  const [
    buyerName,
    setBuyerName,
  ] = useState(
    ""
  );


  // =========================================================
  // PAYMENT
  // =========================================================

  const [
    payment,
    setPayment,
  ] = useState(
    "cash"
  );


  const [
    amountReceived,
    setAmountReceived,
  ] = useState(
    ""
  );


  // =========================================================
  // PAGE ERROR
  // =========================================================

  const [
    pageError,
    setPageError,
  ] = useState(
    ""
  );


  // =========================================================
  // MODALS
  // =========================================================

  const [
    showSuccessModal,
    setShowSuccessModal,
  ] = useState(
    false
  );


  const [
    showReceiptModal,
    setShowReceiptModal,
  ] = useState(
    false
  );


  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  useEffect(
    () => {

      const timer =
        window.setTimeout(
          async () => {

            try {

              await loadProducts(
                search
              );

            } catch {

              // Hook already stores API error.

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
      loadProducts,
      search,
    ]
  );


  // =========================================================
  // CART TOTAL
  // =========================================================

  const total =
    useMemo(
      () => {

        return cart.reduce(
          (
            sum,
            item
          ) => {

            const quantity =
              Number(
                item.quantity_kg ||
                0
              );


            const price =
              Number(
                item.selling_price_per_kg ||
                0
              );


            return (
              sum +
              (
                quantity *
                price
              )
            );

          },
          0
        );

      },
      [
        cart,
      ]
    );


  // =========================================================
  // CHANGE
  // =========================================================

  const calculatedChange =
    useMemo(
      () => {

        if (
          payment !== "cash"
        ) {
          return null;
        }


        const received =
          Number(
            amountReceived
          );


        if (
          !Number.isFinite(
            received
          )
          ||
          received < total
        ) {
          return 0;
        }


        return (
          received -
          total
        );

      },
      [
        amountReceived,
        payment,
        total,
      ]
    );


  // =========================================================
  // RECEIPT ITEMS
  //
  // Convert Farmer-specific checkout result into the
  // universal PrintableReceiptModal item format.
  // =========================================================

  const receiptItems =
    useMemo(
      () => {

        if (
          !Array.isArray(
            lastTransaction?.items
          )
        ) {
          return [];
        }


        return lastTransaction.items.map(
          (
            item
          ) => ({
            id:
              item.transaction_id,

            name:
              item.rice_variety ||
              "Product",

            description:
              item.product_grade ||
              "",

            quantity:
              Number(
                item.quantity_sold_kg ||
                0
              ),

            unit:
              "kg",

            unitPrice:
              Number(
                item.selling_price_per_kg ||
                0
              ),

            amount:
              Number(
                item.line_total_amount ||
                0
              ),
          })
        );

      },
      [
        lastTransaction,
      ]
    );


  // =========================================================
  // RECEIPT DATE
  // =========================================================

  const receiptDate =
    useMemo(
      () => {

        return (
          lastTransaction
            ?.items
            ?.[0]
            ?.created_at ||
          null
        );

      },
      [
        lastTransaction,
      ]
    );


  // =========================================================
  // ADD TO CART
  // =========================================================

  const addToCart = (
    product
  ) => {

    clearError();

    setPageError(
      ""
    );


    const available =
      Number(
        product.available_quantity_kg ||
        0
      );


    // =======================================================
    // OUT OF STOCK
    // =======================================================

    if (
      available <= 0
      ||
      product.stock_level ===
        "out_of_stock"
    ) {

      setPageError(
        "This product is already out of stock."
      );

      return;

    }


    setCart(
      (
        previous
      ) => {

        const existing =
          previous.find(
            (
              item
            ) =>
              String(
                item.farm_product_id
              ) ===
              String(
                product.farm_product_id
              )
          );


        // ===================================================
        // ALREADY IN CART
        // ===================================================

        if (existing) {

          const currentQuantity =
            Number(
              existing.quantity_kg ||
              0
            );


          // =================================================
          // MAXIMUM ALREADY REACHED
          // =================================================

          if (
            currentQuantity >=
            available
          ) {

            setPageError(
              (
                `Only ${formatQuantity(
                  available
                )} kg of ` +
                `${product.rice_variety} is available.`
              )
            );


            return previous;

          }


          return previous.map(
            (
              item
            ) => {

              if (
                String(
                  item.farm_product_id
                ) !==
                String(
                  product.farm_product_id
                )
              ) {

                return item;

              }


              return {
                ...item,

                quantity_kg:
                  Math.min(
                    currentQuantity + 1,
                    available
                  ),
              };

            }
          );

        }


        // ===================================================
        // NEW CART ITEM
        // ===================================================

        return [
          ...previous,

          {
            ...product,

            quantity_kg:
              Math.min(
                1,
                available
              ),
          },
        ];

      }
    );

  };


  // =========================================================
  // SET ITEM QUANTITY
  // =========================================================

  const setItemQuantity = (
    productId,
    value
  ) => {

    clearError();

    setPageError(
      ""
    );


    setCart(
      (
        previous
      ) => {

        return previous
          .map(
            (
              item
            ) => {

              if (
                String(
                  item.farm_product_id
                ) !==
                String(
                  productId
                )
              ) {

                return item;

              }


              const available =
                Number(
                  item.available_quantity_kg ||
                  0
                );


              let quantity =
                Number(
                  value
                );


              if (
                !Number.isFinite(
                  quantity
                )
              ) {

                quantity = 0;

              }


              // =============================================
              // ZERO REMOVES ITEM
              // =============================================

              if (
                quantity <= 0
              ) {

                return {
                  ...item,

                  quantity_kg: 0,
                };

              }


              // =============================================
              // NEVER EXCEED AVAILABLE STOCK
              // =============================================

              if (
                quantity >
                available
              ) {

                setPageError(
                  (
                    `Only ${formatQuantity(
                      available
                    )} kg of ` +
                    `${item.rice_variety} is available.`
                  )
                );


                quantity =
                  available;

              }


              return {
                ...item,

                quantity_kg:
                  quantity,
              };

            }
          )
          .filter(
            (
              item
            ) =>
              Number(
                item.quantity_kg
              ) > 0
          );

      }
    );

  };


  // =========================================================
  // UPDATE ITEM QUANTITY
  // =========================================================

  const updateQuantity = (
    productId,
    delta
  ) => {

    const item =
      cart.find(
        (
          current
        ) =>
          String(
            current.farm_product_id
          ) ===
          String(
            productId
          )
      );


    if (!item) {
      return;
    }


    const currentQuantity =
      Number(
        item.quantity_kg ||
        0
      );


    const available =
      Number(
        item.available_quantity_kg ||
        0
      );


    const nextQuantity =
      currentQuantity +
      delta;


    if (
      delta > 0
      &&
      nextQuantity >
        available
    ) {

      setPageError(
        (
          `Only ${formatQuantity(
            available
          )} kg of ` +
          `${item.rice_variety} is available.`
        )
      );


      return;

    }


    setItemQuantity(
      productId,
      nextQuantity
    );

  };


  // =========================================================
  // REMOVE FROM CART
  // =========================================================

  const removeFromCart = (
    productId
  ) => {

    setCart(
      (
        previous
      ) =>
        previous.filter(
          (
            item
          ) =>
            String(
              item.farm_product_id
            ) !==
            String(
              productId
            )
        )
    );


    setPageError(
      ""
    );

  };


  // =========================================================
  // PAYMENT METHOD
  // =========================================================

  const handlePaymentChange = (
    value
  ) => {

    setPayment(
      value
    );


    setPageError(
      ""
    );


    clearError();


    if (
      value === "card"
    ) {

      setAmountReceived(
        ""
      );

    }

  };


  // =========================================================
  // CHECKOUT
  // =========================================================

  const handleCheckout =
    async () => {

      clearError();

      setPageError(
        ""
      );


      // =====================================================
      // CART REQUIRED
      // =====================================================

      if (
        cart.length === 0
      ) {

        setPageError(
          "Add at least one product before checkout."
        );

        return;

      }


      // =====================================================
      // LOCAL QUANTITY VALIDATION
      // =====================================================

      for (
        const item
        of cart
      ) {

        const quantity =
          Number(
            item.quantity_kg ||
            0
          );


        const available =
          Number(
            item.available_quantity_kg ||
            0
          );


        if (
          quantity <= 0
        ) {

          setPageError(
            "Product quantity must be greater than zero."
          );

          return;

        }


        if (
          quantity >
            available
        ) {

          setPageError(
            (
              `Only ${formatQuantity(
                available
              )} kg of ` +
              `${item.rice_variety} is available.`
            )
          );


          return;

        }

      }


      // =====================================================
      // CASH VALIDATION
      // =====================================================

      if (
        payment === "cash"
      ) {

        const received =
          Number(
            amountReceived
          );


        if (
          !Number.isFinite(
            received
          )
          ||
          received < 0
        ) {

          setPageError(
            "Enter a valid amount received."
          );

          return;

        }


        if (
          received <
            total
        ) {

          setPageError(
            "Amount received is less than the total amount."
          );

          return;

        }

      }


      // =====================================================
      // COMPLETE BACKEND CHECKOUT
      // =====================================================

      try {

        await checkout(
          {
            buyerName,

            paymentMethod:
              payment,

            amountReceived:
              payment === "cash"
                ? Number(
                    amountReceived
                  )
                : null,

            items:
              cart.map(
                (
                  item
                ) => ({
                  farm_product_id:
                    item.farm_product_id,

                  quantity_kg:
                    Number(
                      item.quantity_kg
                    ),
                })
              ),
          }
        );


        // ===================================================
        // SUCCESS CONFIRMATION
        // ===================================================

        setShowSuccessModal(
          true
        );


      } catch (
        err
      ) {

        setPageError(
          (
            err?.data?.message ||
            err?.message ||
            "Unable to complete transaction."
          )
        );

      }

    };


  // =========================================================
  // RESET COMPLETED CHECKOUT FORM
  // =========================================================

  const resetCheckoutForm =
    () => {

      setCart(
        []
      );


      setBuyerName(
        ""
      );


      setPayment(
        "cash"
      );


      setAmountReceived(
        ""
      );


      setPageError(
        ""
      );


      clearError();

    };


  // =========================================================
  // SUCCESS MODAL > CONFIRM
  // =========================================================

  const handleConfirmSuccess =
    () => {

      setShowSuccessModal(
        false
      );


      resetCheckoutForm();


      window.setTimeout(
        () => {

          setShowReceiptModal(
            true
          );

        },
        80
      );

    };


  // =========================================================
  // SUCCESS MODAL > X
  // =========================================================

  const handleDismissSuccess =
    async () => {

      setShowSuccessModal(
        false
      );


      resetCheckoutForm();


      clearLastTransaction();


      try {

        await loadProducts(
          search
        );

      } catch {

        // Hook already stores API error.

      }

    };


  // =========================================================
  // CLOSE RECEIPT
  // =========================================================

  const handleCloseReceipt =
    async () => {

      setShowReceiptModal(
        false
      );


      clearLastTransaction();


      try {

        await loadProducts(
          search
        );

      } catch {

        // Hook already stores API error.

      }

    };


  // =========================================================
  // DISPLAY ERROR
  // =========================================================

  const displayError =
    pageError ||
    apiError;


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div className="space-y-4">

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
                "Point of Sale",
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
          Point of Sale
        </h2>


        <p className="text-sm text-slate-500">
          Record face-to-face sales using your available Farmer Inventory.
        </p>

      </div>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {displayError && (

        <div
          className="
            flex
            items-start
            gap-3
            rounded-xl
            border
            border-red-200
            bg-red-50
            px-4
            py-3
          "
        >

          <AlertCircle
            size={18}
            className="
              mt-0.5
              shrink-0
              text-red-600
            "
          />


          <p
            className="
              text-sm
              font-medium
              text-red-700
            "
          >
            {displayError}
          </p>

        </div>

      )}


      {/* =====================================================
          MAIN POS
      ====================================================== */}

      <div className="flex flex-col gap-5 lg:flex-row">

        {/* ===================================================
            PRODUCTS
        ==================================================== */}

        <div className="flex-1 space-y-4">

          {/* =================================================
              SEARCH
          ================================================== */}

          <div className="relative">

            <Search
              size={16}
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-gray-400
              "
            />


            <input
              type="text"
              value={search}
              onChange={
                (
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
              }
              placeholder="Search product, rice variety, grade..."
              className="
                w-full
                rounded-xl
                border
                border-gray-200
                py-2.5
                pl-9
                pr-4
                text-sm
                outline-none
                focus:border-green-600
                focus:ring-1
                focus:ring-green-600
              "
            />

          </div>


          {/* =================================================
              LOADING
          ================================================== */}

          {isLoadingProducts ? (

            <div
              className="
                flex
                min-h-52
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
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
                  size={18}
                  className="animate-spin"
                />

                Loading available products...

              </div>

            </div>

          ) : products.length === 0 ? (

            /* ===============================================
               EMPTY
            ================================================ */

            <div
              className="
                flex
                min-h-52
                flex-col
                items-center
                justify-center
                rounded-xl
                border
                border-dashed
                border-slate-300
                bg-white
                px-6
                text-center
              "
            >

              <div
                className="
                  mb-3
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-full
                  bg-slate-100
                "
              >

                <PackageOpen
                  size={22}
                  className="text-slate-500"
                />

              </div>


              <p className="font-semibold text-slate-800">
                No products available for POS
              </p>


              <p
                className="
                  mt-1
                  max-w-sm
                  text-sm
                  text-slate-500
                "
              >
                Only active Inventory products with available stock and a selling price appear here.
              </p>

            </div>

          ) : (

            /* ===============================================
               PRODUCT GRID
            ================================================ */

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">

              {products.map(
                (
                  product
                ) => {

                  const available =
                    Number(
                      product.available_quantity_kg ||
                      0
                    );


                  const cartItem =
                    cart.find(
                      (
                        item
                      ) =>
                        String(
                          item.farm_product_id
                        ) ===
                        String(
                          product.farm_product_id
                        )
                    );


                  const cartQuantity =
                    Number(
                      cartItem?.quantity_kg ||
                      0
                    );


                  const maximumReached =
                    cartQuantity >=
                    available;


                  return (

                    <button
                      key={
                        product.farm_product_id
                      }
                      type="button"
                      onClick={
                        () =>
                          addToCart(
                            product
                          )
                      }
                      disabled={
                        maximumReached
                      }
                      className="
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        p-4
                        text-left
                        transition-all
                        hover:border-green-400
                        hover:shadow-md
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    >

                      {/* =====================================
                          IMAGE
                      ====================================== */}

                      <div
                        className="
                          mb-3
                          flex
                          h-20
                          w-full
                          items-center
                          justify-center
                          overflow-hidden
                          rounded-lg
                          bg-green-50
                        "
                      >

                        {product.product_image ? (

                          <img
                            src={
                              product.product_image
                            }
                            alt={
                              product.rice_variety
                            }
                            className="
                              h-full
                              w-full
                              object-cover
                            "
                          />

                        ) : (

                          <PackageOpen
                            size={30}
                            className="text-green-700"
                          />

                        )}

                      </div>


                      {/* =====================================
                          NAME
                      ====================================== */}

                      <p
                        className="
                          text-sm
                          font-semibold
                          leading-snug
                          text-gray-900
                        "
                      >
                        {product.rice_variety}
                      </p>


                      <p className="mt-0.5 text-xs text-gray-500">

                        {formatProductType(
                          product.product_type
                        )}

                        {product.product_grade
                          ? ` · ${product.product_grade}`
                          : ""}

                      </p>


                      {/* =====================================
                          CODE
                      ====================================== */}

                      {product.product_code && (

                        <p className="mt-1 text-[10px] text-slate-400">
                          {product.product_code}
                        </p>

                      )}


                      {/* =====================================
                          PRICE + STOCK
                      ====================================== */}

                      <div
                        className="
                          mt-2
                          flex
                          items-end
                          justify-between
                          gap-2
                        "
                      >

                        <div>

                          <span
                            className="
                              text-sm
                              font-bold
                              text-green-700
                            "
                          >

                            {formatCurrency(
                              product.selling_price_per_kg
                            )}

                          </span>


                          <span className="text-[10px] text-gray-400">
                            /kg
                          </span>

                        </div>


                        <span
                          className="
                            text-right
                            text-[10px]
                            text-gray-500
                          "
                        >

                          {formatQuantity(
                            available
                          )}{" "}
                          kg available

                        </span>

                      </div>

                    </button>

                  );
                }
              )}

            </div>

          )}

        </div>


        {/* ===================================================
            ORDER SUMMARY
        ==================================================== */}

        <div
          className="
            h-fit
            w-full
            rounded-2xl
            border
            border-slate-200
            bg-white
            shadow-sm
            lg:sticky
            lg:top-4
            lg:w-96
          "
        >

          {/* =================================================
              CART HEADER
          ================================================== */}

          <div
            className="
              flex
              items-center
              gap-2
              border-b
              border-slate-100
              px-5
              py-4
            "
          >

            <ShoppingCart
              size={18}
              className="text-green-700"
            />


            <h3 className="font-bold text-gray-900">
              Order Summary
            </h3>


            {cart.length > 0 && (

              <span
                className="
                  ml-auto
                  rounded-full
                  bg-green-700
                  px-2
                  py-0.5
                  text-[10px]
                  font-bold
                  text-white
                "
              >
                {cart.length}
              </span>

            )}

          </div>


          {/* =================================================
              BUYER / PAYEE
          ================================================== */}

          <div
            className="
              border-b
              border-slate-100
              px-5
              py-4
            "
          >

            <label
              className="
                mb-1.5
                block
                text-xs
                font-semibold
                uppercase
                tracking-wider
                text-gray-500
              "
            >

              Buyer / Payee

              <span
                className="
                  ml-1
                  font-normal
                  normal-case
                  text-gray-400
                "
              >
                (Optional)
              </span>

            </label>


            <input
              type="text"
              value={buyerName}
              onChange={
                (
                  event
                ) =>
                  setBuyerName(
                    event.target.value
                  )
              }
              maxLength={200}
              placeholder="Enter buyer name"
              className="
                w-full
                rounded-xl
                border
                border-gray-200
                px-3
                py-2.5
                text-sm
                outline-none
                focus:border-green-600
                focus:ring-1
                focus:ring-green-600
              "
            />

          </div>


          {/* =================================================
              CART ITEMS
          ================================================== */}

          <div
            className="
              max-h-72
              space-y-4
              overflow-y-auto
              px-5
              py-4
            "
          >

            {cart.length === 0 ? (

              <p
                className="
                  py-8
                  text-center
                  text-sm
                  text-gray-400
                "
              >
                No items yet. Select a product to add.
              </p>

            ) : (

              cart.map(
                (
                  item
                ) => {

                  const available =
                    Number(
                      item.available_quantity_kg ||
                      0
                    );


                  const quantity =
                    Number(
                      item.quantity_kg ||
                      0
                    );


                  const itemTotal =
                    quantity *
                    Number(
                      item.selling_price_per_kg ||
                      0
                    );


                  return (

                    <div
                      key={
                        item.farm_product_id
                      }
                      className="space-y-2"
                    >

                      {/* =====================================
                          ITEM HEADER
                      ====================================== */}

                      <div className="flex items-start gap-3">

                        <div className="min-w-0 flex-1">

                          <p
                            className="
                              truncate
                              text-sm
                              font-semibold
                              text-gray-800
                            "
                          >
                            {item.rice_variety}
                          </p>


                          <p className="text-xs text-gray-500">

                            {formatCurrency(
                              item.selling_price_per_kg
                            )}
                            /kg

                          </p>


                          <p className="mt-0.5 text-[10px] text-gray-400">

                            Max:{" "}

                            {formatQuantity(
                              available
                            )}{" "}
                            kg

                          </p>

                        </div>


                        <button
                          type="button"
                          onClick={
                            () =>
                              removeFromCart(
                                item.farm_product_id
                              )
                          }
                          title="Remove product"
                          className="
                            mt-1
                            text-gray-300
                            transition-colors
                            hover:text-red-500
                          "
                        >

                          <Trash2
                            size={15}
                          />

                        </button>

                      </div>


                      {/* =====================================
                          QUANTITY
                      ====================================== */}

                      <div className="flex items-center gap-2">

                        <button
                          type="button"
                          onClick={
                            () =>
                              updateQuantity(
                                item.farm_product_id,
                                -1
                              )
                          }
                          className="
                            flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-lg
                            border
                            border-gray-200
                            text-gray-600
                            transition-colors
                            hover:border-red-300
                            hover:text-red-500
                          "
                        >

                          <Minus
                            size={13}
                          />

                        </button>


                        <div className="relative flex-1">

                          <input
                            type="number"
                            min="0.01"
                            max={
                              available
                            }
                            step="0.01"
                            value={
                              item.quantity_kg
                            }
                            onChange={
                              (
                                event
                              ) =>
                                setItemQuantity(
                                  item.farm_product_id,
                                  event.target.value
                                )
                            }
                            className="
                              w-full
                              rounded-lg
                              border
                              border-gray-200
                              px-2
                              py-1.5
                              pr-8
                              text-center
                              text-sm
                              font-semibold
                              outline-none
                              focus:border-green-600
                              focus:ring-1
                              focus:ring-green-600
                            "
                          />


                          <span
                            className="
                              pointer-events-none
                              absolute
                              right-2
                              top-1/2
                              -translate-y-1/2
                              text-[10px]
                              text-gray-400
                            "
                          >
                            kg
                          </span>

                        </div>


                        <button
                          type="button"
                          onClick={
                            () =>
                              updateQuantity(
                                item.farm_product_id,
                                1
                              )
                          }
                          disabled={
                            quantity >=
                            available
                          }
                          className="
                            flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-lg
                            border
                            border-gray-200
                            text-gray-600
                            transition-colors
                            hover:border-green-400
                            hover:text-green-700
                            disabled:cursor-not-allowed
                            disabled:opacity-40
                          "
                        >

                          <Plus
                            size={13}
                          />

                        </button>

                      </div>


                      {/* =====================================
                          ITEM TOTAL
                      ====================================== */}

                      <div className="flex justify-between text-xs">

                        <span className="text-gray-500">
                          Item Total
                        </span>


                        <span className="font-semibold text-gray-800">

                          {formatCurrency(
                            itemTotal
                          )}

                        </span>

                      </div>

                    </div>

                  );
                }
              )

            )}

          </div>


          {/* =================================================
              TOTAL
          ================================================== */}

          <div
            className="
              border-t
              border-slate-100
              px-5
              py-4
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                text-base
                font-bold
                text-gray-900
              "
            >

              <span>
                Total
              </span>


              <span className="text-green-700">

                {formatCurrency(
                  total
                )}

              </span>

            </div>

          </div>


          {/* =================================================
              PAYMENT
          ================================================== */}

          <div className="space-y-3 px-5 pb-5">

            <p
              className="
                text-xs
                font-semibold
                uppercase
                tracking-wider
                text-gray-500
              "
            >
              Payment Method
            </p>


            <div className="flex gap-2">

              {/* =============================================
                  CASH
              ============================================== */}

              <button
                type="button"
                onClick={
                  () =>
                    handlePaymentChange(
                      "cash"
                    )
                }
                className={`
                  flex
                  flex-1
                  items-center
                  justify-center
                  gap-1.5
                  rounded-xl
                  border
                  py-2
                  text-sm
                  font-semibold
                  transition-colors

                  ${
                    payment === "cash"
                      ? `
                        border-green-700
                        bg-green-700
                        text-white
                      `
                      : `
                        border-gray-200
                        text-gray-600
                        hover:border-green-300
                      `
                  }
                `}
              >

                <Banknote
                  size={14}
                />

                Cash

              </button>


              {/* =============================================
                  CARD
              ============================================== */}

              <button
                type="button"
                onClick={
                  () =>
                    handlePaymentChange(
                      "card"
                    )
                }
                className={`
                  flex
                  flex-1
                  items-center
                  justify-center
                  gap-1.5
                  rounded-xl
                  border
                  py-2
                  text-sm
                  font-semibold
                  transition-colors

                  ${
                    payment === "card"
                      ? `
                        border-green-700
                        bg-green-700
                        text-white
                      `
                      : `
                        border-gray-200
                        text-gray-600
                        hover:border-green-300
                      `
                  }
                `}
              >

                <CreditCard
                  size={14}
                />

                Card

              </button>

            </div>


            {/* ===============================================
                CASH DETAILS
            ================================================ */}

            {payment === "cash" && (

              <div className="space-y-2">

                <label
                  className="
                    block
                    text-xs
                    font-semibold
                    text-gray-500
                  "
                >
                  Amount Received
                </label>


                <div className="relative">

                  <span
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-sm
                      text-gray-400
                    "
                  >
                    ₱
                  </span>


                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      amountReceived
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setAmountReceived(
                          event.target.value
                        )
                    }
                    placeholder="0.00"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-gray-200
                      py-2.5
                      pl-8
                      pr-3
                      text-sm
                      outline-none
                      focus:border-green-600
                      focus:ring-1
                      focus:ring-green-600
                    "
                  />

                </div>


                <div className="flex justify-between text-sm">

                  <span className="text-gray-500">
                    Change
                  </span>


                  <span className="font-semibold text-gray-800">

                    {formatCurrency(
                      calculatedChange
                    )}

                  </span>

                </div>

              </div>

            )}


            {/* ===============================================
                CHARGE
            ================================================ */}

            <button
              type="button"
              onClick={
                handleCheckout
              }
              disabled={
                cart.length === 0
                ||
                isCheckingOut
              }
              className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-green-700
                py-3
                font-bold
                text-white
                transition-colors
                hover:bg-green-800
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >

              {isCheckingOut ? (

                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />

                  Processing...
                </>

              ) : (

                <>
                  <Receipt
                    size={16}
                  />

                  Charge{" "}

                  {formatCurrency(
                    total
                  )}
                </>

              )}

            </button>

          </div>

        </div>

      </div>


      {/* =====================================================
          TRANSACTION SUCCESS MODAL
      ====================================================== */}

      <TransactionSuccessModal
        open={
          showSuccessModal
        }
        title="Transaction Successful"
        message={
          (
            "The sale has been recorded successfully " +
            "and the Inventory stock has been updated."
          )
        }
        transactionId={
          lastTransaction
            ?.transaction_code ||
          ""
        }
        totalAmount={
          lastTransaction
            ?.total_amount ||
          0
        }
        confirmLabel="Confirm"
        onConfirm={
          handleConfirmSuccess
        }
        onClose={
          handleDismissSuccess
        }
      />


      {/* =====================================================
          PRINTABLE RECEIPT MODAL
      ====================================================== */}

      <PrintableReceiptModal
        open={
          showReceiptModal
        }
        receiptTitle="Sales Receipt"
        sellerLabel="Farmer Point of Sale"
        transactionId={
          lastTransaction
            ?.transaction_code ||
          ""
        }
        transactionDate={
          receiptDate
        }
        buyerPayee={
          lastTransaction
            ?.buyer_name ||
          ""
        }
        paymentMethod={
          lastTransaction
            ?.payment_method ||
          ""
        }
        items={
          receiptItems
        }
        totalAmount={
          lastTransaction
            ?.total_amount ||
          0
        }
        amountReceived={
          lastTransaction
            ?.payment_method ===
            "cash"
            ? lastTransaction
                ?.amount_received
            : null
        }
        changeAmount={
          lastTransaction
            ?.payment_method ===
            "cash"
            ? lastTransaction
                ?.change_amount
            : null
        }
        showPaymentDetails={
          lastTransaction
            ?.payment_method ===
          "cash"
        }
        footerMessage={
          (
            "This receipt represents a completed " +
            "Farmer face-to-face Point of Sale " +
            "transaction recorded in GrainRise."
          )
        }
        onClose={
          handleCloseReceipt
        }
      />

    </div>
  );
}