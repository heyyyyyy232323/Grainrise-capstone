import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Calendar, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import CustomWhiteButton from "../../../Components/Minor-Components/CustomWhiteButton";
import Dropdown from "../../../Components/Minor-Components/Dropdown";

const sampleInquiries = [
  { id: 1, name: "Juan Dela Cruz", org: "Organization A", date: "Sep 24, 2026", time: "2:35PM", status: "New" },
  { id: 2, name: "Juan Dela Cruz", org: "Organization A", date: "Sep 24, 2026", time: "2:35PM", status: "New" },
  { id: 3, name: "Juan Dela Cruz", org: "Organization A", date: "Sep 24, 2026", time: "2:35PM", status: "New" },
  { id: 4, name: "Juan Dela Cruz", org: "Organization A", date: "Sep 24, 2026", time: "2:35PM", status: "Contacted" },
  { id: 5, name: "Juan Dela Cruz", org: "Organization A", date: "Sep 24, 2026", time: "2:35PM", status: "Contacted" },
  { id: 6, name: "Juan Dela Cruz", org: "Organization A", date: "Sep 24, 2026", time: "2:35PM", status: "Contacted" },
  { id: 7, name: "Juan Dela Cruz", org: "Organization A", date: "Sep 24, 2026", time: "2:35PM", status: "Under Review" },
  { id: 8, name: "Juan Dela Cruz", org: "Organization A", date: "Sep 24, 2026", time: "2:35PM", status: "Under Review" },
  { id: 9, name: "Juan Dela Cruz", org: "Organization A", date: "Sep 24, 2026", time: "2:35PM", status: "Under Review" },
  { id: 10, name: "Juan Dela Cruz", org: "Organization A", date: "Sep 24, 2026", time: "2:35PM", status: "Under Review" },
];

const AdminPartnerWithUs = () => {
  const [activeTab, setActiveTab] = useState("All Inquiries");
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusStyle = (status) => {
    switch (status) {
      case "New":
        return "bg-green-100 text-green-700";
      case "Contacted":
        return "bg-blue-100 text-blue-700";
      case "Under Review":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 animate-fade-in flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: "Communication", path: "#" },
            { label: "Partner With Us", path: "/admin/partner-with-us" },
          ]}
        />
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-2">Partner With Us</h1>
        <p className="text-sm text-gray-500 mt-1">Review and manage partnership inquiries submitted through the GrainRise website.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 flex gap-6">
        {["All Inquiries", "Recently Sent"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === tab ? "text-green-800" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-green-700 rounded-t-md" />
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search name, organization, or email"
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <div className="relative">
            <select className="appearance-none pl-4 pr-10 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 cursor-pointer">
              <option>Status</option>
              <option>New</option>
              <option>Contacted</option>
              <option>Under Review</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Date Range" 
              className="pl-4 pr-10 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-32 cursor-pointer"
              readOnly
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          <div className="relative">
            <select className="appearance-none pl-4 pr-10 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 cursor-pointer">
              <option>Sort By</option>
              <option>Newest First</option>
              <option>Oldest First</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/70 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Organization/Company</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Date & Time Submitted</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sampleInquiries.map((inquiry) => (
                <tr key={inquiry.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{inquiry.name}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{inquiry.org}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{inquiry.date}</span>
                      <span className="text-xs text-gray-500">{inquiry.time}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase ${getStatusStyle(inquiry.status)}`}>
                      {inquiry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="px-4 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors bg-white">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-auto px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white rounded-b-xl">
          <span className="text-xs text-gray-500">Showing 1-10 of 15 inquiries</span>
          <div className="flex gap-1 items-center">
            <button className="px-3 py-1 text-xs text-gray-400 font-medium">Previous</button>
            <button className="w-7 h-7 flex items-center justify-center rounded-md bg-green-700 text-white text-xs font-semibold shadow-sm">1</button>
            <button className="w-7 h-7 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 text-xs font-semibold transition-colors">2</button>
            <button className="px-3 py-1 text-xs text-gray-600 font-medium hover:text-gray-900">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPartnerWithUs;
