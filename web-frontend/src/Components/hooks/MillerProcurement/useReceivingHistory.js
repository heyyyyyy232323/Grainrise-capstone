import { useState, useCallback } from "react";
import useApi from "../useApi";

export default function useReceivingHistory({ isManager = false } = {}) {
  const { request } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const baseUrl = isManager
    ? "/miller/receiving-history"
    : "/miller-employees/procurement/receiving-history";

  const fetchReceivingHistory = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append("search", params.search);
        if (params.startDate) queryParams.append("start_date", params.startDate);
        if (params.endDate) queryParams.append("end_date", params.endDate);
        if (params.supplierId && params.supplierId !== "all") {
          queryParams.append("supplier_id", params.supplierId);
        }
        if (params.status && params.status !== "all") {
          queryParams.append("status", params.status);
        }
        if (params.sortBy) queryParams.append("sort_by", params.sortBy);

        const qs = queryParams.toString();
        const url = `${baseUrl}/${qs ? `?${qs}` : ""}`;

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
          "Failed to retrieve receiving history.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request, baseUrl]
  );

  const fetchReceivingDetail = useCallback(
    async (receivingId) => {
      if (!receivingId) return null;
      try {
        const res = await request(`${baseUrl}/${receivingId}/`, {
          method: "GET",
          throwOnError: true,
        });
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message ||
          err?.message ||
          "Failed to retrieve receiving details.";
        throw new Error(msg);
      }
    },
    [request, baseUrl]
  );

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await request(`${baseUrl}/suppliers/`, {
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
      console.warn("Failed to retrieve receiving history suppliers:", err);
      return [];
    }
  }, [request, baseUrl]);

  return {
    fetchReceivingHistory,
    fetchReceivingDetail,
    fetchSuppliers,
    loading,
    error,
  };
}

