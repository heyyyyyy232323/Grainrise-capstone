import { useState, useCallback } from "react";
import useApi from "../useApi";

const BASE_URL = "/miller/vehicles";

export default function useMillerVehicleManagement() {
  const { request } = useApi();
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detailError, setDetailError] = useState(null);

  const fetchVehicles = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append("search", params.search);
        if (params.sortBy) queryParams.append("sort_by", params.sortBy);
        if (params.wheels && params.wheels !== "all") {
          queryParams.append("wheels", params.wheels);
        }
        if (params.type && params.type !== "all") {
          queryParams.append("type", params.type);
        }

        const qs = queryParams.toString();
        const url = `${BASE_URL}/${qs ? `?${qs}` : ""}`;

        const res = await request(url, {
          method: "GET",
          throwOnError: true,
        });

        const data =
          res?.vehicles !== undefined
            ? res.vehicles
            : Array.isArray(res)
            ? res
            : [];
        return data;
      } catch (err) {
        const msg =
          err?.data?.message || err?.message || "Failed to load vehicle list.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  const fetchBranches = useCallback(async () => {
    try {
      const res = await request(`${BASE_URL}/branches/`, {
        method: "GET",
        throwOnError: true,
      });
      return res?.branches !== undefined ? res.branches : [];
    } catch (err) {
      const msg =
        err?.data?.message || err?.message || "Failed to load branches.";
      throw new Error(msg);
    }
  }, [request]);

  const fetchVehicleDetail = useCallback(
    async (vehicleId) => {
      if (!vehicleId) return null;
      setDetailLoading(true);
      setDetailError(null);
      try {
        const res = await request(`${BASE_URL}/${vehicleId}/`, {
          method: "GET",
          throwOnError: true,
        });
        const data = res?.vehicle !== undefined ? res.vehicle : res;
        return data;
      } catch (err) {
        const msg =
          err?.data?.message || err?.message || "Failed to load vehicle details.";
        setDetailError(msg);
        throw err;
      } finally {
        setDetailLoading(false);
      }
    },
    [request]
  );

  const createVehicle = useCallback(
    async (payload) => {
      setActionLoading(true);
      try {
        const isFormData = payload instanceof FormData;
        const res = await request(`${BASE_URL}/create/`, {
          method: "POST",
          body: isFormData ? payload : JSON.stringify(payload),
          headers: isFormData ? {} : { "Content-Type": "application/json" },
          throwOnError: true,
        });
        return res?.vehicle !== undefined ? res.vehicle : res;
      } catch (err) {
        const msg =
          err?.data?.message || err?.message || "Failed to create vehicle.";
        const customError = new Error(msg);
        customError.data = err?.data;
        customError.status = err?.status;
        throw customError;
      } finally {
        setActionLoading(false);
      }
    },
    [request]
  );

  const updateVehicle = useCallback(
    async (vehicleId, payload) => {
      if (!vehicleId) throw new Error("Vehicle ID is required.");
      setActionLoading(true);
      try {
        const isFormData = payload instanceof FormData;
        const res = await request(`${BASE_URL}/${vehicleId}/edit/`, {
          method: "POST",
          body: isFormData ? payload : JSON.stringify(payload),
          headers: isFormData ? {} : { "Content-Type": "application/json" },
          throwOnError: true,
        });
        return res?.vehicle !== undefined ? res.vehicle : res;
      } catch (err) {
        const msg =
          err?.data?.message || err?.message || "Failed to update vehicle.";
        const customError = new Error(msg);
        customError.data = err?.data;
        customError.status = err?.status;
        throw customError;
      } finally {
        setActionLoading(false);
      }
    },
    [request]
  );

  const checkPlateNumber = useCallback(
    async (plateNumber, excludeId = null) => {
      if (!plateNumber) return { is_unique: true };
      try {
        const queryParams = new URLSearchParams({ plate_number: plateNumber });
        if (excludeId) queryParams.append("exclude_id", excludeId);
        const res = await request(
          `${BASE_URL}/check-plate/?${queryParams.toString()}`,
          {
            method: "GET",
            throwOnError: true,
          }
        );
        return res;
      } catch {
        return { is_unique: true };
      }
    },
    [request]
  );

  return {
    fetchVehicles,
    fetchBranches,
    fetchVehicleDetail,
    createVehicle,
    updateVehicle,
    checkPlateNumber,
    loading,
    detailLoading,
    actionLoading,
    error,
    detailError,
  };
}

