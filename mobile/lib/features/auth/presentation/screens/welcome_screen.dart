import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../widgets/welcome/slide_data.dart';
import '../widgets/welcome/slide_welcome_intro.dart';
import '../widgets/welcome/slide_provider_showcase.dart';
import '../widgets/welcome/slide_testimonials.dart';
import '../widgets/welcome/slide_ofi_assistant.dart';
import '../widgets/welcome/welcome_top_bar.dart';
import '../widgets/welcome/welcome_carousel.dart';
import '../widgets/welcome/welcome_slide_text.dart';
import '../widgets/welcome/welcome_page_indicators.dart';
import '../widgets/welcome/welcome_action_buttons.dart';

/// Pantalla de bienvenida con carrusel onboarding (4 slides).
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

  static const int _totalSlides = 4;

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

    _entrySlide = Tween<Offset>(begin: const Offset(0, 0.06), end: Offset.zero)
        .animate(
          CurvedAnimation(parent: _entryController, curve: Curves.easeOutCubic),
        );

    _entryController.forward();
    _startAutoAdvance();
  }

  void _startAutoAdvance() {
    _autoAdvanceTimer?.cancel();
    _autoAdvanceTimer = Timer.periodic(const Duration(seconds: 4), (t) {
      if (!mounted) return;
      // Se detiene en el último slide en vez de rebobinar: dar la vuelta
      // barría las páginas intermedias en 600 ms (estrobo de las fotos)
      // y volteaba el CTA "Explorar Servicios" → "Siguiente" bajo el dedo
      // del usuario. Si desliza a mano, _onPageChanged rearma el timer.
      if (_currentPage >= _totalSlides - 1) {
        t.cancel();
        return;
      }
      _pageController.nextPage(
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

  // Pausa el auto-avance mientras el usuario toca el carrusel; se reanuda
  // (con timer fresco) al soltar.
  void _pauseAutoAdvance([Object? _]) => _autoAdvanceTimer?.cancel();
  void _resumeAutoAdvance([Object? _]) => _startAutoAdvance();

  @override
  void dispose() {
    _autoAdvanceTimer?.cancel();
    _entryController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final size = MediaQuery.of(context).size;
    final isLast = _currentPage == _totalSlides - 1;

    final slides = _buildSlides();
    final accent = slides[_currentPage].accentColor;

    // Fuentes grandes del sistema no deben romper el layout fijo del welcome.
    return MediaQuery.withClampedTextScaling(
      maxScaleFactor: 1.25,
      child: Scaffold(
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
                      child: GestureDetector(
                        behavior: HitTestBehavior.translucent,
                        onTapDown: _pauseAutoAdvance,
                        onTapUp: _resumeAutoAdvance,
                        onTapCancel: _resumeAutoAdvance,
                        child: VisualCarousel(
                          pageController: _pageController,
                          slides: slides,
                          currentPage: _currentPage,
                          onPageChanged: _onPageChanged,
                        ),
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
                      title: slides[_currentPage].title,
                      subtitle: slides[_currentPage].subtitle,
                    ),
                  ),

                  // ── Indicadores ───────────────────────────
                  const SizedBox(height: 16),
                  PageIndicators(
                    total: _totalSlides,
                    current: _currentPage,
                    accentColor: accent,
                  ),

                  const SizedBox(height: 12),

                  // ── Acciones ──────────────────────────────
                  WelcomeActionButtons(
                    size: size,
                    isLastPage: isLast,
                    accentColor: accent,
                    pageController: _pageController,
                  ),

                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<SlideData> _buildSlides() => const [
    SlideData(
      title: 'Bienvenido a Servi',
      subtitle:
          'Oficios, profesionales y negocios reales cerca de ti — sin comisiones ni intermediarios.',
      accentColor: AppColors.primary,
      backgroundImage: 'assets/images/onboarding/slide-1-presentación.webp',
      visual: SlideWelcomeIntro(),
    ),
    SlideData(
      title: 'Para cada necesidad',
      subtitle:
          'Gasfiteros y electricistas, abogados y doctores verificados, o tu negocio local. Todos con reseñas reales.',
      accentColor: AppColors.primary,
      backgroundImage: 'assets/images/onboarding/slide-3-tarjeta-oficio.webp',
      visual: SlideProviderShowcase(),
    ),
    SlideData(
      title: 'Lo que dicen de Servi',
      subtitle:
          'Historias reales de clientes, oficios y negocios que ya confían en la plataforma.',
      accentColor: AppColors.amber,
      backgroundImage: 'assets/images/onboarding/slide-6-comentarios.webp',
      visual: SlideTestimonials(),
    ),
    SlideData(
      title: 'Conoce a Ofi',
      subtitle:
          'Tu asistente inteligente. Pregúntale lo que buscas y encuentra al proveedor ideal al instante.',
      accentColor: AppColors.primary,
      backgroundImage: 'assets/images/onboarding/slide-7-ofi.webp',
      visual: SlideOfiAssistant(),
    ),
  ];
}
