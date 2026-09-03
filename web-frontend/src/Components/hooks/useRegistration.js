import { useCallback, useRef, useState } from "react";
import useApi from "./useApi";

const useRegistration = ({
  endpoint = "",
  method = "POST",
} = {}) => {
  const { request } = useApi();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [response, setResponse] = useState(null);

  const submittingRef = useRef(false);

  const buildFormData = useCallback(
    ({
      fields = {},
      documents = null,
    } = {}) => {
      const formData = new FormData();

      Object.entries(fields).forEach(([key, value]) => {
        if (
          value === undefined ||
          value === null
        ) {
          return;
        }

        if (typeof value === "boolean") {
          formData.append(
            key,
            String(value)
          );

          return;
        }

        formData.append(
          key,
          value
        );
      });

      if (
        documents &&
        typeof documents.appendToFormData === "function"
      ) {
        documents.appendToFormData(
          formData
        );
      }

      return formData;
    },
    []
  );

  const submitRegistration = useCallback(
    async ({
      fields = {},
      documents = null,
      overrideEndpoint = "",
    } = {}) => {
      if (submittingRef.current) {
        return null;
      }

      const targetEndpoint =
        overrideEndpoint || endpoint;

      if (!targetEndpoint) {
        const message =
          "Registration endpoint is not configured.";

        setError(message);

        throw new Error(message);
      }

      submittingRef.current = true;

      setIsSubmitting(true);
      setError("");
      setSuccessMessage("");
      setResponse(null);

      try {
        if (
          documents &&
          typeof documents.validateRequired === "function"
        ) {
          const valid =
            documents.validateRequired();

          if (!valid) {
            throw new Error(
              "Please upload all required documents."
            );
          }
        }

        const formData =
          buildFormData({
            fields,
            documents,
          });

        const result =
          await request(
            targetEndpoint,
            {
              method,
              body: formData,
              throwOnError: true,
            }
          );

        setResponse(result);

        setSuccessMessage(
          result?.message ||
          "Registration submitted successfully."
        );

        return result;
      } catch (requestError) {
        const message =
          requestError?.message ||
          "Registration failed.";

        setError(message);

        throw requestError;
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [
      buildFormData,
      endpoint,
      method,
      request,
    ]
  );

  const resetRegistration = useCallback(() => {
    submittingRef.current = false;

    setIsSubmitting(false);
    setError("");
    setSuccessMessage("");
    setResponse(null);
  }, []);

  return {
    submitRegistration,
    buildFormData,

    isSubmitting,
    error,
    successMessage,
    response,

    resetRegistration,

    clearError: () =>
      setError(""),

    clearSuccessMessage: () =>
      setSuccessMessage(""),
  };
};

export default useRegistration;