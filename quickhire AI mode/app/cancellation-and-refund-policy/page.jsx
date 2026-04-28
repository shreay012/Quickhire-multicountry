"use client";

import React from "react";

const SectionTitle = ({ children }) => (
  <h2
    className="text-[20px] sm:text-[24px] font-bold mb-2 font-sans tracking-wide"
    style={{ color: "var(--section-title-green)" }}
  >
    {children}
  </h2>
);

const SubTitle = ({ children }) => (
  <h3 className="text-[16px] sm:text-[16px] font-semibold text-gray-900 mb-1.5 font-sans tracking-normal">
    {children}
  </h3>
);

const BodyParagraph = ({ children }) => (
  <p
    className="text-[16px] sm:text-[16px] leading-relaxed mb-1.5 text-left font-sans tracking-normal"
    style={{
      fontWeight: "var(--font-weight-400)",
      color: "var(--text-secondary)",
    }}
  >
    {children}
  </p>
);

const BulletPoint = ({ children }) => (
  <div className="flex items-start mb-1">
    <span className="hidden sm:inline text-green-600 font-bold mr-2">•</span>
    <p className="flex-1 text-[14px] sm:text-[14px] text-gray-600 leading-snug">
      {children}
    </p>
  </div>
);

const RichTextBullet = ({ boldPart, rest }) => (
  <div className="flex items-start mb-2">
    <span className="hidden sm:inline text-green-600 font-bold mr-2">•</span>
    <p className="flex-1 text-[13px] sm:text-[14px] text-gray-600 leading-[20px] sm:leading-snug">
      <span className="font-bold">{boldPart}</span>
      {rest}
    </p>
  </div>
);

export default function CancellationRefundPolicyPage() {
  return (
    <div className="px-4 sm:px-12 md:px-30 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <h1 className="text-[24px] lg:text-[28px] font-bold text-gray-800 tracking-wide">
            Cancellation and Refund Policy –{" "}
            <span className="text-green-600">QuickHire</span>
          </h1>
        </div>

        <p className="text-xs font-medium mb-10">
          <span className="text-[14px] text-[#aba9a9] font-medium">
            Last Updated:{" "}
          </span>

          <span className="text-[14px] text-gray-800">February 14, 2026</span>
        </p>

        <div className="space-y-5">
          <section>
            <SectionTitle>Overview</SectionTitle>
            <BodyParagraph>
              At QuickHire, we strive to deliver high-quality services and
              ensure a positive experience for both clients and talent. This
              Cancellation and Refund Policy outlines the terms governing
              cancellations, refunds, and related resolutions.
            </BodyParagraph>
          </section>

          <section>
            <SectionTitle>Cancellation Policy</SectionTitle>
            <SubTitle>Before Work Begins</SubTitle>
            <BodyParagraph>
              Users may cancel the engagement at any time before the assigned
              talent commences work and shall be entitled to a full refund.
            </BodyParagraph>
            <div className="my-4"></div>
            <SubTitle>After Work Begins</SubTitle>
            <BodyParagraph>
              Once the assigned talent has commenced work, cancellations are not
              permitted. This policy ensures fairness to both the client and the
              talent who has allocated time and resources to the engagement.
            </BodyParagraph>
          </section>

          <section>
            <h2
              className="text-[16px] sm:text-[18px] font-bold mb-2 font-sans tracking-wide"
              style={{
                color: "var(--section-title-green)",
                fontWeight: "var(--font-weight-500)",
              }}
            >
              1. Refund Policy
            </h2>
            <BodyParagraph>
              Users shall be entitled to a full refund in the following
              circumstances:
            </BodyParagraph>
            <BulletPoint>Cancellation occurs before work begins</BulletPoint>
            <BulletPoint>
              QuickHire is unable to match the user with suitable talent within
              a reasonable time
            </BulletPoint>
            <BulletPoint>Billing errors or duplicate payments</BulletPoint>
            <div className="my-4"></div>
            <SubTitle>No Refunds After</SubTitle>
            <BulletPoint>Work has commenced</BulletPoint>
            <BulletPoint>Any deliverables has been created</BulletPoint>
            <BulletPoint>The engagement period has begun</BulletPoint>
          </section>

          <section>
            <h2
              className="text-[16px] sm:text-[18px] font-bold mb-2 font-sans tracking-wide"
              style={{
                color: "var(--section-title-green)",
                fontWeight: "var(--font-weight-500)",
              }}
            >
              Service Resolution Process
            </h2>
            <BodyParagraph>
              If you are not satisfied with the work delivered, we are committed
              to resolving the issue promptly.
            </BodyParagraph>
            <BodyParagraph>
              While we don't offer refunds once work begins, we offer the
              following resolution mechanisms:
            </BodyParagraph>
            <RichTextBullet
              boldPart="Extended Time — "
              rest="Need more time? Additional hours are available at an added cost to ensure your project is completed to your satisfaction."
            />
            <RichTextBullet
              boldPart="PM Intervention — "
              rest="Our dedicated project manager will work directly with you and the talent to resolve any concerns promptly and professionally."
            />
          </section>

          <section>
            <SectionTitle>Contact Us</SectionTitle>
            <p className="text-[13px] sm:text-[14px] mb-2 text-gray-600 leading-relaxed">
              <span className="font-bold">Email: </span>
              support@quickhire.services
            </p>
            <p className="text-[13px] sm:text-[14px] mb-2 text-gray-600 leading-relaxed">
              <span className="font-bold">Address: </span>650, Tower A, Spaze
              iTech Park, Sohna Road, Gurgaon, Haryana, India
            </p>
            <p className="text-[13px] sm:text-[14px] mb-2 text-gray-600 leading-relaxed">
              <span className="font-bold">Response time: </span>Within 1 hour
              during business hours
            </p>
            <div className="my-3"></div>
            <BodyParagraph>
              For urgent issues, clients are advised to contact their assigned
              Project Manager immediately. We aim to assess escalations within
              15 minutes during business hours and propose a resolution
              promptly.
            </BodyParagraph>
            <p className="text-[13px] mt-2 sm:text-[14px] text-gray-600 leading-relaxed">
              <span className="font-bold  ">Our Commitment: </span>QuickHire is
              committed to making hiring fair, efficient, and reliable. If you
              believe this policy has been applied unfairly, please contact us.
              We are committed to reviewing concerns in good faith.
            </p>
          </section>

          <section>
            <SubTitle>Acceptance of This Policy</SubTitle>
            <BodyParagraph>
              By engaging services through QuickHire, you acknowledge that you
              have read, understood, and agreed to this Cancellation and Refund
              Policy.
            </BodyParagraph>
            <BodyParagraph>
              Your continued use of the QuickHire platform and confirmation of
              any service engagement constitutes your acceptance of these terms.
            </BodyParagraph>
            <BodyParagraph>
              If you do not agree with any part of this policy, you should not
              proceed with booking or engaging services through QuickHire.
            </BodyParagraph>
          </section>
        </div>
      </div>
    </div>
  );
}
