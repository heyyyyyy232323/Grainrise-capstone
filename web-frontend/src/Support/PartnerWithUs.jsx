import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft, Users, CheckCircle2, Loader2, UploadCloud, X,
  ImageIcon, FileCheck, Mail, Clock, RefreshCw, AlertTriangle, ExternalLink,
  Camera, Plus
} from 'lucide-react';
import LandingHeader from '../Components/Major-Components/LandingHeader';
import LandingFooter from '../Components/Major-Components/LandingFooter';
import shakehandsImg from '../assets/shakehands2.png';
import RichTextEditor from '../Components/Minor-Components/RichTextEditor';
import PolicyModal from '../Components/Minor-Components/PolicyModal';
import AnimatedSection from './AnimatedSection';
import './SupportPages.css';

/* ─── Validation helpers ─── */
const NAME_RE = /^[a-zA-Z\s\-']+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_PARTIAL_RE = /^[^\s@]+@[^\s@]*$/;
const ORG_RE = /^[a-zA-Z0-9\s&.,'\-]+$/;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const POLICY_VERSION = '1.0';
const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api`;

function validateName(v) {
  if (!v.trim()) return 'Full legal name is required.';
  if (!NAME_RE.test(v)) return 'Only letters, spaces, hyphens, and apostrophes are allowed.';
  if (/\s{2,}/.test(v)) return 'Multiple consecutive spaces are not allowed.';
  return '';
}
function validateEmail(v, isTouched) {
  if (!v.trim()) return isTouched ? 'Email address is required.' : '';
  if (!EMAIL_RE.test(v)) {
    if (EMAIL_PARTIAL_RE.test(v)) return '';
    return 'Please enter a valid email address.';
  }
  return '';
}
function validateOrg(v) {
  if (!v.trim()) return 'Organization / Company is required.';
  if (!ORG_RE.test(v)) return 'Invalid character detected.';
  return '';
}
function validateRole(v) {
  if (!v) return 'Please select your intended partner role.';
  return '';
}
function validatePhone(v) {
  if (!v) return 'Contact number is required.';
  if (v.length > 0 && v[0] !== '9') return 'Number must start with 9.';
  if (v.length < 10) return `${10 - v.length} more digit${10 - v.length !== 1 ? 's' : ''} needed.`;
  return '';
}
function validateMessage(v) {
  if (!v.trim()) return 'Message is required.';
  if (v.trim().length < 20) return `At least 20 characters required (${v.trim().length}/20).`;
  return '';
}
function validateImageFile(file) {
  if (!file) return 'Please upload a valid business verification document.';
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_MIME.includes(file.type) || !ALLOWED_EXT.includes(ext))
    return 'Only JPG, PNG, and WEBP image files are allowed.';
  if (file.size > MAX_FILE_BYTES)
    return 'Document image size must not exceed 5 MB.';
  return '';
}
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
const FieldError = ({ msg }) =>
  msg ? <p className="mt-1 text-[11px] text-red-500 leading-tight">{msg}</p> : null;

function inputCls(hasError) {
  return `w-full bg-white dark:bg-[#163321] border rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-800 dark:text-white outline-none focus:ring-2 transition-all
    ${hasError
      ? 'border-red-400 dark:border-red-500 focus:border-red-400 focus:ring-red-200/40'
      : 'border-gray-300 dark:border-[#2d5c3c] focus:border-[#00580C] dark:focus:border-emerald-400 focus:ring-emerald-600/15'}`;
}

export default function PartnerWithUs() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeParams = useParams();
  const fileInputRef = useRef(null);

  /* ── View Modes: 'form' | 'awaiting_verification' | 'verified_success' | 'token_invalid' ── */
  const isDirectVerify = typeof window !== 'undefined' && Boolean(window.location.pathname.includes('/verify-email') || new URLSearchParams(window.location.search).get('token'));
  const [viewState, setViewState] = useState(isDirectVerify ? 'verifying' : 'form');

  /* ── Form state ── */
  const [formData, setFormData] = useState({ name: '', email: '', organization: '', partnerRole: '', contactNumber: '', message: '' });
  const [errors, setErrors] = useState({ name: '', email: '', organization: '', partnerRole: '', contactNumber: '', message: '' });
  const [touched, setTouched] = useState({ name: false, email: false, organization: false, partnerRole: false, contactNumber: false, message: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  /* ── Verification state ── */
  const [inquiryId, setInquiryId] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  /* ── Policy Modal state ── */
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const verifyingRef = useRef(false);

  /* ── Document states: government_issued_id & business_verification_document ── */
  const [govIdFile, setGovIdFile] = useState(null);
  const [bizDocFile, setBizDocFile] = useState(null);
  const [govIdError, setGovIdError] = useState('');
  const [bizDocError, setBizDocError] = useState('');
  const [isGovDragging, setIsGovDragging] = useState(false);
  const [isBizDragging, setIsBizDragging] = useState(false);
  const govIdInputRef = useRef(null);
  const bizDocInputRef = useRef(null);

  /* ── Choice & Camera modal state & refs ── */
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);
  const [choiceTarget, setChoiceTarget] = useState(null); // 'govId' | 'bizDoc'
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState(null); // 'govId' | 'bizDoc'
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [mismatchModalOpen, setMismatchModalOpen] = useState(false);
  const [uncertainModalOpen, setUncertainModalOpen] = useState(false);
  const [availabilityChecking, setAvailabilityChecking] = useState({ name: false, email: false, organization: false });

  /* -- Check for token in URL path or query parameter on mount/change -- calls real API -- */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryToken = params.get('token');
    const pathToken = routeParams?.token || (location.pathname.match(/\/verify-email\/([^/?#]+)/)?.[1]);
    const tokenParam = queryToken || pathToken;

    if (!tokenParam) {
      if (viewState === 'verifying') setViewState('form');
      return;
    }
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setViewState('verifying');

    fetch(`${API_BASE}/partnership-inquiries/verify-email/${tokenParam}/`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setViewState('verified_success');
          try {
            window.history.replaceState({}, document.title, '/partner-with-us');
          } catch { }
        } else {
          setViewState('token_invalid');
        }
      })
      .catch(() => {
        setViewState('token_invalid');
      });
  }, [location.search, location.pathname, routeParams?.token]);

  /* ── Cooldown timer for resend button ── */
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  /* ── Validation dispatch ── */
  const validate = useCallback((name, value) => {
    switch (name) {
      case 'name': return validateName(value);
      case 'email': return validateEmail(value, touched.email);
      case 'organization': return validateOrg(value);
      case 'partnerRole': return validateRole(value);
      case 'contactNumber': return validatePhone(value);
      case 'message': return validateMessage(value);
      default: return '';
    }
  }, [touched.email]);


  /* ── Live Availability Check (Name, Email, Organization) ── */
  const checkAvailability = async (field, value) => {
    if (!value || !value.trim()) return;
    if (field === 'name' && validateName(value)) return;
    if (field === 'email' && validateEmail(value, true)) return;
    if (field === 'organization' && validateOrg(value)) return;

    setAvailabilityChecking(p => ({ ...p, [field]: true }));
    try {
      const qp = field === 'organization' ? 'organization' : field;
      const res = await fetch(`${API_BASE}/partnership-inquiries/check-availability/?${qp}=${encodeURIComponent(value.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (field === 'name' && data.name_used) {
          setErrors(p => ({ ...p, name: data.name_error || 'This name has already been registered.' }));
        } else if (field === 'email' && data.email_used) {
          setErrors(p => ({ ...p, email: data.email_error || 'This email address is already registered.' }));
        } else if (field === 'organization' && data.organization_used) {
          setErrors(p => ({ ...p, organization: data.organization_error || 'This company or organization name is already registered.' }));
        }
      }
    } catch (err) {
      console.warn('Availability check failed:', err);
    } finally {
      setAvailabilityChecking(p => ({ ...p, [field]: false }));
    }
  };

  const isFormValid =
    formData.name.trim() && !validateName(formData.name) &&
    formData.email.trim() && !validateEmail(formData.email, true) &&
    formData.organization.trim() && !validateOrg(formData.organization) &&
    Boolean(formData.partnerRole) && !validateRole(formData.partnerRole) &&
    formData.contactNumber && !validatePhone(formData.contactNumber) &&
    formData.message.trim() && !validateMessage(formData.message) &&
    Boolean(govIdFile) && !govIdError &&
    Boolean(bizDocFile) && !bizDocError &&
    agreedToTerms;

  /* ── Single Document Processing (Government-Issued ID & Business Document) ── */
  const processSingleFile = (file, type) => {
    if (!file) return;
    const isGov = type === 'govId';
    const setFile = isGov ? setGovIdFile : setBizDocFile;
    const setError = isGov ? setGovIdError : setBizDocError;
    const inputRef = isGov ? govIdInputRef : bizDocInputRef;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (!allowed.includes(ext)) {
      setError('Only JPG, PNG, WEBP, and PDF files are allowed.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('File size must not exceed 5 MB.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setError('');
    const isPdf = ext === '.pdf';
    if (isPdf) {
      setFile({
        file,
        preview: null,
        name: file.name,
        size: file.size,
        isPdf: true,
      });
      if (inputRef.current) inputRef.current.value = '';
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFile({
          file,
          preview: e.target.result,
          name: file.name,
          size: file.size,
          isPdf: false,
        });
        if (inputRef.current) inputRef.current.value = '';
      };
      reader.onerror = () => {
        setError('Failed to read image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveSingleFile = (type) => {
    if (type === 'govId') {
      setGovIdFile(null);
      if (submitAttempted) setGovIdError('Valid Government-Issued ID is required.');
      else setGovIdError('');
      if (govIdInputRef.current) govIdInputRef.current.value = '';
    } else {
      setBizDocFile(null);
      if (submitAttempted) setBizDocError('Valid Business Document is required.');
      else setBizDocError('');
      if (bizDocInputRef.current) bizDocInputRef.current.value = '';
    }
  };

  /* ── Choice modal handlers ── */
  const openChoiceModal = (target) => {
    setChoiceTarget(target);
    setChoiceModalOpen(true);
  };

  const closeChoiceModal = useCallback(() => {
    setChoiceModalOpen(false);
    setChoiceTarget(null);
  }, []);

  const handleSelectUpload = () => {
    const target = choiceTarget;
    closeChoiceModal();
    setTimeout(() => {
      if (target === 'govId') {
        govIdInputRef.current?.click();
      } else if (target === 'bizDoc') {
        bizDocInputRef.current?.click();
      }
    }, 80);
  };

  const handleSelectCamera = () => {
    const target = choiceTarget;
    closeChoiceModal();
    openCamera(target);
  };

  /* ── Camera stream and capture handlers ── */
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const closeCameraModal = useCallback(() => {
    stopCameraStream();
    setCameraModalOpen(false);
    setCapturedImage(null);
    setCameraError('');
    setCameraTarget(null);
    setIsStartingCamera(false);
  }, [stopCameraStream]);

  const openCamera = async (target) => {
    setCameraTarget(target);
    setCapturedImage(null);
    setCameraError('');
    setIsStartingCamera(true);
    setCameraModalOpen(true);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported by your browser or device. Please upload a file instead.');
      setIsStartingCamera(false);
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let msg = 'Unable to access camera. Please check camera permissions in your browser or upload a file.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser settings or upload a file instead.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device was found on your device. Please upload a file instead.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is currently in use by another application. Please close it and try again, or upload a file.';
      }
      setCameraError(msg);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
  };

  const handleRetakePhoto = () => {
    setCapturedImage(null);
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleAcceptPhoto = () => {
    if (!capturedImage || !cameraTarget) return;

    try {
      const arr = capturedImage.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const filename = `${cameraTarget === 'govId' ? 'government_id' : 'business_document'}_${Date.now()}.jpg`;
      const file = new File([u8arr], filename, { type: mime });

      const target = cameraTarget;
      closeCameraModal();
      processSingleFile(file, target);
    } catch (err) {
      console.error('Error accepting captured photo:', err);
      setCameraError('Failed to process captured image. Please try again or upload a file.');
    }
  };

  useEffect(() => {
    if (cameraModalOpen && streamRef.current && videoRef.current && !capturedImage) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraModalOpen, capturedImage, isStartingCamera]);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  useEffect(() => {
    if (!cameraModalOpen && !choiceModalOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (cameraModalOpen) closeCameraModal();
        if (choiceModalOpen) closeChoiceModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cameraModalOpen, choiceModalOpen, closeCameraModal, closeChoiceModal]);

  /* ── Field handlers ── */
  const handleNameChange = (e) => {
    const filtered = e.target.value.replace(/[^a-zA-Z\s\-']/g, '').replace(/\s{2,}/g, ' ');
    setFormData(p => ({ ...p, name: filtered }));
    setErrors(p => ({ ...p, name: validateName(filtered) }));
  };
  const handleNamePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').replace(/[^a-zA-Z\s\-']/g, '').replace(/\s{2,}/g, ' ');
    const el = e.target;
    const next = formData.name.slice(0, el.selectionStart) + pasted + formData.name.slice(el.selectionEnd);
    setFormData(p => ({ ...p, name: next }));
    setErrors(p => ({ ...p, name: validateName(next) }));
  };
  const handleEmailChange = (e) => {
    const v = e.target.value.replace(/\s/g, '');
    setFormData(p => ({ ...p, email: v }));
    setErrors(p => ({ ...p, email: validateEmail(v, touched.email) }));
  };
  const handleOrgChange = (e) => {
    const filtered = e.target.value.replace(/[^a-zA-Z0-9\s&.,'\-]/g, '');
    setFormData(p => ({ ...p, organization: filtered }));
    setErrors(p => ({ ...p, organization: validateOrg(filtered) }));
  };
  const handleOrgPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').replace(/[^a-zA-Z0-9\s&.,'\-]/g, '');
    const el = e.target;
    const next = formData.organization.slice(0, el.selectionStart) + pasted + formData.organization.slice(el.selectionEnd);
    setFormData(p => ({ ...p, organization: next }));
    setErrors(p => ({ ...p, organization: validateOrg(next) }));
  };
  const handlePhoneChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 0 && v[0] !== '9') v = v.slice(1);
    if (v.length > 10) v = v.slice(0, 10);
    setFormData(p => ({ ...p, contactNumber: v }));
    setErrors(p => ({ ...p, contactNumber: validatePhone(v) }));
  };
  const handlePhonePaste = (e) => {
    e.preventDefault();
    let pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '');
    if (pasted.startsWith('63')) pasted = pasted.slice(2);
    if (pasted.startsWith('0')) pasted = pasted.slice(1);
    if (pasted.length > 0 && pasted[0] !== '9') return;
    pasted = pasted.slice(0, 10);
    setFormData(p => ({ ...p, contactNumber: pasted }));
    setErrors(p => ({ ...p, contactNumber: validatePhone(pasted) }));
  };
  const handleMessageChange = (html, text) => {
    setFormData(p => ({ ...p, message: text }));
    setErrors(p => ({ ...p, message: validateMessage(text) }));
    setTouched(p => ({ ...p, message: true }));
  };
  const handleBlur = (field, value) => {
    setTouched(p => ({ ...p, [field]: true }));
    const err = validate(field, value);
    setErrors(p => ({ ...p, [field]: err }));
    if (!err && (field === 'name' || field === 'email' || field === 'organization')) {
      checkAvailability(field, value);
    }
  };

  /* ── Checkbox / Agreement interaction ── */
  const handleToggleTerms = (e) => {
    e?.preventDefault?.();
    if (agreedToTerms) {
      setAgreedToTerms(false);
    } else {
      setIsPolicyModalOpen(true);
    }
  };

  /* ── Submit (Initiates Email Verification) — calls real backend API ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const newErrors = {
      name: validateName(formData.name),
      email: validateEmail(formData.email, true),
      organization: validateOrg(formData.organization),
      partnerRole: validateRole(formData.partnerRole),
      contactNumber: validatePhone(formData.contactNumber),
      message: validateMessage(formData.message),
    };
    if (!govIdFile) {
      setGovIdError('Valid Government-Issued ID is required.');
    }
    if (!bizDocFile) {
      setBizDocError('Valid Business Document is required.');
    }
    setErrors(newErrors);
    setTouched({ name: true, email: true, organization: true, contactNumber: true, message: true });

    if (
      Object.values(newErrors).some(v => v) ||
      !govIdFile || govIdError ||
      !bizDocFile || bizDocError ||
      !agreedToTerms
    ) return;

    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('name', formData.name.trim());
      fd.append('email', formData.email.trim().toLowerCase());
      fd.append('organization_company', formData.organization.trim());
      fd.append('partner_role', formData.partnerRole);
      const phoneToSend = formData.contactNumber.startsWith('0')
        ? formData.contactNumber
        : `+63${formData.contactNumber}`;
      fd.append('contact_number', phoneToSend);
      fd.append('message', formData.message);
      fd.append('government_issued_id', govIdFile.file);
      fd.append('business_verification_document', bizDocFile.file);

      const res = await fetch(`${API_BASE}/partnership-inquiries/`, {
        method: 'POST',
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (data.validation_status === 'MISMATCH' || data.error_code === 'NAME_MISMATCH' || data.code === 'NAME_ID_MISMATCH') {
        setMismatchModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      if (data.validation_status === 'UNCERTAIN' || data.error_code === 'NAME_UNCERTAIN' || data.code === 'NAME_ID_UNCERTAIN') {
        setUncertainModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      if (res.status === 201 && data.success) {
        // Happy path: inquiry saved & verification email sent
        setMismatchModalOpen(false);
        setUncertainModalOpen(false);
        setInquiryId(data.inquiry_id || '');
        setViewState('awaiting_verification');
        setResendCooldown(60);
        setResendMessage('');
      } else if (res.status === 503 && data.inquiry_id) {
        // Inquiry saved but email send failed — still show awaiting screen
        setMismatchModalOpen(false);
        setUncertainModalOpen(false);
        setInquiryId(data.inquiry_id);
        setViewState('awaiting_verification');
        setResendCooldown(0);
        setResendMessage(data.detail || 'Verification email could not be sent. Please use Resend below.');
      } else if (res.status === 400 && typeof data === 'object') {
        // Field validation errors from backend — map to form errors
        const backendErrors = {};
        if (data.name) backendErrors.name = data.name;
        if (data.email) backendErrors.email = data.email;
        if (data.organization) backendErrors.organization = data.organization;
        if (data.organization_company) backendErrors.organization = data.organization_company;
        if (data.partner_role) backendErrors.partnerRole = data.partner_role;
        if (data.contact_number) backendErrors.contactNumber = data.contact_number;
        if (data.message) backendErrors.message = data.message;
        if (data.government_issued_id) setGovIdError(data.government_issued_id);
        if (data.business_verification_document) setBizDocError(data.business_verification_document);
        setErrors(prev => ({ ...prev, ...backendErrors }));
      } else {
        // Generic server error
        setErrors(prev => ({ ...prev, name: data.detail || 'Server error. Please try again.' }));
      }
    } catch {
      setErrors(prev => ({ ...prev, name: 'Network error. Please check your connection.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Resend Verification Email — calls real backend API ── */
  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isResending || !inquiryId) return;
    setIsResending(true);
    setResendMessage('');

    try {
      const res = await fetch(`${API_BASE}/partnership-inquiries/resend-verification/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiry_id: inquiryId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setResendCooldown(60);
        setResendMessage(data.message || `A new verification email has been sent to ${formData.email}.`);
      } else if (res.status === 429) {
        // Rate limit — apply cooldown from server if available
        const retryAfter = data.retry_after || 60;
        setResendCooldown(retryAfter);
        setResendMessage(data.detail || 'Please wait before requesting another email.');
      } else {
        setResendMessage(data.detail || 'Could not send verification email. Please try again.');
      }
    } catch {
      setResendMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsResending(false);
    }
  };

  /* ── Start a completely new inquiry (Reset) ── */
  const handleStartNewInquiry = () => {
    setFormData({ name: '', email: '', organization: '', partnerRole: '', contactNumber: '', message: '' });
    setErrors({ name: '', email: '', organization: '', partnerRole: '', contactNumber: '', message: '' });
    setTouched({ name: false, email: false, organization: false, partnerRole: false, contactNumber: false, message: false });
    setSubmitAttempted(false);
    setAgreedToTerms(false);
    setGovIdFile(null);
    setBizDocFile(null);
    setGovIdError('');
    setBizDocError('');
    if (govIdInputRef.current) govIdInputRef.current.value = '';
    if (bizDocInputRef.current) bizDocInputRef.current.value = '';
    if (govIdCameraRef.current) govIdCameraRef.current.value = '';
    if (bizDocCameraRef.current) bizDocCameraRef.current.value = '';
    setViewState('form');
    navigate('/partner-with-us', { replace: true });
  };

  const phoneError = (touched.contactNumber || submitAttempted) && errors.contactNumber;
  const msgCharCount = formData.message.replace(/\u00A0/g, ' ').trim().length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f2] dark:bg-[#07150d] text-gray-800 dark:text-gray-200 font-sans transition-colors">
      <LandingHeader />

      <main className="flex-1 relative w-full px-4 sm:px-6 py-7 pb-16 support-page-root">
        <div className="relative z-10 max-w-[1200px] mx-auto flex flex-col gap-5">
          {/* Back Button */}
          <AnimatedSection animation="fade-in" delay={40} className="w-fit">
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-transparent text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-medium hover:text-[#00580C] dark:hover:text-emerald-400 px-1 py-1 rounded-md transition-colors cursor-pointer w-fit"
              onClick={() => navigate('/')}
              aria-label="Back to GrainRise Home"
            >
              <ArrowLeft size={16} strokeWidth={2} />
              <span>Back to GrainRise Home</span>
            </button>
          </AnimatedSection>

          {/* ════════ MAIN CONTENT CARD ════════ */}
          <AnimatedSection
            tag="section"
            animation="fade-up"
            delay={80}
            className="bg-white dark:bg-[#0f2417] rounded-xl border border-[#e2ece5] dark:border-white/10 shadow-sm p-6 sm:p-9"
          >

            {/* -- STATE 0: VERIFYING IN PROGRESS -- */}
            {viewState === 'verifying' && (
              <div className="w-full text-center py-14 px-4 sm:px-6 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#00580C] dark:text-emerald-400 flex items-center justify-center mb-4 ring-8 ring-emerald-50/70 dark:ring-emerald-950/30">
                  <Loader2 size={36} className="animate-spin text-[#00580C] dark:text-emerald-400" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#00580C] dark:text-emerald-400 mb-1">
                  Verifying Email
                </span>
                <h2 className="font-['Outfit'] text-2xl sm:text-[26px] font-extrabold text-[#00580C] dark:text-emerald-400 mb-2">
                  Confirming Your Partnership Inquiry...
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-[480px] leading-relaxed">
                  Please wait a moment while we verify your email address.
                </p>
              </div>
            )}

            {/* ────── STATE 1: VERIFIED SUCCESS ────── */}
            {viewState === 'verified_success' && (
              <div className="w-full text-center py-10 px-4 sm:px-6 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#00580C] dark:text-emerald-400 flex items-center justify-center mb-4 ring-8 ring-emerald-50/70 dark:ring-emerald-950/30">
                  <CheckCircle2 size={38} strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#00580C] dark:text-emerald-400 mb-1">
                  Verification Complete
                </span>
                <h2 className="font-['Outfit'] text-2xl sm:text-[26px] font-extrabold text-[#00580C] dark:text-emerald-400 mb-2">
                  Email Verified Successfully!
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-[480px] leading-relaxed mb-6">
                  Your partnership inquiry has been successfully submitted. Thank you for reaching out to us. Our operations team will review your credentials and connect with you shortly.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    className="bg-[#00580C] hover:bg-[#014209] text-white rounded-lg px-5 py-2.5 text-xs sm:text-[12.5px] font-semibold transition-colors cursor-pointer"
                    onClick={handleStartNewInquiry}
                  >
                    Submit Another Inquiry
                  </button>
                  <button
                    type="button"
                    className="border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg px-5 py-2.5 text-xs sm:text-[12.5px] font-semibold transition-colors cursor-pointer"
                    onClick={() => navigate('/')}
                  >
                    Back to GrainRise Home
                  </button>
                </div>
              </div>
            )}

            {/* ────── STATE 2: TOKEN INVALID / EXPIRED ────── */}
            {viewState === 'token_invalid' && (
              <div className="w-full text-center py-10 px-4 sm:px-6 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 ring-8 ring-red-50/70 dark:ring-red-950/30">
                  <AlertTriangle size={36} strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">
                  Verification Failed
                </span>
                <h2 className="font-['Outfit'] text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Verification Link Invalid or Expired
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-[480px] leading-relaxed mb-6">
                  This verification link is no longer valid. It may have already been used, or the 15-minute verification window has expired. Please request a new verification email.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    className="bg-[#00580C] hover:bg-[#014209] text-white rounded-lg px-5 py-2.5 text-xs sm:text-[12.5px] font-semibold transition-colors cursor-pointer"
                    onClick={() => {
                      navigate('/partner-with-us', { replace: true });
                      if (formData.email) {
                        handleResendVerification();
                        setViewState('awaiting_verification');
                      } else {
                        setViewState('form');
                      }
                    }}
                  >
                    Request New Verification Email
                  </button>
                  <button
                    type="button"
                    className="border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg px-5 py-2.5 text-xs sm:text-[12.5px] font-semibold transition-colors cursor-pointer"
                    onClick={() => {
                      navigate('/partner-with-us', { replace: true });
                      setViewState('form');
                    }}
                  >
                    Return to Inquiry Form
                  </button>
                </div>
              </div>
            )}

            {/* ────── STATE 3: AWAITING EMAIL VERIFICATION ────── */}
            {viewState === 'awaiting_verification' && (
              <div className="w-full py-8 px-2 sm:px-6 flex flex-col items-center text-center animate-in fade-in duration-200">
                <div className="relative w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#00580C] dark:text-emerald-400 flex items-center justify-center mb-4">
                  <Mail size={32} strokeWidth={2} />
                  <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-600" />
                </div>

                <h2 className="font-['Outfit'] text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Please Verify Your Email Address
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-[520px] leading-relaxed mb-4">
                  We sent a verification link to <strong className="text-gray-900 dark:text-white font-semibold">{formData.email}</strong>. Please check your inbox and click the link to complete your submission.
                </p>

                <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3.5 py-1.5 rounded-full mb-6">
                  <Clock size={12} className="text-[#00580C] dark:text-emerald-400" />
                  <span>Verification link expires in 15 minutes · One-time use only</span>
                </div>

                {/* ── Verification Email Sent Notice ── */}
                <div className="w-full max-w-[540px] bg-gray-50/70 dark:bg-white/[0.03] border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 shadow-xs mb-6 text-left">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200/80 dark:border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#00580C] text-white flex items-center justify-center font-bold text-xs">
                        GR
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">GrainRise Operations</p>
                        <p className="text-[10.5px] text-gray-400 dark:text-gray-500">noreply@grainrise.ph</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/80 text-[#00580C] dark:text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      Verification Email Sent
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                    Hello <strong>{formData.name || 'Partner'}</strong>,<br />
                    A verification link has been sent to your inbox at <strong>{formData.email}</strong>.
                    Please open the email from GrainRise and click the <em>Verify Email Address</em> button to complete your submission.
                  </p>

                  <div className="text-center my-2">
                    <p className="text-[10.5px] text-gray-400 dark:text-gray-500">
                      Can&apos;t find the email? Check your spam or junk folder, or use the Resend button below.
                    </p>
                  </div>
                </div>

                {/* ── Resend & Edit Actions ── */}
                <div className="flex flex-col items-center gap-3">
                  {resendMessage && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 rounded-lg animate-in fade-in">
                      <CheckCircle2 size={13} />
                      <span>{resendMessage}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendCooldown > 0 || isResending}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isResending ? (
                        <Loader2 size={13} className="animate-spin text-[#00580C]" />
                      ) : (
                        <RefreshCw size={13} />
                      )}
                      <span>
                        {resendCooldown > 0
                          ? `Resend Verification Email (${resendCooldown}s)`
                          : 'Resend Verification Email'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewState('form')}
                      className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Edit Form Details
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ────── STATE 4: THE INQUIRY FORM ────── */}
            {viewState === 'form' && (
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-center gap-8 lg:gap-10">
                <div className="flex flex-col">
                  <div className="mb-6">
                    <div className="inline-flex items-center bg-[#e8f5e9] dark:bg-[#1d3a29] text-[#00580C] dark:text-emerald-300 border border-[#bbf7d0] dark:border-emerald-800 rounded px-2 py-0.5 text-[10.5px] font-bold tracking-wider uppercase mb-2">
                      Partnership
                    </div>
                    <h1 className="font-['Outfit'] text-2xl sm:text-[25px] font-extrabold text-[#00580C] dark:text-emerald-400 tracking-tight mb-1.5 leading-tight">
                      Partner With GrainRise
                    </h1>
                    <p className="text-xs sm:text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed max-w-[620px]">
                      Interested in connecting your organization with the GrainRise supply chain network? Send us your partnership details and our team will review your inquiry.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">

                      {/* Full Legal Name */}
                      <div className="flex flex-col">
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-1 flex items-center gap-0.5" htmlFor="name">
                          FULL LEGAL NAME <span className="text-red-500">*</span>
                        </label>
                        <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mb-1.5 leading-tight">
                          Enter your name exactly as shown on your government-issued ID.
                        </p>
                        <input
                          id="name" name="name" type="text"
                          className={inputCls((touched.name || submitAttempted) && errors.name)}
                          placeholder="Enter your full legal name"
                          value={formData.name}
                          onChange={handleNameChange}
                          onPaste={handleNamePaste}
                          onBlur={() => handleBlur('name', formData.name)}
                        />
                        <FieldError msg={(touched.name || submitAttempted) ? errors.name : ''} />
                      </div>

                      {/* Email */}
<div className="flex flex-col pt-[10px]">
  {/* spacer para kapantay ng FULL LEGAL NAME label */}
  <div className="h-[17px] mb-1" aria-hidden="true" />

  <label
    className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-1.5 flex items-center gap-0.5 leading-tight"
    htmlFor="email"
  >
    EMAIL ADDRESS <span className="text-red-500">*</span>
  </label>

  <input
    id="email"
    name="email"
    type="email"
    className={inputCls(
      (touched.email || submitAttempted) && errors.email
    )}
    placeholder="Enter your email address"
    value={formData.email}
    onChange={handleEmailChange}
    onBlur={() => {
      setTouched(p => ({ ...p, email: true }));

      const err = validateEmail(formData.email, true);

      setErrors(p => ({
        ...p,
        email: err,
      }));

      if (!err) {
        checkAvailability('email', formData.email);
      }
    }}
  />

  <FieldError
    msg={
      (touched.email || submitAttempted)
        ? errors.email
        : ''
    }
  />
</div>


                      {/* Intended Partner Role Dropdown */}
                      <div className="flex flex-col">
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-1.5 flex items-center gap-0.5" htmlFor="partnerRole">
                          INTENDED PARTNER ROLE <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            id="partnerRole"
                            name="partnerRole"
                            value={formData.partnerRole}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormData(p => ({ ...p, partnerRole: v }));
                              setErrors(p => ({ ...p, partnerRole: validateRole(v) }));
                            }}
                            onBlur={() => handleBlur('partnerRole', formData.partnerRole)}
                            className={`${inputCls((touched.partnerRole || submitAttempted) && errors.partnerRole)} cursor-pointer appearance-none pr-9`}
                          >
                            <option value="" disabled>Select your partner role...</option>
                            <option value="miller">Miller</option>
                            <option value="warehouse">Warehouse Owner </option>
                            <option value="retailer">Retailer </option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 dark:text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        <FieldError msg={(touched.partnerRole || submitAttempted) ? errors.partnerRole : ''} />
                      </div>

                      {/* Contact Number */}
                      <div className="flex flex-col">
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-1.5 flex items-center gap-0.5" htmlFor="contactNumber">
                          CONTACT NUMBER <span className="text-red-500">*</span>
                        </label>
                        <div className={`w-full flex items-center bg-white dark:bg-[#163321] border rounded-lg overflow-hidden transition-all
                          ${phoneError
                            ? 'border-red-400 dark:border-red-500 ring-2 ring-red-200/40'
                            : 'border-gray-300 dark:border-[#2d5c3c] focus-within:border-[#00580C] dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-600/15'}`}>
                          <span className="px-3 text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 select-none whitespace-nowrap">+63</span>
                          <span className="w-px self-stretch bg-gray-300 dark:bg-[#2d5c3c]" />
                          <input
                            id="contactNumber" name="contactNumber" type="tel"
                            inputMode="numeric" maxLength={10}
                            className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-gray-800 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            placeholder="9XXXXXXXXX"
                            value={formData.contactNumber}
                            onChange={handlePhoneChange}
                            onPaste={handlePhonePaste}
                            onBlur={() => handleBlur('contactNumber', formData.contactNumber)}
                          />
                        </div>
                        <FieldError msg={phoneError || ''} />
                      </div>
                      {/* Organization */}
                      <div className="flex flex-col sm:col-span-full">
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-1.5 flex items-center gap-0.5" htmlFor="organization">
                          ORGANIZATION / COMPANY <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="organization" name="organization" type="text"
                          className={inputCls((touched.organization || submitAttempted) && errors.organization)}
                          placeholder="Enter your organization or company name"
                          value={formData.organization}
                          onChange={handleOrgChange}
                          onPaste={handleOrgPaste}
                          onBlur={() => handleBlur('organization', formData.organization)}
                        />
                        <FieldError msg={(touched.organization || submitAttempted) ? errors.organization : ''} />
                      </div>
                      {/* Message */}
                      <div className="flex flex-col col-span-full">
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-1.5 flex items-center gap-0.5" htmlFor="message">
                          PARTNERSHIP INQUIRY / MESSAGE <span className="text-red-500">*</span>
                        </label>
                        <div className={`rounded-md border overflow-hidden transition
                          ${(touched.message || submitAttempted) && errors.message
                            ? 'border-red-400 dark:border-red-500 ring-2 ring-red-200/40'
                            : 'border-gray-200'}`}>
                          <RichTextEditor
                            onChange={handleMessageChange}
                            placeholder="Tell us about your organization and how you would like to partner with GrainRise."
                            minHeight={160}
                            maxLength={2000}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <FieldError msg={(touched.message || submitAttempted) ? errors.message : ''} />
                          <span className={`text-[10px] ml-auto select-none ${msgCharCount >= 2000 ? 'text-red-400' : 'text-gray-400'}`}>
                            {msgCharCount} / 2000
                          </span>
                        </div>
                      </div>

                      {/* ── 1. Valid Government-Issued ID (Required single file) ── */}
                      <div className="flex flex-col col-span-full">
                        <div className="flex flex-col mb-1.5">
                          <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase flex items-center gap-0.5">
                            VALID GOVERNMENT-ISSUED ID <span className="text-red-500">*</span>
                          </label>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
                            Upload a clear photo or scanned copy of your government-issued ID (e.g., Driver's License, Passport, UMID, PhilSys National ID, Postal ID, PRC ID).
                          </p>
                        </div>

                        <input
                          ref={govIdInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) processSingleFile(file, 'govId');
                          }}
                        />

                        {govIdFile ? (
                          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative w-11 h-11 rounded-md overflow-hidden border border-emerald-200 dark:border-emerald-800 shrink-0 bg-white dark:bg-emerald-900/40 flex items-center justify-center">
                                {govIdFile.isPdf ? (
                                  <FileCheck size={20} className="text-[#00580C] dark:text-emerald-400" />
                                ) : (
                                  <img src={govIdFile.preview} alt={govIdFile.name} className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate" title={govIdFile.name}>
                                  {govIdFile.name}
                                </p>
                                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                  <CheckCircle2 size={10} />
                                  {formatBytes(govIdFile.size)} • Attached
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => openChoiceModal('govId')}
                                className="px-2.5 py-1 text-xs font-semibold text-[#00580C] dark:text-emerald-400 bg-white dark:bg-[#163321] border border-emerald-200 dark:border-emerald-800 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                Change
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSingleFile('govId')}
                                className="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-[#163321] border border-gray-200 dark:border-[#2d5c3c] text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors cursor-pointer"
                                aria-label="Remove government ID"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => openChoiceModal('govId')}
                            onDragOver={(e) => { e.preventDefault(); setIsGovDragging(true); }}
                            onDragLeave={() => setIsGovDragging(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsGovDragging(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file) processSingleFile(file, 'govId');
                            }}
                            className={`flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-2 border-dashed cursor-pointer transition-all
                              ${(submitAttempted && govIdError)
                                ? 'border-red-400 dark:border-red-500 bg-red-50/40 dark:bg-red-950/20 ring-2 ring-red-200/40'
                                : isGovDragging
                                  ? 'border-[#00580C] dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 scale-[1.01]'
                                  : 'border-gray-300 dark:border-[#2d5c3c] hover:border-[#00580C] dark:hover:border-emerald-600 bg-white dark:bg-[#163321] hover:bg-emerald-50/30'}`}
                          >
                            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-50 dark:bg-[#1e3d2a] text-[#00580C] dark:text-emerald-400">
                              <UploadCloud size={18} />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                {isGovDragging ? 'Drop Government ID here' : 'Click to upload Government-Issued ID or drag & drop'}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                Supported formats: JPG, PNG, WEBP, PDF • Maximum 5 MB
                              </p>
                            </div>
                          </div>
                        )}
                        {(submitAttempted && govIdError) && (
                          <p className="mt-1.5 text-[11px] text-red-500 leading-tight flex items-center gap-1 font-medium">
                            <ImageIcon size={12} className="shrink-0" />
                            {govIdError}
                          </p>
                        )}
                      </div>

                      {/* ── 2. Valid Business Document (Required single file) ── */}
                      <div className="flex flex-col col-span-full">
                        <div className="flex flex-col mb-1.5">
                          <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase flex items-center gap-0.5">
                            VALID BUSINESS DOCUMENT <span className="text-red-500">*</span>
                          </label>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
                            Upload a clear photo or scanned copy of your valid business document
                            {formData.partnerRole === 'miller' && " (e.g., Milling License, BIR Form 2303, Mayor's / Business Permit, or DTI / SEC Registration)."}
                            {formData.partnerRole === 'warehouse' && " (e.g., Warehouse Operating License, Mayor's Permit, DTI / SEC, or Fire Safety Certificate)."}
                            {formData.partnerRole === 'retailer' && " (e.g., Barangay / Mayor's Business Permit, or DTI / SEC Registration)."}
                            {!formData.partnerRole && " (e.g., BIR Form 2303, Mayor's / Business Permit, or DTI / SEC Registration)."}
                          </p>
                        </div>

                        <input
                          ref={bizDocInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) processSingleFile(file, 'bizDoc');
                          }}
                        />

                        {bizDocFile ? (
                          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative w-11 h-11 rounded-md overflow-hidden border border-emerald-200 dark:border-emerald-800 shrink-0 bg-white dark:bg-emerald-900/40 flex items-center justify-center">
                                {bizDocFile.isPdf ? (
                                  <FileCheck size={20} className="text-[#00580C] dark:text-emerald-400" />
                                ) : (
                                  <img src={bizDocFile.preview} alt={bizDocFile.name} className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate" title={bizDocFile.name}>
                                  {bizDocFile.name}
                                </p>
                                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                  <CheckCircle2 size={10} />
                                  {formatBytes(bizDocFile.size)} • Attached
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => openChoiceModal('bizDoc')}
                                className="px-2.5 py-1 text-xs font-semibold text-[#00580C] dark:text-emerald-400 bg-white dark:bg-[#163321] border border-emerald-200 dark:border-emerald-800 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                Change
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSingleFile('bizDoc')}
                                className="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-[#163321] border border-gray-200 dark:border-[#2d5c3c] text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors cursor-pointer"
                                aria-label="Remove business document"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => openChoiceModal('bizDoc')}
                            onDragOver={(e) => { e.preventDefault(); setIsBizDragging(true); }}
                            onDragLeave={() => setIsBizDragging(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsBizDragging(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file) processSingleFile(file, 'bizDoc');
                            }}
                            className={`flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-2 border-dashed cursor-pointer transition-all
                              ${(submitAttempted && bizDocError)
                                ? 'border-red-400 dark:border-red-500 bg-red-50/40 dark:bg-red-950/20 ring-2 ring-red-200/40'
                                : isBizDragging
                                  ? 'border-[#00580C] dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 scale-[1.01]'
                                  : 'border-gray-300 dark:border-[#2d5c3c] hover:border-[#00580C] dark:hover:border-emerald-600 bg-white dark:bg-[#163321] hover:bg-emerald-50/30'}`}
                          >
                            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-50 dark:bg-[#1e3d2a] text-[#00580C] dark:text-emerald-400">
                              <UploadCloud size={18} />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                {isBizDragging ? 'Drop Business Document here' : 'Click to upload Business Document or drag & drop'}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                Supported formats: JPG, PNG, WEBP, PDF • Maximum 5 MB
                              </p>
                            </div>
                          </div>
                        )}
                        {(submitAttempted && bizDocError) && (
                          <p className="mt-1.5 text-[11px] text-red-500 leading-tight flex items-center gap-1 font-medium">
                            <ImageIcon size={12} className="shrink-0" />
                            {bizDocError}
                          </p>
                        )}
                      </div>

                    </div>

                    {/* ── Terms & Privacy Policy Agreement ── */}
                    <div className="flex flex-col gap-1 pt-1 border-t border-gray-100 dark:border-white/10 mt-1">
                      <div
                        onClick={handleToggleTerms}
                        className="flex items-start gap-2.5 select-none cursor-pointer group py-1 px-1 rounded-md transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                      >
                        <input
                          id="termsCheckbox"
                          type="checkbox"
                          checked={agreedToTerms}
                          readOnly
                          className="mt-0.5 w-3.5 h-3.5 shrink-0 rounded border-gray-300 dark:border-[#2d5c3c] accent-[#00580C] cursor-pointer pointer-events-none"
                        />
                        <span className="text-[11.5px] text-gray-600 dark:text-gray-400 leading-relaxed cursor-pointer">
                          I have read and agree to the{' '}
                          <span className="text-[#00580C] dark:text-emerald-400 font-semibold group-hover:underline">
                            Terms and Conditions and Privacy Policy
                          </span>
                          .
                        </span>
                      </div>
                      {submitAttempted && !agreedToTerms && (
                        <p className="text-[11px] text-red-500 leading-tight ml-6">
                          Please agree to the Terms and Conditions and Privacy Policy before submitting.
                        </p>
                      )}
                    </div>

                    {/* Submit */}
                    <div className="mt-1 flex flex-col items-start gap-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || (!isFormValid && submitAttempted)}
                        className="inline-flex items-center justify-center gap-2 bg-[#00580C] hover:bg-[#014209] text-white font-semibold text-xs sm:text-[12.5px] rounded-md px-5 py-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                        <span>{isSubmitting ? 'Sending Verification Email...' : 'Submit Partnership Inquiry'}</span>
                      </button>
                      {submitAttempted && !isFormValid && (
                        <p className="text-[11px] text-red-500">Please fix the highlighted fields before submitting.</p>
                      )}
                    </div>
                  </form>
                </div>

                {/* Right Illustration */}
                <AnimatedSection
                  animation="zoom"
                  delay={160}
                  className="flex items-center justify-center p-2 order-first lg:order-last"
                >
                  <img
                    src={shakehandsImg}
                    alt="Partner With GrainRise"
                    className="w-full max-w-[320px] lg:max-w-[420px] h-auto object-contain block"
                  />
                </AnimatedSection>
              </div>
            )}

          </AnimatedSection>
        </div>
      </main>

      <LandingFooter />

      {/* ── Policy Modal ── */}
      <PolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        onAgree={() => setAgreedToTerms(true)}
      />

      {/* ── Name Does Not Match ID Modal ── */}
      {mismatchModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white dark:bg-[#0e2417] border border-gray-200 dark:border-[#204830] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Name Does Not Match ID
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
              The full legal name you entered does not match the name detected on your uploaded government-issued ID. Please enter your name exactly as shown on your ID or upload the correct document.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                onClick={() => {
                  setMismatchModalOpen(false);
                  setTimeout(() => document.getElementById('name')?.focus(), 100);
                }}
              >
                Review Name
              </button>
              <button
                type="button"
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-[#00580C] hover:bg-[#014209] rounded-lg transition-colors cursor-pointer"
                onClick={() => {
                  setMismatchModalOpen(false);
                  handleRemoveSingleFile('govId');
                  setTimeout(() => govIdInputRef.current?.click(), 100);
                }}
              >
                Upload Different ID
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── We Could Not Verify the Name Modal ── */}
      {uncertainModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white dark:bg-[#0e2417] border border-gray-200 dark:border-[#204830] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                We Could Not Verify the Name
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
              We could not confidently verify that the name you entered matches the name on your uploaded ID. Please review your legal name or upload a clearer ID image.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                onClick={() => {
                  setUncertainModalOpen(false);
                  setTimeout(() => document.getElementById('name')?.focus(), 100);
                }}
              >
                Review Name
              </button>
              <button
                type="button"
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-[#00580C] hover:bg-[#014209] rounded-lg transition-colors cursor-pointer"
                onClick={() => {
                  setUncertainModalOpen(false);
                  handleRemoveSingleFile('govId');
                  setTimeout(() => govIdInputRef.current?.click(), 100);
                }}
              >
                Upload Different ID
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Choice Modal: Upload File vs Take Photo ── */}
      {choiceModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeChoiceModal();
          }}
        >
          <div
            className="bg-white dark:bg-[#0e2417] border border-gray-200 dark:border-[#204830] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-5 sm:p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-white/10">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {choiceTarget === 'govId' ? 'Government-Issued ID' : 'Valid Business Document'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Select how you want to add this document
                </p>
              </div>
              <button
                type="button"
                onClick={closeChoiceModal}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                aria-label="Close selection modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* 2 Large Options */}
            <div className="flex flex-col gap-3 my-2">
              <button
                type="button"
                onClick={handleSelectUpload}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-[#204830] hover:border-[#00580C] dark:hover:border-emerald-500 bg-gray-50/50 dark:bg-white/[0.03] hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition-all text-left group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-[#163321] text-[#00580C] dark:text-emerald-400 border border-gray-200 dark:border-[#2d5c3c] shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <UploadCloud size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white group-hover:text-[#00580C] dark:group-hover:text-emerald-400 transition-colors">
                    Upload / Attach File
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                    Select a JPG, PNG, WEBP, or PDF file from your device
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleSelectCamera}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-[#204830] hover:border-[#00580C] dark:hover:border-emerald-500 bg-gray-50/50 dark:bg-white/[0.03] hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition-all text-left group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-[#163321] text-[#00580C] dark:text-emerald-400 border border-gray-200 dark:border-[#2d5c3c] shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <Camera size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white group-hover:text-[#00580C] dark:group-hover:text-emerald-400 transition-colors">
                    Open Camera
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                    Take a live photo directly using your camera
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={closeChoiceModal}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Live Camera Modal ── */}
      {cameraModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCameraModal();
          }}
        >
          <div
            className="bg-white dark:bg-[#0e2417] border border-gray-200 dark:border-[#204830] rounded-2xl sm:rounded-3xl shadow-2xl max-w-3xl lg:max-w-4xl w-full overflow-hidden p-4 sm:p-6 md:p-7 flex flex-col animate-in zoom-in-95 duration-200 max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-gray-100 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#00580C] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
                  <Camera size={22} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">
                    {cameraTarget === 'govId' ? 'Capture Government-Issued ID' : 'Capture Business Document'}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Position your document clearly within the frame under good lighting
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCameraModal}
                className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-600 dark:text-gray-200 transition-colors cursor-pointer shrink-0"
                aria-label="Close camera modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            {cameraError ? (
              <div className="flex flex-col items-center text-center py-8 sm:py-12 px-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mb-4 border border-amber-200 dark:border-amber-800/50">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Camera Access Unavailable
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-md mb-6 leading-relaxed">
                  {cameraError}
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-center">
                  <button
                    type="button"
                    className="w-full sm:w-auto px-6 py-3 text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
                    onClick={closeCameraModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="w-full sm:w-auto px-7 py-3 text-sm sm:text-base font-bold text-white bg-[#00580C] hover:bg-[#014209] rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                    onClick={() => {
                      const target = cameraTarget;
                      closeCameraModal();
                      setTimeout(() => {
                        if (target === 'govId') govIdInputRef.current?.click();
                        else if (target === 'bizDoc') bizDocInputRef.current?.click();
                      }, 100);
                    }}
                  >
                    <UploadCloud size={18} />
                    <span>Upload File Instead</span>
                  </button>
                </div>
              </div>
            ) : isStartingCamera ? (
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[55vh] sm:max-h-[60vh] bg-black rounded-xl sm:rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-3 text-white">
                <Loader2 className="animate-spin text-emerald-400" size={40} />
                <p className="text-sm sm:text-base text-gray-200 font-medium">Starting camera preview...</p>
                <p className="text-xs text-gray-400">Please grant camera permission if prompted</p>
              </div>
            ) : capturedImage ? (
              <div className="flex flex-col min-h-0 flex-1">
                <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[55vh] sm:max-h-[60vh] bg-black rounded-xl sm:rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200 dark:border-white/10 shadow-inner">
                  <img
                    src={capturedImage}
                    alt="Captured document"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 sm:pt-5 mt-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRetakePhoto}
                    className="w-full sm:w-auto px-6 py-3 sm:px-7 sm:py-3.5 text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={18} />
                    <span>Retake Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptPhoto}
                    className="w-full sm:w-auto px-7 py-3 sm:px-9 sm:py-3.5 text-sm sm:text-base font-bold text-white bg-[#00580C] hover:bg-[#014209] rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-98"
                  >
                    <CheckCircle2 size={20} />
                    <span>Use Photo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-0 flex-1">
                <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[55vh] sm:max-h-[60vh] bg-black rounded-xl sm:rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200 dark:border-white/10 shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain bg-black"
                  />
                  {/* Framing guideline overlay */}
                  <div className="pointer-events-none absolute inset-4 sm:inset-8 border-2 border-dashed border-white/80 rounded-xl flex items-end justify-center pb-3">
                    <span className="text-xs sm:text-sm text-white font-medium bg-black/65 px-4 py-1.5 rounded-full backdrop-blur-md shadow-md">
                      Center document within frame
                    </span>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 sm:pt-5 mt-2 shrink-0">
                  <button
                    type="button"
                    onClick={closeCameraModal}
                    className="w-full sm:w-auto px-6 py-3 sm:px-7 sm:py-3.5 text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="w-full sm:w-auto px-7 py-3 sm:px-9 sm:py-3.5 text-sm sm:text-base font-bold text-white bg-[#00580C] hover:bg-[#014209] rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-98"
                  >
                    <Camera size={20} />
                    <span>Capture Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
