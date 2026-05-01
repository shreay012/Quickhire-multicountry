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
import CmsBannerStrip from '@/components/cms/CmsBannerStrip';

export default function Homepage() {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* CMS-driven announcement strip — admins control via /admin/cms/banners */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <CmsBannerStrip position="home-top" />
      </div>

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
