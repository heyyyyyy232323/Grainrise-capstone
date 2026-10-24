import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Key,
  UserPlus,
  LayoutGrid,
  Receipt,
  HelpCircle,
} from 'lucide-react';
import LandingFooter from '../Components/Major-Components/LandingFooter';
import LandingHeader from '../Components/Major-Components/LandingHeader';
import AnimatedSection from './AnimatedSection';
import './SupportPages.css';

export default function FrequentlyAskedQuestions() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openItems, setOpenItems] = useState({ 'pop-1': true });

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'about', label: 'About GrainRise' },
    { id: 'account', label: 'Account & Login' },
    { id: 'registration', label: 'Registration' },
    { id: 'using', label: 'Using GrainRise' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'security', label: 'Security & Support' },
  ];

  const faqSections = [
    {
      id: 'about',
      title: 'Popular Questions',
      subtitle: 'Start with the questions GrainRise users commonly ask.',
      icon: null,
      items: [
        {
          id: 'pop-1',
          q: 'What is GrainRise?',
          a: 'GrainRise is a digital rice supply chain management platform that helps connect and support participants involved in milling, sourcing, warehousing, distribution, retail, and related transactions.',
        },
        {
          id: 'pop-2',
          q: 'Who can use GrainRise?',
          a: 'GrainRise is designed for rice millers, warehouse managers, and retailers participating in the rice supply chain.',
        },
        {
          id: 'pop-3',
          q: 'Is GrainRise free to use?',
          a: 'Basic registration and access to essential supply chain features are available for verified users. Specific advanced tools and operational features may depend on your account role.',
        },
        {
          id: 'pop-4',
          q: 'Can I access GrainRise on my phone?',
          a: 'Yes. GrainRise is designed to be fully responsive and works on modern mobile browsers as well as tablets and desktop computers.',
        },
      ],
    },
    {
      id: 'account',
      title: 'Account & Login',
      subtitle: null,
      icon: <Key size={18} className="faq-section-header-icon" />,
      items: [
        {
          id: 'acc-1',
          q: 'How do I log in to GrainRise?',
          a: 'Click "Sign In" on the GrainRise homepage or navigation bar, enter your registered email address or username and password, then proceed to your dashboard.',
        },
        {
          id: 'acc-2',
          q: 'What should I do if I forgot my password?',
          a: 'Use the "Forgot Password" link on the sign-in page to request a password reset link sent to your registered email address.',
        },
        {
          id: 'acc-3',
          q: "Why can't I log in after registering?",
          a: 'Some account types require verification or admin approval before full login access is activated. Please check your email for activation status or instructions.',
        },
        {
          id: 'acc-4',
          q: 'Why am I not receiving my verification code?',
          a: "Check your spam or junk folder. If it hasn't arrived within a few minutes, ensure your email address was entered correctly and request a new code.",
        },
        {
          id: 'acc-5',
          q: 'What happens if my account is inactive or deactivated?',
          a: 'If your account has been deactivated or flagged for inactivity, contact the GrainRise support team to verify your identity and restore access.',
        },
      ],
    },
    {
      id: 'registration',
      title: 'Registration',
      subtitle: null,
      icon: <UserPlus size={18} className="faq-section-header-icon" />,
      items: [
        {
          id: 'reg-1',
          q: 'How do I create a GrainRise account?',
          a: 'Click "Get Started" or "Register", select your role in the rice supply chain, fill out the required personal and business details, and submit your application.',
        },
        {
          id: 'reg-2',
          q: 'What user roles can register?',
          a: 'GrainRise supports Rice Millers, Warehouse Managers, and Retailers. Choose the role that reflects your primary business activity.',
        },
        {
          id: 'reg-3',
          q: 'What information do I need to register?',
          a: 'Depending on your role, you will need basic contact details, facility or business locations, identification documents (such as valid government ID), and business permits or operational licenses.',
        },
        {
          id: 'reg-4',
          q: 'Why does my registration need to be reviewed?',
          a: 'Reviewing registrations ensures platform security, authenticates supply chain participants, and maintains accurate operational records.',
        },
        {
          id: 'reg-5',
          q: 'How will I know when my account is approved?',
          a: 'You will receive an email confirmation once your documents and registration details have been verified by the GrainRise administration team.',
        },
      ],
    },
    {
      id: 'using',
      title: 'Using GrainRise',
      subtitle: null,
      icon: <LayoutGrid size={18} className="faq-section-header-icon" />,
      items: [
        {
          id: 'use-1',
          q: 'What features are available in GrainRise?',
          a: 'Features include production planning, inventory tracking, order management, grain batch traceability, warehouse intake/dispatch logging, and transaction reporting.',
        },
        {
          id: 'use-2',
          q: 'Why do different users see different features?',
          a: 'GrainRise provides a role-customized interface. Millers and warehouse managers see processing, storage, and inventory dashboards, while retailers see purchasing, catalog, and order management tools.',
        },
        {
          id: 'use-3',
          q: 'Can I change my role after creating an account?',
          a: 'Role assignments are tied to verified credentials. To change your role or add multiple facility permissions, please reach out to GrainRise support.',
        },
        {
          id: 'use-4',
          q: 'Can I update my account information?',
          a: 'Yes, basic profile details, passwords, and contact numbers can be updated from your account settings. Significant business details or permit changes require re-verification.',
        },
      ],
    },
    {
      id: 'transactions',
      title: 'Transactions',
      subtitle: null,
      icon: <Receipt size={18} className="faq-section-header-icon" />,
      items: [
        {
          id: 'tx-1',
          q: 'Where can I see my transaction records?',
          a: 'Navigate to the "Transactions" or "Orders" tab in your role dashboard to view complete history, order receipts, and payment status.',
        },
        {
          id: 'tx-2',
          q: 'Are completed transactions recorded automatically?',
          a: 'Yes. All confirmed purchases, shipments, contract fulfillments, and deliveries are automatically logged and timestamped on the system.',
        },
        {
          id: 'tx-3',
          q: 'Can I cancel or change a completed transaction?',
          a: 'Once a transaction is finalized and confirmed by both parties, modifications cannot be made directly. Please contact support or the counterparty for dispute resolution.',
        },
        {
          id: 'tx-4',
          q: 'How can I check an order or transaction status?',
          a: 'Click on any transaction item in your transaction list to view real-time stage updates such as Pending, In-Transit, Fulfilled, or Completed.',
        },
      ],
    },
    {
      id: 'security',
      title: 'Security & Support',
      subtitle: null,
      icon: <ShieldCheck size={18} className="faq-section-header-icon" />,
      items: [
        {
          id: 'sec-1',
          q: 'Will GrainRise ask for my password?',
          a: 'No. GrainRise staff and administrators will never ask for your password or verification codes via email, phone, or chat.',
        },
        {
          id: 'sec-2',
          q: 'What should I do if I notice suspicious account activity?',
          a: 'Immediately change your password and notify GrainRise support through the Contact Support page so our team can secure your account.',
        },
        {
          id: 'sec-3',
          q: 'What should I include when reporting a technical issue?',
          a: 'Include a brief description of the issue, what you were trying to do, error messages shown, your browser or device type, and screenshots if available.',
        },
        {
          id: 'sec-4',
          q: 'Where can I get additional help?',
          a: 'Visit our Contact Support page to submit a support ticket, or check our Registration Guide and User Documentation for more guides.',
        },
      ],
    },
  ];

  const toggleItem = (id) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filter sections based on category and search
  const visibleSections = faqSections
    .filter((sec) => activeCategory === 'all' || sec.id === activeCategory)
    .map((sec) => {
      if (!searchQuery.trim()) return sec;
      const q = searchQuery.toLowerCase();
      const filteredItems = sec.items.filter(
        (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      );
      return { ...sec, items: filteredItems };
    })
    .filter((sec) => sec.items.length > 0);

  const totalResults = visibleSections.reduce((acc, sec) => acc + sec.items.length, 0);

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

        {/* Centered Hero Section */}
        <AnimatedSection className="faq-hero-centered" animation="fade-up">
          <h1 className="faq-hero-title">Frequently Asked Questions</h1>
          <p className="faq-hero-desc">
            Find quick answers to common questions about GrainRise, account access,
            registration, system features, and transactions.
          </p>

          {/* Centered Search Bar */}
          <div className="faq-search-wrapper">
            <Search className="faq-search-icon" size={18} />
            <input
              type="text"
              className="faq-search-input"
              placeholder="Search for a question or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter Pills */}
          <div className="faq-pills-row">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`faq-pill-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </AnimatedSection>

        {/* Content Sections */}
        {visibleSections.length === 0 ? (
          <div className="faq-no-results">
            <HelpCircle size={40} color="#9ca3af" />
            <h3>No Matching Questions Found</h3>
            <p>
              We couldn't find an answer matching "{searchQuery}". Try searching with different keywords or contact our support desk.
            </p>
            <button
              className="support-submit-btn"
              style={{ margin: '0 auto' }}
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="faq-sections-container">
            {visibleSections.map((sec, idx) => (
              <AnimatedSection key={sec.id} tag="section" className="faq-group-section" animation="fade-up" delay={idx * 60}>
                <div className="faq-group-header">
                  {sec.icon && <div className="faq-group-header__icon">{sec.icon}</div>}
                  <div>
                    <h2 className="faq-group-title">{sec.title}</h2>
                    {sec.subtitle && (
                      <p className="faq-group-subtitle">{sec.subtitle}</p>
                    )}
                  </div>
                </div>

                <div className="faq-accordion-list">
                  {sec.items.map((item) => {
                    const isOpen = !!openItems[item.id];
                    return (
                      <div
                        key={item.id}
                        className={`faq-accordion-item ${isOpen ? 'open' : ''}`}
                      >
                        <button
                          className="faq-accordion-btn"
                          onClick={() => toggleItem(item.id)}
                          aria-expanded={isOpen}
                        >
                          <span>{item.q}</span>
                          <ChevronDown size={18} className="faq-accordion-chevron" />
                        </button>
                        <div className={`faq-accordion-collapse ${isOpen ? 'open' : ''}`}>
                          <div className="faq-accordion-inner">
                            <div className="faq-accordion-content">
                              {item.a}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AnimatedSection>
            ))}
          </div>
        )}

        {/* Can't Find Your Answer? CTA Box */}
        <AnimatedSection className="faq-cta-banner" animation="fade-up" delay={80}>
          <div className="faq-cta-icon-circle">
            <HelpCircle size={20} />
          </div>
          <h2 className="faq-cta-title">Can't Find Your Answer?</h2>
          <p className="faq-cta-desc">
            Explore the other GrainRise Help &amp; Support resources for additional account,
            registration, and technical assistance.
          </p>
          <div className="faq-cta-actions">
            <button
              className="faq-cta-btn-primary"
              onClick={() => navigate('/contact-support')}
            >
              Back to Help &amp; Support
            </button>
            <button
              className="faq-cta-btn-secondary"
              onClick={() => navigate('/')}
            >
              Back to GrainRise Home
            </button>
          </div>
        </AnimatedSection>
      </div>

      <LandingFooter />
    </div>
  );
}
