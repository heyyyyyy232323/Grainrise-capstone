import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  FileText,
  UploadCloud,
  Lock,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertCircle,
  Building2,
  Warehouse,
  ShoppingBag,
  ClipboardCheck,
} from 'lucide-react';
import LandingFooter from '../Components/Major-Components/LandingFooter';
import LandingHeader from '../Components/Major-Components/LandingHeader';
import './SupportPages.css';

export default function RegistrationGuide() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const gettingStartedSteps = [
    {
      num: '01',
      title: 'Choose Your Role',
      desc: 'Select the GrainRise account that best represents your role in the rice supply chain.',
    },
    {
      num: '02',
      title: 'Create Your Account',
      desc: 'Provide your email address, contact number, username, and secure password.',
    },
    {
      num: '03',
      title: 'Verify Your Account',
      desc: 'Complete account verification using the code sent to your registered email.',
    },
    {
      num: '04',
      title: 'Complete Your Information',
      desc: 'Provide your personal details and any business, warehouse, or retail information required for your selected role.',
    },
    {
      num: '05',
      title: 'Review & Submit',
      desc: 'Check that your information is complete and accurate before submitting your registration.',
    },
    {
      num: '06',
      title: 'Wait for Account Review',
      desc: 'Your registration will be reviewed before your GrainRise account becomes available for normal access.',
    },
  ];

  const roles = [
    {
      id: 'miller',
      icon: <Building2 size={20} />,
      title: 'Miller',
      bestFor: 'Rice millers and suppliers involved in processing, sourcing, and distribution.',
      provide: [
        'Personal and contact information',
        'Business registration and name',
        'Facility location & operational details',
        'Required supporting or verification documents',
      ],
      access: 'Sourcing, procurement, inventory, contracts, orders, and distribution operations.',
    },
    {
      id: 'warehouse',
      icon: <Warehouse size={20} />,
      title: 'Warehouse Manager',
      bestFor: 'Organizations or managers responsible for rice storage and warehouse operations.',
      provide: [
        'Personal and contact information',
        'Warehouse or business information',
        'Facility location & storage capacity',
        'Operational licenses and verification documents',
      ],
      access: 'Warehouse operations, inventory, receiving, orders, logistics, and related management activities.',
    },
    {
      id: 'retailer',
      icon: <ShoppingBag size={20} />,
      title: 'Retailer',
      bestFor: 'Rice retailers purchasing products for resale to customers.',
      provide: [
        'Personal information',
        'Store contact details & business address',
        'Retail store or stall verification',
        'Business permits if applicable',
      ],
      access: 'Purchasing, orders, transactions, inventory, and retail operations.',
    },
  ];

  const prepareItems = [
    {
      icon: <Mail size={20} />,
      title: 'Active Email Address',
      desc: 'Your email may be used for account verification and important account updates.',
    },
    {
      icon: <FileText size={20} />,
      title: 'Accurate Information',
      desc: 'Make sure names, addresses, contact details, and business or facility information are correct.',
    },
    {
      icon: <UploadCloud size={20} />,
      title: 'Required Documents',
      desc: 'Some account types may require supporting documents for verification.',
    },
    {
      icon: <Lock size={20} />,
      title: 'Secure Password',
      desc: 'Create a strong password that you do not use for other accounts.',
    },
  ];

  const checklistLeft = [
    'Your email address is correct',
    'Your personal information matches your records',
    'Required fields are complete',
    'You selected the correct GrainRise role',
  ];

  const checklistRight = [
    'Your contact information is current',
    'Business or facility information is accurate',
    'Required documents are clear and valid',
  ];

  const stages = [
    {
      num: 'STAGE 01',
      title: 'Registration Submitted',
      desc: 'GrainRise receives the information provided during registration.',
    },
    {
      num: 'STAGE 02',
      title: 'Information Review',
      desc: 'Your submitted details and applicable verification information are reviewed.',
    },
    {
      num: 'STAGE 03',
      title: 'Account Decision',
      desc: 'Your registration may be approved or may require additional review.',
    },
    {
      num: 'STAGE 04',
      title: 'Account Activation',
      desc: 'Approved accounts are activated for the appropriate GrainRise role.',
    },
    {
      num: 'STAGE 05',
      title: 'Sign In to GrainRise',
      desc: 'Once your account is available, you can use your registered credentials to access GrainRise.',
    },
  ];

  const faqs = [
    {
      q: 'Can I register without an email address?',
      a: 'No. An active email address is required to create a GrainRise account. Your email is used for account verification, password recovery, and important notifications.',
    },
    {
      q: 'Why do some accounts require additional information?',
      a: 'Business and role-based accounts such as Cooperative Rice Millers, Warehouse Managers, and Retailers require additional verification to ensure compliance with GrainRise operational standards.',
    },
    {
      q: 'Can I submit incomplete information?',
      a: 'You may save partial progress, but your registration cannot be reviewed or approved until all required fields and documents are submitted.',
    },
    {
      q: "Why isn't my account immediately available after registration?",
      a: 'Accounts go through a review process to verify your information. This helps maintain the integrity and security of the GrainRise platform.',
    },
    {
      q: 'What if I entered incorrect information?',
      a: 'You can update some profile details after logging in. For critical information such as business registrations or facility permits, please contact the GrainRise support team.',
    },
    {
      q: 'Can I create multiple roles under one registration?',
      a: 'Each GrainRise account is tied to a single role. If you operate in multiple capacities, please contact support for guidance on managing multiple role accounts.',
    },
  ];

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
        <div className="support-hero-card">
          <div className="support-hero-content">
            <h1 className="support-hero-title">Registration Guide</h1>
            <p className="support-hero-desc">
              Learn how to create your GrainRise account, prepare the required information, and understand what happens after you submit your registration.
            </p>
            <button
              className="rg-hero-btn"
              onClick={() => navigate('/partner-with-us')}
            >
              <span>Partner With Us</span>
              <ArrowRight size={15} />
            </button>
          </div>
          <div className="rg-hero-visual">
            <div className="rg-hero-visual__card">
              <div className="rg-hero-visual__dot rg-hero-visual__dot--green" />
              <div className="rg-hero-visual__line" />
              <div className="rg-hero-visual__line rg-hero-visual__line--short" />
            </div>
            <div className="rg-hero-visual__card rg-hero-visual__card--bottom">
              <div className="rg-hero-visual__icon">
                <ClipboardCheck size={14} />
              </div>
              <div>
                <div className="rg-hero-visual__label">Verify</div>
                <div className="rg-hero-visual__sublabel">Check</div>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started with GrainRise is Simple â€” 6 steps */}
        <section className="support-section">
          <div className="support-section-header">
            <h2 className="support-section-title">Getting Started with GrainRise is Simple</h2>
            <p className="support-section-subtitle">
              Follow these steps to create and submit your account for review.
            </p>
          </div>

          <div className="rg-getting-started-grid">
            {gettingStartedSteps.map((step) => (
              <div key={step.num} className="rg-start-step">
                <div className="rg-start-step__num">{step.num}</div>
                <h3 className="rg-start-step__title">{step.title}</h3>
                <p className="rg-start-step__desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Which GrainRise Account Should You Choose? */}
        <div className="rg-roles-section">
          <div className="support-section-header" style={{ marginBottom: '24px' }}>
            <h2 className="support-section-title">Which GrainRise Account Should You Choose?</h2>
            <p className="support-section-subtitle">
              Each account provides features designed for a specific role in the rice supply chain.
            </p>
          </div>

          <div className="rg-roles-grid">
            {roles.map((role) => (
              <div key={role.id} className="rg-role-card">
                <div className="rg-role-card__header">
                  <div className="rg-role-card__icon">{role.icon}</div>
                </div>
                <h3 className="rg-role-card__title">{role.title}</h3>
                <p className="rg-role-card__best">
                  <strong>Best For:</strong> {role.bestFor}
                </p>
                <div className="rg-role-card__provide-label">YOU MAY BE ASKED TO PROVIDE:</div>
                <ul className="rg-role-card__provide-list">
                  {role.provide.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <p className="rg-role-card__access">
                  <strong>Access May Include:</strong> {role.access}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Prepare Before You Begin */}
        <div className="rg-prepare-banner">
          <h2 className="rg-prepare-banner__title">Prepare Before You Begin</h2>
          <p className="rg-prepare-banner__sub">
            Having the correct information ready can make registration faster and easier.
          </p>
          <div className="rg-prepare-grid">
            {prepareItems.map((item, i) => (
              <div key={i} className="rg-prepare-card">
                <div className="rg-prepare-card__icon">{item.icon}</div>
                <h4 className="rg-prepare-card__title">{item.title}</h4>
                <p className="rg-prepare-card__desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Check Your Registration Before Submitting */}
        <section className="support-section">
          <div className="support-section-header">
            <h2 className="support-section-title">Check Your Registration Before Submitting</h2>
            <p className="support-section-subtitle">
              Review your information carefully to avoid delays during account review.
            </p>
          </div>

          <div className="rg-checklist-grid">
            <div className="rg-checklist-col">
              {checklistLeft.map((item, i) => (
                <div key={i} className="rg-checklist-item">
                  <Check size={16} className="rg-checklist-item__icon" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="rg-checklist-col">
              {checklistRight.map((item, i) => (
                <div key={i} className="rg-checklist-item">
                  <Check size={16} className="rg-checklist-item__icon" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rg-checklist-note">
            <AlertCircle size={15} className="rg-checklist-note__icon" />
            <span>
              <strong>Note:</strong> Incorrect or incomplete information may delay the review and activation of your registration.
            </span>
          </div>
        </section>

        {/* What Happens After You Submit? */}
        <section className="support-section">
          <div className="support-section-header">
            <h2 className="support-section-title">What Happens After You Submit?</h2>
            <p className="support-section-subtitle">
              Your registration goes through a simple review process before account access becomes available.
            </p>
          </div>

          <div className="rg-stages-grid">
            {stages.map((stage, i) => (
              <div key={i} className="rg-stage-card">
                <div className="rg-stage-num">{stage.num}</div>
                <h4 className="rg-stage-title">{stage.title}</h4>
                <p className="rg-stage-desc">{stage.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Common Registration Questions */}
        <section className="support-section">
          <div className="support-section-header">
            <h2 className="support-section-title">Common Registration Questions</h2>
            <p className="support-section-subtitle">
              Quick answers to help you navigate the registration process.
            </p>
          </div>

          <div className="faq-accordion-list">
            {faqs.map((item, idx) => (
              <div key={idx} className={`faq-accordion-item ${openFaq === idx ? 'open' : ''}`}>
                <button
                  className="faq-accordion-btn"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <span>{item.q}</span>
                  {openFaq === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openFaq === idx && (
                  <div className="faq-accordion-content">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Protect Your Information Banner */}
        <div className="support-security-banner">
          <div className="support-security-icon">
            <ShieldCheck size={18} />
          </div>
          <div className="support-security-content">
            <h3 className="support-security-title">Protect Your Information</h3>
            <p className="support-security-desc">
              Only provide registration information through official GrainRise pages.
            </p>
            <div className="support-security-bullets">
              <div className="support-security-bullet-item">
                <span className="support-security-bullet-dot" />
                <span>Never share your password or verification code.</span>
              </div>
              <div className="support-security-bullet-item">
                <span className="support-security-bullet-dot" />
                <span>Make sure uploaded documents are clear and relevant.</span>
              </div>
              <div className="support-security-bullet-item">
                <span className="support-security-bullet-dot" />
                <span>Review your information before submitting.</span>
              </div>
              <div className="support-security-bullet-item">
                <span className="support-security-bullet-dot" />
                <span>Keep access to your registered email secure.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ready to Create Your Account? CTA */}
        <div className="rg-cta-box">
          <h2 className="rg-cta-box__title">Ready to Create Your Account?</h2>
          <p className="rg-cta-box__sub">
            Make sure you have the information required for your role, then begin your GrainRise registration.
          </p>
          <div className="rg-cta-box__actions">
            <button className="support-submit-btn" style={{ margin: 0 }} onClick={() => navigate('/partner-with-us')}>
              Go to Registration
            </button>
            <button className="support-back-link" style={{ fontSize: '13.5px' }} onClick={() => navigate('/')}>
              <ArrowLeft size={15} />
              <span>Back to GrainRise Home</span>
            </button>
          </div>
        </div>

      </div>

      <LandingFooter />
    </div>
  );
}

