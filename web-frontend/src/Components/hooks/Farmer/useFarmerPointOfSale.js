import {
  useCallback,
  useState,
} from "react";

import useApi from "../useApi";


// ============================================================
// GRAINRISE
// FARMER > POINT OF SALE
// HOOK
// ============================================================
//
// PURPOSE:
//
// Connects Farmer POS frontend to:
//
// GET
// /api/farmer/point-of-sale/products/
//
// POST
// /api/farmer/point-of-sale/checkout/
//
//
// SECURITY:
//
// farmer_user_id is NEVER sent by this hook.
//
// The backend gets Farmer ownership from the authenticated
// Farmer JWT/session:
//
// request.grainrise_farmer_id
//
// ============================================================


// ============================================================
// RESPONSE HELPERS
// ============================================================

const unwrapData = (
  response
) => {
  if (
    response &&
    typeof response === "object" &&
    Object.prototype.hasOwnProperty.call(
      response,
      "data"
    )
  ) {
    return response.data;
  }

  return response;
};


const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.data?.message ||
    error?.message ||
    fallback
  );
};


// ============================================================
// NUMBER NORMALIZER
// ============================================================

const toNumber = (
  value,
  fallback = 0
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const parsed = Number(
    value
  );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : fallback;
};


// ============================================================
// PRODUCT NORMALIZER
// ============================================================

const normalizeProduct = (
  product
) => {
  if (
    !product ||
    typeof product !== "object"
  ) {
    return null;
  }

  return {
    ...product,

    farm_product_id:
      product.farm_product_id,

    available_quantity_kg:
      toNumber(
        product.available_quantity_kg
      ),

    selling_price_per_kg:
      toNumber(
        product.selling_price_per_kg
      ),

    stock_level:
      product.stock_level || "",

    product_code:
      product.product_code || "",

    product_type:
      product.product_type || "",

    rice_variety:
      product.rice_variety || "",

    product_grade:
      product.product_grade || "",

    description:
      product.description || "",

    product_image:
      product.product_image || null,
  };
};


const normalizeProducts = (
  items
) => {
  if (
    !Array.isArray(
      items
    )
  ) {
    return [];
  }

  return items
    .map(
      normalizeProduct
    )
    .filter(
      Boolean
    );
};


// ============================================================
// CHECKOUT RESULT NORMALIZER
// ============================================================

const normalizeCheckoutResult = (
  result
) => {
  if (
    !result ||
    typeof result !== "object"
  ) {
    return null;
  }

  return {
    ...result,

    total_amount:
      toNumber(
        result.total_amount
      ),

    amount_received:
      result.amount_received === null ||
      result.amount_received === undefined
        ? null
        : toNumber(
            result.amount_received
          ),

    change_amount:
      result.change_amount === null ||
      result.change_amount === undefined
        ? null
        : toNumber(
            result.change_amount
          ),

    items:
      Array.isArray(
        result.items
      )
        ? result.items.map(
            (item) => ({
              ...item,

              quantity_sold_kg:
                toNumber(
                  item.quantity_sold_kg
                ),

              selling_price_per_kg:
                toNumber(
                  item.selling_price_per_kg
                ),

              line_total_amount:
                toNumber(
                  item.line_total_amount
                ),

              previous_available_quantity_kg:
                toNumber(
                  item.previous_available_quantity_kg
                ),

              remaining_available_quantity_kg:
                toNumber(
                  item.remaining_available_quantity_kg
                ),
            })
          )
        : [],
  };
};


// ============================================================
// SEARCH QUERY
// ============================================================

const buildProductQuery = (
  search = ""
) => {
  const normalized =
    String(
      search || ""
    ).trim();

  if (!normalized) {
    return "";
  }

  const params =
    new URLSearchParams();

  params.set(
    "search",
    normalized
  );

  return `?${params.toString()}`;
};


// ============================================================
// LOCAL CHECKOUT VALIDATION
// ============================================================
//
// IMPORTANT:
//
// This is only frontend convenience validation.
//
// Backend remains the FINAL authority because Inventory stock
// may change between product loading and checkout.
//
// ============================================================

const validateCheckoutItems = (
  items,
  products
) => {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error(
      "Add at least one product before checkout."
    );
  }


  const productMap =
    new Map(
      products.map(
        (product) => [
          String(
            product.farm_product_id
          ),
          product,
        ]
      )
    );


  items.forEach(
    (item) => {
      const productId =
        item?.farm_product_id;

      const quantity =
        Number(
          item?.quantity_kg
        );


      if (!productId) {
        throw new Error(
          "One of the selected products is invalid."
        );
      }


      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          "Product quantity must be greater than zero."
        );
      }


      const product =
        productMap.get(
          String(productId)
        );


      if (!product) {
        throw new Error(
          "One of the selected products is no longer available."
        );
      }


      const available =
        Number(
          product.available_quantity_kg
        );


      if (
        !Number.isFinite(available) ||
        available <= 0
      ) {
        throw new Error(
          `${product.rice_variety || "Product"} is already out of stock.`
        );
      }


      if (
        product.stock_level ===
        "out_of_stock"
      ) {
        throw new Error(
          `${product.rice_variety || "Product"} is already out of stock.`
        );
      }


      if (
        quantity >
        available
      ) {
        throw new Error(
          (
            `Only ${available} kg of ` +
            `${product.rice_variety || "this product"} ` +
            "is currently available."
          )
        );
      }
    }
  );
};


// ============================================================
// HOOK
// ============================================================

const useFarmerPointOfSale = () => {
  const {
    request,
  } = useApi();


  // =========================================================
  // PRODUCTS
  // =========================================================

  const [
    products,
    setProducts,
  ] = useState(
    []
  );


  // =========================================================
  // LAST SUCCESSFUL TRANSACTION
  // =========================================================

  const [
    lastTransaction,
    setLastTransaction,
  ] = useState(
    null
  );


  // =========================================================
  // LOADING STATES
  // =========================================================

  const [
    isLoadingProducts,
    setIsLoadingProducts,
  ] = useState(
    false
  );


  const [
    isCheckingOut,
    setIsCheckingOut,
  ] = useState(
    false
  );


  // =========================================================
  // ERROR
  // =========================================================

  const [
    error,
    setError,
  ] = useState(
    ""
  );


  // =========================================================
  // LOAD POS PRODUCTS
  // =========================================================
  //
  // Backend returns ONLY products belonging to logged-in
  // Farmer that are currently eligible for POS.
  //
  // Current backend rules:
  //
  // status = active
  // available_quantity_kg > 0
  // stock_level != out_of_stock
  // selling_price_per_kg > 0
  //
  // =========================================================

  const loadProducts =
    useCallback(
      async (
        search = ""
      ) => {
        setIsLoadingProducts(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              (
                "/farmer/point-of-sale/products/" +
                buildProductQuery(
                  search
                )
              ),
              {
                method: "GET",
                throwOnError: true,
              }
            );


          const payload =
            unwrapData(
              response
            );


          const normalized =
            normalizeProducts(
              payload?.items
            );


          setProducts(
            normalized
          );


          return normalized;

        } catch (
          err
        ) {
          const message =
            getErrorMessage(
              err,
              "Unable to load POS products."
            );


          setError(
            message
          );


          setProducts(
            []
          );


          throw err;

        } finally {
          setIsLoadingProducts(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // COMPLETE CHECKOUT
  // =========================================================
  //
  // Expected payload from Farmer POS page:
  //
  // {
  //   buyerName: "Juan Dela Cruz",
  //
  //   paymentMethod: "cash",
  //
  //   amountReceived: 3000,
  //
  //   items: [
  //     {
  //       farm_product_id: 1,
  //       quantity_kg: 50
  //     }
  //   ]
  // }
  //
  //
  // buyerName is optional.
  //
  //
  // IMPORTANT:
  //
  // No farmer_user_id is sent.
  //
  // =========================================================

  const checkout =
    useCallback(
      async ({
        buyerName = "",
        paymentMethod,
        amountReceived = null,
        items = [],
      }) => {

        setError(
          ""
        );


        // ===================================================
        // FRONTEND VALIDATION
        //
        // Backend performs these checks again under a DB lock.
        // ===================================================

        validateCheckoutItems(
          items,
          products
        );


        const normalizedPayment =
          String(
            paymentMethod || ""
          )
            .trim()
            .toLowerCase();


        if (
          normalizedPayment !== "cash" &&
          normalizedPayment !== "card"
        ) {
          throw new Error(
            "Select Cash or Card as the payment method."
          );
        }


        if (
          normalizedPayment === "cash"
        ) {
          const cash =
            Number(
              amountReceived
            );


          if (
            !Number.isFinite(cash) ||
            cash < 0
          ) {
            throw new Error(
              "Enter a valid amount received."
            );
          }
        }


        setIsCheckingOut(
          true
        );


        try {
          const body = {
            buyer_name:
              String(
                buyerName || ""
              ).trim() || null,

            payment_method:
              normalizedPayment,

            items:
              items.map(
                (item) => ({
                  farm_product_id:
                    item.farm_product_id,

                  quantity_kg:
                    Number(
                      item.quantity_kg
                    ),
                })
              ),
          };


          if (
            normalizedPayment ===
            "cash"
          ) {
            body.amount_received =
              Number(
                amountReceived
              );
          }


          const response =
            await request(
              "/farmer/point-of-sale/checkout/",
              {
                method: "POST",

                body,

                throwOnError: true,
              }
            );


          const payload =
            unwrapData(
              response
            );


          const normalized =
            normalizeCheckoutResult(
              payload
            );


          setLastTransaction(
            normalized
          );


          // =================================================
          // REFRESH PRODUCTS AFTER SUCCESSFUL SALE
          //
          // Because backend already deducted:
          //
          // total_stock_quantity_kg
          //
          // this refresh immediately shows the updated
          // available quantity.
          //
          // Products that became out_of_stock will disappear.
          // =================================================

          await loadProducts();


          return normalized;

        } catch (
          err
        ) {
          const message =
            getErrorMessage(
              err,
              "Unable to complete POS transaction."
            );


          setError(
            message
          );


          throw err;

        } finally {
          setIsCheckingOut(
            false
          );
        }
      },
      [
        loadProducts,
        products,
        request,
      ]
    );


  // =========================================================
  // CLEAR LAST TRANSACTION
  // =========================================================

  const clearLastTransaction =
    useCallback(
      () => {
        setLastTransaction(
          null
        );
      },
      []
    );


  // =========================================================
  // CLEAR ERROR
  // =========================================================

  const clearError =
    useCallback(
      () => {
        setError(
          ""
        );
      },
      []
    );


  // =========================================================
  // RETURN
  // =========================================================

  return {

    // Data
    products,
    lastTransaction,

    // Loading
    isLoadingProducts,
    isCheckingOut,

    // Error
    error,

    // Actions
    loadProducts,
    checkout,

    // Utilities
    clearError,
    clearLastTransaction,
  };
};


export default useFarmerPointOfSale;