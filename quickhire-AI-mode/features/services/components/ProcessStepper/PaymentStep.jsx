"use client";

import React, { useState, useEffect } from "react";
import { Box, Typography, TextField, Checkbox, Button } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useStepperContext } from "./StepperContext";
import { useSelector, useDispatch } from "react-redux";
import { useSearchParams } from "next/navigation";
import { fetchJobById } from "@/lib/redux/slices/bookingSlice/bookingSlice";
import { paymentService } from "@/lib/services/paymentApi";
import { bookingService } from "@/lib/services/bookingApi";
import Image from "next/image";
import { useRouter } from "next/navigation";

const PaymentStep = () => {
  const {
    gstNumber,
    setGstNumber,
    termsAccepted,
    setTermsAccepted,
    previousStep,
    isFirstStep,
  } = useStepperContext();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const [pricingData, setPricingData] = useState(null);
  const [bookingData, setBookingData] = useState(null);

  const router = useRouter();

  // Payment states
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Get jobId from query params
  const jobId = searchParams.get("jobId");

  // Get job details from Redux
  const { jobDetails, isFetchingJobDetails } = useSelector(
    (state) => state.booking,
  );

  // Fetch job details on mount if jobId exists in query params
  useEffect(() => {
    console.log("PaymentStep - jobId from query:", jobId);
    console.log("PaymentStep - jobDetails:", jobDetails);

    if (jobId) {
      console.log("🔄 Fetching job details for job ID:", jobId);
      dispatch(fetchJobById(jobId));
    } else {
      console.warn(
        "⚠️ No jobId found in query params. Cannot fetch job details.",
      );
    }
  }, [jobId, dispatch]);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Load data from Redux jobDetails (API data only)
  useEffect(() => {
    console.log("📋 useEffect triggered - jobDetails changed:", jobDetails);

    if (jobDetails?.job || jobDetails) {
      const job = jobDetails?.job || jobDetails;
      console.log("📊 Loading data from API (Redux jobDetails):", job);

      // Use aggregated pricing from job.pricing
      setPricingData({
        data: {
          totalPricing: job.pricing,
        },
      });

      // Format each service separately
      const allServices = job.services || [];
      const formattedServices = allServices.map((service) => {
        const techNames =
          service.technologyIds?.map((tech) => tech.name).join(", ") || "";

        const bookingTypeDisplay =
          service.serviceId?.bookingType === "instant"
            ? "Book Instantly"
            : "Schedule for Later";

        let startDateDisplay = "N/A";
        if (service.preferredStartDate) {
          if (service.serviceId?.bookingType === "instant") {
            startDateDisplay = "Immediately";
          } else {
            const startDate = new Date(service.preferredStartDate);
            startDateDisplay = startDate.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
          }
        }

        return {
          serviceName: service.serviceId?.name || "Unknown Service",
          technicalSkills: techNames,
          hours: service.durationTime || 0,
          bookingType: bookingTypeDisplay,
          startDate: startDateDisplay,
          isInstant: service.serviceId?.bookingType === "instant",
          basePrice: service.pricing?.basePrice || 0,
        };
      });

      setBookingData({
        services: formattedServices,
        totalHours: job.durationTime || 0,
      });

      console.log("✅ Formatted data from API - Services:", formattedServices);
    } else {
      console.warn("⚠️ No job details available yet");
    }
  }, [jobDetails]);

  // Calculate pricing from API response
  const subtotal = pricingData?.data?.totalPricing?.basePrice || 0;
  const gstAmount = pricingData?.data?.totalPricing?.gstAmount || 0;
  const total = pricingData?.data?.totalPricing?.totalPriceWithGst || 0;
  const discountAmount = pricingData?.data?.totalPricing?.discountAmount || 0;

  // Handle Complete Payment - Razorpay Integration
  const handleCompletePayment = async () => {
    if (!termsAccepted) return;

    if (!jobId) {
      alert("No job ID found. Please try again.");
      return;
    }

    try {
      setIsProcessingPayment(true);

      console.log("💳 Initiating payment for job ID:", jobId);
      console.log("💵 Payment amount:", total);

      // Create Razorpay order
      const orderResponse = await paymentService.createOrder(jobId, total);
      console.log("✅ Order created:", orderResponse.data);

      const paymentData = orderResponse.data.data;

      // Configure Razorpay options
      const razorpayOptions = {
        key: paymentData.keyId,
        amount: paymentData.amount * 100,
        currency: paymentData.currency,
        name: "QuickHire",
        description: "Service Booking Payment",
        order_id: paymentData.razorpayOrderId,

        handler: async function (response) {
          console.log("💰 Payment successful:", response);

          try {
            // Check payment status
            const statusResponse = await paymentService.getPaymentStatus(
              paymentData.paymentId,
            );
            console.log("📊 Payment status:", statusResponse.data);

            // Clear payment data from localStorage
            localStorage.removeItem("_current_job_id");
            localStorage.removeItem("_pricing_data");
            console.log("🧹 Cleared payment data from localStorage");

            // Redirect to payment success, carry jobId so we can go to workspace.
            router.push(`/payment-success?jobId=${jobId}`);

            // setShowPaymentSuccess(true);
            // setIsProcessingPayment(false);
          } catch (error) {
            console.error("❌ Error checking payment status:", error);
            setIsProcessingPayment(false);
            alert(
              "Payment completed but status check failed. Please contact support.",
            );
          }
        },

        prefill: {
          name: paymentData.userDetails?.name || "",
          email: paymentData.userDetails?.email || "",
          contact: paymentData.userDetails?.mobile || "",
        },

        notes: {
          jobId: jobId,
          bookingType: paymentData.bookingType,
          gstNumber: gstNumber || "N/A",
        },

        theme: {
          color: "#45A735",
        },

        modal: {
          ondismiss: function () {
            console.log("⚠️ Payment cancelled by user");
            setIsProcessingPayment(false);
          },
        },
      };

      // Open Razorpay checkout
      if (window.Razorpay) {
        const razorpay = new window.Razorpay(razorpayOptions);
        razorpay.open();
      } else {
        throw new Error("Razorpay SDK not loaded");
      }
    } catch (error) {
      console.error("❌ Error creating payment order:", error);
      alert("Failed to initiate payment. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        py: { xs: 2, sm: 2, md: 3 },
        px: { xs: 2, sm: 3, md: 2 },
        paddingLeft: { xs: 0, sm: 0, md: 0 },
        paddingBottom: { xs: 0, sm: 0, md: 0 },
        pb: 0,
      }}
    >
      {/* Loading State */}
      {isFetchingJobDetails && (
        <Box
          sx={{
            mb: 3,
            padding: "12px 16px",
            backgroundColor: "#F0F9FF",
            borderRadius: "8px",
            border: "1px solid #45A735",
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: "13px", sm: "14px" },
              fontWeight: 500,
              color: "#45A735",
            }}
          >
            🔄 Loading job details...
          </Typography>
        </Box>
      )}

      {/* Header */}
      <Typography
        sx={{
          fontSize: { xs: "20px", sm: "24px", md: "var( --font-size-24)" },
          fontWeight: "var(--font-weight-700)",
          color: "var(--text-primary)",
          mb: { xs: 1, sm: 1.5 },
          lineHeight: 1.3,
        }}
      >
        Complete Your Payment
      </Typography>

      {/* Subheading */}
      <Typography
        sx={{
          fontSize: { xs: "13px", sm: "14px", md: "var(--font-size-14)" },
          fontWeight: "var(--font-weight-500)",
          color: "var(--text-muted)",
          mb: { xs: 3, sm: 2 },
          lineHeight: 1.5,
        }}
      >
        Once payment is completed, we'll match you with a suitable expert and
        get started.
      </Typography>

      {/* Booking Summary Card */}
      {bookingData?.services && bookingData.services.length > 0 ? (
        bookingData.services.map((service, index) => (
          <Box
            key={index}
            sx={{
              background:
                "linear-gradient(0.01deg, #FFFFFF 0.01%, #F0FFEE 99.99%)",
              border: " 1px solid #78EB54",
              borderRadius: { xs: "12px", sm: "14px", md: "16px" },
              padding: { xs: "20px", sm: "24px", md: "28px" },
              mb: { xs: 2, sm: 3 },
            }}
          >
            {/* Service */}
            <Box sx={{ mb: { xs: 2.5, sm: 3, md: 2 } }}>
              <Typography
                sx={{
                  fontSize: {
                    xs: "12px",
                    sm: "12px",
                    md: "var(--font-size-12)",
                  },
                  fontWeight: "var(--font-weight-500)",
                  color: "var(--text-primary)",
                  mb: 0.75,
                }}
              >
                Service {bookingData.services.length > 1 ? `#${index + 1}` : ""}
              </Typography>
              <Typography
                sx={{
                  fontSize: {
                    xs: "18px",
                    sm: "18px",
                    md: "var(--font-size-18)",
                  },
                  fontWeight: "var(--font-weight-500)",
                  color: "var(--dark-text-primary)",
                  lineHeight: 1.3,
                }}
              >
                {service.serviceName}
              </Typography>
            </Box>

            {/* Divider Line */}
            <Box
              sx={{
                width: "100%",
                height: "1px",
                backgroundColor: "#E5E7EB",
                mb: { xs: 3, md: 2 },
              }}
            />

            {/* Technical Skills */}
            <Box sx={{ mb: { xs: 3, sm: 3.5, md: 2 } }}>
              <Typography
                sx={{
                  fontSize: {
                    xs: "12px",
                    sm: "12px",
                    md: "var( --font-size-12)",
                  },
                  fontWeight: "var( --font-weight-500)",
                  color: "var(--text-primary)",
                  mb: 0.75,
                }}
              >
                Technical skills
              </Typography>
              <Typography
                sx={{
                  fontSize: {
                    xs: "15px",
                    sm: "14px",
                    md: "var(--font-size-14)",
                  },
                  fontWeight: "var(--font-weight-400)",
                  color: "var(--dark-text-primary)",
                  lineHeight: 1.4,
                }}
              >
                {service.technicalSkills || "N/A"}
              </Typography>
            </Box>

            {/* Divider Line */}
            <Box
              sx={{
                width: "100%",
                height: "1px",
                backgroundColor: "#E5E7EB",
                mb: { xs: 3, md: 2 },
              }}
            />

            {/* Two Column Layout: Hours & Booking Type */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: { xs: 3, sm: 4 },
              }}
            >
              {/* Left Column: Hours & Total Cost */}
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mb: 0.75,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: {
                        xs: "12px",
                        sm: "12px",
                        md: "var( --font-size-12)",
                      },
                      fontWeight: "var(--font-weight-500)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Hours & Total Cost
                  </Typography>
                  <InfoOutlinedIcon
                    sx={{
                      fontSize: { xs: 16, sm: 17, md: 18 },
                      color: "#45A735",
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: {
                      xs: "15px",
                      sm: "14px",
                      md: "var(--font-size-14 )",
                    },
                    fontWeight: "var(--font-weight-500)",
                    color: "var(--dark-text-primary)",
                    lineHeight: 1.4,
                  }}
                >
                  {service.hours || 0} hours / ₹
                  {service.basePrice.toLocaleString("en-IN")}
                </Typography>
              </Box>

              {/* Right Column: Booking Type */}
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mb: 0.75,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: {
                        xs: "12px",
                        sm: "12px",
                        md: "var( --font-size-12)",
                      },
                      fontWeight: "var( --font-weight-500)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Booking type
                  </Typography>
                  <InfoOutlinedIcon
                    sx={{
                      fontSize: { xs: 16, sm: 17, md: 18 },
                      color: "#45A735",
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: {
                      xs: "15px",
                      sm: "14px",
                      md: "var(--font-size-14 )",
                    },
                    fontWeight: "var(--font-weight-500)",
                    color: "var( --dark-text-primary)",
                    lineHeight: 1.4,
                    mb: 0.5,
                  }}
                >
                  {service.bookingType}
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: "12px", sm: "13px" },
                    fontWeight: 400,
                    color: "#6B7280",
                    lineHeight: 1.4,
                  }}
                >
                  {service.isInstant
                    ? `Starting: ${service.startDate}`
                    : `Starting from ${service.startDate}`}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))
      ) : (
        <Box
          sx={{
            background:
              "linear-gradient(0.01deg, #FFFFFF 0.01%, #F0FFEE 99.99%)",
            border: " 1px solid #78EB54",
            borderRadius: { xs: "12px", sm: "14px", md: "16px" },
            padding: { xs: "20px", sm: "24px", md: "28px" },
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: "15px", sm: "16px" },
              fontWeight: 400,
              color: "#6B7280",
              textAlign: "center",
            }}
          >
            Loading booking details...
          </Typography>
        </Box>
      )}

      {/* Total Hours Summary - Only show if multiple services */}
      {bookingData?.services && bookingData.services.length > 1 && (
        <Box
          sx={{
            backgroundColor: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: { xs: "10px", sm: "12px" },
            padding: { xs: "16px", sm: "20px" },
            mb: { xs: 3, sm: 4 },
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: "14px", sm: "15px", md: "16px" },
              fontWeight: 600,
              color: "#1F2937",
            }}
          >
            Total Hours (All Services)
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "16px", sm: "17px", md: "18px" },
              fontWeight: 700,
              color: "#45A735",
            }}
          >
            {bookingData.totalHours} hours
          </Typography>
        </Box>
      )}

      {/* Price Breakdown Card */}
      <Box
        sx={{
          mt: { xs: 3, sm: 4 },
          border: " 1px solid var(--Grey-Shade-Grey-5, #D9D9D9)",
          borderRadius: { xs: "12px", sm: "14px", md: "16px" },
          padding: { xs: "20px", sm: "24px", md: "28px" },
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: "18px", sm: "20px", md: "var(--font-size-18)" },
            fontWeight: "var(--font-weight-600)",
            color: "var(--text-primary)",
            mb: { xs: 2.5, sm: 3 },
            lineHeight: 1.3,
          }}
        >
          Price Breakdown
        </Typography>

        {/* Divider Line */}
        <Box
          sx={{
            width: "100%",
            height: "1px",
            backgroundColor: "#E5E7EB",
            mb: { xs: 3, md: 2 },
          }}
        />

        {/* Subtotal */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: { xs: 1.5, sm: 2 },
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: "14px", sm: "15px", md: "16px" },
              fontWeight: 400,
              color: "#6B7280",
            }}
          >
            Subtotal
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "14px", sm: "15px", md: "16px" },
              fontWeight: 400,
              color: "#6B7280",
            }}
          >
            ₹
            {subtotal.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
        </Box>

        {/* Discount - Only show if discount > 0 */}
        {discountAmount > 0 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: { xs: 1.5, sm: 2 },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "14px", sm: "15px", md: "16px" },
                fontWeight: 400,
                color: "#45A735",
              }}
            >
              Discount
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "14px", sm: "15px", md: "16px" },
                fontWeight: 400,
                color: "#45A735",
              }}
            >
              -₹
              {discountAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Box>
        )}

        {/* GST */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: { xs: 2, sm: 2.5 },
            pb: { xs: 2, sm: 2.5 },
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: "14px", sm: "15px", md: "16px" },
              fontWeight: 400,
              color: "#6B7280",
            }}
          >
            GST (18%)
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "14px", sm: "15px", md: "16px" },
              fontWeight: 400,
              color: "#6B7280",
            }}
          >
            ₹
            {gstAmount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
        </Box>

        {/* Total */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: "16px", sm: "17px", md: "18px" },
              fontWeight: 700,
              color: "#1F2937",
            }}
          >
            Total
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "16px", sm: "17px", md: "18px" },
              fontWeight: 700,
              color: "#1F2937",
            }}
          >
            ₹
            {total.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
        </Box>
      </Box>

      {/* GST Number Input */}
      <Box sx={{ mt: { xs: 3, sm: 4 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mb: { xs: 1, sm: 1.5 },
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: "13px", sm: "14px", md: "15px" },
              fontWeight: 500,
              color: "#1F2937",
            }}
          >
            GST Number (Optional)
          </Typography>
          <InfoOutlinedIcon
            sx={{
              fontSize: { xs: 16, sm: 17, md: 18 },
              color: "#45A735",
            }}
          />
        </Box>
        <TextField
          fullWidth
          placeholder="Enter GST Number (e.g., 27AAPCT1234A1Z0)"
          value={gstNumber}
          onChange={(e) => setGstNumber(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              fontSize: { xs: "13px", sm: "14px", md: "15px" },
              backgroundColor: "#fff",
              borderRadius: { xs: "8px", sm: "10px" },
              "& fieldset": {
                borderColor: "#E5E7EB",
              },
              "&:hover fieldset": {
                borderColor: "#D1D5DB",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#45A735",
                borderWidth: "1px",
              },
            },
            "& .MuiOutlinedInput-input": {
              padding: { xs: "12px 14px", sm: "14px 16px" },
              color: "#1F2937",
              "&::placeholder": {
                color: "#9CA3AF",
                opacity: 1,
              },
            },
          }}
        />
      </Box>

      {/* Terms & Conditions Checkbox */}
      <Box
        sx={{
          mt: { xs: 2.5, sm: 3 },
          display: "flex",
          alignItems: "flex-start",
          gap: { xs: 0.5, sm: 1 },
        }}
      >
        <Checkbox
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          sx={{
            padding: 0,
            color: "#D1D5DB",
            "&.Mui-checked": {
              color: "#45A735",
            },
            "& .MuiSvgIcon-root": {
              fontSize: { xs: 20, sm: 22 },
            },
          }}
        />
        <Typography
          sx={{
            fontSize: { xs: "13px", sm: "14px", md: "15px" },
            fontWeight: 400,
            color: "#1F2937",
            lineHeight: 1.5,
            pt: 0.25,
          }}
        >
          I have read and agree to the{" "}
          <Box
            component="span"
            sx={{
              textDecoration: "underline",
              cursor: "pointer",
              "&:hover": {
                color: "#45A735",
              },
            }}
          >
            Terms & Conditions
          </Box>
          .
        </Typography>
      </Box>

      {/* Back and Complete Payment Buttons - Sticky at Bottom */}
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",
          borderTop: "1px solid #E5E7EB",
          paddingTop: { xs: "16px", sm: "20px", md: "24px" },
          paddingBottom: { xs: "16px", sm: "20px", md: "24px" },
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          zIndex: 10,
          boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)",
          width: "100%",
        }}
      >
        {!isFirstStep && (
          <Button
            onClick={previousStep}
            sx={{
              backgroundColor: "var(--text-tertiary)",
              color: "var(--text-primary)",
              fontSize: { xs: "16px", sm: "17px", md: "var(--font-size-18)" },
              fontWeight: "var(--font-weight-400)",
              padding: { xs: "12px 48px", sm: "13px 56px", md: "14px 64px" },
              borderRadius: "8px",
              textTransform: "none",
              boxShadow: "none",
              width: { xs: "48%", sm: "auto" },
              "&:hover": {
                backgroundColor: "var(--text-tertiary)",
                boxShadow: "none",
              },
              transition: "all 0.3s ease",
            }}
          >
            Back
          </Button>
        )}

        <Button
          onClick={handleCompletePayment}
          disabled={!termsAccepted || isProcessingPayment}
          sx={{
            backgroundColor: "#45A735",
            color: "#FFFFFF",
            fontSize: { xs: "16px", sm: "17px", md: "18px" },
            fontWeight: 600,
            padding: { xs: "12px 48px", sm: "13px 56px", md: "14px 64px" },
            borderRadius: "12px",
            textTransform: "none",
            boxShadow: "none",
            width: { xs: isFirstStep ? "100%" : "48%", sm: "auto" },
            marginLeft: isFirstStep ? "auto" : 0,
            "&:hover": {
              backgroundColor: "#3D9330",
              boxShadow: "none",
            },
            "&:disabled": {
              backgroundColor: "#D1D5DB",
              color: "#9CA3AF",
              cursor: "not-allowed",
            },
            transition: "all 0.3s ease",
          }}
        >
          {isProcessingPayment ? "Processing..." : "Complete Payment"}
        </Button>
      </Box>

      {/* Payment Success Full Page */}
      {showPaymentSuccess && (
        <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
          <Image
            src="/images/cart/Frame 1707481081.png"
            alt="Payment Successful"
            width={1200}
            height={800}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      )}
    </Box>
  );
};

export default PaymentStep;
