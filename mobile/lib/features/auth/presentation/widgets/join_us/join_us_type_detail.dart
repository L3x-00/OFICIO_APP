import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/auth/presentation/screens/onboarding/provider_onboarding_form.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../screens/login_screen.dart';
import 'join_us_plans.dart';
import 'profile_preview_mock.dart';

/// Vista de detalle por tipo (OFICIO / NEGOCIO).
///
/// Compone:
///   - Botón "Volver" → invoca [onBack].
///   - Eslogan diferenciado con ShaderMask + gradient.
///   - [ProfilePreviewMock] como vista previa del perfil.
///   - Lista de planes (Gratis / Estándar / Premium) con [PlanCard].
///   - [FreePeriodBanner].
///   - CTA: si el usuario ya está autenticado, abre el onboarding form
///     directamente; si no, abre el LoginScreen en modo register.
class JoinUsTypeDetail extends StatelessWidget {
  final String type; // 'OFICIO' | 'NEGOCIO'
  final VoidCallback onBack;

  const JoinUsTypeDetail({
    super.key,
    required this.type,
    required this.onBack,
  });

  static const _plans = [
    PlanData(
      name: 'Gratis',
      price: 'S/ 0',
      period: '2 meses',
      features: [
        'Apareces en búsquedas',
        'Foto de perfil',
        'Hasta 3 fotos del servicio',
        'Panel administrador',
      ],
      isHighlighted: false,
    ),
    PlanData(
      name: 'Estándar',
      price: 'S/ 19.90',
      period: 'al mes',
      badge: '1 MES GRATIS DE BIENVENIDA',
      features: [
        'Todo lo del plan Gratis',
        'Hasta 6 fotos del servicio',
        'Apareces primero en búsquedas',
        'Insignia verificado',
        'Estadísticas de visitas',
      ],
      isHighlighted: true,
    ),
    PlanData(
      name: 'Premium',
      price: 'S/ 39.90',
      period: 'al mes',
      features: [
        'Todo lo de Estándar',
        'Soporte prioritario 24/7',
        'Hasta 10 fotos del servicio',
        'Posición #1 garantizada',
        'Soporte prioritario',
        'Análisis de clientes',
        'Panel administradivo avanzado',
      ],
      isHighlighted: false,
      ctaLabel: 'Quiero el plan Premium',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final isOficio = type == 'OFICIO';

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Botón volver
          GestureDetector(
            onTap: onBack,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.arrow_back_rounded,
                  color: c.textSecondary,
                  size: 18,
                ),
                SizedBox(width: 6),
                Text(
                  'Volver',
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Eslogan diferenciado por tipo
          ShaderMask(
            shaderCallback: (bounds) => LinearGradient(
              colors: isOficio
                  ? const [Color(0xFF00C6FF), Color(0xFF0072FF)]
                  : const [Color(0xFF8E2DE2), Color(0xFF4A00E0)],
            ).createShader(bounds),
            child: Text(
              isOficio
                  ? 'Tu talento merece\nser encontrado.'
                  : 'Crece con la confianza\nde tu comunidad.',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w900,
                height: 1.25,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isOficio
                ? 'Crea tu perfil profesional y conecta con clientes que ya buscan tus servicios en tu zona.'
                : 'Dale a tu negocio la vitrina digital que merece. Clientes que confían en ti, regresan.',
            style: TextStyle(
              color: c.textSecondary,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),

          // Vista previa del perfil con fotos
          Text(
            'VISTA PREVIA DE TU PERFIL',
            style: TextStyle(
              color: c.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 12),
          ProfilePreviewMock(isOficio: isOficio),
          const SizedBox(height: 28),

          // Planes
          Text(
            'ELIGE TU PLAN',
            style: TextStyle(
              color: c.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 14),

          ..._plans.map(
            (plan) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: PlanCard(
                plan: plan,
                // Solo el plan Premium es interactivo: lleva al registro
                // con el plan PREMIUM preseleccionado → flujo de pago.
                onCta: plan.ctaLabel != null
                    ? () => _goToRegistration(context, plan: 'PREMIUM')
                    : null,
              ),
            ),
          ),

          const SizedBox(height: 8),
          const FreePeriodBanner(),
          const SizedBox(height: 28),

          // CTA: Registro o formulario directo según autenticación
          Consumer<AuthProvider>(
            builder: (_, auth, _) {
              final alreadyLoggedIn = auth.isAuthenticated;

              return Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      // CTA principal — registro con plan por defecto
                      // (Estándar de bienvenida). El plan Premium tiene
                      // su propio botón dentro de la tarjeta Premium.
                      onPressed: () => _goToRegistration(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: Text(
                        alreadyLoggedIn
                            ? (isOficio
                                ? 'Completar perfil de Profesional'
                                : 'Completar perfil de Negocio')
                            : (isOficio
                                ? 'Registrarme como Profesional'
                                : 'Registrarme como Negocio'),
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    alreadyLoggedIn
                        ? 'Accederás con tu cuenta actual'
                        : 'Sin tarjeta de crédito • Sin compromisos',
                    style: TextStyle(
                      color: c.textMuted,
                      fontSize: 12,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  /// Cierra el modal de "Únete" y abre el flujo de registro de
  /// proveedor. Si el usuario ya tiene sesión, va directo al
  /// formulario; si no, al login en modo registro. `plan` preselecciona
  /// el plan en el formulario ('PREMIUM' activa el flujo de pago).
  void _goToRegistration(BuildContext context, {String? plan}) {
    final alreadyLoggedIn = context.read<AuthProvider>().isAuthenticated;
    Navigator.pop(context); // Cerrar modal "Únete"

    if (alreadyLoggedIn) {
      // rootNavigator saca la pantalla del shell del cliente para no
      // dejar visible la bottom nav debajo.
      Navigator.of(context, rootNavigator: true).push(
        MaterialPageRoute(
          builder: (_) => ProviderOnboardingForm(
            providerType: type,
            isStandalone: true,
            selectedPlan: plan,
          ),
        ),
      );
    } else {
      // Sin sesión → flujo de registro habitual. El plan elegido se
      // re-selecciona dentro del formulario (opción "Adquirir plan
      // Premium" bajo el código de referido).
      Navigator.of(context, rootNavigator: true).push(
        MaterialPageRoute(
          builder: (_) => const LoginScreen(initialMode: AuthMode.register),
        ),
      );
    }
  }
}
