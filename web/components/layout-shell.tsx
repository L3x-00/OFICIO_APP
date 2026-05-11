'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import Footer from '@/components/footer';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname?.startsWith('/panel') || pathname?.startsWith('/cliente');

  return (
    <div className="flex flex-col min-h-screen bg-dark-premium">
      <motion.main 
        className="flex-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      >
        {children}
      </motion.main>
      {!hideChrome && <Footer />}
    </div>
  );
}