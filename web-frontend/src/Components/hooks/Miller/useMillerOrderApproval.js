import { useState, useCallback } from "react";
import useApi from "../useApi";

const BASE_URL = "/miller/order-approval";

export default function useMillerOrderApproval() {
  const { request } = useApi();
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detailError, setDetailError] = useState(null);

  const fetchOrders = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append("search", params.search);
        if (params.status && params.status !== "all") {
          queryParams.append("status", params.status);
        }
        if (params.startDate) queryParams.append("start_date", params.startDate);
        if (params.endDate) queryParams.append("end_date", params.endDate);

        const qs = queryParams.toString();
        const url = `${BASE_URL}/${qs ? `?${qs}` : ""}`;

        const res = await request(url, {
          method: "GET",
          throwOnError: true,
        });

        const data = res?.orders !== undefined ? res.orders : (Array.isArray(res) ? res : []);
        return data;
      } catch (err) {
        const msg = err?.data?.message || err?.message || "Failed to load order approvals.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  const fetchOrderDetail = useCallback(
    async (inboundOrderId) => {
      if (!inboundOrderId) return null;
      setDetailLoading(true);
      setDetailError(null);
      try {
        const res = await request(`${BASE_URL}/${inboundOrderId}/`, {
          method: "GET",
          throwOnError: true,
        });

        const data = res?.order !== undefined ? res.order : res;
        return data;
      } catch (err) {
        const msg = err?.data?.message || err?.message || "Failed to load order details.";
        setDetailError(msg);
        throw err;
      } finally {
        setDetailLoading(false);
      }
    },
    [request]
  );

  const editOrder = useCallback(
    async (inboundOrderId, payload) => {
      setActionLoading(true);
      try {
        const res = await request(`${BASE_URL}/${inboundOrderId}/edit/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          throwOnError: true,
        });
        return res?.order !== undefined ? res.order : res;
      } catch (err) {
        const msg = err?.data?.message || err?.message || "Failed to update order.";
        throw new Error(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [request]
  );

  const declineOrder = useCallback(
    async (inboundOrderId, reason) => {
      setActionLoading(true);
      try {
        const res = await request(`${BASE_URL}/${inboundOrderId}/decline/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
          throwOnError: true,
        });
        return res;
      } catch (err) {
        const msg = err?.data?.message || err?.message || "Failed to decline order.";
        throw new Error(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [request]
  );

  const approveOrder = useCallback(
    async (inboundOrderId) => {
      setActionLoading(true);
      try {
        const res = await request(`${BASE_URL}/${inboundOrderId}/approve/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          throwOnError: true,
        });
        return res;
      } catch (err) {
        const msg = err?.data?.message || err?.message || "Failed to approve order.";
        throw new Error(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [request]
  );

  return {
    fetchOrders,
    fetchOrderDetail,
    editOrder,
    declineOrder,
    approveOrder,
    loading,
    detailLoading,
    actionLoading,
    error,
    detailError,
  };
}

