import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../core/utils/peru_time.dart';
import '../../domain/models/appointment_model.dart';
import 'appointment_status_chip.dart';

/// Tarjeta de una cita en el panel del proveedor, con acciones según estado.
class ProviderAppointmentCard extends StatelessWidget {
  const ProviderAppointmentCard({
    super.key,
    required this.appt,
    this.onConfirm,
    this.onReject,
    this.onComplete,
  });

  final Appointment appt;
  final VoidCallback? onConfirm;
  final VoidCallback? onReject;
  final VoidCallback? onComplete;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hasActions =
        onConfirm != null || onReject != null || onComplete != null;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  appt.clientName?.isNotEmpty == true
                      ? appt.clientName!
                      : 'Cliente',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
              ),
              AppointmentStatusChip(status: appt.status),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(Icons.event, size: 15, color: c.textMuted),
              const SizedBox(width: 6),
              Text(
                fmtPeruDateTime(appt.date),
                style: TextStyle(color: c.textSecondary),
              ),
            ],
          ),
          if (appt.description != null && appt.description!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              appt.description!,
              style: TextStyle(color: c.textMuted, fontSize: 12.5),
            ),
          ],
          if (hasActions) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (onReject != null)
                  TextButton(
                    onPressed: onReject,
                    child: const Text(
                      'Rechazar',
                      style: TextStyle(color: AppColors.busy),
                    ),
                  ),
                if (onConfirm != null)
                  ElevatedButton(
                    onPressed: onConfirm,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.available,
                      foregroundColor: AppColors.onSolid(AppColors.available),
                    ),
                    child: const Text('Confirmar'),
                  ),
                if (onComplete != null)
                  ElevatedButton(
                    onPressed: onComplete,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.onSolid(AppColors.primary),
                    ),
                    child: const Text('Completar'),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
