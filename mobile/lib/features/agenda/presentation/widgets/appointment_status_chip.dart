import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/models/appointment_model.dart';

/// Chip de estado de una cita con su color correspondiente.
class AppointmentStatusChip extends StatelessWidget {
  const AppointmentStatusChip({super.key, required this.status});

  final String status;

  Color _color(BuildContext context) {
    switch (status) {
      case kApptConfirmada:
        return AppColors.available;
      case kApptPendiente:
        return AppColors.delayed;
      case kApptRechazada:
      case kApptCancelada:
        return AppColors.busy;
      case kApptCompletada:
        return AppColors.primary;
      default:
        return context.colors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _color(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: c.withValues(alpha: 0.3)),
      ),
      child: Text(
        appointmentStatusLabel(status),
        style: TextStyle(
          color: AppColors.tintOn(c, context.colors.isDark),
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
