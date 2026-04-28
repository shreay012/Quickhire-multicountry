"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import {
  selectCart,
  hydrateCart,
  clearCart,
} from "@/lib/redux/slices/cartSlice/cartSlice";
import { selectTaxInfo } from "@/lib/redux/slices/regionSlice/regionSlice";
import { paymentService } from "@/lib/services/paymentApi";
import { usePrice } from "@/lib/hooks/usePrice";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const { format: fmtMoney } = usePrice();
  const dispatch = useDispatch();
  const router = useRouter();
  const cart = useSelector(selectCart);
  const { taxRate, taxLabel } = useSelector(selectTaxInfo);
  const items = cart.items || [];

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    dispatch(hydrateCart());
  }, [dispatch]);

  const jobIdFromCart = useMemo(() => {
    for (const i of items) {
      if (i?.meta?.jobId) return i.meta.jobId;
    }
    return null;
  }, [items]);

  const isLoggedIn =
    typeof window !== "undefined" && !!window.localStorage.getItem("token");

  async function handlePay() {
    setError(null);

    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent("/checkout")}`);
      return;
    }
    if (!jobIdFromCart) {
      setError(
        "No active job linked to this cart. Please re-add the service from the booking flow.",
      );
      return;
    }
    if (!items.length) {
      setError("Cart is empty.");
      return;
    }

    setIsProcessing(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Failed to load Razorpay SDK");

      const orderResponse = await paymentService.createOrder(
        jobIdFromCart,
        cart.total,
      );
      const paymentData = orderResponse.data?.data || orderResponse.data;

      const options = {
        key: paymentData.keyId,
        amount: paymentData.amount * 100,
        currency: paymentData.currency || "INR",
        name: "QuickHire",
        description: "Service Booking Payment",
        order_id: paymentData.razorpayOrderId,
        handler: async function () {
          try {
            await paymentService.getPaymentStatus(paymentData.paymentId);
            dispatch(clearCart());
            router.push(`/payment-success?jobId=${jobIdFromCart}`);
          } catch (e) {
            console.error("Payment status check failed", e);
            dispatch(clearCart());
            router.push(`/payment-success?jobId=${jobIdFromCart}`);
          }
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
        theme: { color: "#45A735" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        console.error("Razorpay failed", resp);
        setError(resp?.error?.description || "Payment failed");
        setIsProcessing(false);
      });
      rzp.open();
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || e.message || "Checkout failed");
      setIsProcessing(false);
    }
  }

  if (!items.length) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          {t("emptyTitle")}
        </h1>
        <p className="text-gray-500 mb-6">
          {t("emptyDesc")}
        </p>
        <button
          type="button"
          onClick={() => router.push("/book-your-resource")}
          className="px-6 py-3 rounded-lg bg-[#45A735] text-white font-semibold hover:bg-[#26472B] transition-colors"
        >
          {t("browseServices")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
        {t("title")}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex gap-4 p-4 rounded-xl border border-gray-200 bg-white"
            >
              <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {item.name}
                </h3>
                {item.duration && (
                  <p className="text-sm text-gray-500">{item.duration}</p>
                )}
                {item.meta?.technicalSkills && (
                  <p className="text-xs text-gray-400 truncate">
                    {item.meta.technicalSkills}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {fmtMoney(Number(item.price))}
                </p>
                <p className="text-xs text-gray-500">{t("qty", { count: item.quantity })}</p>
              </div>
            </article>
          ))}
        </section>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 p-6 rounded-xl border border-gray-200 bg-white space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("orderSummary")}
            </h2>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t("subtotal")}</span>
              <span>{fmtMoney(cart.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{taxLabel || "GST"} ({Math.round((taxRate || 0.18) * 100)}%)</span>
              <span>{fmtMoney(cart.tax || 0)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between text-base font-semibold text-gray-900">
              <span>{t("total")}</span>
              <span>{fmtMoney(cart.total || 0)}</span>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded p-2">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full py-3 rounded-lg bg-[#45A735] text-white font-semibold hover:bg-[#26472B] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isProcessing
                ? t("processing")
                : isLoggedIn
                  ? t("payNow")
                  : t("loginToPay")}
            </button>

            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="w-full py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              {t("backToCart")}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
