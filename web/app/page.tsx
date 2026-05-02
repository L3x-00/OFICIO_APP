import HeroSection from '@/components/hero-section';
import StatsSection from '@/components/stats-section';
import BenefitsSection from '@/components/benefits-section';
import HowItWorksSection from '@/components/how-it-works-section';
import ProvidersShowcase from '@/components/providers-showcase';
import ReferralBanner from '@/components/referral-banner';
import TestimonialsSection from '@/components/testimonials-section';
import CtaProviderSection from '@/components/cta-provider-section';
import FaqSection from '@/components/faq-section';

export default function HomePage() {
  return (
    <>
      {/* ============================================
          SECCIÓN 1: HERO - Impacto inicial
          Propuesta de valor clara y CTA principal
      ============================================ */}
      <HeroSection />

      {/* ============================================
          SECCIÓN 2: STATS - Credibilidad instantánea
          Datos y números generan confianza rápida
      ============================================ */}
      <StatsSection />

      {/* ============================================
          SECCIÓN 3: BENEFITS - ¿Por qué elegirnos?
          Valor diferencial de OficioApp
      ============================================ */}
      <BenefitsSection />

      {/* ============================================
          SECCIÓN 4: HOW IT WORKS - Educación
          Reduce fricción explicando el proceso
      ============================================ */}
      <HowItWorksSection />

      {/* ============================================
          SECCIÓN 5: PROVIDERS SHOWCASE - Prueba social visual
          Muestra profesionales reales verificados
      ============================================ */}
      <ProvidersShowcase />

      {/* ============================================
          SECCIÓN 6: TESTIMONIALS - Validación emocional
          Reseñas y experiencias de usuarios reales
          [MOVIDO: ahora va después de Providers]
      ============================================ */}
      <TestimonialsSection />

      {/* ============================================
          SECCIÓN 7: REFERRAL BANNER - CTA secundario
          Programa de referidos post-confianza
          [MOVIDO: ahora va después de Testimonials]
      ============================================ */}
      <ReferralBanner />

      {/* ============================================
          SECCIÓN 8: FAQ - Resolución de objeciones
          Dudas frecuentes antes de convertir
          [MOVIDO: ahora va antes del CTA final]
      ============================================ */}
      <FaqSection />

      {/* ============================================
          SECCIÓN 9: CTA PROVIDER - Conversión final
          Llamada a acción fuerte como cierre
      ============================================ */}
      <CtaProviderSection />
    </>
  );
}