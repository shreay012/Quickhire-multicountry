import {
  HeroSection,
  ClientLogos,
  CarouselSection,
  WhyQuickSection,
  BookResourceSection,
  VibeCoding,
  HowHireWork,
  HireWithConfidence,
  WeDeploy,
  ClientSection,
  TechStack,
  LetAnswer,
} from '@/features/homepage/components';

export default function Homepage() {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* Complete Homepage - All sections in original order */}
      <HeroSection />
      <ClientLogos />
      <CarouselSection />
      <WhyQuickSection />
      <BookResourceSection />
      <VibeCoding />
      <HowHireWork />
      <HireWithConfidence />
      <WeDeploy />
      <ClientSection />
      <TechStack />
      <LetAnswer />
    </div>
  );
}
