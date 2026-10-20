import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Handshake,
  CheckCircle2,
  Loader2,
  UploadCloud,
  FileText,
  Trash2,
  Edit3,
  AlertCircle,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import LandingFooter from '../Components/Major-Components/LandingFooter';
import shakehandsImg from '../assets/shakehands2.png';
import './SupportPages.css';

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ''}/api`;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

const ROLE_OPTIONS = [
  { value: 'miller', label: 'Miller / Supplier' },
  { value: 'warehouse', label: 'Warehouse Owner / Storage Manager' },
  { value: 'retailer', label: 'Retailer / Rice Distributor' },
];

export default function PartnerWithUs() {
  const navigate = useNavigate();

  // Wizard state: 1, 2, 3, 4
  const [currentStep, setCurrentStep] = useState(1);

  // Form field state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    partnerRole: '',
    organization: '',
    message: '',
    agreeTerms: false,
  });

  // File uploads
  const [govIdFile, setGovIdFile] = useState(null);
  const [bizDocFile, setBizDocFile] = useState(null);

  // Validation & feedback state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }

  // File input refs
  const govIdInputRef = useRef(null);
  const bizDocInputRef = useRef(null);

  // Show Toast helper
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Change handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Contact number specific handler (only digits, max 10)
  const handleContactChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('0')) {
      val = val.substring(1);
    }
    if (val.length > 10) {
      val = val.substring(0, 10);
    }
    setFormData((prev) => ({ ...prev, contactNumber: val }));
    if (errors.contactNumber) {
      setErrors((prev) => ({ ...prev, contactNumber: '' }));
    }
  };

  // File validation
  const validateUploadedFile = (file) => {
    if (!file) return 'Please select a document.';
    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid format (.${ext}). Allowed: JPG, PNG, WEBP, PDF.`;
    }
    if (file.size > MAX_FILE_BYTES) {
      return `File exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
    }
    return '';
  };

  const handleGovIdChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const err = validateUploadedFile(file);
      if (err) {
        setErrors((prev) => ({ ...prev, govId: err }));
        showToast('error', err);
      } else {
        setGovIdFile(file);
        setErrors((prev) => ({ ...prev, govId: '' }));
      }
    }
  };

  const handleBizDocChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const err = validateUploadedFile(file);
      if (err) {
        setErrors((prev) => ({ ...prev, bizDoc: err }));
        showToast('error', err);
      } else {
        setBizDocFile(file);
        setErrors((prev) => ({ ...prev, bizDoc: '' }));
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Step Validation logic
  const validateStep1 = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Full legal name is required.';
    } else if (!/^[a-zA-Z\s\-'.]+$/.test(formData.name.trim())) {
      errs.name = 'Please enter a valid legal name (letters and spaces only).';
    }

    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!formData.contactNumber) {
      errs.contactNumber = 'Contact number is required.';
    } else if (!formData.contactNumber.startsWith('9')) {
      errs.contactNumber = 'Mobile number must start with 9.';
    } else if (formData.contactNumber.length < 10) {
      errs.contactNumber = `Please enter all 10 digits (9XXXXXXXXX).`;
    }

    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!formData.partnerRole) {
      errs.partnerRole = 'Please select your intended partner role.';
    }
    if (!formData.organization.trim()) {
      errs.organization = 'Organization or company name is required.';
    }
    if (!formData.message.trim()) {
      errs.message = 'Partnership inquiry message is required.';
    }

    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs = {};
    if (!govIdFile) {
      errs.govId = 'Valid government-issued ID is required.';
    }
    if (!bizDocFile) {
      errs.bizDoc = 'Valid business verification document is required.';
    }

    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const validateStep4 = () => {
    const errs = {};
    if (!formData.agreeTerms) {
      errs.agreeTerms = 'You must agree to the Terms of Service & Privacy Policy.';
    }
    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  // Navigation between steps
  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) {
        showToast('error', 'Please complete all required fields correctly.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) {
        showToast('error', 'Please fill in all partnership details.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!validateStep3()) {
        showToast('error', 'Please upload both required verification documents.');
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Submit all collected data
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep4()) {
      showToast('error', 'Please review and accept the agreement before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('name', formData.name.trim());
      fd.append('email', formData.email.trim().toLowerCase());
      fd.append('organization_company', formData.organization.trim());
      fd.append('partner_role', formData.partnerRole);
      fd.append('contact_number', `+63${formData.contactNumber}`);
      fd.append('message', formData.message.trim());

      if (govIdFile) {
        fd.append('government_issued_id', govIdFile);
      }
      if (bizDocFile) {
        fd.append('business_verification_document', bizDocFile);
      }

      const res = await fetch(`${API_BASE}/partnership-inquiries/`, {
        method: 'POST',
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok || res.status === 201) {
        setIsSuccessModalOpen(true);
        showToast('success', 'Your partnership inquiry has been submitted successfully!');
      } else {
        if (data.title && data.detail) {
          showToast('error', `${data.title}: ${data.detail}`);
        } else if (data.name || data.email || data.organization || data.contact_number) {
          const errMsg = data.name || data.email || data.organization || data.contact_number;
          showToast('error', errMsg);
        } else if (data.detail) {
          showToast('error', data.detail);
        } else {
          showToast('error', 'Failed to submit partnership inquiry. Please try again.');
        }
      }
    } catch {
      showToast('error', 'A network error occurred. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData({
      name: '',
      email: '',
      contactNumber: '',
      partnerRole: '',
      organization: '',
      message: '',
      agreeTerms: false,
    });
    setGovIdFile(null);
    setBizDocFile(null);
    setErrors({});
    setTouched({});
    setCurrentStep(1);
    setIsSuccessModalOpen(false);
  };

  const stepTitles = {
    1: 'Your Details',
    2: 'Partnership Details',
    3: 'Verification Documents',
    4: 'Review & Submit',
  };

  const stepSubtitles = {
    1: 'Enter your basic personal and contact information.',
    2: 'Tell us about your organization and partnership goals.',
    3: 'Upload documents for legal and operational verification.',
    4: 'Review your submission details before sending.',
  };

  return (
    <div className="min-h-screen bg-[#F4FAF5] dark:bg-[#0D1712] flex flex-col justify-between font-sans selection:bg-emerald-200">
      {/* ─── Floating Toast Notification ─── */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md transition-all animate-bounce-short bg-white/95 dark:bg-[#142319]/95 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-emerald-800">
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-500 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white ml-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div>
        {/* ─── Top Header Navigation ─── */}
        <header className="w-full bg-[#F4FAF5] dark:bg-[#0D1712] border-b border-[#E2EBE5] dark:border-[#1E2E23]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-xs sm:text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} strokeWidth={2} />
              <span>Back to GrainRise Home</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white dark:bg-[#142319] border border-[#D5E5DA] dark:border-[#213728] shadow-[0_1px_2px_rgba(0,0,0,0.03)] text-[11.5px] font-semibold text-[#00580C] dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span>Partnership Inquiry</span>
            </div>
          </div>
        </header>

        {/* ─── Main Content Container ─── */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
          {/* ─── Card 1: Top Hero Banner Card ─── */}
          <div className="bg-white dark:bg-[#142319] rounded-2xl border border-[#E2EBE5] dark:border-[#203728] p-5 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex-1">
              <div className="inline-block bg-[#E8F5E9] dark:bg-[#1B3B27] text-[#00580C] dark:text-emerald-400 border border-[#CDE7D4] dark:border-[#2A5239] text-[10px] sm:text-[10.5px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded mb-2">
                PARTNERSHIP
              </div>
              <h1 className="text-2xl sm:text-[26px] font-bold text-gray-900 dark:text-white tracking-tight mb-1.5">
                Partner With GrainRise
              </h1>
              <p className="text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
                Interested in connecting your organization with the GrainRise supply chain network? Follow the 4 simple steps below to submit your partnership inquiry.
              </p>
            </div>

            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EAF5EE] dark:bg-[#1B3B27] flex items-center justify-center text-[#00580C] dark:text-emerald-400 shrink-0 self-start sm:self-center shadow-xs">
              <Handshake size={28} strokeWidth={1.8} />
            </div>
          </div>

          {/* ─── Card 2: 4-Step Form Card & Illustration Split ─── */}
          <div className="bg-white dark:bg-[#142319] rounded-2xl border border-[#E2EBE5] dark:border-[#203728] p-6 sm:p-8 lg:p-9 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              
              {/* Form Section (Left Column) */}
              <div className="lg:col-span-7 flex flex-col">
                {/* Step Indicator Header (NO PROGRESS BAR) */}
                <div className="mb-5 pb-3 border-b border-gray-100 dark:border-[#1E3324] flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] font-bold tracking-wider uppercase text-[#00580C] dark:text-emerald-400">
                      Step {currentStep} of 4
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-0.5 tracking-tight">
                      {stepTitles[currentStep]}
                    </h2>
                  </div>
                  <span className="text-[11.5px] text-gray-400 dark:text-gray-500 hidden sm:inline-block">
                    {stepSubtitles[currentStep]}
                  </span>
                </div>

                {/* ── STEP 1: YOUR DETAILS ── */}
                {currentStep === 1 && (
                  <div className="flex flex-col gap-4">
                    {/* Full Legal Name */}
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5"
                      >
                        FULL LEGAL NAME <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Enter your full legal name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-[#16271c] placeholder:text-gray-400 dark:placeholder:text-gray-500 transition outline-none ${
                          errors.name
                            ? 'border-red-400 ring-1 ring-red-300'
                            : 'border-gray-200 dark:border-[#284232] focus:border-[#00580C] dark:focus:border-emerald-500 focus:ring-1 focus:ring-[#00580C]'
                        }`}
                      />
                      {errors.name && <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>}
                    </div>

                    {/* Email Address */}
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5"
                      >
                        EMAIL ADDRESS <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-[#16271c] placeholder:text-gray-400 dark:placeholder:text-gray-500 transition outline-none ${
                          errors.email
                            ? 'border-red-400 ring-1 ring-red-300'
                            : 'border-gray-200 dark:border-[#284232] focus:border-[#00580C] dark:focus:border-emerald-500 focus:ring-1 focus:ring-[#00580C]'
                        }`}
                      />
                      {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>}
                    </div>

                    {/* Contact Number with +63 */}
                    <div>
                      <label
                        htmlFor="contactNumber"
                        className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5"
                      >
                        CONTACT NUMBER <span className="text-red-500">*</span>
                      </label>
                      <div
                        className={`flex items-center rounded-lg border overflow-hidden transition ${
                          errors.contactNumber
                            ? 'border-red-400 ring-1 ring-red-300'
                            : 'border-gray-200 dark:border-[#284232] focus-within:border-[#00580C] dark:focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-[#00580C]'
                        }`}
                      >
                        <span className="px-3 py-2.5 bg-gray-50 dark:bg-[#1a3324] border-r border-gray-200 dark:border-[#284232] text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 select-none">
                          +63
                        </span>
                        <input
                          id="contactNumber"
                          name="contactNumber"
                          type="tel"
                          placeholder="9XXXXXXXXX"
                          value={formData.contactNumber}
                          onChange={handleContactChange}
                          className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-[#16271c] placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
                        />
                      </div>
                      {errors.contactNumber ? (
                        <p className="mt-1 text-[11px] text-red-500">{errors.contactNumber}</p>
                      ) : (
                        <p className="mt-1 text-[10.5px] text-gray-400 dark:text-gray-500">
                          Format: 10 digits starting with 9 (e.g., 9123456789)
                        </p>
                      )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="pt-3 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handleNext}
                        className="px-6 py-2.5 rounded-lg bg-[#00580C] hover:bg-[#00470A] text-white text-xs sm:text-[13px] font-semibold transition shadow-xs hover:shadow cursor-pointer inline-flex items-center gap-2"
                      >
                        <span>Continue</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: PARTNERSHIP DETAILS ── */}
                {currentStep === 2 && (
                  <div className="flex flex-col gap-4">
                    {/* Intended Partner Role */}
                    <div>
                      <label
                        htmlFor="partnerRole"
                        className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5"
                      >
                        INTENDED PARTNER ROLE <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="partnerRole"
                        name="partnerRole"
                        value={formData.partnerRole}
                        onChange={handleInputChange}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-[#16271c] transition outline-none cursor-pointer ${
                          errors.partnerRole
                            ? 'border-red-400 ring-1 ring-red-300'
                            : 'border-gray-200 dark:border-[#284232] focus:border-[#00580C] dark:focus:border-emerald-500 focus:ring-1 focus:ring-[#00580C]'
                        }`}
                      >
                        <option value="" disabled>
                          Select your intended role...
                        </option>
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {errors.partnerRole && (
                        <p className="mt-1 text-[11px] text-red-500">{errors.partnerRole}</p>
                      )}
                    </div>

                    {/* Organization / Company Name */}
                    <div>
                      <label
                        htmlFor="organization"
                        className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5"
                      >
                        ORGANIZATION / COMPANY NAME <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="organization"
                        name="organization"
                        type="text"
                        placeholder="Enter your organization or company name"
                        value={formData.organization}
                        onChange={handleInputChange}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-[#16271c] placeholder:text-gray-400 dark:placeholder:text-gray-500 transition outline-none ${
                          errors.organization
                            ? 'border-red-400 ring-1 ring-red-300'
                            : 'border-gray-200 dark:border-[#284232] focus:border-[#00580C] dark:focus:border-emerald-500 focus:ring-1 focus:ring-[#00580C]'
                        }`}
                      />
                      {errors.organization && (
                        <p className="mt-1 text-[11px] text-red-500">{errors.organization}</p>
                      )}
                    </div>

                    {/* Partnership Inquiry / Message */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="message"
                          className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider"
                        >
                          PARTNERSHIP INQUIRY / MESSAGE <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-gray-400">
                          {formData.message.length}/2000
                        </span>
                      </div>
                      <textarea
                        id="message"
                        name="message"
                        rows={3}
                        maxLength={2000}
                        placeholder="Tell us about your organization and how you would like to partner with GrainRise."
                        value={formData.message}
                        onChange={handleInputChange}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-[#16271c] placeholder:text-gray-400 dark:placeholder:text-gray-500 transition outline-none resize-none ${
                          errors.message
                            ? 'border-red-400 ring-1 ring-red-300'
                            : 'border-gray-200 dark:border-[#284232] focus:border-[#00580C] dark:focus:border-emerald-500 focus:ring-1 focus:ring-[#00580C]'
                        }`}
                      />
                      {errors.message && (
                        <p className="mt-1 text-[11px] text-red-500">{errors.message}</p>
                      )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="pt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#284232] hover:bg-gray-50 dark:hover:bg-[#16271c] text-gray-700 dark:text-gray-300 text-xs sm:text-[13px] font-medium transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <ArrowLeft size={15} />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNext}
                        className="px-6 py-2.5 rounded-lg bg-[#00580C] hover:bg-[#00470A] text-white text-xs sm:text-[13px] font-semibold transition shadow-xs hover:shadow cursor-pointer inline-flex items-center gap-2"
                      >
                        <span>Continue</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: VERIFICATION DOCUMENTS ── */}
                {currentStep === 3 && (
                  <div className="flex flex-col gap-4">
                    {/* Document 1: Government-Issued ID */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                        VALID GOVERNMENT-ISSUED ID <span className="text-red-500">*</span>
                      </label>
                      <p className="text-[11px] text-gray-400 dark:text-gray-400 mb-2 leading-tight">
                        Upload Driver's License, Passport, UMID, PhilSys ID, or PRC ID (JPG, PNG, WEBP, PDF up to 5MB).
                      </p>

                      <input
                        ref={govIdInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={handleGovIdChange}
                        className="hidden"
                      />

                      {!govIdFile ? (
                        <div
                          onClick={() => govIdInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 ${
                            errors.govId
                              ? 'border-red-400 bg-red-50/20'
                              : 'border-gray-200 dark:border-[#284232]'
                          }`}
                        >
                          <UploadCloud size={22} className="mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                            Click to upload government ID
                          </span>
                          <span className="block text-[10px] text-gray-400 mt-0.5">
                            Max 5MB • Formats: JPG, PNG, WEBP, PDF
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <FileText size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">
                                {govIdFile.name}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {formatFileSize(govIdFile.size)} • Ready
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => govIdInputRef.current?.click()}
                              className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline px-1.5 py-1 cursor-pointer"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => setGovIdFile(null)}
                              className="text-gray-400 hover:text-red-500 p-1 cursor-pointer transition"
                              title="Remove file"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                      {errors.govId && <p className="mt-1 text-[11px] text-red-500">{errors.govId}</p>}
                    </div>

                    {/* Document 2: Business Verification Document */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                        VALID BUSINESS DOCUMENT <span className="text-red-500">*</span>
                      </label>
                      <p className="text-[11px] text-gray-400 dark:text-gray-400 mb-2 leading-tight">
                        Upload DTI / SEC Registration, Mayor's / Business Permit, or BIR Certificate (JPG, PNG, WEBP, PDF up to 5MB).
                      </p>

                      <input
                        ref={bizDocInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={handleBizDocChange}
                        className="hidden"
                      />

                      {!bizDocFile ? (
                        <div
                          onClick={() => bizDocInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 ${
                            errors.bizDoc
                              ? 'border-red-400 bg-red-50/20'
                              : 'border-gray-200 dark:border-[#284232]'
                          }`}
                        >
                          <UploadCloud size={22} className="mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                            Click to upload business document
                          </span>
                          <span className="block text-[10px] text-gray-400 mt-0.5">
                            Max 5MB • Formats: JPG, PNG, WEBP, PDF
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <FileText size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">
                                {bizDocFile.name}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {formatFileSize(bizDocFile.size)} • Ready
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => bizDocInputRef.current?.click()}
                              className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline px-1.5 py-1 cursor-pointer"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => setBizDocFile(null)}
                              className="text-gray-400 hover:text-red-500 p-1 cursor-pointer transition"
                              title="Remove file"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                      {errors.bizDoc && <p className="mt-1 text-[11px] text-red-500">{errors.bizDoc}</p>}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="pt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#284232] hover:bg-gray-50 dark:hover:bg-[#16271c] text-gray-700 dark:text-gray-300 text-xs sm:text-[13px] font-medium transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <ArrowLeft size={15} />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNext}
                        className="px-6 py-2.5 rounded-lg bg-[#00580C] hover:bg-[#00470A] text-white text-xs sm:text-[13px] font-semibold transition shadow-xs hover:shadow cursor-pointer inline-flex items-center gap-2"
                      >
                        <span>Continue</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: REVIEW & SUBMIT ── */}
                {currentStep === 4 && (
                  <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                    {/* Summary Group 1: Your Details */}
                    <div className="p-3.5 rounded-xl border border-gray-200 dark:border-[#284232] bg-gray-50/50 dark:bg-[#16271c]">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-200/60 dark:border-[#243c2c]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          1. Your Details
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="text-[11px] font-semibold text-[#00580C] dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400 text-[10.5px] block">Full Legal Name:</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-100">{formData.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10.5px] block">Email Address:</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-100">{formData.email}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-gray-400 text-[10.5px] block">Contact Number:</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-100">+63 {formData.contactNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Summary Group 2: Partnership Details */}
                    <div className="p-3.5 rounded-xl border border-gray-200 dark:border-[#284232] bg-gray-50/50 dark:bg-[#16271c]">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-200/60 dark:border-[#243c2c]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          2. Partnership Details
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="text-[11px] font-semibold text-[#00580C] dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400 text-[10.5px] block">Intended Role:</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-100 capitalize">
                            {ROLE_OPTIONS.find((r) => r.value === formData.partnerRole)?.label || formData.partnerRole}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10.5px] block">Organization / Company:</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-100">{formData.organization}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-gray-400 text-[10.5px] block">Inquiry Message:</span>
                          <p className="text-gray-700 dark:text-gray-200 italic line-clamp-2">
                            "{formData.message}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Summary Group 3: Documents */}
                    <div className="p-3.5 rounded-xl border border-gray-200 dark:border-[#284232] bg-gray-50/50 dark:bg-[#16271c]">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-200/60 dark:border-[#243c2c]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          3. Verification Documents
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          className="text-[11px] font-semibold text-[#00580C] dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="truncate">
                            <span className="text-gray-400 text-[10.5px] block">Government ID:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100 truncate block">
                              {govIdFile?.name || 'Not provided'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="truncate">
                            <span className="text-gray-400 text-[10.5px] block">Business Document:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100 truncate block">
                              {bizDocFile?.name || 'Not provided'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Terms & Consent Checkbox */}
                    <div className="pt-1">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          name="agreeTerms"
                          checked={formData.agreeTerms}
                          onChange={handleInputChange}
                          className="mt-0.5 w-4 h-4 rounded text-[#00580C] focus:ring-[#00580C] cursor-pointer"
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                          I confirm that the information and documents provided are authentic, and I agree to GrainRise's{' '}
                          <span className="text-[#00580C] dark:text-emerald-400 font-semibold underline">
                            Terms of Service
                          </span>{' '}
                          and{' '}
                          <span className="text-[#00580C] dark:text-emerald-400 font-semibold underline">
                            Privacy Policy
                          </span>.
                        </span>
                      </label>
                      {errors.agreeTerms && (
                        <p className="mt-1 text-[11px] text-red-500">{errors.agreeTerms}</p>
                      )}
                    </div>

                    {/* Final Navigation Buttons */}
                    <div className="pt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleBack}
                        disabled={isSubmitting}
                        className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#284232] hover:bg-gray-50 dark:hover:bg-[#16271c] text-gray-700 dark:text-gray-300 text-xs sm:text-[13px] font-medium transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                      >
                        <ArrowLeft size={15} />
                        <span>Back</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-lg bg-[#00580C] hover:bg-[#00470A] text-white text-xs sm:text-[13px] font-semibold transition shadow-xs hover:shadow cursor-pointer inline-flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Submitting Application...</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Submit Partnership Inquiry</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Illustration Section (Right Column) - Always visible and vertically balanced */}
              <div className="lg:col-span-5 flex items-center justify-center p-2 lg:p-4">
                <img
                  src={shakehandsImg}
                  alt="GrainRise Partnership"
                  className="w-full max-w-[360px] sm:max-w-[400px] object-contain drop-shadow-sm select-none pointer-events-none transition-transform duration-300 hover:scale-[1.02]"
                />
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* ─── Success Confirmation Modal ─── */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#142319] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 dark:border-[#203728] text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <CheckCircle2 size={34} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
              Inquiry Submitted Successfully!
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              Thank you, <strong className="text-gray-700 dark:text-gray-200">{formData.name || 'Partner'}</strong>. Your partnership inquiry and verification credentials have been forwarded to the GrainRise operations team. We will review your application and get in touch with you shortly.
            </p>
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={handleResetForm}
                className="flex-1 py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-[#1f3525] dark:hover:bg-[#274430] text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Submit Another
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#00580C] hover:bg-[#00470A] text-white text-xs sm:text-sm font-semibold transition cursor-pointer shadow-xs"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Footer ─── */}
      <LandingFooter />
    </div>
  );
}
