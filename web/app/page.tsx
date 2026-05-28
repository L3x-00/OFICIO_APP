import HeroSection from '@/components/hero-section';
import StatsSection from '@/components/stats-section';
import BenefitsSection from '@/components/benefits-section';
import HowItWorksSection from '@/components/how-it-works-section';
import ProvidersShowcase from '@/components/providers-showcase';
import ReferralBanner from '@/components/referral-banner';
import TestimonialsSection from '@/components/testimonials-section';
import CtaProviderSection from '@/components/cta-provider-section';
// import FaqSection from '@/components/faq-section'; comvertido en modal
import UserManual from '@/components/user-manual';
import ImageCarousel from '@/components/image-carousel';

// ── Capa de animación scroll-reveal ──────────────────────────
// Aplicamos las animaciones desde acá envolviendo cada sección, así
// los componentes internos (HeroSection, StatsSection, …) NO se tocan
// y su contenido/estilos quedan intactos. Si querés ajustar el efecto
// global (más sutil, más exagerado), todo vive en
// `components/motion/`.
import RevealSection from '@/components/motion/reveal-section';
import ScrollProgress from '@/components/motion/scroll-progress';
import SectionDivider from '@/components/motion/section-divider';

export default function HomePage() {
  return (
    <>
      {/* Barra fina arriba que se llena con el scroll — pista visual
          de "cuánto te falta del landing". */}
      <ScrollProgress />

      {/* HERO no lleva RevealSection: ya está en viewport al cargar y
          el componente trae su propia entrada cinematográfica. */}
      <HeroSection />

      <RevealSection>
        <StatsSection />
      </RevealSection>

      <SectionDivider tone="primary" />

      <RevealSection>
        <BenefitsSection />
      </RevealSection>

      <RevealSection y={40}>
        <HowItWorksSection />
      </RevealSection>

      <SectionDivider tone="accent" />

      <RevealSection>
        <ImageCarousel />
      </RevealSection>

      <RevealSection delay={0.05}>
        <UserManual />
      </RevealSection>

      <SectionDivider tone="amber" />

      <RevealSection y={40}>
        <ProvidersShowcase />
      </RevealSection>

      <RevealSection>
        <TestimonialsSection />
      </RevealSection>

      <SectionDivider tone="primary" />

      <RevealSection>
        <ReferralBanner />
      </RevealSection>

      // FaqSection se convirtió en un modal global para acceso desde cualquier parte del sitio, así que lo removemos de esta página. Si queremos
      // destacar el FAQ dentro del landing, podríamos agregar un CTA
      // específico que abra el modal, pero por ahora confiamos en el
      // botón flotante (FloatingFaqButton) para eso.

      <SectionDivider tone="muted" />

      <RevealSection y={48}>
        <CtaProviderSection />
      </RevealSection>
    </>
  );
}
