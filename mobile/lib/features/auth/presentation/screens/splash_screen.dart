import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;
  late Animation<double> _glowAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );

    _fadeAnim = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.0, 0.6, curve: Curves.easeIn),
    );

    _scaleAnim = Tween<double>(begin: 0.65, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.7, curve: Curves.elasticOut),
      ),
    );

    _glowAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.5, 1.0, curve: Curves.easeOut),
      ),
    );

    _controller.forward();
    Future.delayed(const Duration(milliseconds: 2400), _checkSession);
  }

  Future<void> _checkSession() async {
    if (!mounted) return;
    await context.read<AuthProvider>().initialize();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: c.isDark
                ? [const Color(0xFF0B0D17), const Color(0xFF111827)]
                : [Colors.white, const Color(0xFFF0F9FF)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              // ── Círculo decorativo superior ───────────────
              Positioned(
                top: -80, right: -80,
                child: Container(
                  width: 240, height: 240,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.amber.withValues(alpha: 0.06),
                  ),
                ),
              ),
              // ── Círculo decorativo inferior ───────────────
              Positioned(
                bottom: -100, left: -80,
                child: Container(
                  width: 280, height: 280,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.primary.withValues(alpha: 0.05),
                  ),
                ),
              ),

              // ── Contenido central ─────────────────────────
              Center(
                child: FadeTransition(
                  opacity: _fadeAnim,
                  child: ScaleTransition(
                    scale: _scaleAnim,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // ── Logo con halo animado ─────────
                        AnimatedBuilder(
                          animation: _glowAnim,
                          builder: (_, child) => Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(32),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.amber.withValues(
                                      alpha: 0.28 * _glowAnim.value),
                                  blurRadius: 48,
                                  spreadRadius: 8,
                                ),
                                BoxShadow(
                                  color: AppColors.primary.withValues(
                                      alpha: 0.20 * _glowAnim.value),
                                  blurRadius: 64,
                                  spreadRadius: 12,
                                ),
                              ],
                            ),
                            child: child,
                          ),
                          child: ClipRRect(
                            borderRadius:
                                BorderRadius.circular(c.isDark ? 28 : 0),
                            child: Image.asset(
                              c.isDark
                                  ? 'assets/images/logo/logo_dark.png'
                                  : 'assets/images/logo/logo_light.png',
                              width:  120,
                              height: 120,
                              filterQuality: FilterQuality.high,
                            ),
                          ),
                        ),

                        const SizedBox(height: 32),

                        // ── Nombre de marca ───────────────
                        Text(
                          'ConfiServ',
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: 36,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.4,
                          ),
                        ),
                        const SizedBox(height: 10),

                        // ── Tagline con gradiente ─────────
                        ShaderMask(
                          shaderCallback: (bounds) =>
                              const LinearGradient(
                                colors: [AppColors.amber, AppColors.primary],
                              ).createShader(bounds),
                          child: const Text(
                            'Servicios locales, confianza real.',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.4,
                            ),
                          ),
                        ),

                        const SizedBox(height: 64),

                        // ── Indicador de carga ────────────
                        SizedBox(
                          width: 28, height: 28,
                          child: CircularProgressIndicator(
                            color: AppColors.amber.withValues(alpha: 0.65),
                            strokeWidth: 2.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // ── Versión en pie de página ──────────────────
              Positioned(
                bottom: 16, left: 0, right: 0,
                child: FadeTransition(
                  opacity: _glowAnim,
                  child: Text(
                    'v1.0.0',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: c.textMuted.withValues(alpha: 0.5),
                      fontSize: 11,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
