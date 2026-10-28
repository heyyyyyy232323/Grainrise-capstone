import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, FileText, ExternalLink, Maximize2, Minimize2 } from "lucide-react";

export default function TermsModal({ isOpen, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const modalJSX = (
    <div
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 md:p-6"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 999999,
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-xs transition-opacity"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      <div
        className={`relative w-full ${
          isMaximized ? "w-[96vw] max-w-none h-[94vh]" : "max-w-[840px] h-[88vh]"
        } bg-white rounded-2xl flex flex-col overflow-hidden shadow-2xl transition-all duration-200`}
        style={{
          maxHeight: "calc(100vh - 2rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-emerald-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-800 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[10.5px] font-bold tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 uppercase">
                LEGAL
              </span>
              <span className="text-xs text-gray-500">
                Last Updated: September 2026
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <a
                href="/terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                title="Open full page in new tab"
              >
                <ExternalLink size={12} />
                Full Page
              </a>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                onClick={() => setIsMaximized((prev) => !prev)}
                title={isMaximized ? "Restore size" : "Maximize screen"}
                aria-label={isMaximized ? "Restore size" : "Maximize screen"}
              >
                {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 font-['Outfit']">Terms of Service</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Please review the terms governing your access and use of GrainRise.
          </p>
        </div>

        {/* Scrollable Body */}
        <div
          className="overflow-y-auto min-h-0 p-5 sm:p-6 flex-1 flex flex-col gap-3.5 text-xs sm:text-sm text-gray-700"
          style={{ minHeight: 0, overflowY: "auto" }}
        >

          {/* Section 1 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">1.&nbsp;&nbsp;ACCEPTANCE OF TERMS</h3>
            <p className="leading-relaxed mb-2">
              By accessing or using GrainRise, you acknowledge that you have read and understood these Terms
              of Service and agree to comply with the rules and conditions applicable to your use of the platform.
            </p>
            <p className="leading-relaxed">
              If you do not agree with these terms, you should not continue using GrainRise.
            </p>
          </div>

          {/* Section 2 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">2.&nbsp;&nbsp;ABOUT GRAINRISE</h3>
            <p className="leading-relaxed mb-2">
              GrainRise is a digital rice supply chain management platform designed to support coordination and
              operations across participating stakeholders in the rice supply chain.
            </p>
            <p className="leading-relaxed mb-2">
              Depending on the user's authorized role, GrainRise may provide access to functions such as:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 my-2">
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Inventory management</li>
                <li>Contracts</li>
                <li>Point of Sale</li>
                <li>Delivery and logistics</li>
                <li>Communication and notifications</li>
              </ul>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Procurement and sourcing</li>
                <li>Orders and transactions</li>
                <li>Warehouse operations</li>
                <li>Forecasting and decision-support tools</li>
                <li>Related operational records</li>
              </ul>
            </div>
            <p className="text-[11px] text-gray-500 italic mt-1.5">
              Available features may vary according to account role and authorization.
            </p>
          </div>

          {/* Section 3 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">3.&nbsp;&nbsp;ACCOUNT REGISTRATION AND ACCESS</h3>
            <p className="leading-relaxed mb-2">
              Users are responsible for providing accurate and current information when registering for GrainRise.
              Certain accounts may require verification or administrative review before access is activated.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 my-2.5">
              <p className="text-xs font-semibold text-gray-900 mb-1">Users are responsible for:</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Maintaining accurate account information</li>
                <li>Protecting their login credentials</li>
                <li>Keeping passwords and verification codes confidential</li>
                <li>Using only the account assigned to them</li>
                <li>Notifying GrainRise when unauthorized account access is suspected</li>
              </ul>
            </div>
            <div className="bg-red-50/70 border border-red-200 rounded-lg p-3 mt-2 text-xs">
              <p className="text-gray-700">
                <strong className="text-red-600 font-semibold">Important:</strong> Users must not share passwords or verification codes with another person.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">4.&nbsp;&nbsp;ROLE-BASED ACCESS</h3>
            <p className="leading-relaxed mb-2">
              GrainRise uses role-based access to provide users only with system features relevant to their authorized
              responsibilities.
            </p>
            <p className="leading-relaxed">
              Users must not attempt to access restricted modules, bypass role permissions, view information
              belonging to unauthorized users, manipulate permissions, or gain unauthorized administrative access.
            </p>
          </div>

          {/* Section 5 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">5.&nbsp;&nbsp;ACCEPTABLE USE</h3>
            <p className="leading-relaxed">
              Users agree to use GrainRise only for legitimate and authorized purposes. Users must adhere to all applicable platform policies and operational guidelines.
            </p>
          </div>

          {/* Section 6 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">6.&nbsp;&nbsp;USER-PROVIDED INFORMATION</h3>
            <p className="leading-relaxed mb-2">
              Users are responsible for the accuracy of information, documents, quantities, prices, addresses,
              transaction details, and other records they submit through GrainRise. Users should review information
              before confirming or submitting transactions.
            </p>
            <p className="leading-relaxed">
              Some completed or verified records may not be directly editable and may require an appropriate
              correction, return, cancellation, or administrative process.
            </p>
          </div>

          {/* Section 7 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">7.&nbsp;&nbsp;TRANSACTIONS AND OPERATIONAL RECORDS</h3>
            <p className="leading-relaxed mb-2">
              Transactions completed through GrainRise may be recorded for operational, monitoring, reporting, and
              traceability purposes. Depending on the user role, records may include purchases, sales, procurement,
              inventory movements, contracts, deliveries, returns, payments, and other supply chain transactions.
            </p>
            <p className="leading-relaxed">
              Users should verify transaction details before completing an action.
            </p>
          </div>

          {/* Section 8 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">8.&nbsp;&nbsp;SYSTEM AVAILABILITY</h3>
            <p className="leading-relaxed">
              GrainRise aims to provide reliable access to its services. However, temporary interruptions may occur
              because of system maintenance, technical issues, internet connectivity, third-party service availability,
              security updates, or circumstances outside the platform's reasonable control.
            </p>
          </div>

          {/* Section 9 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">9.&nbsp;&nbsp;DATA AND PRIVACY</h3>
            <p className="leading-relaxed">
              Personal and operational information processed through GrainRise is handled in accordance with the
              GrainRise Privacy Policy and applicable data protection requirements.
            </p>
          </div>

          {/* Section 10 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">10.&nbsp;&nbsp;INTELLECTUAL PROPERTY</h3>
            <p className="leading-relaxed">
              The GrainRise name, visual identity, system interface, software components, original content, and other
              proprietary materials are protected by applicable intellectual property rights.
            </p>
          </div>

          {/* Section 11 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">11.&nbsp;&nbsp;ACCOUNT RESTRICTION OR DEACTIVATION</h3>
            <p className="leading-relaxed">
              GrainRise may restrict, deactivate, or review an account when necessary because of security concerns,
              suspected misuse, inaccurate or fraudulent information, violation of system rules, unauthorized activity,
              or administrative or verification requirements.
            </p>
          </div>

          {/* Section 12 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">12.&nbsp;&nbsp;LIMITATION OF SERVICE</h3>
            <p className="leading-relaxed mb-2">
              GrainRise provides digital tools to support rice supply chain operations and decision-making. Users
              remain responsible for reviewing information and making their own operational and business decisions.
            </p>
            <p className="leading-relaxed">
              Forecasts, analytics, recommendations, and decision-support information should be treated as
              supporting information and not as guaranteed outcomes.
            </p>
          </div>

          {/* Section 13 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">13.&nbsp;&nbsp;CHANGES TO THESE TERMS</h3>
            <p className="leading-relaxed">
              These Terms of Service may be updated when GrainRise services, system requirements, or applicable
              policies change.
            </p>
          </div>

          {/* Section 14 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">14.&nbsp;&nbsp;CONTACT</h3>
            <p className="leading-relaxed">
              For questions regarding these Terms of Service, users may contact GrainRise through official support channels.
            </p>
          </div>

          {/* Footer disclaimer */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 text-center text-xs text-gray-500 italic mt-2">
            <p>By continuing to use GrainRise, you acknowledge these Terms of Service.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
}
