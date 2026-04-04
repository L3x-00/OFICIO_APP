'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen overflow-hidden">
      <div className="w-64 fixed inset-y-0 left-0 z-50">
        <Sidebar />
      </div>
      <main className="flex-1 ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
