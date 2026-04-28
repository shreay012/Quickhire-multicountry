"use client";

import { useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/store/hooks";
import { fetchServiceById } from "@/lib/redux/slices/discoverSlice/discoverserviceSlice";

import { LeftComponent, RightComponent } from "@/features/services/components";
import CustomProgressScrollbar from "@/components/ui/CustomProgressScrollbar";

export default function ServiceDetailsPage() {
  const leftScrollRef = useRef(null);
  const params = useParams();
  const { id } = params;

  const dispatch = useAppDispatch();
  const { selectedService, isLoadingDetail } = useAppSelector((state) => state.services);

  useEffect(() => {
    if (id) {
      // Try to get service from sessionStorage first (fast)
      const cached = typeof window !== "undefined"
        ? sessionStorage.getItem("selectedService")
        : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?._id === id) {
            // Already in Redux via sessionStorage — also fetch fresh from API
            dispatch(fetchServiceById(id));
            return;
          }
        } catch {}
      }
      dispatch(fetchServiceById(id));
    }
  }, [id, dispatch]);

  const service = selectedService || null;

  if (isLoadingDetail && !service) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#45A735] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#636363]">Loading service details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-82px)] lg:overflow-hidden">
      {/* Left Side - Scrollable with Custom Scrollbar */}
      <div className="w-full lg:w-[55%] lg:relative">
        <div
          ref={leftScrollRef}
          className="lg:h-full overflow-y-auto overflow-x-hidden hide-scrollbar"
        >
          <div
            className="px-4 sm:px-6 lg:pl-0 lg:pt-0 lg:pb-0 py-6 lg:py-0"
            style={{ paddingRight: "9px" }}
          >
            <LeftComponent selectedService={service} />
          </div>
        </div>

        {/* Custom Progress Scrollbar - Desktop Only */}
        <div className="hidden lg:block">
          <CustomProgressScrollbar scrollContainerRef={leftScrollRef} />
        </div>
      </div>

      {/* Right Side - Fixed with internal scroll */}
      <div className="w-full lg:w-[45%] lg:sticky lg:top-0 lg:h-[calc(100vh-64px)] lg:overflow-hidden">
        <RightComponent serviceId={id} selectedService={service} />
      </div>
    </div>
  );
}
