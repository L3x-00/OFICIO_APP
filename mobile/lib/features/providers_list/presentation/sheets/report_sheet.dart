import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/app_snack_bar.dart';
import '../../data/providers_repository.dart';

/// Modal para reportar un proveedor por contenido inapropiado, fraude, etc.
class ReportSheet {
  static const _reasons = [
    ('INFORMACION_FALSA', 'Información falsa o engañosa'),
    ('COMPORTAMIENTO', 'Comportamiento inapropiado'),
    ('FRAUDE', 'Posible fraude o estafa'),
    ('FOTO_INAPROPIADA', 'Fotos inapropiadas'),
    ('NO_PRESTO', 'No prestó el servicio'),
    ('OTRO', 'Otro motivo'),
  ];

  static Future<void> show(
    BuildContext context, {
    required int providerId,
    required String providerName,
    required int userId,
    required ProvidersRepository repo,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ReportSheetContent(
        providerId: providerId,
        providerName: providerName,
        userId: userId,
        repo: repo,
        reasons: _reasons,
      ),
    );
  }
}

class _ReportSheetContent extends StatefulWidget {
  final int providerId;
  final String providerName;
  final int userId;
  final ProvidersRepository repo;
  final List<(String, String)> reasons;

  const _ReportSheetContent({
    required this.providerId,
    required this.providerName,
    required this.userId,
    required this.repo,
    required this.reasons,
  });

  @override
  State<_ReportSheetContent> createState() => _ReportSheetContentState();
}

class _ReportSheetContentState extends State<_ReportSheetContent> {
  String? _selectedReason;
  final _descController = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_selectedReason == null) return;
    setState(() => _sending = true);
    try {
      await widget.repo.reportProvider(
        providerId: widget.providerId,
        userId: widget.userId,
        reason: _selectedReason!,
        description: _descController.text.trim(),
      );
      if (mounted) {
        Navigator.of(context).pop();
        _showReportSuccessDialog(context);
      }
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().toLowerCase().contains('ya enviaste')
          ? 'Ya enviaste un reporte para este proveedor.'
          : 'No se pudo enviar el reporte. Intenta de nuevo.';
      Navigator.of(context).pop();
      context.showErrorSnack(msg);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _showReportSuccessDialog(BuildContext ctx) {
    final c = ctx.colors;
    showDialog(
      context: ctx,
      builder: (dCtx) => Dialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: AppColors.available.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppColors.available.withValues(alpha: 0.35),
                    width: 0.5,
                  ),
                ),
                child: Icon(
                  Icons.check_circle_rounded,
                  color: c.isDark
                      ? AppColors.available
                      : Color.alphaBlend(
                          Colors.black.withValues(alpha: 0.45),
                          AppColors.available,
                        ),
                  size: 32,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Reporte enviado con éxito',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Gracias por hacer de esta una comunidad saludable. Nuestro equipo revisará tu reporte a la brevedad.',
                style: TextStyle(
                  color: c.textSecondary,
                  fontSize: 13,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(dCtx).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Aceptar',
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

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final bottomPad = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 24 + bottomPad),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: c.border, width: 0.5)),
        boxShadow: [
          BoxShadow(
            color: AppColors.amberDeep.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: c.textMuted.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Título
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.busy.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.flag_rounded,
                  color: AppColors.busy,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Reportar proveedor',
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      widget.providerName,
                      style: TextStyle(color: c.textMuted, fontSize: 12),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              GestureDetector(
                onTap: () => Navigator.of(context).pop(),
                child: Icon(Icons.close_rounded, color: c.textMuted, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 20),

          Text(
            '¿Cuál es el motivo del reporte?',
            style: TextStyle(
              color: c.textSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),

          // Motivos
          ...widget.reasons.map(((String, String) r) {
            final (key, label) = r;
            final selected = _selectedReason == key;
            return GestureDetector(
              onTap: () => setState(() => _selectedReason = key),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 11,
                ),
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.busy.withValues(alpha: 0.08)
                      : c.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: selected
                        ? AppColors.busy.withValues(alpha: 0.5)
                        : c.border,
                    width: 0.5,
                  ),
                ),
                child: Row(
                  children: [
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 150),
                      child: Icon(
                        selected
                            ? Icons.radio_button_checked_rounded
                            : Icons.radio_button_unchecked_rounded,
                        color: selected ? AppColors.busy : c.textMuted,
                        size: 18,
                        key: ValueKey(selected),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      label,
                      style: TextStyle(
                        color: selected ? c.textPrimary : c.textSecondary,
                        fontSize: 13,
                        fontWeight: selected
                            ? FontWeight.w600
                            : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),

          const SizedBox(height: 4),

          // Detalle opcional
          TextField(
            controller: _descController,
            style: TextStyle(color: c.textPrimary, fontSize: 13),
            maxLines: 2,
            maxLength: 300,
            decoration: InputDecoration(
              hintText: 'Detalle adicional (opcional)…',
              hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
              filled: true,
              fillColor: c.bgCard,
              counterStyle: TextStyle(color: c.textMuted, fontSize: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 10,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Botones
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _sending
                      ? null
                      : () => Navigator.of(context).pop(),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: c.textSecondary,
                    side: BorderSide(color: c.border, width: 0.5),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Cancelar'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: (_selectedReason == null || _sending)
                      ? null
                      : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.busy,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppColors.busy.withValues(
                      alpha: 0.4,
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: _sending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Enviar reporte',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
