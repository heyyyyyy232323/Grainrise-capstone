import React, { useEffect } from "react";
import { X, ShieldCheck } from "lucide-react";
import "./PrivacyModal.css";

export default function PrivacyModal({ isOpen, onClose }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="privacy-modal-overlay" onClick={onClose}>
      <div className="privacy-modal-container" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="privacy-modal-header">
          <div className="privacy-modal-header-top">
            <div className="privacy-modal-icon-wrap">
              <ShieldCheck size={20} className="privacy-modal-icon" />
            </div>
            <div className="privacy-modal-header-meta">
              <span className="privacy-modal-badge">DATA PROTECTION</span>
              <span className="privacy-modal-last-updated">Last Updated: [Month Day, Year]</span>
            </div>
            <button className="privacy-modal-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <h2 className="privacy-modal-title">Privacy Policy</h2>
          <p className="privacy-modal-subtitle">
            Learn how GrainRise collects, uses, protects, and manages information.
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="privacy-modal-body">

          {/* Section 1 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">1.&nbsp;&nbsp;PRIVACY COMMITMENT</h3>
            <p className="privacy-section-text">
              GrainRise respects the privacy of its users and is committed to handling personal and operational
              information responsibly. This Privacy Policy explains the types of information GrainRise may collect, why
              the information is used, and how it is protected.
            </p>
            <p className="privacy-section-text">
              GrainRise should process personal information in accordance with applicable Philippine data protection
              requirements, including the Data Privacy Act of 2012 (Republic Act No. 10173) and applicable
              regulations.
            </p>
          </div>

          {/* Section 2 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">2.&nbsp;&nbsp;INFORMATION WE MAY COLLECT</h3>
            <p className="privacy-section-text">
              Depending on the user's role and use of GrainRise, the system may collect information such as:
            </p>
            <div className="privacy-info-grid">
              <div className="privacy-info-box">
                <p className="privacy-info-box-title">PERSONAL INFORMATION</p>
                <ul className="privacy-info-list">
                  <li>Full name</li>
                  <li>Email address</li>
                  <li>Contact number</li>
                  <li>Address</li>
                  <li>Account credentials</li>
                  <li>Profile information</li>
                </ul>
              </div>
              <div className="privacy-info-box">
                <p className="privacy-info-box-title">REGISTRATION &amp; VERIFICATION</p>
                <ul className="privacy-info-list">
                  <li>Submitted registration details</li>
                  <li>Business information</li>
                  <li>Farm information</li>
                  <li>Warehouse information</li>
                  <li>Retail information</li>
                  <li>Supporting verification documents</li>
                </ul>
              </div>
              <div className="privacy-info-box">
                <p className="privacy-info-box-title">OPERATIONAL INFORMATION</p>
                <ul className="privacy-info-list">
                  <li>Inventory records &amp; products</li>
                  <li>Transactions, orders, purchases, sales</li>
                  <li>Contracts and procurement records</li>
                  <li>Delivery information</li>
                  <li>Returns, issues &amp; operational logs</li>
                </ul>
              </div>
              <div className="privacy-info-box">
                <p className="privacy-info-box-title">TECHNICAL INFORMATION</p>
                <ul className="privacy-info-list">
                  <li>Account activity logs</li>
                  <li>Login-related information</li>
                  <li>Device or browser information</li>
                  <li>Timestamps</li>
                  <li>System activity for security</li>
                </ul>
              </div>
            </div>
            <p className="privacy-section-note">
              GrainRise only collects information that is genuinely required for secure and authentic platform operation.
            </p>
          </div>

          {/* Section 3 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">3.&nbsp;&nbsp;HOW INFORMATION IS USED</h3>
            <p className="privacy-section-text">Information may be used to:</p>
            <div className="privacy-two-col-list">
              <ul className="privacy-list">
                <li>Create and manage user accounts</li>
                <li>Provide role-based system access</li>
                <li>Maintain inventory and supply chain records</li>
                <li>Provide notifications and system updates</li>
                <li>Provide customer or technical support</li>
                <li>Generate authorized operational reports and analytics</li>
              </ul>
              <ul className="privacy-list">
                <li>Verify registrations &amp; authenticate users</li>
                <li>Process transactions and operational activities</li>
                <li>Facilitate orders, contracts, procurement, and deliveries</li>
                <li>Improve system reliability and usability</li>
                <li>Maintain security and prevent unauthorized access</li>
                <li>Comply with applicable legal requirements</li>
              </ul>
            </div>
          </div>

          {/* Section 4 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">4.&nbsp;&nbsp;ROLE-BASED INFORMATION ACCESS</h3>
            <p className="privacy-section-text">
              Access to information within GrainRise is limited according to authorized user roles and system
              responsibilities. Users should only be able to access data necessary for their permitted functions.
            </p>
            <p className="privacy-section-text">
              Administrative users may have additional access when required for legitimate system administration,
              verification, security, support, or operational purposes.
            </p>
          </div>

          {/* Section 5 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">5.&nbsp;&nbsp;INFORMATION SHARING</h3>
            <p className="privacy-section-text privacy-bold-line">
              GrainRise does not sell personal information.
            </p>
            <p className="privacy-section-text">
              Information may be shared only when necessary for legitimate system operations, such as completing
              authorized transactions, coordinating supply chain activities, processing orders or deliveries, performing
              account verification, providing technical services required by the platform, or complying with applicable
              legal obligations. Only the information necessary for the relevant purpose should be shared.
            </p>
          </div>

          {/* Section 6 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">6.&nbsp;&nbsp;THIRD-PARTY SERVICES</h3>
            <p className="privacy-section-text">
              Some GrainRise features may rely on authorized third-party services for functions such as email
              delivery, mapping or location services, notifications, hosting or infrastructure, analytics, and other
              technical integrations. Where applicable, these services may process limited information necessary to
              provide their functionality.
            </p>
          </div>

          {/* Section 7 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">7.&nbsp;&nbsp;DATA SECURITY</h3>
            <p className="privacy-section-text">
              GrainRise uses reasonable technical and organizational safeguards designed to protect information
              against unauthorized access, improper disclosure, alteration, misuse, and accidental loss. Security
              measures may include authentication, access controls, secure account practices, and system
              monitoring.
            </p>
            <p className="privacy-section-note privacy-italic-note">
              However, no digital system can guarantee absolute security.
            </p>
          </div>

          {/* Section 8 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">8.&nbsp;&nbsp;PASSWORDS AND VERIFICATION CODES</h3>
            <p className="privacy-section-text">
              Users are responsible for keeping passwords and verification codes confidential. GrainRise Support will
              never request a user's password or verification code through ordinary support messages or forms. Users
              should immediately protect their account if they suspect unauthorized access.
            </p>
          </div>

          {/* Section 9 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">9.&nbsp;&nbsp;DATA RETENTION</h3>
            <p className="privacy-section-text">
              Information should be retained only for as long as reasonably necessary for legitimate system
              operations, transaction and operational records, security, administrative requirements, and legal or
              regulatory obligations where applicable.
            </p>
          </div>

          {/* Section 10 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">10.&nbsp;&nbsp;USER PRIVACY RIGHTS</h3>
            <p className="privacy-section-text">
              Subject to applicable law and system requirements, users may have rights regarding their personal
              information, including rights to be informed about data processing, access relevant personal information,
              request correction of inaccurate information, raise privacy concerns, and request appropriate action
              regarding personal information where permitted. Certain records may need to be retained when required
              for legitimate operational, security, contractual, or legal purposes.
            </p>
          </div>

          {/* Section 11 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">11.&nbsp;&nbsp;ACCURACY OF INFORMATION</h3>
            <p className="privacy-section-text">
              Users should provide accurate and current information. Where supported, users may update certain
              information through their account settings. Verified or sensitive information may require additional review
              before changes are applied.
            </p>
          </div>

          {/* Section 12 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">12.&nbsp;&nbsp;COOKIES AND TECHNICAL DATA</h3>
            <p className="privacy-section-text">
              GrainRise may use necessary technical data or similar technologies to support authentication, session
              management, security, platform functionality, and system performance.
            </p>
          </div>

          {/* Section 13 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">13.&nbsp;&nbsp;CHILDREN AND AUTHORIZED USERS</h3>
            <p className="privacy-section-text">
              GrainRise accounts should only be created by individuals who are permitted to use the platform and
              provide the required information.
            </p>
          </div>

          {/* Section 14 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">14.&nbsp;&nbsp;PRIVACY POLICY UPDATES</h3>
            <p className="privacy-section-text">
              This Privacy Policy may be updated when GrainRise features, data practices, system requirements, or
              applicable regulations change. Material updates should be communicated through appropriate GrainRise
              channels when necessary.
            </p>
          </div>

          {/* Section 15 */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">15.&nbsp;&nbsp;PRIVACY QUESTIONS</h3>
            <p className="privacy-section-text">
              For privacy-related questions or concerns, users may use GrainRise's official Contact Us or Contact
              Support channels.
            </p>
          </div>

          {/* Footer disclaimer */}
          <div className="privacy-footer-disclaimer">
            <p><em>Your privacy matters. Only provide information necessary for your use of GrainRise.</em></p>
          </div>

        </div>
      </div>
    </div>
  );
}
