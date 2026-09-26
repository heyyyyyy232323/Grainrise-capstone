import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle2 } from 'lucide-react';
import LandingFooter from '../Components/Major-Components/LandingFooter';
import shakehandsImg from '../assets/shakehands2.png';
import './PartnerWithUs.css';

export default function PartnerWithUs() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    contactNumber: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate inquiry submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        organization: '',
        contactNumber: '',
        message: ''
      });
    }, 1200);
  };

  return (
    <div className="pwu-page">
      {/* ── Top Sub-Navigation Bar ── */}
      <header className="pwu-topbar">
        <div className="pwu-topbar__inner">
          <button
            type="button"
            className="pwu-topbar__back-btn"
            onClick={() => navigate('/')}
            aria-label="Back to GrainRise Home"
          >
            <ArrowLeft size={16} strokeWidth={2} />
            <span>Back to GrainRise Home</span>
          </button>

          <div className="pwu-topbar__status">
            <span className="pwu-topbar__dot" />
            <span>Partnership Inquiry</span>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="pwu-main">
        <div className="pwu-content-wrap">
          {/* ── Top Hero Banner Card ── */}
          <section className="pwu-banner-card">
            <div className="pwu-banner__text">
              <div className="pwu-badge">Partnership</div>
              <h1 className="pwu-banner__headline">Partner With GrainRise</h1>
              <p className="pwu-banner__sub">
                Interested in connecting your organization with the GrainRise supply chain network? Send us your partnership details and our team will review your inquiry.
              </p>
            </div>

            <div className="pwu-banner__icon-box">
              <Users size={24} strokeWidth={1.8} />
            </div>
          </section>

          {/* ── Partnership Inquiry Form Card ── */}
          <section className="pwu-form-card">
            {success ? (
              <div className="pwu-success" style={{ gridColumn: '1 / -1' }}>
                <div className="pwu-success__icon">
                  <CheckCircle2 size={36} strokeWidth={2.2} />
                </div>
                <h2 className="pwu-success__title">Inquiry Submitted Successfully!</h2>
                <p className="pwu-success__desc">
                  Thank you for reaching out to GrainRise. Our team will review your partnership details and connect with you shortly.
                </p>
                <button
                  type="button"
                  className="pwu-success__btn"
                  onClick={() => setSuccess(false)}
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <>
                <div className="pwu-form-col">
                  <div className="pwu-form__header">
                    <h2 className="pwu-form__title">Partnership Inquiry</h2>
                    <p className="pwu-form__subtitle">
                      Provide the details below so the GrainRise team can review your partnership inquiry.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="pwu-form">
                    <div className="pwu-form__grid">
                      {/* Name */}
                      <div className="pwu-field">
                        <label className="pwu-field__label" htmlFor="name">
                          NAME <span className="pwu-field__required">*</span>
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          className="pwu-field__input"
                          placeholder="Enter your full name"
                          value={formData.name}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Email */}
                      <div className="pwu-field">
                        <label className="pwu-field__label" htmlFor="email">
                          EMAIL ADDRESS <span className="pwu-field__required">*</span>
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          className="pwu-field__input"
                          placeholder="Enter your email address"
                          value={formData.email}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Organization */}
                      <div className="pwu-field">
                        <label className="pwu-field__label" htmlFor="organization">
                          ORGANIZATION / COMPANY <span className="pwu-field__required">*</span>
                        </label>
                        <input
                          id="organization"
                          name="organization"
                          type="text"
                          required
                          className="pwu-field__input"
                          placeholder="Enter your organization or company name"
                          value={formData.organization}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Contact Number */}
                      <div className="pwu-field">
                        <label className="pwu-field__label" htmlFor="contactNumber">
                          CONTACT NUMBER <span className="pwu-field__required">*</span>
                        </label>
                        <input
                          id="contactNumber"
                          name="contactNumber"
                          type="tel"
                          required
                          className="pwu-field__input"
                          placeholder="Enter your contact number"
                          value={formData.contactNumber}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Message / Inquiry */}
                      <div className="pwu-field pwu-field--full">
                        <label className="pwu-field__label" htmlFor="message">
                          PARTNERSHIP INQUIRY / MESSAGE <span className="pwu-field__required">*</span>
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={4}
                          className="pwu-field__textarea"
                          placeholder="Tell us about your organization and how you would like to partner with GrainRise."
                          value={formData.message}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="pwu-form__action">
                      <button
                        type="submit"
                        className="pwu-submit-btn"
                        disabled={isSubmitting}
                      >
                        <span>{isSubmitting ? 'Submitting...' : 'Submit Partnership Inquiry'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Illustration Column */}
                <div className="pwu-illustration-wrap">
                  <img
                    src={shakehandsImg}
                    alt="Partner With GrainRise"
                    className="pwu-illustration"
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* ── Footer ── */}
      <LandingFooter />
    </div>
  );
}
