import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ChevronUp,
  User,
  BookOpen,
  FileText,
  Wrench,
  Mail,
} from 'lucide-react';
import logoImg from '../../../assets/Logo.png';
import './AdminHelpCenter.css';


// ============================================================
// CONSTANTS
// ============================================================

const HELP_TOPICS = [
  {
    id: 'account-login',
    icon: <User size={22} className="ahc-topic-icon" />,
    title: 'Account & Login',
    description: 'Password, account access, profile, and security help.',
    linkLabel: 'View articles',
  },
  {
    id: 'using-grainrise',
    icon: <BookOpen size={22} className="ahc-topic-icon" />,
    title: 'Using GrainRise',
    description: 'Help with navigating and using the features available to your account.',
    linkLabel: 'View articles',
  },
  {
    id: 'transactions-records',
    icon: <FileText size={22} className="ahc-topic-icon" />,
    title: 'Transactions & Records',
    description: 'Help finding orders, transactions, history, and related records.',
    linkLabel: 'View articles',
  },
  {
    id: 'troubleshooting',
    icon: <Wrench size={22} className="ahc-topic-icon" />,
    title: 'Troubleshooting & Support',
    description: 'Help with loading problems, uploads, errors, and contacting support.',
    linkLabel: 'View articles',
  },
];

const FAQ_ITEMS = [
  {
    id: 'faq-1',
    question: 'How do I update my account information?',
    answer: 'Open My Account from the Account Center to update information available for your profile.',
  },
  {
    id: 'faq-2',
    question: 'What should I do if I forgot my password?',
    answer: 'Use the "Forgot Password" option on the login page to reset your password via your registered email address.',
  },
  {
    id: 'faq-3',
    question: "Why can't I access a certain feature?",
    answer: 'Feature access depends on your assigned role and permissions. Contact your administrator if you believe you should have access.',
  },
  {
    id: 'faq-4',
    question: 'Where can I find my orders or transaction records?',
    answer: 'Navigate to the relevant section (Orders, History, or Records) from your dashboard sidebar or top navigation.',
  },
  {
    id: 'faq-5',
    question: 'Why is my file upload not working?',
    answer: 'Ensure your file meets the required format and size limits. Try a different browser or clear your cache if the issue persists.',
  },
  {
    id: 'faq-6',
    question: 'What should I do if a page is not loading correctly?',
    answer: 'Refresh the page, clear your browser cache, or try opening the page in an incognito/private window. If the issue continues, contact GrainRise Support.',
  },
  {
    id: 'faq-7',
    question: 'How do I contact GrainRise Support?',
    answer: 'You can reach GrainRise Support by clicking "Contact Support" at the bottom of this page or navigating to the Contact Support section from the Help Center.',
  },
];


// ============================================================
// ADMIN HELP CENTER
// ============================================================

export default function AdminHelpCenter() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState('faq-1');

  const toggleFaq = (id) => {
    setOpenFaq(prev => (prev === id ? null : id));
  };

  const filteredFaqs = FAQ_ITEMS.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="ahc-root">

      {/* ── Simple Logo Header ─────────────────────────────── */}
      <header className="ahc-header">
        <div className="ahc-header-inner">
          <img
            src={logoImg}
            alt="GrainRise Logo"
            className="ahc-logo"
          />
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────── */}
      <main className="ahc-main">
        <div className="ahc-container">

          {/* Page Title */}
          <div className="ahc-page-title-section">
            <h1 className="ahc-page-title">Help Center</h1>
            <p className="ahc-page-subtitle">Find answers and support for using GrainRise.</p>
          </div>

          {/* Search Bar */}
          <div className="ahc-search-wrapper">
            <Search size={16} className="ahc-search-icon" />
            <input
              type="text"
              id="ahc-search-input"
              placeholder="Search for help or questions..."
              className="ahc-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Browse Help Topics */}
          <section className="ahc-section" aria-labelledby="ahc-topics-heading">
            <h2 id="ahc-topics-heading" className="ahc-section-title">Browse Help Topics</h2>
            <div className="ahc-topics-grid">
              {HELP_TOPICS.map(topic => (
                <div key={topic.id} className="ahc-topic-card" id={`ahc-topic-${topic.id}`}>
                  <div className="ahc-topic-icon-wrap">
                    {topic.icon}
                  </div>
                  <h3 className="ahc-topic-title">{topic.title}</h3>
                  <p className="ahc-topic-desc">{topic.description}</p>
                  <button
                    className="ahc-topic-link"
                    onClick={() => {}}
                    aria-label={`${topic.linkLabel} for ${topic.title}`}
                  >
                    {topic.linkLabel}
                    <span className="ahc-topic-link-arrow"> ›</span>
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Frequently Asked Questions */}
          <section className="ahc-section" aria-labelledby="ahc-faq-heading">
            <h2 id="ahc-faq-heading" className="ahc-section-title">Frequently Asked Questions</h2>
            <div className="ahc-faq-list">
              {filteredFaqs.map(item => (
                <div
                  key={item.id}
                  className={`ahc-faq-item${openFaq === item.id ? ' ahc-faq-item--open' : ''}`}
                  id={`ahc-faq-${item.id}`}
                >
                  <button
                    className="ahc-faq-question"
                    onClick={() => toggleFaq(item.id)}
                    aria-expanded={openFaq === item.id}
                    aria-controls={`ahc-faq-answer-${item.id}`}
                  >
                    <span className="ahc-faq-question-text">{item.question}</span>
                    {openFaq === item.id
                      ? <ChevronUp size={16} className="ahc-faq-chevron" />
                      : <ChevronDown size={16} className="ahc-faq-chevron" />
                    }
                  </button>
                  {openFaq === item.id && (
                    <div
                      className="ahc-faq-answer"
                      id={`ahc-faq-answer-${item.id}`}
                      role="region"
                    >
                      <p>{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Still Need Help Banner */}
          <div className="ahc-still-need-help">
            <div className="ahc-still-need-help-text">
              <h3 className="ahc-still-need-help-title">Still Need Help?</h3>
              <p className="ahc-still-need-help-desc">
                Contact GrainRise Support if you cannot find the answer you need.
              </p>
            </div>
            <button
              id="ahc-contact-support-btn"
              className="ahc-contact-support-btn"
              onClick={() => navigate('/contact-support')}
            >
              <Mail size={15} className="ahc-contact-support-icon" />
              Contact Support
            </button>
          </div>

        </div>
      </main>

      {/* ── Page Footer (copyright + policy links) ─────────── */}
      <footer className="ahc-page-footer">
        <div className="ahc-page-footer-inner">
          <span className="ahc-page-footer-copy">
            © 2026 GrainRise Agricultural Management System. All rights reserved.
          </span>
          <div className="ahc-page-footer-links">
            <button
              className="ahc-page-footer-link"
              onClick={() => navigate('/privacy-policy')}
            >
              Privacy Policy
            </button>
            <span className="ahc-page-footer-sep">|</span>
            <button
              className="ahc-page-footer-link"
              onClick={() => navigate('/terms-policies')}
            >
              Terms of Service
            </button>
            <span className="ahc-page-footer-sep ahc-page-footer-dot">·</span>
            <span className="ahc-status-indicator" aria-hidden="true" />
            <span className="ahc-status-label">System Status</span>
          </div>
        </div>
      </footer>

      {/* ── Admin Brand Footer ─────────────────────────────── */}
      <div className="ahc-brand-footer">
        <span className="ahc-brand-footer-copy">2026 GrainRise. All rights reserved.</span>
        <div className="ahc-brand-footer-links">
          <button
            className="ahc-brand-footer-link"
            onClick={() => navigate('/privacy-policy')}
          >
            Privacy Policy
          </button>
          <span className="ahc-brand-footer-sep">|</span>
          <button
            className="ahc-brand-footer-link"
            onClick={() => navigate('/terms-policies')}
          >
            Terms of Service
          </button>
          <span className="ahc-brand-footer-sep">|</span>
          <button
            className="ahc-brand-footer-link"
            onClick={() => navigate('/contact-support')}
          >
            Contact Support
          </button>
        </div>
      </div>

    </div>
  );
}
