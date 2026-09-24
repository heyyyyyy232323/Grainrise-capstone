import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Eye,
  Database,
  Lock,
  UserCheck,
  Share2,
  Clock,
  Mail,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import LandingFooter from '../Components/Major-Components/LandingFooter';
import LandingHeader from '../Components/Major-Components/LandingHeader';
import AnimatedSection from './AnimatedSection';
import './SupportPages.css';

const SECTIONS = [
  {
    id: 'collection',
    icon: Database,
    title: 'Information We Collect',
    content: [
      {
        subtitle: 'Account & Registration Data',
        text: 'When you register on GrainRise, we collect your full name, email address, mobile number, business name, and government-issued identification numbers (e.g., RSBSA certificate number, BIR 2303, or Mayor\'s Permit) required for verification of your role in the rice supply chain.',
      },
      {
        subtitle: 'Operational & Transaction Data',
        text: 'We collect data generated through your use of the platform, including order records, delivery logs, inventory movements, payment transactions, reimbursement submissions, and point-of-sale entries.',
      },
      {
        subtitle: 'Usage & Device Data',
        text: 'We automatically collect technical information such as your IP address, browser type, device identifiers, pages visited, session duration, and error logs to maintain platform performance and security.',
      },
      {
        subtitle: 'Communications',
        text: 'Any messages submitted through the platform\'s messaging system, support request forms, or contact channels are stored to facilitate resolution and improve our service.',
      },
    ],
  },
  {
    id: 'use',
    icon: Eye,
    title: 'How We Use Your Information',
    content: [
      {
        subtitle: 'Platform Operations',
        text: 'Your data is primarily used to operate, maintain, and improve GrainRise. This includes processing transactions, managing supply chain records, assigning delivery duties, and synchronizing inventory across your organization\'s nodes.',
      },
      {
        subtitle: 'Identity Verification',
        text: 'We use your registration information to verify your eligibility and role within the rice supply chain ecosystem, ensuring that access to specific modules and data is appropriately granted.',
      },
      {
        subtitle: 'Communications & Notifications',
        text: 'We may use your contact details to send operational notifications, account alerts, system updates, or responses to your support inquiries.',
      },
      {
        subtitle: 'Analytics & Improvement',
        text: 'Aggregated and anonymized usage data helps us understand how GrainRise is used, identify areas for improvement, and develop new features that better serve the rice supply chain community.',
      },
    ],
  },
  {
    id: 'sharing',
    icon: Share2,
    title: 'Information Sharing & Disclosure',
    content: [
      {
        subtitle: 'Within Your Organization',
        text: 'Depending on your account role, certain operational data (such as delivery assignments, inventory levels, and order statuses) is visible to designated personnel within your affiliated organization (e.g., warehouse managers, miller administrators, or logistics coordinators).',
      },
      {
        subtitle: 'Service Providers',
        text: 'We may share data with trusted third-party service providers who assist in hosting, payment processing, or technical infrastructure. These providers are contractually bound to handle your data only for specified purposes and in accordance with applicable data protection laws.',
      },
      {
        subtitle: 'Legal Obligations',
        text: 'We may disclose your information when required by law, government regulation, court order, or to protect the rights, property, or safety of GrainRise, our users, or the public.',
      },
      {
        subtitle: 'No Sale of Personal Data',
        text: 'GrainRise does not sell, rent, or trade your personal information to third parties for marketing or commercial purposes.',
      },
    ],
  },
  {
    id: 'security',
    icon: Lock,
    title: 'Data Security',
    content: [
      {
        subtitle: 'Security Measures',
        text: 'We implement industry-standard technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. This includes encryption of data in transit, role-based access controls, and regular security assessments.',
      },
      {
        subtitle: 'Offline Caching',
        text: 'GrainRise uses local browser storage to cache transaction data during connectivity interruptions. Cached data is encrypted and synchronized with our centralized node once connectivity is restored.',
      },
      {
        subtitle: 'Your Responsibility',
        text: 'You are responsible for maintaining the confidentiality of your account credentials. Do not share your password with others. If you suspect unauthorized access to your account, contact our support team immediately.',
      },
    ],
  },
  {
    id: 'rights',
    icon: UserCheck,
    title: 'Your Rights & Choices',
    content: [
      {
        subtitle: 'Access & Correction',
        text: 'You have the right to access the personal information GrainRise holds about you and to request corrections if any data is inaccurate or incomplete. You may update certain profile information directly within your account settings.',
      },
      {
        subtitle: 'Data Deletion',
        text: 'You may request deletion of your personal data by contacting our support team. Please note that certain data may be retained as required by law, audit obligations, or legitimate business purposes (such as transaction records required for financial reporting).',
      },
      {
        subtitle: 'Withdrawal of Consent',
        text: 'Where processing is based on your consent, you may withdraw it at any time. Withdrawal of consent does not affect the lawfulness of processing carried out before the withdrawal.',
      },
    ],
  },
  {
    id: 'retention',
    icon: Clock,
    title: 'Data Retention',
    content: [
      {
        subtitle: 'Retention Period',
        text: 'We retain your personal data for as long as your account is active or as needed to provide services. Transaction and operational records are retained for a minimum of five (5) years to comply with applicable Philippine financial and tax regulations.',
      },
      {
        subtitle: 'Account Deactivation',
        text: 'Upon account deactivation or termination, personal identifiers will be anonymized or deleted within a reasonable period, unless retention is required by law or contractual obligation.',
      },
    ],
  },
  {
    id: 'contact',
    icon: Mail,
    title: 'Contact Us About Privacy',
    content: [
      {
        subtitle: 'Data Privacy Officer',
        text: 'For any privacy-related questions, concerns, or requests, you may contact our Data Privacy Officer at: privacy@grainrise.ph. We will respond to your inquiry within fifteen (15) business days.',
      },
      {
        subtitle: 'Regulatory Authority',
        text: 'If you believe your data privacy rights have been violated and we have not adequately addressed your concern, you have the right to file a complaint with the National Privacy Commission (NPC) of the Philippines at www.privacy.gov.ph.',
      },
    ],
  },
];

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState('collection');

  const toggle = (id) => setOpenSection((prev) => (prev === id ? null : id));

  return (
    <div className="support-page-root legal-page-root">
      <LandingHeader />

      <main className="support-container" style={{ maxWidth: 1240 }}>

        {/* ── Back Nav ── */}
        <div className="support-top-nav">
          <button className="support-back-link" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Back
          </button>
          <span className="support-top-badge">
            <ShieldCheck size={13} />
            Legal
          </span>
        </div>

        {/* ── Header ── */}
        <AnimatedSection animation="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="legal-page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ShieldCheck size={22} color="#065f46" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontWeight: 800, color: '#0f1f0f', letterSpacing: '-0.02em' }}>
                Privacy Policy
              </h1>
              <p className="legal-page-date" style={{ margin: 0, fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                Effective date: January 1, 2026 &nbsp;·&nbsp; Last updated: September 19, 2026
              </p>
            </div>
          </div>

          <p className="legal-page-intro" style={{ fontSize: 14.5, color: '#374151', lineHeight: 1.75, marginTop: 8, padding: '16px 20px', background: '#f0fdf4', borderLeft: '4px solid #16a34a', borderRadius: '0 8px 8px 0' }}>
            GrainRise ("we", "our", or "us") is committed to protecting the privacy of individuals who use our rice supply chain management platform. This Privacy Policy explains what personal information we collect, how we use it, and the choices available to you. By using GrainRise, you agree to the practices described in this policy.
          </p>
        </AnimatedSection>

        {/* ── Accordion Sections ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SECTIONS.map((section, idx) => {
            const Icon = section.icon;
            const isOpen = openSection === section.id;
            return (
              <AnimatedSection
                key={section.id}
                animation="fade-up"
                delay={idx * 50}
                className="legal-section-card"
                style={{
                  border: isOpen ? '1.5px solid #16a34a' : '1.5px solid #e5e7eb',
                  borderRadius: 12,
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                  background: '#fff',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(section.id)}
                  className="legal-section-toggle"
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12, padding: '14px 20px', background: isOpen ? '#f0fdf4' : '#fff',
                    border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Icon size={18} color={isOpen ? '#16a34a' : '#6b7280'} />
                    <span className="legal-section-title" style={{ fontSize: 14.5, fontWeight: 700, color: isOpen ? '#14532d' : '#1f2937' }}>
                      {section.title}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp size={16} color="#16a34a" /> : <ChevronDown size={16} color="#9ca3af" />}
                </button>

                {isOpen && (
                  <div style={{ padding: '4px 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {section.content.map((item, idx) => (
                      <div key={idx}>
                        <p className="legal-section-subtitle" style={{ margin: '0 0 4px 0', fontSize: 13.5, fontWeight: 700, color: '#15803d' }}>
                          {item.subtitle}
                        </p>
                        <p className="legal-section-text" style={{ margin: 0, fontSize: 13.5, color: '#4b5563', lineHeight: 1.75 }}>
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </AnimatedSection>
            );
          })}
        </div>

        {/* ── Footer Note ── */}
        <AnimatedSection animation="fade-up" delay={100}>
          <p className="legal-page-note" style={{ fontSize: 12.5, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
            GrainRise reserves the right to update this Privacy Policy. Continued use of the platform after changes constitutes acceptance of the revised policy. For questions, email{' '}
            <a href="mailto:privacy@grainrise.ph" style={{ color: '#16a34a', fontWeight: 600 }}>privacy@grainrise.ph</a>.
          </p>
        </AnimatedSection>

      </main>

      <LandingFooter />
    </div>
  );
}

