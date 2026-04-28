"use client";

import React from "react";
import { Box, Typography, Card } from "@mui/material";

const BookingCard = ({ serviceData, isLoading }) => {
  // Receiving props for consistency, even if not using API data currently
  console.log("BookingCard serviceData:", serviceData);

  const firstRowSteps = [
    {
      number: 1,
      title: "Booking",
      description: "Choose your resource and place a booking in minutes.",
    },
    {
      number: 2,
      title: "Kick-off Call",
      description:
        "Connect with professional and with your project manager to align on goals and execution.",
    },
  ];

  const secondRowSteps = [
    {
      number: 3,
      title: "Work Starts",
      description: "The expert begins work based on agreed plan.",
    },
    {
      number: 4,
      title: "Get Updates",
      description:
        "Receive regular progress updates via chat or email from your project manager.",
    },
    {
      number: 5,
      title: "Extend or Close",
      description:
        "Add more hours, continue with the same expert, or close project when done.",
    },
  ];

  return (
    <section
      style={{ backgroundColor: "var(--bg-tertiary)", padding: "48px 16px" }}
    >
      <div
        className="max-w-7xl mx-auto"
        // style={{
        //   paddingTop: 'clamp(24px, 4vw, 48px)',
        //   paddingBottom: 'clamp(24px, 4vw, 48px)'
        // }}
      >
        {/* Header */}
        <div className="mb-12">
          <Typography
            variant="h2"
            className="font-bold"
            sx={{
              fontSize: { xs: "2rem", md: "2.5rem", lg: "var(--font-size-35)" },
              fontWeight: 700,
              color: "var(--dark--text-secondary)",
            }}
          >
            See How{" "}
            <span
              style={{
                color: "var(--quickhire-green)",
                fontWeight: "var(--font-weight-700)",
                fontStyle: "italic",
              }}
            >
              QuickHire
            </span>{" "}
            Can help you
          </Typography>
        </div>

        {/* First Row - 2 Large Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {firstRowSteps.map((step) => (
            <Card
              key={step.number}
              sx={{
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "none",

                backgroundColor: "#FFFFFF",
                minHeight: "220px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* Number Badge */}
              <Box
                className="flex items-center justify-center rounded-full"
                sx={{
                  width: "33px",
                  height: "33px",
                  backgroundColor: "#45A735",
                  color: "var(--bg-primary)",
                  fontSize: "var(--font-size-14)",
                  fontWeight: "var(--font-weight-700)",
                }}
              >
                {step.number}
              </Box>

              {/* Title */}
              <Typography
                sx={{
                  fontSize: "var(--font-size-180)",
                  fontWeight: "var(--font-weight-700)",
                  color: "var(--text-primary)",
                }}
              >
                {step.title}
              </Typography>

              {/* Description */}
              <Typography
                sx={{
                  fontWeight: "var(--font-weight-400)",
                  fontSize: "var(--font-size-14)",
                  color: "var(--text-secondary)",
                }}
              >
                {step.description}
              </Typography>
            </Card>
          ))}
        </div>

        {/* Second Row - 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {secondRowSteps.map((step) => (
            <Card
              key={step.number}
              sx={{
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "none",

                backgroundColor: "#FFFFFF",
                minHeight: "220px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* Number Badge */}
              <Box
                className="flex items-center justify-center rounded-full"
                sx={{
                  width: "33px",
                  height: "33px",
                  backgroundColor: "#45A735",
                  color: "var(--bg-primary)",
                  fontSize: "var(--font-size-14)",
                  fontWeight: "var(--font-weight-700)",
                }}
              >
                {step.number}
              </Box>

              {/* Title */}
              <Typography
                sx={{
                  fontSize: "var(--font-size-180)",
                  fontWeight: "var(--font-weight-700)",
                  color: "var(--text-primary)",
                }}
              >
                {step.title}
              </Typography>

              {/* Description */}
              <Typography
                sx={{
                  fontWeight: "var(--font-weight-400)",
                  fontSize: "var(--font-size-14)",
                  color: "var(--text-secondary)",
                }}
              >
                {step.description}
              </Typography>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BookingCard;
