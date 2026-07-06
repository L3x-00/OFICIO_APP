import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../core/utils/peru_time.dart';
import '../../data/appointments_repository.dart';
import '../../domain/models/appointment_model.dart';
import '../widgets/appointment_status_chip.dart';

/// "Mis citas" del cliente: lista de citas agendadas + cancelar.
class MyAppointmentsScreen extends StatefulWidget {
  const MyAppointmentsScreen({super.key});

  @override
  State<MyAppointmentsScreen> createState() => _MyAppointmentsScreenState();
}

class _MyAppointmentsScreenState extends State<MyAppointmentsScreen> {
  final _repo = AppointmentsRepository();
  late Future<ApiResult<List<Appointment>>> _future;

  @override
  void initState() {
    super.initState();
    _future = _repo.getMine();
  }

  void _reload() => setState(() => _future = _repo.getMine());

  Future<void> _cancel(Appointment a) async {
    final c = context.colors;
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        title: Text('Cancelar cita', style: TextStyle(color: c.textPrimary)),
        content: Text(
          '¿Cancelar tu cita del ${fmtPeruDateTime(a.date)}?',
          style: TextStyle(color: c.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('No'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Sí, cancelar',
              style: TextStyle(color: AppColors.busy),
            ),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final res = await _repo.cancel(a.id);
    if (!mounted) return;
    res.when(
      success: (_) => _reload(),
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
      appBar: AppBar(title: const Text('Mis citas'), backgroundColor: c.bgCard),
      body: FutureBuilder<ApiResult<List<Appointment>>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final result = snap.data;
          if (result == null || result.isFailure) {
            return _Retry(
              message: result?.errorMessage ?? 'Error al cargar tus citas',
              onRetry: _reload,
            );
          }
          final items = result.data;
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Aún no tienes citas agendadas.',
                  style: TextStyle(color: c.textSecondary),
                ),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.builder(
              padding: const EdgeInsets.all(14),
              itemCount: items.length,
              itemBuilder: (_, i) => _ClientApptCard(
                appt: items[i],
                onCancel: items[i].isActive ? () => _cancel(items[i]) : null,
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ClientApptCard extends StatelessWidget {
  const _ClientApptCard({required this.appt, this.onCancel});
  final Appointment appt;
  final VoidCallback? onCancel;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
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
                  appt.providerName ?? 'Proveedor',
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
          if (onCancel != null) ...[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: onCancel,
                icon: const Icon(Icons.close, size: 16, color: AppColors.busy),
                label: const Text(
                  'Cancelar',
                  style: TextStyle(color: AppColors.busy),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Retry extends StatelessWidget {
  const _Retry({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(message, style: TextStyle(color: c.textSecondary)),
          const SizedBox(height: 10),
          OutlinedButton(onPressed: onRetry, child: const Text('Reintentar')),
        ],
      ),
    );
  }
}
