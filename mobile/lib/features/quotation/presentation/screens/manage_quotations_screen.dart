import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/app_network_image.dart';
import '../../data/quotation_repository.dart';
import '../../domain/models/quotation_model.dart';
import '../widgets/quotation_status_chip.dart';

/// Gestión de cotizaciones del proveedor: lista de solicitudes recibidas con
/// responder (texto + precio estimado) / rechazar.
class ManageQuotationsScreen extends StatefulWidget {
  const ManageQuotationsScreen({super.key});

  @override
  State<ManageQuotationsScreen> createState() => _ManageQuotationsScreenState();
}

class _ManageQuotationsScreenState extends State<ManageQuotationsScreen> {
  final _repo = QuotationRepository();
  late Future<ApiResult<List<Quotation>>> _future;

  @override
  void initState() {
    super.initState();
    _future = _repo.getForProvider();
  }

  void _reload() => setState(() => _future = _repo.getForProvider());

  Future<void> _reject(Quotation q) async {
    final res = await _repo.reject(q.id);
    if (!mounted) return;
    res.when(
      success: (_) => _reload(),
      failure: (e) => ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message))),
    );
  }

  Future<void> _respond(Quotation q) async {
    final c = context.colors;
    final responseCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    String? errorText;
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: c.bgCard,
          title: Text(
            'Responder cotización',
            style: TextStyle(color: c.textPrimary),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: responseCtrl,
                maxLength: 1000,
                minLines: 2,
                maxLines: 4,
                style: TextStyle(color: c.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Tu respuesta / presupuesto',
                  hintStyle: TextStyle(color: c.textMuted),
                  errorText: errorText,
                ),
              ),
              TextField(
                controller: priceCtrl,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                ],
                style: TextStyle(color: c.textPrimary),
                decoration: InputDecoration(
                  labelText: 'Precio estimado S/ (opcional)',
                  labelStyle: TextStyle(color: c.textMuted),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () {
                if (responseCtrl.text.trim().length < 2) {
                  setDialogState(
                    () =>
                        errorText = 'Escribe una respuesta (mín. 2 caracteres)',
                  );
                  return;
                }
                Navigator.pop(context, true);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.amber,
                foregroundColor: AppColors.onSolid(AppColors.amber),
              ),
              child: const Text('Enviar'),
            ),
          ],
        ),
      ),
    );
    if (ok != true) return;
    final res = await _repo.respond(
      q.id,
      response: responseCtrl.text,
      estimatedPrice: double.tryParse(priceCtrl.text.trim()),
    );
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
      appBar: AppBar(
        title: const Text('Cotizaciones'),
        backgroundColor: c.bgCard,
      ),
      body: FutureBuilder<ApiResult<List<Quotation>>>(
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
                    style: TextStyle(color: c.textSecondary),
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
                  'No tienes solicitudes de cotización.',
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
              itemBuilder: (_, i) => _ProviderQuotCard(
                quote: items[i],
                onRespond: items[i].isPending ? () => _respond(items[i]) : null,
                onReject: items[i].isPending ? () => _reject(items[i]) : null,
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ProviderQuotCard extends StatelessWidget {
  const _ProviderQuotCard({required this.quote, this.onRespond, this.onReject});

  final Quotation quote;
  final VoidCallback? onRespond;
  final VoidCallback? onReject;

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
                  quote.clientName?.isNotEmpty == true
                      ? quote.clientName!
                      : 'Cliente',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
              ),
              QuotationStatusChip(status: quote.status),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            quote.description,
            style: TextStyle(color: c.textSecondary, fontSize: 13),
          ),
          if (quote.photoUrl != null) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: AppNetworkImage(
                url: quote.photoUrl!,
                height: 120,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
          ],
          if (quote.isResponded && quote.response != null) ...[
            const SizedBox(height: 8),
            Text(
              'Respondiste: ${quote.response}'
              '${quote.estimatedPrice != null ? ' · S/ ${quote.estimatedPrice!.toStringAsFixed(2)}' : ''}',
              style: TextStyle(color: c.textMuted, fontSize: 12.5),
            ),
          ],
          if (onRespond != null || onReject != null) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (onReject != null)
                  TextButton(
                    onPressed: onReject,
                    child: const Text(
                      'Rechazar',
                      style: TextStyle(color: AppColors.busy),
                    ),
                  ),
                if (onRespond != null)
                  ElevatedButton(
                    onPressed: onRespond,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.amber,
                      foregroundColor: AppColors.onSolid(AppColors.amber),
                    ),
                    child: const Text('Responder'),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
