import HeroSection from '@/components/hero-section';
import BenefitsSection from '@/components/benefits-section';
import ReferralBanner from '@/components/referral-banner';
import TestimonialsSection from '@/components/testimonials-section';
import UserManual from '@/components/user-manual';
import ProvidersSection from '@/components/providers-section';
import RevealSection from '@/components/motion/reveal-section';
import ScrollProgress from '@/components/motion/scroll-progress';
import SectionDivider from '@/components/motion/section-divider';
import SolutionsSection from '@/components/solutions-section'; 

export default function HomePage() {
  return (
    <>
      <ScrollProgress />
      <HeroSection />

      <SectionDivider tone="primary" />

      <RevealSection>
        <BenefitsSection />
      </RevealSection>
      
      <RevealSection>
      <SolutionsSection />
      </RevealSection>

      <RevealSection>
        <ProvidersSection /> 
      </RevealSection>
      
      <RevealSection delay={0.05}>
        <TestimonialsSection />
      </RevealSection>

      <SectionDivider tone="amber" />

      <RevealSection>
        <UserManual />
      </RevealSection>

      <SectionDivider tone="primary" />

      <RevealSection>
        <ReferralBanner />
      </RevealSection>

      <SectionDivider tone="muted" />
    </>
  );
}