import React, { useEffect } from "react";
import { X, FileText } from "lucide-react";
import "./TermsModal.css";

export default function TermsModal({ isOpen, onClose }) {
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
    <div className="terms-modal-overlay" onClick={onClose}>
      <div
        className="terms-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="terms-modal-header">
          <div className="terms-modal-header-top">
            <div className="terms-modal-icon-wrap">
              <FileText size={20} className="terms-modal-icon" />
            </div>
            <div className="terms-modal-header-meta">
              <span className="terms-modal-badge">LEGAL</span>
              <span className="terms-modal-last-updated">
                Last Updated: [Month Day, Year]
              </span>
            </div>
            <button
              className="terms-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <h2 className="terms-modal-title">Terms of Service</h2>
          <p className="terms-modal-subtitle">
            Please review the terms governing your access and use of GrainRise.
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="terms-modal-body">

          {/* Section 1 */}
          <div className="terms-section">
            <h3 className="terms-section-title">1.&nbsp;&nbsp;ACCEPTANCE OF TERMS</h3>
            <p className="terms-section-text">
              By accessing or using GrainRise, you acknowledge that you have read and understood these Terms
              of Service and agree to comply with the rules and conditions applicable to your use of the platform.
            </p>
            <p className="terms-section-text">
              If you do not agree with these terms, you should not continue using GrainRise.
            </p>
          </div>

          {/* Section 2 */}
          <div className="terms-section">
            <h3 className="terms-section-title">2.&nbsp;&nbsp;ABOUT GRAINRISE</h3>
            <p className="terms-section-text">
              GrainRise is a digital rice supply chain management platform designed to support coordination and
              operations across participating stakeholders in the rice supply chain.
            </p>
            <p className="terms-section-text">
              Depending on the user's authorized role, GrainRise may provide access to functions such as:
            </p>
            <div className="terms-two-col-list">
              <ul className="terms-list">
                <li>Inventory management</li>
                <li>Contracts</li>
                <li>Point of Sale</li>
                <li>Delivery and logistics</li>
                <li>Communication and notifications</li>
              </ul>
              <ul className="terms-list">
                <li>Procurement and sourcing</li>
                <li>Orders and transactions</li>
                <li>Warehouse operations</li>
                <li>Forecasting and decision-support tools</li>
                <li>Related operational records</li>
              </ul>
            </div>
            <p className="terms-section-note">
              Available features may vary according to account role and authorization.
            </p>
          </div>

          {/* Section 3 */}
          <div className="terms-section">
            <h3 className="terms-section-title">3.&nbsp;&nbsp;ACCOUNT REGISTRATION AND ACCESS</h3>
            <p className="terms-section-text">
              Users are responsible for providing accurate and current information when registering for GrainRise.
              Certain accounts may require verification or administrative review before access is activated.
            </p>
            <div className="terms-responsibility-box">
              <p className="terms-responsibility-label">Users are responsible for:</p>
              <ul className="terms-list terms-list-inside">
                <li>Maintaining accurate account information</li>
                <li>Protecting their login credentials</li>
                <li>Keeping passwords and verification codes confidential</li>
                <li>Using only the account assigned to them</li>
                <li>Notifying GrainRise when unauthorized account access is suspected</li>
              </ul>
            </div>
            <div className="terms-important-box">
              <p>
                <strong>Important:</strong> Users must not share passwords or verification codes with another person.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="terms-section">
            <h3 className="terms-section-title">4.&nbsp;&nbsp;ROLE-BASED ACCESS</h3>
            <p className="terms-section-text">
              GrainRise uses role-based access to provide users only with system features relevant to their authorized
              responsibilities.
            </p>
            <p className="terms-section-text">
              Users must not attempt to access restricted modules, bypass role permissions, view information
              belonging to unauthorized users, manipulate permissions, or gain unauthorized administrative access.
            </p>
          </div>

          {/* Section 5 */}
          <div className="terms-section">
            <h3 className="terms-section-title">5.&nbsp;&nbsp;ACCEPTABLE USE</h3>
            <p className="terms-section-text">
              Users agree to use GrainRise only for legitimate and authorized purposes. Users must not:
            </p>
          </div>

          {/* Section 6 */}
          <div className="terms-section">
            <h3 className="terms-section-title">6.&nbsp;&nbsp;USER-PROVIDED INFORMATION</h3>
            <p className="terms-section-text">
              Users are responsible for the accuracy of information, documents, quantities, prices, addresses,
              transaction details, and other records they submit through GrainRise. Users should review information
              before confirming or submitting transactions.
            </p>
            <p className="terms-section-text">
              Some completed or verified records may not be directly editable and may require an appropriate
              correction, return, cancellation, or administrative process.
            </p>
          </div>

          {/* Section 7 */}
          <div className="terms-section">
            <h3 className="terms-section-title">7.&nbsp;&nbsp;TRANSACTIONS AND OPERATIONAL RECORDS</h3>
            <p className="terms-section-text">
              Transactions completed through GrainRise may be recorded for operational, monitoring, reporting, and
              traceability purposes. Depending on the user role, records may include purchases, sales, procurement,
              inventory movements, contracts, deliveries, returns, payments, and other supply chain transactions.
            </p>
            <p className="terms-section-text">
              Users should verify transaction details before completing an action.
            </p>
          </div>

          {/* Section 8 */}
          <div className="terms-section">
            <h3 className="terms-section-title">8.&nbsp;&nbsp;SYSTEM AVAILABILITY</h3>
            <p className="terms-section-text">
              GrainRise aims to provide reliable access to its services. However, temporary interruptions may occur
              because of system maintenance, technical issues, internet connectivity, third-party service availability,
              security updates, or circumstances outside the platform's reasonable control. Some features may
              temporarily become unavailable during these events.
            </p>
          </div>

          {/* Section 9 */}
          <div className="terms-section">
            <h3 className="terms-section-title">9.&nbsp;&nbsp;DATA AND PRIVACY</h3>
            <p className="terms-section-text">
              Personal and operational information processed through GrainRise is handled in accordance with the
              GrainRise Privacy Policy and applicable data protection requirements. For details about information
              collection, use, storage, and protection, users should review the Privacy Policy accessible from the Login
              page.
            </p>
          </div>

          {/* Section 10 */}
          <div className="terms-section">
            <h3 className="terms-section-title">10.&nbsp;&nbsp;INTELLECTUAL PROPERTY</h3>
            <p className="terms-section-text">
              The GrainRise name, visual identity, system interface, software components, original content, and other
              proprietary materials are protected by applicable intellectual property rights. Users may not copy,
              distribute, modify, reproduce, or misuse protected GrainRise materials without appropriate authorization.
            </p>
          </div>

          {/* Section 11 */}
          <div className="terms-section">
            <h3 className="terms-section-title">11.&nbsp;&nbsp;ACCOUNT RESTRICTION OR DEACTIVATION</h3>
            <p className="terms-section-text">
              GrainRise may restrict, deactivate, or review an account when necessary because of security concerns,
              suspected misuse, inaccurate or fraudulent information, violation of system rules, unauthorized activity,
              or administrative or verification requirements. Appropriate review procedures may apply depending on
              the situation.
            </p>
          </div>

          {/* Section 12 */}
          <div className="terms-section">
            <h3 className="terms-section-title">12.&nbsp;&nbsp;LIMITATION OF SERVICE</h3>
            <p className="terms-section-text">
              GrainRise provides digital tools to support rice supply chain operations and decision-making. Users
              remain responsible for reviewing information and making their own operational and business decisions.
            </p>
            <p className="terms-section-text">
              Forecasts, analytics, recommendations, and decision-support information should be treated as
              supporting information and not as guaranteed outcomes.
            </p>
          </div>

          {/* Section 13 */}
          <div className="terms-section">
            <h3 className="terms-section-title">13.&nbsp;&nbsp;CHANGES TO THESE TERMS</h3>
            <p className="terms-section-text">
              These Terms of Service may be updated when GrainRise services, system requirements, or applicable
              policies change. Material updates should be communicated through appropriate GrainRise channels
              when necessary.
            </p>
          </div>

          {/* Section 14 */}
          <div className="terms-section">
            <h3 className="terms-section-title">14.&nbsp;&nbsp;CONTACT</h3>
            <p className="terms-section-text">
              For questions regarding these Terms of Service, users may contact GrainRise through the official
              Contact Us or Contact Support channels.
            </p>
          </div>

          {/* Footer disclaimer */}
          <div className="terms-footer-disclaimer">
            <p><em>By continuing to use GrainRise, you acknowledge these Terms of Service.</em></p>
          </div>
        </div>
      </div>
    </div>
  );
}
