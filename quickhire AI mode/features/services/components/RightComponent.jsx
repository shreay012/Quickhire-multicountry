"use client";

import { Box } from "@mui/material";
import { StepperProvider } from "./ProcessStepper/StepperContext";
import ProcessStepper from "./ProcessStepper";
import StepContent from "./ProcessStepper/StepContent";

const RightComponent = ({ serviceId, selectedService }) => {
  console.log("RightComponent received serviceId:", serviceId);

  console.log("RightComponent received selectedService:", selectedService);

  return (
    <StepperProvider>
      <div className="bg-white h-full flex flex-col">
        {/* Fixed Top - Stepper */}
        <div className="px-4 sm:px-6 lg:px-0 pt-6 pb-2">
          <ProcessStepper />
        </div>

        {/* Scrollable Content - Step Content with Buttons */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-4 sm:px-6 lg:px-0">
          <StepContent
            serviceId={serviceId}
            selectedService={selectedService}
          />
        </div>
      </div>
    </StepperProvider>
  );
};

export default RightComponent;
