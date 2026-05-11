'use client';

import { motion } from 'framer-motion';
import ReferralPanel from '@/components/referral-panel';

export default function PanelReferidosPage() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="max-w-5xl"
    >
      <ReferralPanel />
    </motion.div>
  );
}