import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/app_network_image.dart';
import '../../data/quotation_repository.dart';
import '../../domain/models/quotation_model.dart';
import '../widgets/quotation_status_chip.dart';

/// "Mis cotizaciones" del cliente: solicitudes enviadas + respuesta recibida
/// (texto + precio estimado) + botón para continuar por WhatsApp.
class MyQuotationsScreen extends StatefulWidget {
  const MyQuotationsScreen({super.key});

  @override
  State<MyQuotationsScreen> createState() => _MyQuotationsScreenState();
}

class _MyQuotationsScreenState extends State<MyQuotationsScreen> {
  final _repo = QuotationRepository();
  late Future<ApiResult<List<Quotation>>> _future;

  @override
  void initState() {
    super.initState();
    _future = _repo.getMine();
  }

  void _reload() => setState(() => _future = _repo.getMine());

  Future<void> _whatsapp(Quotation q) async {
    final digits = (q.providerWhatsapp ?? '').replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return;
    final text = Uri.encodeComponent(
      'Hola ${q.providerName ?? ''}, sobre la cotización que te pedí: ${q.description}',
    );
    final uri = Uri.parse('https://wa.me/$digits?text=$text');
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo abrir WhatsApp')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: const Text('Mis cotizaciones'),
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
            return _Retry(
              message: result?.errorMessage ?? 'Error al cargar',
              onRetry: _reload,
            );
          }
          final items = result.data;
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Aún no has pedido cotizaciones.',
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
              itemBuilder: (_, i) => _ClientQuotCard(
                quote: items[i],
                onWhatsapp: () => _whatsapp(items[i]),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ClientQuotCard extends StatelessWidget {
  const _ClientQuotCard({required this.quote, required this.onWhatsapp});
  final Quotation quote;
  final VoidCallback onWhatsapp;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final canContact =
        quote.isResponded && (quote.providerWhatsapp ?? '').isNotEmpty;
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
                  quote.providerName ?? 'Proveedor',
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
          if (quote.isResponded) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.available.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: AppColors.available.withValues(alpha: 0.2),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Respuesta',
                    style: TextStyle(
                      color: AppColors.tintOn(AppColors.available, c.isDark),
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 4),
                  if (quote.response != null)
                    Text(
                      quote.response!,
                      style: TextStyle(color: c.textPrimary),
                    ),
                  if (quote.estimatedPrice != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Estimado: S/ ${quote.estimatedPrice!.toStringAsFixed(2)}',
                      style: TextStyle(
                        color: AppColors.tintOn(AppColors.amber, c.isDark),
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (canContact) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onWhatsapp,
                  icon: const Icon(
                    Icons.chat,
                    size: 18,
                    color: AppColors.whatsapp,
                  ),
                  label: const Text(
                    'Continuar por WhatsApp',
                    style: TextStyle(color: AppColors.whatsapp),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                      color: AppColors.whatsapp.withValues(alpha: 0.4),
                    ),
                  ),
                ),
              ),
            ],
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
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(message, style: TextStyle(color: context.colors.textSecondary)),
          const SizedBox(height: 10),
          OutlinedButton(onPressed: onRetry, child: const Text('Reintentar')),
        ],
      ),
    );
  }
}
