import {
  HowHireWork,
  HireWithConfidence,
  BookResourceSection,
  HowItWorksFaq,
} from "@/features/homepage/components";
import HowQuickHireWorksWithvideo from "@/features/about/components/HowQuickHireWorksWithvideo";

export default function HowItWorksPage() {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* <HowHireWork /> */}
      <HowQuickHireWorksWithvideo hideVideo={false} />
      <HireWithConfidence />
      <BookResourceSection />
      <HowItWorksFaq />
    </div>
  );
}
