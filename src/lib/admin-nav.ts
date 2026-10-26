// Admin sidebar: sections, their pages and icons (AdminLayout.astro). `key` marks the active item; a page may also
// light up a sub-item with `sub`. See docs/functions/admin/desc.md.
export interface AdminNavItem { key: string; label: string; href: string; icon: string; children?: { key: string; label: string; href: string }[] }

export const ADMIN_NAV: AdminNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin', icon: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z' },
  {
    key: 'listings', label: 'Listings', href: '/admin/listings', icon: 'M4 20V9l8-5 8 5v11M9 20v-6h6v6',
    children: [{ key: 'pending', label: 'Pending', href: '/admin/listings' }, { key: 'all', label: 'All listings', href: '/admin/listings/all' }],
  },
  {
    key: 'users', label: 'Users', href: '/admin/users', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    children: [{ key: 'all', label: 'All users', href: '/admin/users' }, { key: 'blocked', label: 'Blocked', href: '/admin/users?state=blocked' }],
  },
  { key: 'reviews', label: 'Reviews', href: '/admin/reviews', icon: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z' },
  { key: 'plans', label: 'Plan requests', href: '/admin/plans', icon: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z' },
  { key: 'orders', label: 'Orders', href: '/admin/orders', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6' },
  { key: 'enquiries', label: 'Enquiries', href: '/admin/enquiries', icon: 'M4 5h16v11H8l-4 4z' },
  { key: 'forum', label: 'Forum', href: '/admin/forum', icon: 'M4 5h11v8H8l-4 3zM9 16h7l4 3V9h-3' },
  { key: 'newsletter', label: 'Newsletter', href: '/admin/newsletter', icon: 'M4 6h16v12H4zM4 7l8 6 8-6' },
  { key: 'showcase', label: 'Showcase', href: '/admin/showcase', icon: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4' },
  { key: 'audit', label: 'Audit log', href: '/admin/audit', icon: 'M8 4h11v16H8zM5 7v13h11M11 9h5M11 13h5' },
];
