"use client";

import React, { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const ServiceFaq = ({ serviceData, isLoading }) => {
  const [expanded, setExpanded] = useState(false);

  console.log("ServiceFaq serviceData:", serviceData);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  // Static fallback FAQs
  const staticFaqs = [
    {
      id: "panel1",
      question:
        "Why should I hire through QuickHire instead of freelancers or traditional hiring?",
      answer:
        "QuickHire offers vetted professionals, instant availability, dedicated project management, and guaranteed quality. Unlike freelancers, our experts are pre-screened and managed, ensuring reliability and accountability. Compared to traditional hiring, we eliminate lengthy recruitment processes and provide immediate access to skilled talent.",
    },
    {
      id: "panel2",
      question: "Can I extend the work if I need more time?",
      answer:
        "Yes, you can easily extend your engagement with our experts. Simply reach out to your dedicated TPM (Technical Project Manager) or use your dashboard to request an extension. We offer flexible engagement options to accommodate your project needs and timeline changes.",
    },
    {
      id: "panel3",
      question: "Can I hire multiple resources at once?",
      answer:
        "Absolutely! QuickHire allows you to scale your team by hiring multiple resources simultaneously. Whether you need a full development team, designers, or specialists across different domains, we can provide coordinated resources that work together seamlessly on your project.",
    },
  ];

  // Get FAQs from API or use static fallback if empty
  const faqs =
    serviceData?.faqs?.length > 0
      ? serviceData.faqs.map((faq, index) => ({
          id: `panel${index + 1}`,
          question: faq.question,
          answer: faq.answer,
        }))
      : staticFaqs;

  return (
    <section style={{ backgroundColor: "#FFFFFF", padding: "16px 38px" }}>
      <div
        className="max-w-4xl mx-auto"
        // style={{
        //   paddingTop: 'clamp(24px, 4vw, px)',
        //   paddingBottom: 'clamp(24px, 4vw, 48px)'
        // }}
      >
        {/* Header */}
        <div className="mb-12">
          <Typography
            variant="h2"
            className="text-left font-bold"
            sx={{
              fontSize: { xs: "2rem", md: "2.5rem", lg: "var(--font-size-35)" },
              fontWeight: "var( --font-weight-400)",
              color: "#374151",
            }}
          >
            Frequently{" "}
            <span
              style={{
                color: "var(--quickhire-green)",
                fontStyle: "italic",
                fontWeight: "var(--font-weight-700)",
              }}
            >
              Asked
            </span>{" "}
            Question
          </Typography>
        </div>

        {/* FAQ Accordions */}
        <div className="space-y-4">
          {faqs.map((faq) => (
            <Accordion
              key={faq.id}
              expanded={expanded === faq.id}
              onChange={handleChange(faq.id)}
              sx={{
                border: "1px solid #E5E7EB",
                borderRadius: "12px !important",
                boxShadow: "none",
                "&:before": {
                  display: "none",
                },
                "&.Mui-expanded": {
                  margin: "0 0 16px 0",
                },
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      color: "#45A735",
                      fontSize: "28px",
                    }}
                  />
                }
                sx={{
                  padding: "20px 24px",
                  "& .MuiAccordionSummary-content": {
                    margin: "12px 0",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "#374151",
                    lineHeight: 1.6,
                  }}
                >
                  Q: {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  padding: "0 24px 24px 24px",
                  borderTop: "1px solid #F3F4F6",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "15px",
                    color: "#6B7280",
                    lineHeight: 1.7,
                  }}
                >
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceFaq;
