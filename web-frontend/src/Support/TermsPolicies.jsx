import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  Search,
  Printer,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  HelpCircle,
  Mail,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import LandingFooter from '../Components/Major-Components/LandingFooter';
import LandingHeader from '../Components/Major-Components/LandingHeader';
import AnimatedSection from './AnimatedSection';
import './SupportPages.css';

const TERMS_SECTIONS = [
  {
    id: 'acceptance',
    number: '1',
    title: 'ACCEPTANCE OF TERMS',
    summary: 'Rules and conditions governing platform usage',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          By accessing or using GrainRise, you acknowledge that you have read and understood these Terms of Service and agree to comply with the rules and conditions applicable to your use of the platform.
        </p>
        <p>
          If you do not agree with these terms, you should not continue using GrainRise.
        </p>
      </div>
    ),
  },
  {
    id: 'about',
    number: '2',
    title: 'ABOUT GRAINRISE',
    summary: 'Digital rice supply chain management and core features',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          GrainRise is a digital rice supply chain management platform designed to support coordination and operations across participating stakeholders in the rice supply chain.
        </p>
        <p>
          Depending on the user's authorized role, GrainRise may provide access to functions such as:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3.5">
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-gray-800 dark:text-gray-200">
              <li>Inventory management</li>
              <li>Contracts &amp; Bidding</li>
              <li>Point of Sale (POS)</li>
              <li>Delivery and logistics coordination</li>
              <li>Communication and notifications</li>
            </ul>
          </div>
          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3.5">
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-gray-800 dark:text-gray-200">
              <li>Procurement and sourcing</li>
              <li>Orders and transaction records</li>
              <li>Warehouse operations &amp; stock movement</li>
              <li>Forecasting and decision-support tools</li>
              <li>Related operational and traceability records</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Available features may vary according to account role and authorization.
        </p>
      </div>
    ),
  },
  {
    id: 'registration',
    number: '3',
    title: 'ACCOUNT REGISTRATION AND ACCESS',
    summary: 'Information accuracy, credentials, and security obligations',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Users are responsible for providing accurate and current information when registering for GrainRise. Certain accounts may require verification or administrative review before access is activated.
        </p>
        <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl p-4 my-2">
          <p className="font-semibold text-gray-900 dark:text-white mb-2 text-xs sm:text-sm">
            Users are strictly responsible for:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            <li>Maintaining accurate and verified account information</li>
            <li>Protecting their login credentials and authentication devices</li>
            <li>Keeping passwords and verification codes strictly confidential</li>
            <li>Using only the individual account officially assigned to them</li>
            <li>Notifying GrainRise immediately when unauthorized account access is suspected</li>
          </ul>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3.5 text-xs sm:text-sm text-red-900 dark:text-red-200 flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-red-700 dark:text-red-300">Important Security Notice:</strong> Users must not share passwords or verification codes with another person under any circumstances.
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'role-access',
    number: '4',
    title: 'ROLE-BASED ACCESS',
    summary: 'Authorized responsibilities and access boundaries',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          GrainRise uses role-based access to provide users only with system features relevant to their authorized responsibilities within the supply chain.
        </p>
        <p>
          Users must not attempt to access restricted modules, bypass role permissions, view information belonging to unauthorized users, manipulate system permissions, or gain unauthorized administrative privileges.
        </p>
      </div>
    ),
  },
  {
    id: 'acceptable-use',
    number: '5',
    title: 'ACCEPTABLE USE',
    summary: 'Legitimate business purposes and platform guidelines',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Users agree to use GrainRise only for legitimate and authorized purposes. Users must adhere to all applicable platform policies, agricultural trade standards, and operational guidelines.
        </p>
      </div>
    ),
  },
  {
    id: 'user-info',
    number: '6',
    title: 'USER-PROVIDED INFORMATION',
    summary: 'Accuracy of documents, quantities, and transaction records',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Users are responsible for the accuracy of information, documents, quantities, prices, addresses, transaction details, and other records they submit through GrainRise. Users should carefully review information before confirming or submitting transactions.
        </p>
        <p>
          Some completed or verified records may not be directly editable and may require an appropriate correction, return, cancellation, or administrative review process.
        </p>
      </div>
    ),
  },
  {
    id: 'transactions',
    number: '7',
    title: 'TRANSACTIONS AND OPERATIONAL RECORDS',
    summary: 'Auditing, tracking, purchases, sales, and supply chain records',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Transactions completed through GrainRise may be recorded for operational, monitoring, reporting, and traceability purposes. Depending on the user role, records may include purchases, sales, procurement, inventory movements, contracts, deliveries, returns, payments, and other supply chain transactions.
        </p>
        <p>
          Users should verify all transaction details and confirmation prompts before completing an action.
        </p>
      </div>
    ),
  },
  {
    id: 'availability',
    number: '8',
    title: 'SYSTEM AVAILABILITY',
    summary: 'Platform uptime, maintenance, and technical interruptions',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          GrainRise aims to provide reliable access to its services. However, temporary interruptions may occur because of system maintenance, technical issues, internet connectivity, third-party service availability, security updates, or circumstances outside the platform's reasonable control.
        </p>
      </div>
    ),
  },
  {
    id: 'privacy',
    number: '9',
    title: 'DATA AND PRIVACY',
    summary: 'Processing in accordance with GrainRise Privacy Policy',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Personal and operational information processed through GrainRise is handled in accordance with the{' '}
          <Link to="/privacy-policy" className="text-emerald-700 dark:text-emerald-400 font-semibold underline">
            GrainRise Privacy Policy
          </Link>{' '}
          and applicable Philippine data protection requirements (Republic Act No. 10173).
        </p>
      </div>
    ),
  },
  {
    id: 'intellectual-property',
    number: '10',
    title: 'INTELLECTUAL PROPERTY',
    summary: 'Protection of GrainRise brand, interfaces, and proprietary software',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          The GrainRise name, visual identity, system interface, software components, original content, and other proprietary materials are protected by applicable intellectual property rights and laws.
        </p>
      </div>
    ),
  },
  {
    id: 'restriction',
    number: '11',
    title: 'ACCOUNT RESTRICTION OR DEACTIVATION',
    summary: 'Suspension or review of accounts for security and verification',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          GrainRise may restrict, deactivate, or review an account when necessary because of security concerns, suspected misuse, inaccurate or fraudulent information, violation of system rules, unauthorized activity, or administrative or verification requirements.
        </p>
      </div>
    ),
  },
  {
    id: 'limitation',
    number: '12',
    title: 'LIMITATION OF SERVICE',
    summary: 'Decision-support nature of analytics, recommendations, and forecasts',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          GrainRise provides digital tools to support rice supply chain operations and decision-making. Users remain responsible for reviewing information and making their own operational and business decisions.
        </p>
        <p>
          Forecasts, analytics, recommendations, and decision-support information should be treated as supporting insights and not as guaranteed market or climatic outcomes.
        </p>
      </div>
    ),
  },
  {
    id: 'changes',
    number: '13',
    title: 'CHANGES TO THESE TERMS',
    summary: 'Policy updates and system requirement changes',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          These Terms of Service may be updated when GrainRise services, system requirements, or applicable policies change. Continued use of the platform after updates constitutes agreement with the revised terms.
        </p>
      </div>
    ),
  },
  {
    id: 'contact',
    number: '14',
    title: 'CONTACT & SUPPORT',
    summary: 'Reaching official GrainRise support channels for terms inquiries',
    content: (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          For questions regarding these Terms of Service, users may contact GrainRise through official support channels:
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

export default function TermsPolicies() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [openSections, setOpenSections] = useState(() => {
    // Keep first 2 sections open by default
    return { acceptance: true, about: true };
  });

  const toggleSection = (id) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const all = {};
    TERMS_SECTIONS.forEach((s) => {
      all[s.id] = true;
    });
    setOpenSections(all);
  };

  const collapseAll = () => {
    setOpenSections({});
  };

  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return TERMS_SECTIONS;
    const q = searchTerm.toLowerCase();
    return TERMS_SECTIONS.filter(
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
              LEGAL DOCUMENT
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
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-['Outfit'] tracking-tight">
                Terms and Conditions
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Official Terms of Service governing access and operation of the GrainRise platform
              </p>
            </div>
          </div>

          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 leading-relaxed shadow-xs">
            <p>
              Please review the terms governing your access and use of GrainRise. By accessing or using the platform, registering an account, or interacting with our supply chain services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </AnimatedSection>

        {/* ── Controls Toolbar ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search sections (e.g. inventory, passwords)..."
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
              title="Print Terms"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>

        {/* ── 14 Structured Sections matching TermsModal ── */}
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
            By continuing to access or use GrainRise, you acknowledge and agree to these Terms of Service.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link
              to="/privacy-policy"
              className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <ShieldCheck size={14} />
              Read Privacy Policy
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
