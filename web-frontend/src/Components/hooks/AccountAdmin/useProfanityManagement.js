import { useCallback, useState } from "react";
import useApi from "../useApi";

export default function useProfanityManagement() {
  const { request } = useApi();

  const [words, setWords] = useState([]);
  const [supportedStatuses, setSupportedStatuses] = useState(["active", "inactive"]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Fetch prohibited words with optional search & status filters.
   */
  const fetchProfanityWords = useCallback(
    async ({ search = "", status = "" } = {}) => {
      setIsLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        if (search.trim()) {
          queryParams.set("search", search.trim());
        }
        if (status && status !== "all") {
          queryParams.set("status", status.trim());
        }

        const queryString = queryParams.toString();
        const endpoint = queryString
          ? `/admin/profanity/?${queryString}`
          : "/admin/profanity/";

        const response = await request(endpoint, {
          method: "GET",
          throwOnError: true,
        });

        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];

        setWords(list);

        if (Array.isArray(response?.supported_statuses) && response.supported_statuses.length > 0) {
          setSupportedStatuses(response.supported_statuses);
        }

        return list;
      } catch (err) {
        const message = err?.message || "Failed to load prohibited words.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [request]
  );

  /**
   * Add a new prohibited word.
   */
  const addProfanityWord = useCallback(
    async ({ prohibited_text, status = "active" }) => {
      setIsSaving(true);
      setError(null);

      try {
        const response = await request("/admin/profanity/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prohibited_text: prohibited_text?.trim(),
            status,
          }),
          throwOnError: true,
        });

        return response?.data || response;
      } catch (err) {
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [request]
  );

  /**
   * Update an existing prohibited word and/or its status.
   */
  const updateProfanityWord = useCallback(
    async (profanityId, { prohibited_text, status }) => {
      setIsSaving(true);
      setError(null);

      try {
        const payload = {};
        if (prohibited_text !== undefined) {
          payload.prohibited_text = prohibited_text.trim();
        }
        if (status !== undefined) {
          payload.status = status;
        }

        const response = await request(`/admin/profanity/${profanityId}/`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          throwOnError: true,
        });

        return response?.data || response;
      } catch (err) {
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [request]
  );

  /**
   * Delete a prohibited word by ID.
   */
  const deleteProfanityWord = useCallback(
    async (profanityId) => {
      setIsDeleting(true);
      setError(null);

      try {
        const response = await request(`/admin/profanity/${profanityId}/`, {
          method: "DELETE",
          throwOnError: true,
        });

        return response;
      } catch (err) {
        throw err;
      } finally {
        setIsDeleting(false);
      }
    },
    [request]
  );

  return {
    words,
    supportedStatuses,
    isLoading,
    isSaving,
    isDeleting,
    error,
    fetchProfanityWords,
    addProfanityWord,
    updateProfanityWord,
    deleteProfanityWord,
  };
}

