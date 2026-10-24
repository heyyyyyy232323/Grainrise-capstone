import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  User,
  X,
  Send,
  Inbox,
  RotateCw,
  Eye,
  EyeOff,
  Calendar,
  Tag,
  Hash,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Mail,
} from "lucide-react";

import ReceivedSupportDetailsModal from "../../../Components/Modals/ReceivedSupportDetailsModal";

import {
  useLocation,
} from "react-router-dom";

import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import RichTextEditor from "../../../Components/Minor-Components/RichTextEditor";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Toast from "../../../Components/Modals/Toast";

import SentEmailDetailsModal from "../../../Components/Modals/SentEmailDetailsModal";

import useToast from "../../../Components/hooks/useToast";
import useEmailUsers from "../../../Components/hooks/AccountAdmin/useEmailUsers";


// ============================================================
// CONSTANTS
// ============================================================

const MAX_MESSAGE_LENGTH = 1000;
const RECEIVED_MESSAGES_PAGE_SIZE = 10;


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

    receivedMessages,
    unreadReceivedCount,
    totalReceivedCount,
    isLoadingReceived,
    loadReceivedMessages,
    refreshReceivedMessages,
    getReceivedMessageDetails,
    markReceivedMessageRead,
    updateReceivedMessageStatus,
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

  // =========================================================
  // TABS & RECEIVED MESSAGES STATE
  // =========================================================

  const [activeTab, setActiveTab] = useState("sent");
  const [receivedSearch, setReceivedSearch] = useState("");
  const [receivedCategoryFilter, setReceivedCategoryFilter] = useState("all");
  const [receivedStatusFilter, setReceivedStatusFilter] = useState("all");
  const [receivedPage, setReceivedPage] = useState(1);
  const [selectedReceivedMessage, setSelectedReceivedMessage] = useState(null);
  const [isReceivedDetailsOpen, setIsReceivedDetailsOpen] = useState(false);

  const filteredReceivedMessages = useMemo(() => {
    return (receivedMessages || []).filter((msg) => {
      const msgStatus = String(msg.status || (msg.is_read ? "read" : "unread")).toLowerCase();
      if (receivedStatusFilter !== "all" && msgStatus !== receivedStatusFilter.toLowerCase()) {
        return false;
      }
      if (
        receivedCategoryFilter !== "all" &&
        String(msg.concern_category || "").toLowerCase() !== receivedCategoryFilter.toLowerCase()
      ) {
        return false;
      }
      if (receivedSearch.trim()) {
        const query = receivedSearch.toLowerCase();
        const name = String(msg.full_name || "").toLowerCase();
        const email = String(msg.email || "").toLowerCase();
        const subject = String(msg.subject || "").toLowerCase();
        const ref = String(msg.reference_id || "").toLowerCase();
        const desc = String(msg.description || "").toLowerCase();
        if (
          !name.includes(query) &&
          !email.includes(query) &&
          !subject.includes(query) &&
          !ref.includes(query) &&
          !desc.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [receivedMessages, receivedSearch, receivedCategoryFilter, receivedStatusFilter]);

  const receivedTotalPages = Math.max(
    1,
    Math.ceil(filteredReceivedMessages.length / RECEIVED_MESSAGES_PAGE_SIZE)
  );

  const paginatedReceivedMessages = useMemo(() => {
    const startIndex = (receivedPage - 1) * RECEIVED_MESSAGES_PAGE_SIZE;
    return filteredReceivedMessages.slice(
      startIndex,
      startIndex + RECEIVED_MESSAGES_PAGE_SIZE
    );
  }, [filteredReceivedMessages, receivedPage]);

  useEffect(() => {
    setReceivedPage(1);
  }, [receivedSearch, receivedCategoryFilter, receivedStatusFilter]);

  useEffect(() => {
    setReceivedPage((currentPage) => Math.min(currentPage, receivedTotalPages));
  }, [receivedTotalPages]);

  const handleOpenReceivedDetails = async (msg) => {
    setSelectedReceivedMessage(msg);
    setIsReceivedDetailsOpen(true);
    const id = msg.id || msg.support_id;
    const currentStatus = String(msg.status || (msg.is_read ? "read" : "unread")).toLowerCase();
    if (currentStatus === "unread") {
      await updateReceivedMessageStatus(id, "read");
      setSelectedReceivedMessage((prev) => prev ? { ...prev, status: "read", is_read: 1 } : prev);
    }
  };

  const handleUpdateSupportStatus = async (supportId, newStatus) => {
    const success = await updateReceivedMessageStatus(supportId, newStatus);
    if (success) {
      setSelectedReceivedMessage((prev) => prev ? { ...prev, status: newStatus, is_read: newStatus === "unread" ? 0 : 1 } : prev);
      showToast({
        type: "success",
        title: "Status Updated",
        message: `Inquiry status changed to ${newStatus}.`,
        duration: 3000,
      });
    }
  };

  const handleReplyToSupport = (supportMsg) => {
    setActiveTab("sent");
    setRecipientType("specific_user");
    const supportId = supportMsg.id || supportMsg.support_id;
    setSelectedRecipient({
      recipient_type: "support_inquiry",
      recipient_id: supportId,
      support_id: supportId,
      user_id: null,
      inquiry_id: null,
      full_name: supportMsg.full_name,
      first_name: supportMsg.full_name,
      last_name: "",
      business_name: "",
      email: supportMsg.email,
      username: "",
      user_role: supportMsg.user_role || "Support User",
    });
    setSubject(
      supportMsg.subject.toLowerCase().startsWith("re:")
        ? supportMsg.subject
        : `Re: ${supportMsg.subject}`
    );
    const quoteHtml = `<p>Hi ${supportMsg.full_name},</p><p><br></p><p>Thank you for reaching out to GrainRise Support regarding your concern (${supportMsg.concern_category}${supportMsg.reference_id ? ` - Ref: ${supportMsg.reference_id}` : ""}).</p><p><br></p><hr><p style="color:#64748b;font-size:12px;"><strong>Original Support Inquiry from ${supportMsg.full_name} (${supportMsg.email}):</strong><br>${supportMsg.description.replace(/\n/g, '<br>')}</p>`;
    setMessageHtml(quoteHtml);
    setMessagePlain(`Hi ${supportMsg.full_name},\n\nThank you for reaching out to GrainRise Support.\n\n---\nOriginal Support Inquiry:\n${supportMsg.description}`);
    setEditorKey((prev) => prev + 1);
    showToast(`Composing reply to ${supportMsg.full_name}`, "info");
  };

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

      setRecipientType(
        "all_users"
      );

      setRecipientSearch(
        ""
      );

      setRecipientPickerOpen(
        false
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
          recipientType === "specific_user" || Boolean(selectedRecipient);

        const subRecipientType =
          isSpecific
            ? (selectedRecipient?.recipient_type || "support_inquiry")
            : recipientType;

        const subRecipientId =
          selectedRecipient?.recipient_id ||
          selectedRecipient?.user_id ||
          selectedRecipient?.inquiry_id ||
          selectedRecipient?.support_id ||
          null;

        const response =
          await sendEmail({
            recipientType: isSpecific ? "specific_user" : recipientType,
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
              selectedRecipient?.email || "",

            recipientName:
              selectedRecipient?.full_name || "",
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
              isSpecific && (subRecipientType === "support_inquiry" || subRecipientType === "support_contact")
                ? "Reply sent successfully. Inquiry marked as Replied."
                : (response?.message || "The email was sent successfully."),

            duration:
              5000,
          });
        }

        if (
          isSpecific &&
          (subRecipientType === "support_inquiry" || subRecipientType === "support_contact") &&
          subRecipientId
        ) {
          updateReceivedMessageStatus(subRecipientId, "replied").catch(() => {});
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
          TABS: SENT EMAILS / RECEIVED SUPPORT MESSAGES
      ===================================================== */}

      <div className="mb-6 flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("sent")}
          className={`relative pb-3 px-4 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "sent"
              ? "text-emerald-700 border-emerald-600"
              : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Send size={15} />
          <span>Sent Emails</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("received")}
          className={`relative pb-3 px-4 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "received"
              ? "text-emerald-700 border-emerald-600"
              : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Inbox size={15} />
          <span>Received (Support Inquiries)</span>
          {unreadReceivedCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
              {unreadReceivedCount}
            </span>
          )}
        </button>
      </div>

      {/* =====================================================
          TAB 1: SENT EMAILS (COMPOSER & SENT HISTORY)
      ===================================================== */}

      {activeTab === "sent" && (
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
                {
                  selectedRecipient ? (
                    /* USER DIRECTLY IN SEND TO */
                    <div
                      className="
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
                                selectedRecipient?.full_name,
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
                                selectedRecipient?.email
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
                              selectedRecipient?.user_role && (
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
                                      selectedRecipient?.user_role
                                    )
                                  }
                                </span>
                              )
                            }

                            {
                              selectedRecipient?.status && (
                                <span
                                  className={`
                                    rounded-full
                                    border
                                    px-2
                                    py-0.5
                                    text-[10px]
                                    font-semibold
                                    ${getStatusClasses(
                                      selectedRecipient?.status
                                    )}
                                  `}
                                >
                                  {
                                    formatLabel(
                                      selectedRecipient?.status
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
                  ) : (
                    /* GROUP DROPDOWN WHEN NO SPECIFIC RECIPIENT SELECTED */
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
                  )
                }
              </div>


              {/* ===============================================
                  SPECIFIC USER SEARCH PICKER (WHEN CHOSEN BUT NOT YET SELECTED)
              =============================================== */}

              {
                recipientType ===
                  "specific_user" && !selectedRecipient && (
                  <div
                    className="
                      mt-4
                    "
                  >





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
      )}

      {/* =====================================================
          TAB 2: RECEIVED SUPPORT INQUIRIES
      ===================================================== */}

      {activeTab === "received" && (
        <div className="w-full">
          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] max-w-xs flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={receivedSearch}
                  onChange={(e) => setReceivedSearch(e.target.value)}
                  placeholder="Search sender, subject, reference..."
                  className="h-[38px] w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <select
                value={receivedCategoryFilter}
                onChange={(e) => setReceivedCategoryFilter(e.target.value)}
                className="h-[38px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:w-auto"
              >
                <option value="all">All Concern Categories</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Account Access & Security">Account Access & Security</option>
                <option value="Order & Transaction Problem">Order & Transaction Problem</option>
                <option value="Registration / Verification">Registration / Verification</option>
                <option value="Inventory & Warehouse Sync">Inventory & Warehouse Sync</option>
                <option value="Billing & Payments">Billing & Payments</option>
                <option value="Other">Other</option>
              </select>

              <select
                value={receivedStatusFilter}
                onChange={(e) => setReceivedStatusFilter(e.target.value)}
                className="h-[38px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:w-auto"
              >
                <option value="all">All Statuses (Unread, Read, Replied)</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="replied">Replied</option>
              </select>

              <button
                type="button"
                onClick={() => refreshReceivedMessages()}
                disabled={isLoadingReceived}
                className="inline-flex h-[38px] items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <RotateCw size={13} className={isLoadingReceived ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {isLoadingReceived ? (
            <div className="rounded-[14px] border border-slate-200 bg-white py-16 text-center shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-600" />
              <p className="mt-3 text-xs text-gray-500">Loading received support inquiries...</p>
            </div>
          ) : (
            <SectionedTableCard
              columns={[
                {
                  key: "sender",
                  label: "Sender",
                  renderCell: (msg) => (
                    <>
                      <div className="font-semibold text-gray-900">{msg.full_name}</div>
                      <div className="text-[11px] text-gray-500">{msg.email}</div>
                      {msg.user_role && (
                        <span className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                          {msg.user_role}
                        </span>
                      )}
                    </>
                  ),
                },
                {
                  key: "category",
                  label: "Category & Ref",
                  renderCell: (msg) => (
                    <>
                      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {msg.concern_category}
                      </span>
                      {msg.reference_id && (
                        <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-gray-500">
                          <Hash size={10} className="text-gray-400" />
                          {msg.reference_id}
                        </div>
                      )}
                    </>
                  ),
                },
                {
                  key: "subject",
                  label: "Subject & Preview",
                  renderCell: (msg) => {
                    const status = String(msg.status || (msg.is_read ? "read" : "unread")).toLowerCase();
                    return (
                      <div className="max-w-xs">
                        <div className={`truncate ${status === "unread" ? "font-bold text-gray-900" : "text-gray-800"}`}>
                          {msg.subject}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-gray-500">{msg.description}</div>
                      </div>
                    );
                  },
                },
                {
                  key: "status",
                  label: "Status",
                  cellClassName: "text-center",
                  renderCell: (msg) => {
                    const status = String(msg.status || (msg.is_read ? "read" : "unread")).toLowerCase();
                    const statusStyles = {
                      replied: "border-emerald-200 bg-emerald-50 text-emerald-700",
                      read: "border-slate-200 bg-slate-100 text-slate-700",
                      unread: "border-red-200 bg-red-50 text-red-700",
                    };
                    const dotStyles = {
                      replied: "bg-emerald-500",
                      read: "bg-slate-400",
                      unread: "bg-red-500",
                    };
                    return (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusStyles[status] || statusStyles.read}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status] || dotStyles.read}`} />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    );
                  },
                },
                {
                  key: "created_at",
                  label: "Date Received",
                  renderCell: (msg) => (
                    <span className="whitespace-nowrap text-[11px] text-gray-500">
                      {new Date(msg.created_at).toLocaleString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  ),
                },
                {
                  key: "action",
                  label: "Actions",
                  cellClassName: "text-right",
                  renderCell: (msg) => (
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenReceivedDetails(msg)}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReplyToSupport(msg)}
                        title="Reply to this user"
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                      >
                        <Send size={12} />
                        <span>Reply</span>
                      </button>
                    </div>
                  ),
                },
              ]}
              sections={[
                {
                  rows: paginatedReceivedMessages,
                },
              ]}
              currentPage={receivedPage}
              totalPages={receivedTotalPages}
              onPageChange={setReceivedPage}
              footerLabel={`Showing ${
                filteredReceivedMessages.length === 0
                  ? 0
                  : (receivedPage - 1) * RECEIVED_MESSAGES_PAGE_SIZE + 1
              }-${Math.min(
                receivedPage * RECEIVED_MESSAGES_PAGE_SIZE,
                filteredReceivedMessages.length
              )} of ${filteredReceivedMessages.length} inquiries`}
              onRowClick={handleOpenReceivedDetails}
              rowClassName={(msg) => {
                const status = String(msg.status || (msg.is_read ? "read" : "unread")).toLowerCase();
                return status === "unread" ? "bg-red-50/20 font-medium" : "";
              }}
              emptyStateTitle={
                receivedSearch.trim() || receivedCategoryFilter !== "all" || receivedStatusFilter !== "all"
                  ? "No matching inquiries found"
                  : "No support inquiries yet"
              }
              emptyStateDescription={
                receivedSearch.trim() || receivedCategoryFilter !== "all" || receivedStatusFilter !== "all"
                  ? "Try adjusting your search terms or filters to find what you are looking for."
                  : "When users submit concerns via the Contact Support form, they will be listed here."
              }
            />
          )}
        </div>
      )}


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

      {/* =====================================================
          RECEIVED SUPPORT MESSAGE DETAILS MODAL
      ===================================================== */}

      <ReceivedSupportDetailsModal
        isOpen={isReceivedDetailsOpen}
        onClose={() => {
          setIsReceivedDetailsOpen(false);
          setSelectedReceivedMessage(null);
        }}
        message={selectedReceivedMessage}
        onToggleRead={(id, isRead) => handleUpdateSupportStatus(id, isRead ? "read" : "unread")}
        onUpdateStatus={handleUpdateSupportStatus}
        onReply={handleReplyToSupport}
      />
    </div>
  );
}