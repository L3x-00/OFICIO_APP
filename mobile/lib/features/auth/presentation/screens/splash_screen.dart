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

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));
    _fadeAnim   = CurvedAnimation(parent: _controller, curve: Curves.easeIn);
    _scaleAnim  = Tween<double>(begin: 0.7, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );
    _controller.forward();
    Future.delayed(const Duration(milliseconds: 2200), _checkSession);
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
    final c    = context.colors;
    final topC = c.isDark ? const Color(0xFF1A0A00) : c.warmDeep;

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [topC, c.bg],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              Positioned(
                top: -60, right: -60,
                child: Container(
                  width: 200, height: 200,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.amber.withValues(alpha: 0.08),
                  ),
                ),
              ),
              Positioned(
                bottom: -80, left: -80,
                child: Container(
                  width: 240, height: 240,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.primary.withValues(alpha: 0.06),
                  ),
                ),
              ),
              Center(
                child: FadeTransition(
                  opacity: _fadeAnim,
                  child: ScaleTransition(
                    scale: _scaleAnim,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 96, height: 96,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppColors.amber, AppColors.primary],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(28),
                            boxShadow: [
                              BoxShadow(color: AppColors.amber.withValues(alpha: 0.3),   blurRadius: 32, spreadRadius: 4),
                              BoxShadow(color: AppColors.primary.withValues(alpha: 0.2), blurRadius: 48, spreadRadius: 8),
                            ],
                          ),
                          child: const Icon(Icons.handshake_rounded, color: Colors.white, size: 46),
                        ),
                        const SizedBox(height: 28),
                        Text(
                          'OficioApp',
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: 34,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'El talento de tu pueblo, a un clic.',
                          style: TextStyle(
                            color: AppColors.amber,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(height: 56),
                        SizedBox(
                          width: 28, height: 28,
                          child: CircularProgressIndicator(
                            color: AppColors.amber.withValues(alpha: 0.7),
                            strokeWidth: 2,
                          ),
                        ),
                      ],
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
