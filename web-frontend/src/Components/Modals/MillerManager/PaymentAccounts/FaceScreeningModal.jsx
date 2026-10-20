import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Shield,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Eye,
  Info,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import useApi from "../../../../Components/hooks/useApi";

const CHALLENGE_STEPS = [
  { id: "center", label: "Center your face in the camera frame", desc: "Position your face inside the oval frame and hold still" },
  { id: "blink", label: "Blink your eyes naturally", desc: "Close and open your eyes" },
  { id: "turn_left", label: "Turn your head slightly to the left", desc: "Rotate head gently toward your left side" },
  { id: "turn_right", label: "Turn your head slightly to the right", desc: "Rotate head gently toward your right side" },
];

/**
 * Loads an image file into an HTML Image element
 */
function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Creates an optimized preprocessed canvas for Tesseract OCR.
 * - Scales to max 1200px dimension for fast, accurate recognition
 * - Rotates by specified angle (0°, 90°, 180°, 270°)
 * - Applies luminance grayscale and contrast enhancement to reduce background noise
 */
function getPreprocessedCanvas(img, angleDegrees = 0) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const maxDim = 1200;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;

  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }

  const isPerpendicular = angleDegrees === 90 || angleDegrees === 270;
  canvas.width = isPerpendicular ? h : w;
  canvas.height = isPerpendicular ? w : h;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((angleDegrees * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const contrast = 1.25;
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const adjusted = factor * (gray - 128) + 128;
      const finalVal = Math.min(255, Math.max(0, adjusted));
      data[i] = finalVal;
      data[i + 1] = finalVal;
      data[i + 2] = finalVal;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    console.warn("Canvas contrast enhancement skipped:", e);
  }

  return canvas;
}

/**
 * Compute Levenshtein distance between two strings
 */
function getLevenshteinDistance(s1, s2) {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;
  const d = [];
  for (let i = 0; i <= s1.length; i++) d[i] = [i];
  for (let j = 0; j <= s2.length; j++) d[0][j] = j;
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[s1.length][s2.length];
}

/**
 * Normalizes text: lowercases, removes diacritics/accents (ñ -> n), strips non-alphanumeric
 */
function cleanOcrString(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Handles character confusions typical in ID OCR (0->o, 1/|->i, 5->s, 8->b, 3->e, v->u)
 */
function unleetWord(word) {
  if (!word) return "";
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/0/g, "o")
    .replace(/[1|]/g, "i")
    .replace(/5/g, "s")
    .replace(/8/g, "b")
    .replace(/3/g, "e")
    .replace(/v/g, "u")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Check if a name token matches against OCR text and tokens
 */
function matchesComponentToken(targetToken, ocrTokens, ocrText, ocrUnleetTokens, condensedText, condensedUnleet) {
  if (!targetToken) return true;
  const norm = cleanOcrString(targetToken);
  const unleet = unleetWord(norm);
  if (!norm) return true;

  // 1. Direct or unleeted token match
  if (ocrTokens.includes(norm)) return true;
  if (ocrUnleetTokens.includes(unleet)) return true;

  // 2. Word boundary match in text
  const regex = new RegExp(`\\b${norm}\\b`, "i");
  if (regex.test(ocrText)) return true;
  const regexUnleet = new RegExp(`\\b${unleet}\\b`, "i");
  if (regexUnleet.test(ocrText)) return true;

  // 3. Substring in condensed text (handles concatenated words like "servaromeo")
  if (condensedText.includes(norm)) return true;
  if (condensedUnleet.includes(unleet)) return true;

  // 4. Levenshtein distance tolerance for OCR noise
  if (norm.length >= 4) {
    for (let i = 0; i < ocrTokens.length; i++) {
      const ot = ocrTokens[i];
      const uot = ocrUnleetTokens[i];
      if (Math.abs(ot.length - norm.length) <= 1 && getLevenshteinDistance(ot, norm) <= 1) {
        return true;
      }
      if (Math.abs(uot.length - unleet.length) <= 1 && getLevenshteinDistance(uot, unleet) <= 1) {
        return true;
      }
    }
  }
  if (norm.length >= 7) {
    for (const ot of ocrTokens) {
      if (Math.abs(ot.length - norm.length) <= 2 && getLevenshteinDistance(ot, norm) <= 2) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Evaluate Philippine Government ID OCR text against registered manager identity
 */
function evaluatePhilippineIdOcr(rawText, userInfo, accountData, orientation = "0°") {
  if (!rawText || typeof rawText !== "string") {
    return {
      status: "extraction_failure",
      score: 0,
      orientation,
      errorMessage:
        "Unable to read text clearly from the uploaded ID. Please upload a clear, high-contrast, unblurred photo of your official government ID.",
      diagnostics: null,
    };
  }

  const cleanText = cleanOcrString(rawText);
  const ocrTokens = cleanText.split(" ").filter(Boolean);
  const ocrUnleetTokens = ocrTokens.map(unleetWord);
  const condensedText = ocrTokens.join("");
  const condensedUnleet = ocrUnleetTokens.join("");
  const alphaOnly = cleanText.replace(/[^a-z]/g, "");

  // Detect unreadable text or blurry / blank photo
  if (alphaOnly.length < 10 || ocrTokens.length < 3) {
    return {
      status: "extraction_failure",
      score: 0,
      orientation,
      errorMessage:
        "Unable to read text clearly from the uploaded ID. Please upload a clear, high-contrast, unblurred photo of your official government ID.",
      diagnostics: null,
    };
  }

  // 1. Resolve Authenticated Manager Identity (from props or localStorage fallback)
  let authUser = null;
  try {
    const raw = localStorage.getItem("user");
    if (raw) authUser = JSON.parse(raw);
  } catch {}

  let firstName = (userInfo?.first_name || authUser?.first_name || "").trim();
  let middleInitial = (userInfo?.middle_initial || authUser?.middle_initial || "").trim();
  let lastName = (userInfo?.last_name || authUser?.last_name || "").trim();
  let suffix = (userInfo?.suffix || authUser?.suffix || "").trim();
  let fullName = (userInfo?.full_name || authUser?.full_name || "").trim();

  // Fallback parsing from full_name or accountData if separate fields are missing
  if (!firstName && !lastName) {
    const rawName = fullName || accountData?.account_name || "";
    if (rawName) {
      const parts = rawName.trim().split(/\s+/);
      const knownSuffixes = ["sr", "sr.", "jr", "jr.", "ii", "iii", "iv", "v", "1st", "2nd", "3rd"];
      if (parts.length > 1 && knownSuffixes.includes(parts[parts.length - 1].toLowerCase())) {
        suffix = parts.pop();
      }
      if (parts.length > 1) {
        lastName = parts.pop();
      }
      if (parts.length > 1 && /^[a-zA-Z]\.?$/.test(parts[parts.length - 1])) {
        middleInitial = parts.pop();
      }
      firstName = parts.join(" ");
    }
  }

  const managerDisplayName =
    fullName || [firstName, middleInitial, lastName, suffix].filter(Boolean).join(" ");

  const tokenizeName = (str) =>
    cleanOcrString(str)
      .split(" ")
      .filter((t) => t.length >= 2);

  const firstTokens = tokenizeName(firstName);
  const lastTokens = tokenizeName(lastName);
  const cleanMi = cleanOcrString(middleInitial).replace(/[^a-z]/g, "");
  const cleanSuffix = unleetWord(cleanOcrString(suffix));

  // 2. Evaluate Last Name / Surname
  let matchedLast = 0;
  lastTokens.forEach((tok) => {
    if (matchesComponentToken(tok, ocrTokens, rawText, ocrUnleetTokens, condensedText, condensedUnleet)) {
      matchedLast += 1;
    }
  });
  // Check if concatenated surname matches (e.g. "delacruz")
  const condensedLast = lastTokens.join("");
  const isCondensedLastMatched = condensedLast.length >= 4 && (condensedText.includes(condensedLast) || condensedUnleet.includes(condensedLast));

  const lastRatio = lastTokens.length > 0 ? matchedLast / lastTokens.length : 1;
  const isLastMatched =
    isCondensedLastMatched ||
    (lastTokens.length > 0
      ? lastTokens.length === 1
        ? matchedLast === 1
        : lastRatio >= 0.75
      : true);

  // 3. Evaluate First Name / Given Name
  let matchedFirst = 0;
  firstTokens.forEach((tok) => {
    if (matchesComponentToken(tok, ocrTokens, rawText, ocrUnleetTokens, condensedText, condensedUnleet)) {
      matchedFirst += 1;
    }
  });
  const firstRatio = firstTokens.length > 0 ? matchedFirst / firstTokens.length : 1;
  const isFirstMatched =
    firstTokens.length > 0
      ? firstTokens.length === 1
        ? matchedFirst === 1
        : firstRatio >= 0.5
      : true;

  // 4. Evaluate Middle Initial
  let miMatched = true;
  if (cleanMi) {
    if (cleanMi.length === 1) {
      miMatched =
        ocrTokens.includes(cleanMi) ||
        ocrUnleetTokens.includes(unleetWord(cleanMi)) ||
        new RegExp(`\\b${cleanMi}\\.?\\b`, "i").test(rawText) ||
        ocrTokens.some((t) => t.length >= 3 && t.startsWith(cleanMi));
    } else {
      miMatched = matchesComponentToken(cleanMi, ocrTokens, rawText, ocrUnleetTokens, condensedText, condensedUnleet);
    }
  }

  // 5. Evaluate Suffix
  let suffixMatched = true;
  if (cleanSuffix) {
    suffixMatched =
      ocrTokens.includes(cleanSuffix) ||
      ocrUnleetTokens.includes(cleanSuffix) ||
      new RegExp(`\\b${cleanSuffix}\\.?\\b`, "i").test(rawText) ||
      (cleanSuffix === "sr" && (rawText.toLowerCase().includes("senior") || ocrUnleetTokens.includes("sr"))) ||
      (cleanSuffix === "jr" && (rawText.toLowerCase().includes("junior") || ocrUnleetTokens.includes("jr")));
  }

  // Diagnostics object
  const diagnostics = {
    lastName: lastName || (firstTokens.length > 1 ? lastTokens.join(" ") : lastName),
    lastNameMatched: isLastMatched,
    firstName: firstName || firstTokens.join(" "),
    firstNameMatched: isFirstMatched,
    middleInitial: middleInitial || null,
    middleInitialMatched: cleanMi ? miMatched : null,
    suffix: suffix || null,
    suffixMatched: cleanSuffix ? suffixMatched : null,
    orientation,
  };

  // If surname or given name does not match, determine Name Mismatch
  if (!isLastMatched || !isFirstMatched) {
    const totalTokensCount = firstTokens.length + lastTokens.length;
    const partialScore =
      totalTokensCount > 0
        ? Math.round(((matchedLast + matchedFirst) / totalTokensCount) * 40)
        : 0;

    return {
      status: "mismatch",
      score: partialScore,
      orientation,
      managerDisplayName,
      diagnostics,
      errorMessage: `The name detected on this ID does not match your registered manager name (${managerDisplayName}). Please provide your official Government ID.`,
    };
  }

  // Match passed!
  let score = 50 * (isCondensedLastMatched ? 1 : lastRatio) + 35 * firstRatio;
  if (cleanMi && miMatched) score += 10;
  else if (!cleanMi) score += 10;

  if (cleanSuffix && suffixMatched) score += 5;
  else if (!cleanSuffix) score += 5;

  const finalScore = Math.min(100, Math.max(75, Math.round(score)));

  return {
    status: "passed",
    score: finalScore,
    orientation,
    managerDisplayName,
    diagnostics,
    errorMessage: "",
  };
}

export default function FaceScreeningModal({
  isOpen,
  onClose,
  accountData,
  userInfo,
  onAccountCreated,
}) {
  const { request } = useApi();

  // Multi-step screening: 'intro' | 'id_ocr' | 'liveness'
  const [step, setStep] = useState("intro");
  const [hasConsented, setHasConsented] = useState(false);

  // Step 1: ID OCR
  const [idFile, setIdFile] = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [isScanningId, setIsScanningId] = useState(false);
  const [idOcrText, setIdOcrText] = useState("");
  const [idMatchScore, setIdMatchScore] = useState(null);
  const [idVerificationStatus, setIdVerificationStatus] = useState(null); // 'passed' | 'mismatch' | 'extraction_failure'
  const [idOcrError, setIdOcrError] = useState("");
  const [managerDisplayName, setManagerDisplayName] = useState("");
  const [idDiagnostics, setIdDiagnostics] = useState(null);
  const fileInputRef = useRef(null);

  // Step 2: Live Face Challenge with MediaPipe FaceLandmarker
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const landmarkerRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [visionStatusMessage, setVisionStatusMessage] = useState("");

  // Overall Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Tracking state refs for real vision challenges across animation frames
  const challengeStateRef = useRef({
    stepIndex: 0,
    centeredCount: 0,
    eyeClosedDetected: false,
    turnedLeftCount: 0,
    turnedRightCount: 0,
    turnLeftDirection: null,
    lastTimestamp: 0,
  });

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      setStep("intro");
      setHasConsented(false);
      setIdFile(null);
      setIdPreview(null);
      setIsScanningId(false);
      setIdOcrText("");
      setIdMatchScore(null);
      setIdVerificationStatus(null);
      setManagerDisplayName("");
      setIdDiagnostics(null);
      setIdOcrError("");
      setCurrentChallengeIndex(0);
      setChallengeProgress(0);
      setLivenessPassed(false);
      setVisionStatusMessage("");
      setErrorMessage("");
      challengeStateRef.current = {
        stepIndex: 0,
        centeredCount: 0,
        eyeClosedDetected: false,
        turnedLeftCount: 0,
        turnedRightCount: 0,
        turnLeftDirection: null,
        lastTimestamp: 0,
      };
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Clean up ID preview URL
  useEffect(() => {
    return () => {
      if (idPreview) {
        URL.revokeObjectURL(idPreview);
      }
    };
  }, [idPreview]);

  // Stop camera and cleanup model resources
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (landmarkerRef.current) {
      try {
        landmarkerRef.current.close();
      } catch (closeErr) {
        console.warn("Error closing FaceLandmarker:", closeErr);
      }
      landmarkerRef.current = null;
    }
    setCameraActive(false);
    setIsModelLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!isOpen) return null;

  // ─────────────────────────────────────────────────────────────
  // 1. OCR PROCESSING FOR GOVERNMENT ID (Tesseract.js)
  // ─────────────────────────────────────────────────────────────
  const handleIdUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIdFile(file);
    if (idPreview) URL.revokeObjectURL(idPreview);
    setIdPreview(URL.createObjectURL(file));
    setIdOcrError("");
    setIsScanningId(true);
    setIdMatchScore(null);
    setIdVerificationStatus(null);
    setIdDiagnostics(null);

    let worker = null;
    try {
      // 1. Preload image onto Image object
      const img = await loadImageElement(file);

      // 2. Initialize Tesseract worker
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng");

      // 3. Multi-Orientation Evaluation Loop (0°, 90°, 270°, 180°)
      const angles = [0, 90, 270, 180];
      let bestEvaluation = null;

      for (const angle of angles) {
        // Preprocess canvas with optimal scaling, rotation, grayscale, and contrast enhancement
        const canvas = getPreprocessedCanvas(img, angle);
        const ret = await worker.recognize(canvas);
        const text = ret?.data?.text || "";

        const evaluation = evaluatePhilippineIdOcr(text, userInfo, accountData, `${angle}°`);

        if (evaluation.status === "passed") {
          bestEvaluation = evaluation;
          setIdOcrText(text);
          break; // Found matching orientation! Proceed immediately
        }

        // Track best match across angles
        if (
          !bestEvaluation ||
          (evaluation.status === "mismatch" && bestEvaluation.status === "extraction_failure") ||
          (evaluation.score > (bestEvaluation.score || 0))
        ) {
          bestEvaluation = evaluation;
          setIdOcrText(text);
        }
      }

      if (bestEvaluation) {
        setIdVerificationStatus(bestEvaluation.status);
        setIdMatchScore(bestEvaluation.score);
        setManagerDisplayName(bestEvaluation.managerDisplayName || "");
        setIdDiagnostics(bestEvaluation.diagnostics || null);

        if (bestEvaluation.status !== "passed") {
          setIdOcrError(bestEvaluation.errorMessage);
        }
      }
    } catch (err) {
      console.error("ID OCR Error:", err);
      setIdVerificationStatus("extraction_failure");
      setIdMatchScore(0);
      setIdDiagnostics(null);
      setIdOcrError(
        "Unable to read text clearly from the uploaded ID. Please upload a clear, high-contrast, unblurred photo of your official government ID."
      );
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {}
      }
      setIsScanningId(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. REAL MEDIAPIPE FACE LANDMARKER & COMPUTER VISION CHALLENGE
  // ─────────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError("");
    setIsModelLoading(true);
    setVisionStatusMessage("Initializing camera & face vision detector...");
    challengeStateRef.current = {
      stepIndex: 0,
      centeredCount: 0,
      eyeClosedDetected: false,
      turnedLeftCount: 0,
      turnedRightCount: 0,
      turnLeftDirection: null,
      lastTimestamp: 0,
    };
    setCurrentChallengeIndex(0);
    setChallengeProgress(0);
    setLivenessPassed(false);

    try {
      // 1. Start camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      // 2. Initialize MediaPipe FaceLandmarker
      let landmarker = null;
      try {
        const vision = await import("@mediapipe/tasks-vision");
        
        // Try jsdelivr first, fallback to unpkg for reliable wasm binaries
        let filesetResolver = null;
        try {
          filesetResolver = await vision.FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm"
          );
        } catch (cdnErr) {
          console.warn("jsdelivr CDN failed, falling back to unpkg:", cdnErr);
          filesetResolver = await vision.FilesetResolver.forVisionTasks(
            "https://unpkg.com/@mediapipe/tasks-vision@1.1.1/wasm"
          );
        }

        // Try GPU delegate first, fallback to CPU delegate for maximum compatibility
        try {
          landmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          });
        } catch (gpuErr) {
          console.warn("GPU delegate failed, falling back to CPU delegate:", gpuErr);
          landmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "CPU",
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          });
        }

        landmarkerRef.current = landmarker;
      } catch (modelErr) {
        console.error("Failed to initialize MediaPipe FaceLandmarker:", modelErr);
        setIsModelLoading(false);
        setCameraError(
          "Could not initialize the facial detection model. Please check your internet connection and click Retry Camera."
        );
        return;
      }

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        
        const onReady = () => {
          video.play().catch((e) => console.warn("Video play interrupted:", e));
          setCameraActive(true);
          setIsModelLoading(false);
          setVisionStatusMessage("Face tracking active");
          startVisionTrackingLoop();
        };

        if (video.readyState >= 1) {
          onReady();
        } else {
          video.onloadedmetadata = onReady;
        }
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setIsModelLoading(false);
      setCameraError(
        "Could not access web camera. Please ensure camera permissions are granted in your browser settings."
      );
    }
  };

  const startVisionTrackingLoop = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const trackFrame = (timestamp) => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended || video.readyState < 2 || !video.videoWidth) {
        animFrameRef.current = requestAnimationFrame(trackFrame);
        return;
      }

      const landmarker = landmarkerRef.current;
      const state = challengeStateRef.current;

      if (landmarker) {
        // Enforce strictly monotonically increasing timestamp for MediaPipe Video mode
        const now = performance.now();
        const frameTime = Math.max(Math.round(now), (state.lastTimestamp || 0) + 1);
        state.lastTimestamp = frameTime;

        try {
          const results = landmarker.detectForVideo(video, frameTime);
          const landmarks = results?.faceLandmarks?.[0];
          const blendshapes = results?.faceBlendshapes?.[0]?.categories || [];

          if (!landmarks || landmarks.length === 0) {
            setVisionStatusMessage("No face detected in camera frame");
          } else {
            // Landmark 1: Nose tip
            // Landmark 234: Subject right cheek (camera left)
            // Landmark 454: Subject left cheek (camera right)
            const nose = landmarks[1];
            const leftCheek = landmarks[234];
            const rightCheek = landmarks[454];
            const faceWidth = Math.abs(rightCheek.x - leftCheek.x);

            // 1. STEP 0: Centered Face
            if (state.stepIndex === 0) {
              const isCentered =
                nose.x >= 0.30 &&
                nose.x <= 0.70 &&
                nose.y >= 0.20 &&
                nose.y <= 0.75 &&
                faceWidth >= 0.09 &&
                faceWidth <= 0.65;

              if (isCentered) {
                state.centeredCount += 1;
                const prog = Math.min(100, Math.round((state.centeredCount / 16) * 100));
                setChallengeProgress(prog);
                setVisionStatusMessage("Face centered! Hold still...");
                if (prog >= 100) {
                  state.stepIndex = 1;
                  setCurrentChallengeIndex(1);
                  setChallengeProgress(0);
                  state.eyeClosedDetected = false;
                  setVisionStatusMessage("Great! Now blink your eyes naturally");
                }
              } else {
                state.centeredCount = Math.max(0, state.centeredCount - 1);
                if (faceWidth < 0.09) {
                  setVisionStatusMessage("Move a little closer to the camera");
                } else if (faceWidth > 0.65) {
                  setVisionStatusMessage("Move a little further from the camera");
                } else if (nose.x < 0.30 || nose.x > 0.70) {
                  setVisionStatusMessage("Move your head toward the center");
                } else if (nose.y < 0.20 || nose.y > 0.75) {
                  setVisionStatusMessage("Adjust camera height to center your face");
                }
              }
            }

            // 2. STEP 1: Blink
            else if (state.stepIndex === 1) {
              let blinkLeftScore = 0;
              let blinkRightScore = 0;
              blendshapes.forEach((b) => {
                if (b.categoryName === "eyeBlinkLeft") blinkLeftScore = b.score;
                if (b.categoryName === "eyeBlinkRight") blinkRightScore = b.score;
              });

              // Fallback to geometric EAR (Eye Aspect Ratio)
              const leftEyeHeight = Math.abs(landmarks[159].y - landmarks[145].y);
              const leftEyeWidth = Math.abs(landmarks[133].x - landmarks[33].x) || 1;
              const earLeft = leftEyeHeight / leftEyeWidth;

              const rightEyeHeight = Math.abs(landmarks[386].y - landmarks[374].y);
              const rightEyeWidth = Math.abs(landmarks[263].x - landmarks[362].x) || 1;
              const earRight = rightEyeHeight / rightEyeWidth;

              const isEyesClosed =
                blinkLeftScore > 0.35 ||
                blinkRightScore > 0.35 ||
                earLeft < 0.18 ||
                earRight < 0.18;

              if (isEyesClosed) {
                state.eyeClosedDetected = true;
                setChallengeProgress(50);
                setVisionStatusMessage("Eyes closed detected, now open your eyes");
              } else if (state.eyeClosedDetected) {
                // Eyes opened back up after closure -> full blink confirmed!
                setChallengeProgress(100);
                state.stepIndex = 2;
                setCurrentChallengeIndex(2);
                state.turnedLeftCount = 0;
                state.turnLeftDirection = null;
                setVisionStatusMessage("Blink verified! Turn head slightly to the left");
                setTimeout(() => setChallengeProgress(0), 150);
              } else {
                setVisionStatusMessage("Blink your eyes naturally");
              }
            }

            // 3. STEP 2: Turn Head Left
            else if (state.stepIndex === 2) {
              const distLeft = Math.abs(nose.x - leftCheek.x);
              const distRight = Math.abs(rightCheek.x - nose.x);
              const yawRatio = distLeft / (distLeft + distRight || 1);

              // User turns left: yaw shifts towards user's left (yawRatio >= 0.56) or mirrored screen left (yawRatio <= 0.44)
              const isTurnedLeft = yawRatio >= 0.56 || yawRatio <= 0.44;

              if (isTurnedLeft) {
                state.turnLeftDirection = yawRatio >= 0.56 ? "user_left" : "screen_left";
                state.turnedLeftCount += 1;
                const prog = Math.min(100, Math.round((state.turnedLeftCount / 12) * 100));
                setChallengeProgress(prog);
                setVisionStatusMessage("Left turn detected! Hold briefly...");
                if (prog >= 100) {
                  state.stepIndex = 3;
                  setCurrentChallengeIndex(3);
                  setChallengeProgress(0);
                  state.turnedRightCount = 0;
                  setVisionStatusMessage("Great! Now turn your head slightly to the right");
                }
              } else {
                state.turnedLeftCount = Math.max(0, state.turnedLeftCount - 1);
                setVisionStatusMessage("Turn your head slightly to your left");
              }
            }

            // 4. STEP 3: Turn Head Right
            else if (state.stepIndex === 3) {
              const distLeft = Math.abs(nose.x - leftCheek.x);
              const distRight = Math.abs(rightCheek.x - nose.x);
              const yawRatio = distLeft / (distLeft + distRight || 1);

              // Must rotate in opposite direction of Step 2!
              const isTurnedRight =
                state.turnLeftDirection === "screen_left"
                  ? yawRatio >= 0.56
                  : yawRatio <= 0.44;

              if (isTurnedRight) {
                state.turnedRightCount += 1;
                const prog = Math.min(100, Math.round((state.turnedRightCount / 12) * 100));
                setChallengeProgress(prog);
                setVisionStatusMessage("Right turn detected! Completing...");
                if (prog >= 100) {
                  setLivenessPassed(true);
                  stopCamera();
                  return; // All challenges finished successfully!
                }
              } else {
                state.turnedRightCount = Math.max(0, state.turnedRightCount - 1);
                setVisionStatusMessage("Turn your head slightly to your right");
              }
            }
          }
        } catch (cvErr) {
          console.error("Computer vision frame error:", cvErr);
        }
      }

      animFrameRef.current = requestAnimationFrame(trackFrame);
    };

    animFrameRef.current = requestAnimationFrame(trackFrame);
  };

  // ─────────────────────────────────────────────────────────────
  // 3. SUBMIT ACCOUNT CREATION
  // ─────────────────────────────────────────────────────────────
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const res = await request("/miller/payment-accounts/branches/", {
        method: "POST",
        body: accountData,
      });

      if (res && res.success) {
        if (onAccountCreated) {
          onAccountCreated(res.data);
        }
        onClose();
      } else {
        const errorMsg =
          res?.data?.message ||
          res?.message ||
          res?.error ||
          "Failed to create payment account. Please try again.";
        setErrorMessage(errorMsg);
      }
    } catch (err) {
      console.error("Account creation failed:", err);
      const msg =
        err?.data?.message ||
        err?.message ||
        "Failed to create payment account. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Manager Identity Screening
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Privacy Disclaimer Banner */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 leading-relaxed">
            <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-900">
                Browser-Side Face Movement Screening
              </span>
              This automated check verifies camera presence and natural responsiveness locally in your browser. It does not authenticate Government ID validity or grant provider verification status. Grainrise does not transmit or retain facial recordings.
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 0: INTRO & CONSENT */}
          {step === "intro" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Payment Account to Register
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400">Type:</span>{" "}
                    <b className="capitalize text-slate-800">{accountData?.account_type}</b>
                  </div>
                  <div>
                    <span className="text-slate-400">Account Name:</span>{" "}
                    <b className="text-slate-800">{accountData?.account_name}</b>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Account Number:</span>{" "}
                    <b className="font-mono text-slate-800">{accountData?.account_number}</b>
                  </div>
                  {accountData?.bank_name && (
                    <div className="col-span-2">
                      <span className="text-slate-400">Bank:</span>{" "}
                      <b className="text-slate-800">{accountData?.bank_name}</b> ({accountData?.card_type})
                    </div>
                  )}
                </div>
              </div>

              {/* Explicit Consent Checkbox */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasConsented}
                    onChange={(e) => setHasConsented(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="leading-relaxed">
                    I explicitly consent to browser-side Government ID OCR and live camera face screening. I understand that Grainrise executes all checks locally in my browser and never stores my ID images or facial biometric recordings.
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!hasConsented}
                  onClick={() => setStep("id_ocr")}
                  className="px-5 py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>Begin ID Verification</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: ID OCR */}
          {step === "id_ocr" && (
            <div className="space-y-4">
              <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-emerald-500 transition cursor-pointer bg-slate-50">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleIdUpload}
                  className="hidden"
                />

                {idPreview ? (
                  <div className="space-y-3">
                    <img
                      src={idPreview}
                      alt="ID Preview"
                      className="max-h-48 mx-auto rounded-lg object-contain shadow-xs border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      <RefreshCw size={13} />
                      <span>Change ID Photo</span>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="py-6 space-y-2"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                      <Upload size={22} />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                      Upload Government ID Photo
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Driver's License, PhilSys, UMID, or Passport. Scanned locally via Tesseract.js.
                    </p>
                  </div>
                )}
              </div>

              {/* OCR Scanning indicator */}
              {isScanningId && (
                <div className="p-3 rounded-xl bg-slate-100 flex items-center gap-2.5 text-xs text-slate-700">
                  <Loader2 size={16} className="animate-spin text-emerald-700 shrink-0" />
                  <span>Scanning ID for manager name verification...</span>
                </div>
              )}

              {/* ID Match Feedback */}
              {!isScanningId && idVerificationStatus && (
                <div
                  className={`p-3.5 rounded-xl flex items-start gap-2.5 text-xs ${
                    idVerificationStatus === "passed"
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border border-rose-200 text-rose-800"
                  }`}
                >
                  {idVerificationStatus === "passed" ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="font-bold block">
                      {idVerificationStatus === "passed"
                        ? "Name Verification Passed"
                        : idVerificationStatus === "extraction_failure"
                        ? "OCR Extraction Failure"
                        : "Name Mismatch"}
                    </span>
                    <span className="text-[11px] leading-relaxed block mt-0.5">
                      {idVerificationStatus === "passed" ? (
                        <>
                          Successfully verified manager identity:{" "}
                          <b>
                            {managerDisplayName ||
                              `${userInfo?.first_name || ""} ${userInfo?.last_name || ""}`}
                          </b>
                        </>
                      ) : (
                        idOcrError
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Concise Detected Name Components Diagnostic */}
              {!isScanningId && idDiagnostics && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold border-b border-slate-200/80 pb-1.5">
                    <span className="text-slate-700">Detected Name Components</span>
                    {idDiagnostics.orientation && (
                      <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        Scan Angle: {idDiagnostics.orientation}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Last Name / Surname */}
                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
                      {idDiagnostics.lastNameMatched ? (
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle size={15} className="text-rose-500 shrink-0" />
                      )}
                      <div className="truncate flex-1">
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                          Surname (Last Name)
                        </span>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-slate-800 truncate">
                            {idDiagnostics.lastName || "—"}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              idDiagnostics.lastNameMatched ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            {idDiagnostics.lastNameMatched ? "Matched" : "Missing"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* First Name / Given Name */}
                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
                      {idDiagnostics.firstNameMatched ? (
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle size={15} className="text-rose-500 shrink-0" />
                      )}
                      <div className="truncate flex-1">
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                          Given Name (First)
                        </span>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-slate-800 truncate">
                            {idDiagnostics.firstName || "—"}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              idDiagnostics.firstNameMatched ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            {idDiagnostics.firstNameMatched ? "Matched" : "Missing"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Initial (if configured) */}
                    {idDiagnostics.middleInitial && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
                        {idDiagnostics.middleInitialMatched ? (
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle size={15} className="text-amber-500 shrink-0" />
                        )}
                        <div className="truncate flex-1">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                            Middle Initial
                          </span>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-slate-800 truncate">
                              {idDiagnostics.middleInitial}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                idDiagnostics.middleInitialMatched ? "text-emerald-700" : "text-amber-600"
                              }`}
                            >
                              {idDiagnostics.middleInitialMatched ? "Matched" : "Optional"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Suffix (if configured) */}
                    {idDiagnostics.suffix && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
                        {idDiagnostics.suffixMatched ? (
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle size={15} className="text-amber-500 shrink-0" />
                        )}
                        <div className="truncate flex-1">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                            Suffix
                          </span>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-slate-800 truncate">
                              {idDiagnostics.suffix}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                idDiagnostics.suffixMatched ? "text-emerald-700" : "text-amber-600"
                              }`}
                            >
                              {idDiagnostics.suffixMatched ? "Matched" : "Optional"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("intro")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!idFile || isScanningId || idVerificationStatus !== "passed"}
                  onClick={() => {
                    setStep("liveness");
                    startCamera();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>Proceed to Face Liveness</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: REAL LIVENESS CHALLENGE */}
          {step === "liveness" && (
            <div className="space-y-4">
              <div className="relative aspect-4/3 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${
                    livenessPassed ? "opacity-30" : ""
                  }`}
                />

                {/* Oval Overlay Frame */}
                {!livenessPassed && cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-64 border-2 border-dashed border-emerald-400/80 rounded-full animate-pulse shadow-sm" />
                  </div>
                )}

                {/* Loading State */}
                {isModelLoading && (
                  <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center p-6 text-center text-white space-y-2">
                    <Loader2 size={28} className="animate-spin text-emerald-400" />
                    <p className="text-xs font-medium text-slate-200">{visionStatusMessage}</p>
                  </div>
                )}

                {/* Camera Error Message */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                    <AlertCircle size={32} className="text-rose-400" />
                    <p className="text-xs text-rose-200">{cameraError}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      Retry Camera
                    </button>
                  </div>
                )}

                {/* Passed Overlay */}
                {livenessPassed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/85 text-white space-y-2 p-6 text-center animate-in fade-in">
                    <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <CheckCircle2 size={32} />
                    </div>
                    <p className="text-sm font-bold">Face Liveness Verified</p>
                    <p className="text-xs text-emerald-200">
                      Real computer vision face challenge completed successfully.
                    </p>
                  </div>
                )}
              </div>

              {/* Challenge Instruction */}
              {!livenessPassed && cameraActive && !isModelLoading && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">
                      Step {currentChallengeIndex + 1} of {CHALLENGE_STEPS.length}:
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      {challengeProgress}%
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {CHALLENGE_STEPS[currentChallengeIndex].label}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {CHALLENGE_STEPS[currentChallengeIndex].desc}
                    </p>
                  </div>

                  {/* Real-time feedback status badge */}
                  {visionStatusMessage && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-100">
                      <Sparkles size={12} className="shrink-0 text-emerald-600 animate-pulse" />
                      <span>{visionStatusMessage}</span>
                    </div>
                  )}

                  {/* Progress Bar reflecting real detection frames */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-1.5 transition-all duration-150"
                      style={{ width: `${challengeProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setStep("id_ocr");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Back to ID
                </button>

                <button
                  type="button"
                  disabled={!livenessPassed || isSubmitting}
                  onClick={handleFinalSubmit}
                  className="px-6 py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Account...</span>
                    </>
                  ) : (
                    <span>Save Payment Account</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
