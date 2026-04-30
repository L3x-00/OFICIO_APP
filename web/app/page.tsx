import HeroSection from '@/components/hero-section';
import StatsSection from '@/components/stats-section';
import BenefitsSection from '@/components/benefits-section';
import HowItWorksSection from '@/components/how-it-works-section';
import ProvidersShowcase from '@/components/providers-showcase';
import TestimonialsSection from '@/components/testimonials-section';
import CtaProviderSection from '@/components/cta-provider-section';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <BenefitsSection />
      <HowItWorksSection />
      <ProvidersShowcase />
      <TestimonialsSection />
      <CtaProviderSection />
    </>
  );
}
