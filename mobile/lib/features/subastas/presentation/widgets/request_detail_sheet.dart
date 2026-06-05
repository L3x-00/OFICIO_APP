import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Detalle completo de una solicitud/oportunidad, reutilizable por el CLIENTE
/// (ServiceRequestModel) y el PROVEEDOR (OpportunityModel). Bottom sheet con
/// botón de cierre explícito + arrastre → NUNCA es un dead-end.
class RequestDetailSheet extends StatelessWidget {
  final String categoryName;
  final String description;
  final String? photoUrl;
  final String? locationLabel;
  final double? budgetMin;
  final double? budgetMax;
  final DateTime? desiredDate;
  final DateTime? expiresAt;

  /// Estado actual (etiqueta + color), coherente con los badges de la lista.
  final String statusLabel;
  final Color statusColor;

  /// Contenido opcional al pie (p. ej. proveedor seleccionado para el cliente).
  final Widget? footer;

  const RequestDetailSheet({
    super.key,
    required this.categoryName,
    required this.description,
    required this.statusLabel,
    required this.statusColor,
    this.photoUrl,
    this.locationLabel,
    this.budgetMin,
    this.budgetMax,
    this.desiredDate,
    this.expiresAt,
    this.footer,
  });

  static Future<void> show(
    BuildContext context, {
    required String categoryName,
    required String description,
    required String statusLabel,
    required Color statusColor,
    String? photoUrl,
    String? locationLabel,
    double? budgetMin,
    double? budgetMax,
    DateTime? desiredDate,
    DateTime? expiresAt,
    Widget? footer,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RequestDetailSheet(
        categoryName: categoryName,
        description: description,
        statusLabel: statusLabel,
        statusColor: statusColor,
        photoUrl: photoUrl,
        locationLabel: locationLabel,
        budgetMin: budgetMin,
        budgetMax: budgetMax,
        desiredDate: desiredDate,
        expiresAt: expiresAt,
        footer: footer,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.95,
      minChildSize: 0.45,
      builder: (_, ctrl) => Container(
        decoration: BoxDecoration(
          color: c.bg,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            // Handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: c.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Header con botón de cierre (sin dead-end).
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Detalle de la solicitud',
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: c.textMuted),
                    onPressed: () => Navigator.of(context).pop(),
                    tooltip: 'Cerrar',
                  ),
                ],
              ),
            ),
            const Divider(height: 16),
            Expanded(
              child: ListView(
                controller: ctrl,
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                children: [
                  // Estado actual.
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        statusLabel,
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  // Foto (si hay).
                  if (photoUrl != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Image.network(
                        photoUrl!,
                        width: double.infinity,
                        height: 200,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],
                  // Categoría.
                  Text(
                    categoryName.toUpperCase(),
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Descripción completa.
                  Text(
                    description,
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 15,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Meta: ubicación, presupuesto, fecha deseada, expiración.
                  if (locationLabel != null && locationLabel!.trim().isNotEmpty)
                    _MetaRow(
                      icon: Icons.location_on_outlined,
                      label: locationLabel!,
                    ),
                  if (budgetMin != null || budgetMax != null)
                    _MetaRow(
                      icon: Icons.payments_outlined,
                      label: _budgetLabel(budgetMin, budgetMax),
                    ),
                  if (desiredDate != null)
                    _MetaRow(
                      icon: Icons.event_outlined,
                      label: 'Fecha deseada: ${_fmtDate(desiredDate!)}',
                    ),
                  if (expiresAt != null)
                    _MetaRow(
                      icon: Icons.timer_outlined,
                      label: _expiryLabel(expiresAt!),
                    ),
                  if (footer != null) ...[const SizedBox(height: 16), footer!],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _budgetLabel(double? min, double? max) {
    if (min != null && max != null) {
      return 'Presupuesto: S/ ${min.toStringAsFixed(0)} – ${max.toStringAsFixed(0)}';
    }
    if (min != null) return 'Presupuesto: desde S/ ${min.toStringAsFixed(0)}';
    if (max != null) return 'Presupuesto: hasta S/ ${max.toStringAsFixed(0)}';
    return 'Presupuesto: a convenir';
  }

  static String _fmtDate(DateTime d) => '${d.day}/${d.month}/${d.year}';

  static String _expiryLabel(DateTime expiresAt) {
    final left = expiresAt.difference(DateTime.now());
    if (left.isNegative) return 'Vencida';
    final h = left.inHours;
    final m = left.inMinutes.remainder(60);
    return h > 0 ? 'Expira en ${h}h ${m}m' : 'Expira en ${m}m';
  }
}

class _MetaRow extends StatelessWidget {
  final IconData icon;
  final String label;
  const _MetaRow({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, size: 16, color: c.textMuted),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(color: c.textSecondary, fontSize: 13.5),
            ),
          ),
        ],
      ),
    );
  }
}
