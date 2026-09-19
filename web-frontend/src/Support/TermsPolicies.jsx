import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  BookOpen,
  ShieldAlert,
  Users,
  CreditCard,
  AlertTriangle,
  Scale,
  RefreshCw,
  Mail,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import LandingFooter from '../Components/Major-Components/LandingFooter';
import LandingHeader from '../Components/Major-Components/LandingHeader';
import './SupportPages.css';

const SECTIONS = [
  {
    id: 'acceptance',
    icon: BookOpen,
    title: 'Acceptance of Terms',
    content: [
      {
        subtitle: 'Agreement to Terms',
        text: 'By accessing or using the GrainRise platform — including its web application, APIs, and related services — you confirm that you have read, understood, and agree to be bound by these Terms and Policies. If you do not agree, you must discontinue use of the platform immediately.',
      },
      {
        subtitle: 'Eligibility',
        text: 'GrainRise is intended for use by registered business entities and verified individuals operating within the Philippine rice supply chain, including farmers, millers, warehouses, retailers, and their authorized employees. Use by minors or unverified individuals is not permitted.',
      },
      {
        subtitle: 'Updates to Terms',
        text: 'GrainRise reserves the right to modify these Terms at any time. Changes will be communicated through the platform or via email. Continued use of GrainRise after any changes constitutes your acceptance of the updated Terms.',
      },
    ],
  },
  {
    id: 'accounts',
    icon: Users,
    title: 'Account Registration & Responsibilities',
    content: [
      {
        subtitle: 'Registration Requirements',
        text: 'To access GrainRise, you must create an account and provide accurate, current, and complete registration information. Accounts representing business entities must be registered by an authorized representative of that organization.',
      },
      {
        subtitle: 'Account Security',
        text: 'You are solely responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. You must immediately notify GrainRise of any unauthorized use of your account or any other security breach.',
      },
      {
        subtitle: 'Accurate Information',
        text: 'You agree not to misrepresent your identity, organizational affiliation, or role in the rice supply chain. Providing false information may result in immediate account suspension and reporting to relevant regulatory bodies.',
      },
      {
        subtitle: 'Account Termination',
        text: 'GrainRise reserves the right to suspend or terminate any account that violates these Terms, engages in fraudulent activity, or poses a risk to the platform or its users, with or without prior notice.',
      },
    ],
  },
  {
    id: 'use',
    icon: ShieldAlert,
    title: 'Acceptable Use Policy',
    content: [
      {
        subtitle: 'Permitted Use',
        text: 'GrainRise is provided exclusively for lawful rice supply chain operations including procurement, inventory management, logistics coordination, sales, financial reporting, and related business activities.',
      },
      {
        subtitle: 'Prohibited Conduct',
        text: 'You may not use GrainRise to: (a) engage in fraudulent transactions or falsify supply chain records; (b) attempt unauthorized access to restricted platform areas or other users\' accounts; (c) introduce malware or conduct cyberattacks; (d) violate Philippine laws including the Data Privacy Act, Electronic Commerce Act, or Revised Penal Code; (e) engage in price manipulation, hoarding, or activities that disrupt the rice supply chain.',
      },
      {
        subtitle: 'Data Integrity',
        text: 'Users are responsible for the accuracy of data entered into the platform. Deliberate falsification of inventory levels, delivery records, financial submissions, or any platform data is grounds for account termination and may constitute a criminal offense.',
      },
    ],
  },
  {
    id: 'transactions',
    icon: CreditCard,
    title: 'Transactions & Payments',
    content: [
      {
        subtitle: 'Transaction Records',
        text: 'GrainRise maintains records of all transactions processed through the platform. These records serve as the authoritative reference for supply chain activities and may be used for dispute resolution, audit, and regulatory compliance.',
      },
      {
        subtitle: 'Payment Processing',
        text: 'Payments processed through GrainRise are subject to the terms of our designated payment partners. GrainRise is not liable for delays, failures, or errors arising from payment gateway or banking system issues beyond our control.',
      },
      {
        subtitle: 'Reimbursements & Adjustments',
        text: 'Reimbursement requests submitted through the platform are subject to review and approval by authorized personnel within your organization. GrainRise does not independently approve or process reimbursements on behalf of any organization.',
      },
      {
        subtitle: 'Disputes',
        text: 'Transaction disputes must be raised within thirty (30) days of the transaction date. GrainRise will provide available platform logs and records to assist in dispute resolution but is not a party to commercial disputes between platform users.',
      },
    ],
  },
  {
    id: 'liability',
    icon: AlertTriangle,
    title: 'Limitation of Liability',
    content: [
      {
        subtitle: 'Platform Availability',
        text: 'GrainRise strives to maintain high platform availability but does not guarantee uninterrupted service. Scheduled maintenance, connectivity issues, or force majeure events may cause temporary service interruptions. GrainRise is not liable for losses arising from service downtime.',
      },
      {
        subtitle: 'Accuracy of Data',
        text: 'GrainRise provides tools for managing supply chain data but is not responsible for inaccuracies resulting from user input errors. Users are responsible for verifying the correctness of data entered into the system.',
      },
      {
        subtitle: 'Indirect Damages',
        text: 'To the maximum extent permitted by Philippine law, GrainRise shall not be liable for any indirect, incidental, consequential, or special damages arising from your use of or inability to use the platform, even if GrainRise has been advised of the possibility of such damages.',
      },
    ],
  },
  {
    id: 'ip',
    icon: Scale,
    title: 'Intellectual Property',
    content: [
      {
        subtitle: 'Platform Ownership',
        text: 'All elements of the GrainRise platform — including its software, design, trademarks, logos, interface layouts, and original content — are the exclusive intellectual property of GrainRise or its licensors and are protected by Philippine and international intellectual property laws.',
      },
      {
        subtitle: 'User Content',
        text: 'By submitting data, records, or content to GrainRise, you grant GrainRise a limited, non-exclusive license to use, store, and process such content solely for the purpose of operating and improving the platform.',
      },
      {
        subtitle: 'Restrictions',
        text: 'You may not copy, reproduce, modify, distribute, reverse-engineer, or create derivative works from any part of the GrainRise platform without prior written consent from GrainRise.',
      },
    ],
  },
  {
    id: 'governing',
    icon: RefreshCw,
    title: 'Governing Law & Dispute Resolution',
    content: [
      {
        subtitle: 'Applicable Law',
        text: 'These Terms and Policies shall be governed by and construed in accordance with the laws of the Republic of the Philippines, without regard to conflict of law provisions.',
      },
      {
        subtitle: 'Dispute Resolution',
        text: 'In the event of a dispute arising from these Terms, the parties agree to first attempt resolution through good-faith negotiation. If unresolved within thirty (30) days, disputes shall be submitted to the appropriate courts of the Philippines having jurisdiction over the matter.',
      },
    ],
  },
  {
    id: 'contact',
    icon: Mail,
    title: 'Contact & Legal Inquiries',
    content: [
      {
        subtitle: 'Legal Correspondence',
        text: 'For legal inquiries, terms-related questions, or formal notices, please contact our team at: legal@grainrise.ph. Include your full name, organization, contact number, and a detailed description of your inquiry.',
      },
      {
        subtitle: 'Regulatory Compliance',
        text: 'GrainRise operates in compliance with applicable Philippine laws including Republic Act No. 10173 (Data Privacy Act of 2012), Republic Act No. 8792 (Electronic Commerce Act), and other relevant regulations governing rice supply chain operations.',
      },
    ],
  },
];

export default function TermsPolicies() {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState('acceptance');

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
            <FileText size={13} />
            Legal
          </span>
        </div>

        {/* ── Header ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="legal-page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <FileText size={22} color="#065f46" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontWeight: 800, color: '#0f1f0f', letterSpacing: '-0.02em' }}>
                Terms &amp; Policies
              </h1>
              <p className="legal-page-date" style={{ margin: 0, fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                Effective date: January 1, 2026 &nbsp;·&nbsp; Last updated: September 19, 2026
              </p>
            </div>
          </div>

          <p className="legal-page-intro" style={{ fontSize: 14.5, color: '#374151', lineHeight: 1.75, marginTop: 8, padding: '16px 20px', background: '#f0fdf4', borderLeft: '4px solid #16a34a', borderRadius: '0 8px 8px 0' }}>
            These Terms and Policies govern your access to and use of the GrainRise rice supply chain management platform. Please read them carefully before using the platform. By creating an account or accessing GrainRise, you agree to be bound by these Terms.
          </p>
        </div>

        {/* ── Accordion Sections ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isOpen = openSection === section.id;
            return (
              <div
                key={section.id}
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
              </div>
            );
          })}
        </div>

        {/* ── Footer Note ── */}
        <p className="legal-page-note" style={{ fontSize: 12.5, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
          These Terms were last updated on September 19, 2026. For legal inquiries, contact{' '}
          <a href="mailto:legal@grainrise.ph" style={{ color: '#16a34a', fontWeight: 600 }}>legal@grainrise.ph</a>.
        </p>

      </main>

      <LandingFooter />
    </div>
  );
}

