import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../data/appointments_repository.dart';

/// Editor amigable del horario semanal de la agenda (panel del proveedor).
/// Por cada día se agregan rangos con selectores de hora; al guardar se
/// serializa al formato del backend ("8:00-12:00,14:00-18:00").
class ScheduleEditorScreen extends StatefulWidget {
  const ScheduleEditorScreen({super.key});

  @override
  State<ScheduleEditorScreen> createState() => _ScheduleEditorScreenState();
}

class _TimeRange {
  TimeOfDay start;
  TimeOfDay end;
  _TimeRange(this.start, this.end);
}

const _dayKeys = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
const _dayLabels = {
  'lun': 'Lunes',
  'mar': 'Martes',
  'mie': 'Miércoles',
  'jue': 'Jueves',
  'vie': 'Viernes',
  'sab': 'Sábado',
  'dom': 'Domingo',
};

class _ScheduleEditorScreenState extends State<ScheduleEditorScreen> {
  final _repo = AppointmentsRepository();
  final Map<String, List<_TimeRange>> _ranges = {
    for (final d in _dayKeys) d: [],
  };
  bool _loading = true;
  bool _saving = false;
  String? _error;
  int _maxDays = 7; // tope de días activos por plan (lo fija el backend)

  /// Días con al menos un rango = días "abiertos".
  int get _activeDays => _dayKeys.where((d) => _ranges[d]!.isNotEmpty).length;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final res = await _repo.getSchedule();
    if (!mounted) return;
    res.when(
      success: (config) {
        for (final d in _dayKeys) {
          _ranges[d] = _parseDay(config.schedule[d] ?? '');
        }
        _maxDays = config.maxDays;
        setState(() => _loading = false);
      },
      failure: (e) => setState(() {
        _error = e.message;
        _loading = false;
      }),
    );
  }

  List<_TimeRange> _parseDay(String value) {
    final out = <_TimeRange>[];
    for (final part in value.split(',')) {
      final t = part.trim();
      if (t.isEmpty) continue;
      final se = t.split('-');
      if (se.length != 2) continue;
      final s = _parseTime(se[0]);
      final e = _parseTime(se[1]);
      if (s != null && e != null) out.add(_TimeRange(s, e));
    }
    return out;
  }

  TimeOfDay? _parseTime(String s) {
    final hm = s.trim().split(':');
    if (hm.length != 2) return null;
    final h = int.tryParse(hm[0]);
    final m = int.tryParse(hm[1]);
    if (h == null || m == null) return null;
    return TimeOfDay(hour: h, minute: m);
  }

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  String _serializeDay(List<_TimeRange> ranges) =>
      ranges.map((r) => '${_fmt(r.start)}-${_fmt(r.end)}').join(',');

  Future<void> _save() async {
    setState(() => _saving = true);
    final schedule = <String, String>{};
    for (final d in _dayKeys) {
      schedule[d] = _serializeDay(_ranges[d]!);
    }
    final res = await _repo.setSchedule(schedule);
    if (!mounted) return;
    setState(() => _saving = false);
    res.when(
      success: (_) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Horario guardado')));
        Navigator.of(context).pop();
      },
      failure: (e) => ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message))),
    );
  }

  Future<void> _addRange(String day) async {
    // Abrir un día NUEVO cuando ya se alcanzó el tope del plan queda bloqueado.
    if (_ranges[day]!.isEmpty && _activeDays >= _maxDays) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Tu plan permite abrir la agenda $_maxDays día(s) por semana. '
            'Actualiza para habilitar más días.',
          ),
        ),
      );
      return;
    }
    final start = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 9, minute: 0),
      helpText: 'Hora de inicio',
    );
    if (start == null || !mounted) return;
    final end = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: (start.hour + 1) % 24, minute: start.minute),
      helpText: 'Hora de fin',
    );
    if (end == null || !mounted) return;
    final startMin = start.hour * 60 + start.minute;
    final endMin = end.hour * 60 + end.minute;
    if (endMin <= startMin) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('La hora de fin debe ser posterior a la de inicio'),
        ),
      );
      return;
    }
    setState(() => _ranges[day]!.add(_TimeRange(start, end)));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: const Text('Horario de atención'),
        backgroundColor: c.bgCard,
        actions: [
          if (!_loading)
            TextButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(
                      'Guardar',
                      style: TextStyle(
                        color: AppColors.amber,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Text(_error!, style: TextStyle(color: c.textSecondary)),
            )
          : ListView(
              padding: const EdgeInsets.all(14),
              children: [
                _planBanner(c),
                ..._dayKeys.map((d) => _dayCard(d, c)),
              ],
            ),
    );
  }

  Widget _planBanner(AppThemeColors c) {
    final atCap = _activeDays >= _maxDays;
    final color = atCap ? AppColors.busy : AppColors.amber;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25), width: 0.5),
      ),
      child: Row(
        children: [
          Icon(
            Icons.event_available,
            size: 18,
            color: AppColors.tintOn(color, c.isDark),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Días activos: $_activeDays de $_maxDays que permite tu plan.'
              '${atCap ? ' Actualiza tu plan para abrir más días.' : ''}',
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 12.5,
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _dayCard(String day, AppThemeColors c) {
    final ranges = _ranges[day]!;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                _dayLabels[day]!,
                style: TextStyle(
                  color: c.textPrimary,
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                ),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: () => _addRange(day),
                icon: const Icon(Icons.add, size: 16, color: AppColors.amber),
                label: const Text(
                  'Rango',
                  style: TextStyle(color: AppColors.amber),
                ),
              ),
            ],
          ),
          if (ranges.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Text(
                'Cerrado',
                style: TextStyle(color: c.textMuted, fontSize: 13),
              ),
            )
          else
            ...ranges.asMap().entries.map(
              (e) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  children: [
                    Icon(Icons.schedule, size: 15, color: c.textMuted),
                    const SizedBox(width: 8),
                    Text(
                      '${_fmt(e.value.start)} - ${_fmt(e.value.end)}',
                      style: TextStyle(color: c.textSecondary),
                    ),
                    const Spacer(),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      icon: const Icon(
                        Icons.delete_outline,
                        size: 18,
                        color: AppColors.busy,
                      ),
                      onPressed: () => setState(() => ranges.removeAt(e.key)),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
