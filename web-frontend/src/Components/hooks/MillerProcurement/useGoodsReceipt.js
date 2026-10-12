import { useState, useCallback } from "react";
import useApi from "../useApi";

const BASE_URL = "/miller-employees/procurement/goods-receipt";

export default function useGoodsReceipt() {
  const { request } = useApi();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGoodsReceipts = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append("search", params.search);
        if (params.sortBy) queryParams.append("sort_by", params.sortBy);

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
          "Failed to retrieve goods receipts.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  const fetchGoodsReceiptDetail = useCallback(
    async (receivingId) => {
      if (!receivingId) return null;
      try {
        const res = await request(`${BASE_URL}/${receivingId}/`, {
          method: "GET",
          throwOnError: true,
        });
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message ||
          err?.message ||
          "Failed to retrieve goods receipt details.";
        throw new Error(msg);
      }
    },
    [request]
  );

  const requestToPay = useCallback(
    async (receivingId) => {
      setActionLoading(true);
      setError(null);
      try {
        const res = await request(`${BASE_URL}/${receivingId}/request-to-pay/`, {
          method: "POST",
          throwOnError: true,
        });
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message ||
          err?.message ||
          "Failed to request payment for this goods receipt.";
        setError(msg);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [request]
  );

  return {
    fetchGoodsReceipts,
    fetchGoodsReceiptDetail,
    requestToPay,
    loading,
    actionLoading,
    error,
  };
}

