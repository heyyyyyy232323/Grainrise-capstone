import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle2 } from 'lucide-react';
import LandingFooter from '../Components/Major-Components/LandingFooter';
import shakehandsImg from '../assets/shakehands2.png';

export default function PartnerWithUs() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    contactNumber: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate inquiry submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        organization: '',
        contactNumber: '',
        message: ''
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f2] dark:bg-[#07150d] text-gray-800 dark:text-gray-200 relative overflow-x-hidden font-sans">
      {/* ── Top Sub-Navigation Bar ── */}
      <header className="bg-white dark:bg-[#0d1f14] border-b border-gray-200 dark:border-white/10 sticky top-0 z-50 w-full">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-transparent text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-medium hover:text-[#00580C] dark:hover:text-emerald-400 px-2 py-1 rounded-md transition-colors cursor-pointer"
            onClick={() => navigate('/')}
            aria-label="Back to GrainRise Home"
          >
            <ArrowLeft size={16} strokeWidth={2} />
            <span>Back to GrainRise Home</span>
          </button>

          <div className="inline-flex items-center gap-1.5 bg-[#e8f5e9] dark:bg-[#143020] text-[#00580C] dark:text-emerald-300 border border-[#c8e6c9] dark:border-emerald-800 rounded-full px-3 py-1 text-[11.5px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
            <span>Partnership Inquiry</span>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 relative w-full px-4 sm:px-6 py-7 pb-16">
        <div className="relative z-10 max-w-[1200px] mx-auto flex flex-col gap-5">
          {/* ── Top Hero Banner Card ── */}
          <section className="bg-white dark:bg-[#0f2417] rounded-xl border border-[#e2ece5] dark:border-white/10 shadow-sm p-6 sm:p-8 flex items-center justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center bg-[#e8f5e9] dark:bg-[#1d3a29] text-[#00580C] dark:text-emerald-300 border border-[#bbf7d0] dark:border-emerald-800 rounded px-2 py-0.5 text-[10.5px] font-bold tracking-wider uppercase mb-2">
                Partnership
              </div>
              <h1 className="font-['Outfit'] text-2xl sm:text-[25px] font-extrabold text-[#00580C] dark:text-emerald-400 tracking-tight mb-1.5 leading-tight">
                Partner With GrainRise
              </h1>
              <p className="text-xs sm:text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed max-w-[620px]">
                Interested in connecting your organization with the GrainRise supply chain network? Send us your partnership details and our team will review your inquiry.
              </p>
            </div>

            <div className="hidden sm:flex w-11 h-11 bg-[#e8f5e9] dark:bg-[#1d3a29] rounded-xl items-center justify-center text-[#00580C] dark:text-emerald-400 shrink-0">
              <Users size={24} strokeWidth={1.8} />
            </div>
          </section>

          {/* ── Partnership Inquiry Form Card ── */}
          <section className="bg-white dark:bg-[#0f2417] rounded-xl border border-[#e2ece5] dark:border-white/10 shadow-sm p-6 sm:p-9 grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-center gap-8 lg:gap-10">
            {success ? (
              <div className="col-span-full text-center py-10 px-6 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#00580C] dark:text-emerald-400 flex items-center justify-center mb-4">
                  <CheckCircle2 size={36} strokeWidth={2.2} />
                </div>
                <h2 className="font-['Outfit'] text-xl sm:text-2xl font-bold text-[#00580C] dark:text-emerald-400 mb-2">
                  Inquiry Submitted Successfully!
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-[440px] leading-relaxed mb-6">
                  Thank you for reaching out to GrainRise. Our team will review your partnership details and connect with you shortly.
                </p>
                <button
                  type="button"
                  className="bg-[#00580C] hover:bg-[#014209] text-white rounded-md px-5 py-2 text-xs sm:text-[12.5px] font-semibold transition-colors cursor-pointer"
                  onClick={() => setSuccess(false)}
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col">
                  <div className="mb-5">
                    <h2 className="font-['Outfit'] text-lg font-bold text-gray-900 dark:text-white mb-1 leading-snug">
                      Partnership Inquiry
                    </h2>
                    <p className="text-xs sm:text-[12.5px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      Provide the details below so the GrainRise team can review your partnership inquiry.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      {/* Name */}
                      <div className="flex flex-col">
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-1.5 flex items-center gap-0.5" htmlFor="name">
                          NAME <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          className="w-full bg-white dark:bg-[#163321] border border-gray-300 dark:border-[#2d5c3c] rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-800 dark:text-white outline-none focus:border-[#00580C] dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-600/15 transition-all"
                          placeholder="Enter your full name"
                          value={formData.name}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Email */}
                      <div className="flex flex-col">
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-1.5 flex items-center gap-0.5" htmlFor="email">
                          EMAIL ADDRESS <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          className="w-full bg-white dark:bg-[#163321] border border-gray-300 dark:border-[#2d5c3c] rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-800 dark:text-white outline-none focus:border-[#00580C] dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-600/15 transition-all"
                          placeholder="Enter your email address"
                          value={formData.email}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Organization */}
                      <div className="flex flex-col">
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-1.5 flex items-center gap-0.5" htmlFor="organization">
                          ORGANIZATION / COMPANY <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="organization"
                          name="organization"
                          type="text"
                          required
                          className="w-full bg-white dark:bg-[#163321] border border-gray-300 dark:border-[#2d5c3c] rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-800 dark:text-white outline-none focus:border-[#00580C] dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-600/15 transition-all"
                          placeholder="Enter your organization or company name"
                          value={formData.organization}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Contact Number */}
                      <div className="flex flex-col">
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-1.5 flex items-center gap-0.5" htmlFor="contactNumber">
                          CONTACT NUMBER <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="contactNumber"
                          name="contactNumber"
                          type="tel"
                          required
                          className="w-full bg-white dark:bg-[#163321] border border-gray-300 dark:border-[#2d5c3c] rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-800 dark:text-white outline-none focus:border-[#00580C] dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-600/15 transition-all"
                          placeholder="Enter your contact number"
                          value={formData.contactNumber}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Message / Inquiry */}
                      <div className="flex flex-col col-span-full">
                        <label className="text-[10.5px] font-bold text-gray-600 dark:text-gray-300 tracking-wider uppercase mb-1.5 flex items-center gap-0.5" htmlFor="message">
                          PARTNERSHIP INQUIRY / MESSAGE <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={4}
                          className="w-full bg-white dark:bg-[#163321] border border-gray-300 dark:border-[#2d5c3c] rounded-lg p-3 text-xs sm:text-sm text-gray-800 dark:text-white outline-none resize-y min-h-[95px] focus:border-[#00580C] dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-600/15 transition-all"
                          placeholder="Tell us about your organization and how you would like to partner with GrainRise."
                          value={formData.message}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="mt-2">
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 bg-[#00580C] hover:bg-[#014209] text-white font-semibold text-xs sm:text-[12.5px] rounded-md px-5 py-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                      >
                        <span>{isSubmitting ? 'Submitting...' : 'Submit Partnership Inquiry'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Illustration Column */}
                <div className="flex items-center justify-center p-2 order-first lg:order-last">
                  <img
                    src={shakehandsImg}
                    alt="Partner With GrainRise"
                    className="w-full max-w-[320px] lg:max-w-[420px] h-auto object-contain block"
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* ── Footer ── */}
      <LandingFooter />
    </div>
  );
}
