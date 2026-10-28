import { useState, useCallback } from "react";
import useApi from "../useApi";

/**
 * useFetchLatestNews
 * 
 * Reusable hook that retrieves the most recent relevant news and delivers
 * consistent toast feedback for every result outcome:
 * 
 * - Success: “Latest news fetched successfully.”
 * - No Data: “No latest news is currently available.”
 * - Error: “Failed to fetch the latest news. Please try again.”
 * - Network/API Error: “Cannot connect to the news API. Please check your network connection.”
 */
export default function useFetchLatestNews({ showToast, onNewsFetched } = {}) {
  const { request } = useApi();
  const [isFetching, setIsFetching] = useState(false);
  const [latestNews, setLatestNews] = useState([]);

  const fetchLatestNews = useCallback(async () => {
    if (isFetching) return null;

    // 1. Immediate offline / network check
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (showToast) {
        showToast({
          type: "error",
          title: "Network Error",
          message: "Cannot connect to the news API. Please check your network connection.",
          duration: 5000,
        });
      }
      return { status: "network_error", data: [] };
    }

    setIsFetching(true);

    try {
      // Synchronize the shared NewsData store, then read the user's feed.
      await request("/news/fetch-latest/", {
        method: "POST",
        throwOnError: true,
      });

      const response = await request("/news/?limit=20&sort=latest", {
        method: "GET",
        throwOnError: true,
      });
      let articles = [];

      // Unpack articles from API response
      if (response) {
        const rawData = response?.data || response;
        if (Array.isArray(rawData)) {
          articles = rawData;
        } else if (Array.isArray(rawData?.items)) {
          articles = rawData.items;
        } else if (Array.isArray(rawData?.articles)) {
          articles = rawData.articles;
        }
      }

      // Handle Result Outcomes
      if (articles && articles.length > 0) {
        setLatestNews(articles);
        if (onNewsFetched) {
          onNewsFetched(articles);
        }
        if (showToast) {
          showToast({
            type: "success",
            title: "Success",
            message: "Latest news fetched successfully.",
            duration: 4000,
          });
        }
        return { status: "success", data: articles };
      } else {
        // No data available
        if (showToast) {
          showToast({
            type: "warning",
            title: "No Data",
            message: "No latest news is currently available.",
            duration: 4500,
          });
        }
        return { status: "no_data", data: [] };
      }
    } catch (error) {
      // Differentiate network/connectivity failure from server processing error
      const isNetworkError =
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        error?.name === "TypeError" ||
        /network|connection|failed to fetch|offline|cors|load failed/i.test(
          error?.message || ""
        ) ||
        error?.status === 502 ||
        error?.status === 503 ||
        error?.status === 504;

      if (isNetworkError) {
        if (showToast) {
          showToast({
            type: "error",
            title: "Network Error",
            message: "Cannot connect to the news API. Please check your network connection.",
            duration: 5000,
          });
        }
        return { status: "network_error", error };
      } else {
        if (showToast) {
          showToast({
            type: "error",
            title: "Error",
            message: "Failed to fetch the latest news. Please try again.",
            duration: 5000,
          });
        }
        return { status: "error", error };
      }
    } finally {
      setIsFetching(false);
    }
  }, [isFetching, request, showToast, onNewsFetched]);

  return {
    fetchLatestNews,
    isFetching,
    latestNews,
  };
}
