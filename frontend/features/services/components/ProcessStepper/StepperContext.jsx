"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";

const StepperContext = createContext();

// Keys used by individual steps to persist selections
const LS_PENDING = "_pending_booking";

/** Collect everything the guest selected so far into one object */
function buildSnapshot({ selectedService, selectedTechnologies, hoursBookingData, serviceId }) {
  return {
    serviceId: serviceId || (typeof window !== "undefined" ? localStorage.getItem("_service_id") : null),
    serviceName: typeof window !== "undefined" ? localStorage.getItem("_service_name") : null,
    selectedService,
    selectedTechnologies,
    hoursBookingData,
    // individual localStorage keys written by each step
    _selected_tech_ids: typeof window !== "undefined" ? localStorage.getItem("_selected_tech_ids") : null,
    _technologies_names: typeof window !== "undefined" ? localStorage.getItem("_technologies_names") : null,
    _selected_plan: typeof window !== "undefined" ? localStorage.getItem("_selected_plan") : null,
    _selected_date: typeof window !== "undefined" ? localStorage.getItem("_selected_date") : null,
    _selected_time_slot: typeof window !== "undefined" ? localStorage.getItem("_selected_time_slot") : null,
    _selected_assignment_type: typeof window !== "undefined" ? localStorage.getItem("_selected_assignment_type") : null,
    _pricing_data: typeof window !== "undefined" ? localStorage.getItem("_pricing_data") : null,
    savedAt: Date.now(),
  };
}

/** Restore individual localStorage keys from snapshot */
function restoreSnapshot(snap) {
  const keys = [
    "_service_id", "_service_name",
    "_selected_tech_ids", "_technologies_names",
    "_selected_plan", "_selected_date",
    "_selected_time_slot", "_selected_assignment_type",
    "_pricing_data",
  ];
  if (snap.serviceId) localStorage.setItem("_service_id", snap.serviceId);
  if (snap.serviceName) localStorage.setItem("_service_name", snap.serviceName);
  const lsMap = {
    "_selected_tech_ids": snap._selected_tech_ids,
    "_technologies_names": snap._technologies_names,
    "_selected_plan": snap._selected_plan,
    "_selected_date": snap._selected_date,
    "_selected_time_slot": snap._selected_time_slot,
    "_selected_assignment_type": snap._selected_assignment_type,
    "_pricing_data": snap._pricing_data,
  };
  Object.entries(lsMap).forEach(([k, v]) => { if (v) localStorage.setItem(k, v); });
}

export const useStepperContext = () => {
  const context = useContext(StepperContext);
  if (!context) {
    throw new Error("useStepperContext must be used within StepperProvider");
  }
  return context;
};

export const StepperProvider = ({ children }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTechnologies, setSelectedTechnologies] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [hoursBookingData, setHoursBookingData] = useState(null);
  const [detailsBookingData, setDetailsBookingData] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [gstNumber, setGstNumber] = useState("");
  const [isDetailsCompleted, setIsDetailsCompleted] = useState(false);
  const [restoredFromPending, setRestoredFromPending] = useState(false);
  const navigationCallbackRef = useRef(null);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const totalSteps = isAuthenticated ? 4 : 5;

  // On mount: if user is already authenticated AND a pending snapshot exists, restore it
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(LS_PENDING);
    if (!raw) return;
    try {
      const snap = JSON.parse(raw);
      // Ignore stale snapshots (older than 2 hours)
      if (Date.now() - (snap.savedAt || 0) > 2 * 60 * 60 * 1000) {
        localStorage.removeItem(LS_PENDING);
        return;
      }
      // Restore only if user is now authenticated
      if (isAuthenticated) {
        restoreSnapshot(snap);
        if (snap.selectedService) setSelectedService(snap.selectedService);
        if (snap.selectedTechnologies?.length) setSelectedTechnologies(snap.selectedTechnologies);
        if (snap.hoursBookingData) setHoursBookingData(snap.hoursBookingData);
        setIsDetailsCompleted(true);
        // Jump to Summary step (step 2 in 4-step authenticated flow)
        setActiveStep(2);
        setRestoredFromPending(true);
        localStorage.removeItem(LS_PENDING);
        console.log("✅ Booking state restored from pending snapshot → step 2 (Summary)");
      }
    } catch (e) {
      localStorage.removeItem(LS_PENDING);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const setNavigationCallback = (callback) => {
    navigationCallbackRef.current = callback;
  };

  /** Called by DetailsStep before showing OTP/login — saves full guest selection */
  const savePendingBooking = () => {
    if (typeof window === "undefined") return;
    const snap = buildSnapshot({ selectedService, selectedTechnologies, hoursBookingData });
    localStorage.setItem(LS_PENDING, JSON.stringify(snap));
    console.log("💾 Pending booking snapshot saved");
  };

  const nextStep = () => {
    // If there's a navigation callback, call it first
    if (navigationCallbackRef.current) {
      navigationCallbackRef.current(() => {
        if (activeStep < totalSteps - 1) {
          setActiveStep((prev) => prev + 1);
        }
      });
    } else {
      if (activeStep < totalSteps - 1) {
        setActiveStep((prev) => prev + 1);
      }
    }
  };

  const previousStep = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const goToStep = (step) => {
    if (step >= 0 && step < totalSteps) {
      setActiveStep(step);
    }
  };

  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === totalSteps - 1;

  return (
    <StepperContext.Provider
      value={{
        activeStep,
        totalSteps,
        nextStep,
        previousStep,
        goToStep,
        isFirstStep,
        isLastStep,
        setNavigationCallback,
        selectedTechnologies,
        setSelectedTechnologies,
        selectedService,
        setSelectedService,
        isAuthenticated,
        hoursBookingData,
        setHoursBookingData,
        detailsBookingData,
        setDetailsBookingData,
        termsAccepted,
        setTermsAccepted,
        gstNumber,
        setGstNumber,
        isDetailsCompleted,
        setIsDetailsCompleted,
        savePendingBooking,
        restoredFromPending,
      }}
    >
      {children}
    </StepperContext.Provider>
  );
};
