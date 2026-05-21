import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/auth/presentation/screens/onboarding/provider_onboarding_form.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../screens/login_screen.dart';

import 'join_us_components.dart';
import 'join_us_status_banners.dart';

/// Vista inicial del modal "¡Quiero ser parte!".
///
/// Compone:
///   - Header con gradiente y CTA emocional.
///   - Lista de beneficios.
///   - Tarjetas de estadísticas (3 columnas).
///   - Tarjetas de tipo (OFICIO / NEGOCIO) reactivas al estado del
///     [AuthProvider] — muestra banners de PENDIENTE / APROBADO / RECHAZADO
///     según corresponda.
///   - Atajo "Quiero ser cliente" para usuarios no autenticados.
///
/// Callbacks:
///   - [onSelectType]: invocado con 'OFICIO' o 'NEGOCIO' cuando el usuario
///     toca una [TypeCard].
///   - [onOpenPanel]: invocado con el tipo cuando el usuario toca un banner
///     de perfil aprobado.
///   - [onOpenPanelChoice]: invocado cuando el usuario tiene ambos perfiles
///     aprobados y elige "Ir a mi panel".
class JoinUsInitialView extends StatelessWidget {
  final ValueChanged<String> onSelectType;
  final ValueChanged<String> onOpenPanel;
  final VoidCallback onOpenPanelChoice;

  const JoinUsInitialView({
    super.key,
    required this.onSelectType,
    required this.onOpenPanel,
    required this.onOpenPanelChoice,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header con gradiente
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFFFF6B35).withValues(alpha: 0.15),
                  const Color(0xFFFFB347).withValues(alpha: 0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: const Color(0xFFFF6B35).withValues(alpha: 0.2),
              ),
            ),
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFF6B35), Color(0xFFFFB347)],
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFFF6B35).withValues(alpha: 0.3),
                        blurRadius: 20,
                        spreadRadius: 3,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.rocket_launch_rounded,
                    color: Colors.white,
                    size: 30,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  '¡Tu talento merece\nser encontrado!',
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
                  'Miles de personas en tu zona buscan exactamente lo que tú ofreces. '
                  'Únete a Servi gratis los primeros 2 meses.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 13,
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // Beneficios
          Text(
            '¿POR QUÉ UNIRTE?',
            style: TextStyle(
              color: c.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 14),

          ...kJoinUsBenefits.map(
            (b) => BenefitRow(
              icon: b['icon'] as IconData,
              title: b['title'] as String,
              subtitle: b['subtitle'] as String,
              color: b['color'] as Color,
            ),
          ),

          const SizedBox(height: 28),

          // Estadísticas ficticias pero motivadoras
          const Row(
            children: [
              Expanded(
                child: StatCard(
                  value: '100%',
                  label: 'Gratis\n2 meses',
                  color: AppColors.available,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  value: '+500',
                  label: 'Búsquedas\nal mes',
                  color: AppColors.primary,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  value: '4.8★',
                  label: 'Calificación\npromedio',
                  color: AppColors.star,
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),

          // Opciones de tipo — reactivas al estado de aprobación en tiempo real
          Consumer<AuthProvider>(
            builder: (_, auth, _) {
              final canOficio  = !auth.isAuthenticated || auth.canBecomeRole('OFICIO');
              final canNegocio = !auth.isAuthenticated || auth.canBecomeRole('NEGOCIO');

              final oficioStatus  = auth.verificationStatusFor('OFICIO');
              final negocioStatus = auth.verificationStatusFor('NEGOCIO');

              final hasPendingOficio   = auth.isAuthenticated && !canOficio  && oficioStatus  == 'PENDIENTE';
              final hasPendingNegocio  = auth.isAuthenticated && !canNegocio && negocioStatus == 'PENDIENTE';
              final hasApprovedOficio  = auth.isAuthenticated && !canOficio  && oficioStatus  == 'APROBADO';
              final hasApprovedNegocio = auth.isAuthenticated && !canNegocio && negocioStatus == 'APROBADO';
              final hasRejectedOficio  = auth.isAuthenticated && !canOficio  && oficioStatus  == 'RECHAZADO';
              final hasRejectedNegocio = auth.isAuthenticated && !canNegocio && negocioStatus == 'RECHAZADO';

              // Ambos aprobados → botón único de panel con selección
              if (hasApprovedOficio && hasApprovedNegocio) {
                return GestureDetector(
                  onTap: () {
                    Navigator.pop(context);
                    onOpenPanelChoice();
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          const Color(0xFF1E88E5).withValues(alpha: 0.12),
                          const Color(0xFF1565C0).withValues(alpha: 0.06),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF1E88E5).withValues(alpha: 0.35)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E88E5).withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.dashboard_rounded, color: Color(0xFF1E88E5), size: 22),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Ir a mi panel',
                                style: TextStyle(
                                  color: c.textPrimary,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Tienes perfil de Profesional y Negocio activos',
                                style: TextStyle(color: c.textMuted, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF1E88E5), size: 14),
                      ],
                    ),
                  ),
                );
              }

              final hasAnyItem = canOficio || canNegocio || hasPendingOficio ||
                  hasPendingNegocio || hasApprovedOficio || hasApprovedNegocio ||
                  hasRejectedOficio || hasRejectedNegocio;

              if (!hasAnyItem) return const SizedBox.shrink();

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (canOficio || canNegocio) ...[
                    Text(
                      '¿CÓMO QUIERES APARECER?',
                      style: TextStyle(
                        color: c.textMuted,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // ── OFICIO ────────────────────────────────
                  if (canOficio) ...[
                    TypeCard(
                      icon: Icons.handyman_rounded,
                      title: 'Soy un profesional independiente',
                      subtitle: 'Tu habilidad + nuestra plataforma = más clientes.\nElectricista, gasfitero, pintor, carpintero…',
                      tag: 'OFICIO',
                      gradient: const [Color(0xFF00C6FF), Color(0xFF0072FF)],
                      onTap: () => onSelectType('OFICIO'),
                    ),
                    const SizedBox(height: 14),
                  ],
                  if (hasPendingOficio) ...[
                    const PendingBanner(
                      icon: Icons.handyman_rounded,
                      label: 'Tu perfil de Profesional está esperando aprobación del administrador.',
                    ),
                    const SizedBox(height: 14),
                  ],
                  if (hasApprovedOficio) ...[
                    ApprovedProfileBanner(
                      icon: Icons.handyman_rounded,
                      label: 'Perfil Profesional aprobado',
                      gradient: const [Color(0xFF00C6FF), Color(0xFF0072FF)],
                      onTap: () {
                        Navigator.pop(context);
                        onOpenPanel('OFICIO');
                      },
                    ),
                    const SizedBox(height: 14),
                  ],
                  if (hasRejectedOficio) ...[
                    RejectedBanner(
                      icon: Icons.handyman_rounded,
                      label: 'Tu perfil de Profesional fue rechazado',
                      reason: auth.rejectionReasonFor('OFICIO'),
                      onReRegister: () {
                        Navigator.pop(context);
                        // rootNavigator: el form de registro sale del
                        // shell del cliente para no mostrar bottom nav.
                        Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
                          builder: (_) => ProviderOnboardingForm(
                            providerType: 'OFICIO',
                            isStandalone: true,
                            initialData: auth.providerDataFor('OFICIO'),
                          ),
                        ));
                      },
                    ),
                    const SizedBox(height: 14),
                  ],

                  // ── NEGOCIO ───────────────────────────────
                  if (canNegocio) ...[
                    TypeCard(
                      icon: Icons.storefront_rounded,
                      title: 'Tengo un negocio establecido',
                      subtitle: 'Crece con la confianza de tu comunidad.\nRestaurante, peluquería, ferretería, taller…',
                      tag: 'NEGOCIO',
                      gradient: const [Color(0xFF8E2DE2), Color(0xFF4A00E0)],
                      onTap: () => onSelectType('NEGOCIO'),
                    ),
                  ],
                  if (hasPendingNegocio)
                    const PendingBanner(
                      icon: Icons.storefront_rounded,
                      label: 'Tu negocio está esperando aprobación del administrador.',
                    ),
                  if (hasApprovedNegocio)
                    ApprovedProfileBanner(
                      icon: Icons.storefront_rounded,
                      label: 'Negocio aprobado',
                      gradient: const [Color(0xFF8E2DE2), Color(0xFF4A00E0)],
                      onTap: () {
                        Navigator.pop(context);
                        onOpenPanel('NEGOCIO');
                      },
                    ),
                  if (hasRejectedNegocio) ...[
                    const SizedBox(height: 14),
                    RejectedBanner(
                      icon: Icons.storefront_rounded,
                      label: 'Tu negocio fue rechazado',
                      reason: auth.rejectionReasonFor('NEGOCIO'),
                      onReRegister: () {
                        Navigator.pop(context);
                        // rootNavigator: el form de registro sale del
                        // shell del cliente para no mostrar bottom nav.
                        Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
                          builder: (_) => ProviderOnboardingForm(
                            providerType: 'NEGOCIO',
                            isStandalone: true,
                            initialData: auth.providerDataFor('NEGOCIO'),
                          ),
                        ));
                      },
                    ),
                  ],
                ],
              );
            },
          ),

          const SizedBox(height: 20),

          // Opción: Registrarse como cliente (solo para no autenticados)
          Consumer<AuthProvider>(
            builder: (_, auth, _) {
              if (auth.isAuthenticated) return const SizedBox.shrink();
              return Column(
                children: [
                  Row(
                    children: [
                      Expanded(child: Divider(color: c.border)),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text(
                          'O SIMPLEMENTE',
                          style: TextStyle(
                            color: c.textMuted,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ),
                      Expanded(child: Divider(color: c.border)),
                    ],
                  ),
                  const SizedBox(height: 14),
                  GestureDetector(
                    onTap: () {
                      Navigator.pop(context);
                      // rootNavigator: el login sale del shell del
                      // cliente para no dejar visible la bottom nav.
                      Navigator.of(context, rootNavigator: true).push(
                        MaterialPageRoute(
                          builder: (_) => const LoginScreen(
                            initialMode: AuthMode.register,
                          ),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: c.bgCard,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: c.border),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: AppColors.available.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.person_add_rounded,
                              color: AppColors.available,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Quiero ser cliente',
                                  style: TextStyle(
                                    color: c.textPrimary,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  'Busca, compara y contrata servicios en tu zona.',
                                  style: TextStyle(
                                    color: c.textSecondary,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            Icons.arrow_forward_ios_rounded,
                            color: c.textMuted,
                            size: 14,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
