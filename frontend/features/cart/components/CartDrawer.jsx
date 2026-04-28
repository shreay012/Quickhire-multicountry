"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { paymentService } from "@/lib/services/paymentApi";
import { bookingService } from "@/lib/services/bookingApi";
import { useDispatch, useSelector } from "react-redux";
import { useTranslations } from "next-intl";
import { usePrice } from "@/lib/hooks/usePrice";
import { selectTaxInfo } from "@/lib/redux/slices/regionSlice/regionSlice";

import { fetchDashboardStats } from "@/lib/redux/slices/dashboardSlice";

const CartDrawer = ({ isOpen, onClose, jobData, onRefresh }) => {
  const router = useRouter();
  const t = useTranslations("cart");
  const { format: fmtMoney } = usePrice();
  const { taxRate, taxLabel } = useSelector(selectTaxInfo);
  const [cartItems, setCartItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const dispatch = useDispatch();

  useEffect(() => {
    if (jobData && jobData.data) {
      // Extract services array from job data - API returns data.job.services
      const services = jobData.data.job?.services || [];
      console.log("📦 Cart items loaded:", services);
      setCartItems(services);
    } else {
      setCartItems([]);
    }
  }, [jobData]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

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

  const handleRemoveItem = (id) => {
    console.log("🗑️ Remove item with id:", id);
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmRemoveItem = async () => {
    if (!itemToDelete || !jobData?.data?.job) return;

    try {
      setIsProcessing(true);
      const jobId = jobData.data.job._id || jobData.data.job.id;

      console.log("🗑️ Deleting service:", itemToDelete);
      console.log("📌 Job ID:", jobId);

      // Call API to remove service from job
      const response = await bookingService.updateJob(jobId, {
        removeServiceIds: [itemToDelete],
      });

      dispatch(fetchDashboardStats());

      console.log("✅ Service deleted:", response.data);

      // Remove item from local state
      setCartItems(cartItems.filter((item) => item._id !== itemToDelete));

      // Refresh cart data by calling parent's refresh function
      if (onRefresh) {
        console.log("🔄 Refreshing cart...");
        await onRefresh();
      }

      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("❌ Error deleting service:", error);
      alert("Failed to delete service. Please try again.");
      setShowDeleteModal(false);
      setItemToDelete(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelRemoveItem = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getBookingTypeText = (item) => {
    const bookingType = item.serviceId?.bookingType;
    return bookingType === "instant" ? t("instant") : t("scheduleLater");
  };

  // Handle Proceed to Checkout - Razorpay Integration
  const handleProceedToCheckout = async (e) => {
    e.preventDefault();

    if (!jobData?.data?.job) {
      alert("Cart data not available");
      return;
    }

    try {
      setIsProcessing(true);

      // Extract jobId and amount from cart data
      const jobId = jobData.data.job.id;
      const amount = jobData.data.job.pricing.totalPriceWithGst;

      console.log("💳 Creating payment order...", { jobId, amount });

      // Step 1: Call create order API
      const orderResponse = await paymentService.createOrder(jobId, amount);

      console.log("✅ Order created:", orderResponse.data);

      // Extract payment data from response
      const paymentData = orderResponse.data.data;

      // Step 2: Configure Razorpay options
      const razorpayOptions = {
        key: paymentData.keyId, // Razorpay key from API response
        amount: paymentData.amount * 100, // Amount in paise
        currency: paymentData.currency, // Currency (INR)
        name: "QuickHire",
        description: "Service Booking Payment",
        order_id: paymentData.razorpayOrderId, // Razorpay order ID

        // Payment success handler
        handler: async function (response) {
          console.log("💰 Payment successful:", response);

          // Check payment status
          try {
            const statusResponse = await paymentService.getPaymentStatus(
              paymentData.paymentId,
            );
            console.log("📊 Payment status:", statusResponse.data);

            // Clear payment-related data from localStorage
            localStorage.removeItem("_current_job_id");
            localStorage.removeItem("_pricing_data");
            console.log("🧹 Cleared payment data from localStorage");

            // Close cart drawer
            onClose();

            // Navigate to success page
            router.push(`/payment-success?jobId=${jobId}`);

            // Optional: Redirect to success page
            // window.location.href = '/booking-success';
          } catch (error) {
            console.error("❌ Error checking payment status:", error);
            alert(
              "Payment completed but status check failed. Please contact support.",
            );
          }
        },

        // Prefill user details
        prefill: {
          name: paymentData.userDetails?.name || "",
          email: paymentData.userDetails?.email || "",
          contact: paymentData.userDetails?.mobile || "",
        },

        // Notes (optional)
        notes: {
          jobId: jobId,
          bookingType: paymentData.bookingType,
        },

        // Theme customization
        theme: {
          color: "#45A735",
        },

        // Modal settings
        modal: {
          ondismiss: function () {
            console.log("⚠️ Payment cancelled by user");
            setIsProcessing(false);
          },
        },
      };

      // Step 4: Open Razorpay checkout
      if (window.Razorpay) {
        const razorpay = new window.Razorpay(razorpayOptions);
        razorpay.open();
        setIsProcessing(false);
      } else {
        throw new Error("Razorpay SDK not loaded");
      }
    } catch (error) {
      console.error("❌ Error creating payment order:", error);
      alert("Failed to initiate payment. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          {/* Modal Backdrop */}
          <div className="fixed inset-0 bg-black/50 z-[80] transition-opacity duration-300" />

          {/* Modal Content */}
          <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
            <div
              className="rounded-2xl p-8 w-[90%] max-w-sm text-center pointer-events-auto shadow-lg"
              style={{
                background:
                  "linear-gradient(0.01deg, #FFFFFF 0.01%, #DDEFDA 99.99%)",
              }}
            >
              {/* Close Button - Top Right */}
              <button
                onClick={cancelRemoveItem}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close modal"
              >
                <CloseIcon sx={{ fontSize: 24 }} />
              </button>

              {/* Trash Icon */}
              <div className="flex justify-center mb-6 pt-2">
                <div className="w-12 h-12 flex items-center justify-center">
                  <Image src="/Trash.svg" alt="Delete" width={72} height={72} />
                </div>
              </div>

              {/* Title */}
              <h3
                style={{
                  color: "#000000",
                  fontWeight: 600,
                  fontSize: "18px",
                }}
                className="mb-2 sm:text-lg md:text-xl lg:text-2xl"
              >
                {t("removeTitle")}
              </h3>

              {/* Description */}
              <p
                style={{
                  color: "#636363",
                  fontWeight: 400,
                  fontSize: "14px",
                }}
                className="mb-8 sm:text-sm md:text-base lg:text-base"
              >
                {t("removeDesc")}
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={confirmRemoveItem}
                  className="flex-1 bg-[#45A735] text-white font-semibold py-3 px-4 rounded-lg hover:bg-[#3d9230] transition-colors"
                >
                  {t("remove")}
                </button>
                <button
                  onClick={cancelRemoveItem}
                  className="flex-1 bg-white text-[#45A735] font-semibold py-3 px-4 rounded-lg border-2 border-[#45A735] hover:bg-green-50 transition-colors"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Backdrop - Only render when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full sm:w-[550px] md:w-[600px] lg:w-[600px] bg-white z-[70]
          transform transition-transform duration-300 ease-in-out
          flex flex-col
          ${isOpen ? "translate-x-0 shadow-2xl" : "translate-x-full"}
        `}
      >
        {/* Close Button - Positioned outside on left */}
        {isOpen && (
          <div className="absolute top-4 -left-14 z-10">
            <IconButton
              onClick={onClose}
              sx={{
                backgroundColor: "white",
                color: "#000",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </div>
        )}

        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <h2
            style={{
              color: "#000000",
              fontWeight: 600,
              fontSize: "24px",
            }}
          >
            {t("title")}
          </h2>
          {/* Close Button - Mobile Only */}
          <button
            onClick={onClose}
            className="sm:hidden p-2 hover:opacity-70 transition-opacity"
            aria-label="Close cart"
          >
            <Image src="/closeicon.svg" alt="Close" width={28} height={28} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Image
                src="/images/cart/cartpage.png"
                alt="Empty Cart"
                width={190}
                height={150}
                className="mb-4"
              />
              <p
                style={{
                  color: "#242424",
                  fontWeight: 600,
                  fontSize: "16px",
                }}
                className="mb-2"
              >
                {t("empty")}
              </p>
              <p
                style={{
                  color: "#484848",
                  fontWeight: 400,
                  fontSize: "14px",
                }}
                className="mb-6"
              >
                {t("emptyDesc")}
              </p>
              <Link
                href="/book-your-resource#book-experts-section"
                onClick={onClose}
                className="px-6 py-3 bg-[#45A735] text-white rounded-lg font-semibold hover:bg-[#3d9230] transition-colors"
              >
                {t("browseServices")}
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cart Items List */}
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item._id}
                    className="relative p-5 rounded-xl border-1 border-[#78EB54] transition-all hover:shadow-md"
                    style={{
                      background:
                        "linear-gradient(0.01deg, #FFFFFF 0.01%, #F0FFEE 99.99%)",
                    }}
                  >
                    {/* Delete Icon - Top Right */}
                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      className="absolute top-4 right-4 hover:opacity-70 transition-opacity"
                      aria-label="Remove item"
                    >
                      <Image
                        src="/Trash.svg"
                        alt="Delete"
                        width={24}
                        height={24}
                      />
                    </button>

                    {/* Service Name */}
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-1">{t("service")}</p>
                      <h3
                        style={{
                          color: "#000000",
                          fontWeight: 500,
                        }}
                        className="text-sm sm:text-base md:text-base lg:text-lg"
                      >
                        {item.serviceId?.name || "Service"}
                      </h3>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-200 mb-4"></div>

                    {/* Technical Skills */}
                    <div className="mb-4">
                      <p
                        style={{
                          color: "#484848",
                          fontWeight: 500,
                        }}
                        className="text-xs mb-1"
                      >
                        {t("technicalSkills")}
                      </p>
                      <p
                        style={{
                          color: "#000000",
                          fontWeight: 400,
                        }}
                        className="text-xs sm:text-xs md:text-sm lg:text-sm"
                      >
                        {item.technologyIds
                          ?.map((tech) => tech.name)
                          .join(", ") || "-"}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-200 mb-4"></div>

                    {/* Hours & Total Cost | Booking Type */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Hours & Total Cost */}
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <p
                            style={{
                              color: "#484848",
                              fontWeight: 500,
                            }}
                            className="text-xs"
                          >
                            {t("hoursCost")}
                          </p>
                          <Tooltip
                            title={t("taxTooltip", { taxLabel: taxLabel || "GST", taxRate: Math.round((taxRate || 0.18) * 100) })}
                            arrow
                          >
                            <InfoOutlinedIcon
                              sx={{ fontSize: 16, color: "#45A735" }}
                            />
                          </Tooltip>
                        </div>
                        <p
                          style={{
                            color: "#000000",
                            fontWeight: 500,
                          }}
                          className="text-xs sm:text-xs md:text-sm lg:text-sm"
                        >
                          {item.durationTime || 0} hours / {fmtMoney(item.pricing?.basePrice || 0)}
                        </p>
                      </div>

                      {/* Booking Type */}
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <p
                            style={{
                              color: "#484848",
                              fontWeight: 500,
                            }}
                            className="text-xs"
                          >
                            {t("bookingType")}
                          </p>
                          <Tooltip title={t("bookingTypeTooltip")} arrow>
                            <InfoOutlinedIcon
                              sx={{ fontSize: 16, color: "#45A735" }}
                            />
                          </Tooltip>
                        </div>
                        <p
                          style={{
                            color: "#000000",
                            fontWeight: 500,
                          }}
                          className="text-xs sm:text-xs md:text-sm lg:text-sm"
                        >
                          {getBookingTypeText(item)}
                        </p>
                        {item.preferredStartDate && (
                          <p
                            style={{
                              color: "#484848",
                              fontWeight: 400,
                              fontSize: "10px",
                            }}
                            className="italic mt-0.5"
                          >
                            {t("startingFrom", { date: formatDate(item.preferredStartDate) })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add More Resource Section */}
              <div
                className="p-4 flex items-center justify-between"
                style={{
                  background: "#26472B",
                  borderRadius: "8px",
                  backgroundImage: `url('/images/cart/cartlines.svg')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div>
                  <h3
                    style={{
                      color: "#FFFFFF",
                      fontWeight: 500,
                      fontSize: "15px",
                    }}
                    className="sm:text-sm md:text-base lg:text-lg"
                  >
                    <span className="block sm:hidden">{t("needMoreShort")}</span>
                    <span className="hidden sm:block">{t("needMore")}</span>
                  </h3>
                </div>
                <Link
                  href="/book-your-resource#book-experts-section"
                  onClick={onClose}
                  style={{
                    color: "#FFFFFF",
                    fontWeight: 500,
                    fontSize: "12px",
                  }}
                  className="px-6 py-3 bg-[#45A735] rounded-lg hover:bg-[#3d9230] transition-colors whitespace-nowrap ml-4 sm:text-xs md:text-sm lg:text-base"
                >
                  {t("addMore")}
                </Link>
              </div>

              {/* Price Breakdown Section */}
              <div
                className="p-4"
                style={{
                  border: "1px solid #D9D9D9",
                  borderRadius: "16px",
                }}
              >
                <h3
                  style={{
                    color: "#484848",
                    fontWeight: 600,
                    fontSize: "18px",
                  }}
                  className="mb-4"
                >
                  {t("priceBreakdown")}
                </h3>

                {/* Divider */}
                <div className="h-px bg-gray-200 mb-4"></div>

                <div className="space-y-3">
                  {/* Subtotal */}
                  <div className="flex justify-between">
                    <p style={{ color: "#909090", fontWeight: 500 }} className="text-xs sm:text-xs md:text-sm lg:text-sm">
                      {t("subtotal")}
                    </p>
                    <p style={{ color: "#484848", fontWeight: 600 }} className="text-xs sm:text-xs md:text-sm lg:text-sm">
                      {fmtMoney(jobData?.data?.job?.pricing?.totalPrice || 0)}
                    </p>
                  </div>

                  {/* Tax — label and rate from user's country */}
                  <div className="flex justify-between">
                    <p style={{ color: "#909090", fontWeight: 500 }} className="text-xs sm:text-xs md:text-sm lg:text-sm">
                      {taxLabel || "GST"} ({Math.round((taxRate || 0.18) * 100)}%)
                    </p>
                    <p style={{ color: "#484848", fontWeight: 600 }} className="text-xs sm:text-xs md:text-sm lg:text-sm">
                      {fmtMoney(jobData?.data?.job?.pricing?.gstAmount || 0)}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-200"></div>

                  {/* Total */}
                  <div className="flex justify-between">
                    <p style={{ color: "#000000", fontWeight: 600 }} className="text-xs sm:text-xs md:text-sm lg:text-sm">
                      {t("total")}
                    </p>
                    <p style={{ color: "#000000", fontWeight: 600 }} className="text-xs sm:text-xs md:text-sm lg:text-sm">
                      {fmtMoney(jobData?.data?.job?.pricing?.totalPriceWithGst || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer - Proceed to Checkout Button */}
        {cartItems.length > 0 && (
          <div className="p-6 flex justify-end">
            <button
              onClick={handleProceedToCheckout}
              disabled={isProcessing}
              style={{
                fontWeight: 600,
              }}
              className={`px-8 py-4 bg-[#45A735] text-white text-center rounded-xl text-sm sm:text-sm md:text-base lg:text-base transition-colors ${
                isProcessing
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-[#3d9230]"
              }`}
            >
              {isProcessing ? t("processing") : t("proceedCheckout")}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
