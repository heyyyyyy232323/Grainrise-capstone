import React, { useEffect } from "react";
import { X, ShieldCheck } from "lucide-react";

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
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-4 sm:p-6 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] max-h-[90vh] bg-white rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-emerald-100 shrink-0">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-800 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[10px] font-bold tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 uppercase">
                DATA PROTECTION
              </span>
              <span className="text-xs text-gray-500">Last Updated: September 2026</span>
            </div>
            <button
              className="ml-auto w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <h2 className="text-xl font-bold text-gray-900 font-['Outfit']">Privacy Policy</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Learn how GrainRise collects, uses, protects, and manages information.
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-6 flex-1 flex flex-col gap-3.5 text-xs sm:text-sm text-gray-700">

          {/* Section 1 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">1.&nbsp;&nbsp;PRIVACY COMMITMENT</h3>
            <p className="leading-relaxed mb-2">
              GrainRise respects the privacy of its users and is committed to handling personal and operational
              information responsibly. This Privacy Policy explains the types of information GrainRise may collect, why
              the information is used, and how it is protected.
            </p>
            <p className="leading-relaxed">
              GrainRise processes personal information in accordance with applicable Philippine data protection
              requirements, including the Data Privacy Act of 2012 (Republic Act No. 10173).
            </p>
          </div>

          {/* Section 2 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">2.&nbsp;&nbsp;INFORMATION WE MAY COLLECT</h3>
            <p className="leading-relaxed mb-2">
              Depending on the user's role and use of GrainRise, the system may collect information such as:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-2.5">
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3">
                <p className="text-[10.5px] font-bold text-emerald-800 tracking-wider uppercase mb-1.5">PERSONAL INFORMATION</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-gray-700">
                  <li>Full name</li>
                  <li>Email address</li>
                  <li>Contact number</li>
                  <li>Address</li>
                  <li>Account credentials</li>
                  <li>Profile information</li>
                </ul>
              </div>
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3">
                <p className="text-[10.5px] font-bold text-emerald-800 tracking-wider uppercase mb-1.5">REGISTRATION &amp; VERIFICATION</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-gray-700">
                  <li>Submitted registration details</li>
                  <li>Business information</li>
                  <li>Farm information</li>
                  <li>Warehouse information</li>
                  <li>Retail information</li>
                  <li>Supporting verification documents</li>
                </ul>
              </div>
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3">
                <p className="text-[10.5px] font-bold text-emerald-800 tracking-wider uppercase mb-1.5">OPERATIONAL INFORMATION</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-gray-700">
                  <li>Inventory records &amp; products</li>
                  <li>Transactions, orders, purchases, sales</li>
                  <li>Contracts and procurement records</li>
                  <li>Delivery information</li>
                  <li>Returns, issues &amp; operational logs</li>
                </ul>
              </div>
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3">
                <p className="text-[10.5px] font-bold text-emerald-800 tracking-wider uppercase mb-1.5">TECHNICAL INFORMATION</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-gray-700">
                  <li>Account activity logs</li>
                  <li>Login-related information</li>
                  <li>Device or browser information</li>
                  <li>Timestamps</li>
                  <li>System activity for security</li>
                </ul>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 italic mt-1.5">
              GrainRise only collects information that is genuinely required for secure and authentic platform operation.
            </p>
          </div>

          {/* Section 3 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">3.&nbsp;&nbsp;HOW INFORMATION IS USED</h3>
            <p className="leading-relaxed mb-2">Information may be used to:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 my-2">
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Create and manage user accounts</li>
                <li>Provide role-based system access</li>
                <li>Maintain inventory and supply chain records</li>
                <li>Provide notifications and system updates</li>
                <li>Provide customer or technical support</li>
                <li>Generate authorized operational reports and analytics</li>
              </ul>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
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
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">4.&nbsp;&nbsp;ROLE-BASED INFORMATION ACCESS</h3>
            <p className="leading-relaxed mb-2">
              Access to information within GrainRise is limited according to authorized user roles and system
              responsibilities. Users should only be able to access data necessary for their permitted functions.
            </p>
            <p className="leading-relaxed">
              Administrative users may have additional access when required for legitimate system administration,
              verification, security, support, or operational purposes.
            </p>
          </div>

          {/* Section 5 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">5.&nbsp;&nbsp;INFORMATION SHARING</h3>
            <p className="leading-relaxed font-bold text-gray-900 mb-2">
              GrainRise does not sell personal information.
            </p>
            <p className="leading-relaxed">
              Information may be shared only when necessary for legitimate system operations, such as completing
              authorized transactions, coordinating supply chain activities, processing orders or deliveries, performing
              account verification, or complying with legal obligations.
            </p>
          </div>

          {/* Section 6 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">6.&nbsp;&nbsp;THIRD-PARTY SERVICES</h3>
            <p className="leading-relaxed">
              Some GrainRise features may rely on authorized third-party services for functions such as email
              delivery, mapping, notifications, hosting, and technical infrastructure.
            </p>
          </div>

          {/* Section 7 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">7.&nbsp;&nbsp;DATA SECURITY</h3>
            <p className="leading-relaxed mb-1">
              GrainRise uses reasonable technical and organizational safeguards designed to protect information
              against unauthorized access, improper disclosure, alteration, misuse, and accidental loss.
            </p>
            <p className="text-[11px] text-gray-500 italic">
              However, no digital system can guarantee absolute security.
            </p>
          </div>

          {/* Section 8 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">8.&nbsp;&nbsp;PASSWORDS AND VERIFICATION CODES</h3>
            <p className="leading-relaxed">
              Users are responsible for keeping passwords and verification codes confidential. GrainRise Support will
              never request a user's password or verification code through ordinary support messages or forms.
            </p>
          </div>

          {/* Section 9 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">9.&nbsp;&nbsp;DATA RETENTION</h3>
            <p className="leading-relaxed">
              Information should be retained only for as long as reasonably necessary for legitimate system
              operations, transaction and operational records, security, and administrative requirements.
            </p>
          </div>

          {/* Section 10 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">10.&nbsp;&nbsp;USER PRIVACY RIGHTS</h3>
            <p className="leading-relaxed">
              Subject to applicable law, users may have rights regarding their personal information, including rights to be informed about data processing, access relevant information, and request correction.
            </p>
          </div>

          {/* Section 11 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">11.&nbsp;&nbsp;ACCURACY OF INFORMATION</h3>
            <p className="leading-relaxed">
              Users should provide accurate and current information and can update certain details through account settings.
            </p>
          </div>

          {/* Section 12 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">12.&nbsp;&nbsp;COOKIES AND TECHNICAL DATA</h3>
            <p className="leading-relaxed">
              GrainRise may use necessary technical data to support authentication, session management, security, and performance.
            </p>
          </div>

          {/* Section 13 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">13.&nbsp;&nbsp;PRIVACY POLICY UPDATES</h3>
            <p className="leading-relaxed">
              This Privacy Policy may be updated when features, data practices, or applicable regulations change.
            </p>
          </div>

          {/* Section 14 */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 sm:p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">14.&nbsp;&nbsp;PRIVACY QUESTIONS</h3>
            <p className="leading-relaxed">
              For privacy-related questions or concerns, users may use GrainRise's official Contact Us or Contact Support channels.
            </p>
          </div>

          {/* Footer disclaimer */}
          <div className="border border-dashed border-emerald-200 rounded-lg p-3.5 text-center text-xs text-gray-500 italic mt-2">
            <p>Your privacy matters. Only provide information necessary for your use of GrainRise.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
