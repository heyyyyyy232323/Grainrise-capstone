import { useState, useCallback } from "react";
import useApi from "../useApi";

const BASE_URL = "/miller-employees/encoder/request-orders";

export default function useRequestOrders() {
  const { request } = useApi();
  const [loading, setLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forecastError, setForecastError] = useState(null);

  const fetchEligibleProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request(`${BASE_URL}/eligible-products/`, {
        method: "GET",
        throwOnError: true,
      });
      const data = res?.data || res || {};
      const products = Array.isArray(data?.products) ? data.products : [];
      const branchInfo = data?.branch_info || {};
      return { products, branchInfo };
    } catch (err) {
      const msg =
        err?.data?.message || err?.message || "Failed to retrieve eligible products.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [request]);

  const fetchDemandForecast = useCallback(
    async (productId, supplierId) => {
      setForecastLoading(true);
      setForecastError(null);
      try {
        const res = await request(`${BASE_URL}/forecast/`, {
          method: "POST",
          body: {
            product_id: productId,
            supplier_id: supplierId,
          },
          throwOnError: true,
        });
        const data = res?.data || res || {};
        return data;
      } catch (err) {
        const msg =
          err?.data?.message || err?.message || "Failed to generate demand forecast.";
        setForecastError(msg);
        throw err;
      } finally {
        setForecastLoading(false);
      }
    },
    [request]
  );

  const submitRequestOrder = useCallback(
    async ({
      productId,
      supplierId,
      orderQuantity,
      stockQuantity,
      targetArrivalDate,
      requiredByDate,
      notes,
      replacementFile,
      forecastData,
    }) => {
      setLoading(true);
      setError(null);
      try {
        let options = {
          method: "POST",
          throwOnError: true,
        };

        if (replacementFile instanceof File) {
          const fd = new FormData();
          fd.append("product_id", String(productId));
          fd.append("supplier_id", String(supplierId));
          fd.append("order_quantity", String(orderQuantity));
          if (stockQuantity !== undefined && stockQuantity !== null) {
            fd.append("stock_quantity", String(stockQuantity));
          }
          fd.append("target_arrival_date", String(targetArrivalDate));
          fd.append("required_by_date", String(requiredByDate));
          if (notes) fd.append("notes", String(notes));
          if (forecastData) {
            fd.append("forecast_data", JSON.stringify(forecastData));
          }
          fd.append("replacement_file", replacementFile);

          options.body = fd;
        } else {
          options.body = {
            product_id: productId,
            supplier_id: supplierId,
            order_quantity: Number(orderQuantity),
            stock_quantity: stockQuantity !== "" ? Number(stockQuantity) : null,
            target_arrival_date: targetArrivalDate,
            required_by_date: requiredByDate,
            notes: notes || null,
            forecast_data: forecastData || null,
          };
        }

        const res = await request(`${BASE_URL}/create/`, options);
        return res?.data || res;
      } catch (err) {
        const msg =
          err?.data?.message || err?.message || "Failed to submit request order.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  return {
    fetchEligibleProducts,
    fetchDemandForecast,
    submitRequestOrder,
    loading,
    forecastLoading,
    error,
    forecastError,
  };
}

