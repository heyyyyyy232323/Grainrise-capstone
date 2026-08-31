import { Search, Paperclip, Send, FileText } from "lucide-react";

export default function FarmerContractsMessages() {
  return (
    <div className="flex flex-col md:flex-row h-[600px] border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
      
      {/* ── Left Pane: Inbox ───────────────────────────────────────────────── */}
      <div className="w-full md:w-1/3 border-r border-slate-200 flex flex-col bg-white">
        
        {/* Search */}
        <div className="p-4 border-b border-gray-100">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input 
               type="text" 
               placeholder="Search conversations"
               className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
             />
           </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
           {/* Active Chat Item */}
           <div className="p-4 border-b border-gray-100 bg-slate-50 cursor-pointer border-l-4 border-l-green-600">
              <div className="flex justify-between items-start mb-1">
                 <h4 className="font-bold text-gray-900 text-sm">ABC Rice Mill</h4>
                 <span className="text-[10px] text-gray-500">10:45 AM</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                 <span className="bg-gray-200 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded">APP-2026-0018</span>
                 <span className="text-green-700 text-[9px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Application Under Review
                 </span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2">
                 We've received your application for the long-grain rice contract. Could you please...
              </p>
              <span className="inline-block bg-yellow-100 text-yellow-700 text-[9px] font-bold px-2 py-0.5 rounded-sm">
                 Pending Action
              </span>
           </div>

           {/* Inactive Chat Item 1 */}
           <div className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition">
              <div className="flex justify-between items-start mb-1">
                 <h4 className="font-bold text-gray-900 text-sm">Golden Harvest Milling</h4>
                 <span className="text-[10px] text-gray-500">Yesterday</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                 <span className="bg-gray-200 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded">OPR-2026-0042</span>
                 <span className="text-blue-600 text-[9px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Offer Open
                 </span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                 The revised offer details have been sent. Please review the delivery schedule for...
              </p>
           </div>

           {/* Inactive Chat Item 2 */}
           <div className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition">
              <div className="flex justify-between items-start mb-1">
                 <h4 className="font-bold text-gray-900 text-sm">Delta Agro Co.</h4>
                 <span className="text-[10px] text-gray-500">Oct 12</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                 <span className="bg-gray-200 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded">CON-2025-0112</span>
                 <span className="text-gray-600 text-[9px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Current Contract
                 </span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                 Delivery confirmed for shipment #4. Payment will be processed within 3...
              </p>
           </div>
        </div>
      </div>

      {/* ── Right Pane: Active Chat ────────────────────────────────────────── */}
      <div className="w-full md:w-2/3 flex flex-col bg-[#F8FAFC]">
         
         {/* Chat Header */}
         <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
            <div>
               <h3 className="font-bold text-gray-900 text-md">ABC Rice Mill</h3>
               <p className="text-xs text-gray-500 mt-0.5">Reference: APP-2026-0018 • Application Under Review</p>
            </div>
            <button className="text-xs border border-green-600 text-green-700 font-medium px-4 py-2 rounded-lg hover:bg-green-50 transition">
               View Reference
            </button>
         </div>

         {/* Chat Messages */}
         <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            
            <div className="flex justify-center">
               <span className="bg-gray-200 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full">
                  Today, October 16, 2024
               </span>
            </div>

            {/* Incoming Message */}
            <div className="flex items-end gap-3 max-w-[80%]">
               <div className="w-6 h-6 rounded bg-gray-300 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white">
                  A
               </div>
               <div className="flex flex-col gap-1">
                  <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-bl-none shadow-sm">
                     <p className="text-sm text-gray-700 leading-relaxed">
                        Hello. We've received your application APP-2026-0018 for the long-grain rice contract. Could you please provide the updated moisture analysis report from your latest harvest? We need this to proceed with the review.
                     </p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium pl-1">10:45 AM</span>
               </div>
            </div>

            {/* Outgoing Message */}
            <div className="flex items-end justify-end gap-3 max-w-[80%] self-end">
               <div className="flex flex-col items-end gap-1">
                  <div className="bg-green-700 text-white p-4 rounded-2xl rounded-br-none shadow-sm">
                     <p className="text-sm leading-relaxed">
                        Hi, thanks for reaching out. Yes, I have the latest moisture analysis report ready. I will attach it here momentarily. The levels are consistent with our historical data.
                     </p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium pr-1">11:15 AM</span>
               </div>
               <img src="https://ui-avatars.com/api/?name=Farmer&background=15803d&color=fff" alt="User" className="w-6 h-6 rounded-full flex-shrink-0" />
            </div>

            {/* Outgoing Attachment */}
            <div className="flex items-end justify-end gap-3 max-w-[80%] self-end mt-[-10px]">
               <div className="flex flex-col items-end gap-1">
                  <div className="bg-white border border-gray-200 p-3 rounded-xl rounded-br-none shadow-sm flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition">
                     <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                        <FileText size={16} />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-gray-900">Moisture_Report_Oct24.pdf</p>
                        <p className="text-[10px] text-gray-500">1.2 MB</p>
                     </div>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium pr-1">11:15 AM</span>
               </div>
               <div className="w-6 h-6 flex-shrink-0"></div> {/* Spacer for avatar alignment */}
            </div>

         </div>

         {/* Chat Input */}
         <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex items-center gap-3">
               <button className="text-gray-400 hover:text-gray-600 transition p-2">
                  <Paperclip size={20} />
               </button>
               <input 
                  type="text" 
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600"
               />
               <button className="bg-green-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-green-800 transition flex items-center gap-2">
                  Send <Send size={14} />
               </button>
            </div>
         </div>

      </div>
    </div>
  );
}
