import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../widgets/welcome/slide_data.dart';
import '../widgets/welcome/slide_service_grid.dart';
import '../widgets/welcome/slide_provider_card.dart';
import '../widgets/welcome/slide_community_visual.dart';
import '../widgets/welcome/welcome_top_bar.dart';
import '../widgets/welcome/welcome_carousel.dart';
import '../widgets/welcome/welcome_slide_text.dart';
import '../widgets/welcome/welcome_page_indicators.dart';
import '../widgets/welcome/welcome_action_buttons.dart';

/// Pantalla de bienvenida con carrusel onboarding (3 slides).
class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with TickerProviderStateMixin {
  // Animaciones de entrada
  late final AnimationController _entryController;
  late final Animation<double> _entryFade;
  late final Animation<Offset> _entrySlide;

  // Carrusel
  int _currentPage = 0;
  late final PageController _pageController;
  Timer? _autoAdvanceTimer;

  static const int _totalSlides = 3;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();

    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );

    _entryFade = CurvedAnimation(
      parent: _entryController,
      curve: Curves.easeOut,
    );

    _entrySlide = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _entryController,
      curve: Curves.easeOutCubic,
    ));

    _entryController.forward();
    _startAutoAdvance();
  }

  void _startAutoAdvance() {
    _autoAdvanceTimer?.cancel();
    _autoAdvanceTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      final next = (_currentPage + 1) % _totalSlides;
      _pageController.animateToPage(
        next,
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOut,
      );
    });
  }

  void _onPageChanged(int i) {
    setState(() => _currentPage = i);
    // Reiniciar el timer cuando el usuario desliza manualmente
    _startAutoAdvance();
  }

  @override
  void dispose() {
    _autoAdvanceTimer?.cancel();
    _entryController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c      = context.colors;
    final size   = MediaQuery.of(context).size;
    final isLast = _currentPage == _totalSlides - 1;

    final slides = _buildSlides(c);
    final accent = slides[_currentPage].accentColor;

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: FadeTransition(
          opacity: _entryFade,
          child: SlideTransition(
            position: _entrySlide,
            child: Column(
              children: [
                // ── Barra superior ────────────────────────
                WelcomeTopBar(isDark: c.isDark, isLastPage: isLast),

                // ── Carrusel visual ───────────────────────
                Expanded(
                  flex: 58,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                    child: VisualCarousel(
                      pageController: _pageController,
                      slides: slides,
                      currentPage: _currentPage,
                      onPageChanged: _onPageChanged,
                    ),
                  ),
                ),

                // ── Texto del slide ───────────────────────
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 400),
                  switchInCurve: Curves.easeOut,
                  switchOutCurve: Curves.easeIn,
                  transitionBuilder: (child, anim) => FadeTransition(
                    opacity: anim,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, 0.08),
                        end: Offset.zero,
                      ).animate(anim),
                      child: child,
                    ),
                  ),
                  child: SlideText(
                    key: ValueKey(_currentPage),
                    title:    slides[_currentPage].title,
                    subtitle: slides[_currentPage].subtitle,
                  ),
                ),

                // ── Indicadores ───────────────────────────
                const SizedBox(height: 16),
                PageIndicators(
                  total:       _totalSlides,
                  current:     _currentPage,
                  accentColor: accent,
                ),

                const SizedBox(height: 12),

                // ── Acciones ──────────────────────────────
                WelcomeActionButtons(
                  size:        size,
                  isLastPage:  isLast,
                  accentColor: accent,
                  pageController: _pageController,
                ),

                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<SlideData> _buildSlides(AppThemeColors c) => [
    SlideData(
      title:       'El experto que buscas,\nen quien puedes confiar.',
      subtitle:    'Profesionales verificados por tu comunidad — electricistas, gasfiteros, pintores y más.',
      accentColor: AppColors.primary,
      visual:      SlideServiceGrid(isDark: c.isDark),
    ),
    SlideData(
      title:       'Confianza que se ve,\nservicios que se sienten.',
      subtitle:    'Lee reseñas reales de tus vecinos y contacta directo, sin intermediarios.',
      accentColor: AppColors.verified,
      visual:      const SlideProviderCard(),
    ),
    SlideData(
      title:       'Juntos hacemos\ncrecer la comunidad.',
      subtitle:    'Cada servicio contratado impulsa la economía local. Tú eliges en quién confiar.',
      accentColor: AppColors.amber,
      visual:      const SlideCommunityVisual(),
    ),
  ];
}