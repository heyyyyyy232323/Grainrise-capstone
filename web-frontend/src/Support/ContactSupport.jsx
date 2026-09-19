import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Headphones,
  FileText,
  Search,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Check,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  BookOpen,
  UploadCloud
} from 'lucide-react';
import LandingFooter from '../Components/Major-Components/LandingFooter';
import LandingHeader from '../Components/Major-Components/LandingHeader';
import './SupportPages.css';

export default function ContactSupport() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: 'Mang Danilo Ramos',
    email: 'danilo.ramos@grainrise.ph',
    userRole: 'Farmer',
    concernCategory: 'Technical Issue',
    referenceId: 'PRD-2026-002',
    subject: 'Unable to sync Point of Sale inventory with central Luzon node',
    description: "During inventory sync on Tuesday morning at 09:30 AM PHT, the application reported code 'ERR-NODE-LBN-502'. We verified local network connection is active. As a result, 400 sacks of Sinandomeng palay remain marked 'pending broadcast'. Kindly advise on resynchronizing with the central Luzon node without generating duplicated ledger batches.",
    attachmentName: 'screenshot-error.png',
    attachmentSize: '1.2 MB'
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const commonReasons = [
    {
      q: "I can't access my GrainRise account",
      a: 'Use the Login Assistance page for common password, verification, and account-status guidance. If the issue remains unresolved, submit a support request.'
    },
    {
      q: 'My registration has an issue',
      a: 'Verification times may vary during peak harvest onboarding. Ensure uploaded RSBSA certificates, BIR 2303, or Mayor\'s permits are clear and legible. You can submit a support request with your Reference ID to request expedited review.'
    },
    {
      q: 'I found incorrect information in my account',
      a: 'If you notice any inaccuracies in your account details, profile information, or transaction records, please provide the specific field or record in your support request along with the correct information.'
    },
    {
      q: 'I encountered a technical error',
      a: 'If you encounter an ERR-NODE code, verify your internet connection first. Offline transactions are safely cached in local browser storage and will retry automatically once the centralized node responds.'
    },
    {
      q: 'I have a concern about an order or transaction',
      a: 'For order or transaction concerns, provide the applicable reference number, date of transaction, and a description of the issue. Our team will review the transaction logs and provide guidance.'
    }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setFormData(prev => ({
        ...prev,
        attachmentName: file.name,
        attachmentSize: `${sizeMB} MB`
      }));
    }
  };

  const removeAttachment = () => {
    setFormData(prev => ({
      ...prev,
      attachmentName: '',
      attachmentSize: ''
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.subject || !formData.description) {
      alert('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="support-page-root animate-page-fade">
      <LandingHeader />
      <div className="support-container">
        
        {/* Top Navigation */}
        <div className="support-top-nav">
          <button className="support-back-link" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
            <span>Back to GrainRise Home</span>
          </button>
          <div className="support-top-badge">
            <span className="support-top-badge__dot" />
            <span>Public Knowledge Base</span>
          </div>
        </div>

        {/* Hero Card Banner */}
        <div className="support-hero-card">
          <div className="support-hero-content">
            <span className="support-pill-tag">HELP & SUPPORT</span>
            <h1 className="support-hero-title">Contact Support</h1>
            <p className="support-hero-desc">
              Need additional help? Send your concern to the GrainRise Support Team and provide the details we need to assist you.
            </p>
          </div>
          <div className="support-hero-icon-box">
            <Headphones size={24} strokeWidth={1.8} />
          </div>
        </div>

        {/* Before Contacting Support Section */}
        <section className="support-section">
          <div className="support-section-header">
            <h2 className="support-section-title">Before Contacting Support</h2>
            <p className="support-section-subtitle">
              A few details can help us understand and resolve your concern more efficiently.
            </p>
          </div>

          <div className="support-inquiry-grid">
            {/* Card 1 */}
            <div className="support-inquiry-card" style={{ cursor: 'default' }}>
              <div className="support-inquiry-card__icon">
                <FileText size={20} />
              </div>
              <h3 className="support-inquiry-card__title">Describe the Issue Clearly</h3>
              <p className="support-inquiry-card__desc">
                Tell us what happened, what you were trying to do, and where the issue occurred.
              </p>
            </div>

            {/* Card 2 */}
            <div className="support-inquiry-card" style={{ cursor: 'default' }}>
              <div className="support-inquiry-card__icon">
                <Search size={20} />
              </div>
              <h3 className="support-inquiry-card__title">Provide Relevant Details</h3>
              <p className="support-inquiry-card__desc">
                Include any applicable order, transaction, contract, or application reference number.
              </p>
            </div>

            {/* Card 3 */}
            <div className="support-inquiry-card" style={{ cursor: 'default' }}>
              <div className="support-inquiry-card__icon">
                <ImageIcon size={20} />
              </div>
              <h3 className="support-inquiry-card__title">Add a Screenshot When Helpful</h3>
              <p className="support-inquiry-card__desc">
                Screenshots can help explain technical errors or unexpected system behavior.
              </p>
            </div>
          </div>

          {/* Security Reminder Banner */}
          <div className="support-security-reminder">
            <AlertTriangle size={16} className="support-security-reminder__icon" />
            <span>Security Reminder: Never include your password or verification code in a support request.</span>
          </div>
        </section>

        {/* Main 2-Column: Form (How Can We Help?) & Sidebar */}
        <div className="support-main-layout">
          
          {/* Left Form Box */}
          <div className="support-form-card">
            <div className="support-section-header">
              <h2 className="support-section-title">How Can We Help?</h2>
              <p className="support-section-subtitle">
                Complete the form below and provide as much relevant information as possible.
              </p>
            </div>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <CheckCircle2 size={54} color="#16a34a" />
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#111827' }}>Support Request Submitted!</h3>
                <p style={{ fontSize: '14px', color: '#4b5563', maxWidth: '440px', lineHeight: 1.6, margin: 0 }}>
                  Your support ticket has been recorded with reference <strong>{formData.referenceId || 'TKT-2026-089'}</strong>. Updates and instructions will be sent to <strong>{formData.email}</strong>.
                </p>
                <button
                  className="support-submit-btn"
                  style={{ alignSelf: 'center', marginTop: '12px' }}
                  onClick={() => setSubmitted(false)}
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form className="support-form-grid" onSubmit={handleSubmit}>
                
                {/* Row 1: Full Name & Email Address */}
                <div className="support-form-row">
                  <div className="support-form-group">
                    <label className="support-form-label" htmlFor="fullName">FULL NAME *</label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      className="support-input"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Mang Danilo Ramos"
                      required
                    />
                  </div>

                  <div className="support-form-group">
                    <label className="support-form-label" htmlFor="email">EMAIL ADDRESS *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="support-input"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. danilo.ramos@grainrise.ph"
                      required
                    />
                    <span className="support-form-hint">Use an email address where you can receive support updates.</span>
                  </div>
                </div>

                {/* Row 2: User Role (Optional) & Concern Category */}
                <div className="support-form-row">
                  <div className="support-form-group">
                    <div className="support-form-label-row">
                      <label className="support-form-label" htmlFor="userRole">USER ROLE (OPTIONAL)</label>
                    </div>
                    <select
                      id="userRole"
                      name="userRole"
                      className="support-select"
                      value={formData.userRole}
                      onChange={handleChange}
                    >
                      <option value="Farmer">Farmer</option>
                      <option value="Cooperative Rice Miller">Cooperative Rice Miller</option>
                      <option value="Warehouse Manager / Staff">Warehouse Manager / Staff</option>
                      <option value="Retailer / Buyer">Retailer / Buyer</option>
                      <option value="Consumer">Consumer</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="support-form-group">
                    <label className="support-form-label" htmlFor="concernCategory">CONCERN CATEGORY *</label>
                    <select
                      id="concernCategory"
                      name="concernCategory"
                      className="support-select"
                      value={formData.concernCategory}
                      onChange={handleChange}
                      required
                    >
                      <option value="Technical Issue">Technical Issue</option>
                      <option value="Account Access & Security">Account Access & Security</option>
                      <option value="Order & Transaction Problem">Order & Transaction Problem</option>
                      <option value="Registration / Verification">Registration / Verification</option>
                      <option value="Inventory & Warehouse Sync">Inventory & Warehouse Sync</option>
                      <option value="Billing & Payments">Billing & Payments</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Reference ID (Optional) */}
                <div className="support-form-group">
                  <div className="support-form-label-row">
                    <label className="support-form-label" htmlFor="referenceId">REFERENCE ID (OPTIONAL)</label>
                  </div>
                  <input
                    type="text"
                    id="referenceId"
                    name="referenceId"
                    className="support-input"
                    value={formData.referenceId}
                    onChange={handleChange}
                    placeholder="PRD-2026-002"
                  />
                  <span className="support-form-hint">Provide a reference number only if your concern is related to an existing GrainRise record.</span>
                </div>

                {/* Row 4: Subject */}
                <div className="support-form-group">
                  <label className="support-form-label" htmlFor="subject">SUBJECT *</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    className="support-input"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Brief summary of your concern"
                    required
                  />
                </div>

                {/* Row 5: Description */}
                <div className="support-form-group">
                  <label className="support-form-label" htmlFor="description">DESCRIPTION *</label>
                  <textarea
                    id="description"
                    name="description"
                    className="support-textarea"
                    value={formData.description}
                    onChange={handleChange}
                    maxLength={1000}
                    placeholder="Provide full details of what happened..."
                    required
                  />
                  <div className="support-char-counter">
                    {formData.description.length} / 1000
                  </div>
                </div>

                {/* Row 6: Attachment (Optional) */}
                <div className="support-attachment-container">
                  <div className="support-form-label-row">
                    <label className="support-form-label">ATTACHMENT (OPTIONAL)</label>
                  </div>

                  {formData.attachmentName ? (
                    <div className="support-attachment-box">
                      <div className="support-attachment-info">
                        <Check size={16} color="#16a34a" />
                        <span><strong>{formData.attachmentName}</strong> ({formData.attachmentSize}) • Uploaded successfully</span>
                      </div>
                      <button
                        type="button"
                        className="support-attachment-remove"
                        onClick={removeAttachment}
                        title="Remove attachment"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="support-attachment-box" style={{ cursor: 'pointer' }}>
                      <div className="support-attachment-info" style={{ color: '#4b5563' }}>
                        <UploadCloud size={18} color="#16a34a" />
                        <span>Click to attach screenshot or error log</span>
                      </div>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, application/pdf"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                    </label>
                  )}

                  <span className="support-form-hint">
                    PNG, JPG, or PDF • Maximum file size: 10 MB • Do not upload files containing passwords or verification codes.
                  </span>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  className="support-submit-btn"
                  disabled={submitting}
                >
                  <span>{submitting ? 'Submitting Request...' : 'Submit Support Request'}</span>
                </button>

              </form>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="support-info-col">
            
            {/* Card 1: What Happens Next? */}
            <div className="support-info-card">
              <div className="support-section-header">
                <h3 className="support-section-title" style={{ fontSize: '16px' }}>What Happens Next?</h3>
              </div>

              <div className="support-info-list" style={{ gap: '14px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div className="support-step-num" style={{ width: '22px', height: '22px', fontSize: '10px' }}>01</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, color: '#111827' }}>REQUEST RECEIVED</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#6b7280', lineHeight: 1.45 }}>Your support request is recorded for review.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div className="support-step-num" style={{ width: '22px', height: '22px', fontSize: '10px' }}>02</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, color: '#111827' }}>CONCERN REVIEWED</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#6b7280', lineHeight: 1.45 }}>The GrainRise Support Team reviews the details you provided.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div className="support-step-num" style={{ width: '22px', height: '22px', fontSize: '10px' }}>03</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, color: '#111827' }}>SUPPORT UPDATE</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#6b7280', lineHeight: 1.45 }}>Updates or additional instructions may be sent to the email address provided in your request.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Helpful Information to Include */}
            <div className="support-info-card">
              <div className="support-section-header">
                <h3 className="support-section-title" style={{ fontSize: '16px' }}>Helpful Information to Include</h3>
              </div>

              <div className="support-checklist">
                <div className="support-checklist-item">
                  <Check size={16} className="support-checklist-item__icon" />
                  <span>Page or feature where the issue occurred</span>
                </div>
                <div className="support-checklist-item">
                  <Check size={16} className="support-checklist-item__icon" />
                  <span>What you were trying to do</span>
                </div>
                <div className="support-checklist-item">
                  <Check size={16} className="support-checklist-item__icon" />
                  <span>Any error message shown</span>
                </div>
                <div className="support-checklist-item">
                  <Check size={16} className="support-checklist-item__icon" />
                  <span>Applicable reference number</span>
                </div>
                <div className="support-checklist-item">
                  <Check size={16} className="support-checklist-item__icon" />
                  <span>Screenshot, if available</span>
                </div>
              </div>
            </div>

            {/* Card 3: For Faster Assistance */}
            <div className="support-fast-box">
              <div className="support-fast-box__header">
                <Sparkles size={16} />
                <span>For Faster Assistance</span>
              </div>
              <p className="support-fast-box__text">
                Submit one clear request for each concern. Avoid sending multiple requests for the same issue unless you need to provide additional information.
              </p>
            </div>

          </div>

        </div>

        {/* Common Reasons Accordion Section */}
        <section className="support-section">
          <div className="support-section-header">
            <h2 className="support-section-title">Common Reasons to Contact Support</h2>
            <p className="support-section-subtitle">
              Frequently addressed technical and operational scenarios.
            </p>
          </div>

          <div className="faq-accordion-list">
            {commonReasons.map((item, idx) => (
              <div key={idx} className={`faq-accordion-item ${openFaq === idx ? 'open' : ''}`}>
                <button
                  className="faq-accordion-btn"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <span>{item.q}</span>
                  {openFaq === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openFaq === idx && (
                  <div className="faq-accordion-content">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Protect Your Account Security Banner */}
        <div className="support-security-banner">
          <div className="support-security-icon">
            <ShieldCheck size={18} />
          </div>
          <div className="support-security-content">
            <h3 className="support-security-title">Protect Your Account When Contacting Support</h3>
            <p className="support-security-desc">
              GrainRise Support does not need your password or verification code to investigate a concern.
            </p>
            <div className="support-security-bullets">
              <div className="support-security-bullet-item">
                <span className="support-security-bullet-dot" />
                <span>Never send your password.</span>
              </div>
              <div className="support-security-bullet-item">
                <span className="support-security-bullet-dot" />
                <span>Never share verification codes.</span>
              </div>
              <div className="support-security-bullet-item">
                <span className="support-security-bullet-dot" />
                <span>Only attach files relevant to your concern.</span>
              </div>
              <div className="support-security-bullet-item">
                <span className="support-security-bullet-dot" />
                <span>Avoid sending unnecessary personal or confidential information.</span>
              </div>
              <div className="support-security-bullet-item">
                <span className="support-security-bullet-dot" />
                <span>Make sure the email address you provide is accessible to you.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Need to Return to GrainRise? */}
        <div className="support-return-section">
          <h3 className="support-return-title">Need to Return to GrainRise?</h3>
          <button className="support-return-btn" onClick={() => navigate('/')}>
            Back to GrainRise Home
          </button>
        </div>

      </div>

      <LandingFooter />
    </div>
  );
}
