import { useState, useCallback } from "react";
import useApi from "../useApi";

const BASE_URL = "/miller-employees/encoder/dashboard";

export default function useEncoderDashboard() {
  const { request } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request(`${BASE_URL}/`, {
        method: "GET",
        throwOnError: true,
      });

      const data = res?.data !== undefined ? res.data : res;
      return data || null;
    } catch (err) {
      const msg =
        err?.data?.message || err?.message || "Failed to load dashboard data.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [request]);

  return {
    fetchDashboardData,
    loading,
    error,
  };
}

