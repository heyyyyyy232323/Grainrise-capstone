import {
  useEffect,
} from "react";

import {
  Printer,
  Receipt,
  X,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";


// ============================================================
// GRAINRISE
// UNIVERSAL PRINTABLE RECEIPT MODAL
// ============================================================
//
// PURPOSE:
//
// Shared printable sales receipt modal across GrainRise RBAC.
//
// CAN BE USED BY:
//
// - Farmer POS
// - Retailer POS
// - Miller / Supplier Seller
// - Warehouse Seller
// - Future sales modules
//
//
// EXPECTED ITEM FORMAT:
//
// {
//   id: 1,
//   name: "Dinorado",
//   description: "Premium Grade",
//   quantity: 25,
//   unit: "kg",
//   unitPrice: 45,
//   amount: 1125
// }
//
//
// MODAL BEHAVIOR:
//
// - Rendered through document.body portal.
// - Covers Navbar, Sidebar, Page Content.
// - Backdrop click does NOT close modal.
// - X closes the modal.
// - ESC closes the modal.
// - Bottom action is Print Receipt only.
// - Print Receipt opens browser print preview.
// ============================================================


// ============================================================
// DEFAULT FORMATTERS
// ============================================================

const defaultFormatAmount = (
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


const defaultFormatQuantity = (
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


const defaultFormatDate = (
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


  return date.toLocaleString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }
  );

};


// ============================================================
// HTML ESCAPE
// ============================================================

const escapeHtml = (
  value
) => {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

};


// ============================================================
// COMPONENT
// ============================================================

export default function PrintableReceiptModal({
  open = false,

  receiptTitle = "Sales Receipt",

  sellerLabel = "Point of Sale",

  transactionId = "",

  transactionDate = null,

  buyerPayee = "",

  paymentMethod = "",

  items = [],

  totalAmount = 0,

  amountReceived = null,

  changeAmount = null,

  showPaymentDetails = true,

  footerMessage =
    "Thank you for using GrainRise.",

  formatAmount =
    defaultFormatAmount,

  formatQuantity =
    defaultFormatQuantity,

  formatDate =
    defaultFormatDate,

  onClose,
}) {

  // =========================================================
  // LOCK BACKGROUND SCROLL
  // =========================================================

  useEffect(
    () => {

      if (!open) {
        return undefined;
      }


      const previousOverflow =
        document.body.style.overflow;


      document.body.style.overflow =
        "hidden";


      return () => {

        document.body.style.overflow =
          previousOverflow;

      };

    },
    [
      open,
    ]
  );


  // =========================================================
  // ESC KEY
  // =========================================================

  useEffect(
    () => {

      if (!open) {
        return undefined;
      }


      const handleKeyDown = (
        event
      ) => {

        if (
          event.key ===
          "Escape"
        ) {

          onClose?.();

        }

      };


      window.addEventListener(
        "keydown",
        handleKeyDown
      );


      return () => {

        window.removeEventListener(
          "keydown",
          handleKeyDown
        );

      };

    },
    [
      open,
      onClose,
    ]
  );


  // =========================================================
  // PRINT RECEIPT
  // =========================================================

  const handlePrintReceipt =
    () => {

      const printWindow =
        window.open(
          "",
          "_blank",
          "width=720,height=900"
        );


      if (!printWindow) {
        return;
      }


      // =====================================================
      // ITEM ROWS
      // =====================================================

      const itemRows =
        items
          .map(
            (
              item
            ) => {

              const name =
                escapeHtml(
                  item.name ||
                  "Product"
                );


              const description =
                escapeHtml(
                  item.description ||
                  ""
                );


              const quantity =
                escapeHtml(
                  formatQuantity(
                    item.quantity
                  )
                );


              const unit =
                escapeHtml(
                  item.unit ||
                  ""
                );


              const unitPrice =
                escapeHtml(
                  formatAmount(
                    item.unitPrice
                  )
                );


              const amount =
                escapeHtml(
                  formatAmount(
                    item.amount
                  )
                );


              return `
                <tr>

                  <td>

                    <strong>
                      ${name}
                    </strong>

                    ${
                      description
                        ? `
                          <div class="description">
                            ${description}
                          </div>
                        `
                        : ""
                    }

                    <div class="unit-price">
                      ${unitPrice}${
                        unit
                          ? `/${unit}`
                          : ""
                      }
                    </div>

                  </td>


                  <td class="right">

                    ${quantity}

                    ${
                      unit
                        ? ` ${unit}`
                        : ""
                    }

                  </td>


                  <td class="right strong">
                    ${amount}
                  </td>

                </tr>
              `;

            }
          )
          .join("");


      // =====================================================
      // PAYMENT DETAILS
      // =====================================================

      const paymentDetails =
        showPaymentDetails
        &&
        amountReceived !== null
        &&
        amountReceived !== undefined

          ? `
            <div class="summary-row">

              <span>
                Amount Received
              </span>

              <strong>
                ${escapeHtml(
                  formatAmount(
                    amountReceived
                  )
                )}
              </strong>

            </div>


            <div class="summary-row">

              <span>
                Change
              </span>

              <strong>
                ${escapeHtml(
                  formatAmount(
                    changeAmount
                  )
                )}
              </strong>

            </div>
          `
          : "";


      // =====================================================
      // SAFE VALUES
      // =====================================================

      const safeReceiptTitle =
        escapeHtml(
          receiptTitle
        );


      const safeSellerLabel =
        escapeHtml(
          sellerLabel
        );


      const safeTransactionId =
        escapeHtml(
          transactionId ||
          "—"
        );


      const safeDate =
        escapeHtml(
          formatDate(
            transactionDate
          )
        );


      const safeBuyer =
        escapeHtml(
          buyerPayee ||
          "—"
        );


      const safePayment =
        escapeHtml(
          paymentMethod ||
          "—"
        );


      const safeTotal =
        escapeHtml(
          formatAmount(
            totalAmount
          )
        );


      const safeFooter =
        escapeHtml(
          footerMessage
        );


      // =====================================================
      // PRINT DOCUMENT
      // =====================================================

      printWindow.document.write(
        `
        <!DOCTYPE html>

        <html>

          <head>

            <meta charset="UTF-8" />

            <title>
              ${safeTransactionId}
            </title>


            <style>

              * {
                box-sizing: border-box;
              }


              body {
                margin: 0;
                padding: 30px;
                background: #ffffff;
                color: #0f172a;
                font-family:
                  Arial,
                  Helvetica,
                  sans-serif;
              }


              .receipt {
                width: 100%;
                max-width: 700px;
                margin: 0 auto;
              }


              .brand {
                margin-bottom: 22px;
                text-align: center;
              }


              .brand-name {
                margin: 0;
                color: #15803d;
                font-size: 27px;
                font-weight: 800;
              }


              .brand-label {
                margin-top: 4px;
                color: #64748b;
                font-size: 12px;
              }


              .receipt-heading {
                margin-bottom: 22px;
                text-align: center;
              }


              .receipt-heading h2 {
                margin: 0;
                font-size: 19px;
              }


              .receipt-heading p {
                margin: 5px 0 0;
                color: #64748b;
                font-size: 12px;
              }


              .details {
                display: grid;
                grid-template-columns:
                  repeat(2, minmax(0, 1fr));
                gap: 14px 28px;
                margin-bottom: 22px;
                padding: 16px;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
              }


              .detail-label {
                margin-bottom: 4px;
                color: #94a3b8;
                font-size: 10px;
                text-transform: uppercase;
              }


              .detail-value {
                color: #0f172a;
                font-size: 12px;
                font-weight: 700;
              }


              table {
                width: 100%;
                border-collapse: collapse;
              }


              th {
                padding: 10px 5px;
                border-bottom: 1px solid #cbd5e1;
                color: #94a3b8;
                font-size: 10px;
                text-align: left;
                text-transform: uppercase;
              }


              td {
                padding: 13px 5px;
                border-bottom: 1px solid #e2e8f0;
                color: #334155;
                font-size: 12px;
                vertical-align: top;
              }


              .right {
                text-align: right;
              }


              .strong {
                font-weight: 700;
              }


              .description {
                margin-top: 3px;
                color: #64748b;
                font-size: 10px;
              }


              .unit-price {
                margin-top: 3px;
                color: #64748b;
                font-size: 10px;
              }


              .summary {
                margin-top: 20px;
              }


              .grand-total {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
                padding: 14px 0;
                border-top: 2px solid #0f172a;
                border-bottom: 2px solid #0f172a;
                font-size: 17px;
                font-weight: 800;
              }


              .summary-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
                margin-top: 10px;
                color: #475569;
                font-size: 12px;
              }


              .footer {
                margin-top: 30px;
                color: #64748b;
                font-size: 11px;
                line-height: 1.6;
                text-align: center;
              }


              @media print {

                body {
                  padding: 0;
                }


                @page {
                  margin: 14mm;
                }

              }

            </style>

          </head>


          <body>

            <div class="receipt">

              <div class="brand">

                <h1 class="brand-name">
                  GrainRise
                </h1>

                <div class="brand-label">
                  ${safeSellerLabel}
                </div>

              </div>


              <div class="receipt-heading">

                <h2>
                  ${safeReceiptTitle}
                </h2>

                <p>
                  Recorded GrainRise Transaction
                </p>

              </div>


              <div class="details">

                <div>

                  <div class="detail-label">
                    Transaction ID
                  </div>

                  <div class="detail-value">
                    ${safeTransactionId}
                  </div>

                </div>


                <div>

                  <div class="detail-label">
                    Date
                  </div>

                  <div class="detail-value">
                    ${safeDate}
                  </div>

                </div>


                <div>

                  <div class="detail-label">
                    Buyer / Payee
                  </div>

                  <div class="detail-value">
                    ${safeBuyer}
                  </div>

                </div>


                <div>

                  <div class="detail-label">
                    Payment Method
                  </div>

                  <div
                    class="detail-value"
                    style="text-transform: capitalize;"
                  >
                    ${safePayment}
                  </div>

                </div>

              </div>


              <table>

                <thead>

                  <tr>

                    <th>
                      Product
                    </th>

                    <th class="right">
                      Qty
                    </th>

                    <th class="right">
                      Amount
                    </th>

                  </tr>

                </thead>


                <tbody>
                  ${itemRows}
                </tbody>

              </table>


              <div class="summary">

                <div class="grand-total">

                  <span>
                    Total
                  </span>

                  <span>
                    ${safeTotal}
                  </span>

                </div>


                ${paymentDetails}

              </div>


              <div class="footer">

                ${safeFooter}

                <br />

                This receipt was generated from a recorded
                GrainRise transaction.

              </div>

            </div>


            <script>

              window.onload = function () {

                window.focus();

                window.print();

              };

            </script>

          </body>

        </html>
        `
      );


      printWindow.document.close();

    };


  // =========================================================
  // CLOSED
  // =========================================================

  if (!open) {
    return null;
  }


  // =========================================================
  // PORTAL
  // =========================================================

  return createPortal(

    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-slate-950/55
        px-4
        py-6
      "
      role="presentation"
    >

      {/* =====================================================
          MODAL
      ====================================================== */}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="printable-receipt-modal-title"
        className="
          relative
          max-h-[90vh]
          w-full
          max-w-lg
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
        "
      >

        {/* ===================================================
            HEADER
        ==================================================== */}

        <div
          className="
            flex
            items-start
            justify-between
            gap-4
            border-b
            border-slate-100
            px-6
            py-5
          "
        >

          <div className="flex items-center gap-3">

            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-green-100
              "
            >

              <Receipt
                size={19}
                className="text-green-700"
              />

            </div>


            <div>

              <h2
                id="printable-receipt-modal-title"
                className="
                  text-lg
                  font-extrabold
                  tracking-[-0.02em]
                  text-slate-900
                "
              >
                {receiptTitle}
              </h2>


              <p className="mt-0.5 text-xs text-slate-500">
                {sellerLabel}
              </p>

            </div>

          </div>


          {/* =================================================
              CLOSE - X ONLY
          ================================================== */}

          {onClose && (

            <button
              type="button"
              onClick={
                onClose
              }
              aria-label="Close receipt"
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-full
                border
                border-slate-200
                text-slate-400
                transition-colors
                hover:bg-slate-50
                hover:text-slate-700
                focus:outline-none
                focus:ring-2
                focus:ring-slate-300
                focus:ring-offset-2
              "
            >

              <X
                size={18}
              />

            </button>

          )}

        </div>


        {/* ===================================================
            SCROLLABLE RECEIPT BODY
        ==================================================== */}

        <div
          className="
            max-h-[calc(90vh-150px)]
            overflow-y-auto
            px-6
            py-5
          "
        >

          {/* =================================================
              TRANSACTION DETAILS
          ================================================== */}

          <div
            className="
              grid
              grid-cols-1
              gap-x-6
              gap-y-4
              rounded-xl
              bg-slate-50
              p-4
              sm:grid-cols-2
            "
          >

            <div>

              <p
                className="
                  text-[11px]
                  font-medium
                  text-slate-400
                "
              >
                Transaction ID
              </p>


              <p
                className="
                  mt-1
                  break-all
                  text-sm
                  font-semibold
                  text-slate-800
                "
              >
                {transactionId || "—"}
              </p>

            </div>


            <div>

              <p
                className="
                  text-[11px]
                  font-medium
                  text-slate-400
                "
              >
                Date
              </p>


              <p
                className="
                  mt-1
                  text-sm
                  font-semibold
                  text-slate-800
                "
              >
                {formatDate(
                  transactionDate
                )}
              </p>

            </div>


            <div>

              <p
                className="
                  text-[11px]
                  font-medium
                  text-slate-400
                "
              >
                Buyer / Payee
              </p>


              <p
                className="
                  mt-1
                  text-sm
                  font-semibold
                  text-slate-800
                "
              >
                {buyerPayee || "—"}
              </p>

            </div>


            <div>

              <p
                className="
                  text-[11px]
                  font-medium
                  text-slate-400
                "
              >
                Payment Method
              </p>


              <p
                className="
                  mt-1
                  text-sm
                  font-semibold
                  capitalize
                  text-slate-800
                "
              >
                {paymentMethod || "—"}
              </p>

            </div>

          </div>


          {/* =================================================
              ITEM HEADER
          ================================================== */}

          <div
            className="
              mt-5
              grid
              grid-cols-[1fr_auto_auto]
              gap-3
              border-b
              border-slate-200
              pb-2
              text-[11px]
              font-semibold
              uppercase
              tracking-wide
              text-slate-400
            "
          >

            <span>
              Product
            </span>

            <span className="min-w-20 text-right">
              Qty
            </span>

            <span className="min-w-24 text-right">
              Amount
            </span>

          </div>


          {/* =================================================
              ITEMS
          ================================================== */}

          <div className="divide-y divide-slate-100">

            {items.length === 0 ? (

              <div
                className="
                  py-8
                  text-center
                  text-sm
                  text-slate-400
                "
              >
                No receipt items available.
              </div>

            ) : (

              items.map(
                (
                  item,
                  index
                ) => (

                  <div
                    key={
                      item.id ??
                      `${item.name}-${index}`
                    }
                    className="
                      grid
                      grid-cols-[1fr_auto_auto]
                      gap-3
                      py-3
                    "
                  >

                    {/* =======================================
                        PRODUCT
                    ======================================== */}

                    <div className="min-w-0">

                      <p
                        className="
                          truncate
                          text-sm
                          font-semibold
                          text-slate-800
                        "
                      >
                        {item.name ||
                          "Product"}
                      </p>


                      {item.description && (

                        <p
                          className="
                            mt-0.5
                            truncate
                            text-[11px]
                            text-slate-400
                          "
                        >
                          {item.description}
                        </p>

                      )}


                      <p
                        className="
                          mt-0.5
                          text-xs
                          text-slate-500
                        "
                      >

                        {formatAmount(
                          item.unitPrice
                        )}

                        {item.unit
                          ? `/${item.unit}`
                          : ""}

                      </p>

                    </div>


                    {/* =======================================
                        QUANTITY
                    ======================================== */}

                    <div className="min-w-20 text-right">

                      <p
                        className="
                          text-sm
                          font-medium
                          text-slate-700
                        "
                      >

                        {formatQuantity(
                          item.quantity
                        )}

                        {item.unit
                          ? ` ${item.unit}`
                          : ""}

                      </p>

                    </div>


                    {/* =======================================
                        AMOUNT
                    ======================================== */}

                    <div className="min-w-24 text-right">

                      <p
                        className="
                          text-sm
                          font-semibold
                          text-slate-800
                        "
                      >
                        {formatAmount(
                          item.amount
                        )}
                      </p>

                    </div>

                  </div>

                )
              )

            )}

          </div>


          {/* =================================================
              TOTAL
          ================================================== */}

          <div
            className="
              mt-4
              border-t
              border-slate-200
              pt-4
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                gap-4
              "
            >

              <span
                className="
                  text-base
                  font-bold
                  text-slate-900
                "
              >
                Total
              </span>


              <span
                className="
                  text-lg
                  font-extrabold
                  text-green-700
                "
              >
                {formatAmount(
                  totalAmount
                )}
              </span>

            </div>


            {/* ===============================================
                PAYMENT DETAILS
            ================================================ */}

            {showPaymentDetails
              &&
              amountReceived !== null
              &&
              amountReceived !== undefined
              && (

              <div className="mt-3 space-y-2">

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    text-sm
                  "
                >

                  <span className="text-slate-500">
                    Amount Received
                  </span>


                  <span
                    className="
                      font-medium
                      text-slate-700
                    "
                  >
                    {formatAmount(
                      amountReceived
                    )}
                  </span>

                </div>


                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    text-sm
                  "
                >

                  <span className="text-slate-500">
                    Change
                  </span>


                  <span
                    className="
                      font-medium
                      text-slate-700
                    "
                  >
                    {formatAmount(
                      changeAmount
                    )}
                  </span>

                </div>

              </div>

            )}

          </div>


          {/* =================================================
              FOOTER MESSAGE
          ================================================== */}

          {footerMessage && (

            <div
              className="
                mt-5
                rounded-xl
                border
                border-green-100
                bg-green-50
                px-4
                py-3
              "
            >

              <p
                className="
                  text-center
                  text-xs
                  leading-5
                  text-green-800
                "
              >
                {footerMessage}
              </p>

            </div>

          )}

        </div>


        {/* ===================================================
            ACTIONS

            ONLY PRINT RECEIPT

            Closing is handled by X above.
        ==================================================== */}

        <div
          className="
            border-t
            border-slate-100
            bg-white
            px-6
            py-4
          "
        >

          <button
            type="button"
            onClick={
              handlePrintReceipt
            }
            className="
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-green-700
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              transition-colors
              hover:bg-green-800
              focus:outline-none
              focus:ring-2
              focus:ring-green-700
              focus:ring-offset-2
            "
          >

            <Printer
              size={16}
            />

            Print Receipt

          </button>

        </div>

      </div>

    </div>,
    document.body
  );

}