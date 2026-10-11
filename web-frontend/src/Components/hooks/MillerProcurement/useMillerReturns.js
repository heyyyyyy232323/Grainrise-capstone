import { useState, useCallback } from "react";
import useApi from "../useApi";

const BASE_URL = "/miller-employees/procurement/returns";

export default function useMillerReturns() {
  const { request } = useApi();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReturns = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append("search", params.search);
        if (params.status && params.status !== "all") queryParams.append("status", params.status);
        if (params.supplierId && params.supplierId !== "all") queryParams.append("supplier_id", params.supplierId);
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
          "Failed to retrieve returns.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  const fetchReturnDetail = useCallback(
    async (returnId) => {
      if (!returnId) return null;
      try {
        const res = await request(`${BASE_URL}/${returnId}/`, {
          method: "GET",
          throwOnError: true,
        });
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message ||
          err?.message ||
          "Failed to retrieve return details.";
        throw new Error(msg);
      }
    },
    [request]
  );

  const fetchSuppliers = useCallback(
    async () => {
      try {
        const res = await request(`${BASE_URL}/suppliers/`, {
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
        // Non-blocking supplier list fetch error
        console.warn("Failed to retrieve return suppliers:", err);
        return [];
      }
    },
    [request]
  );

  const markAsReturned = useCallback(
    async (returnId) => {
      setActionLoading(true);
      setError(null);
      try {
        const res = await request(`${BASE_URL}/${returnId}/mark-returned/`, {
          method: "POST",
          throwOnError: true,
        });
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message ||
          err?.message ||
          "Failed to mark return as returned.";
        setError(msg);
        throw new Error(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [request]
  );

  return {
    fetchReturns,
    fetchReturnDetail,
    fetchSuppliers,
    markAsReturned,
    loading,
    actionLoading,
    error,
  };
}

