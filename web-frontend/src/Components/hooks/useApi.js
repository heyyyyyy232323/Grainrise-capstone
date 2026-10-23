import { useCallback } from "react";


const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "") + "/api";

const getStoredToken = () => {
  return (
    localStorage.getItem("grainrise_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
};


const extractErrorMessage = (payload, fallbackMessage) => {
  if (!payload) {
    return fallbackMessage;
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (
      trimmed.startsWith("<") ||
      trimmed.toLowerCase().includes("<!doctype") ||
      trimmed.toLowerCase().includes("<html") ||
      trimmed.toLowerCase().includes("<body")
    ) {
      return fallbackMessage;
    }
    return payload;
  }

  if (payload.detail) {
    return String(payload.detail);
  }

  if (payload.message) {
    return String(payload.message);
  }

  if (typeof payload === "object") {
    for (const value of Object.values(payload)) {
      if (Array.isArray(value) && value.length > 0) {
        return String(value[0]);
      }

      if (typeof value === "string") {
        return value;
      }

      if (value && typeof value === "object") {
        const nestedMessage = extractErrorMessage(
          value,
          fallbackMessage
        );

        if (nestedMessage !== fallbackMessage) {
          return nestedMessage;
        }
      }
    }
  }

  return fallbackMessage;
};


const useApi = () => {

  const request = useCallback(
    async (
      endpoint,
      options = {}
    ) => {

      const {
        method = "GET",
        body = undefined,
        headers = {},
        token = undefined,
        throwOnError = false,
        signal = undefined,
      } = options;


      const normalizedEndpoint = endpoint.startsWith("/")
        ? endpoint
        : `/${endpoint}`;


      const url = `${API_BASE_URL}${normalizedEndpoint}`;


      const requestHeaders = {
        Accept: "application/json",
        ...headers,
      };


      // =====================================================
      // AUTHORIZATION
      // =====================================================

      const authToken =
        token !== undefined
          ? token
          : getStoredToken();


      if (authToken) {
        requestHeaders.Authorization = `Bearer ${authToken}`;
      }


      // =====================================================
      // BODY
      // =====================================================

      let requestBody = body;


      // FormData must NOT have Content-Type manually set.
      //
      // The browser automatically adds the required multipart
      // boundary. Setting application/json here would break
      // Barangay Permit / Valid ID uploads.
      if (
        body !== undefined &&
        body !== null &&
        !(body instanceof FormData)
      ) {

        requestHeaders["Content-Type"] =
          requestHeaders["Content-Type"] ||
          "application/json";


        if (
          requestHeaders["Content-Type"].includes(
            "application/json"
          ) &&
          typeof body !== "string"
        ) {

          requestBody = JSON.stringify(body);

        }
      }


      try {

        const response = await fetch(
          url,
          {
            method,
            headers: requestHeaders,
            body:
              method === "GET" || method === "HEAD"
                ? undefined
                : requestBody,
            signal,
          }
        );


        // ===================================================
        // READ RESPONSE
        // ===================================================

        const contentType =
          response.headers.get("content-type") || "";


        let payload = null;


        if (
          response.status !== 204 &&
          contentType.includes("application/json")
        ) {

          payload = await response.json();

        } else if (response.status !== 204) {

          const text = await response.text();

          payload = text || null;

        }


        // ===================================================
        // HTTP ERROR
        // ===================================================

        if (!response.ok) {

          const message = extractErrorMessage(
            payload,
            `Request failed with status ${response.status}.`
          );


          const error = new Error(message);

          error.status = response.status;
          error.data = payload;


          if (response.status === 401) {
            const isLoginEndpoint =
              normalizedEndpoint.includes("/auth/login") ||
              normalizedEndpoint.includes("/auth/admin/login");

            if (!isLoginEndpoint) {
              try {
                localStorage.removeItem("grainrise_token");
                localStorage.removeItem("grainrise_user");
                localStorage.removeItem("access_token");
                sessionStorage.clear();
              } catch {}
              window.dispatchEvent(
                new Event("grainrise_unauthorized")
              );
            }
          }


          if (throwOnError) {
            throw error;
          }


          return {
            ok: false,
            status: response.status,
            error: message,
            data: payload,
          };

        }


        // RetailerRegister.jsx expects response fields directly:
        //
        // response.retry_after
        // response.verification_token
        //
        // So successful JSON is returned directly.
        return payload ?? {
          ok: true,
          status: response.status,
        };


      } catch (error) {

        // If it is already an API error generated above,
        // preserve the backend's actual message.
        if (
          error?.status &&
          throwOnError
        ) {
          throw error;
        }


        const isNetworkError =
          error instanceof TypeError ||
          error?.message === "Failed to fetch";


        const finalError = isNetworkError
          ? new Error(
                    "Cannot connect to the GrainRise server. Please try again."

            )
          : error;


        if (throwOnError) {
          throw finalError;
        }


        return {
          ok: false,
          status: 0,
          error:
            finalError?.message ||
            "Unable to connect to the server.",
          data: null,
        };

      }

    },
    []
  );


  return {
    request,
    API_BASE_URL,
  };

};


export default useApi;