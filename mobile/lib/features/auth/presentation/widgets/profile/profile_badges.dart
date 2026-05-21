import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../screens/onboarding/provider_onboarding_form.dart';

/// Badge del tipo de cuenta del usuario. Color e etiqueta dependen del
/// rol y los perfiles aprobados:
///   - ADMIN → amber "Administrador"
///   - Negocio aprobado → morado "Cliente + Negocio[+ Profesional]"
///   - Oficio aprobado → verde "Cliente + Profesional"
///   - Sin perfil aprobado → azul "Cliente"
class AccountTypeBadge extends StatelessWidget {
  final AuthProvider auth;
  const AccountTypeBadge({super.key, required this.auth});

  @override
  Widget build(BuildContext context) {
    final Color color;
    if (auth.user?.role == 'ADMIN') {
      color = AppColors.amber;
    } else if (auth.hasApprovedProvider && auth.hasNegocioProfile) {
      color = const Color(0xFF8E2DE2);
    } else if (auth.hasApprovedProvider && auth.hasOficioProfile) {
      color = AppColors.available;
    } else {
      color = AppColors.primary;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        _label(),
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }

  String _label() {
    if (auth.user?.role == 'ADMIN') return 'Administrador';
    if (!auth.hasApprovedProvider) return 'Cliente';
    final parts = <String>['Cliente'];
    if (auth.hasOficioProfile) parts.add('Profesional');
    if (auth.hasNegocioProfile) parts.add('Negocio');
    return parts.join(' + ');
  }
}

/// Banner que aparece dentro de la sección "Mis perfiles" cuando un
/// perfil está en PENDIENTE o RECHAZADO. Al tocarlo abre un diálogo
/// explicativo: en PENDIENTE muestra los 3 pasos del proceso; en
/// RECHAZADO muestra el motivo + botón "Reintentar".
class PendingApprovalBanner extends StatelessWidget {
  /// 'OFICIO' | 'NEGOCIO'
  final String providerType;
  /// 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
  final String status;
  /// Motivo de rechazo (solo cuando status == 'RECHAZADO')
  final String? rejectionReason;

  const PendingApprovalBanner({
    super.key,
    required this.providerType,
    required this.status,
    this.rejectionReason,
  });

  bool get _isNegocio    => providerType == 'NEGOCIO';
  bool get _isRejected   => status == 'RECHAZADO';

  Color get _accentColor {
    if (_isRejected) return const Color(0xFFEF4444);
    return _isNegocio ? const Color(0xFF8E2DE2) : AppColors.available;
  }

  IconData get _icon {
    if (_isRejected) return Icons.cancel_rounded;
    return _isNegocio ? Icons.storefront_rounded : Icons.handyman_rounded;
  }

  String get _title {
    if (_isRejected) {
      return _isNegocio
          ? 'Tu negocio fue rechazado'
          : 'Tu perfil profesional fue rechazado';
    }
    return _isNegocio
        ? 'Esperando la aprobación del negocio'
        : 'Esperando la aprobación del perfil profesional';
  }

  String get _subtitle {
    if (_isRejected) return 'Toca para ver el motivo del rechazo';
    return 'Toca para conocer el proceso de revisión';
  }

  void _showDialog(BuildContext context) {
    if (_isRejected) {
      _showRejectionDialog(context);
    } else {
      _showApprovalInfoDialog(context);
    }
  }

  void _showRejectionDialog(BuildContext context) {
    final c = context.colors;
    const accent = Color(0xFFEF4444);
    showDialog(
      context: context,
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
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.cancel_rounded, color: accent, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      _isNegocio ? 'Negocio rechazado' : 'Perfil rechazado',
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'El administrador ha rechazado tu solicitud por el siguiente motivo:',
                style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.5),
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
                  rejectionReason ?? 'No se especificó un motivo.',
                  style: const TextStyle(
                    color: Color(0xFFEF4444),
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    height: 1.5,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: c.bgInput,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: AppColors.amber, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Puedes corregir la información e intentar registrarte nuevamente.',
                        style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.4),
                      ),
                    ),
                  ],
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
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Entendido', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        final auth = context.read<AuthProvider>();
                        // rootNavigator: el form de re-registro sale del
                        // shell del cliente para no dejar visible la
                        // bottom nav debajo.
                        Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
                          builder: (_) => ProviderOnboardingForm(
                            providerType: providerType,
                            isStandalone: true,
                            initialData: auth.providerDataFor(providerType),
                          ),
                        ));
                      },
                      icon: const Icon(Icons.refresh_rounded, size: 16),
                      label: const Text('Reintentar'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: accent,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        textStyle: const TextStyle(fontWeight: FontWeight.bold),
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

  void _showApprovalInfoDialog(BuildContext context) {
    final c = context.colors;
    final accent = _accentColor;
    showDialog(
      context: context,
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
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(_icon, color: accent, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      _isNegocio ? 'Aprobación del Negocio' : 'Aprobación del Perfil Profesional',
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              ApprovalStep(
                number: '1',
                title: 'Revisión de datos',
                description: 'El equipo de Servi verifica que la información de tu perfil sea correcta y completa.',
              ),
              const SizedBox(height: 14),
              ApprovalStep(
                number: '2',
                title: 'Verificación de identidad',
                description: 'Si proporcionaste DNI u otros documentos, se valida su autenticidad.',
              ),
              const SizedBox(height: 14),
              ApprovalStep(
                number: '3',
                title: 'Notificación de aprobación',
                description: 'Recibirás una notificación en la app cuando tu perfil sea aprobado y esté visible para los clientes.',
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: c.bgInput,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.schedule_rounded, color: AppColors.amber, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'El proceso suele demorar entre 24 y 48 horas hábiles.',
                        style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.4),
                      ),
                    ),
                  ],
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
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Entendido', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final accent = _accentColor;
    return GestureDetector(
      onTap: () => _showDialog(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: accent.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: accent.withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            Icon(_icon, color: accent, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _title,
                    style: TextStyle(
                      color: accent,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _subtitle,
                    style: TextStyle(color: c.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: accent, size: 20),
          ],
        ),
      ),
    );
  }
}

/// Paso enumerado mostrado en el diálogo de aprobación pendiente.
/// Círculo con número + título + descripción.
class ApprovalStep extends StatelessWidget {
  final String number;
  final String title;
  final String description;

  const ApprovalStep({
    super.key,
    required this.number,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              number,
              style: const TextStyle(
                color: AppColors.primary,
                fontSize: 12,
                fontWeight: FontWeight.bold,
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
                title,
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.4),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
