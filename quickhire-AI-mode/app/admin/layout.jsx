'use client';
import StaffShell from '@/components/staff/StaffShell';

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/pms', label: 'Project Managers' },
  { href: '/admin/resources', label: 'Resources' },
  { href: '/admin/services', label: 'Services' },
  { href: '/admin/tickets', label: 'Support Tickets' },
  { href: '/admin/cms', label: 'Content (CMS)' },
];

export default function AdminLayout({ children }) {
  return <StaffShell role="admin" links={links}>{children}</StaffShell>;
}
