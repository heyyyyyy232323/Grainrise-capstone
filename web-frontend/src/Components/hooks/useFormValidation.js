import { useState } from "react";

/**
 * useFormValidation
 * Provides field-level error state and a comprehensive set of
 * reusable validation helpers for all GrainRise registration
 * and login forms.
 *
 * Usage:
 *   const { errors, setErrors, clearErrors, validators, validate, getPasswordStrength } = useFormValidation();
 */
const useFormValidation = () => {
  const [errors, setErrors] = useState({});

  /** Clear all errors, or just one field's error */
  const clearErrors = (field = null) => {
    if (field) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    } else {
      setErrors({});
    }
  };

  /** True when there are no active error messages */
  const isValid = Object.keys(errors).filter((k) => errors[k]).length === 0;

  // ─── Validators ─────────────────────────────────────────────────────────────
  const validators = {

    // ── Personal Information ──────────────────────────────────────────────────

    /**
     * First Name
     * - Required
     * - Letters and spaces only (A–Z, a–z)
     * - Min 2 / Max 50 characters
     */
    firstName: (value) => {
      if (!value || !value.trim()) return "First name is required";
      if (!/^[a-zA-Z\s]+$/.test(value)) return "Only letters are allowed";
      if (value.trim().length < 2) return "First name must be at least 2 characters";
      if (value.trim().length > 50) return "First name must not exceed 50 characters";
      return "";
    },

    /**
     * Middle Initial
     * - Optional (blank is acceptable)
     * - Exactly 1 letter if provided
     * - Should be auto-uppercased before calling this
     */
    middleInitial: (value) => {
      if (!value || value.trim() === "") return ""; // optional — no error
      if (!/^[a-zA-Z]$/.test(value.trim())) return "Middle initial must be a single letter";
      return "";
    },

    /**
     * Last Name / Surname
     * - Required
     * - Letters, spaces, and hyphens only (e.g. Dela Cruz, Santos-Reyes)
     * - Min 2 / Max 50 characters
     */
    lastName: (value) => {
      if (!value || !value.trim()) return "Last name is required";
      if (!/^[a-zA-Z\s\-]+$/.test(value)) return "Only letters and hyphens are allowed";
      if (value.trim().length < 2) return "Last name must be at least 2 characters";
      if (value.trim().length > 50) return "Last name must not exceed 50 characters";
      return "";
    },

    // ── Address ───────────────────────────────────────────────────────────────

    /**
     * Street Address
     * - Required
     * - Alphanumeric + common address symbols (/ , . - # space)
     * - Min 5 / Max 100 characters
     */
    streetAddress: (value) => {
      if (!value || !value.trim()) return "Street address is required";
      if (value.trim().length < 5) return "Street address must be at least 5 characters";
      if (value.trim().length > 100) return "Street address must not exceed 100 characters";
      if (!/^[a-zA-Z0-9\s\/,.\-#]+$/.test(value)) return "Invalid characters in street address";
      return "";
    },

    // ── Account Details ───────────────────────────────────────────────────────

    /**
     * Email Address
     * - Required
     * - Standard email format x@x.x, no spaces
     */
    email: (value) => {
      if (!value || !value.trim()) return "Email address is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return "Invalid email format (e.g. you@example.com)";
      return "";
    },

    /**
     * Contact Number
     * - Required
     * - Philippine format: 09XXXXXXXXX or +639XXXXXXXXX
     * - Spaces between digits are allowed (stripped before check)
     */
    contactNumber: (value) => {
      if (!value || !value.trim()) return "Contact number is required";
      const cleaned = value.replace(/\s/g, "");
      if (!/^(09|\+639)\d{9}$/.test(cleaned))
        return "Enter a valid PH number (e.g. 09XX XXX XXXX)";
      return "";
    },

    /**
     * Username
     * - Optional (blank is acceptable)
     * - If provided: letters, numbers, dots, underscores only (no spaces)
     * - Min 3 / Max 30 characters
     */
    username: (value) => {
      if (!value || !value.trim()) return ""; // optional — no error
      if (value.trim().length < 3) return "Username must be at least 3 characters";
      if (value.trim().length > 30) return "Username must not exceed 30 characters";
      if (!/^[a-zA-Z0-9._]+$/.test(value))
        return "Only letters, numbers, dots, and underscores allowed";
      return "";
    },

    /**
     * Password
     * - Required
     * - Min 8 characters, Max 16 characters
     * - Must contain: 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character
     */
    password: (value) => {
      if (!value) return "Password is required";
      if (value.length < 8) return "Password must be at least 8 characters";
      if (value.length > 16) return "Password must not exceed 16 characters";
      if (!/[A-Z]/.test(value)) return "Must include at least one uppercase letter (A–Z)";
      if (!/[a-z]/.test(value)) return "Must include at least one lowercase letter (a–z)";
      if (!/[0-9]/.test(value)) return "Must include at least one number (0–9)";
      if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value))
        return "Must include at least one special character (!@#$...)";
      return "";
    },

    /**
     * Confirm Password
     * - Required
     * - Must exactly match the password field
     */
    confirmPassword: (password, confirmValue) => {
      if (!confirmValue) return "Please confirm your password";
      if (password !== confirmValue) return "Passwords do not match";
      return "";
    },

    /**
     * Checkbox (e.g. Terms & Conditions)
     * - Must be checked/true
     */
    checkbox: (value, message = "You must agree to continue") => {
      if (!value) return message;
      return "";
    },

    /**
     * Generic required field
     * - Value must not be empty
     */
    required: (value, fieldName = "This field") => {
      if (!value || (typeof value === "string" && !value.trim())) {
        return `${fieldName} is required`;
      }
      return "";
    },
  };

  // ─── Password Strength ──────────────────────────────────────────────────────

  /**
   * Evaluates password strength.
   * @param {string} value
   * @returns {"weak" | "medium" | "strong" | null}
   */
  const getPasswordStrength = (value) => {
    if (!value) return null;
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) score++;
    if (value.length >= 12) score++; // bonus for longer password
    if (score <= 2) return "weak";
    if (score <= 3) return "medium";
    return "strong";
  };

  // ─── Bulk Validate ──────────────────────────────────────────────────────────

  /**
   * Run a full validation pass and populate the errors state.
   * @param {object} rules - { fieldName: errorMessageString }
   * @returns {boolean} true if all fields passed validation
   *
   * Example:
   *   const passed = validate({
   *     firstName: validators.firstName(form.firstName),
   *     email:     validators.email(form.email),
   *   });
   */
  const validate = (rules) => {
    const newErrors = {};
    Object.entries(rules).forEach(([field, errorMsg]) => {
      if (errorMsg) newErrors[field] = errorMsg;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    errors,
    setErrors,
    clearErrors,
    isValid,
    validators,
    validate,
    getPasswordStrength,
  };
};

export default useFormValidation;
