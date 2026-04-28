"use client";

import { useState, useEffect, useRef } from "react";
import { Checkbox } from "@mui/material";

const termsSections = [
  {
    title: "SCOPE OF SERVICES",
    content:
      "QuickHire is a technology platform that enables Users to access platform-managed, Ai-screened IT resources coordinated through a Technical Project Manager (TPM). On an hourly or custom day basis for virtual/remote services only.\n\nQuickHire acts solely as an intermediary and facilitator and does not itself provide IT development services.\n\nAll services provided through the App are:\n• Remote / virtual only\n• Time-and-material based\n• Not outcome- or milestone-based unless explicitly agreed in writing",
  },
  {
    title: "USER ELIGIBILITY",
    content:
      "You must:\n• Be at least 18 years of age\n• Be competent to contract under the Indian Contract Act, 1872\nBy using the App, you represent that all information provided by you is true, accurate, and complete.",
  },
  {
    title: "ACCOUNT REGISTRATION & SECURITY",
    content:
      "• Users must register using a valid mobile number and email address\n• Login is enabled through OTP or credentials\n• You are responsible for maintaining the confidentiality of your account\n• Any activity performed through your account shall be deemed to be performed by you\n\nQuickHire reserves the right to suspend or terminate accounts providing false or misleading information.",
  },
  {
    title: "BOOKING PROCESS",
    content:
      "To place a booking, User must:\n1. Select a Service and Sub-Service\n2. Choose duration (4 hours / 8 hours / Custom days)\n3. Select date and time slot\n4. Complete advance payment\n\nBooking confirmation is subject to successful payment.",
  },
  {
    title: "PRICING, TAXES & PAYMENT",
    content:
      "• Pricing is calculated on an hourly or custom-day basis\n• 18% GST is applicable and displayed at checkout\n• Full advance payment is mandatory to confirm any booking\n• QuickHire only facilitates payments and is not a banking or financial institution\n\nAny third-party tools, licenses, or software costs are to User's responsibility.",
  },
  {
    title: "SERVICE EXECUTION",
    content:
      '• A Technical Project Manager ("TPM") is assigned after booking confirmation.\n• The TPM assigns an appropriate Resource based on the User\'s requirements.\n• The service starts as per the confirmed booking schedule once the Resource is ready.\n• Service delivery is monitored to ensure quality and timely execution.',
  },
  {
    title: "EXTENSION OF SERVICE",
    content:
      '• "Extend Service" option is enabled 30 minutes before service expiry\n• Extensions are subject to Resource and time availability\n• Extension charges must be paid in advance\n• Service timer updates only after successful payment',
  },
  {
    title: "RESOURCE AVAILABILITY & CONTINUITY",
    content:
      "If the originally assigned Resource is unavailable for any subsequent or repeat booking, QuickHire shall, subject to availability, assign an alternative Resource with comparable domain expertise and experience. Continuity with the same individual Resource is not guaranteed, and such substitution shall not constitute a deficiency, default, or failure in service. QuickHire shall not be liable for any preferences, dependencies, or expectations relating to a specific Resource.",
  },
  {
    title: "CANCELLATIONS & REFUNDS",
    content:
      "• User-initiated cancellation policies may vary and will be displayed in-app\n• If QuickHire fails to assign a Resource within a reasonable time, a full refund will be issued\n• No refunds will be provided once:\n   o OTP is shared\n   o Service timer has started\n   o Delay is caused due to User unavailability\n\nAll refund decisions are subject to internal review in accordance with these Terms and applicable laws.",
  },
  {
    title: "USER CONDUCT & RESTRICTIONS",
    content:
      "Users agree not to:\n• Directly hire or solicit Resources outside of Platform\n• Upload abusive, illegal, defamatory, or infringing content\n• Misuse chat or communication features\n\nQuickHire reserves the right to terminate services immediately without refund for misconduct or abuse.",
  },
  {
    title: "NO EMPLOYMENT RELATIONSHIP",
    content:
      "Resources are independent professionals, not employees, agents, or representatives of QuickHire. No employment, partnership, or agency relationship is created.",
  },
  {
    title: "INTELLECTUAL PROPERTY",
    content:
      "• QuickHire owns all rights to App, design, branding, and platform technology\n• Work product created during paid service hours belongs to the User after full payment, unless otherwise agreed in writing\n• QuickHire retains ownership of any pre-existing tools, frameworks, or templates used in delivery.",
  },
  {
    title: "THIRD-PARTY SERVICES",
    content:
      "Resources may use third-party tools or platforms. QuickHire is not responsible for:\n• Downtime or failures of third-party services\n• Licensing or compliance issues\n• Data loss caused by external platforms",
  },
  {
    title: "DISCLAIMER & LIMITATION OF LIABILITY",
    content:
      'Services are provided on an "as is" and "as available" basis.\n\nQuickHire does not guarantee:\n• Bug-free or error-free code\n• Business outcomes or timelines\n\nTotal liability, if any, shall be limited to the amount paid by the User for the specific booking.',
  },
  {
    title: "FORCE MAJEURE",
    content:
      "QuickHire shall not be liable for delays or failures due to events beyond reasonable control, including natural disasters, network failures, government actions, or third-party outages.",
  },
  {
    title: "CONFIDENTIALITY",
    content:
      "Both parties agree to maintain confidentiality of information shared during service engagement. QuickHire shall not be responsible for the loss of User data. Users are solely responsible for maintaining backups.",
  },
  {
    title: "PRIVACY & DATA PROTECTION",
    content:
      "QuickHire collects personal, transactional, communication, and technical information to:\n• Provide services\n• Comply with legal obligations\n• Prevent fraud and resolve disputes\n\nData is protected using reasonable security practices as per the IT Act, 2000. QuickHire does not sell user data.",
  },
  {
    title: "ACCOUNT SUSPENSION & TERMINATION",
    content:
      "QuickHire may suspend or terminate accounts for:\n• Violation of these Terms\n• Fraudulent or abusive behavior\n• Attempt to bypass the Platform\n\nUsers may request account deletion, subject to legal retention requirements.",
  },
  {
    title: "MODIFICATION OF TERMS",
    content:
      "QuickHire reserves the right to update these Terms at any time. Continued use of the App constitutes acceptance of the revised Terms.",
  },
  {
    title: "INDEMNITY",
    content:
      "You agree to indemnify and hold QuickHire harmless against claims arising from misuse of the App, violation of laws, or infringement of third-party rights.",
  },

  {
    title: "GRIEVANCE OFFICER",
    content:
      "In accordance with the Information Technology Act, 2000 and rules made thereunder, name and contact details of the Grievance Officer are provided below:\n\n• Name: [Insert Name]\n• Designation: Grievance Officer\n• Address: [Insert Office Address]\n• Email: [Insert Email]\n• Time: 10 AM - 6 PM (Monday - Friday)\n\nAny person aggrieved as a result of access or usage of the App can notify the Grievance Officer in the form of a written complaint. The Grievance Officer shall redress the complaints within 1 month from the date of receipt of the complaint.",
  },
  {
    title: "GOVERNING LAW AND JURISDICTION",
    content:
      "These Terms of Use shall be governed by and interpreted in accordance with the laws of India. The courts of Gurugram, Haryana shall have the sole and exclusive jurisdiction in respect of any matters arising from the use of the App.",
  },
];

export default function TermsAndConditions({
  showAcceptButton = false,
  onAccept,
}) {
  const [isAccepted, setIsAccepted] = useState(false);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const scrollContainerRef = useRef(null);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        setHasReachedBottom(true);
      }
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar"
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-0 py-8 sm:py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[24px] lg:text-[28px] font-bold text-[#484848]">
              TERMS AND CONDITIONS OF USE –{" "}
              <span className="text-green-600">QuickHire</span>
            </h1>
            <div className="flex items-center mt-6">
              <p className="text-[14px] text-[#aba9a9] font-medium mr-2">
                Last Updated:
              </p>
              {/* <p className="text-xs font-medium text-gray-800">
               
              </p> */}
                        <span className="text-[14px] text-gray-800"> 30 December, 2025</span>


              
            </div>
          </div>

          <p
            className="text-[10px] sm:text-[14px] leading-relaxed mb-8"
            style={{
              fontWeight: "var(--font-weight-400)",
              color: "var(--text-secondary)",
            }}
          >
            This Terms and Conditions of Use ("Terms") is an electronic record
            in terms of the Information Technology Act, 2000 and rules made
            thereunder, as amended from time to time. This electronic record is
            generated by a computer system and does not require any physical or
            digital signatures.
            <br />
            <br />
            This document is published in accordance with Rule 3(1) of the
            Information Technology (Intermediaries Guidelines and Digital Media
            Ethics Code) Rules, 2011.
            <br />
            <br />
            The mobile & Web application "QuickHire" ("App" or "Platform") is
            owned and operated by Ai Genie ("QuickHire", "We", "Us", "Our").
            <br />
            <br />
            By accessing, registering, or using the App, you ("User", "You")
            agree to be bound by these Terms. If you do not agree, please do not
            use the App.
          </p>

          {/* Content Sections */}
          <div className="space-y-6">
            {termsSections.map((section, index) => (
              <div key={index}>
                <h2 className="text-[14px] sm:text-lg font-bold text-gray-800 mb-2">
                  <span className="text-green-600">{index + 1}.</span>{" "}
                  {section.title}
                </h2>
                <p
                  className="text-[10px] sm:text-[14px] leading-relaxed whitespace-pre-wrap"
                  style={{
                    fontWeight: "var(--font-weight-400)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accept Button */}
      {showAcceptButton && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-4">
              <Checkbox
                checked={isAccepted}
                onChange={(e) => setIsAccepted(e.target.checked)}
                sx={{ "&.Mui-checked": { color: "#4CAF50" } }}
              />
              <span className="text-sm font-medium text-gray-800">
                I agree to the Terms & Conditions
              </span>
            </div>
            <button
              onClick={() => onAccept?.(true)}
              disabled={!isAccepted || !hasReachedBottom}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {!hasReachedBottom
                ? "Please scroll to bottom to accept"
                : "Accept Terms & Conditions"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
