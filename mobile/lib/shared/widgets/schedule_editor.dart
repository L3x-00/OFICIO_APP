import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/theme/app_theme_colors.dart';

class ScheduleEditor extends StatefulWidget {
  final Map<String, dynamic>? initialSchedule;
  final Future<void> Function(Map<String, dynamic>) onSave;
  final String? saveLabel;

  const ScheduleEditor({
    super.key,
    required this.initialSchedule,
    required this.onSave,
    this.saveLabel,
  });

  @override
  State<ScheduleEditor> createState() => _ScheduleEditorState();
}

class _ScheduleEditorState extends State<ScheduleEditor> {
  // Keys SIN tildes — deben coincidir con `ScheduleTable.hasScheduleData`
  // y la tabla pública (`service_schedule_section.dart`). Antes este
  // editor guardaba `mié` y `sáb` con tilde, pero la tabla pública leía
  // `mie`/`sab` → los días con tilde se perdían en el detalle del
  // proveedor y `hasScheduleData` devolvía false aunque hubiera horario.
  static const _days = [
    ('lun', 'Lunes'),
    ('mar', 'Martes'),
    ('mie', 'Miércoles'),
    ('jue', 'Jueves'),
    ('vie', 'Viernes'),
    ('sab', 'Sábado'),
    ('dom', 'Domingo'),
  ];

  /// Acepta tanto la key actual (sin tilde) como la legacy (con tilde)
  /// al hidratar — perfiles guardados antes del fix tienen `mié`/`sáb`.
  static const _legacyKeys = <String, String>{'mie': 'mié', 'sab': 'sáb'};

  late Map<String, bool> _open;
  late Map<String, TextEditingController> _ctrls;
  bool _saving = false;

  String? _readDay(Map<String, dynamic> s, String key) {
    final v = s[key];
    if (v is String) return v;
    final legacy = _legacyKeys[key];
    if (legacy != null) {
      final lv = s[legacy];
      if (lv is String) return lv;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    final s = widget.initialSchedule ?? const <String, dynamic>{};
    _open = {for (final d in _days) d.$1: _readDay(s, d.$1) != null};
    _ctrls = {
      for (final d in _days)
        d.$1: TextEditingController(text: _readDay(s, d.$1) ?? ''),
    };
  }

  @override
  void dispose() {
    for (final c in _ctrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final schedule = <String, dynamic>{};
    for (final d in _days) {
      schedule[d.$1] = _open[d.$1]! ? _ctrls[d.$1]!.text.trim() : null;
    }
    final merged = Map<String, dynamic>.from(widget.initialSchedule ?? {})
      ..addAll(schedule);
    // Limpiamos keys legacy con tilde para que no queden duplicados
    // junto a las nuevas sin tilde — si no, la BD acumula ambos shapes.
    for (final legacy in _legacyKeys.values) {
      merged.remove(legacy);
    }
    await widget.onSave(merged);
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.schedule_rounded, color: AppColors.amber, size: 18),
              const SizedBox(width: 8),
              Text(
                'Horario de atención',
                style: TextStyle(
                  color: c.textPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._days.map(
            (d) => _DayRow(
              label: d.$2,
              isOpen: _open[d.$1]!,
              ctrl: _ctrls[d.$1]!,
              onToggle: (v) => setState(() => _open[d.$1] = v),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.amber,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.black,
                      ),
                    )
                  : Text(
                      widget.saveLabel ?? 'Guardar horario',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DayRow extends StatelessWidget {
  final String label;
  final bool isOpen;
  final TextEditingController ctrl;
  final ValueChanged<bool> onToggle;

  const _DayRow({
    required this.label,
    required this.isOpen,
    required this.ctrl,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(color: c.textPrimary, fontSize: 13),
            ),
          ),
          Switch(
            value: isOpen,
            onChanged: onToggle,
            activeThumbColor: AppColors.amber,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          if (isOpen) ...[
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: ctrl,
                style: TextStyle(color: c.textPrimary, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'ej. 9:00-18:00',
                  hintStyle: TextStyle(color: c.textMuted, fontSize: 12),
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  filled: true,
                  fillColor: c.bg,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                ),
              ),
            ),
          ] else
            Expanded(
              child: Text(
                'Cerrado',
                style: TextStyle(color: c.textMuted, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }
}
