import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import useApi from "./useApi";


const DEFAULT_OTP_LENGTH = 6;
const DEFAULT_RESEND_SECONDS = 60;


const useEmailOTP = ({
  sendEndpoint,
  verifyEndpoint,
  email = "",
  additionalSendData = {},
  additionalVerifyData = {},
  otpLength = DEFAULT_OTP_LENGTH,
  resendSeconds = DEFAULT_RESEND_SECONDS,
} = {}) => {

  const { request } = useApi();


  // =========================================================
  // OTP STATE
  // =========================================================

  const [otp, setOtp] = useState(
    Array(otpLength).fill("")
  );

  const [verificationToken, setVerificationToken] =
    useState("");

  const [isVerified, setIsVerified] =
    useState(false);

  const [timer, setTimer] =
    useState(0);

  const [isSending, setIsSending] =
    useState(false);

  const [isVerifying, setIsVerifying] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");


  // =========================================================
  // REQUEST LOCK
  // =========================================================
  //
  // Prevents accidental double-click requests.
  // =========================================================

  const sendingRef =
    useRef(false);

  const verifyingRef =
    useRef(false);


  // =========================================================
  // RESET OTP INPUT
  // =========================================================

  const clearOtp = useCallback(() => {

    setOtp(
      Array(otpLength).fill("")
    );

  }, [otpLength]);


  // =========================================================
  // RESET VERIFICATION
  // =========================================================

  const resetVerification = useCallback(() => {

    clearOtp();

    setVerificationToken("");

    setIsVerified(false);

    setTimer(0);

    setError("");

    setMessage("");

  }, [clearOtp]);


  // =========================================================
  // EMAIL CHANGE
  // =========================================================
  //
  // If the user changes email after verification,
  // old verification must no longer be valid in the UI.
  // =========================================================

  const previousEmailRef =
    useRef(email);


  useEffect(() => {

    const previousEmail =
      String(
        previousEmailRef.current || ""
      )
        .trim()
        .toLowerCase();


    const currentEmail =
      String(
        email || ""
      )
        .trim()
        .toLowerCase();


    if (
      previousEmail &&
      previousEmail !== currentEmail
    ) {

      clearOtp();

      setVerificationToken("");

      setIsVerified(false);

      setTimer(0);

      setError("");

      setMessage("");

    }


    previousEmailRef.current =
      email;

  }, [
    email,
    clearOtp,
  ]);


  // =========================================================
  // RESEND TIMER
  // =========================================================

  useEffect(() => {

    if (timer <= 0) {
      return undefined;
    }


    const interval =
      window.setInterval(
        () => {

          setTimer(
            (previous) =>
              Math.max(
                previous - 1,
                0
              )
          );

        },
        1000
      );


    return () => {

      window.clearInterval(
        interval
      );

    };

  }, [timer]);


  // =========================================================
  // OTP DIGIT CHANGE
  // =========================================================

  const updateOtpDigit = useCallback(
    (
      index,
      value
    ) => {

      const digit =
        String(value || "")
          .replace(/\D/g, "")
          .slice(-1);


      if (
        index < 0 ||
        index >= otpLength
      ) {
        return;
      }


      setOtp(
        (previous) => {

          const updated = [
            ...previous
          ];


          updated[index] =
            digit;


          return updated;

        }
      );


      setError("");

    },
    [otpLength]
  );


  // =========================================================
  // SET COMPLETE OTP
  // =========================================================
  //
  // Useful for paste / autofill.
  // =========================================================

  const setCompleteOtp = useCallback(
    (value) => {

      const digits =
        String(value || "")
          .replace(/\D/g, "")
          .slice(
            0,
            otpLength
          )
          .split("");


      setOtp(
        Array.from(
          {
            length:
              otpLength,
          },

          (_, index) =>
            digits[index] || ""
        )
      );


      setError("");

    },
    [otpLength]
  );


  // =========================================================
  // OTP STRING
  // =========================================================

  const otpValue =
    otp.join("");


  const isOtpComplete =
    otpValue.length === otpLength &&
    otp.every(Boolean);


  // =========================================================
  // SEND OTP
  // =========================================================

  const sendOtp = useCallback(
    async (
      overrideData = {}
    ) => {

      if (sendingRef.current) {
        return null;
      }


      if (!sendEndpoint) {

        const message =
          "OTP send endpoint is not configured.";

        setError(message);

        throw new Error(message);

      }


      const normalizedEmail =
        String(email || "")
          .trim()
          .toLowerCase();


      if (!normalizedEmail) {

        const message =
          "Email address is required.";

        setError(message);

        throw new Error(message);

      }


      sendingRef.current =
        true;

      setIsSending(true);

      setError("");

      setMessage("");


      try {

        const response =
          await request(
            sendEndpoint,
            {
              method: "POST",

              body: {
                email:
                  normalizedEmail,

                ...additionalSendData,

                ...overrideData,
              },

              throwOnError:
                true,
            }
          );


        clearOtp();

        setVerificationToken("");

        setIsVerified(false);


        setTimer(
          Number(
            response?.retry_after
          ) ||
          resendSeconds
        );


        setMessage(
          response?.message ||
          "Verification code sent successfully."
        );


        return response;


      } catch (requestError) {

        const message =
          requestError?.message ||
          "Unable to send verification code.";


        setError(message);

        throw requestError;


      } finally {

        sendingRef.current =
          false;

        setIsSending(false);

      }

    },
    [
      additionalSendData,
      clearOtp,
      email,
      request,
      resendSeconds,
      sendEndpoint,
    ]
  );


  // =========================================================
  // RESEND OTP
  // =========================================================

  const resendOtp = useCallback(
    async (
      overrideData = {}
    ) => {

      if (timer > 0) {
        return null;
      }


      return sendOtp(
        overrideData
      );

    },
    [
      sendOtp,
      timer,
    ]
  );


  // =========================================================
  // VERIFY OTP
  // =========================================================

  const verifyOtp = useCallback(
    async (
      overrideData = {}
    ) => {

      if (verifyingRef.current) {
        return null;
      }


      if (!verifyEndpoint) {

        const message =
          "OTP verification endpoint is not configured.";

        setError(message);

        throw new Error(message);

      }


      const normalizedEmail =
        String(email || "")
          .trim()
          .toLowerCase();


      if (!normalizedEmail) {

        const message =
          "Email address is required.";

        setError(message);

        throw new Error(message);

      }


      if (!isOtpComplete) {

        const message =
          `Please enter the complete ${otpLength}-digit verification code.`;

        setError(message);

        throw new Error(message);

      }


      verifyingRef.current =
        true;

      setIsVerifying(true);

      setError("");

      setMessage("");


      try {

        const response =
          await request(
            verifyEndpoint,
            {
              method: "POST",

              body: {
                email:
                  normalizedEmail,

                otp:
                  otpValue,

                ...additionalVerifyData,

                ...overrideData,
              },

              throwOnError:
                true,
            }
          );


        const token =
          response?.verification_token ||
          "";


        if (!token) {

          throw new Error(
            "Verification succeeded but no verification token was returned by the server."
          );

        }


        setVerificationToken(
          token
        );

        setIsVerified(
          true
        );


        setMessage(
          response?.message ||
          "Email verified successfully."
        );


        return response;


      } catch (requestError) {

        const message =
          requestError?.message ||
          "Unable to verify the code.";


        setVerificationToken("");

        setIsVerified(false);

        setError(message);

        throw requestError;


      } finally {

        verifyingRef.current =
          false;

        setIsVerifying(false);

      }

    },
    [
      additionalVerifyData,
      email,
      isOtpComplete,
      otpLength,
      otpValue,
      request,
      verifyEndpoint,
    ]
  );


  // =========================================================
  // PUBLIC API
  // =========================================================

  return {

    // OTP
    otp,
    otpValue,
    otpLength,
    isOtpComplete,

    updateOtpDigit,
    setCompleteOtp,
    clearOtp,


    // Verification
    verificationToken,
    isVerified,

    sendOtp,
    resendOtp,
    verifyOtp,
    resetVerification,


    // Timer
    timer,
    canResend:
      timer <= 0 &&
      !isSending,


    // Loading
    isSending,
    isVerifying,


    // Feedback
    error,
    message,

    clearError: () =>
      setError(""),

    clearMessage: () =>
      setMessage(""),
  };

};


export default useEmailOTP;