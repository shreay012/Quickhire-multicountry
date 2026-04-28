"use client";

import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, TextField, Checkbox, Button, Dialog, DialogContent } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useStepperContext } from "./StepperContext";
import { useSelector, useDispatch } from "react-redux";
import { useSearchParams } from "next/navigation";
import { fetchJobById } from "@/lib/redux/slices/bookingSlice/bookingSlice";
import { paymentService } from "@/lib/services/paymentApi";
import { bookingService } from "@/lib/services/bookingApi";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  sendOtp,
  verifyOtp,
  clearError,
  resetOtpState,
  completeProfile,
  setAuthenticatedAfterDetails,
  setAuthFromStorage,
} from "@/lib/redux/slices/authSlice/authSlice";
import {
  getUserProfile,
  updateUserProfile,
} from "@/lib/redux/slices/userProfileSlice/userProfileSlice";
import { fetchDashboardStats } from "@/lib/redux/slices/dashboardSlice";
import { fetchCustomerBookings, createJob, updateJob, setSelectedJobId, fetchJobById as fetchJobByIdBooking } from "@/lib/redux/slices/bookingSlice/bookingSlice";

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

  // Authentication states
  const [mobileNumber, setMobileNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpVerified, setOtpVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showResendTimer, setShowResendTimer] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(120);

  // New user profile fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [bookingsResponse, setBookingsResponse] = useState(null);

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const otpVerifiedRef = useRef(false);

  // Get auth state from Redux
  const {
    isLoading,
    error,
    otpSent: reduxOtpSent,
    isNewUser,
    user: authUser,
  } = useSelector((state) => state.auth);

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

  // Check authentication on mount - show login modal if not authenticated
  useEffect(() => {
    const token = localStorage.getItem("token");
    const isLoggedIn = !!token;

    if (!isLoggedIn) {
      console.log("🚪 Guest user at PaymentStep - showing login modal");
      setShowLoginModal(true);
    } else {
      console.log("👤 User already authenticated at PaymentStep");
    }
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

    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    // Get jobId from query params (should be set after login)
    const currentJobId = searchParams.get("jobId");
    if (!currentJobId) {
      alert("No job ID found. Please try again.");
      return;
    }

    try {
      setIsProcessingPayment(true);

      console.log("💳 Initiating payment for job ID:", currentJobId);
      console.log("💵 Payment amount:", total);

      // Create Razorpay order
      const orderResponse = await paymentService.createOrder(currentJobId, total);
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
            router.push(`/payment-success?jobId=${currentJobId}`);

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

  // Login handlers
  const handleSendOTP = async () => {
    if (mobileNumber.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setErrorMessage(null);
      dispatch(clearError());

      const result = await dispatch(sendOtp({ mobileNumber })).unwrap();
      console.log("OTP sent result:", result);

      setOtpSent(true);
      setSuccessMessage("OTP sent successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setErrorMessage(
        typeof error === "string" ? error : error.message || "Failed to send OTP"
      );
    }
  };

  const handleVerifyOtp = async (otpString) => {
    if (otpString.length !== 4) {
      setErrorMessage("Please enter complete OTP");
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      dispatch(clearError());

      const fcmToken = "";

      const result = await dispatch(
        verifyOtp({ mobileNumber, otp: otpString, fcmToken }),
      ).unwrap();

      console.log("User role:", result?.data?.user?.role);
      console.log("OTP verification token:", result?.data?.token);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const savedToken = localStorage.getItem("token");
      const savedUserType = localStorage.getItem("userType");

      console.log("✅ Token from localStorage:", savedToken);
      console.log("✅ UserType from localStorage:", savedUserType);

      setSuccessMessage("OTP Verified");
      setOtpVerified(true);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("userLoggedIn"));
        console.log("✅ userLoggedIn event dispatched");
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const user = result.data?.user || result.user;

        const profileResult = await dispatch(getUserProfile()).unwrap();
        console.log("Fetched user profile:", profileResult);

        if (profileResult.user || profileResult) {
          const fetchedProfile = profileResult.user || profileResult;
          const completeUser = {
            ...fetchedProfile,
            id: user.id || fetchedProfile.id || fetchedProfile._id,
            mobile: user.mobile || fetchedProfile.mobile,
            role: user.role || fetchedProfile.role,
          };
          localStorage.setItem("user", JSON.stringify(completeUser));
        }

        if (!result.data?.isNewUser) {
          console.log("📚 Fetching customer bookings for existing user...");
          const bookingsResponse = await dispatch(
            fetchCustomerBookings("pending"),
          ).unwrap();
          console.log(
            "📚 Bookings API Response (Existing User):",
            bookingsResponse?.data?.[0]?._id,
          );
          setBookingsResponse(bookingsResponse);

          if (bookingsResponse.data && bookingsResponse.data.length > 0) {
            const jobId = bookingsResponse.data[0]._id;
            dispatch(setSelectedJobId(jobId));
            console.log("💾 Stored job ID:", jobId);
            // Update URL with jobId for payment
            router.push(`?jobId=${jobId}`, { scroll: false });
          }

          console.log("✅ Customer bookings fetched successfully");
        } else {
          console.log("🆕 New user - creating job from stored pricing data");
          // Create job for new user
          const storedPricingData = localStorage.getItem("_pricing_data");
          if (storedPricingData) {
            const pricingData = JSON.parse(storedPricingData);
            const serviceData = pricingData.data?.servicesWithPricing?.[0];
            if (serviceData) {
              const jobPayload = {
                services: [{
                  serviceId: serviceData.serviceId?._id || serviceData.serviceId,
                  technologyIds: (serviceData.technologyIds || []).map(t => typeof t === "string" ? t : t._id || t.id || t).filter(Boolean),
                  selectedDays: serviceData.selectedDays || 1,
                  requirements: serviceData.requirements || "Booked from web",
                  preferredStartDate: serviceData.preferredStartDate,
                  preferredEndDate: serviceData.preferredEndDate,
                  durationTime: serviceData.durationTime,
                  startTime: serviceData.timeSlot?.startTime || "09:00",
                  endTime: serviceData.timeSlot?.endTime || "18:00",
                  timeSlot: { startTime: serviceData.timeSlot?.startTime || "09:00", endTime: serviceData.timeSlot?.endTime || "18:00" },
                  bookingType: serviceData.bookingType || "later",
                }],
              };

              try {
                const jobResponse = await dispatch(createJob(jobPayload)).unwrap();
                console.log("✅ Job created for new user:", jobResponse);
                const newJobId = jobResponse.data?._id || jobResponse._id;
                if (newJobId) {
                  dispatch(setSelectedJobId(newJobId));
                  router.push(`?jobId=${newJobId}`, { scroll: false });
                }
              } catch (jobError) {
                console.error("❌ Failed to create job for new user:", jobError);
              }
            }
          }
        }
      } catch (profileError) {
        console.error("Failed to fetch profile or bookings:", profileError);
      }

      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);

      // Close login modal
      setShowLoginModal(false);
    } catch (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || "Invalid OTP. Please try again.",
      );
      setOtpVerified(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 1);
    if (!cleaned) {
      const nextOtp = [...otp];
      nextOtp[index] = "";
      setOtp(nextOtp);
      return;
    }

    const dummyOtp = ["1", "2", "3", "4"];
    setOtp(dummyOtp);

    if (errorMessage) {
      setErrorMessage(null);
    }

    if (index < 3) {
      otpRefs[index + 1].current?.focus();
    }

    if (!isLoading && otpSent) {
      handleVerifyOtp(dummyOtp.join(""));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleMobileNumberChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,10}$/.test(value)) {
      setMobileNumber(value);
      if (otpSent) {
        setOtp(["", "", "", ""]);
        setOtpSent(false);
        setErrorMessage(null);
        setSuccessMessage(null);
        setOtpVerified(false);
        dispatch(resetOtpState());
      }
    }
  };

  // Update OTP verified ref
  useEffect(() => {
    otpVerifiedRef.current = otpVerified;
  }, [otpVerified]);

  // Update error message when Redux error changes
  useEffect(() => {
    if (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || "An error occurred",
      );
    }
  }, [error]);

  // Update OTP step when OTP is sent
  useEffect(() => {
    if (reduxOtpSent) {
      setOtpSent(true);
      setResendSeconds(120);
      setShowResendTimer(true);
    }
  }, [reduxOtpSent]);

  // Timer for resend OTP functionality
  useEffect(() => {
    let timer;
    if (showResendTimer && resendSeconds > 0) {
      timer = setTimeout(() => {
        setResendSeconds(resendSeconds - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [showResendTimer, resendSeconds]);

  const startResendTimer = () => {
    setResendSeconds(120);
    setShowResendTimer(true);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
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

      {/* Login Modal */}
      <Dialog
        open={showLoginModal}
        onClose={() => {}}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "16px",
            padding: { xs: 2, sm: 3 },
          },
        }}
      >
        <DialogContent sx={{ padding: 0 }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography
              sx={{
                fontSize: { xs: "20px", sm: "24px" },
                fontWeight: 700,
                color: "#1F2937",
                mb: 1,
              }}
            >
              Login Required
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "14px", sm: "16px" },
                color: "#6B7280",
              }}
            >
              Please login to complete your booking
            </Typography>
          </Box>

          {/* Error Message */}
          {errorMessage && (
            <Box
              sx={{
                mb: 3,
                padding: "10px 16px",
                backgroundColor: "#EF4444",
                borderRadius: "26px",
                border: "1px solid #EF4444",
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: "13px", sm: "14px" },
                  fontWeight: 500,
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                {errorMessage}
              </Typography>
            </Box>
          )}

          {/* Success Message */}
          {successMessage && (
            <Box
              sx={{
                mb: 3,
                padding: "12px 16px",
                backgroundColor: "#D1FAE5",
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
                {successMessage}
              </Typography>
            </Box>
          )}

          {/* Mobile Number */}
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: { xs: "13px", sm: "14px", md: "12px" },
                fontWeight: 500,
                color: "#1F2937",
                mb: 1.5,
              }}
            >
              Mobile Number{" "}
              <Box component="span" sx={{ color: "#EF4444" }}>
                *
              </Box>
            </Typography>

            <Box sx={{ position: "relative" }}>
              <TextField
                fullWidth
                placeholder="Enter Mobile Number"
                value={mobileNumber}
                onChange={handleMobileNumberChange}
                disabled={otpSent}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: { xs: "13px", sm: "14px", md: "14px" },
                    backgroundColor: "#fff",
                    borderRadius: { xs: "8px", sm: "12px" },
                    paddingRight: { xs: "90px", sm: "100px" },
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
                    "&.Mui-disabled": {
                      backgroundColor: "#F9FAFB",
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

              {/* Send OTP Button */}
              <Button
                onClick={handleSendOTP}
                disabled={mobileNumber.length !== 10 || otpSent}
                sx={{
                  position: "absolute",
                  right: { xs: "8px", sm: "10px" },
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: { xs: "12px", sm: "13px", md: "14px" },
                  fontWeight: 600,
                  color: "#45A735",
                  textTransform: "none",
                  padding: { xs: "4px 8px", sm: "6px 10px" },
                  minWidth: "auto",
                  backgroundColor: "transparent",
                  "&:hover": {
                    backgroundColor: "rgba(69, 167, 53, 0.04)",
                  },
                  "&:disabled": {
                    color: "#9CA3AF",
                  },
                }}
              >
                {otpVerified ? "✓ Verified" : "Send OTP"}
              </Button>
            </Box>
          </Box>

          {/* OTP Input */}
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: { xs: "13px", sm: "14px", md: "13px" },
                fontWeight: 500,
                color: "#1F2937",
                mb: 1.5,
              }}
            >
              OTP{" "}
              <Box component="span" sx={{ color: "#EF4444" }}>
                *
              </Box>
            </Typography>

            <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
              {otp.map((digit, index) => (
                <TextField
                  key={index}
                  inputRef={otpRefs[index]}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  inputProps={{
                    maxLength: 1,
                    style: {
                      textAlign: "center",
                      fontSize: "18px",
                      fontWeight: "600",
                    },
                  }}
                  sx={{
                    width: { xs: "40px", sm: "48px" },
                    "& .MuiOutlinedInput-root": {
                      height: { xs: "40px", sm: "48px" },
                      borderRadius: "8px",
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
                  }}
                />
              ))}
            </Box>

            {/* Resend Timer */}
            {showResendTimer && resendSeconds > 0 && (
              <Typography
                sx={{
                  fontSize: "12px",
                  color: "#6B7280",
                  textAlign: "center",
                  mt: 1,
                }}
              >
                Resend OTP in {formatTime(resendSeconds)}
              </Typography>
            )}
          </Box>
        </DialogContent>
      </Dialog>

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
