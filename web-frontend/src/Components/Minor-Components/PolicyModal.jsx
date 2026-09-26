import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, ShieldCheck,
  BookOpen, ShieldAlert, Users, CreditCard, AlertTriangle, Scale, RefreshCw, Mail,
  Eye, Database, Lock, UserCheck, Share2, Clock,
  CheckCircle2, ArrowDown, ChevronRight,
} from 'lucide-react';

/* ─── Terms sections ─── */
const TERMS_SECTIONS = [
  {
    icon: BookOpen, title: '1. Acceptance of Terms',
    items: [
      { subtitle: 'Agreement to Terms', text: 'By accessing or using the GrainRise platform — including its web application, APIs, and related services — you confirm that you have read, understood, and agree to be bound by these Terms and Policies. If you do not agree, you must discontinue use of the platform immediately.' },
      { subtitle: 'Eligibility', text: 'GrainRise is intended for use by registered business entities and verified individuals operating within the Philippine rice supply chain, including farmers, millers, warehouses, retailers, and their authorized employees. Use by minors or unverified individuals is not permitted.' },
      { subtitle: 'Updates to Terms', text: 'GrainRise reserves the right to modify these Terms at any time. Changes will be communicated through the platform or via email. Continued use of GrainRise after any changes constitutes your acceptance of the updated Terms.' },
    ],
  },
  {
    icon: Users, title: '2. Account Registration & Responsibilities',
    items: [
      { subtitle: 'Registration Requirements', text: 'To access GrainRise, you must create an account and provide accurate, current, and complete registration information. Accounts representing business entities must be registered by an authorized representative of that organization.' },
      { subtitle: 'Account Security', text: 'You are solely responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. You must immediately notify GrainRise of any unauthorized use of your account or any other security breach.' },
      { subtitle: 'Accurate Information', text: 'You agree not to misrepresent your identity, organizational affiliation, or role in the rice supply chain. Providing false information may result in immediate account suspension and reporting to relevant regulatory bodies.' },
      { subtitle: 'Account Termination', text: 'GrainRise reserves the right to suspend or terminate any account that violates these Terms, engages in fraudulent activity, or poses a risk to the platform or its users, with or without prior notice.' },
    ],
  },
  {
    icon: ShieldAlert, title: '3. Acceptable Use Policy',
    items: [
      { subtitle: 'Permitted Use', text: 'GrainRise is provided exclusively for lawful rice supply chain operations including procurement, inventory management, logistics coordination, sales, financial reporting, and related business activities.' },
      { subtitle: 'Prohibited Conduct', text: 'You may not use GrainRise to: (a) engage in fraudulent transactions or falsify supply chain records; (b) attempt unauthorized access to restricted platform areas or other users\' accounts; (c) introduce malware or conduct cyberattacks; (d) violate Philippine laws including the Data Privacy Act, Electronic Commerce Act, or Revised Penal Code; (e) engage in price manipulation, hoarding, or activities that disrupt the rice supply chain.' },
      { subtitle: 'Data Integrity', text: 'Users are responsible for the accuracy of data entered into the platform. Deliberate falsification of inventory levels, delivery records, financial submissions, or any platform data is grounds for account termination and may constitute a criminal offense.' },
    ],
  },
  {
    icon: CreditCard, title: '4. Transactions & Payments',
    items: [
      { subtitle: 'Transaction Records', text: 'GrainRise maintains records of all transactions processed through the platform. These records serve as the authoritative reference for supply chain activities and may be used for dispute resolution, audit, and regulatory compliance.' },
      { subtitle: 'Payment Processing', text: 'Payments processed through GrainRise are subject to the terms of our designated payment partners. GrainRise is not liable for delays, failures, or errors arising from payment gateway or banking system issues beyond our control.' },
      { subtitle: 'Reimbursements & Adjustments', text: 'Reimbursement requests submitted through the platform are subject to review and approval by authorized personnel within your organization. GrainRise does not independently approve or process reimbursements on behalf of any organization.' },
      { subtitle: 'Disputes', text: 'Transaction disputes must be raised within thirty (30) days of the transaction date. GrainRise will provide available platform logs and records to assist in dispute resolution but is not a party to commercial disputes between platform users.' },
    ],
  },
  {
    icon: AlertTriangle, title: '5. Limitation of Liability',
    items: [
      { subtitle: 'Platform Availability', text: 'GrainRise strives to maintain high platform availability but does not guarantee uninterrupted service. Scheduled maintenance, connectivity issues, or force majeure events may cause temporary service interruptions. GrainRise is not liable for losses arising from service downtime.' },
      { subtitle: 'Accuracy of Data', text: 'GrainRise provides tools for managing supply chain data but is not responsible for inaccuracies resulting from user input errors. Users are responsible for verifying the correctness of data entered into the system.' },
      { subtitle: 'Indirect Damages', text: 'To the maximum extent permitted by Philippine law, GrainRise shall not be liable for any indirect, incidental, consequential, or special damages arising from your use of or inability to use the platform, even if GrainRise has been advised of the possibility of such damages.' },
    ],
  },
  {
    icon: Scale, title: '6. Intellectual Property',
    items: [
      { subtitle: 'Platform Ownership', text: 'All elements of the GrainRise platform — including its software, design, trademarks, logos, interface layouts, and original content — are the exclusive intellectual property of GrainRise or its licensors and are protected by Philippine and international intellectual property laws.' },
      { subtitle: 'User Content', text: 'By submitting data, records, or content to GrainRise, you grant GrainRise a limited, non-exclusive license to use, store, and process such content solely for the purpose of operating and improving the platform.' },
      { subtitle: 'Restrictions', text: 'You may not copy, reproduce, modify, distribute, reverse-engineer, or create derivative works from any part of the GrainRise platform without prior written consent from GrainRise.' },
    ],
  },
  {
    icon: RefreshCw, title: '7. Governing Law & Dispute Resolution',
    items: [
      { subtitle: 'Applicable Law', text: 'These Terms and Policies shall be governed by and construed in accordance with the laws of the Republic of the Philippines, without regard to conflict of law provisions.' },
      { subtitle: 'Dispute Resolution', text: 'In the event of a dispute arising from these Terms, the parties agree to first attempt resolution through good-faith negotiation. If unresolved within thirty (30) days, disputes shall be submitted to the appropriate courts of the Philippines having jurisdiction over the matter.' },
    ],
  },
  {
    icon: Mail, title: '8. Contact & Legal Inquiries',
    items: [
      { subtitle: 'Legal Correspondence', text: 'For legal inquiries, terms-related questions, or formal notices, please contact our team at: legal@grainrise.ph. Include your full name, organization, contact number, and a detailed description of your inquiry.' },
      { subtitle: 'Regulatory Compliance', text: 'GrainRise operates in compliance with applicable Philippine laws including Republic Act No. 10173 (Data Privacy Act of 2012), Republic Act No. 8792 (Electronic Commerce Act), and other relevant regulations governing rice supply chain operations.' },
    ],
  },
];

/* ─── Privacy sections ─── */
const PRIVACY_SECTIONS = [
  {
    icon: Database, title: '1. Information We Collect',
    items: [
      { subtitle: 'Account & Registration Data', text: 'When you register on GrainRise, we collect your full name, email address, mobile number, business name, and government-issued identification numbers required for verification of your role in the rice supply chain.' },
      { subtitle: 'Operational & Transaction Data', text: 'We collect data generated through your use of the platform, including order records, delivery logs, inventory movements, payment transactions, reimbursement submissions, and point-of-sale entries.' },
      { subtitle: 'Usage & Device Data', text: 'We automatically collect technical information such as your IP address, browser type, device identifiers, pages visited, session duration, and error logs to maintain platform performance and security.' },
      { subtitle: 'Communications', text: 'Any messages submitted through the platform\'s messaging system, support request forms, or contact channels are stored to facilitate resolution and improve our service.' },
    ],
  },
  {
    icon: Eye, title: '2. How We Use Your Information',
    items: [
      { subtitle: 'Platform Operations', text: 'Your data is primarily used to operate, maintain, and improve GrainRise. This includes processing transactions, managing supply chain records, assigning delivery duties, and synchronizing inventory across your organization\'s nodes.' },
      { subtitle: 'Identity Verification', text: 'We use your registration information to verify your eligibility and role within the rice supply chain ecosystem, ensuring that access to specific modules and data is appropriately granted.' },
      { subtitle: 'Communications & Notifications', text: 'We may use your contact details to send operational notifications, account alerts, system updates, or responses to your support inquiries.' },
      { subtitle: 'Analytics & Improvement', text: 'Aggregated and anonymized usage data helps us understand how GrainRise is used, identify areas for improvement, and develop new features that better serve the rice supply chain community.' },
    ],
  },
  {
    icon: Share2, title: '3. Information Sharing & Disclosure',
    items: [
      { subtitle: 'Within Your Organization', text: 'Depending on your account role, certain operational data is visible to designated personnel within your affiliated organization.' },
      { subtitle: 'Service Providers', text: 'We may share data with trusted third-party service providers who assist in hosting, payment processing, or technical infrastructure. These providers are contractually bound to handle your data only for specified purposes.' },
      { subtitle: 'Legal Obligations', text: 'We may disclose your information when required by law, government regulation, court order, or to protect the rights, property, or safety of GrainRise, our users, or the public.' },
      { subtitle: 'No Sale of Personal Data', text: 'GrainRise does not sell, rent, or trade your personal information to third parties for marketing or commercial purposes.' },
    ],
  },
  {
    icon: Lock, title: '4. Data Security',
    items: [
      { subtitle: 'Security Measures', text: 'We implement industry-standard technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.' },
      { subtitle: 'Offline Caching', text: 'GrainRise uses local browser storage to cache transaction data during connectivity interruptions. Cached data is encrypted and synchronized with our centralized node once connectivity is restored.' },
      { subtitle: 'Your Responsibility', text: 'You are responsible for maintaining the confidentiality of your account credentials. Do not share your password with others.' },
    ],
  },
  {
    icon: UserCheck, title: '5. Your Rights & Choices',
    items: [
      { subtitle: 'Access & Correction', text: 'You have the right to access the personal information GrainRise holds about you and to request corrections if any data is inaccurate or incomplete.' },
      { subtitle: 'Data Deletion', text: 'You may request deletion of your personal data by contacting our support team. Certain data may be retained as required by law or legitimate business purposes.' },
      { subtitle: 'Withdrawal of Consent', text: 'Where processing is based on your consent, you may withdraw it at any time. Withdrawal does not affect the lawfulness of processing carried out before the withdrawal.' },
    ],
  },
  {
    icon: Clock, title: '6. Data Retention',
    items: [
      { subtitle: 'Retention Period', text: 'We retain your personal data for as long as your account is active or as needed to provide services. Transaction and operational records are retained for a minimum of five (5) years to comply with applicable Philippine financial and tax regulations.' },
      { subtitle: 'Account Deactivation', text: 'Upon account deactivation or termination, personal identifiers will be anonymized or deleted within a reasonable period, unless retention is required by law or contractual obligation.' },
    ],
  },
  {
    icon: Mail, title: '7. Contact Us About Privacy',
    items: [
      { subtitle: 'Data Privacy Officer', text: 'For any privacy-related questions, concerns, or requests, you may contact our Data Privacy Officer at: privacy@grainrise.ph. We will respond to your inquiry within fifteen (15) business days.' },
      { subtitle: 'Regulatory Authority', text: 'If you believe your data privacy rights have been violated, you have the right to file a complaint with the National Privacy Commission (NPC) of the Philippines at www.privacy.gov.ph.' },
    ],
  },
];

function PolicySection({ section }) {
  const Icon = section.icon;
  return (
    <div className="mb-4 bg-gray-50/80 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 rounded-xl p-4">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center shrink-0">
          <Icon size={13} className="text-[#00580C] dark:text-emerald-400" />
        </div>
        <h4 className="text-xs sm:text-[13px] font-bold text-gray-900 dark:text-white leading-tight">
          {section.title}
        </h4>
      </div>
      <div className="pl-8 flex flex-col gap-2.5">
        {section.items.map((item, i) => (
          <div key={i}>
            <p className="text-[11.5px] font-semibold text-[#00580C] dark:text-emerald-400 mb-0.5">
              {item.subtitle}
            </p>
            <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PolicyModal({ isOpen, onClose, onAgree }) {
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef(null);
  const termsSectionRef = useRef(null);
  const privacySectionRef = useRef(null);

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const totalScrollable = el.scrollHeight - el.clientHeight;
    if (totalScrollable <= 0) {
      setHasScrolledToBottom(true);
      setScrollProgress(100);
      return;
    }
    const current = el.scrollTop;
    const percentage = Math.min(100, Math.round((current / totalScrollable) * 100));
    setScrollProgress(percentage);

    if (totalScrollable - current <= 60) {
      setHasScrolledToBottom(true);
    }
  }, []);

  // Reset scroll and states on open
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      setScrollProgress(0);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = 0;
          handleScroll();
        }
      }, 50);
    }
  }, [isOpen, handleScroll]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll reliably without layout shift
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const scrollToSection = (targetRef) => {
    if (targetRef.current && scrollRef.current) {
      const top = targetRef.current.offsetTop - 12;
      scrollRef.current.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const handleScrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-5"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-[#0c1c12] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-white/10"
        style={{
          maxHeight: 'calc(100vh - 3.5rem)',
          height: '88vh',
        }}
      >

        {/* Reading Progress Indicator Bar */}
        <div className="w-full h-1 bg-gray-100 dark:bg-white/10 shrink-0">
          <div
            className="h-full bg-gradient-to-r from-[#00580C] to-emerald-400 transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0c1c12]/95 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-[#00580C] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Legal Agreement
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">v1.0 · 2026</span>
            </div>
            <h2 className="font-['Outfit'] text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1 leading-snug">
              Terms & Conditions and Privacy Policy
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-500 dark:text-gray-300 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Jump Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-2 bg-gray-50/80 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/10 shrink-0 text-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:inline">
              Jump to:
            </span>
            <button
              type="button"
              onClick={() => scrollToSection(termsSectionRef)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-medium bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-[#00580C] dark:hover:text-emerald-400 hover:border-emerald-300 transition-colors cursor-pointer"
            >
              <FileText size={12} className="text-[#00580C] dark:text-emerald-400" />
              <span>1. Terms & Conditions</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(privacySectionRef)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-medium bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-[#00580C] dark:hover:text-emerald-400 hover:border-emerald-300 transition-colors cursor-pointer"
            >
              <ShieldCheck size={12} className="text-[#00580C] dark:text-emerald-400" />
              <span>2. Privacy Policy</span>
            </button>
          </div>
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {scrollProgress}% read
          </span>
        </div>

        {/* Combined Single Scrollable Content Container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-5 space-y-6 text-gray-800 dark:text-gray-200"
          style={{ minHeight: 0, overflowY: 'auto' }}
        >
          {/* ════════ PART 1: TERMS AND CONDITIONS ════════ */}
          <div ref={termsSectionRef} className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-200 dark:border-white/10">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-[#00580C] dark:text-emerald-400">
                <FileText size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00580C] dark:text-emerald-400">
                  Part 1 of 2
                </span>
                <h3 className="font-['Outfit'] text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  Terms and Conditions
                </h3>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                These Terms and Policies govern your access to and use of the GrainRise rice supply chain management platform. Please read them thoroughly. By submitting inquiries or creating an account, you agree to be bound by these Terms.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {TERMS_SECTIONS.map((sec, idx) => (
                <PolicySection key={idx} section={sec} />
              ))}
            </div>
          </div>

          {/* ════════ TRANSITION DIVIDER ════════ */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t-2 border-dashed border-gray-200 dark:border-white/15" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-[#0c1c12] px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 rounded-full border border-gray-200 dark:border-white/10 flex items-center gap-1.5 shadow-xs">
                <ChevronRight size={13} className="text-[#00580C] dark:text-emerald-400" />
                Proceed to Privacy Policy Below
              </span>
            </div>
          </div>

          {/* ════════ PART 2: PRIVACY POLICY ════════ */}
          <div ref={privacySectionRef} className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-200 dark:border-white/10">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-[#00580C] dark:text-emerald-400">
                <ShieldCheck size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00580C] dark:text-emerald-400">
                  Part 2 of 2
                </span>
                <h3 className="font-['Outfit'] text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  Privacy Policy
                </h3>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                GrainRise is dedicated to protecting your privacy in compliance with Republic Act No. 10173 (Data Privacy Act of 2012). This section describes our practices regarding information collection, processing, and protection.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {PRIVACY_SECTIONS.map((sec, idx) => (
                <PolicySection key={idx} section={sec} />
              ))}
            </div>
          </div>

          {/* Bottom Confirmation Box */}
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-center space-y-1">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-1">
              <CheckCircle2 size={16} />
            </div>
            <p className="text-xs font-bold text-gray-900 dark:text-white">
              End of Platform Agreement
            </p>
            <p className="text-[11.5px] text-gray-600 dark:text-gray-300">
              You have reached the bottom. You may now click <strong>"I Agree"</strong> to confirm your agreement and proceed with your inquiry.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-gray-100 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/90 dark:bg-white/[0.03]">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 text-xs">
            {hasScrolledToBottom ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full text-[11px]">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Agreement fully reviewed
              </span>
            ) : (
              <button
                type="button"
                onClick={handleScrollToBottom}
                className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-2.5 py-1 rounded-full text-[11px] hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <ArrowDown size={12} className="animate-bounce" />
                <span>Scroll to bottom to enable "I Agree"</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!hasScrolledToBottom}
              onClick={() => {
                onAgree();
                onClose();
              }}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#00580C] hover:bg-[#014209] rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={14} />
              <span>I Agree</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
