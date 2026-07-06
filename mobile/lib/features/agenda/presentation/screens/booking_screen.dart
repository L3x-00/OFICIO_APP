import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../core/utils/peru_time.dart';
import '../../data/appointments_repository.dart';
import '../../domain/models/appointment_model.dart';
import 'my_appointments_screen.dart';

/// Pantalla de reserva de cita (cliente): elegir día → horario → confirmar.
class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key, required this.providerId, this.businessName});

  final int providerId;
  final String? businessName;

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final _repo = AppointmentsRepository();
  final _descCtrl = TextEditingController();

  static const _weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  late final List<String> _days; // próximos 14 días 'YYYY-MM-DD'
  late String _selectedDate;
  AppointmentSlot? _selectedSlot;
  late Future<ApiResult<List<AppointmentSlot>>> _slotsFuture;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final today = peruToday();
    _days = List.generate(14, (i) => peruDatePlus(today, i));
    _selectedDate = _days.first;
    _slotsFuture = _repo.getSlots(widget.providerId, _selectedDate);
  }

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  void _selectDate(String ymd) {
    setState(() {
      _selectedDate = ymd;
      _selectedSlot = null;
      _slotsFuture = _repo.getSlots(widget.providerId, ymd);
    });
  }

  String _dayLabel(String ymd, int index) {
    if (index == 0) return 'Hoy';
    if (index == 1) return 'Mañana';
    final p = DateTime.utc(
      int.parse(ymd.substring(0, 4)),
      int.parse(ymd.substring(5, 7)),
      int.parse(ymd.substring(8, 10)),
    );
    return _weekdays[p.weekday - 1];
  }

  Future<void> _confirm() async {
    final slot = _selectedSlot;
    if (slot == null || _submitting) return;
    setState(() => _submitting = true);
    final res = await _repo.create(
      providerId: widget.providerId,
      isoDate: slot.iso, // del backend, con offset Perú → sin tocar
      description: _descCtrl.text,
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    res.when(
      success: (_) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Cita solicitada! Queda pendiente de confirmación.'),
          ),
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const MyAppointmentsScreen()),
        );
      },
      failure: (e) => ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message))),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: Text(
          widget.businessName == null
              ? 'Agendar cita'
              : 'Agendar · ${widget.businessName}',
        ),
        backgroundColor: c.bgCard,
      ),
      body: Column(
        children: [
          _dayPicker(),
          Divider(height: 1, color: c.border),
          Expanded(child: _slots()),
          _descriptionField(),
          _confirmBar(),
        ],
      ),
    );
  }

  Widget _dayPicker() {
    final c = context.colors;
    return SizedBox(
      height: 78,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        itemCount: _days.length,
        itemBuilder: (_, i) {
          final ymd = _days[i];
          final selected = ymd == _selectedDate;
          return GestureDetector(
            onTap: () => _selectDate(ymd),
            child: Container(
              width: 58,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                color: selected ? AppColors.amber : c.bgCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selected ? AppColors.amber : c.border,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _dayLabel(ymd, i),
                    style: TextStyle(
                      color: selected
                          ? AppColors.onSolid(AppColors.amber)
                          : c.textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    ymd.substring(8, 10),
                    style: TextStyle(
                      color: selected
                          ? AppColors.onSolid(AppColors.amber)
                          : c.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _slots() {
    return FutureBuilder<ApiResult<List<AppointmentSlot>>>(
      future: _slotsFuture,
      builder: (context, snap) {
        final c = context.colors;
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final result = snap.data;
        if (result == null || result.isFailure) {
          return Center(
            child: Text(
              result?.errorMessage ?? 'Error al cargar horarios',
              style: TextStyle(color: c.textSecondary),
            ),
          );
        }
        final slots = result.data;
        if (slots.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'No hay horarios disponibles este día.',
                textAlign: TextAlign.center,
                style: TextStyle(color: c.textSecondary),
              ),
            ),
          );
        }
        return SingleChildScrollView(
          padding: const EdgeInsets.all(14),
          child: Wrap(
            spacing: 10,
            runSpacing: 10,
            children: slots.map((s) {
              final selected = _selectedSlot?.iso == s.iso;
              return GestureDetector(
                onTap: () => setState(() => _selectedSlot = s),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: selected
                        ? AppColors.amber.withValues(alpha: 0.2)
                        : c.bgCard,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: selected ? AppColors.amber : c.border,
                    ),
                  ),
                  child: Text(
                    s.time,
                    style: TextStyle(
                      color: selected
                          ? AppColors.tintOn(AppColors.amber, c.isDark)
                          : c.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        );
      },
    );
  }

  Widget _descriptionField() {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
      child: TextField(
        controller: _descCtrl,
        maxLength: 300,
        minLines: 1,
        maxLines: 2,
        style: TextStyle(color: c.textPrimary),
        decoration: InputDecoration(
          hintText: 'Motivo (opcional)',
          hintStyle: TextStyle(color: c.textMuted),
          filled: true,
          fillColor: c.bgCard,
          counterText: '',
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }

  Widget _confirmBar() {
    final enabled = _selectedSlot != null && !_submitting;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: enabled ? _confirm : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.amber,
              foregroundColor: AppColors.onSolid(AppColors.amber),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: _submitting
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(
                    _selectedSlot == null
                        ? 'Elige un horario'
                        : 'Confirmar ${_selectedSlot!.time}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
          ),
        ),
      ),
    );
  }
}
