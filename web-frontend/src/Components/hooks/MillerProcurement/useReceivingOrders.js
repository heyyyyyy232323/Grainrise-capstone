import { useState, useCallback } from "react";
import useApi from "../useApi";

const BASE_URL = "/miller-employees/procurement/receiving-orders";

export default function useReceivingOrders() {
  const { request } = useApi();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReceivingOrders = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append("search", params.search);
        if (params.startDate) queryParams.append("start_date", params.startDate);
        if (params.endDate) queryParams.append("end_date", params.endDate);
        if (params.sortBy) queryParams.append("sort_by", params.sortBy);
        if (params.status && params.status !== "all") {
          queryParams.append("status", params.status);
        }

        const qs = queryParams.toString();
        const url = `${BASE_URL}/${qs ? `?${qs}` : ""}`;

        const res = await request(url, {
          method: "GET",
          throwOnError: true,
        });

        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        return items;
      } catch (err) {
        const msg =
          err?.data?.message ||
          err?.message ||
          "Failed to retrieve receiving orders.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  const fetchReceivingOrderDetail = useCallback(
    async (orderId) => {
      if (!orderId) return null;
      try {
        const res = await request(`${BASE_URL}/${orderId}/`, {
          method: "GET",
          throwOnError: true,
        });
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message ||
          err?.message ||
          "Failed to retrieve receiving order details.";
        throw new Error(msg);
      }
    },
    [request]
  );

  const receiveOrder = useCallback(
    async (orderId, formData) => {
      setActionLoading(true);
      setError(null);
      try {
        const res = await request(`${BASE_URL}/${orderId}/receive/`, {
          method: "POST",
          body: formData,
          throwOnError: true,
        });
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message ||
          err?.message ||
          "Failed to complete receiving order.";
        setError(msg);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [request]
  );

  return {
    fetchReceivingOrders,
    fetchReceivingOrderDetail,
    receiveOrder,
    loading,
    actionLoading,
    error,
  };
}

