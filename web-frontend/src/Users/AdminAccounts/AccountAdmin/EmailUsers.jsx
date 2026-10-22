import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  User,
  X,
} from "lucide-react";

import {
  useLocation,
} from "react-router-dom";

import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import RichTextEditor from "../../../Components/Minor-Components/RichTextEditor";
import Toast from "../../../Components/Modals/Toast";

import SentEmailDetailsModal from "../../../Components/Modals/SentEmailDetailsModal";

import useToast from "../../../Components/hooks/useToast";
import useEmailUsers from "../../../Components/hooks/AccountAdmin/useEmailUsers";


// ============================================================
// CONSTANTS
// ============================================================

const MAX_MESSAGE_LENGTH = 1000;


const RECIPIENT_OPTIONS = [
  {
    value: "all_users",
    label: "All Users",
  },

  {
    value: "miller_manager",
    label: "Miller Managers",
  },

  {
    value: "warehouse_manager",
    label: "Warehouse Managers",
  },

  {
    value: "retailer",
    label: "Retailers",
  },

  {
    value: "farmer",
    label: "Farmers",
  },

  {
    value: "specific_user",
    label: "Specific User",
  },
];


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


const formatLabel = (
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
    return "—";
  }

  return cleaned
    .split(" ")
    .map(
      (
        word
      ) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};


const getStatusClasses = (
  value
) => {
  const status =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  if (
    status === "active"
  ) {
    return `
      border-emerald-200
      bg-emerald-50
      text-emerald-700
    `;
  }

  if (
    status === "inactive"
  ) {
    return `
      border-amber-200
      bg-amber-50
      text-amber-700
    `;
  }

  if (
    status === "archived"
  ) {
    return `
      border-orange-200
      bg-orange-50
      text-orange-700
    `;
  }

  if (
    status === "deactivated"
  ) {
    return `
      border-rose-200
      bg-rose-50
      text-rose-700
    `;
  }

  return `
    border-gray-200
    bg-gray-50
    text-gray-600
  `;
};


const normalizePassedRecipient = (
  recipient
) => {
  if (!recipient) {
    return null;
  }

  const fullName = [
    recipient?.firstName,
    recipient?.lastName,
  ]
    .filter(
      (
        value
      ) =>
        String(
          value || ""
        ).trim()
    )
    .join(" ")
    .trim();

  const recipientType =
    recipient?.recipientType ||
    (recipient?.is_partnership || String(recipient?.recipientId || recipient?.userId || "").includes("-")
      ? "partnership_inquiry"
      : "user");

  const recipientId =
    recipient?.recipientId ||
    recipient?.userId ||
    recipient?.inquiryId ||
    null;

  return {
    recipient_type: recipientType,
    recipient_id: recipientId,

    user_id:
      recipientType === "user" ? recipientId : null,

    inquiry_id:
      recipientType === "partnership_inquiry" ? recipientId : null,

    full_name:
      fullName ||
      recipient?.businessName ||
      recipient?.email ||
      (recipientType === "partnership_inquiry" ? "Partnership Applicant" : "Selected User"),

    first_name:
      recipient?.firstName ||
      "",

    last_name:
      recipient?.lastName ||
      "",

    business_name:
      recipient?.businessName ||
      "",

    email:
      recipient?.email ||
      "",

    username:
      "",

    user_role:
      recipient?.userRole ||
      (recipientType === "partnership_inquiry" ? "partnership_inquiry" : ""),

    status:
      recipient?.status ||
      (recipientType === "partnership_inquiry" ? "to_review" : ""),
  };
};


// ============================================================
// EMAIL USERS
// ============================================================

export default function EmailUsers() {
  const location =
    useLocation();


  // =========================================================
  // EMAIL API
  // =========================================================

  const {
    sentHistory,
    isLoadingHistory,

    selectedEmailDetails,
    isLoadingDetails,

    recipients,
    isLoadingRecipients,

    isSending,

    error,

    searchRecipients,
    clearRecipients,

    sendEmail,

    getSentEmailDetails,
    clearSelectedEmail,
  } = useEmailUsers();


  // =========================================================
  // TOAST
  // =========================================================

  const {
    toasts,
    showToast,
    removeToast,
  } = useToast();


  // =========================================================
  // RECIPIENT FROM MANAGEMENT MESSAGE BUTTON
  // =========================================================

  const passedRecipient =
    location.state
      ?.recipient ||
    null;


  // =========================================================
  // COMPOSER STATE
  // =========================================================

  const [
    recipientType,
    setRecipientType,
  ] = useState(
    passedRecipient
      ? "specific_user"
      : "all_users"
  );


  const [
    selectedRecipient,
    setSelectedRecipient,
  ] = useState(
    normalizePassedRecipient(
      passedRecipient
    )
  );


  const [
    recipientSearch,
    setRecipientSearch,
  ] = useState(
    ""
  );


  const [
    recipientPickerOpen,
    setRecipientPickerOpen,
  ] = useState(
    false
  );


  const [
    subject,
    setSubject,
  ] = useState(
    ""
  );


  const [
    messageHtml,
    setMessageHtml,
  ] = useState(
    ""
  );


  const [
    messagePlain,
    setMessagePlain,
  ] = useState(
    ""
  );


  const [
    editorKey,
    setEditorKey,
  ] = useState(
    0
  );


  // =========================================================
  // HISTORY
  // =========================================================

  const [
    historySearch,
    setHistorySearch,
  ] = useState(
    ""
  );


  const [
    detailsModalOpen,
    setDetailsModalOpen,
  ] = useState(
    false
  );


  // =========================================================
  // SYNC MESSAGE RECIPIENT
  // =========================================================

  useEffect(
    () => {
      if (
        !passedRecipient
      ) {
        return;
      }

      setRecipientType(
        "specific_user"
      );

      setSelectedRecipient(
        normalizePassedRecipient(
          passedRecipient
        )
      );
    },
    [
      passedRecipient,
    ]
  );


  // =========================================================
  // SEARCH SPECIFIC USERS
  // =========================================================

  useEffect(
    () => {
      if (
        recipientType !==
        "specific_user"
      ) {
        return undefined;
      }

      if (
        !recipientPickerOpen
      ) {
        return undefined;
      }


      const timeout =
        setTimeout(
          () => {
            searchRecipients(
              recipientSearch
            ).catch(
              () => {
                // Error handled by hook.
              }
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
      recipientType,
      recipientPickerOpen,
      recipientSearch,
      searchRecipients,
    ]
  );


  // =========================================================
  // FILTER SENT HISTORY
  // =========================================================

  const filteredHistory =
    useMemo(
      () => {
        const query =
          historySearch
            .trim()
            .toLowerCase();


        if (!query) {
          return sentHistory;
        }


        return sentHistory.filter(
          (
            item
          ) => {
            const searchableText = [
              item?.subject,
              item?.recipient_label,
              item?.recipient_email,
              item?.message_plain,
              item?.sent_by_admin_name,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();


            return searchableText.includes(
              query
            );
          }
        );
      },
      [
        sentHistory,
        historySearch,
      ]
    );


  // =========================================================
  // VALIDATION
  // =========================================================

  const subjectValid =
    subject.trim().length > 0;


  const messageValid =
    messagePlain.trim().length > 0;


  const messageWithinLimit =
    messagePlain.length <=
    MAX_MESSAGE_LENGTH;


  const specificRecipientValid =
    recipientType !==
      "specific_user" ||
    Boolean(
      selectedRecipient
        ?.email
    );


  const sendDisabled =
    isSending ||
    !subjectValid ||
    !messageValid ||
    !messageWithinLimit ||
    !specificRecipientValid;


  // =========================================================
  // RECIPIENT TYPE CHANGE
  // =========================================================

  const handleRecipientTypeChange =
    (
      event
    ) => {
      const value =
        event.target.value;


      setRecipientType(
        value
      );


      if (
        value ===
        "specific_user"
      ) {
        setRecipientPickerOpen(
          !selectedRecipient
        );

        return;
      }


      setRecipientPickerOpen(
        false
      );

      setRecipientSearch(
        ""
      );

      clearRecipients();
    };


  // =========================================================
  // OPEN RECIPIENT PICKER
  // =========================================================

  const handleOpenRecipientPicker =
    () => {
      setRecipientPickerOpen(
        true
      );

      setRecipientSearch(
        ""
      );
    };


  // =========================================================
  // SELECT RECIPIENT
  // =========================================================

  const handleSelectRecipient =
    (
      recipient
    ) => {
      setSelectedRecipient({
        ...recipient,
        recipient_type: "user",
        recipient_id: recipient?.user_id,
      });

      setRecipientSearch(
        ""
      );

      setRecipientPickerOpen(
        false
      );

      clearRecipients();
    };


  // =========================================================
  // REMOVE RECIPIENT
  // =========================================================

  const handleRemoveRecipient =
    () => {
      setSelectedRecipient(
        null
      );

      setRecipientSearch(
        ""
      );

      setRecipientPickerOpen(
        true
      );

      clearRecipients();
    };


  // =========================================================
  // SEND EMAIL
  // =========================================================

  const handleSendEmail =
    async () => {
      if (
        sendDisabled
      ) {
        return;
      }


      try {
        const isSpecific =
          recipientType ===
          "specific_user";

        const subRecipientType =
          isSpecific
            ? (selectedRecipient?.recipient_type || "user")
            : recipientType;

        const subRecipientId =
          isSpecific
            ? (selectedRecipient?.recipient_id ||
               selectedRecipient?.user_id ||
               selectedRecipient?.inquiry_id ||
               null)
            : null;

        const response =
          await sendEmail({
            recipientType,
            recipient_type: subRecipientType,
            recipient_id: subRecipientId,

            subject:
              subject.trim(),

            messageHtml,

            messagePlain:
              messagePlain.trim(),

            recipientUserId:
              subRecipientType === "user"
                ? subRecipientId
                : null,

            recipientEmail:
              isSpecific
                ? selectedRecipient
                    ?.email
                : "",

            recipientName:
              isSpecific
                ? selectedRecipient
                    ?.full_name
                : "",
          });


        const delivery =
          response
            ?.delivery ||
          {};


        const successfulCount =
          Number(
            delivery
              ?.successful_count ||
            0
          );


        const failedCount =
          Number(
            delivery
              ?.failed_count ||
            0
          );


        if (
          failedCount > 0
        ) {
          showToast({
            type:
              "warning",

            title:
              "Email Partially Sent",

            message:
              response?.message ||
              `Email reached ${successfulCount} recipient(s), but ${failedCount} could not be reached.`,

            duration:
              6000,
          });

        } else {
          showToast({
            type:
              "success",

            title:
              "Email Sent",

            message:
              response?.message ||
              "The email was sent successfully.",

            duration:
              5000,
          });
        }


        setSubject(
          ""
        );

        setMessageHtml(
          ""
        );

        setMessagePlain(
          ""
        );

        setEditorKey(
          (
            previous
          ) =>
            previous + 1
        );

      } catch (
        requestError
      ) {
        showToast({
          type:
            "error",

          title:
            "Email Not Sent",

          message:
            requestError?.message ||
            "The email could not be sent.",

          duration:
            5500,
        });
      }
    };


  // =========================================================
  // VIEW SENT EMAIL
  // =========================================================

  const handleViewEmail =
    async (
      item
    ) => {
      const historyId =
        item
          ?.email_history_id ||
        item
          ?.id;


      if (!historyId) {
        showToast({
          type:
            "error",

          title:
            "Unable to Open Email",

          message:
            "Sent email history ID was not found.",

          duration:
            4500,
        });

        return;
      }


      clearSelectedEmail();

      setDetailsModalOpen(
        true
      );


      try {
        await getSentEmailDetails(
          historyId
        );

      } catch (
        requestError
      ) {
        setDetailsModalOpen(
          false
        );

        clearSelectedEmail();


        showToast({
          type:
            "error",

          title:
            "Unable to Load Email",

          message:
            requestError?.message ||
            "The sent email details could not be loaded.",

          duration:
            5000,
        });
      }
    };


  // =========================================================
  // CLOSE HISTORY DETAILS
  // =========================================================

  const handleCloseDetails =
    () => {
      setDetailsModalOpen(
        false
      );

      clearSelectedEmail();
    };


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div>
      {/* =====================================================
          TOAST
      ===================================================== */}

      <Toast
        toasts={
          toasts
        }
        removeToast={
          removeToast
        }
      />


      {/* =====================================================
          BREADCRUMBS
      ===================================================== */}

      <Breadcrumbs
        items={[
          {
            label:
              "Communication",

            path:
              "/admin/email-users",
          },

          {
            label:
              "Email Users",
          },
        ]}
      />


      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div
        className="
          mt-4
          mb-6
        "
      >
        <h1
          className="
            text-2xl
            md:text-3xl
            font-bold
            text-gray-900
          "
        >
          Email Users
        </h1>

        <p
          className="
            mt-1
            text-sm
            text-gray-500
          "
        >
          Send announcements and updates.
        </p>
      </div>


      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div
        className="
          grid
          gap-6
          md:grid-cols-3
        "
      >
        {/* ===================================================
            COMPOSER
        =================================================== */}

        <div
          className="
            md:col-span-2
          "
        >
          <article
            className="
              w-full
              overflow-visible
              rounded-[14px]
              border
              border-slate-200
              bg-white
              shadow-[0_6px_18px_rgba(15,23,42,0.06)]
            "
          >
            {/* =================================================
                COMPOSER HEADER
            ================================================= */}

            <header
              className="
                flex
                items-center
                gap-3
                rounded-t-[14px]
                border-b
                border-slate-200
                px-5
                py-4
              "
            >
              <div
                className="
                  rounded-full
                  bg-emerald-50
                  p-3
                "
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0B7A2A"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8"
                  />

                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2"
                  />
                </svg>
              </div>


              <div>
                <div
                  className="
                    text-sm
                    font-semibold
                  "
                >
                  Compose Email
                </div>

                <div
                  className="
                    text-xs
                    text-slate-400
                  "
                >
                  From: grainriseph@gmail.com
                </div>
              </div>
            </header>


            {/* =================================================
                FORM
            ================================================= */}

            <div
              className="
                px-5
                py-5
              "
            >
              {/* ===============================================
                  SEND TO
              =============================================== */}

              <label
                className="
                  text-xs
                  font-semibold
                  text-slate-600
                "
              >
                SEND TO{" "}

                <span
                  className="
                    text-red-500
                  "
                >
                  *
                </span>
              </label>


              <div
                className="
                  mt-2
                "
              >
                <select
                  value={
                    recipientType
                  }
                  onChange={
                    handleRecipientTypeChange
                  }
                  className="
                    w-full
                    rounded-md
                    border
                    border-gray-200
                    bg-white
                    px-3
                    py-2
                    text-sm
                    text-gray-700
                    focus:border-emerald-500
                    focus:outline-none
                    focus:ring-1
                    focus:ring-emerald-500
                  "
                >
                  {
                    RECIPIENT_OPTIONS.map(
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
                    )
                  }
                </select>
              </div>


              {/* ===============================================
                  SPECIFIC USER
              =============================================== */}

              {
                recipientType ===
                  "specific_user" && (
                  <div
                    className="
                      mt-4
                    "
                  >
                    <label
                      className="
                        text-xs
                        font-semibold
                        text-slate-600
                      "
                    >
                      SELECT USER{" "}

                      <span
                        className="
                          text-red-500
                        "
                      >
                        *
                      </span>
                    </label>


                    {/* =========================================
                        SELECTED USER
                    ========================================= */}

                    {
                      selectedRecipient && (
                        <div
                          className="
                            mt-2
                            flex
                            items-start
                            justify-between
                            gap-4
                            rounded-xl
                            border
                            border-emerald-200
                            bg-emerald-50
                            px-4
                            py-3
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
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-white
                                text-[#08511f]
                              "
                            >
                              <User
                                size={17}
                              />
                            </div>


                            <div
                              className="
                                min-w-0
                              "
                            >
                              <p
                                className="
                                  truncate
                                  text-sm
                                  font-semibold
                                  text-gray-900
                                "
                              >
                                {
                                  displayValue(
                                    selectedRecipient
                                      ?.full_name,
                                    "Selected User"
                                  )
                                }
                              </p>


                              <p
                                className="
                                  mt-0.5
                                  break-all
                                  text-xs
                                  text-gray-500
                                "
                              >
                                {
                                  displayValue(
                                    selectedRecipient
                                      ?.email
                                  )
                                }
                              </p>


                              <div
                                className="
                                  mt-2
                                  flex
                                  flex-wrap
                                  items-center
                                  gap-2
                                "
                              >
                                {
                                  selectedRecipient
                                    ?.user_role && (
                                    <span
                                      className="
                                        rounded-full
                                        border
                                        border-gray-200
                                        bg-white
                                        px-2
                                        py-0.5
                                        text-[10px]
                                        font-semibold
                                        text-gray-600
                                      "
                                    >
                                      {
                                        formatLabel(
                                          selectedRecipient
                                            ?.user_role
                                        )
                                      }
                                    </span>
                                  )
                                }


                                {
                                  selectedRecipient
                                    ?.status && (
                                    <span
                                      className={`
                                        rounded-full
                                        border
                                        px-2
                                        py-0.5
                                        text-[10px]
                                        font-semibold
                                        ${getStatusClasses(
                                          selectedRecipient
                                            ?.status
                                        )}
                                      `}
                                    >
                                      {
                                        formatLabel(
                                          selectedRecipient
                                            ?.status
                                        )
                                      }
                                    </span>
                                  )
                                }
                              </div>
                            </div>
                          </div>


                          <div
                            className="
                              flex
                              shrink-0
                              items-center
                              gap-2
                            "
                          >
                            <button
                              type="button"
                              onClick={
                                handleOpenRecipientPicker
                              }
                              className="
                                rounded-lg
                                border
                                border-emerald-200
                                bg-white
                                px-3
                                py-1.5
                                text-xs
                                font-semibold
                                text-[#08511f]
                                transition
                                hover:bg-emerald-100
                              "
                            >
                              Change
                            </button>


                            <button
                              type="button"
                              onClick={
                                handleRemoveRecipient
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
                                bg-white
                                text-gray-400
                                transition
                                hover:bg-gray-50
                                hover:text-gray-600
                              "
                              aria-label="Remove selected recipient"
                            >
                              <X
                                size={15}
                              />
                            </button>
                          </div>
                        </div>
                      )
                    }


                    {/* =========================================
                        SEARCH PICKER
                    ========================================= */}

                    {
                      (
                        !selectedRecipient ||
                        recipientPickerOpen
                      ) && (
                        <div
                          className="
                            relative
                            mt-2
                          "
                        >
                          <div
                            className="
                              relative
                            "
                          >
                            <Search
                              size={15}
                              className="
                                pointer-events-none
                                absolute
                                left-3
                                top-1/2
                                -translate-y-1/2
                                text-gray-400
                              "
                            />


                            <input
                              type="text"
                              value={
                                recipientSearch
                              }
                              onChange={(
                                event
                              ) => {
                                setRecipientSearch(
                                  event.target.value
                                );

                                setRecipientPickerOpen(
                                  true
                                );
                              }}
                              onFocus={() =>
                                setRecipientPickerOpen(
                                  true
                                )
                              }
                              placeholder="Search name, email, or username..."
                              className="
                                w-full
                                rounded-lg
                                border
                                border-gray-200
                                bg-white
                                py-2.5
                                pl-9
                                pr-3
                                text-sm
                                text-gray-700
                                placeholder-gray-400
                                focus:border-emerald-500
                                focus:outline-none
                                focus:ring-1
                                focus:ring-emerald-500
                              "
                            />
                          </div>


                          {/* ===================================
                              RESULTS
                          =================================== */}

                          <div
                            className="
                              mt-2
                              max-h-64
                              overflow-y-auto
                              rounded-xl
                              border
                              border-gray-200
                              bg-white
                              shadow-lg
                            "
                          >
                            {
                              isLoadingRecipients ? (
                                <div
                                  className="
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                    px-4
                                    py-6
                                  "
                                >
                                  <div
                                    className="
                                      h-5
                                      w-5
                                      animate-spin
                                      rounded-full
                                      border-2
                                      border-gray-200
                                      border-t-emerald-600
                                    "
                                  />

                                  <span
                                    className="
                                      text-xs
                                      text-gray-500
                                    "
                                  >
                                    Loading users...
                                  </span>
                                </div>
                              ) : recipients.length >
                                0 ? (
                                recipients.map(
                                  (
                                    recipient
                                  ) => (
                                    <button
                                      type="button"
                                      key={
                                        recipient
                                          ?.user_id
                                      }
                                      onClick={() =>
                                        handleSelectRecipient(
                                          recipient
                                        )
                                      }
                                      className="
                                        flex
                                        w-full
                                        items-start
                                        gap-3
                                        border-b
                                        border-gray-100
                                        px-4
                                        py-3
                                        text-left
                                        transition
                                        last:border-b-0
                                        hover:bg-emerald-50
                                      "
                                    >
                                      <div
                                        className="
                                          flex
                                          h-9
                                          w-9
                                          shrink-0
                                          items-center
                                          justify-center
                                          rounded-full
                                          bg-gray-100
                                          text-gray-500
                                        "
                                      >
                                        <User
                                          size={16}
                                        />
                                      </div>


                                      <div
                                        className="
                                          min-w-0
                                          flex-1
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
                                          <p
                                            className="
                                              truncate
                                              text-sm
                                              font-semibold
                                              text-gray-900
                                            "
                                          >
                                            {
                                              displayValue(
                                                recipient
                                                  ?.full_name,
                                                "Unnamed User"
                                              )
                                            }
                                          </p>


                                          <span
                                            className={`
                                              rounded-full
                                              border
                                              px-2
                                              py-0.5
                                              text-[10px]
                                              font-semibold
                                              ${getStatusClasses(
                                                recipient
                                                  ?.status
                                              )}
                                            `}
                                          >
                                            {
                                              formatLabel(
                                                recipient
                                                  ?.status
                                              )
                                            }
                                          </span>
                                        </div>


                                        <p
                                          className="
                                            mt-0.5
                                            truncate
                                            text-xs
                                            text-gray-500
                                          "
                                        >
                                          {
                                            displayValue(
                                              recipient
                                                ?.email
                                            )
                                          }
                                        </p>


                                        <div
                                          className="
                                            mt-1
                                            flex
                                            flex-wrap
                                            gap-x-3
                                            gap-y-1
                                            text-[11px]
                                            text-gray-400
                                          "
                                        >
                                          <span>
                                            {
                                              formatLabel(
                                                recipient
                                                  ?.user_role
                                              )
                                            }
                                          </span>


                                          {
                                            recipient
                                              ?.username && (
                                              <span>
                                                @
                                                {
                                                  recipient
                                                    .username
                                                }
                                              </span>
                                            )
                                          }
                                        </div>
                                      </div>
                                    </button>
                                  )
                                )
                              ) : (
                                <div
                                  className="
                                    px-4
                                    py-6
                                    text-center
                                  "
                                >
                                  <p
                                    className="
                                      text-sm
                                      font-semibold
                                      text-gray-600
                                    "
                                  >
                                    No users found.
                                  </p>

                                  <p
                                    className="
                                      mt-1
                                      text-xs
                                      text-gray-400
                                    "
                                  >
                                    Try searching by name, email, or username.
                                  </p>
                                </div>
                              )
                            }
                          </div>
                        </div>
                      )
                    }
                  </div>
                )
              }


              {/* ===============================================
                  SUBJECT
              =============================================== */}

              <div
                className="
                  mt-4
                "
              >
                <label
                  className="
                    text-xs
                    font-semibold
                    text-slate-600
                  "
                >
                  SUBJECT{" "}

                  <span
                    className="
                      text-red-500
                    "
                  >
                    *
                  </span>
                </label>


                <input
                  type="text"
                  value={
                    subject
                  }
                  onChange={(
                    event
                  ) =>
                    setSubject(
                      event.target.value
                    )
                  }
                  maxLength={255}
                  placeholder="e.g Important Updates from GrainRise"
                  className="
                    mt-2
                    w-full
                    rounded-md
                    border
                    border-gray-200
                    px-3
                    py-2
                    text-sm
                    text-gray-700
                    placeholder-gray-400
                    focus:border-emerald-500
                    focus:outline-none
                    focus:ring-1
                    focus:ring-emerald-500
                  "
                />
              </div>


              {/* ===============================================
                  MESSAGE
              =============================================== */}

              <div
                className="
                  mt-4
                "
              >
                <label
                  className="
                    text-xs
                    font-semibold
                    text-slate-600
                  "
                >
                  MESSAGE{" "}

                  <span
                    className="
                      text-red-500
                    "
                  >
                    *
                  </span>
                </label>


                <RichTextEditor
                  key={
                    editorKey
                  }
                  onChange={(
                    html,
                    plain
                  ) => {
                    setMessageHtml(
                      html
                    );

                    setMessagePlain(
                      plain
                    );
                  }}
                  placeholder="Write your message here..."
                  minHeight={220}
                />


                {
                  !messageWithinLimit && (
                    <p
                      className="
                        mt-2
                        text-xs
                        font-medium
                        text-red-500
                      "
                    >
                      Message must not exceed 1,000 characters.
                    </p>
                  )
                }
              </div>
            </div>


            {/* =================================================
                FOOTER
            ================================================= */}

            <div
              className="
                flex
                items-center
                justify-between
                rounded-b-[14px]
                border-t
                border-slate-200
                bg-[#F3F5FF]
                px-5
                py-3
              "
            >
              <div
                className={`
                  text-xs
                  ${
                    messageWithinLimit
                      ? "text-slate-500"
                      : "font-semibold text-red-500"
                  }
                `}
              >
                {
                  messagePlain.length
                }{" "}
                /{" "}
                {
                  MAX_MESSAGE_LENGTH
                }
              </div>


              <button
                type="button"
                disabled={
                  sendDisabled
                }
                onClick={
                  handleSendEmail
                }
                className={`
                  rounded-lg
                  px-4
                  py-2
                  text-sm
                  font-semibold
                  text-white
                  transition

                  ${
                    sendDisabled
                      ? "cursor-not-allowed bg-emerald-300"
                      : "cursor-pointer bg-emerald-600 hover:brightness-95"
                  }
                `}
              >
                {
                  isSending
                    ? "Sending..."
                    : "Send ➤"
                }
              </button>
            </div>
          </article>


          {/* =================================================
              API ERROR
          ================================================= */}

          {
            error && (
              <div
                className="
                  mt-4
                  rounded-lg
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-3
                "
              >
                <p
                  className="
                    text-xs
                    text-red-600
                  "
                >
                  {error}
                </p>
              </div>
            )
          }
        </div>


        {/* ===================================================
            SENT HISTORY
        =================================================== */}

        <aside>
          <div
            className="
              w-full
            "
          >
            <div
              className="
                mb-4
              "
            >
              <div
                className="
                  mb-2
                  text-sm
                  font-semibold
                "
              >
                Sent History
              </div>


              <div
                className="
                  relative
                "
              >
                <Search
                  size={14}
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-gray-400
                  "
                />


                <input
                  type="text"
                  value={
                    historySearch
                  }
                  onChange={(
                    event
                  ) =>
                    setHistorySearch(
                      event.target.value
                    )
                  }
                  placeholder="Search sent emails..."
                  className="
                    w-full
                    rounded-md
                    border
                    border-gray-200
                    px-3
                    py-2
                    pl-10
                    text-sm
                    text-gray-700
                    placeholder-gray-400
                    focus:border-emerald-500
                    focus:outline-none
                    focus:ring-1
                    focus:ring-emerald-500
                  "
                />
              </div>
            </div>


            {
              isLoadingHistory ? (
                <div
                  className="
                    rounded-lg
                    border
                    border-slate-100
                    bg-[#F8FAFF]
                    px-4
                    py-8
                    text-center
                  "
                >
                  <div
                    className="
                      mx-auto
                      h-6
                      w-6
                      animate-spin
                      rounded-full
                      border-2
                      border-gray-200
                      border-t-emerald-600
                    "
                  />

                  <p
                    className="
                      mt-3
                      text-xs
                      text-slate-500
                    "
                  >
                    Loading sent emails...
                  </p>
                </div>
              ) : filteredHistory.length >
                0 ? (
                <div
                  className="
                    max-h-[620px]
                    space-y-3
                    overflow-y-auto
                    pr-1
                  "
                >
                  {
                    filteredHistory.map(
                      (
                        item
                      ) => {
                        const historyId =
                          item
                            ?.email_history_id ||
                          item
                            ?.id;


                        return (
                          <div
                            key={
                              historyId
                            }
                            className="
                              rounded-md
                              border
                              border-slate-100
                              bg-[#F8FAFF]
                              px-4
                              py-3
                              text-sm
                            "
                          >
                            <div
                              className="
                                break-words
                                font-semibold
                                text-slate-800
                              "
                            >
                              {
                                displayValue(
                                  item
                                    ?.subject,
                                  "Untitled Email"
                                )
                              }
                            </div>


                            <div
                              className="
                                mt-0.5
                                text-xs
                                text-slate-500
                              "
                            >
                              To:{" "}

                              {
                                displayValue(
                                  item
                                    ?.recipient_label,
                                  "Recipient"
                                )
                              }
                            </div>


                            {
                              Number(
                                item
                                  ?.recipient_count ||
                                0
                              ) > 0 && (
                                <div
                                  className="
                                    mt-0.5
                                    text-xs
                                    text-slate-400
                                  "
                                >
                                  {
                                    Number(
                                      item
                                        ?.recipient_count
                                    ).toLocaleString()
                                  }{" "}
                                  {
                                    Number(
                                      item
                                        ?.recipient_count
                                    ) === 1
                                      ? "recipient"
                                      : "recipients"
                                  }
                                </div>
                              )
                            }


                            <div
                              className="
                                mt-1
                                text-xs
                                text-slate-400
                              "
                            >
                              {
                                formatDateTime(
                                  item
                                    ?.sent_at
                                )
                              }
                            </div>


                            <div
                              className="
                                mt-2
                                text-right
                              "
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleViewEmail(
                                    item
                                  )
                                }
                                className="
                                  cursor-pointer
                                  text-sm
                                  font-medium
                                  text-emerald-600
                                  transition
                                  hover:text-emerald-700
                                "
                              >
                                View
                              </button>
                            </div>
                          </div>
                        );
                      }
                    )
                  }
                </div>
              ) : (
                <div
                  className="
                    rounded-lg
                    border
                    border-dashed
                    border-slate-200
                    bg-[#F8FAFF]
                    px-4
                    py-8
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
                    {
                      historySearch.trim()
                        ? "No matching sent emails."
                        : "No sent emails yet."
                    }
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-slate-400
                    "
                  >
                    {
                      historySearch.trim()
                        ? "Try another search keyword."
                        : "Successfully sent emails will appear here."
                    }
                  </p>
                </div>
              )
            }
          </div>
        </aside>
      </div>


      {/* =====================================================
          SENT EMAIL DETAILS
      ===================================================== */}

      <SentEmailDetailsModal
        isOpen={
          detailsModalOpen
        }
        onClose={
          handleCloseDetails
        }
        email={
          selectedEmailDetails
        }
        isLoading={
          isLoadingDetails
        }
      />
    </div>
  );
}