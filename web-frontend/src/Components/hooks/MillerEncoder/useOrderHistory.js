import { useState, useCallback } from "react";
import useApi from "../useApi";

const BASE_URL = "/miller-employees/encoder/order-history";

export default function useOrderHistory() {
  const { request } = useApi();
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detailError, setDetailError] = useState(null);

  const fetchOrderHistory = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append("search", params.search);
        if (params.startDate) queryParams.append("start_date", params.startDate);
        if (params.endDate) queryParams.append("end_date", params.endDate);
        if (params.sortBy) queryParams.append("sort_by", params.sortBy);

        const qs = queryParams.toString();
        const url = `${BASE_URL}/${qs ? `?${qs}` : ""}`;

        const res = await request(url, {
          method: "GET",
          throwOnError: true,
        });

        const data = res?.data !== undefined ? res.data : res;
        return Array.isArray(data) ? data : [];
      } catch (err) {
        const msg =
          err?.data?.message || err?.message || "Failed to load order history.";
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

        return res?.data !== undefined ? res.data : res;
      } catch (err) {
        const msg =
          err?.data?.message || err?.message || "Failed to load order details.";
        setDetailError(msg);
        throw err;
      } finally {
        setDetailLoading(false);
      }
    },
    [request]
  );

  return {
    fetchOrderHistory,
    fetchOrderDetail,
    loading,
    detailLoading,
    error,
    detailError,
  };
}

