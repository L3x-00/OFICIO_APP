import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../theme/app_theme_colors.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';

/// Diálogos globales de efectos laterales de auth, extraídos de `main.dart`
/// (`_AuthSideEffectsState`) por mantenibilidad. Son funciones PURAS de UI:
/// reciben un `context` + payload y muestran el diálogo. Cero cambios
/// funcionales — el State de `main.dart` delega aquí conservando sus métodos.

/// Dialog informativo cuando el admin elimina el perfil del user.
void showProviderDeletionDialog(
  BuildContext context,
  ProviderDeletionPayload deletion,
) {
  final isNegocio = deletion.profileType == 'NEGOCIO';
  showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => AlertDialog(
      icon: const Icon(
        Icons.warning_amber_rounded,
        color: Colors.red,
        size: 40,
      ),
      title: Text(
        'Tu perfil ${isNegocio ? "de negocio" : "profesional"} fue eliminado',
        textAlign: TextAlign.center,
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (deletion.businessName.isNotEmpty) ...[
            Text(
              '"${deletion.businessName}"',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
          ],
          const Text('Motivo del administrador:'),
          const SizedBox(height: 4),
          Text(
            deletion.reason,
            style: const TextStyle(fontStyle: FontStyle.italic),
          ),
          const SizedBox(height: 12),
          const Text(
            'Si crees que es un error, contacta a soporte. Puedes '
            'volver a registrarte como profesional o negocio desde la '
            'pantalla principal.',
            style: TextStyle(fontSize: 13),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(),
          child: const Text('Entendido'),
        ),
      ],
    ),
  );
}

void showTrustRejectionDialog(
  BuildContext context,
  TrustRejectionPayload rejection,
) {
  final c = context.colors;
  const accent = Color(0xFFEF4444);
  showDialog(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.black.withValues(alpha: 0.7),
    builder: (ctx) => Dialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.shield_outlined, color: accent, size: 34),
            ),
            const SizedBox(height: 16),
            Text(
              'Solicitud de validación rechazada',
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
                color: accent.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: accent.withValues(alpha: 0.25)),
              ),
              child: Text(
                rejection.reason.isNotEmpty
                    ? rejection.reason
                    : 'No se especificó un motivo.',
                style: const TextStyle(
                  color: accent,
                  fontSize: 13,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: accent,
                      side: BorderSide(color: accent.withValues(alpha: 0.5)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text(
                      'Cerrar',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      showTrustRejectionDetailDialog(context, rejection);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text(
                      'Ver detalles',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}

void showPlanPromotionDialog(
  BuildContext context,
  PlanActivationPayload payload,
) {
  final c = context.colors;
  const green = Color(0xFF10B981);

  // Copy sin 'oportunidades' — subastas está oculta (kSubastasEnabled).
  final benefits = switch (payload.plan) {
    'PREMIUM' => [
      'Máxima visibilidad ante clientes',
      'Servicios y productos ilimitados',
      'Estadísticas avanzadas de perfil',
      'Badge "Premium" destacado',
      'Alcance en más distritos',
    ],
    'ESTANDAR' => [
      'Mayor visibilidad ante clientes',
      'Hasta 10 servicios o productos',
      'Estadísticas básicas de perfil',
      'Alcance en más distritos',
    ],
    _ => ['Mayor visibilidad ante clientes', 'Acceso a más funcionalidades'],
  };

  showDialog(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.black.withValues(alpha: 0.6),
    builder: (ctx) => Dialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 68,
              height: 68,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF065F46), Color(0xFF047857)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: green.withValues(alpha: 0.35),
                    blurRadius: 16,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: const Icon(
                Icons.workspace_premium_rounded,
                color: Colors.white,
                size: 34,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              payload.title,
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 17,
                fontWeight: FontWeight.w900,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              'Ahora tienes acceso a estos beneficios:',
              style: TextStyle(color: c.textSecondary, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: green.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: green.withValues(alpha: 0.25)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: benefits
                    .map(
                      (b) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.check_circle_rounded,
                              color: green,
                              size: 15,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                b,
                                style: const TextStyle(
                                  color: green,
                                  fontSize: 12,
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(ctx).pop(),
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
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      showPlanBenefitsDetailDialog(
                        context,
                        payload.plan,
                        benefits,
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text('Ver detalles'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}

void showPlanBenefitsDetailDialog(
  BuildContext context,
  String plan,
  List<String> benefits,
) {
  final c = context.colors;
  const green = Color(0xFF10B981);
  showDialog(
    context: context,
    builder: (ctx) => Dialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.workspace_premium_rounded,
                  color: green,
                  size: 22,
                ),
                const SizedBox(width: 10),
                Text(
                  'Plan ${plan[0]}${plan.substring(1).toLowerCase()} — Beneficios',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...benefits.asMap().entries.map(
              (e) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: green.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          '${e.key + 1}',
                          style: const TextStyle(
                            color: green,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        e.value,
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 13,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: const Text(
                  'Entendido',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

void showTrustRejectionDetailDialog(
  BuildContext context,
  TrustRejectionPayload rejection,
) {
  final c = context.colors;
  const accent = Color(0xFFEF4444);

  String formattedDate = '';
  if (rejection.rejectedAt != null) {
    try {
      final dt = DateTime.parse(rejection.rejectedAt!).toLocal();
      formattedDate =
          '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}'
          '  ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {}
  }

  showDialog(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.7),
    builder: (ctx) => Dialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.info_outline_rounded,
                    color: accent,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Detalles del rechazo',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Text(
              'Motivo',
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: accent.withValues(alpha: 0.25)),
              ),
              child: Text(
                rejection.reason.isNotEmpty
                    ? rejection.reason
                    : 'No se especificó un motivo.',
                style: const TextStyle(
                  color: accent,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
            ),
            if (formattedDate.isNotEmpty) ...[
              const SizedBox(height: 14),
              Text(
                'Fecha y hora',
                style: TextStyle(
                  color: c.textSecondary,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(
                    Icons.schedule_rounded,
                    size: 14,
                    color: c.textSecondary,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    formattedDate,
                    style: TextStyle(color: c.textSecondary, fontSize: 13),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 22),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: accent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                ),
                child: const Text(
                  'Entendido',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Modal "Solicitud rechazada" — el admin rechazó la solicitud de subida de
/// plan (pago Yape no verificado, etc.). Muestra el motivo del admin.
void showPlanRejectionDialog(
  BuildContext context,
  PlanRejectionPayload payload,
) {
  final c = context.colors;
  const accent = Color(0xFFEF4444);
  showDialog(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.black.withValues(alpha: 0.7),
    builder: (ctx) => Dialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.receipt_long_rounded,
                color: accent,
                size: 32,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Solicitud rechazada',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 17,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              'Tu solicitud de plan no pudo ser aprobada.',
              style: TextStyle(color: c.textSecondary, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: accent.withValues(alpha: 0.25)),
              ),
              child: Text(
                payload.reason.isNotEmpty
                    ? payload.reason
                    : 'No se especificó un motivo. Contacta a soporte.',
                style: const TextStyle(
                  color: accent,
                  fontSize: 13,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: accent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                ),
                child: const Text(
                  'Entendido',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

void showDeactivationDialog(BuildContext context) {
  final c = context.colors;
  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (_) => AlertDialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      icon: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: AppColors.busy.withValues(alpha: 0.12),
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.block_rounded, color: AppColors.busy, size: 34),
      ),
      title: Text(
        'Cuenta desactivada',
        style: TextStyle(
          color: c.textPrimary,
          fontWeight: FontWeight.bold,
          fontSize: 18,
        ),
        textAlign: TextAlign.center,
      ),
      content: Text(
        'Tu cuenta ha sido desactivada por el administrador.\n\n'
        'Por favor comunícate con soporte para recibir más información.\n\n'
        '📧 soporteofiapp@gmail.com',
        style: TextStyle(color: c.textSecondary, fontSize: 14, height: 1.6),
        textAlign: TextAlign.center,
      ),
      actionsAlignment: MainAxisAlignment.center,
      actions: [
        ElevatedButton(
          onPressed: () => Navigator.of(context, rootNavigator: true).pop(),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: const Text(
            'Entendido',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
      ],
    ),
  );
}
