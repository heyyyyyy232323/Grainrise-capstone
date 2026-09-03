import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Mail,
  Users,
  X,
} from "lucide-react";


// ============================================================
// HELPERS
// ============================================================

const displayValue = (
  value,
  fallback = "—"
) => {
  const cleaned =
    String(
      value ?? ""
    ).trim();

  return cleaned || fallback;
};


const formatDateTime = (
  value
) => {
  if (!value) {
    return "—";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return displayValue(
      value
    );
  }

  return parsed.toLocaleString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
};


const formatRecipientType = (
  value
) => {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  const labels = {
    all_users:
      "All Users",

    miller_manager:
      "Miller Managers",

    warehouse_manager:
      "Warehouse Managers",

    retailer:
      "Retailers",

    farmer:
      "Farmers",

    specific_user:
      "Specific User",
  };

  return (
    labels[
      normalized
    ] ||
    displayValue(
      value
    )
  );
};


const formatAdminRole = (
  value
) => {
  const cleaned =
    String(
      value || ""
    )
      .trim()
      .replace(
        /_/g,
        " "
      )
      .replace(
        /-/g,
        " "
      );

  if (!cleaned) {
    return "Account Administrator";
  }

  return cleaned
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};


// ============================================================
// INFO FIELD
// ============================================================

const InfoField = ({
  label,
  value,
}) => (
  <div>
    <p
      className="
        text-[11px]
        font-semibold
        uppercase
        tracking-wide
        text-gray-400
      "
    >
      {label}
    </p>

    <p
      className="
        mt-1
        break-words
        text-sm
        font-medium
        text-gray-800
      "
    >
      {
        displayValue(
          value
        )
      }
    </p>
  </div>
);


// ============================================================
// SENT EMAIL DETAILS MODAL
// ============================================================

const SentEmailDetailsModal = ({
  isOpen,
  onClose,

  email,

  isLoading = false,
}) => {
  // =========================================================
  // LOCK BACKGROUND SCROLL
  // =========================================================

  useEffect(
    () => {
      if (!isOpen) {
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
      isOpen,
    ]
  );


  if (!isOpen) {
    return null;
  }


  // =========================================================
  // DATA
  // =========================================================

  const recipientType =
    email
      ?.recipient_type ||
    "";


  const isSpecificUser =
    recipientType ===
    "specific_user";


  const recipientCount =
    Number(
      email
        ?.recipient_count ||
      0
    );


  const senderName =
    displayValue(
      email
        ?.sent_by_admin_name,
      "Account Administrator"
    );


  // =========================================================
  // MODAL CONTENT
  // =========================================================

  const modalContent = (
    <div
      className="
        fixed
        inset-0
        z-[9999]
        overflow-y-auto
        bg-black/50
        px-4
        py-6
      "
      onMouseDown={
        onClose
      }
    >
      <div
        className="
          flex
          min-h-full
          items-center
          justify-center
        "
      >
        <div
          className="
            relative
            flex
            w-full
            max-w-2xl
            flex-col
            overflow-hidden
            rounded-2xl
            bg-white
            shadow-2xl
          "
          style={{
            maxHeight:
              "calc(100dvh - 48px)",
          }}
          onMouseDown={(
            event
          ) => {
            event.stopPropagation();
          }}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <div
            className="
              flex
              shrink-0
              items-start
              justify-between
              gap-4
              border-b
              border-gray-100
              bg-white
              px-6
              py-5
            "
          >
            <div
              className="
                flex
                min-w-0
                items-start
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-emerald-50
                  text-[#08511f]
                "
              >
                <Mail
                  size={18}
                />
              </div>


              <div
                className="
                  min-w-0
                "
              >
                <h2
                  className="
                    text-lg
                    font-bold
                    text-gray-900
                  "
                >
                  Sent Email Details
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-gray-500
                  "
                >
                  Review the email previously sent through GrainRise.
                </p>
              </div>
            </div>


            <button
              type="button"
              onClick={
                onClose
              }
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-gray-200
                bg-white
                text-gray-400
                transition
                hover:bg-gray-50
                hover:text-gray-600
              "
              aria-label="Close sent email details"
            >
              <X
                size={18}
              />
            </button>
          </div>


          {/* =================================================
              BODY
          ================================================= */}

          <div
            className="
              min-h-0
              flex-1
              overflow-y-auto
            "
          >
            {
              isLoading ? (
                <div
                  className="
                    flex
                    min-h-[360px]
                    items-center
                    justify-center
                    px-6
                    py-8
                  "
                >
                  <div
                    className="
                      text-center
                    "
                  >
                    <div
                      className="
                        mx-auto
                        mb-3
                        h-8
                        w-8
                        animate-spin
                        rounded-full
                        border-4
                        border-gray-200
                        border-t-[#08511f]
                      "
                    />

                    <p
                      className="
                        text-sm
                        font-semibold
                        text-gray-700
                      "
                    >
                      Loading sent email...
                    </p>
                  </div>
                </div>
              ) : email ? (
                <div
                  className="
                    space-y-5
                    px-6
                    py-6
                  "
                >
                  {/* =========================================
                      DELIVERY INFORMATION
                  ========================================= */}

                  <section>
                    <h3
                      className="
                        mb-3
                        text-sm
                        font-bold
                        text-gray-900
                      "
                    >
                      Delivery Information
                    </h3>


                    <div
                      className="
                        grid
                        grid-cols-1
                        gap-4
                        rounded-xl
                        border
                        border-gray-200
                        bg-gray-50
                        p-4
                        sm:grid-cols-2
                      "
                    >
                      <InfoField
                        label="Sent To"
                        value={
                          email
                            ?.recipient_label ||
                          formatRecipientType(
                            recipientType
                          )
                        }
                      />


                      <InfoField
                        label="Recipient Type"
                        value={
                          formatRecipientType(
                            recipientType
                          )
                        }
                      />


                      {
                        isSpecificUser && (
                          <InfoField
                            label="Recipient Email"
                            value={
                              email
                                ?.recipient_email ||
                              email
                                ?.current_recipient_email
                            }
                          />
                        )
                      }


                      <InfoField
                        label="Recipients Reached"
                        value={
                          `${recipientCount.toLocaleString()} ${
                            recipientCount === 1
                              ? "recipient"
                              : "recipients"
                          }`
                        }
                      />


                      <InfoField
                        label="Date Sent"
                        value={
                          formatDateTime(
                            email
                              ?.sent_at
                          )
                        }
                      />
                    </div>
                  </section>


                  {/* =========================================
                      SUBJECT
                  ========================================= */}

                  <section>
                    <h3
                      className="
                        mb-3
                        text-sm
                        font-bold
                        text-gray-900
                      "
                    >
                      Subject
                    </h3>


                    <div
                      className="
                        rounded-xl
                        border
                        border-gray-200
                        bg-gray-50
                        px-4
                        py-3
                      "
                    >
                      <p
                        className="
                          break-words
                          text-sm
                          font-semibold
                          text-gray-800
                        "
                      >
                        {
                          displayValue(
                            email
                              ?.subject,
                            "Untitled Email"
                          )
                        }
                      </p>
                    </div>
                  </section>


                  {/* =========================================
                      MESSAGE
                  ========================================= */}

                  <section>
                    <h3
                      className="
                        mb-3
                        text-sm
                        font-bold
                        text-gray-900
                      "
                    >
                      Message
                    </h3>


                    <div
                      className="
                        min-h-[150px]
                        whitespace-pre-wrap
                        break-words
                        rounded-xl
                        border
                        border-gray-200
                        bg-white
                        p-4
                        text-sm
                        leading-6
                        text-gray-700
                      "
                    >
                      {
                        displayValue(
                          email
                            ?.message_plain,
                          "No message content available."
                        )
                      }
                    </div>
                  </section>


                  {/* =========================================
                      SENT BY
                  ========================================= */}

                  <section>
                    <h3
                      className="
                        mb-3
                        text-sm
                        font-bold
                        text-gray-900
                      "
                    >
                      Sent By
                    </h3>


                    <div
                      className="
                        rounded-xl
                        border
                        border-gray-200
                        bg-gray-50
                        p-4
                      "
                    >
                      <div
                        className="
                          grid
                          grid-cols-1
                          gap-4
                          sm:grid-cols-2
                        "
                      >
                        <InfoField
                          label="Administrator"
                          value={
                            senderName
                          }
                        />


                        <InfoField
                          label="Admin Role"
                          value={
                            formatAdminRole(
                              email
                                ?.sent_by_admin_role
                            )
                          }
                        />


                        <InfoField
                          label="Admin Email"
                          value={
                            email
                              ?.sent_by_admin_email
                          }
                        />


                        <InfoField
                          label="Admin Username"
                          value={
                            email
                              ?.sent_by_admin_username
                          }
                        />
                      </div>
                    </div>
                  </section>


                  {/* =========================================
                      SPECIFIC USER CURRENT ACCOUNT
                  ========================================= */}

                  {
                    isSpecificUser &&
                    email
                      ?.current_recipient_user_id && (
                      <section>
                        <div
                          className="
                            mb-3
                            flex
                            items-center
                            gap-2
                          "
                        >
                          <Users
                            size={15}
                            className="
                              text-[#08511f]
                            "
                          />

                          <h3
                            className="
                              text-sm
                              font-bold
                              text-gray-900
                            "
                          >
                            Recipient Account
                          </h3>
                        </div>


                        <div
                          className="
                            grid
                            grid-cols-1
                            gap-4
                            rounded-xl
                            border
                            border-gray-200
                            bg-gray-50
                            p-4
                            sm:grid-cols-2
                          "
                        >
                          <InfoField
                            label="Current Name"
                            value={
                              email
                                ?.current_recipient_name
                            }
                          />

                          <InfoField
                            label="Current Email"
                            value={
                              email
                                ?.current_recipient_email
                            }
                          />

                          <InfoField
                            label="User Role"
                            value={
                              formatRecipientType(
                                email
                                  ?.current_recipient_role
                              )
                            }
                          />

                          <InfoField
                            label="Account Status"
                            value={
                              email
                                ?.current_recipient_status
                            }
                          />
                        </div>
                      </section>
                    )
                  }
                </div>
              ) : (
                <div
                  className="
                    flex
                    min-h-[300px]
                    items-center
                    justify-center
                    px-6
                    py-8
                    text-center
                  "
                >
                  <div>
                    <Mail
                      size={28}
                      className="
                        mx-auto
                        text-gray-300
                      "
                    />

                    <p
                      className="
                        mt-3
                        text-sm
                        font-semibold
                        text-gray-600
                      "
                    >
                      Sent email not found.
                    </p>
                  </div>
                </div>
              )
            }
          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          <div
            className="
              flex
              shrink-0
              justify-end
              border-t
              border-gray-100
              bg-white
              px-6
              py-4
            "
          >
            <button
              type="button"
              onClick={
                onClose
              }
              className="
                rounded-lg
                border
                border-gray-300
                bg-white
                px-4
                py-2
                text-xs
                font-semibold
                text-gray-600
                transition
                hover:bg-gray-50
              "
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );


  // =========================================================
  // PORTAL
  // =========================================================

  return createPortal(
    modalContent,
    document.body
  );
};


export default SentEmailDetailsModal;