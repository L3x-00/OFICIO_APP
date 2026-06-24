import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../domain/models/quotation_model.dart';

/// Chip de estado de una cotización con su color.
class QuotationStatusChip extends StatelessWidget {
  const QuotationStatusChip({super.key, required this.status});

  final String status;

  Color get _color {
    switch (status) {
      case kQuotRespondida:
        return AppColors.available;
      case kQuotPendiente:
        return AppColors.delayed;
      case kQuotRechazada:
        return AppColors.busy;
      default:
        return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _color;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: c.withValues(alpha: 0.3)),
      ),
      child: Text(
        quotationStatusLabel(status),
        style: TextStyle(color: c, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }
}
