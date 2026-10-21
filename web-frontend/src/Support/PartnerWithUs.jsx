import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft, Users, CheckCircle2, Loader2, UploadCloud, X,
  ImageIcon, FileCheck, Mail, Clock, RefreshCw, AlertTriangle, ExternalLink,
  Camera, Plus, ChevronLeft, ChevronRight, Pencil
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
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const POLICY_VERSION = '1.0';
const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api`;

/**
 * Browser-side image compression to prevent Render OOM.
 * Scales large phone photos (e.g. 12MP/48MP) to max dimension 1024px
 * and compresses JPEG to 0.85 quality.
 */
async function compressImageForUpload(file, maxDimension = 1024, quality = 0.85) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension && file.size < 600 * 1024) {
        return resolve(file);
      }
      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressed);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

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
  if (!v.trim()) return 'Organization or company name is required.';
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
  if (!ALLOWED_MIME.includes(file.type) && !ALLOWED_EXT.includes(ext))
    return 'Only JPG, PNG, WEBP, and PDF files are allowed.';
  if (file.size > MAX_FILE_BYTES)
    return 'Document size must not exceed 5 MB.';
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
  const [currentStep, setCurrentStep] = useState(1);

  /* ── Verification state ── */
  const [inquiryId, setInquiryId] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  /* ── Policy Modal state ── */
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const verifyingRef = useRef(false);

  /* ── Image / Document state ── */
  const [imageFiles, setImageFiles] = useState([]);
  const [availabilityChecking, setAvailabilityChecking] = useState({ name: false, email: false, organization: false });
  const [imageError, setImageError] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const cameraInputRef = useRef(null);

  /* ── Gov ID state ── */
  const [govIdFile, setGovIdFile] = useState(null);
  const [govIdPreview, setGovIdPreview] = useState('');
  const [govIdError, setGovIdError] = useState('');
  const [govIdVerified, setGovIdVerified] = useState(false);
  const [govIdVerifying, setGovIdVerifying] = useState(false);
  const [govIdVerificationError, setGovIdVerificationError] = useState('');
  const govIdInputRef = useRef(null);
  const govIdCameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const [sourceModalTarget, setSourceModalTarget] = useState('business'); // 'business' | 'govId'
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  /* ── Toast notification state ── */
  const [toast, setToast] = useState(null); // { message: string, type: 'success' | 'error' | 'info' }
  const toastTimerRef = useRef(null);
  const showToast = useCallback((message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  const replaceDocIndexRef = useRef(null);

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
    imageFiles.length > 0 && !imageError &&
    govIdFile && govIdVerified && !govIdError &&
    agreedToTerms;

  /* ── Multi-image Document processing (with browser-side compression) ── */
  const processImageFiles = async (files) => {
    if (!files || files.length === 0) return;
    setImageLoading(true);
    setImageError('');

    const fileList = Array.from(files);
    for (const f of fileList) {
      const err = validateImageFile(f);
      if (err) {
        setImageError(err);
        setImageLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        return;
      }
    }

    try {
      const compressedFiles = await Promise.all(
        fileList.map((f) => compressImageForUpload(f))
      );

      let loaded = 0;
      const newDocs = [];
      compressedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          newDocs.push({
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            file,
            preview: e.target.result,
            name: file.name,
            size: file.size,
          });
          loaded++;
          if (loaded === compressedFiles.length) {
            setImageFiles(prev => [...prev, ...newDocs]);
            setImageLoading(false);
            setImageError('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (cameraInputRef.current) cameraInputRef.current.value = '';
          }
        };
        reader.onerror = () => {
          loaded++;
          if (loaded === compressedFiles.length) {
            setImageLoading(false);
            setImageError('Failed to read some document images.');
          }
        };
        reader.readAsDataURL(file);
      });
    } catch (err) {
      console.warn('Document processing error:', err);
      setImageLoading(false);
    }
  };

  const processReplacementFile = async (rawFile, idx) => {
    if (!rawFile) return;
    const err = validateImageFile(rawFile);
    if (err) {
      setImageError(err);
      showToast(err, 'error');
      return;
    }
    setImageError('');
    const file = await compressImageForUpload(rawFile);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageFiles(prev => {
          const copy = [...prev];
          if (copy[idx]) {
            copy[idx] = {
              ...copy[idx],
              name: file.name,
              size: file.size,
              preview: e.target.result,
              file: file,
            };
          }
          return copy;
        });
        showToast('Business document replaced successfully.', 'info');
      };
      reader.readAsDataURL(file);
    } else {
      setImageFiles(prev => {
        const copy = [...prev];
        if (copy[idx]) {
          copy[idx] = {
            ...copy[idx],
            name: file.name,
            size: file.size,
            preview: '',
            file: file,
          };
        }
        return copy;
      });
      showToast('Business document replaced successfully.', 'info');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (replaceDocIndexRef.current !== null && replaceDocIndexRef.current >= 0) {
      const targetIdx = replaceDocIndexRef.current;
      replaceDocIndexRef.current = null;
      processReplacementFile(files[0], targetIdx);
    } else {
      processImageFiles(files);
    }
  };

  const handleRemoveImage = (idToRemove) => {
    setImageFiles(prev => {
      const next = prev.filter(item => item.id !== idToRemove);
      if (submitAttempted && next.length === 0) {
        setImageError('Please upload at least one business verification document.');
      } else {
        setImageError('');
      }
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  /* ── Open Document Source Modal (Supports 'business' or 'govId') ── */
  const handleOpenSourceModal = (target = 'business') => {
    setSourceModalTarget(target);
    setIsSourceModalOpen(true);
  };

  /* ── Choose Upload File from Device ── */
  const handleChooseUpload = () => {
    setIsSourceModalOpen(false);
    if (sourceModalTarget === 'govId') {
      govIdInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  /* ── Choose Take a Photo (Camera) with mobile WebView support ── */
  const handleChooseCamera = (target) => {
    const activeTarget = target || sourceModalTarget;
    if (target) setSourceModalTarget(target);
    setIsSourceModalOpen(false);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    if (isMobile || !navigator.mediaDevices?.getUserMedia) {
      if (activeTarget === 'govId') {
        govIdCameraInputRef.current?.click();
      } else {
        cameraInputRef.current?.click();
      }
    } else {
      setIsCameraModalOpen(true);
      setCameraError('');
      setCameraActive(false);
    }
  };

  /* ── Stop Webcam Stream Helper ── */
  const stopWebcamStream = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  /* ── Start Webcam when Camera Modal Opens ── */
  useEffect(() => {
    if (!isCameraModalOpen) {
      stopWebcamStream();
      return;
    }

    let isMounted = true;
    navigator.mediaDevices?.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
      .then((stream) => {
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { });
        }
        setCameraActive(true);
        setCameraError('');
      })
      .catch((err) => {
        console.warn('Webcam stream error:', err);
        setCameraError('Unable to access webcam. Switching to camera upload...');
        setTimeout(() => {
          setIsCameraModalOpen(false);
          if (sourceModalTarget === 'govId') {
            govIdCameraInputRef.current?.click();
          } else {
            cameraInputRef.current?.click();
          }
        }, 1200);
      });

    return () => {
      isMounted = false;
      stopWebcamStream();
    };
  }, [isCameraModalOpen, sourceModalTarget]);

  /* ── Capture Frame from Live Webcam ── */
  const handleCaptureWebcam = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const fileName = `${sourceModalTarget === 'govId' ? 'gov_id' : 'document'}_capture_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        if (sourceModalTarget === 'govId') {
          processGovIdFile(file);
        } else {
          processImageFiles([file]);
        }
      }
      setIsCameraModalOpen(false);
      stopWebcamStream();
    }, 'image/jpeg', 0.92);
  };

  const handleCloseCameraModal = () => {
    setIsCameraModalOpen(false);
    stopWebcamStream();
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFiles([file]);
  };

  /* ── Legal Name vs Government ID OCR Verification ── */
  const verifyGovId = async (fileToVerify, nameToVerify) => {
    if (!fileToVerify) {
      setGovIdError('Please provide a government ID file.');
      return false;
    }
    const targetName = (nameToVerify || formData.name || '').trim();
    if (!targetName) {
      setGovIdError('Please enter your full legal name first in Step 1.');
      return false;
    }

    setGovIdVerifying(true);
    setGovIdVerificationError('');

    try {
      const fd = new FormData();
      fd.append('name', targetName);
      fd.append('government_issued_id', fileToVerify);

      const res = await fetch(`${API_BASE}/partnership-inquiries/verify-id/`, {
        method: 'POST',
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.status === 'MATCH') {
        setGovIdVerified(true);
        setGovIdVerificationError('');
        setGovIdError('');
        showToast('Government ID verified successfully! Name matches.', 'success');
        return true;
      } else if (res.status === 422) {
        setGovIdVerified(false);
        const errMsg = data.detail || 'The full legal name does not match the name detected on your government-issued ID.';
        setGovIdVerificationError(errMsg);
        setGovIdError(errMsg);
        showToast(errMsg, 'error');
        return false;
      } else {
        setGovIdVerified(false);
        const errMsg = data.detail || 'Unable to verify government ID. Please ensure the image is clear.';
        setGovIdVerificationError(errMsg);
        setGovIdError(errMsg);
        showToast(errMsg, 'error');
        return false;
      }
    } catch (err) {
      console.warn('ID verification error:', err);
      setGovIdVerified(false);
      setGovIdVerificationError('Network error during ID verification. Please check your connection.');
      showToast('Network error during ID verification.', 'error');
      return false;
    } finally {
      setGovIdVerifying(false);
    }
  };

  /* ── Gov ID Upload Handlers (with browser compression & auto-verify) ── */
  const processGovIdFile = async (rawFile) => {
    if (!rawFile) return;
    const ext = '.' + rawFile.name.split('.').pop().toLowerCase();
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const allowedExt  = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (!allowedMime.includes(rawFile.type) && !allowedExt.includes(ext)) {
      setGovIdError(`File '${rawFile.name}' is not supported. Allowed formats: JPG, PNG, WEBP, PDF.`);
      return;
    }
    if (rawFile.size > MAX_FILE_BYTES) {
      setGovIdError(`File '${rawFile.name}' exceeds the 5 MB size limit.`);
      return;
    }
    setGovIdError('');
    setGovIdVerificationError('');
    setGovIdVerified(false);

    // Browser-side image compression to prevent Render OOM
    const file = await compressImageForUpload(rawFile);
    setGovIdFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setGovIdPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setGovIdPreview('');
    }

    if (formData.name && formData.name.trim()) {
      verifyGovId(file, formData.name.trim());
    }
  };

  const handleGovIdChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processGovIdFile(file);
  };

  /* ── Field handlers ── */
  const handleNameChange = (e) => {
    const filtered = e.target.value.replace(/[^a-zA-Z\s\-']/g, '').replace(/\s{2,}/g, ' ');
    setFormData(p => ({ ...p, name: filtered }));
    setErrors(p => ({ ...p, name: validateName(filtered) }));
    if (govIdVerified) {
      setGovIdVerified(false);
      setGovIdVerificationError('Legal name was changed. Please re-verify with your government ID in Step 3.');
    }
  };
  const handleNamePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').replace(/[^a-zA-Z\s\-']/g, '').replace(/\s{2,}/g, ' ');
    const el = e.target;
    const next = formData.name.slice(0, el.selectionStart) + pasted + formData.name.slice(el.selectionEnd);
    setFormData(p => ({ ...p, name: next }));
    setErrors(p => ({ ...p, name: validateName(next) }));
    if (govIdVerified) {
      setGovIdVerified(false);
      setGovIdVerificationError('Legal name was changed. Please re-verify with your government ID in Step 3.');
    }
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

  /* ── Step Validation & Navigation ── */
  const validateStep1 = () => {
    const errName = validateName(formData.name);
    const errEmail = validateEmail(formData.email, true);
    const errPhone = validatePhone(formData.contactNumber);

    setErrors(prev => ({
      ...prev,
      name: errName,
      email: errEmail,
      contactNumber: errPhone,
    }));
    setTouched(prev => ({
      ...prev,
      name: true,
      email: true,
      contactNumber: true,
    }));

    if (errName || errEmail || errPhone || errors.name || errors.email) {
      showToast('Please fill in all required fields in Step 1 correctly.', 'error');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const errRole = validateRole(formData.partnerRole);
    const errOrg = validateOrg(formData.organization);
    const errMessage = validateMessage(formData.message);

    setErrors(prev => ({
      ...prev,
      partnerRole: errRole,
      organization: errOrg,
      message: errMessage,
    }));
    setTouched(prev => ({
      ...prev,
      partnerRole: true,
      organization: true,
      message: true,
    }));

    if (errRole || errOrg || errMessage || errors.organization) {
      showToast('Please complete all partnership details in Step 2.', 'error');
      return false;
    }
    return true;
  };

  const validateStep3 = async () => {
    let hasErr = false;
    if (!govIdFile) {
      setGovIdError('Please upload a valid government-issued ID.');
      hasErr = true;
    } else if (govIdError && !govIdVerified) {
      hasErr = true;
    }

    if (imageFiles.length === 0) {
      setImageError('Please upload at least one valid business verification document.');
      hasErr = true;
    } else if (imageError) {
      hasErr = true;
    }

    if (hasErr) {
      showToast('Please attach both required verification documents.', 'error');
      return false;
    }

    if (govIdVerifying) {
      showToast('Government ID verification is in progress. Please wait...', 'info');
      return false;
    }

    if (!govIdVerified) {
      if (govIdFile && formData.name.trim()) {
        const ok = await verifyGovId(govIdFile, formData.name.trim());
        if (!ok) {
          showToast(govIdVerificationError || 'Government ID verification failed. Legal name must match ID.', 'error');
          return false;
        }
      } else {
        showToast(govIdVerificationError || 'Government ID verification required before proceeding.', 'error');
        return false;
      }
    }

    return true;
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    } else if (currentStep === 3) {
      const ok = await validateStep3();
      if (ok) setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  /* ── Submit (Initiates Email Verification) — calls real backend API ── */
  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setSubmitAttempted(true);

    // Validate Step 1
    const errName = validateName(formData.name);
    const errEmail = validateEmail(formData.email, true);
    const errPhone = validatePhone(formData.contactNumber);
    if (errName || errEmail || errPhone || errors.name || errors.email) {
      setErrors(prev => ({ ...prev, name: errName, email: errEmail, contactNumber: errPhone }));
      setTouched(prev => ({ ...prev, name: true, email: true, contactNumber: true }));
      setCurrentStep(1);
      showToast('Please resolve the errors in Step 1 (Your Details).', 'error');
      return;
    }

    // Validate Step 2
    const errRole = validateRole(formData.partnerRole);
    const errOrg = validateOrg(formData.organization);
    const errMessage = validateMessage(formData.message);
    if (errRole || errOrg || errMessage || errors.organization) {
      setErrors(prev => ({ ...prev, partnerRole: errRole, organization: errOrg, message: errMessage }));
      setTouched(prev => ({ ...prev, partnerRole: true, organization: true, message: true }));
      setCurrentStep(2);
      showToast('Please resolve the errors in Step 2 (Partnership Details).', 'error');
      return;
    }

    // Validate Step 3
    if (!govIdFile) {
      setGovIdError('Please upload a valid government-issued ID.');
      setCurrentStep(3);
      showToast('Please upload your valid government-issued ID.', 'error');
      return;
    }
    if (!govIdVerified) {
      setCurrentStep(3);
      showToast(govIdVerificationError || 'Please verify that your legal name matches your government ID before submitting.', 'error');
      return;
    }
    if (imageFiles.length === 0 || imageError) {
      if (imageFiles.length === 0) setImageError('Please upload at least one valid business verification document.');
      setCurrentStep(3);
      showToast('Please upload your valid business verification document.', 'error');
      return;
    }

    // Validate Step 4: Terms agreement
    if (!agreedToTerms) {
      showToast('Please read and agree to the Terms and Conditions to proceed.', 'error');
      return;
    }

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
      if (govIdFile) {
        fd.append('government_issued_id', govIdFile);
      }
      imageFiles.forEach((docItem) => {
        fd.append('business_verification_documents', docItem.file);
        fd.append('business_verification_document', docItem.file);
      });

      const res = await fetch(`${API_BASE}/partnership-inquiries/`, {
        method: 'POST',
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 201 && data.success) {
        // Happy path: inquiry saved & verification email sent
        showToast('Partnership inquiry submitted! Please verify your email.', 'success');
        setInquiryId(data.inquiry_id || '');
        setViewState('awaiting_verification');
        setResendCooldown(60);
        setResendMessage('');
      } else if (res.status === 503 && data.inquiry_id) {
        // Inquiry saved but email send failed — still show awaiting screen
        showToast('Inquiry recorded, but email delivery is delayed.', 'info');
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
        if (data.business_verification_document) setImageError(data.business_verification_document);
        setErrors(prev => ({ ...prev, ...backendErrors }));
        showToast(data.detail || 'Please correct the highlighted fields.', 'error');
        if (data.name || data.email || data.contact_number) setCurrentStep(1);
        else if (data.organization || data.organization_company || data.partner_role || data.message) setCurrentStep(2);
        else if (data.government_issued_id || data.business_verification_document) setCurrentStep(3);
      } else if (res.status === 422 && typeof data === 'object') {
        const errMsg = data.detail || 'The full legal name does not match the name detected on your government-issued ID.';
        setGovIdError(errMsg);
        setGovIdVerified(false);
        setGovIdVerificationError(errMsg);
        setCurrentStep(3);
        showToast(errMsg, 'error');
      } else {
        // Generic server error
        const errMsg = data.detail || 'Server error. Please try again.';
        showToast(errMsg, 'error');
        setErrors(prev => ({ ...prev, name: errMsg }));
      }
    } catch {
      showToast('Network error. Please check your connection.', 'error');
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
    setImageFiles([]);
    setImageError('');
    setGovIdFile(null);
    setGovIdPreview('');
    setGovIdError('');
    setGovIdVerified(false);
    setGovIdVerifying(false);
    setGovIdVerificationError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (govIdInputRef.current) govIdInputRef.current.value = '';
    if (govIdCameraInputRef.current) govIdCameraInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    setCurrentStep(1);
    setViewState('form');
    navigate('/partner-with-us', { replace: true });
  };

  const phoneError = (touched.contactNumber || submitAttempted) && errors.contactNumber;
  const msgCharCount = formData.message.replace(/\u00A0/g, ' ').trim().length;
  const documentHasError = (submitAttempted && imageFiles.length === 0) || Boolean(imageError);

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
                    <div className="flex items-center justify-between mb-2">
                      <div className="inline-flex items-center bg-[#e8f5e9] dark:bg-[#1d3a29] text-[#00580C] dark:text-emerald-300 border border-[#bbf7d0] dark:border-emerald-800 rounded px-2 py-0.5 text-[10.5px] font-bold tracking-wider uppercase">
                        PARTNERSHIP
                      </div>
                      <span className="text-xs font-semibold text-[#00580C] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-0.5 rounded-full">
                        Step {currentStep} of 4 — {
                          currentStep === 1 ? 'Your Details' :
                          currentStep === 2 ? 'Partnership Details' :
                          currentStep === 3 ? 'Verification' :
                          'Review & Submit'
                        }
                      </span>
                    </div>
                    <h1 className="font-['Outfit'] text-2xl sm:text-[25px] font-extrabold text-[#00580C] dark:text-emerald-400 tracking-tight mb-1.5 leading-tight">
                      Partner With GrainRise
                    </h1>
                    <p className="text-xs sm:text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed max-w-[620px]">
                      Interested in connecting your organization with the GrainRise supply chain network? Send us your partnership details and our team will review your inquiry.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                    {/* ──── STEP 1: Your Details ──── */}
                    {currentStep === 1 && (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                          {/* Full Legal Name */}
                          <div className="flex flex-col sm:col-span-2">
                            <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-0.5 flex items-center gap-0.5" htmlFor="name">
                              FULL LEGAL NAME <span className="text-red-500">*</span>
                            </label>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5 leading-relaxed">
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

                          {/* Email Address */}
                          <div className="flex flex-col">
                            <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-1.5 flex items-center gap-0.5" htmlFor="email">
                              EMAIL ADDRESS <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="email" name="email" type="email"
                              className={inputCls((touched.email || submitAttempted) && errors.email)}
                              placeholder="Enter your email address"
                              value={formData.email}
                              onChange={handleEmailChange}
                              onBlur={() => {
                                setTouched(p => ({ ...p, email: true }));
                                const err = validateEmail(formData.email, true);
                                setErrors(p => ({ ...p, email: err }));
                                if (!err) checkAvailability('email', formData.email);
                              }}
                            />
                            <FieldError msg={(touched.email || submitAttempted) ? errors.email : ''} />
                          </div>

                          {/* Contact Number with +63 country code */}
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
                        </div>

                        {/* Step 1 Actions */}
                        <div className="flex items-center justify-end pt-3 border-t border-gray-100 dark:border-white/10 mt-1">
                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="inline-flex items-center justify-center gap-1.5 bg-[#00580C] hover:bg-[#014209] text-white font-semibold text-xs sm:text-[12.5px] rounded-md px-5 py-2.5 shadow-sm transition-all cursor-pointer"
                          >
                            <span>Continue</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ──── STEP 2: Partnership Details ──── */}
                    {currentStep === 2 && (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
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
                                <option value="warehouse">Warehouse Owner</option>
                                <option value="retailer">Retailer</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 dark:text-gray-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                            <FieldError msg={(touched.partnerRole || submitAttempted) ? errors.partnerRole : ''} />
                          </div>

                          {/* Organization / Company Name */}
                          <div className="flex flex-col">
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

                          {/* Partnership Inquiry / Message */}
                          <div className="flex flex-col sm:col-span-2">
                            <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-1.5 flex items-center gap-0.5" htmlFor="message">
                              PARTNERSHIP INQUIRY / MESSAGE <span className="text-red-500">*</span>
                            </label>
                            <div className={`rounded-md border overflow-hidden transition
                              ${(touched.message || submitAttempted) && errors.message
                                ? 'border-red-400 dark:border-red-500 ring-2 ring-red-200/40'
                                : 'border-gray-200 dark:border-[#2d5c3c]'}`}>
                              <RichTextEditor
                                onChange={handleMessageChange}
                                placeholder="Tell us about your organization and how you would like to partner with GrainRise."
                                minHeight={130}
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
                        </div>

                        {/* Step 2 Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10 mt-1">
                          <button
                            type="button"
                            onClick={handlePrevStep}
                            className="inline-flex items-center justify-center gap-1 px-4 py-2.5 text-xs sm:text-[12.5px] font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-md transition-colors cursor-pointer"
                          >
                            <ChevronLeft size={14} />
                            <span>Back</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="inline-flex items-center justify-center gap-1.5 bg-[#00580C] hover:bg-[#014209] text-white font-semibold text-xs sm:text-[12.5px] rounded-md px-5 py-2.5 shadow-sm transition-all cursor-pointer"
                          >
                            <span>Continue</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ──── STEP 3: Verification ──── */}
                    {currentStep === 3 && (
                      <div className="flex flex-col gap-4">
                        {/* Hidden inputs */}
                        <input
                          ref={govIdInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,.pdf"
                          className="hidden"
                          onChange={handleGovIdChange}
                        />
                        <input
                          ref={govIdCameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleGovIdChange}
                        />
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,.pdf"
                          className="hidden"
                          onChange={handleFileInputChange}
                        />
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleFileInputChange}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                          {/* 1. Government-Issued ID */}
                          <div className="flex flex-col">
                            <div className="mb-1.5">
                              <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase flex items-center gap-0.5">
                                VALID GOVERNMENT-ISSUED ID <span className="text-red-500">*</span>
                              </label>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug mt-0.5">
                                Upload a clear copy of your government ID (e.g., Driver's License, Passport, UMID, PhilSys).
                              </p>
                            </div>

                            {govIdFile ? (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30">
                                  <div className="relative w-11 h-11 rounded-md overflow-hidden border border-emerald-200 dark:border-emerald-800 shrink-0 bg-black/5">
                                    {govIdPreview ? (
                                      <img src={govIdPreview} alt={govIdFile.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[10px] text-emerald-600 font-bold bg-white dark:bg-[#163321]">
                                        PDF
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate" title={govIdFile.name}>
                                      {govIdFile.name}
                                    </p>
                                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                      <CheckCircle2 size={10} /> {formatBytes(govIdFile.size)} • Attached
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSourceModal('govId')}
                                      className="px-2 py-1 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-[#163321] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-colors"
                                      title="Replace government ID"
                                    >
                                      Replace
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGovIdFile(null);
                                        setGovIdPreview('');
                                        setGovIdError('');
                                        setGovIdVerified(false);
                                        setGovIdVerifying(false);
                                        setGovIdVerificationError('');
                                        if (govIdInputRef.current) govIdInputRef.current.value = '';
                                        if (govIdCameraInputRef.current) govIdCameraInputRef.current.value = '';
                                      }}
                                      className="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-[#163321] border border-gray-200 dark:border-[#2d5c3c] text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors cursor-pointer"
                                      title="Remove ID"
                                      aria-label="Remove government ID"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>

                                {/* OCR Verification Status Indicator */}
                                {govIdVerifying && (
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium animate-in fade-in">
                                    <Loader2 size={13} className="animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                                    <span>Verifying Legal Name against Government ID...</span>
                                  </div>
                                )}

                                {!govIdVerifying && govIdVerified && (
                                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-in fade-in">
                                    <CheckCircle2 size={13} className="text-[#00580C] dark:text-emerald-400 shrink-0" />
                                    <span>Legal Name Verified • Matches ID ({formData.name || 'Matches ID'})</span>
                                  </div>
                                )}

                                {!govIdVerifying && govIdVerificationError && (
                                  <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs animate-in fade-in">
                                    <div className="flex items-start gap-1.5 font-semibold">
                                      <AlertTriangle size={13} className="text-red-600 shrink-0 mt-0.5" />
                                      <span>ID Verification Unsuccessful</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-400 pl-4">
                                      {govIdVerificationError}
                                    </p>
                                    <div className="pl-4 pt-1 flex items-center gap-2">
                                      <button
                                        type="button"
                                        disabled={govIdVerifying}
                                        onClick={() => verifyGovId(govIdFile, formData.name)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:text-red-300 bg-white dark:bg-[#1a1012] border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                                      >
                                        <RefreshCw size={11} className={govIdVerifying ? 'animate-spin' : ''} />
                                        <span>Retry Verification</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenSourceModal('govId')}
                                        className="text-[11px] text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                                      >
                                        Upload different ID
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                <div
                                  onClick={() => handleOpenSourceModal('govId')}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const f = e.dataTransfer.files?.[0];
                                    if (f) processGovIdFile(f);
                                  }}
                                  className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                                    ((submitAttempted && !govIdFile) || govIdError)
                                      ? 'border-red-400 dark:border-red-500 bg-red-50/40 dark:bg-red-950/20'
                                      : 'border-gray-300 dark:border-[#2d5c3c] hover:border-[#00580C] dark:hover:border-emerald-600 bg-white dark:bg-[#163321] hover:bg-emerald-50/30'
                                  }`}
                                >
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-50 dark:bg-[#1e3d2a] text-[#00580C] dark:text-emerald-400">
                                    <UploadCloud size={16} />
                                  </div>
                                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 text-center">
                                    Click to attach Government ID or drop file
                                  </p>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                                    JPG, PNG, WEBP, PDF • Max 5 MB
                                  </p>
                                </div>

                                {/* Both options explicitly available */}
                                <div className="flex items-center justify-between pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSourceModalTarget('govId');
                                      govIdInputRef.current?.click();
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00580C] dark:text-emerald-400 hover:underline cursor-pointer"
                                  >
                                    <UploadCloud size={12} />
                                    <span>Upload file</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleChooseCamera('govId')}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:underline cursor-pointer"
                                  >
                                    <Camera size={12} />
                                    <span>Take photo</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {((submitAttempted && !govIdFile) || (govIdError && !govIdVerified && !govIdVerificationError)) && (
                              <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                                <ImageIcon size={12} className="shrink-0" />
                                {govIdError || 'Please upload a valid government-issued ID.'}
                              </p>
                            )}
                          </div>

                          {/* 2. Business Document */}
                          <div className="flex flex-col">
                            <div className="mb-1.5">
                              <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase flex items-center gap-0.5">
                                VALID BUSINESS DOCUMENT <span className="text-red-500">*</span>
                              </label>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug mt-0.5">
                                Upload business registration (e.g., BIR 2303, Mayor's Permit, DTI or SEC Certificate).
                              </p>
                            </div>

                            {imageFiles.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                {imageFiles.map((docItem, idx) => (
                                  <div
                                    key={docItem.id}
                                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30"
                                  >
                                    <div className="relative w-11 h-11 rounded-md overflow-hidden border border-emerald-200 dark:border-emerald-800 shrink-0 bg-black/5">
                                      {docItem.file?.type === 'application/pdf' || docItem.name.toLowerCase().endsWith('.pdf') ? (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-emerald-600 font-bold bg-white dark:bg-[#163321]">
                                          PDF
                                        </div>
                                      ) : (
                                        <img src={docItem.preview} alt={docItem.name} className="w-full h-full object-cover" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate" title={docItem.name}>
                                        {docItem.name}
                                      </p>
                                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                        <CheckCircle2 size={10} /> {formatBytes(docItem.size)} • Attached
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          replaceDocIndexRef.current = idx;
                                          fileInputRef.current?.click();
                                        }}
                                        className="px-2 py-1 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-[#163321] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-colors"
                                        title="Replace document"
                                      >
                                        Replace
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveImage(docItem.id)}
                                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-[#163321] border border-gray-200 dark:border-[#2d5c3c] text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors cursor-pointer"
                                        title="Remove document"
                                        aria-label="Remove business document"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between pt-1">
                                  <button
                                    type="button"
                                    onClick={handleChooseUpload}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00580C] dark:text-emerald-400 hover:underline cursor-pointer"
                                  >
                                    <Plus size={12} />
                                    <span>Add another file</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleChooseCamera}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:underline cursor-pointer"
                                  >
                                    <Camera size={12} />
                                    <span>Take photo</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={handleOpenSourceModal}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                                  documentHasError
                                    ? 'border-red-400 dark:border-red-500 bg-red-50/40 dark:bg-red-950/20'
                                    : 'border-gray-300 dark:border-[#2d5c3c] hover:border-[#00580C] dark:hover:border-emerald-600 bg-white dark:bg-[#163321] hover:bg-emerald-50/30'
                                }`}
                              >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-50 dark:bg-[#1e3d2a] text-[#00580C] dark:text-emerald-400">
                                  <UploadCloud size={16} />
                                </div>
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 text-center">
                                  Click to upload Business Document or drop file
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                                  JPG, PNG, WEBP, PDF • Max 5 MB
                                </p>
                              </div>
                            )}

                            {documentHasError && (
                              <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                                <ImageIcon size={12} className="shrink-0" />
                                {imageError || 'Please upload a valid business verification document.'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* File size limits & format guidance */}
                        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                          <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-[10.5px] text-amber-700 dark:text-amber-300 leading-snug">
                            Accepted formats: JPG, PNG, WEBP, PDF. Maximum file size: 5 MB per file. Image files are automatically optimized before upload.
                          </p>
                        </div>

                        {/* Step 3 Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10 mt-1">
                          <button
                            type="button"
                            onClick={handlePrevStep}
                            className="inline-flex items-center justify-center gap-1 px-4 py-2.5 text-xs sm:text-[12.5px] font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-md transition-colors cursor-pointer"
                          >
                            <ChevronLeft size={14} />
                            <span>Back</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="inline-flex items-center justify-center gap-1.5 bg-[#00580C] hover:bg-[#014209] text-white font-semibold text-xs sm:text-[12.5px] rounded-md px-5 py-2.5 shadow-sm transition-all cursor-pointer"
                          >
                            <span>Continue</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ──── STEP 4: Review & Submit ──── */}
                    {currentStep === 4 && (
                      <div className="flex flex-col gap-3.5">
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Please review your inquiry details below. Click <strong>Edit</strong> on any section if you wish to modify your entries.
                        </p>

                        {/* Section 1: Your Details */}
                        <div className="bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-lg p-3">
                          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-gray-200/70 dark:border-white/10">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#00580C] dark:text-emerald-400">
                              1. Your Details
                            </span>
                            <button
                              type="button"
                              onClick={() => setCurrentStep(1)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00580C] dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              <Pencil size={11} />
                              <span>Edit</span>
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="block text-[10px] text-gray-400 uppercase font-medium">Full Legal Name</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{formData.name || '—'}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-gray-400 uppercase font-medium">Email Address</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-200 break-all">{formData.email || '—'}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-gray-400 uppercase font-medium">Contact Number</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{formData.contactNumber ? `+63 ${formData.contactNumber}` : '—'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Partnership Details */}
                        <div className="bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-lg p-3">
                          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-gray-200/70 dark:border-white/10">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#00580C] dark:text-emerald-400">
                              2. Partnership Details
                            </span>
                            <button
                              type="button"
                              onClick={() => setCurrentStep(2)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00580C] dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              <Pencil size={11} />
                              <span>Edit</span>
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                              <span className="block text-[10px] text-gray-400 uppercase font-medium">Intended Role</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                                {formData.partnerRole === 'warehouse' ? 'Warehouse Owner' : formData.partnerRole || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-gray-400 uppercase font-medium">Organization / Company</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{formData.organization || '—'}</span>
                            </div>
                          </div>
                          <div>
                            <span className="block text-[10px] text-gray-400 uppercase font-medium mb-1">Partnership Inquiry / Message</span>
                            <div className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-[#163321] border border-gray-200 dark:border-[#2d5c3c] rounded p-2.5 max-h-24 overflow-y-auto leading-relaxed">
                              {formData.message || <span className="italic text-gray-400">No message entered</span>}
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Verification Documents */}
                        <div className="bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-lg p-3">
                          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-gray-200/70 dark:border-white/10">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#00580C] dark:text-emerald-400">
                              3. Verification Documents
                            </span>
                            <button
                              type="button"
                              onClick={() => setCurrentStep(3)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00580C] dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              <Pencil size={11} />
                              <span>Edit</span>
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="block text-[10px] text-gray-400 uppercase font-medium mb-0.5">Government-Issued ID</span>
                              {govIdFile ? (
                                <div className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                                  <CheckCircle2 size={13} className="text-[#00580C] dark:text-emerald-400 shrink-0" />
                                  <span className="truncate">{govIdFile.name}</span>
                                  <span className="text-[10px] text-gray-400 shrink-0">({formatBytes(govIdFile.size)})</span>
                                </div>
                              ) : (
                                <span className={submitAttempted ? 'text-red-500 font-medium' : 'text-gray-400 italic'}>
                                  {submitAttempted ? 'Missing ID' : 'No ID attached yet'}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="block text-[10px] text-gray-400 uppercase font-medium mb-0.5">Business Document</span>
                              {imageFiles.length > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                  {imageFiles.map(doc => (
                                    <div key={doc.id} className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                                      <CheckCircle2 size={13} className="text-[#00580C] dark:text-emerald-400 shrink-0" />
                                      <span className="truncate">{doc.name}</span>
                                      <span className="text-[10px] text-gray-400 shrink-0">({formatBytes(doc.size)})</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className={submitAttempted ? 'text-red-500 font-medium' : 'text-gray-400 italic'}>
                                  {submitAttempted ? 'Missing Business Document' : 'No document attached yet'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Terms & Privacy Policy Agreement */}
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

                        {/* Step 4 Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10 mt-1">
                          <button
                            type="button"
                            onClick={handlePrevStep}
                            className="inline-flex items-center justify-center gap-1 px-4 py-2.5 text-xs sm:text-[12.5px] font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-md transition-colors cursor-pointer"
                          >
                            <ChevronLeft size={14} />
                            <span>Back</span>
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 bg-[#00580C] hover:bg-[#014209] text-white font-semibold text-xs sm:text-[12.5px] rounded-md px-5 py-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                            <span>{isSubmitting ? 'Sending Verification Email...' : 'Submit Partnership Inquiry'}</span>
                          </button>
                        </div>
                      </div>
                    )}
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

      {/* ── Document Source Chooser Modal ── */}
      {isSourceModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsSourceModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#0e2417] border border-gray-200 dark:border-[#204830] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#1d3d29] mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {sourceModalTarget === 'govId' ? 'Attach Government-Issued ID' : 'Attach Business Document'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {sourceModalTarget === 'govId'
                    ? 'Choose how you would like to provide your valid ID'
                    : 'Choose how you would like to provide your credential'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSourceModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a3a26] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-3">
              {/* Option 1: Upload File */}
              <button
                type="button"
                onClick={handleChooseUpload}
                className="flex flex-col items-center justify-center text-center p-5 rounded-xl border-2 border-gray-200 dark:border-[#244f35] bg-gray-50/70 dark:bg-[#153422] hover:border-[#00580C] dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-[#184029] transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-white dark:bg-[#0e2417] shadow-sm flex items-center justify-center text-[#00580C] dark:text-emerald-400 mb-2.5 group-hover:scale-110 transition-transform">
                  <UploadCloud size={24} />
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100">
                  Upload File
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                  Choose an image from files or gallery
                </span>
              </button>

              {/* Option 2: Take Photo */}
              <button
                type="button"
                onClick={() => handleChooseCamera()}
                className="flex flex-col items-center justify-center text-center p-5 rounded-xl border-2 border-gray-200 dark:border-[#244f35] bg-gray-50/70 dark:bg-[#153422] hover:border-[#00580C] dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-[#184029] transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-white dark:bg-[#0e2417] shadow-sm flex items-center justify-center text-[#00580C] dark:text-emerald-400 mb-2.5 group-hover:scale-110 transition-transform">
                  <Camera size={24} />
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100">
                  Take a Photo
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                  Use camera to capture physical document
                </span>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#1d3d29] flex justify-end">
              <button
                type="button"
                onClick={() => setIsSourceModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a3a26] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Live Webcam Capture Modal (Desktop) ── */}
      {isCameraModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={handleCloseCameraModal}
        >
          <div
            className="bg-white dark:bg-[#0e2417] border border-gray-200 dark:border-[#204830] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden p-4 sm:p-5 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#1d3d29] mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Camera size={18} className="text-[#00580C] dark:text-emerald-400" />
                  {sourceModalTarget === 'govId' ? 'Capture Government ID Photo' : 'Capture Document Photo'}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {sourceModalTarget === 'govId'
                    ? 'Position your ID clearly within the frame ensuring text is legible'
                    : 'Position your document clearly within the camera frame'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseCameraModal}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a3a26] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Video Viewfinder */}
            <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-gray-200 dark:border-[#244f35]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              {!cameraActive && !cameraError && (
                <div className="flex flex-col items-center gap-2 text-white text-xs">
                  <Loader2 size={24} className="animate-spin text-emerald-400" />
                  <span>Starting camera...</span>
                </div>
              )}
              {cameraError && (
                <div className="text-center p-4 text-xs text-red-300">
                  <p>{cameraError}</p>
                </div>
              )}
              {/* Viewfinder overlay guide box */}
              {cameraActive && (
                <div className="pointer-events-none absolute inset-4 border-2 border-dashed border-white/60 rounded-md flex items-end justify-center pb-2">
                  <span className="bg-black/60 backdrop-blur-sm text-[10px] text-white/90 px-2 py-0.5 rounded">
                    Align document inside the frame
                  </span>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCloseCameraModal}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a3a26] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!cameraActive}
                onClick={handleCaptureWebcam}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00580C] hover:bg-[#00470a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Camera size={16} />
                <span>Snap Photo</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Policy Modal ── */}
      <PolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        onAgree={() => setAgreedToTerms(true)}
      />

      {/* ── Floating Toast Notification ── */}
      {toast && createPortal(
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-[99999] max-w-sm sm:max-w-md flex items-start gap-3 p-4 rounded-xl shadow-2xl border transition-all animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'error'
              ? 'bg-red-50 dark:bg-[#201013] border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
              : toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-[#0c2417] border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-white dark:bg-[#152e20] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'error' ? (
              <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
            ) : toast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-[#00580C] dark:text-emerald-400" />
            ) : (
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-[12.5px] font-semibold leading-snug">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded transition-colors cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
