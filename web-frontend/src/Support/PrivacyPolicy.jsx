import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Search,
  Printer,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Mail,
  Lock,
  Database,
  Users,
  Eye,
  Server,
  AlertCircle
} from 'lucide-react';
import LandingFooter from '../Components/Major-Components/LandingFooter';
import LandingHeader from '../Components/Major-Components/LandingHeader';
import AnimatedSection from './AnimatedSection';
import './SupportPages.css';

const PRIVACY_SECTIONS = [
  {
    id: 'commitment',
    number: '1',
    title: 'PRIVACY COMMITMENT',
    summary: 'Compliance with Philippine Data Privacy Act of 2012 (RA 10173)',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          GrainRise respects the privacy of its users and is committed to handling personal and operational information responsibly. This Privacy Policy explains the types of information GrainRise may collect, why the information is used, and how it is protected.
        </p>
        <p>
          GrainRise processes personal information in accordance with applicable Philippine data protection requirements, including the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and its implementing rules and regulations.
        </p>
      </div>
    ),
  },
  {
    id: 'collection',
    number: '2',
    title: 'INFORMATION WE MAY COLLECT',
    summary: 'Personal, registration, operational, and technical data categories',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Depending on the user's role and use of GrainRise, the system may collect information across four primary categories:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-3">
          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3.5">
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 tracking-wider uppercase mb-2">
              PERSONAL INFORMATION
            </p>
            <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <li>Full name &amp; legal identifier</li>
              <li>Email address</li>
              <li>Contact telephone / mobile number</li>
              <li>Physical / business address</li>
              <li>Account credentials</li>
              <li>Authorized profile information</li>
            </ul>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3.5">
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 tracking-wider uppercase mb-2">
              REGISTRATION &amp; VERIFICATION
            </p>
            <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <li>Submitted registration details</li>
              <li>Business permit &amp; organization details</li>
              <li>Farm / parcel information</li>
              <li>Warehouse capacity &amp; facility data</li>
              <li>Retail business information</li>
              <li>Supporting verification documents</li>
            </ul>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3.5">
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 tracking-wider uppercase mb-2">
              OPERATIONAL INFORMATION
            </p>
            <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <li>Inventory records &amp; grain varieties</li>
              <li>Transactions, purchases, orders &amp; sales</li>
              <li>Contracts and procurement records</li>
              <li>Delivery logs &amp; GPS route tracking</li>
              <li>Returns, audit logs &amp; discrepancy reports</li>
            </ul>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3.5">
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 tracking-wider uppercase mb-2">
              TECHNICAL INFORMATION
            </p>
            <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <li>Account activity &amp; audit logs</li>
              <li>Login timestamps &amp; IP address records</li>
              <li>Device model &amp; browser technical data</li>
              <li>Session security tokens</li>
              <li>System error diagnostics</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          GrainRise only collects information that is genuinely required for secure, authentic, and compliant platform operation.
        </p>
      </div>
    ),
  },
  {
    id: 'how-used',
    number: '3',
    title: 'HOW INFORMATION IS USED',
    summary: 'Operational management, verification, fulfillment, and security',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>Information collected may be used to:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            <li>Create and manage secure user accounts</li>
            <li>Provide role-based system access and modules</li>
            <li>Maintain inventory and rice supply chain records</li>
            <li>Provide operational alerts and status notifications</li>
            <li>Provide customer or technical support desk resolution</li>
            <li>Generate authorized operational reports and analytics</li>
          </ul>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            <li>Verify business registrations &amp; authenticate users</li>
            <li>Process transactions and operational supply records</li>
            <li>Facilitate orders, contracts, procurement, and deliveries</li>
            <li>Improve platform reliability, performance, and usability</li>
            <li>Maintain cybersecurity and prevent unauthorized access</li>
            <li>Comply with applicable legal and statutory requirements</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'role-access',
    number: '4',
    title: 'ROLE-BASED INFORMATION ACCESS',
    summary: 'Data isolation and strict access permissions by user role',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Access to information within GrainRise is limited according to authorized user roles and system responsibilities. Users are only granted access to data necessary for their permitted functions.
        </p>
        <p>
          Administrative users may have additional access when required for legitimate system administration, verification, security audits, support resolution, or operational continuity.
        </p>
      </div>
    ),
  },
  {
    id: 'sharing',
    number: '5',
    title: 'INFORMATION SHARING',
    summary: 'No sale of personal data; sharing strictly for authorized operations',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">
          GrainRise does not sell, trade, or monetize personal information.
        </div>
        <p>
          Information may be shared only when necessary for legitimate system operations, such as completing authorized transactions, coordinating supply chain handoffs, processing orders or deliveries, performing account verification, or complying with lawful government requests.
        </p>
      </div>
    ),
  },
  {
    id: 'third-party',
    number: '6',
    title: 'THIRD-PARTY SERVICES',
    summary: 'Trusted infrastructure, mapping, notification, and cloud providers',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Some GrainRise features may rely on authorized third-party services for essential functions such as email delivery, mapping and route display, push notifications, cloud hosting, and technical infrastructure.
        </p>
        <p>
          These providers are vetted and contractually required to handle information securely and exclusively for the specified technical functions.
        </p>
      </div>
    ),
  },
  {
    id: 'security',
    number: '7',
    title: 'DATA SECURITY',
    summary: 'Encryption, firewall protection, and organizational safeguards',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          GrainRise uses industry-recognized technical and organizational safeguards designed to protect information against unauthorized access, improper disclosure, alteration, misuse, and accidental loss. This includes secure socket layer encryption (HTTPS), hashed passwords, role firewalls, and restricted database access.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          While we implement rigorous security controls, no internet-connected digital system can guarantee absolute invulnerability.
        </p>
      </div>
    ),
  },
  {
    id: 'credentials',
    number: '8',
    title: 'PASSWORDS AND VERIFICATION CODES',
    summary: 'Confidentiality requirements and anti-phishing protection',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Users are responsible for keeping passwords and verification codes strictly confidential.
        </p>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
          <strong>Security Advisory:</strong> GrainRise Support personnel will never request your account password, PIN, or multi-factor verification code via chat, email, or telephone.
        </div>
      </div>
    ),
  },
  {
    id: 'retention',
    number: '9',
    title: 'DATA RETENTION',
    summary: 'Retention period aligned with legitimate operations and audit laws',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Information is retained only for as long as reasonably necessary for legitimate system operations, transaction and operational records, agricultural traceability, security auditing, and statutory administrative requirements.
        </p>
      </div>
    ),
  },
  {
    id: 'rights',
    number: '10',
    title: 'USER PRIVACY RIGHTS',
    summary: 'Rights under RA 10173: access, correction, objection, and erasure',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Subject to applicable Philippine law, users possess statutory rights regarding their personal information, including:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
          <li><strong>Right to be informed:</strong> Understanding how personal data is collected and processed</li>
          <li><strong>Right to access:</strong> Requesting confirmation and copy of personal data on file</li>
          <li><strong>Right to rectification:</strong> Correcting inaccurate or outdated data</li>
          <li><strong>Right to erasure or blocking:</strong> Requesting removal under lawful grounds</li>
          <li><strong>Right to damages:</strong> Seeking indemnification for due violations of privacy rights</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'accuracy',
    number: '11',
    title: 'ACCURACY OF INFORMATION',
    summary: 'User responsibility for keeping profile and operational data accurate',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Users are encouraged to maintain accurate, up-to-date account details. You can update your contact and business details directly via Account Settings or by contacting your administrator.
        </p>
      </div>
    ),
  },
  {
    id: 'cookies',
    number: '12',
    title: 'COOKIES AND TECHNICAL DATA',
    summary: 'Session tokens, security cookies, and local browser storage',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          GrainRise may use necessary technical data, secure local storage, and session tokens to support authentication, session management, theme preferences, security enforcement, and platform performance.
        </p>
      </div>
    ),
  },
  {
    id: 'updates',
    number: '13',
    title: 'PRIVACY POLICY UPDATES',
    summary: 'Periodic reviews and notification of substantive changes',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          This Privacy Policy may be updated periodically to reflect system enhancements, operational improvements, or modifications in statutory data protection standards.
        </p>
      </div>
    ),
  },
  {
    id: 'inquiries',
    number: '14',
    title: 'PRIVACY QUESTIONS & DATA PROTECTION DESK',
    summary: 'How to contact GrainRise privacy officer and support team',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          For privacy inquiries, requests regarding your personal information, or data protection concerns, please contact the GrainRise Data Protection team:
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          <Link
            to="/contact-support"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
          >
            <HelpCircle size={15} />
            Contact Support Desk
          </Link>
          <Link
            to="/contact-us"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors"
          >
            <Mail size={15} />
            Contact Us Page
          </Link>
        </div>
      </div>
    ),
  },
];

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [openSections, setOpenSections] = useState(() => {
    // Keep first 2 sections open by default
    return { commitment: true, collection: true };
  });

  const toggleSection = (id) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const all = {};
    PRIVACY_SECTIONS.forEach((s) => {
      all[s.id] = true;
    });
    setOpenSections(all);
  };

  const collapseAll = () => {
    setOpenSections({});
  };

  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return PRIVACY_SECTIONS;
    const q = searchTerm.toLowerCase();
    return PRIVACY_SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.number.includes(q)
    );
  }, [searchTerm]);

  return (
    <div className="support-page-root legal-page-root">
      <LandingHeader />

      <main className="support-container" style={{ maxWidth: 'min(1560px, 95vw)', width: '100%', margin: '0 auto', padding: '36px clamp(16px, 3.5vw, 48px) 80px' }}>

        {/* ── Top Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-200 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-0.5 uppercase">
              DATA PROTECTION
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Last Updated: September 2026
            </span>
          </div>
        </div>

        {/* ── Page Header ── */}
        <AnimatedSection animation="fade-up" className="mb-8">
          <div className="flex items-center gap-3.5 mb-3">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-['Outfit'] tracking-tight">
                Privacy Policy
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Learn how GrainRise collects, uses, protects, and manages information under Republic Act No. 10173
              </p>
            </div>
          </div>

          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 leading-relaxed shadow-xs">
            <p>
              GrainRise is committed to safeguarding the privacy and confidential operational records of all participating farmers, millers, warehouses, retailers, and supply chain partners. We process data strictly for authentic supply chain coordination and adhere to all provisions of the Data Privacy Act of 2012.
            </p>
          </div>
        </AnimatedSection>

        {/* ── Controls Toolbar ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search privacy topics (e.g. rights, cookies, collection)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              Collapse All
            </button>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-emerald-800 dark:text-emerald-300 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
              title="Print Policy"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>

        {/* ── 14 Structured Sections matching PrivacyModal ── */}
        <div className="flex flex-col gap-3.5">
          {filteredSections.map((section, idx) => {
            const isOpen = Boolean(openSections[section.id]);
            return (
              <AnimatedSection
                key={section.id}
                tag="div"
                animation="fade-up"
                delay={idx * 30}
                className="bg-white dark:bg-gray-900 border border-emerald-100 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-emerald-50/30 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100/70 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {section.number}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white tracking-wide uppercase">
                        {section.title}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {section.summary}
                      </p>
                    </div>
                  </div>

                  <div className="text-gray-400 dark:text-gray-500 shrink-0">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-6 pb-5 pt-1 border-t border-dashed border-emerald-100 dark:border-gray-800">
                    <div className="pt-3">
                      {section.content}
                    </div>
                  </div>
                )}
              </AnimatedSection>
            );
          })}
        </div>

        {/* ── Footer Acknowledgement Box ── */}
        <div className="mt-8 border border-dashed border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-5 text-center bg-emerald-50/40 dark:bg-emerald-950/20">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 italic">
            Your privacy matters. Only provide information necessary for your authorized use of GrainRise.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link
              to="/terms-and-conditions"
              className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <FileText size={14} />
              Read Terms &amp; Conditions
            </Link>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <Link
              to="/login"
              className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
            >
              Return to Login
            </Link>
          </div>
        </div>

      </main>

      <LandingFooter />
    </div>
  );
}
