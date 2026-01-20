/**
 * Public Routes Layout
 * 
 * Layout for public pages that don't require authentication,
 * such as the consent landing page.
 */

import { PoweredByFooter } from '@/components/ui/powered-by-footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {children}
      </main>
      <PoweredByFooter />
    </div>
  );
}
