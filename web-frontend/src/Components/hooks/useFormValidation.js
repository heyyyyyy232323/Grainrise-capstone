import { useState } from "react";


const useFormValidation = () => {

  const [errors, setErrors] = useState({});


  // =========================================================
  // BASIC HELPERS
  // =========================================================

  const isEmpty = (value) => {
    return (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    );
  };


  // =========================================================
  // FIRST NAME
  // =========================================================

  const firstName = (value) => {

    if (isEmpty(value)) {
      return "First name is required";
    }


    const cleaned = String(value).trim();


    if (cleaned.length < 2) {
      return "First name must contain at least 2 characters";
    }


    if (!/^[A-Za-zÀ-ÿÑñ\s.'-]+$/.test(cleaned)) {
      return "First name contains invalid characters";
    }


    return "";
  };


  // =========================================================
  // MIDDLE INITIAL
  // =========================================================

  const middleInitial = (value) => {

    // Optional field
    if (isEmpty(value)) {
      return "";
    }


    const cleaned = String(value).trim();


    if (!/^[A-Za-z]{1,2}$/.test(cleaned)) {
      return "Enter a valid middle initial";
    }


    return "";
  };


  // =========================================================
  // LAST NAME
  // =========================================================

  const lastName = (value) => {

    if (isEmpty(value)) {
      return "Last name is required";
    }


    const cleaned = String(value).trim();


    if (cleaned.length < 2) {
      return "Last name must contain at least 2 characters";
    }


    if (!/^[A-Za-zÀ-ÿÑñ\s.'-]+$/.test(cleaned)) {
      return "Last name contains invalid characters";
    }


    return "";
  };


  // =========================================================
  // STREET ADDRESS
  // =========================================================

  const streetAddress = (value) => {

    if (isEmpty(value)) {
      return "Street address is required";
    }


    const cleaned = String(value).trim();


    if (cleaned.length < 3) {
      return "Please enter a complete street address";
    }


    return "";
  };


  // =========================================================
  // EMAIL
  // =========================================================

  const email = (value) => {

    if (isEmpty(value)) {
      return "Email address is required";
    }


    const cleaned = String(value).trim();


    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailPattern.test(cleaned)) {
      return "Enter a valid email address";
    }


    return "";
  };


  // =========================================================
  // PHILIPPINE CONTACT NUMBER
  // =========================================================

  const contactNumber = (value) => {

    if (isEmpty(value)) {
      return "Contact number is required";
    }


    let cleaned = String(value)
      .replace(/\s/g, "")
      .replace(/-/g, "");


    // Convert +639XXXXXXXXX → 09XXXXXXXXX
    if (cleaned.startsWith("+63")) {
      cleaned = `0${cleaned.substring(3)}`;
    }


    // Also accept 639XXXXXXXXX
    if (
      cleaned.startsWith("63") &&
      !cleaned.startsWith("+63")
    ) {
      cleaned = `0${cleaned.substring(2)}`;
    }


    if (!/^09\d{9}$/.test(cleaned)) {
      return "Enter a valid Philippine mobile number";
    }


    return "";
  };


  // =========================================================
  // USERNAME
  // =========================================================

  const username = (value) => {

    if (isEmpty(value)) {
      return "Username is required";
    }


    const cleaned = String(value).trim();


    if (cleaned.length < 3) {
      return "Username must contain at least 3 characters";
    }


    if (cleaned.length > 150) {
      return "Username is too long";
    }


    if (!/^[A-Za-z0-9._-]+$/.test(cleaned)) {
      return (
        "Username may only contain letters, numbers, " +
        "periods, underscores, and hyphens"
      );
    }


    return "";
  };


  // =========================================================
  // PASSWORD
  // =========================================================

  const password = (value) => {

    if (isEmpty(value)) {
      return "Password is required";
    }


    const passwordValue = String(value);


    if (passwordValue.length < 8) {
      return "Password must contain at least 8 characters";
    }


    if (!/[A-Z]/.test(passwordValue)) {
      return "Password must contain at least one uppercase letter";
    }


    if (!/[a-z]/.test(passwordValue)) {
      return "Password must contain at least one lowercase letter";
    }


    if (!/[0-9]/.test(passwordValue)) {
      return "Password must contain at least one number";
    }


    if (
      !/[!@#$%^&*(),.?":{}|<>]/.test(
        passwordValue
      )
    ) {
      return "Password must contain at least one special character";
    }


    return "";
  };


  // =========================================================
  // CONFIRM PASSWORD
  // =========================================================

  const confirmPassword = (
    originalPassword,
    confirmationPassword
  ) => {

    if (isEmpty(confirmationPassword)) {
      return "Please confirm your password";
    }


    if (
      originalPassword !==
      confirmationPassword
    ) {
      return "Passwords do not match";
    }


    return "";
  };


  // =========================================================
  // CHECKBOX
  // =========================================================

  const checkbox = (
    checked,
    message = "This field is required"
  ) => {

    if (!checked) {
      return message;
    }


    return "";
  };


  // =========================================================
  // PASSWORD STRENGTH
  // =========================================================

  const getPasswordStrength = (value) => {

    if (!value) {
      return "weak";
    }


    let score = 0;


    if (value.length >= 8) {
      score += 1;
    }


    if (/[A-Z]/.test(value)) {
      score += 1;
    }


    if (/[a-z]/.test(value)) {
      score += 1;
    }


    if (/[0-9]/.test(value)) {
      score += 1;
    }


    if (
      /[!@#$%^&*(),.?":{}|<>]/.test(
        value
      )
    ) {
      score += 1;
    }


    if (score <= 2) {
      return "weak";
    }


    if (score <= 4) {
      return "medium";
    }


    return "strong";
  };


  // =========================================================
  // VALIDATE COMPLETE RULE MAP
  // =========================================================

  const validate = (rules) => {

    const nextErrors = {};


    Object.entries(rules).forEach(
      ([field, errorMessage]) => {

        if (errorMessage) {
          nextErrors[field] = errorMessage;
        }

      }
    );


    setErrors(nextErrors);


    return (
      Object.keys(nextErrors).length === 0
    );
  };


  // =========================================================
  // CLEAR ONE ERROR
  // =========================================================

  const clearError = (field) => {

    setErrors((previous) => {

      const next = {
        ...previous,
      };


      delete next[field];


      return next;
    });

  };


  // =========================================================
  // CLEAR ALL ERRORS
  // =========================================================

  const clearErrors = () => {

    setErrors({});

  };


  // =========================================================
  // EXPORT VALIDATORS
  // =========================================================

  const validators = {

    firstName,

    middleInitial,

    lastName,

    streetAddress,

    email,

    contactNumber,

    username,

    password,

    confirmPassword,

    checkbox,

  };


  return {

    errors,

    setErrors,

    validators,

    validate,

    clearError,

    clearErrors,

    getPasswordStrength,

  };

};


export default useFormValidation;