'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/footer';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname?.startsWith('/panel') || pathname?.startsWith('/cliente');

  return (
    <>
      <main className="flex-1">{children}</main>
      {!hideChrome && <Footer />}
    </>
  );
}
