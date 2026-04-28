"use client";

import React from "react";
import { Box, Typography, Chip } from "@mui/material";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

const SelectiveCard = ({ serviceData, isLoading }) => {
  // No longer fetching data here - receiving it as props
  console.log("SelectiveCard serviceData:", serviceData);

  // Get technologies dynamically from API — handles both string[] and object[]
  const engineers = (serviceData?.technologies || []).map((tech) =>
    typeof tech === 'string' ? tech : tech?.name || tech?.id || ''
  ).filter(Boolean);

  // Get notIncluded items dynamically from API, with fallback for empty array
  const notIncluded =
    serviceData?.notIncluded?.length > 0
      ? serviceData.notIncluded.map((item) =>
          typeof item === 'string' ? item : item?.name || item?.id || ''
        ).filter(Boolean)
      : [
          "Software licenses or paid third-party tools",
          "Support beyond timelines",
          "Work beyond the defined project scope",
          "Weekends & national holiday support.",
        ];

  const promises = [
    "Verified professionals assigned to your task",
    "Support Extension Option",
    "Transparent, upfront pricing",
    "Delivery as Scheduled",
  ];

  if (isLoading) {
    return (
      <section style={{ backgroundColor: "#FFFFFF", padding: "48px 16px" }}>
        <div className="max-w-7xl mx-auto text-center">
          <Typography>Loading service details...</Typography>
        </div>
      </section>
    );
  }

  return (
    <section style={{ backgroundColor: "#FFFFFF", padding: "48px 16px" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Typography
            sx={{
              fontSize: "var(--font-size-14 )",
              color: "var(--text-secondary)",
              fontWeight: "var(--font-weight-500)",
              marginBottom: "8px",
            }}
          >
            Select the Right fit for you
          </Typography>
          <Typography
            variant="h2"
            className="font-bold"
            sx={{
              fontSize: { xs: "2rem", md: "2.5rem", lg: "var(--font-size-24)" },
              fontWeight: "var(--font-weight-700)",
              color: "var(--text-primary)",
            }}
          >
            Curated Engineers For You
          </Typography>
        </div>

        {/* Engineers Chips - Dynamic from API */}
        {engineers.length > 0 ? (
          <div className="flex flex-wrap justify-center items-center gap-4 mb-16 max-w-4xl mx-auto">
            {engineers.map((engineerName, index) => (
              <Chip
                key={index}
                label={engineerName}
                icon={
                  <ArrowOutwardIcon
                    sx={{
                      fontSize: "24px !important",
                      color: "#45A735 !important",
                    }}
                  />
                }
                sx={{
                  backgroundColor: "#45A73512",
                  padding: "24px 16px",
                  fontSize: "var(--font-size-18)",
                  fontWeight: "var(--font-weight-400)",
                  color: "var(--text-primary)",
                  borderRadius: "50px",
                  "& .MuiChip-label": {
                    paddingRight: "12px",
                    paddingLeft: "8px",
                  },
                  "& .MuiChip-icon": {
                    order: 1,
                    marginLeft: "8px",
                    marginRight: "0",
                  },
                  "&:hover": {
                    backgroundColor: "#45A73512",
                    cursor: "pointer",
                  },
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center mb-16">
            <Typography sx={{ color: "var(--text-secondary)" }}>
              No technologies available for this service
            </Typography>
          </div>
        )}

        {/* Divider Line */}
        <div className="max-w-6xl mx-auto mb-12">
          <hr style={{ border: "none", borderTop: "1px solid #E5E7EB" }} />
        </div>

        {/* Transparent Execution Section */}
        <div className="text-center mb-8 max-w-4xl mx-auto">
          <Typography
            sx={{
              fontSize: { xs: "24px", md: "24px", lg: "var(--font-size-24)" },
              fontWeight: "var(--font-weight-500)",
              color: "var(--dark-text-primary)",
              mb: 2,
            }}
          >
            Transparent Execution
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "15px", md: "var(--font-size-14)" },
              fontWeight: "var(--font-weight-400)",
              color: "var(--text-secondary)",
              mb: 4,
            }}
          >
            Transparency built into every stage of execution.
          </Typography>

          {/* Working Hours Badge */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              backgroundColor: "#E8F5E6",
              padding: "12px 24px",
              borderRadius: "50px",
              border: "1px solid #D1E7CE",
              mb: 6,
            }}
          >
            <CheckCircleIcon sx={{ color: "#45A735", fontSize: "24px" }} />
            <Typography
              sx={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#1F2937",
              }}
            >
              Monday–Friday • 9 AM – 6 PM IST
            </Typography>
          </Box>
        </div>

        {/* Promises and Not Included Boxes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* QuickHire Promises */}
          <Box
            sx={{
              border: "2px solid #45A735",
              borderRadius: "16px",
              padding: "32px",
              backgroundColor: "#F5FFF5",
            }}
          >
            <Typography
              sx={{
                fontSize: "24px",
                fontWeight: 600,
                color: "#1F2937",
                marginBottom: "24px",
                paddingLeft: "12px",
                borderLeft: "4px solid #45A735",
              }}
            >
              What You Get
            </Typography>
            <div className="space-y-3">
              {promises.map((promise, index) => (
                <Box
                  key={index}
                  className="flex items-center gap-3 px-4 py-3 rounded-full"
                  sx={{
                    backgroundColor: "#E8F5E6",
                  }}
                >
                  <CheckCircleIcon
                    sx={{ color: "#45A735", fontSize: "24px" }}
                  />
                  <Typography
                    sx={{
                      fontSize: "15px",
                      color: "#374151",
                      fontWeight: 500,
                    }}
                  >
                    {promise}
                  </Typography>
                </Box>
              ))}
            </div>
          </Box>

          {/* What is not Included */}
          <Box
            sx={{
              border: "2px solid #EF4444",
              borderRadius: "16px",
              padding: "32px",
              backgroundColor: "#FFF5F5",
            }}
          >
            <Typography
              sx={{
                fontSize: "24px",
                fontWeight: 600,
                color: "#1F2937",
                marginBottom: "24px",
                paddingLeft: "12px",
                borderLeft: "4px solid #EF4444",
              }}
            >
              What's not Included
            </Typography>
            <div className="space-y-3">
              {notIncluded.map((item, index) => (
                <Box
                  key={index}
                  className="flex items-center gap-3 px-4 py-3 rounded-full"
                  sx={{
                    backgroundColor: "#FEE2E2",
                  }}
                >
                  <CancelIcon sx={{ color: "#EF4444", fontSize: "24px" }} />
                  <Typography
                    sx={{
                      fontSize: "15px",
                      color: "#374151",
                      fontWeight: 500,
                    }}
                  >
                    {item}
                  </Typography>
                </Box>
              ))}
            </div>
          </Box>
        </div>
      </div>
    </section>
  );
};

export default SelectiveCard;
