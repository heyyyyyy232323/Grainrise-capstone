import { useCallback, useState } from "react";

// ============================================================
// INITIAL SAMPLE DATA
// ============================================================

const INITIAL_OPPORTUNITIES = [
  {
    posting_id: 1,
    posting_code: "OPP-2026-001",
    business_name: "Golden Grains Rice Mill",
    organization_name: "Golden Grains Corporation",
    miller_name: "Eduardo Santos",
    rice_variety: "RC 222 (Tubigan 18)",
    product_grade: "Grade 1 (Premium)",
    product_type: "Dry Palay (14% MC)",
    required_quantity_kg: 25000,
    buying_price_per_kg: 23.5,
    application_deadline: "2026-11-30",
    required_fulfillment_date: "2026-12-20",
    business_province: "Nueva Ecija",
    business_municipality: "Cabanatuan City",
    business_barangay: "San Josef Sur",
    fulfillment_province: "Nueva Ecija",
    fulfillment_municipality: "Cabanatuan City",
    fulfillment_barangay: "San Josef Sur",
    has_active_application: false,
    created_at: "2026-10-01T08:00:00Z",
    product_image: null,
  },
  {
    posting_id: 2,
    posting_code: "OPP-2026-002",
    business_name: "Isabela Central Agri Processing",
    organization_name: "Isabela Central Milling Co.",
    miller_name: "Maria Ramos",
    rice_variety: "NSIC Rc 160",
    product_grade: "Grade 2 (Standard)",
    product_type: "Dry Palay (14% MC)",
    required_quantity_kg: 40000,
    buying_price_per_kg: 22.0,
    application_deadline: "2026-12-15",
    required_fulfillment_date: "2027-01-10",
    business_province: "Isabela",
    business_municipality: "Santiago City",
    business_barangay: "Rizal",
    fulfillment_province: "Isabela",
    fulfillment_municipality: "Santiago City",
    fulfillment_barangay: "Rizal",
    has_active_application: true,
    created_at: "2026-10-05T09:30:00Z",
    product_image: null,
  },
  {
    posting_id: 3,
    posting_code: "OPP-2026-003",
    business_name: "Plaridel Grain Logistics Mill",
    organization_name: "Plaridel Agro Resources",
    miller_name: "Roberto Tan",
    rice_variety: "Angelica Special",
    product_grade: "Premium Aromatic",
    product_type: "Clean & Dry Palay",
    required_quantity_kg: 15000,
    buying_price_per_kg: 25.0,
    application_deadline: "2026-11-15",
    required_fulfillment_date: "2026-12-05",
    business_province: "Bulacan",
    business_municipality: "Plaridel",
    business_barangay: "Banga 1st",
    fulfillment_province: "Bulacan",
    fulfillment_municipality: "Plaridel",
    fulfillment_barangay: "Banga 1st",
    has_active_application: false,
    created_at: "2026-10-10T11:00:00Z",
    product_image: null,
  },
];

const INITIAL_APPLICATIONS = [
  {
    application_id: 101,
    posting_id: 2,
    posting_code: "OPP-2026-002",
    business_name: "Isabela Central Agri Processing",
    miller_name: "Maria Ramos",
    organization_name: "Isabela Central Milling Co.",
    rice_variety: "NSIC Rc 160",
    quantity_to_commit_kg: 20000,
    offered_price_per_kg: 22.0,
    application_date: "2026-10-15",
    application_status: "under_review",
    remarks: "Delivery proposed in two batches of 10,000 kg.",
    created_at: "2026-10-15T14:00:00Z",
  },
  {
    application_id: 102,
    posting_id: 9,
    posting_code: "OPP-2026-009",
    business_name: "Cabanatuan Premier Milling",
    miller_name: "Carlos Mendoza",
    organization_name: "Cabanatuan Premier Rice Corp.",
    rice_variety: "RC 222 (Tubigan 18)",
    quantity_to_commit_kg: 10000,
    offered_price_per_kg: 23.0,
    application_date: "2026-09-10",
    application_status: "approved",
    remarks: "Contract generation underway.",
    created_at: "2026-09-10T09:00:00Z",
  },
];

const INITIAL_BIDDINGS = [
  {
    bidding_id: 201,
    bidding_code: "BID-2026-001",
    rice_variety: "RC 222 (Tubigan 18)",
    product_grade: "Grade 1",
    quantity_open_for_bidding_kg: 15000,
    minimum_acceptable_price_per_kg: 23.0,
    bidding_status: "active",
    bidding_deadline: "2026-11-25",
    proposed_fulfillment_date: "2026-12-18",
    created_at: "2026-10-20T10:00:00Z",
    offers_received: 2,
    offers: [
      {
        offer_id: 501,
        offer_code: "OFF-2026-001",
        bidding_id: 201,
        miller_name: "Eduardo Santos",
        business_name: "Golden Grains Rice Mill",
        organization_name: "Golden Grains Corporation",
        offered_buying_price_per_kg: 24.0,
        offered_quantity_kg: 15000,
        estimated_offer_value: 360000.0,
        offer_status: "pending",
        created_at: "2026-10-22T14:30:00Z",
        remarks: "Can pick up directly at farm gate via 10-wheeler truck.",
      },
      {
        offer_id: 502,
        offer_code: "OFF-2026-002",
        bidding_id: 201,
        miller_name: "Danilo Cruz",
        business_name: "Sunrise Valley Milling",
        organization_name: "Sunrise Valley Inc.",
        offered_buying_price_per_kg: 23.5,
        offered_quantity_kg: 15000,
        estimated_offer_value: 352500.0,
        offer_status: "pending",
        created_at: "2026-10-23T09:15:00Z",
        remarks: "Payment within 48 hours upon delivery to warehouse.",
      },
    ],
  },
];

const INITIAL_CONTRACTS = [
  {
    contract_id: 301,
    contract_code: "CTR-2026-088",
    miller_name: "Eduardo Santos",
    business_name: "Golden Grains Rice Mill",
    organization_name: "Golden Grains Corporation",
    rice_variety: "RC 222 (Tubigan 18)",
    product_grade: "Grade 1",
    product_type: "Dry Palay (14% MC)",
    product_code: "RC222-DRY",
    contracted_quantity_kg: 12000,
    remaining_quantity_kg: 4000,
    agreed_price_per_kg: 23.5,
    total_contract_value: 282000.0,
    contract_status: "active",
    fulfillment_status: "partially_fulfilled",
    contract_start_date: "2026-09-01",
    fulfillment_date: "2026-11-30",
    created_at: "2026-09-01T08:00:00Z",
  },
  {
    contract_id: 302,
    contract_code: "CTR-2026-042",
    miller_name: "Roberto Tan",
    business_name: "Plaridel Grain Logistics Mill",
    organization_name: "Plaridel Agro Resources",
    rice_variety: "Angelica Special",
    product_grade: "Premium Aromatic",
    product_type: "Clean & Dry Palay",
    product_code: "ANG-SPEC",
    contracted_quantity_kg: 9000,
    remaining_quantity_kg: 0,
    agreed_price_per_kg: 25.0,
    total_contract_value: 225000.0,
    contract_status: "completed",
    fulfillment_status: "fulfilled",
    contract_start_date: "2026-06-01",
    fulfillment_date: "2026-09-25",
    created_at: "2026-06-01T10:00:00Z",
  },
];

const INITIAL_THREADS = [
  {
    supplier_profile_id: 1,
    reference_type: "posting",
    reference_id: 1,
    reference_code: "OPP-2026-001",
    miller_name: "Eduardo Santos",
    miller_business_name: "Golden Grains Rice Mill",
    business_name: "Golden Grains Rice Mill",
    miller_organization_name: "Golden Grains Corporation",
    organization_name: "Golden Grains Corporation",
    latest_message: "Good day! We are prepared to inspect your harvest next week.",
    latest_message_at: "2026-10-26T15:30:00Z",
    unread_count: 1,
  },
  {
    supplier_profile_id: 2,
    reference_type: "bidding",
    reference_id: 201,
    reference_code: "BID-2026-001",
    miller_name: "Danilo Cruz",
    miller_business_name: "Sunrise Valley Milling",
    business_name: "Sunrise Valley Milling",
    miller_organization_name: "Sunrise Valley Inc.",
    organization_name: "Sunrise Valley Inc.",
    latest_message: "We submitted our offer of P23.50/kg for your 15,000kg lot.",
    latest_message_at: "2026-10-23T09:15:00Z",
    unread_count: 0,
  },
];

const INITIAL_MESSAGES_BY_REF = {
  "posting_1": [
    {
      message_id: 1,
      sender_type: "miller",
      message_text: "Hello! We saw your farm profile in Nueva Ecija. Are you interested in our OPP-2026-001 contract?",
      created_at: "2026-10-26T14:10:00Z",
    },
    {
      message_id: 2,
      sender_type: "farmer",
      message_text: "Yes, Eduardo. We expect around 14,500 kg of RC 222 harvested by mid-December at 14% moisture.",
      created_at: "2026-10-26T14:45:00Z",
    },
    {
      message_id: 3,
      sender_type: "miller",
      message_text: "Good day! We are prepared to inspect your harvest next week.",
      created_at: "2026-10-26T15:30:00Z",
    },
  ],
  "bidding_201": [
    {
      message_id: 4,
      sender_type: "miller",
      message_text: "We submitted our offer of P23.50/kg for your 15,000kg lot.",
      created_at: "2026-10-23T09:15:00Z",
    },
  ],
};

// ============================================================
// HOOK
// ============================================================

export default function useFarmerContracts() {
  const [opportunities, setOpportunities] = useState(INITIAL_OPPORTUNITIES);
  const [applications, setApplications] = useState(INITIAL_APPLICATIONS);
  const [biddings, setBiddings] = useState(INITIAL_BIDDINGS);
  const [contracts, setContracts] = useState(INITIAL_CONTRACTS);

  const [messageThreads, setMessageThreads] = useState(INITIAL_THREADS);
  const [messages, setMessages] = useState(INITIAL_MESSAGES_BY_REF["posting_1"]);
  const [messagesMap, setMessagesMap] = useState(INITIAL_MESSAGES_BY_REF);

  const [selectedOpportunity, setSelectedOpportunity] = useState(INITIAL_OPPORTUNITIES[0]);
  const [selectedApplication, setSelectedApplication] = useState(INITIAL_APPLICATIONS[0]);
  const [selectedBidding, setSelectedBidding] = useState(INITIAL_BIDDINGS[0]);
  const [selectedOffer, setSelectedOffer] = useState(INITIAL_BIDDINGS[0].offers[0]);
  const [selectedContract, setSelectedContract] = useState(INITIAL_CONTRACTS[0]);
  const [selectedMessageThread, setSelectedMessageThread] = useState(INITIAL_THREADS[0]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [profanityBlock, setProfanityBlock] = useState(null);

  // =========================================================
  // GENERAL
  // =========================================================

  const clearError = useCallback(() => setError(""), []);
  const clearProfanityBlock = useCallback(() => setProfanityBlock(null), []);

  // =========================================================
  // APPLICATIONS
  // =========================================================

  const loadApplications = useCallback(async () => {
    setIsLoading(false);
    return applications;
  }, [applications]);

  const loadApplicationDetails = useCallback(
    async (appId) => {
      const app = applications.find((a) => Number(a.application_id) === Number(appId));
      if (app) setSelectedApplication(app);
      return app;
    },
    [applications]
  );

  const cancelApplication = useCallback(
    async (appId, reason = "") => {
      setIsSaving(true);
      const targetId = Number(appId);
      setApplications((prev) =>
        prev.map((a) =>
          Number(a.application_id) === targetId
            ? { ...a, application_status: "cancelled", cancel_reason: reason }
            : a
        )
      );
      setIsSaving(false);
      return { success: true };
    },
    []
  );

  // =========================================================
  // OFFERS / BIDDINGS
  // =========================================================

  const loadBiddings = useCallback(async () => {
    setIsLoading(false);
    return biddings;
  }, [biddings]);

  const createBidding = useCallback(async (payload) => {
    setIsSaving(true);
    const newBidding = {
      bidding_id: Date.now(),
      bidding_code: `BID-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      rice_variety: payload.rice_variety || "RC 222 (Tubigan 18)",
      product_grade: payload.product_grade || "Grade 1",
      quantity_open_for_bidding_kg: Number(payload.quantity_open_for_bidding_kg || 10000),
      minimum_acceptable_price_per_kg: Number(payload.minimum_acceptable_price_per_kg || 22),
      bidding_status: "active",
      bidding_deadline: payload.bidding_deadline || "2026-12-31",
      proposed_fulfillment_date: payload.proposed_fulfillment_date || "2027-01-15",
      created_at: new Date().toISOString(),
      offers_received: 0,
      offers: [],
    };
    setBiddings((prev) => [newBidding, ...prev]);
    setIsSaving(false);
    return { success: true, data: newBidding };
  }, []);

  const loadBiddingDetails = useCallback(
    async (bidId) => {
      const bid = biddings.find((b) => Number(b.bidding_id) === Number(bidId));
      if (bid) setSelectedBidding(bid);
      return bid;
    },
    [biddings]
  );

  const loadOfferDetails = useCallback(
    async (offerId) => {
      for (const b of biddings) {
        const found = (b.offers || []).find((o) => Number(o.offer_id) === Number(offerId));
        if (found) {
          setSelectedOffer(found);
          return found;
        }
      }
      return null;
    },
    [biddings]
  );

  const acceptOffer = useCallback(
    async (offerId) => {
      setIsSaving(true);
      const targetId = Number(offerId);
      let acceptedOfferObj = null;

      setBiddings((prev) =>
        prev.map((b) => {
          const hasOffer = (b.offers || []).some((o) => Number(o.offer_id) === targetId);
          if (!hasOffer) return b;
          return {
            ...b,
            bidding_status: "awarded",
            offers: b.offers.map((o) => {
              if (Number(o.offer_id) === targetId) {
                acceptedOfferObj = { ...o, offer_status: "accepted" };
                return acceptedOfferObj;
              }
              return { ...o, offer_status: "rejected" };
            }),
          };
        })
      );

      if (acceptedOfferObj) {
        const newContract = {
          contract_id: Date.now(),
          contract_code: `CTR-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
          miller_name: acceptedOfferObj.miller_name,
          business_name: acceptedOfferObj.business_name,
          organization_name: acceptedOfferObj.organization_name,
          rice_variety: "RC 222 (Tubigan 18)",
          product_grade: "Grade 1",
          product_type: "Dry Palay (14% MC)",
          product_code: "RC222-DRY",
          contracted_quantity_kg: acceptedOfferObj.offered_quantity_kg,
          remaining_quantity_kg: acceptedOfferObj.offered_quantity_kg,
          agreed_price_per_kg: acceptedOfferObj.offered_buying_price_per_kg,
          total_contract_value: acceptedOfferObj.estimated_offer_value,
          contract_status: "active",
          fulfillment_status: "pending_fulfillment",
          contract_start_date: new Date().toISOString().split("T")[0],
          fulfillment_date: "2026-12-31",
          created_at: new Date().toISOString(),
        };
        setContracts((prev) => [newContract, ...prev]);
      }

      setIsSaving(false);
      return { success: true };
    },
    []
  );

  const declineOffer = useCallback(
    async (offerId) => {
      setIsSaving(true);
      const targetId = Number(offerId);
      setBiddings((prev) =>
        prev.map((b) => ({
          ...b,
          offers: (b.offers || []).map((o) =>
            Number(o.offer_id) === targetId ? { ...o, offer_status: "declined" } : o
          ),
        }))
      );
      setIsSaving(false);
      return { success: true };
    },
    []
  );

  // =========================================================
  // OPPORTUNITIES
  // =========================================================

  const loadOpportunities = useCallback(async () => {
    setIsLoading(false);
    return opportunities;
  }, [opportunities]);

  const loadOpportunityDetails = useCallback(
    async (postingId) => {
      const opp = opportunities.find((o) => Number(o.posting_id) === Number(postingId));
      if (opp) setSelectedOpportunity(opp);
      return opp;
    },
    [opportunities]
  );

  const submitApplication = useCallback(
    async (postingId, payload) => {
      setIsSaving(true);
      const opp = opportunities.find((o) => Number(o.posting_id) === Number(postingId));
      const newApp = {
        application_id: Date.now(),
        posting_id: Number(postingId),
        posting_code: opp?.posting_code || `OPP-${postingId}`,
        business_name: opp?.business_name || "Partner Rice Mill",
        miller_name: opp?.miller_name || "Miller Manager",
        organization_name: opp?.organization_name || "",
        rice_variety: opp?.rice_variety || "RC 222 (Tubigan 18)",
        quantity_to_commit_kg: Number(payload.quantity_to_commit_kg || 5000),
        offered_price_per_kg: Number(payload.offered_price_per_kg || opp?.buying_price_per_kg || 23),
        application_date: new Date().toISOString().split("T")[0],
        application_status: "submitted",
        remarks: payload.remarks || "",
        created_at: new Date().toISOString(),
      };

      setApplications((prev) => [newApp, ...prev]);
      setOpportunities((prev) =>
        prev.map((o) =>
          Number(o.posting_id) === Number(postingId) ? { ...o, has_active_application: true } : o
        )
      );

      setIsSaving(false);
      return { success: true, data: newApp };
    },
    [opportunities]
  );

  // =========================================================
  // CURRENT CONTRACTS
  // =========================================================

  const loadContracts = useCallback(async () => {
    setIsLoading(false);
    return contracts;
  }, [contracts]);

  const loadContractDetails = useCallback(
    async (contractId) => {
      const c = contracts.find((item) => Number(item.contract_id) === Number(contractId));
      if (c) setSelectedContract(c);
      return c;
    },
    [contracts]
  );

  const signContract = useCallback(async (contractId) => {
    setIsSaving(true);
    const targetId = Number(contractId);
    setContracts((prev) =>
      prev.map((c) =>
        Number(c.contract_id) === targetId ? { ...c, is_signed_by_farmer: true } : c
      )
    );
    setIsSaving(false);
    return { success: true };
  }, []);

  const requestVoid = useCallback(async (contractId, reason = "") => {
    setIsSaving(true);
    const targetId = Number(contractId);
    setContracts((prev) =>
      prev.map((c) =>
        Number(c.contract_id) === targetId
          ? { ...c, contract_status: "void_requested", void_reason: reason }
          : c
      )
    );
    setIsSaving(false);
    return { success: true };
  }, []);

  // =========================================================
  // MESSAGES
  // =========================================================

  const getThreadKey = (thread) =>
    thread ? `${thread.reference_type}_${thread.reference_id}` : "posting_1";

  const loadMessageThreads = useCallback(async () => {
    setIsLoadingMessages(false);
    return messageThreads;
  }, [messageThreads]);

  const loadMessages = useCallback(
    async (thread) => {
      setIsLoadingMessages(false);
      const key = getThreadKey(thread);
      const msgs = messagesMap[key] || [];
      setMessages(msgs);
      return msgs;
    },
    [messagesMap]
  );

  const selectMessageThread = useCallback(
    (thread) => {
      setSelectedMessageThread(thread);
      const key = getThreadKey(thread);
      setMessages(messagesMap[key] || []);
      // Mark read
      setMessageThreads((prev) =>
        prev.map((t) =>
          t.reference_id === thread.reference_id && t.reference_type === thread.reference_type
            ? { ...t, unread_count: 0 }
            : t
        )
      );
    },
    [messagesMap]
  );

  const sendMessage = useCallback(
    async (text) => {
      if (!text || !text.trim()) return;
      const key = getThreadKey(selectedMessageThread);
      const newMsg = {
        message_id: Date.now(),
        sender_type: "farmer",
        message_text: text.trim(),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newMsg]);
      setMessagesMap((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), newMsg],
      }));

      setMessageThreads((prev) =>
        prev.map((t) => {
          if (
            t.reference_id === selectedMessageThread?.reference_id &&
            t.reference_type === selectedMessageThread?.reference_type
          ) {
            return {
              ...t,
              latest_message: text.trim(),
              latest_message_at: new Date().toISOString(),
            };
          }
          return t;
        })
      );

      return { success: true, data: newMsg };
    },
    [selectedMessageThread]
  );

  const clearMessageConversation = useCallback(() => {
    setSelectedMessageThread(null);
    setMessages([]);
  }, []);

  return {
    applications,
    biddings,
    opportunities,
    contracts,

    messageThreads,
    messages,

    selectedApplication,
    selectedBidding,
    selectedOffer,
    selectedOpportunity,
    selectedContract,
    selectedMessageThread,

    isLoading,
    isSaving,
    isLoadingMessages,

    error,
    profanityBlock,

    setApplications,
    setBiddings,
    setOpportunities,
    setContracts,

    setSelectedApplication,
    setSelectedBidding,
    setSelectedOffer,
    setSelectedOpportunity,
    setSelectedContract,

    setMessageThreads,
    setMessages,
    setSelectedMessageThread,

    clearError,
    clearProfanityBlock,

    loadApplications,
    loadApplicationDetails,
    cancelApplication,

    loadBiddings,
    createBidding,
    loadBiddingDetails,

    loadOfferDetails,
    acceptOffer,
    declineOffer,

    loadOpportunities,
    loadOpportunityDetails,
    submitApplication,

    loadContracts,
    loadContractDetails,
    signContract,
    requestVoid,

    loadMessageThreads,
    loadMessages,
    selectMessageThread,
    sendMessage,
    clearMessageConversation,
  };
}
