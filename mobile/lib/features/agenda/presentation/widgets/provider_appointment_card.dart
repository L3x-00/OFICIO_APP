import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
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
    final hasActions =
        onConfirm != null || onReject != null || onComplete != null;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
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
                  style: const TextStyle(
                    color: AppColors.textPrimary,
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
              const Icon(Icons.event, size: 15, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Text(
                fmtPeruDateTime(appt.date),
                style: const TextStyle(color: AppColors.textSecondary),
              ),
            ],
          ),
          if (appt.description != null && appt.description!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              appt.description!,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 12.5,
              ),
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
                      foregroundColor: Colors.black,
                    ),
                    child: const Text('Confirmar'),
                  ),
                if (onComplete != null)
                  ElevatedButton(
                    onPressed: onComplete,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.black,
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
