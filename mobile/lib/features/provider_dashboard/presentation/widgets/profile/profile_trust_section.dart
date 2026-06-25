import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../auth/presentation/providers/auth_provider.dart';
import '../../../../trust_validation/presentation/screens/trust_validation_form_screen.dart';
import 'profile_components.dart';

/// Sección de validación de confianza. Cuatro estados según el
/// [AuthProvider]:
///   - NONE     → CTA para solicitar validación.
///   - PENDING  → banner ámbar "en proceso", sin botón.
///   - APPROVED → banner verde prominente "DATOS VALIDADOS".
///   - REJECTED → banner rojo con "Ver detalles" + "Volver a solicitar".
class ProfileTrustSection extends StatelessWidget {
  final bool isNegocio;

  const ProfileTrustSection({super.key, required this.isNegocio});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final auth = context.watch<AuthProvider>();
    final type = isNegocio ? 'NEGOCIO' : 'OFICIO';
    final trustStatus =
        auth.providerDataFor(type)?['trustStatus'] as String? ?? 'NONE';
    final isTrusted =
        auth.providerDataFor(type)?['isTrusted'] as bool? ?? false;

    // Colores y textos según estado
    final Color accent;
    final IconData icon;
    final String title;
    final String subtitle;

    if (isTrusted) {
      accent = AppColors.available;
      icon = Icons.verified_rounded;
      title = '¡Perfil verificado como confiable!';
      subtitle =
          'Tu perfil cuenta con el badge de "Profesional Confiable". Los clientes pueden contratarte con total seguridad.';
    } else if (trustStatus == 'PENDING') {
      accent = AppColors.amber;
      icon = Icons.hourglass_top_rounded;
      title = 'Validación en proceso';
      subtitle =
          'Tu solicitud está siendo revisada por nuestro equipo. Te notificaremos cuando tengamos una respuesta.';
    } else if (trustStatus == 'REJECTED') {
      accent = AppColors.busy;
      icon = Icons.cancel_rounded;
      title = 'Solicitud rechazada';
      subtitle =
          'Tu solicitud fue rechazada. Puedes enviar una nueva solicitud corrigiendo la información.';
    } else {
      accent = AppColors.primary;
      icon = Icons.shield_outlined;
      title = 'Solicitar validación de datos';
      subtitle =
          'Valida tu identidad para obtener el badge de "Profesional Confiable" y generar más confianza en los clientes.';
    }

    // REJECTED → banner rojo con dos botones de acción
    if (trustStatus == 'REJECTED') {
      const red = AppColors.busy;
      // Prioridad: motivo específico del rechazo de confianza, luego del rechazo de verificación
      final reason =
          (auth.providerDataFor(type)?['trustRejectionReason'] as String?) ??
          auth.rejectionReasonFor(type) ??
          'No se especificó un motivo.';
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle(
            icon: Icons.shield_rounded,
            title: 'Confianza y Validación',
            color: red,
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: red.withValues(alpha: 0.07),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: red.withValues(alpha: 0.4), width: 1.5),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.cancel_rounded, color: red, size: 22),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'Solicitud rechazada',
                        style: TextStyle(
                          color: red,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Tu solicitud de validación fue rechazada. Revisa el motivo y vuelve a solicitarla.',
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 12,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => showDialog(
                          context: context,
                          builder: (ctx) => RejectionDetailDialog(
                            reason: reason,
                            onRevalidate: () {
                              Navigator.of(ctx).pop();
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => TrustValidationFormScreen(
                                    providerType: type,
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        icon: const Icon(Icons.info_outline_rounded, size: 15),
                        label: const Text(
                          'Ver detalles',
                          style: TextStyle(fontSize: 12),
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: red,
                          side: BorderSide(color: red.withValues(alpha: 0.5)),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                TrustValidationFormScreen(providerType: type),
                          ),
                        ),
                        icon: const Icon(Icons.refresh_rounded, size: 15),
                        label: const Text(
                          'Volver a solicitar',
                          style: TextStyle(fontSize: 12),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: red,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      );
    }

    // isTrusted → banner verde prominente, sin botón
    // isTrusted → tarjeta compacta e interactiva, adaptada al tema
    if (isTrusted) {
      const green = AppColors.available; // verde salvia (aprobación)
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle(
            icon: Icons.shield_rounded,
            title: 'Confianza y Validación',
            color: green,
          ),
          const SizedBox(height: 12),
          Material(
            color: c.bgCard, // Fondo dinámico del tema
            borderRadius: BorderRadius.circular(14),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () {
                // Hacemos la tarjeta interactiva
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text(
                      'Tu identidad fue verificada. Los clientes te ven como un profesional confiable.',
                    ),
                    backgroundColor: const Color(0xFF059669),
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                );
              },
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: green.withValues(alpha: 0.25)),
                  // Sombra verde sutil en tema claro, casi imperceptible en oscuro
                  boxShadow: [
                    BoxShadow(
                      color: green.withValues(
                        alpha: Theme.of(context).brightness == Brightness.dark
                            ? 0.05
                            : 0.12,
                      ),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    // Ícono circular
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: green.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.verified_rounded,
                        color: green,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 14),
                    // Textos
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Datos Validados',
                            style: TextStyle(
                              color: c.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            isNegocio
                                ? 'Tu negocio es confiable y seguro'
                                : 'Tu perfil es confiable y seguro',
                            style: TextStyle(
                              color: c.textSecondary,
                              fontSize: 12,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Badge compacto a la derecha
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: green,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.shield_rounded,
                            color: Colors.white,
                            size: 11,
                          ),
                          SizedBox(width: 4),
                          Text(
                            'Verificado',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          icon: Icons.shield_rounded,
          title: 'Confianza y Validación',
          color: accent,
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: accent.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: accent.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, color: accent, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      title,
                      style: TextStyle(
                        color: accent,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                style: TextStyle(
                  color: c.textSecondary,
                  fontSize: 12,
                  height: 1.5,
                ),
              ),
              if (trustStatus != 'PENDING') ...[
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) =>
                            TrustValidationFormScreen(providerType: type),
                      ),
                    ),
                    icon: Icon(
                      trustStatus == 'REJECTED'
                          ? Icons.refresh_rounded
                          : Icons.verified_user_rounded,
                      size: 16,
                    ),
                    label: Text(
                      trustStatus == 'REJECTED'
                          ? 'Reintentar validación'
                          : 'Solicitar validación de datos',
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      textStyle: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// Diálogo que muestra el motivo del rechazo de validación + botón para
/// solicitar revalidación.
class RejectionDetailDialog extends StatelessWidget {
  final String reason;
  final VoidCallback onRevalidate;

  const RejectionDetailDialog({
    super.key,
    required this.reason,
    required this.onRevalidate,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    const red = AppColors.busy;
    return Dialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: red.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.cancel_rounded, color: red, size: 30),
            ),
            const SizedBox(height: 16),
            Text(
              'Motivo del rechazo',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 17,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: red.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: red.withValues(alpha: 0.2)),
              ),
              child: Text(
                reason,
                style: TextStyle(
                  color: c.textSecondary,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: c.textMuted,
                      side: BorderSide(color: c.border),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text('Aceptar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: onRevalidate,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text(
                      'Solicitar revalidación',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
