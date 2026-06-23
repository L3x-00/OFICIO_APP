import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../data/appointments_repository.dart';
import '../../domain/models/appointment_model.dart';
import '../widgets/provider_appointment_card.dart';
import 'schedule_editor_screen.dart';

/// Gestión de citas del proveedor: tabs Pendientes / Confirmadas / Historial,
/// + acceso al editor de horario.
class ManageAppointmentsScreen extends StatelessWidget {
  const ManageAppointmentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: AppColors.bgDark,
        appBar: AppBar(
          title: const Text('Mi agenda'),
          backgroundColor: AppColors.bgCard,
          actions: [
            IconButton(
              tooltip: 'Configurar horario',
              icon: const Icon(Icons.schedule),
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ScheduleEditorScreen()),
              ),
            ),
          ],
          bottom: const TabBar(
            labelColor: AppColors.amber,
            unselectedLabelColor: AppColors.textMuted,
            indicatorColor: AppColors.amber,
            tabs: [
              Tab(text: 'Pendientes'),
              Tab(text: 'Confirmadas'),
              Tab(text: 'Historial'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _ApptTab(kind: _TabKind.pending),
            _ApptTab(kind: _TabKind.confirmed),
            _ApptTab(kind: _TabKind.history),
          ],
        ),
      ),
    );
  }
}

enum _TabKind { pending, confirmed, history }

class _ApptTab extends StatefulWidget {
  const _ApptTab({required this.kind});
  final _TabKind kind;

  @override
  State<_ApptTab> createState() => _ApptTabState();
}

class _ApptTabState extends State<_ApptTab> with AutomaticKeepAliveClientMixin {
  final _repo = AppointmentsRepository();
  late Future<ApiResult<List<Appointment>>> _future;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _future = _fetch();
  }

  Future<ApiResult<List<Appointment>>> _fetch() {
    switch (widget.kind) {
      case _TabKind.pending:
        return _repo.getForProvider(status: kApptPendiente);
      case _TabKind.confirmed:
        return _repo.getForProvider(status: kApptConfirmada);
      case _TabKind.history:
        return _repo.getProviderHistory();
    }
  }

  void _reload() => setState(() => _future = _fetch());

  Future<void> _run(Future<ApiResult<void>> Function() action) async {
    final res = await action();
    if (!mounted) return;
    res.when(
      success: (_) => _reload(),
      failure: (e) => ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message))),
    );
  }

  Future<void> _reject(Appointment a) async {
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.bgCard,
        title: const Text(
          'Rechazar cita',
          style: TextStyle(color: AppColors.textPrimary),
        ),
        content: TextField(
          controller: ctrl,
          maxLength: 300,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: const InputDecoration(
            hintText: 'Motivo (opcional)',
            hintStyle: TextStyle(color: AppColors.textMuted),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Rechazar',
              style: TextStyle(color: AppColors.busy),
            ),
          ),
        ],
      ),
    );
    if (ok == true) {
      await _run(() => _repo.reject(a.id, reason: ctrl.text));
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return FutureBuilder<ApiResult<List<Appointment>>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final result = snap.data;
        if (result == null || result.isFailure) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  result?.errorMessage ?? 'Error',
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: _reload,
                  child: const Text('Reintentar'),
                ),
              ],
            ),
          );
        }
        final items = result.data;
        if (items.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                _emptyLabel(),
                style: const TextStyle(color: AppColors.textSecondary),
              ),
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: () async => _reload(),
          child: ListView.builder(
            padding: const EdgeInsets.all(14),
            itemCount: items.length,
            itemBuilder: (_, i) {
              final a = items[i];
              return ProviderAppointmentCard(
                appt: a,
                onConfirm: widget.kind == _TabKind.pending
                    ? () => _run(() => _repo.confirm(a.id))
                    : null,
                onReject: widget.kind == _TabKind.pending
                    ? () => _reject(a)
                    : null,
                onComplete: widget.kind == _TabKind.confirmed
                    ? () => _run(() => _repo.complete(a.id))
                    : null,
              );
            },
          ),
        );
      },
    );
  }

  String _emptyLabel() {
    switch (widget.kind) {
      case _TabKind.pending:
        return 'No tienes citas pendientes.';
      case _TabKind.confirmed:
        return 'No tienes citas confirmadas.';
      case _TabKind.history:
        return 'Sin historial de citas todavía.';
    }
  }
}
