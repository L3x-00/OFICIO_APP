import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'schedule_editor.dart';

class CollapsibleSchedule extends StatefulWidget {
  final Map<String, dynamic> scheduleJson;
  final void Function(Map<String, dynamic>) onSave;
  const CollapsibleSchedule({
    super.key,
    required this.scheduleJson,
    required this.onSave,
  });

  @override
  State<CollapsibleSchedule> createState() => _CollapsibleScheduleState();
}

class _CollapsibleScheduleState extends State<CollapsibleSchedule> {
  bool _expanded = false;

  @override
  void didUpdateWidget(covariant CollapsibleSchedule oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Si el scheduleJson cambió desde el padre (ej. al guardar),
    // forzamos la reconstrucción para que _summary lea los nuevos datos.
    if (widget.scheduleJson != oldWidget.scheduleJson) {
      setState(() {});
    }
  }

  String get _summary {
    if (widget.scheduleJson.isEmpty) return 'Sin configurar';
    // `ScheduleEditor` guarda cada día como String con el rango horario
    // ("8:00-18:00") o `null` si está cerrado / sin configurar — NO como
    // un Map `{open: true, ...}`. Antes este getter buscaba la shape
    // antigua y siempre devolvía "Sin configurar" tras guardar.
    // También excluimos los días marcados como 'Cerrado' (otro shape
    // legacy que algunos perfiles antiguos persistían).
    final days = widget.scheduleJson.entries
        .where((e) {
          final v = e.value;
          if (v == null) return false;
          if (v is String) {
            final s = v.trim();
            return s.isNotEmpty && s.toLowerCase() != 'cerrado';
          }
          // Compat con shape legacy `{open: true, ...}`.
          if (v is Map) return v['open'] == true;
          return false;
        })
        .map((e) => e.key)
        .toList();
    if (days.isEmpty) return 'Sin configurar';
    return '${days.length} día${days.length == 1 ? '' : 's'} configurados';
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: c.border),
            ),
            child: Row(
              children: [
                Icon(Icons.schedule, color: AppColors.primary, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Horario de Atención',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: c.textPrimary,
                        ),
                      ),
                      Text(
                        _summary,
                        style: TextStyle(fontSize: 12, color: c.textMuted),
                      ),
                    ],
                  ),
                ),
                Icon(
                  _expanded ? Icons.expand_less : Icons.expand_more,
                  color: c.textMuted,
                ),
              ],
            ),
          ),
        ),
        if (_expanded) ...[
          const SizedBox(height: 8),
          ScheduleEditor(
            initialSchedule: widget.scheduleJson,
            onSave: (s) async {
              widget.onSave(s);
              setState(() => _expanded = false);
            },
          ),
        ],
      ],
    );
  }
}
