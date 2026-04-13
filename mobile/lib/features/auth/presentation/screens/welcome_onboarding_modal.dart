import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Modal de bienvenida que se muestra la primera vez que el usuario
/// completa el onboarding y accede al panel principal.
class WelcomeOnboardingModal extends StatefulWidget {
  final VoidCallback onDismiss;

  const WelcomeOnboardingModal({super.key, required this.onDismiss});

  @override
  State<WelcomeOnboardingModal> createState() => _WelcomeOnboardingModalState();
}

class _WelcomeOnboardingModalState extends State<WelcomeOnboardingModal>
    with SingleTickerProviderStateMixin {
  final PageController _page = PageController();
  late AnimationController _anim;
  late Animation<double> _fadeAnim;
  int _currentPage = 0;

  static const _steps = [
    _Step(
      icon: Icons.waving_hand_rounded,
      gradient: [Color(0xFF00C6FF), Color(0xFF0072FF)],
      title: '¡Bienvenido a ConfiServ!',
      body:
          'Conectamos personas con los mejores profesionales '
          'y negocios de tu ciudad. Rápido, seguro y confiable.',
    ),
    _Step(
      icon: Icons.manage_search_rounded,
      gradient: [Color(0xFF00E676), Color(0xFF00897B)],
      title: 'Encuentra lo que necesitas',
      body:
          'Electricistas, gasfiteros, peluquerías, restaurantes y más. '
          'Filtra por categoría, disponibilidad y calificación.',
    ),
    _Step(
      icon: Icons.verified_user_rounded,
      gradient: [Color(0xFF8E2DE2), Color(0xFF4A00E0)],
      title: 'Contrata con confianza',
      body:
          'Todos los proveedores pasan por un proceso de verificación. '
          'Lee reseñas reales antes de decidir.',
    ),
    _Step(
      icon: Icons.rocket_launch_rounded,
      gradient: [Color(0xFFFF6B6B), Color(0xFFFF8E53)],
      title: '¡Todo listo!',
      body:
          'Explora, contrata y califica. Tu próximo servicio está '
          'a un tap de distancia.',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _fadeAnim = CurvedAnimation(parent: _anim, curve: Curves.easeIn);
    _anim.forward();
  }

  @override
  void dispose() {
    _page.dispose();
    _anim.dispose();
    super.dispose();
  }

  bool get _isLast => _currentPage == _steps.length - 1;

  void _next() {
    if (_isLast) {
      widget.onDismiss();
    } else {
      _page.nextPage(
        duration: const Duration(milliseconds: 380),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return FadeTransition(
      opacity: _fadeAnim,
      child: Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 48),
        backgroundColor: Colors.transparent,
        child: Container(
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.4),
                blurRadius: 40,
                offset: const Offset(0, 16),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── Slides ──────────────────────────────────────
              SizedBox(
                height: 310,
                child: PageView.builder(
                  controller: _page,
                  onPageChanged: (i) => setState(() => _currentPage = i),
                  itemCount: _steps.length,
                  itemBuilder: (_, i) => _StepPage(step: _steps[i]),
                ),
              ),

              // ── Dots ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.only(top: 4, bottom: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    _steps.length,
                    (i) => AnimatedContainer(
                      duration: const Duration(milliseconds: 280),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: _currentPage == i ? 22 : 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: _currentPage == i
                            ? AppColors.primary
                            : Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ),

              // ── Acciones ────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 22),
                child: Row(
                  children: [
                    if (!_isLast)
                      TextButton(
                        onPressed: widget.onDismiss,
                        style: TextButton.styleFrom(
                          foregroundColor: c.textMuted,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                        ),
                        child: const Text(
                          'Saltar',
                          style: TextStyle(
                              fontWeight: FontWeight.w500, fontSize: 14),
                        ),
                      ),
                    const Spacer(),
                    ElevatedButton(
                      onPressed: _next,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 28, vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                        elevation: 0,
                        shadowColor: Colors.transparent,
                      ),
                      child: Text(
                        _isLast ? '¡Comenzar!' : 'Siguiente →',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
// Datos de cada paso
// ─────────────────────────────────────────────

class _Step {
  final IconData icon;
  final List<Color> gradient;
  final String title;
  final String body;

  const _Step({
    required this.icon,
    required this.gradient,
    required this.title,
    required this.body,
  });
}

// ─────────────────────────────────────────────
// Widget de un paso individual
// ─────────────────────────────────────────────

class _StepPage extends StatelessWidget {
  final _Step step;

  const _StepPage({required this.step});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 32, 28, 8),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Icono con gradiente
          Container(
            width: 90,
            height: 90,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: step.gradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(26),
              boxShadow: [
                BoxShadow(
                  color: step.gradient.first.withValues(alpha: 0.38),
                  blurRadius: 22,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Icon(step.icon, color: Colors.white, size: 42),
          ),
          const SizedBox(height: 26),

          // Título
          Text(
            step.title,
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 21,
              fontWeight: FontWeight.bold,
              height: 1.25,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),

          // Descripción
          Text(
            step.body,
            style: TextStyle(
              color: c.textSecondary,
              fontSize: 14,
              height: 1.65,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
