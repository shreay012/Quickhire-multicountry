import {
  Mainbanner,
  ServiceSelectionGridV5,
  HeroSectionV3,
  BookYourResourceGrid,
  VideoSectionV3,
  BookingFaq,
  ExpertCardV3,
} from "@/features/booking/components";

export const metadata = {
  title: "Book Your Resource - QuickHire",
  description:
    "Require a tech or software resource? Get an experienced developer, designer, QA, and more. Hire verified professionals in minutes.",
  openGraph: {
    title: "Book Your Resource - QuickHire",
    description:
      "Hire verified tech professionals immediately - developers, designers, QA engineers, and more.",
    url: "https://quickhire.com/book-your-resource",
    images: [
      {
        url: "/images/booking-og.jpg",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function BookResourcePage() {
  return (
    <main className="flex-1">
      <Mainbanner />
      <ServiceSelectionGridV5 />
      <HeroSectionV3 />
      <BookYourResourceGrid />
      <VideoSectionV3 />
      <BookingFaq />
    </main>
  );
}
