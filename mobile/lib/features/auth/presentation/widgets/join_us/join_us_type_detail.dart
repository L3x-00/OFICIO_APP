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
///   - Lista de planes (Gratis / Estándar / Premium) con efecto acordeón.
///   - [FreePeriodBanner].
///   - CTA: si el usuario ya está autenticado, abre el onboarding form
///     directamente; si no, abre el LoginScreen en modo register.
class JoinUsTypeDetail extends StatefulWidget {
  final String type; // 'OFICIO' | 'NEGOCIO'
  final VoidCallback onBack;

  const JoinUsTypeDetail({super.key, required this.type, required this.onBack});

  @override
  State<JoinUsTypeDetail> createState() => _JoinUsTypeDetailState();
}

class _JoinUsTypeDetailState extends State<JoinUsTypeDetail> {
  // Índice del plan expandido. Iniciamos con 'Estándar' (1) expandido por defecto.
  int? _expandedPlanIndex = 1;

  static const _plans = [
    PlanData(
      name: 'Gratis',
      price: 'S/ 0',
      period: 'por siempre ',
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
    final isOficio = widget.type == 'OFICIO';

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Botón volver
            GestureDetector(
              onTap: widget.onBack,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.arrow_back_rounded,
                    color: c.textSecondary,
                    size: 18,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Volver',
                    style: TextStyle(color: c.textSecondary, fontSize: 13),
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

            // Mapeo de los planes con el nuevo diseño acordeón
            ...List.generate(_plans.length, (index) {
              return _AnimatedPlanCard(
                plan: _plans[index],
                isExpanded: _expandedPlanIndex == index,
                onToggle: () {
                  setState(() {
                    _expandedPlanIndex = _expandedPlanIndex == index
                        ? null
                        : index;
                  });
                },
                onCta: _plans[index].ctaLabel != null
                    ? () => _goToRegistration(context, plan: 'PREMIUM')
                    : null,
              );
            }),

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
                          style: const TextStyle(
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
                      style: TextStyle(color: c.textMuted, fontSize: 12),
                      textAlign: TextAlign.center,
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Cierra el modal de "Únete" y abre el flujo de registro de
  /// proveedor.
  void _goToRegistration(BuildContext context, {String? plan}) {
    final alreadyLoggedIn = context.read<AuthProvider>().isAuthenticated;
    Navigator.pop(context); // Cerrar modal "Únete"

    if (alreadyLoggedIn) {
      Navigator.of(context, rootNavigator: true).push(
        MaterialPageRoute(
          builder: (_) => ProviderOnboardingForm(
            providerType: widget.type,
            isStandalone: true,
            selectedPlan: plan,
          ),
        ),
      );
    } else {
      Navigator.of(context, rootNavigator: true).push(
        MaterialPageRoute(
          builder: (_) => const LoginScreen(initialMode: AuthMode.register),
        ),
      );
    }
  }
}

/// Widget personalizado para renderizar cada plan con efecto acordeón
/// y colores adaptables al tema.
class _AnimatedPlanCard extends StatelessWidget {
  final PlanData plan;
  final bool isExpanded;
  final VoidCallback onToggle;
  final VoidCallback? onCta;

  const _AnimatedPlanCard({
    required this.plan,
    required this.isExpanded,
    required this.onToggle,
    required this.onCta,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Definición de colores según el plan y el tema
    Color bgColor;
    Color borderColor;
    Color accentColor;

    if (plan.name == 'Gratis') {
      bgColor = isDark ? Colors.grey.shade800 : Colors.grey.shade200;
      borderColor = isDark ? Colors.grey.shade600 : Colors.grey.shade400;
      accentColor = isDark ? Colors.grey.shade400 : Colors.grey.shade600;
    } else if (plan.name == 'Estándar') {
      bgColor = isDark ? const Color(0xFF0D2744) : const Color(0xFFE3F2FD);
      borderColor = isDark ? const Color(0xFF64B5F6) : const Color(0xFF1565C0);
      accentColor = borderColor;
    } else {
      // Premium
      bgColor = isDark ? const Color(0xFF3D3200) : const Color(0xFFFFF8E1);
      borderColor = isDark ? const Color(0xFFFFD54F) : const Color(0xFFFFB300);
      accentColor = borderColor;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isExpanded
            ? [
                BoxShadow(
                  color: borderColor.withOpacity(0.3),
                  blurRadius: 12,
                  spreadRadius: 1,
                ),
              ]
            : [],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14.5),
        child: Column(
          children: [
            // Header del acordeón (Siempre visible)
            InkWell(
              onTap: onToggle,
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (plan.badge != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: accentColor.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                plan.badge!,
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: accentColor,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                          ],
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                plan.name,
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: c.textPrimary,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                plan.price,
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: accentColor,
                                ),
                              ),
                              Text(
                                ' / ${plan.period}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: c.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    // Flecha interactiva con animación
                    AnimatedRotation(
                      turns: isExpanded ? 0.5 : 0,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                      child: Icon(
                        Icons.keyboard_arrow_down_rounded,
                        color: c.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Cuerpo del acordeón (Animado)
            AnimatedSize(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeInOut,
              alignment: Alignment.topCenter,
              child: isExpanded
                  ? Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Divider(
                            color: accentColor.withOpacity(0.3),
                            height: 1,
                          ),
                          const SizedBox(height: 12),
                          ...plan.features.map(
                            (f) => Padding(
                              padding: const EdgeInsets.only(bottom: 8.0),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.check_circle_rounded,
                                    size: 16,
                                    color: accentColor,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      f,
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: c.textSecondary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          if (plan.ctaLabel != null) ...[
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: onCta,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: accentColor,
                                  foregroundColor: isDark
                                      ? Colors.black
                                      : Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 14,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: Text(
                                  plan.ctaLabel!,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}
