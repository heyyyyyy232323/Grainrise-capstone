import { useState, useCallback } from "react";
import useApi from "../useApi";

const BASE_URL = "/miller-employees/encoder/stock-management";

export default function useStockManagement() {
  const { request } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(
    async (status = "active") => {
      setLoading(true);
      setError(null);
      try {
        const query = status ? `?status=${encodeURIComponent(status)}` : "";
        const res = await request(`${BASE_URL}/products/${query}`, {
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
          err?.data?.message || err?.message || "Failed to retrieve stock products.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  const fetchSuppliers = useCallback(async () => {
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
      const msg =
        err?.data?.message || err?.message || "Failed to retrieve suppliers.";
      setError(msg);
      throw err;
    }
  }, [request]);

  const addProduct = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);
      try {
        const res = await request(`${BASE_URL}/products/`, {
          method: "POST",
          body: payload,
          throwOnError: true,
        });
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message || err?.message || "Failed to add manual product.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  const updateProduct = useCallback(
    async (productId, payload) => {
      setLoading(true);
      setError(null);
      try {
        const res = await request(`${BASE_URL}/products/${productId}/`, {
          method: "PATCH",
          body: payload,
          throwOnError: true,
        });
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message || err?.message || "Failed to update product details.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  const processUnmilled = useCallback(
    async (productId, payload) => {
      setLoading(true);
      setError(null);
      try {
        const res = await request(`${BASE_URL}/products/${productId}/process/`, {
          method: "PATCH",
          body: payload,
          throwOnError: true,
        });
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message ||
          err?.message ||
          "Failed to process unmilled product into active stock.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  const archiveProduct = useCallback(
    async (productId, reason) => {
      setLoading(true);
      setError(null);
      try {
        const res = await request(`${BASE_URL}/products/${productId}/archive/`, {
          method: "POST",
          body: { reason },
          throwOnError: true,
        });
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message || err?.message || "Failed to archive product.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  const restoreProduct = useCallback(
    async (productId) => {
      setLoading(true);
      setError(null);
      try {
        const res = await request(`${BASE_URL}/products/${productId}/restore/`, {
          method: "POST",
          throwOnError: true,
        });
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message || err?.message || "Failed to restore product.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  const deleteProduct = useCallback(
    async (productId) => {
      setLoading(true);
      setError(null);
      try {
        const res = await request(`${BASE_URL}/products/${productId}/`, {
          method: "DELETE",
          throwOnError: true,
        });
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message || err?.message || "Failed to delete product.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  return {
    fetchProducts,
    fetchSuppliers,
    addProduct,
    updateProduct,
    processUnmilled,
    archiveProduct,
    restoreProduct,
    deleteProduct,
    loading,
    error,
  };
}

