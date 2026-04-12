import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'login_screen.dart';

// ─── Datos de cada slide ──────────────────────────────────────

class _SlideData {
  final String title;
  final String subtitle;
  final Widget visual;
  final Color accentColor;

  const _SlideData({
    required this.title,
    required this.subtitle,
    required this.visual,
    required this.accentColor,
  });
}

// ─────────────────────────────────────────────────────────────

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
    final c       = context.colors;
    final size    = MediaQuery.of(context).size;
    final isLast  = _currentPage == _totalSlides - 1;

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
                _TopBar(isDark: c.isDark, isLastPage: isLast),

                // ── Carrusel visual ───────────────────────
                Expanded(
                  flex: 58,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                    child: _VisualCarousel(
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
                  child: _SlideText(
                    key: ValueKey(_currentPage),
                    title:    slides[_currentPage].title,
                    subtitle: slides[_currentPage].subtitle,
                  ),
                ),

                // ── Indicadores ───────────────────────────
                const SizedBox(height: 16),
                _PageIndicators(
                  total:       _totalSlides,
                  current:     _currentPage,
                  accentColor: accent,
                ),

                const SizedBox(height: 12),

                // ── Acciones ──────────────────────────────
                _ActionButtons(
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

  List<_SlideData> _buildSlides(AppThemeColors c) => [
    _SlideData(
      title:       'El experto que buscas,\nen quien puedes confiar.',
      subtitle:    'Profesionales verificados por tu comunidad — electricistas, gasfiteros, pintores y más.',
      accentColor: AppColors.primary,
      visual:      _ServiceGridVisual(isDark: c.isDark),
    ),
    _SlideData(
      title:       'Confianza que se ve,\nservicios que se sienten.',
      subtitle:    'Lee reseñas reales de tus vecinos y contacta directo, sin intermediarios.',
      accentColor: AppColors.verified,
      visual:      const _MockProviderCard(),
    ),
    _SlideData(
      title:       'Juntos hacemos\ncrecer la comunidad.',
      subtitle:    'Cada servicio contratado impulsa la economía local. Tú eliges en quién confiar.',
      accentColor: AppColors.amber,
      visual:      const _CommunityVisual(),
    ),
  ];
}

// ─── Barra superior ───────────────────────────────────────────

class _TopBar extends StatelessWidget {
  final bool isDark;
  final bool isLastPage;
  const _TopBar({required this.isDark, required this.isLastPage});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
      child: Row(
        children: [
          Image.asset(
            isDark
                ? 'assets/images/logo/logo_dark.png'
                : 'assets/images/logo/logo_light.png',
            width: 34, height: 34,
            filterQuality: FilterQuality.high,
          ),
          const SizedBox(width: 8),
          Text(
            'ConfiServ',
            style: TextStyle(
              color: c.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
          const Spacer(),
          AnimatedOpacity(
            opacity: isLastPage ? 0.0 : 1.0,
            duration: const Duration(milliseconds: 200),
            child: TextButton(
              onPressed: isLastPage
                  ? null
                  : () => context.read<AuthProvider>().browseAsGuest(),
              child: Text(
                'Omitir',
                style: TextStyle(color: c.textMuted, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Carrusel visual ──────────────────────────────────────────

class _VisualCarousel extends StatelessWidget {
  final PageController pageController;
  final List<_SlideData> slides;
  final int currentPage;
  final ValueChanged<int> onPageChanged;

  const _VisualCarousel({
    required this.pageController,
    required this.slides,
    required this.currentPage,
    required this.onPageChanged,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final accent = slides[currentPage].accentColor;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOut,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: accent.withValues(alpha: 0.18),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: accent.withValues(alpha: c.isDark ? 0.18 : 0.1),
            blurRadius: 32,
            spreadRadius: 2,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: Stack(
          children: [
            // Fondo con gradiente animado según slide
            AnimatedContainer(
              duration: const Duration(milliseconds: 500),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    accent.withValues(alpha: c.isDark ? 0.12 : 0.07),
                    c.bgCard,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
            ),
            // Contenido
            PageView.builder(
              controller: pageController,
              onPageChanged: onPageChanged,
              itemCount: slides.length,
              itemBuilder: (_, i) => slides[i].visual,
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Texto del slide ──────────────────────────────────────────

class _SlideText extends StatelessWidget {
  final String title;
  final String subtitle;
  const _SlideText({super.key, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 18, 28, 0),
      child: Column(
        children: [
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 22,
              fontWeight: FontWeight.bold,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: c.textSecondary,
              fontSize: 13,
              height: 1.55,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Indicadores de página ────────────────────────────────────

class _PageIndicators extends StatelessWidget {
  final int total;
  final int current;
  final Color accentColor;

  const _PageIndicators({
    required this.total,
    required this.current,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(total, (i) {
        final active = i == current;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeInOut,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width:  active ? 28 : 8,
          height: 8,
          decoration: BoxDecoration(
            color:  active ? accentColor : c.textMuted.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}

// ─── Botones de acción ────────────────────────────────────────

class _ActionButtons extends StatelessWidget {
  final Size size;
  final bool isLastPage;
  final Color accentColor;
  final PageController pageController;

  const _ActionButtons({
    required this.size,
    required this.isLastPage,
    required this.accentColor,
    required this.pageController,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 4, 24, 0),
      child: Column(
        children: [
          // Botón principal
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                if (isLastPage) {
                  context.read<AuthProvider>().browseAsGuest();
                } else {
                  pageController.nextPage(
                    duration: const Duration(milliseconds: 500),
                    curve: Curves.easeInOut,
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: accentColor,
                foregroundColor: isLastPage ? Colors.black87 : Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 15),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isLastPage ? 'Explorar Servicios' : 'Siguiente',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Icon(
                    isLastPage
                        ? Icons.explore_rounded
                        : Icons.arrow_forward_rounded,
                    size: 18,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          // Botón secundario
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const LoginScreen(initialMode: AuthMode.login),
                ),
              ),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: c.border),
                ),
              ),
              child: Text(
                'Ya tengo una cuenta',
                style: TextStyle(color: c.textSecondary, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════
// VISUALES DE CADA SLIDE
// ═════════════════════════════════════════════════════════════

// ─── Slide 1: Grid de servicios ──────────────────────────────

class _ServiceGridVisual extends StatelessWidget {
  final bool isDark;
  const _ServiceGridVisual({required this.isDark});

  static const _services = [
    (Icons.bolt_rounded,          'Electricistas', AppColors.primary),
    (Icons.plumbing_rounded,      'Gasfiteros',    Color(0xFF26C6DA)),
    (Icons.format_paint_rounded,  'Pintores',      Color(0xFF7E57C2)),
    (Icons.restaurant_rounded,    'Restaurantes',  AppColors.amber),
    (Icons.content_cut_rounded,   'Peluquerías',   Color(0xFFEC407A)),
    (Icons.build_rounded,         'Carpinteros',   Color(0xFF66BB6A)),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Título flotante
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.location_on_rounded, color: AppColors.primary, size: 13),
                SizedBox(width: 5),
                Text(
                  'Servicios cerca de ti',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          // Grid de categorías 3x2
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.05,
            ),
            itemCount: _services.length,
            itemBuilder: (_, i) {
              final s = _services[i];
              return _ServiceTile(icon: s.$1, label: s.$2, color: s.$3);
            },
          ),
        ],
      ),
    );
  }
}

class _ServiceTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _ServiceTile({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(
        color: c.bgInput,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: c.textSecondary,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Slide 2: Tarjeta mock de proveedor ──────────────────────

class _MockProviderCard extends StatelessWidget {
  const _MockProviderCard();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Header: foto + badges
          Row(
            children: [
              // Foto avatar con iniciales
              Container(
                width: 56,
                height: 56,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryDark],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Text(
                    'JS',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Juan Sosa',
                      style: TextStyle(
                        color: c.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Electricista Certificado',
                      style: TextStyle(color: c.textSecondary, fontSize: 12),
                    ),
                    const SizedBox(height: 5),
                    // Etiquetas
                    Row(
                      children: [
                        _MiniTag(
                          label: 'Verificado',
                          icon: Icons.verified_rounded,
                          color: AppColors.verified,
                        ),
                        const SizedBox(width: 6),
                        _MiniTag(
                          label: 'Premium',
                          icon: Icons.star_rounded,
                          color: AppColors.premium,
                          textColor: const Color(0xFF3D2B00),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Estrellas y disponibilidad
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: c.bgInput,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                ...List.generate(5, (i) => Icon(
                  i < 4 ? Icons.star_rounded : Icons.star_half_rounded,
                  color: AppColors.star,
                  size: 16,
                )),
                const SizedBox(width: 6),
                Text(
                  '4.8',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  ' (23 reseñas)',
                  style: TextStyle(color: c.textSecondary, fontSize: 11),
                ),
                const Spacer(),
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.available,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
                const Text(
                  'Disponible',
                  style: TextStyle(
                    color: AppColors.available,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Botones de acción mock
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.whatsapp.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.whatsapp.withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.chat_rounded, color: AppColors.whatsapp, size: 15),
                      SizedBox(width: 5),
                      Text(
                        'WhatsApp',
                        style: TextStyle(
                          color: AppColors.whatsapp,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.call.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.call.withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.call_rounded, color: AppColors.call, size: 15),
                      SizedBox(width: 5),
                      Text(
                        'Llamar',
                        style: TextStyle(
                          color: AppColors.call,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniTag extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final Color? textColor;

  const _MiniTag({
    required this.label,
    required this.icon,
    required this.color,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final tc = textColor ?? color;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: textColor != null ? 1.0 : 0.12),
        borderRadius: BorderRadius.circular(8),
        border: textColor != null
            ? null
            : Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: tc, size: 10),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(
              color: tc,
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Slide 3: Comunidad y stats ───────────────────────────────

class _CommunityVisual extends StatelessWidget {
  const _CommunityVisual();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Testimonio
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: c.warmDeep,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.amber.withValues(alpha: 0.3)),
              boxShadow: [
                BoxShadow(
                  color: AppColors.amber.withValues(alpha: 0.1),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Column(
              children: [
                Icon(
                  Icons.format_quote_rounded,
                  color: AppColors.amber.withValues(alpha: 0.7),
                  size: 26,
                ),
                const SizedBox(height: 6),
                Text(
                  '"Gracias a ConfiServ, mi panadería duplicó sus clientes. La gente confía porque ve las reseñas reales."',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 13,
                    height: 1.55,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppColors.amber.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: AppColors.amber.withValues(alpha: 0.4)),
                      ),
                      child: const Icon(
                        Icons.storefront_rounded,
                        color: AppColors.amber,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Carlos Ríos',
                          style: TextStyle(
                            color: AppColors.amber,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        Text(
                          "Panadería 'El Trigo Dorado'",
                          style: TextStyle(
                              color: c.textSecondary, fontSize: 10),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          // Estadísticas
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  icon: Icons.people_rounded,
                  value: '+2,000',
                  label: 'usuarios',
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatCard(
                  icon: Icons.star_rounded,
                  value: '4.8★',
                  label: 'promedio',
                  color: AppColors.star,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatCard(
                  icon: Icons.handshake_rounded,
                  value: '+500',
                  label: 'servicios',
                  color: AppColors.available,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            label,
            style: TextStyle(color: c.textMuted, fontSize: 10),
          ),
        ],
      ),
    );
  }
}
