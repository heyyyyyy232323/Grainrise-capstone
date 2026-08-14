import { useState } from "react";
import { Search } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";

const SENT_SAMPLE = Array.from({ length: 4 }).map((_, i) => ({
  id: i + 1,
  title: "System Maintenance Notice",
  to: "All Users",
  date: "Aug 12, 2026 • 10:30 AM",
}));

export default function EmailUsers() {
  const [to, setTo] = useState("All Users");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const sendDisabled = !subject.trim() && !message.trim();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Communication", path: "/admin/email-users" }, { label: "Email Users" }]} />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Email Users</h1>
        <p className="text-sm text-gray-500 mt-1">Send announcements and updates.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <article className="w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
            <header className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="rounded-full bg-emerald-50 p-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B7A2A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8"/><rect x="3" y="5" width="18" height="14" rx="2"/></svg>
              </div>
              <div>
                <div className="text-sm font-semibold">Compose Email</div>
                <div className="text-xs text-slate-400">From: grainriseph@gmail.com</div>
              </div>
            </header>

            <div className="px-5 py-5">
              <label className="text-xs font-semibold text-slate-600">SEND TO</label>
              <div className="mt-2">
                <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white">
                  <option>All Users</option>
                  <option>Suppliers</option>
                  <option>Retailers</option>
                  <option>Warehouses</option>
                </select>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold text-slate-600">SUBJECT</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g Important Updates from GrainRise" className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold text-slate-600">MESSAGE</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message here..." rows={8} className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none" />
              </div>
            </div>

            <div className="border-t border-slate-200 px-5 py-3 bg-[#F3F5FF] flex items-center justify-between">
              <div className="text-xs text-slate-500">0 / 1000</div>
              <button disabled={sendDisabled} className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${sendDisabled ? 'bg-emerald-300' : 'bg-emerald-600 hover:brightness-95'}`}>
                Send ➤
              </button>
            </div>
          </article>
        </div>

        <aside>
          <div className="w-full">
            <div className="mb-4">
              <div className="text-sm font-semibold mb-2">Sent History</div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={14} className="text-gray-400" /></div>
                <input placeholder="Search sent emails..." className="pl-10 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="space-y-3">
              {SENT_SAMPLE.map((s) => (
                <div key={s.id} className="rounded-md border border-slate-100 bg-[#F8FAFF] px-4 py-3 text-sm">
                  <div className="font-semibold text-slate-800">{s.title}</div>
                  <div className="text-xs text-slate-500">To: {s.to}</div>
                  <div className="text-xs text-slate-400 mt-1">{s.date}</div>
                  <div className="text-right mt-2"><a className="text-emerald-600 text-sm font-medium">View</a></div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
