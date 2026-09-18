import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  LogIn,
  Home,
  Key,
  Mail,
  Clock,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Link2,
  LogOut,
  MessageSquare,
  Sprout,
  Shield,
} from 'lucide-react';
import LandingFooter from '../Components/Major-Components/LandingFooter';
import './SupportPages.css';

export default function LoginAssistance() {
  const navigate = useNavigate();

  const commonIssues = [
    {
      icon: <Key size={18} />,
      title: 'Forgot Your Password?',
      desc: 'Use the Forgot Password option on the GrainRise login page. Enter your registered email address, verify the code sent to you, and create a new password.',
    },
    {
      icon: <Mail size={18} />,
      title: "Didn't Receive a Verification Code?",
      desc: 'Check your inbox and spam or junk folder. If the verification code has expired or has not arrived, request a new one and use the most recently issued code.',
    },
    {
      icon: <Clock size={18} />,
      title: "Registered but Can't Sign In?",
      desc: 'Your account may still be under review. Some GrainRise accounts must be approved and activated before system access becomes available.',
    },
    {
      icon: <AlertTriangle size={18} />,
      title: 'Account Inactive or Deactivated?',
      desc: 'Inactive or deactivated accounts may be restricted from signing in until their account status has been reviewed.',
    },
  ];

  const recoverySteps = [
    {
      stepNum: '01',
      stepLabel: 'STEP 1 OF 4',
      title: 'Enter Your Email',
      desc: 'Provide the email address registered with your GrainRise account.',
    },
    {
      stepNum: '02',
      stepLabel: 'STEP 2 OF 4',
      title: 'Verify Your Account',
      desc: 'Enter the verification code sent to your registered email.',
    },
    {
      stepNum: '03',
      stepLabel: 'STEP 3 OF 4',
      title: 'Create a New Password',
      desc: 'Choose and confirm a secure new password.',
    },
    {
      stepNum: '04',
      stepLabel: 'STEP 4 OF 4',
      title: 'Sign In Again',
      desc: 'Return to GrainRise and sign in using your new password.',
    },
  ];

  const quickSolutions = [
    {
      issue: "Email or password isn't accepted",
      solution:
        'Check your email or username and password for typing errors. Remember that passwords are case-sensitive.',
    },
    {
      issue: "Verification code didn't arrive",
      solution: 'Check your spam or junk folder and request another code if needed.',
    },
    {
      issue: 'Verification code expired',
      solution: 'Request a new verification code and use only the most recently issued code.',
    },
    {
      issue: "Newly registered account can't sign in",
      solution:
        'Your account may still be under review. Wait until the registration review and activation process is completed.',
    },
    {
      issue: 'Correct password but access is denied',
      solution: 'Your current account status may restrict access to GrainRise.',
    },
    {
      issue: 'No longer have access to the registered email',
      solution: 'Additional account assistance may be required to recover access.',
    },
  ];

  const accountStatuses = [
    {
      badge: 'Under Review',
      dotClass: 'status-dot--amber',
      badgeClass: 'status-badge--amber',
      desc: 'Your registration has been submitted and is still being reviewed.',
      subtext: 'Pending Approval',
    },
    {
      badge: 'Active',
      dotClass: 'status-dot--green',
      badgeClass: 'status-badge--green',
      desc: 'Your account is approved and available for normal GrainRise access.',
      subtext: 'Full Access',
    },
    {
      badge: 'Inactive',
      dotClass: 'status-dot--slate',
      badgeClass: 'status-badge--slate',
      desc: 'Your account currently has restricted access.',
      subtext: 'Restricted',
    },
    {
      badge: 'Deactivated',
      dotClass: 'status-dot--red',
      badgeClass: 'status-badge--red',
      desc: 'Your account access has been disabled.',
      subtext: 'Requires Resolution',
    },
    {
      badge: 'Archived',
      dotClass: 'status-dot--gray',
      badgeClass: 'status-badge--gray',
      desc: 'The account is no longer available for regular system access.',
      subtext: 'Closed Account',
    },
  ];

  return (
    <div className="support-page-root animate-page-fade">
      <div className="support-container">
        {/* Top Navigation */}
        <div className="support-top-nav">
          <button className="support-back-link" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
            <span>Back to GrainRise Home</span>
          </button>
          <div className="support-top-badge">
            <span className="support-top-badge__dot" />
            <span>Public Knowledge Base</span>
          </div>
        </div>

        {/* Hero Card Banner */}
        <div className="la-hero-card">
          <div className="la-hero-content">
            <span className="support-pill-tag">HELP &amp; SUPPORT</span>
            <h1 className="la-hero-title">Having Trouble Signing In?</h1>
            <p className="la-hero-desc">
              Get help recovering your GrainRise account and resolving common sign-in issues
              across our national agricultural exchange.
            </p>
            <div className="la-hero-actions">
              <button
                className="la-hero-btn-primary"
                onClick={() => navigate('/login')}
              >
                <LogIn size={15} />
                <span>Go to Login</span>
              </button>
              <button
                className="la-hero-btn-secondary"
                onClick={() => navigate('/')}
              >
                <Home size={15} />
                <span>Back to Home</span>
              </button>
            </div>
          </div>

          {/* Right Side Visual Box */}
          <div className="la-hero-visual-box">
            <div className="la-hero-shield-icon">
              <Shield className="la-hero-shield-bg" size={44} />
              <Sprout className="la-hero-sprout-icon" size={24} />
            </div>
            <div className="la-hero-visual-badge">
              <span className="la-hero-visual-dot" />
              <span>Secure Verification System</span>
            </div>
            <p className="la-hero-visual-sub">
              Certified National Agricultural Portal Protection
            </p>
          </div>
        </div>

        {/* Section 1: Common Login Issues */}
        <section className="support-section">
          <div className="support-section-header">
            <h2 className="support-section-title">Common Login Issues</h2>
            <p className="support-section-subtitle">
              Review the issue that best matches what you're experiencing.
            </p>
          </div>

          <div className="la-issues-grid">
            {commonIssues.map((issue, idx) => (
              <div key={idx} className="la-issue-card">
                <div className="la-issue-card__icon">{issue.icon}</div>
                <h3 className="la-issue-card__title">{issue.title}</h3>
                <p className="la-issue-card__desc">{issue.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Recover Your Account in a Few Steps */}
        <section className="support-section" style={{ textAlign: 'center', alignItems: 'center' }}>
          <span className="support-pill-tag" style={{ margin: '0 auto 8px auto' }}>
            PASSWORD RECOVERY
          </span>
          <h2 className="support-section-title" style={{ textAlign: 'center' }}>
            Recover Your Account in a Few Steps
          </h2>
          <p className="support-section-subtitle" style={{ textAlign: 'center', maxWidth: '540px' }}>
            Follow the standard GrainRise password recovery process to regain access to your account.
          </p>

          <div className="la-steps-grid">
            {recoverySteps.map((step, idx) => (
              <div key={idx} className="la-step-card">
                <div className="la-step-header">
                  <span className="la-step-num-badge">{step.stepNum}</span>
                  <span className="la-step-label">{step.stepLabel}</span>
                </div>
                <h3 className="la-step-title">{step.title}</h3>
                <p className="la-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>

          <p className="la-steps-footer-note">
            You need access to your registered email address to complete password recovery.
          </p>

          <button
            className="la-steps-cta-btn"
            onClick={() => navigate('/login')}
          >
            Go to Login
          </button>
        </section>

        {/* Section 3: Try These Quick Solutions */}
        <section className="support-section">
          <div className="support-section-header">
            <h2 className="support-section-title">Try These Quick Solutions</h2>
            <p className="support-section-subtitle">
              Use these simple checks if you're still having trouble signing in.
            </p>
          </div>

          <div className="la-solutions-card">
            {quickSolutions.map((item, idx) => (
              <div key={idx} className="la-solution-row">
                <div className="la-solution-issue">
                  <span className="la-solution-dot" />
                  <span>{item.issue}</span>
                </div>
                <div className="la-solution-desc">{item.solution}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Why Your Account Status Matters */}
        <section className="support-section">
          <div className="support-section-header">
            <h2 className="support-section-title">Why Your Account Status Matters</h2>
            <p className="support-section-subtitle">
              Your current account status may determine whether you can sign in to GrainRise.
            </p>
          </div>

          <div className="la-status-grid">
            {accountStatuses.map((st, idx) => (
              <div key={idx} className="la-status-card">
                <div className={`la-status-badge ${st.badgeClass}`}>
                  <span className={`la-status-dot ${st.dotClass}`} />
                  <span>{st.badge}</span>
                </div>
                <p className="la-status-desc">{st.desc}</p>
                <div className="la-status-subtext">{st.subtext}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Keep Your GrainRise Account Secure */}
        <div className="la-security-banner">
          <div className="la-security-banner__header">
            <div className="la-security-banner__icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="la-security-banner__title">
                Keep Your GrainRise Account Secure
              </h3>
              <p className="la-security-banner__sub">
                <strong>Important:</strong> GrainRise will never ask you to share your password or
                verification code through email, chat, phone, or any support channel.
              </p>
            </div>
          </div>

          <div className="la-security-tiles-grid">
            <div className="la-security-tile">
              <Key size={16} className="la-security-tile__icon" />
              <span>Never share your password with anyone or store it in plain text.</span>
            </div>
            <div className="la-security-tile">
              <CheckCircle2 size={16} className="la-security-tile__icon" />
              <span>Keep verification codes private; they expire automatically after issue.</span>
            </div>
            <div className="la-security-tile">
              <Link2 size={16} className="la-security-tile__icon" />
              <span>Use only official GrainRise pages and check the browser address bar.</span>
            </div>
            <div className="la-security-tile">
              <LogOut size={16} className="la-security-tile__icon" />
              <span>Sign out when using a shared or public device or terminal.</span>
            </div>
          </div>
        </div>

        {/* Section 6: Still Having Trouble? CTA Box */}
        <div className="la-cta-banner">
          <div className="la-cta-icon-circle">
            <MessageSquare size={18} />
          </div>
          <h2 className="la-cta-title">Still Having Trouble?</h2>
          <p className="la-cta-desc">
            If your issue remains unresolved, return to the GrainRise Help &amp; Support section
            to explore additional assistance options.
          </p>
          <div className="la-cta-actions">
            <button
              className="la-cta-btn-primary"
              onClick={() => navigate('/contact-support')}
            >
              Back to Help &amp; Support
            </button>
            <button
              className="la-cta-btn-secondary"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
