import { useEffect } from "react";
import ServiceFaq from "./ServiceFaq";
import SelectiveCard from "./SelectiveCard";
import BookingCard from "./BookingCard";
import ServiceHeader from "./ServiceHeader";
import { useAppDispatch, useAppSelector } from "@/lib/redux/store/hooks";
import { fetchServiceById } from "@/lib/redux/slices/bookingSlice/bookingSlice";

export default function LeftComponent({ selectedService }) {
  console.log("LeftComponent received selectedService:", selectedService);

  const dispatch = useAppDispatch();
  const { serviceDetails, isLoading } = useAppSelector(
    (state) => state.booking,
  );

  // Fetch service data once here instead of in each child component
  useEffect(() => {
    if (selectedService?._id) {
      dispatch(fetchServiceById(selectedService._id));
    }
  }, [selectedService?._id, dispatch]);

  console.log("LeftComponent serviceDetails:", serviceDetails);

  return (
    <div
    // className="w-[60%] max-h-[calc(100dvh-64px)] overflow-y-auto p-8"
    >
      <ServiceHeader serviceData={serviceDetails} isLoading={isLoading} />
      <BookingCard serviceData={serviceDetails} isLoading={isLoading} />
      <SelectiveCard serviceData={serviceDetails} isLoading={isLoading} />
      <ServiceFaq serviceData={serviceDetails} isLoading={isLoading} />
    </div>
  );
}
