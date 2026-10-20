import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Globe,
  Building2,
  Lightbulb,
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Info
} from 'lucide-react';
import LandingFooter from '../Components/Major-Components/LandingFooter';
import LandingHeader from '../Components/Major-Components/LandingHeader';
import AnimatedSection from './AnimatedSection';
import './SupportPages.css';

export default function ContactUs() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: 'Dr. Maria Christina Reyes',
    email: 'mc.reyes@agri-institute.edu.ph',
    contactNumber: '+63 917 555 4321',
    organization: 'National Rice Research Consortium',
    inquiryType: 'Partnerships & Collaboration',
    subject: 'Collaboration on Regional Grain Quality Benchmarks & Agronomic Data',
    message: 'Our research institute is exploring potential academic collaboration regarding digital grain traceability and price indices. We would like to schedule an exploratory discussion on how GrainRise\'s transparent market models can support our upcoming harvest sustainability study.',
    consent: true
  });

  const [selectedInquiryCard, setSelectedInquiryCard] = useState('Partnerships & Collaboration');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const inquiryCards = [
    {
      id: 'General Inquiries',
      title: 'General Inquiries',
      desc: 'For questions about GrainRise, its purpose, features, and how the platform works across the agricultural ecosystem.',
      icon: <Globe size={20} strokeWidth={1.8} />
    },
    {
      id: 'Partnerships & Collaboration',
      title: 'Partnerships & Collaboration',
      desc: 'For organizations, businesses, agricultural groups, or institutions interested in working alongside GrainRise.',
      icon: <Building2 size={20} strokeWidth={1.8} />
    },
    {
      id: 'Feedback & Suggestions',
      title: 'Feedback & Suggestions',
      desc: 'Share ideas, community feedback, or suggestions that may help enhance and improve the GrainRise user experience.',
      icon: <Lightbulb size={20} strokeWidth={1.8} />
    }
  ];

  const handleSelectInquiry = (inquiryId) => {
    setSelectedInquiryCard(inquiryId);
    setFormData(prev => ({ ...prev, inquiryType: inquiryId }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.subject || !formData.message) {
      alert('Please fill in all required fields.');
      return;
    }
    if (!formData.consent) {
      alert('Please consent to information processing to continue.');
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
        </div>

        {/* Hero Card Banner */}
        <AnimatedSection className="support-hero-card" animation="fade-up">
          <div className="support-hero-content">
            <h1 className="support-hero-title">Contact Us</h1>
            <p className="support-hero-desc">
              Have a question about GrainRise, want to learn more about the platform, or interested in working with us? We'd be glad to hear from you.
            </p>
          </div>
          <div className="support-hero-icon-box">
            <MessageSquare size={24} strokeWidth={1.8} />
          </div>
        </AnimatedSection>

        {/* How Can We Help? Section */}
        <AnimatedSection tag="section" className="support-section" animation="fade-up" delay={80}>
          <div className="support-section-header">
            <h2 className="support-section-title">How Can We Help?</h2>
            <p className="support-section-subtitle">
              Choose the type of inquiry that best matches what you'd like to discuss.
            </p>
          </div>

          <div className="support-inquiry-grid">
            {inquiryCards.map((card) => (
              <div
                key={card.id}
                className={`support-inquiry-card ${selectedInquiryCard === card.id ? 'selected' : ''}`}
                onClick={() => handleSelectInquiry(card.id)}
                role="button"
                tabIndex={0}
              >
                <div className="support-inquiry-card__icon">{card.icon}</div>
                <h3 className="support-inquiry-card__title">{card.title}</h3>
                <p className="support-inquiry-card__desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        {/* Main 2-Column: Send Us a Message & Contact Information */}
        <AnimatedSection className="support-main-layout" animation="fade-up" delay={120}>
          {/* Left Form Box */}
          <div className="support-form-card">
            <div className="support-section-header">
              <h2 className="support-section-title">Send Us a Message</h2>
              <p className="support-section-subtitle">
                Tell us what you'd like to discuss and we'll use the information provided to respond appropriately.
              </p>
            </div>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <CheckCircle2 size={54} color="#16a34a" />
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#111827' }}>Thank You for Reaching Out!</h3>
                <p style={{ fontSize: '14px', color: '#4b5563', maxWidth: '440px', lineHeight: 1.6, margin: 0 }}>
                  Your message regarding <strong>"{formData.subject}"</strong> has been logged securely. Our team will review your inquiry and follow up at <strong>{formData.email}</strong> within 1–2 business days.
                </p>
                <button
                  className="support-submit-btn"
                  style={{ alignSelf: 'center', marginTop: '12px' }}
                  onClick={() => setSubmitted(false)}
                >
                  Send Another Inquiry
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
                      placeholder="e.g. Dr. Maria Christina Reyes"
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
                      placeholder="e.g. mc.reyes@agri-institute.edu.ph"
                      required
                    />
                    <span className="support-form-hint">Use an email address where you can receive a response</span>
                  </div>
                </div>

                {/* Row 2: Contact Number & Organization / Business */}
                <div className="support-form-row">
                  <div className="support-form-group">
                    <div className="support-form-label-row">
                      <label className="support-form-label" htmlFor="contactNumber">CONTACT NUMBER</label>
                      <span className="support-form-label-optional">Optional</span>
                    </div>
                    <input
                      type="tel"
                      id="contactNumber"
                      name="contactNumber"
                      className="support-input"
                      value={formData.contactNumber}
                      onChange={handleChange}
                      placeholder="+63 917 555 4321"
                    />
                  </div>

                  <div className="support-form-group">
                    <div className="support-form-label-row">
                      <label className="support-form-label" htmlFor="organization">ORGANIZATION / BUSINESS</label>
                      <span className="support-form-label-optional">Optional</span>
                    </div>
                    <input
                      type="text"
                      id="organization"
                      name="organization"
                      className="support-input"
                      value={formData.organization}
                      onChange={handleChange}
                      placeholder="National Rice Research Consortium"
                    />
                  </div>
                </div>

                {/* Row 3: Inquiry Type */}
                <div className="support-form-group">
                  <label className="support-form-label" htmlFor="inquiryType">INQUIRY TYPE *</label>
                  <select
                    id="inquiryType"
                    name="inquiryType"
                    className="support-select"
                    value={formData.inquiryType}
                    onChange={(e) => {
                      handleChange(e);
                      setSelectedInquiryCard(e.target.value);
                    }}
                    required
                  >
                    <option value="Partnerships & Collaboration">Partnerships & Collaboration</option>
                    <option value="General Inquiries">General Inquiries</option>
                    <option value="Feedback & Suggestions">Feedback & Suggestions</option>
                    <option value="Institutional & Silo Operations">Institutional & Silo Operations</option>
                    <option value="Research & Agronomic Data">Research & Agronomic Data</option>
                  </select>
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
                    placeholder="Subject of your inquiry"
                    required
                  />
                </div>

                {/* Row 5: Message */}
                <div className="support-form-group">
                  <label className="support-form-label" htmlFor="message">MESSAGE *</label>
                  <textarea
                    id="message"
                    name="message"
                    className="support-textarea"
                    value={formData.message}
                    onChange={handleChange}
                    maxLength={1000}
                    placeholder="Tell us what you'd like to discuss..."
                    required
                  />
                  <div className="support-char-counter">
                    {formData.message.length} / 1000
                  </div>
                </div>

                {/* Checkbox Consent */}
                <div className="support-checkbox-group">
                  <input
                    type="checkbox"
                    id="consent"
                    name="consent"
                    className="support-checkbox"
                    checked={formData.consent}
                    onChange={handleChange}
                    required
                  />
                  <label htmlFor="consent" className="support-checkbox-label">
                    I understand that the information I provide will be used to respond to my inquiry.
                  </label>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  className="support-submit-btn"
                  disabled={submitting}
                >
                  <span>{submitting ? 'Sending Message...' : 'Send Message'}</span>
                  <ArrowRight size={15} />
                </button>

              </form>
            )}
          </div>

          {/* Right Contact Information Card */}
          <div className="support-info-col">
            <div className="support-info-card">
              <div className="support-section-header">
                <h3 className="support-section-title" style={{ fontSize: '18px' }}>Contact Information</h3>
                <p className="support-section-subtitle">
                  Use the details below for general GrainRise inquiries.
                </p>
              </div>

              <div className="support-info-list">
                {/* Email */}
                <div className="support-info-item">
                  <div className="support-info-item__icon">
                    <Mail size={18} />
                  </div>
                  <div className="support-info-item__content">
                    <span className="support-info-item__label">EMAIL</span>
                    <span className="support-info-item__value">[Official GrainRise Email]</span>
                    <span className="support-info-item__sub">For general inquiries and information.</span>
                  </div>
                </div>

                {/* Contact Number */}
                <div className="support-info-item">
                  <div className="support-info-item__icon">
                    <Phone size={18} />
                  </div>
                  <div className="support-info-item__content">
                    <span className="support-info-item__label">CONTACT NUMBER</span>
                    <span className="support-info-item__value">[Official Contact Number]</span>
                    <span className="support-info-item__sub">For available direct communication.</span>
                  </div>
                </div>

                {/* Location */}
                <div className="support-info-item">
                  <div className="support-info-item__icon">
                    <MapPin size={18} />
                  </div>
                  <div className="support-info-item__content">
                    <span className="support-info-item__label">LOCATION</span>
                    <span className="support-info-item__value">[Official GrainRise / Institution Location]</span>
                  </div>
                </div>

                {/* Availability */}
                <div className="support-info-item">
                  <div className="support-info-item__icon">
                    <Clock size={18} />
                  </div>
                  <div className="support-info-item__content">
                    <span className="support-info-item__label">AVAILABILITY</span>
                    <span className="support-info-item__value">Monday – Friday</span>
                    <span className="support-info-item__sub">[Official Business Hours]</span>
                  </div>
                </div>
              </div>
            </div>

            {/* General Inquiries Notice */}
            <div className="support-info-notice">
              <Info size={16} className="support-info-notice__icon" />
              <p className="support-info-notice__text">
                All general inquiries are queued during regular business days. For urgent verification or access requests, review our technical support channels below.
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* Technical Help Desk Banner */}
        <div className="support-tech-banner">
          <div className="support-tech-banner__left">
            <h3 className="support-tech-title">Looking for Technical Assistance?</h3>
            <p className="support-tech-desc">
              Contact Us is intended for general questions, partnerships, business inquiries, and feedback. If you are experiencing an account, registration, transaction, or technical issue, please use GrainRise Contact Support instead.
            </p>
          </div>
          <button
            className="support-tech-btn"
            onClick={() => navigate('/contact-support')}
          >
            <span>Go to Contact Support</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* What Happens Next? Section */}
        <AnimatedSection tag="section" className="support-section" animation="fade-up" delay={60}>
          <div className="support-section-header">
            <h2 className="support-section-title">What Happens Next?</h2>
            <p className="support-section-subtitle">
              Here's what happens after you send your message.
            </p>
          </div>

          <div className="support-steps-grid">
            {/* Step 01 */}
            <div className="support-step-card">
              <div className="support-step-header">
                <div className="support-step-num">01</div>
                <h3 className="support-step-title">Message Received</h3>
              </div>
              <p className="support-step-desc">
                Your inquiry is submitted to GrainRise and logged securely for team coordination.
              </p>
            </div>

            {/* Step 02 */}
            <div className="support-step-card">
              <div className="support-step-header">
                <div className="support-step-num">02</div>
                <h3 className="support-step-title">Inquiry Reviewed</h3>
              </div>
              <p className="support-step-desc">
                The details you provided are reviewed and directed to the appropriate contact or institutional officer.
              </p>
            </div>

            {/* Step 03 */}
            <div className="support-step-card">
              <div className="support-step-header">
                <div className="support-step-num">03</div>
                <h3 className="support-step-title">Response</h3>
              </div>
              <p className="support-step-desc">
                A response may be sent using the email or contact information you provided in the form.
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* Your Information Matters Notice */}
        <AnimatedSection className="support-security-banner" animation="fade-up" delay={80}>
          <div className="support-security-icon">
            <ShieldCheck size={20} />
          </div>
          <div className="support-security-content">
            <h3 className="support-security-title">Your Information Matters</h3>
            <p className="support-security-desc">
              Only provide information relevant to your inquiry. Never include passwords, verification codes, or other account credentials in this form.
            </p>
            <div className="support-security-bullets">
              <div className="support-security-bullet-item">
                <span className="support-security-bullet-dot" />
                <span>Never share your password.</span>
              </div>
              <div className="support-security-bullet-item">
                <span className="support-security-bullet-dot" />
                <span>Never share verification codes.</span>
              </div>
              <div className="support-security-bullet-item">
                <span className="support-security-bullet-dot" />
                <span>Only provide information related to your inquiry.</span>
              </div>
              <div className="support-security-bullet-item">
                <span className="support-security-bullet-dot" />
                <span>Use an email address you can access.</span>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Ready to Return? */}
        <AnimatedSection className="support-return-section" animation="fade-up" delay={100}>
          <h3 className="support-return-title">Ready to Return?</h3>
          <button className="support-return-btn" onClick={() => navigate('/')}>
            Back to GrainRise Home
          </button>
        </AnimatedSection>

      </div>

      {/* Reusable Footer */}
      <LandingFooter />
    </div>
  );
}
