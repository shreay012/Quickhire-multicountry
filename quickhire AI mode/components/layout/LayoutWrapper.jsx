'use client';

import { usePathname } from 'next/navigation';
import { Header, Footer } from './';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();

  // Don't show header/footer on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Staff portals (admin/pm/resource) use their own layout
  if (
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/pm') ||
    pathname?.startsWith('/resource') ||
    pathname?.startsWith('/staff-login')
  ) {
    return <>{children}</>;
  }

  // Don't show footer on service-details, booking-workspace, and support-chat pages
  const showFooter = !pathname.startsWith('/service-details') && !pathname.startsWith('/booking-workspace') && !pathname.startsWith('/support-chat');

  return (
    <>
      <Header />
      {children}
      {showFooter && <Footer />}
    </>
  );
}
