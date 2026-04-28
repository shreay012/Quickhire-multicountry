"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import Image from "next/image";

const ServiceHeader = ({ serviceData, isLoading }) => {
  // No longer fetching data here - receiving it as props
  console.log("ServiceHeader serviceData:", serviceData);

  const features = [
    {
      icon: (
        <Image
          src="/images/book-services/service-icon1.svg"
          alt="Verified"
          width={24}
          height={24}
        />
      ),
      text: "400+ Verified professionals",
    },
    {
      icon: (
        <Image
          src="/images/book-services/service-icon2.svg"
          alt="Security"
          width={24}
          height={24}
        />
      ),
      text: "Enterprise-grade security",
    },
    {
      icon: (
        <Image
          src="/images/book-services/service-icon3.svg"
          alt="Pricing"
          width={24}
          height={24}
        />
      ),
      text: "Transparent hourly pricing",
    },
    {
      icon: (
        <Image
          src="/images/book-services/service-icon4.svg"
          alt="Manager"
          width={24}
          height={24}
        />
      ),
      text: "Dedicated project manager",
    },
  ];

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(243, 249, 241, 1) 0%, rgba(255, 255, 255, 1) 100%)",
        padding: "48px 16px",
      }}
    >
      <div
        className="max-w-7xl mx-auto"
        // style={{
        //   paddingTop: 'clamp(24px, 4vw, 48px)',
        //   paddingBottom: 'clamp(24px, 4vw, 48px)'
        // }}
      >
        {/* Top Badge */}
        <div className="flex justify-center mb-6">
          <Box
            sx={{
              backgroundColor: "#FFFFFF",
              padding: "8px 24px",
              borderRadius: "24px",
            }}
          >
            <Typography
              sx={{
                fontSize: "var(--font-size-16)",
                fontWeight: "var(--font-weight-600)",
                color: "var(--dark-text-primary)",
              }}
            >
              {serviceData?.name || "AI Engineer"}
            </Typography>
          </Box>
        </div>

        {/* Main Heading */}
        <div className="text-center mb-4">
          <Typography
            variant="h1"
            sx={{
              fontSize: {
                xs: "1.5rem",
                md: "2.75rem",
                lg: "var(--font-size-22)",
              },
              fontWeight: "var(--font-weight-600)",
              color: "var( --dark--text-secondary)",
              lineHeight: 1.2,
            }}
          >
            Get verified AI experts ready to start in{" "}
            <span style={{ color: "#45A735" }}>minutes</span>
          </Typography>
        </div>

        {/* Subheading */}
        <div className="text-center mb-12">
          <Typography
            sx={{
              fontSize: { xs: "16px", md: "var(--font-size-14)" },
              color: "var(--text-secondary)",
              maxWidth: "800px",
              margin: "0 auto",
            }}
          >
            Connect with top-tier professionals who can solve your challenges
            with speed and expertise.
          </Typography>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
          <div className="flex justify-center relative">
            <Box
              sx={{
                position: "relative",
                width: { xs: "280px", md: "320px" },
                height: { xs: "350px", md: "400px" },
              }}
            >
              {/* Professional Image */}
              <Image
                src="/images/book-services/service_man.png"
                alt="AI Engineer Professional"
                width={258}
                height={253}
                className="relative z-10 w-full h-full object-cover rounded-[16px]"
              />
            </Box>
          </div>

          <div className="flex flex-col gap-6">
            {/* Feature Chips Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:pr-[30px]">
              {features.map((feature, index) => (
                <Box
                  key={index}
                  sx={{
                    // backgroundColor: '#FFFFFF',
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border:
                      "1px solid var(--Ui-Color-Secondary-Light, #D9E5E3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    // boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                  }}
                >
                  {feature.icon}
                  <Typography
                    sx={{
                      fontSize: "var(--font-size-12)",
                      color: "#374151",
                      fontWeight: "var(--font-weight-400)",
                    }}
                  >
                    {feature.text}
                  </Typography>
                </Box>
              ))}
            </div>

            {/* Quote Section */}
            <Box sx={{ mt: 4 }}>
              <Image
                src="/images/book-services/service-banner.svg"
                alt="Helped 1000+ Startups ship faster"
                width={500}
                height={120}
                className="w-full h-auto"
              />
            </Box>

            {/* Building Illustration Placeholder */}
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "200px",
                height: "200px",
                opacity: 0.1,
                pointerEvents: "none",
                display: { xs: "none", lg: "block" },
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceHeader;
