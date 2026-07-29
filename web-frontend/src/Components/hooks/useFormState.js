import { useState } from "react";

/**
 * useFormState
 * Manages form field values and provides a generic change handler
 * that also clears field-level errors on input.
 *
 * @param {object} initialValues - Initial field values, e.g. { email: "", password: "" }
 * @param {function} setErrors   - The errors setter from useFormValidation (optional)
 *
 * Usage:
 *   const { form, handleInputChange, resetForm } = useFormState({ email: "", password: "" });
 */
const useFormState = (initialValues, setErrors = null) => {
  const [form, setForm] = useState(initialValues);

  /**
   * Generic handler for any field.
   * Pass the field name and the new value directly.
   * e.g. onChange={(e) => handleInputChange("email", e.target.value)}
   */
  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Clear field-level error when user starts typing
    if (setErrors) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  /** Reset every field back to the initial values */
  const resetForm = () => setForm(initialValues);

  /** Overwrite specific fields without touching the rest */
  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return { form, setForm, handleInputChange, resetForm, setField };
};

export default useFormState;
