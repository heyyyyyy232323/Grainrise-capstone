import { useCallback, useState } from "react";
import useApi from "../useApi";

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
  const { request } = useApi();

  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [biddings, setBiddings] = useState([]);
  const [contracts, setContracts] = useState([]);

  const [messageThreads, setMessageThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messagesMap, setMessagesMap] = useState({});

  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedBidding, setSelectedBidding] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedMessageThread, setSelectedMessageThread] = useState(null);

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

  const loadApplications = useCallback(
    async (filters = {}) => {
      setIsLoading(true);
      setError("");
      try {
        const queryParams = new URLSearchParams();
        if (filters.search) queryParams.append("search", filters.search);
        if (filters.status) queryParams.append("status", filters.status);
        if (filters.year) queryParams.append("year", filters.year);
        if (filters.month) queryParams.append("month", filters.month);
        if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);

        const qs = queryParams.toString();
        const url = `/farmer/contracts/applications/${qs ? `?${qs}` : ""}`;
        const res = await request(url, { method: "GET" });
        const list = res?.applications || res?.data || [];
        setApplications(list);
        return list;
      } catch (err) {
        const msg = err?.message || "Failed to load contract applications.";
        setError(msg);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [request]
  );

  const loadApplicationDetails = useCallback(
    async (appId) => {
      setIsLoading(true);
      setError("");
      try {
        const res = await request(`/farmer/contracts/applications/${appId}/`, {
          method: "GET",
        });
        const app = res?.application || res?.data || null;
        setSelectedApplication(app);
        return app;
      } catch (err) {
        const msg = err?.message || "Failed to load application details.";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [request]
  );

  const cancelApplication = useCallback(
    async (appId, payload) => {
      setIsSaving(true);
      setError("");
      try {
        let reason = "";
        let remarks = "";
        if (typeof payload === "object" && payload !== null) {
          reason = payload.cancellationReason || payload.reason || "";
          remarks = payload.cancellationRemarks || payload.remarks || "";
        } else {
          reason = String(payload || "");
        }

        const res = await request(`/farmer/contracts/applications/${appId}/cancel/`, {
          method: "POST",
          body: { reason, remarks },
        });

        const updated = res?.application || res?.data;
        setApplications((prev) =>
          prev.map((a) =>
            Number(a.application_id) === Number(appId)
              ? { ...a, ...(updated || {}), application_status: "cancelled", cancellation_reason: reason }
              : a
          )
        );

        setSelectedApplication((prev) => {
          if (prev && Number(prev.application_id) === Number(appId)) {
            return {
              ...prev,
              ...(updated || {}),
              application_status: "cancelled",
              cancellation_reason: reason,
            };
          }
          return prev;
        });

        return { success: true, data: updated };
      } catch (err) {
        const msg = err?.message || "Failed to cancel application.";
        setError(msg);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [request]
  );

  // =========================================================
  // OFFERS / BIDDINGS
  // =========================================================

  const loadBiddings = useCallback(
    async (filters = {}) => {
      setIsLoading(true);
      setError("");
      try {
        const queryParams = new URLSearchParams();
        if (filters.search) queryParams.append("search", filters.search);
        if (filters.status) queryParams.append("status", filters.status);
        if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);
        const qs = queryParams.toString();
        const url = `/farmer/contracts/biddings/${qs ? `?${qs}` : ""}`;
        const res = await request(url, { method: "GET" });
        const list = res?.biddings || res?.data || [];
        setBiddings(list);
        return list;
      } catch (err) {
        const msg = err?.message || "Failed to load open biddings.";
        setError(msg);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [request]
  );

  const createBidding = useCallback(
    async (payload) => {
      setIsSaving(true);
      setError("");
      try {
        const res = await request("/farmer/contracts/biddings/create/", {
          method: "POST",
          body: payload,
        });
        await loadBiddings();
        return { success: true, data: res?.data };
      } catch (err) {
        const msg = err?.message || "Failed to create open bidding.";
        setError(msg);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [request, loadBiddings]
  );

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
      setIsLoading(true);
      setError("");
      try {
        const res = await request(`/farmer/contracts/offers/${offerId}/`, {
          method: "GET",
        });
        const off = res?.offer || res?.data;
        setSelectedOffer(off);
        return off;
      } catch (err) {
        const msg = err?.message || "Failed to load offer details.";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [request]
  );

  const acceptOffer = useCallback(
    async (offerId, signature = "") => {
      setIsSaving(true);
      setError("");
      try {
        const res = await request(`/farmer/contracts/offers/${offerId}/accept/`, {
          method: "POST",
          body: { signature },
        });
        await loadBiddings();
        return { success: true, data: res?.contract || res?.data };
      } catch (err) {
        const msg = err?.message || "Failed to accept offer.";
        setError(msg);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [request, loadBiddings]
  );

  const declineOffer = useCallback(
    async (offerId, reason = "") => {
      setIsSaving(true);
      setError("");
      try {
        const res = await request(`/farmer/contracts/offers/${offerId}/decline/`, {
          method: "POST",
          body: { reason },
        });
        await loadBiddings();
        return { success: true, data: res?.offer || res?.data };
      } catch (err) {
        const msg = err?.message || "Failed to decline offer.";
        setError(msg);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [request, loadBiddings]
  );

  // =========================================================
  // OPPORTUNITIES
  // =========================================================

  const loadOpportunities = useCallback(
    async (filters = {}) => {
      setIsLoading(true);
      setError("");
      try {
        const queryParams = new URLSearchParams();
        if (filters.search) queryParams.append("search", filters.search);
        if (filters.productType) queryParams.append("product_type", filters.productType);
        if (filters.riceVariety) queryParams.append("rice_variety", filters.riceVariety);
        if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);
        const qs = queryParams.toString();
        const url = `/farmer/contracts/opportunities/${qs ? `?${qs}` : ""}`;
        const res = await request(url, { method: "GET" });
        const list = res?.opportunities || res?.data || [];
        setOpportunities(list);
        return list;
      } catch (err) {
        const msg = err?.message || "Failed to load purchasing opportunities.";
        setError(msg);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [request]
  );

  const loadOpportunityDetails = useCallback(
    async (oppId) => {
      setIsLoading(true);
      setError("");
      try {
        const res = await request(`/farmer/contracts/opportunities/${oppId}/`, {
          method: "GET",
        });
        const opp = res?.opportunity || res?.data;
        setSelectedOpportunity(opp);
        return opp;
      } catch (err) {
        const msg = err?.message || "Failed to load opportunity details.";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [request]
  );

  const submitApplication = useCallback(
    async (postingId, payload) => {
      setIsSaving(true);
      setError("");
      try {
        const bodyData = {
          opportunity_id: postingId,
          farm_product_id: payload.farm_product_id,
          quantity_to_commit_kg: payload.quantity_to_commit_kg,
          proposed_selling_price_per_kg: payload.proposed_selling_price_per_kg || payload.offered_price_per_kg,
          expected_availability_date: payload.expected_availability_date,
          additional_notes: payload.additional_notes || payload.remarks,
          farmer_signature: payload.farmer_signature,
        };
        const res = await request("/farmer/contracts/opportunities/apply/", {
          method: "POST",
          body: bodyData,
        });
        await loadOpportunities();
        await loadApplications();
        return { success: true, data: res?.application || res?.data };
      } catch (err) {
        const msg = err?.message || "Failed to submit contract application.";
        setError(msg);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [request, loadOpportunities, loadApplications]
  );

  // =========================================================
  // CURRENT CONTRACTS
  // =========================================================

  const loadContracts = useCallback(
    async (filters = {}) => {
      setIsLoading(true);
      setError("");
      try {
        const queryParams = new URLSearchParams();
        if (filters.search) queryParams.append("search", filters.search);
        if (filters.status) queryParams.append("status", filters.status);
        if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);
        const qs = queryParams.toString();
        const url = `/farmer/contracts/current/${qs ? `?${qs}` : ""}`;
        const res = await request(url, { method: "GET" });
        const list = res?.contracts || res?.data || [];
        setContracts(list);
        return list;
      } catch (err) {
        const msg = err?.message || "Failed to load current contracts.";
        setError(msg);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [request]
  );

  const loadContractDetails = useCallback(
    async (contractId) => {
      setIsLoading(true);
      setError("");
      try {
        const res = await request(`/farmer/contracts/current/${contractId}/`, {
          method: "GET",
        });
        const ctr = res?.contract || res?.data;
        setSelectedContract(ctr);
        return ctr;
      } catch (err) {
        const msg = err?.message || "Failed to load contract details.";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [request]
  );

  const signContract = useCallback(
    async (contractId, signature = "") => {
      setIsSaving(true);
      setError("");
      try {
        const res = await request(`/farmer/contracts/current/${contractId}/sign/`, {
          method: "POST",
          body: { signature },
        });
        await loadContracts();
        return { success: true, data: res?.contract || res?.data };
      } catch (err) {
        const msg = err?.message || "Failed to sign contract.";
        setError(msg);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [request, loadContracts]
  );

  const requestVoid = useCallback(
    async (contractId, reason = "", remarks = "") => {
      setIsSaving(true);
      setError("");
      try {
        let reasonStr = "";
        let remarksStr = "";
        if (typeof reason === "object" && reason !== null) {
          reasonStr = reason.reason || reason.void_reason || "";
          remarksStr = reason.remarks || reason.void_remarks || "";
        } else {
          reasonStr = String(reason || "");
          remarksStr = String(remarks || "");
        }
        const res = await request(`/farmer/contracts/current/${contractId}/void-request/`, {
          method: "POST",
          body: { reason: reasonStr, remarks: remarksStr },
        });
        await loadContracts();
        return { success: true, data: res?.contract || res?.data };
      } catch (err) {
        const msg = err?.message || "Failed to submit void request.";
        setError(msg);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [request, loadContracts]
  );

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
