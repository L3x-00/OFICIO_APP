import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/models/yape_payment_model.dart';
import '../providers/payments_provider.dart';

class PaymentHistoryScreen extends StatefulWidget {
  const PaymentHistoryScreen({super.key});

  @override
  State<PaymentHistoryScreen> createState() => _PaymentHistoryScreenState();
}

class _PaymentHistoryScreenState extends State<PaymentHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback(
        (_) => context.read<PaymentsProvider>().loadPayments());
  }

  @override
  Widget build(BuildContext context) {
    final c    = context.colors;
    final prov = context.watch<PaymentsProvider>();

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bgCard,
        title: Text('Historial de Pagos',
            style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold)),
        iconTheme: IconThemeData(color: c.textPrimary),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh_rounded, color: c.textMuted),
            onPressed: () => prov.loadPayments(),
          ),
        ],
      ),
      body: prov.state == PaymentsState.loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.amber))
          : prov.payments.isEmpty
              ? _EmptyPayments(c: c)
              : RefreshIndicator(
                  color: AppColors.amber,
                  backgroundColor: c.bgCard,
                  onRefresh: () => prov.loadPayments(),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: prov.payments.length,
                    separatorBuilder: (_, i2) => const SizedBox(height: 10),
                    itemBuilder: (_, i) =>
                        _PaymentCard(payment: prov.payments[i]),
                  ),
                ),
    );
  }
}

class _PaymentCard extends StatelessWidget {
  final YapePaymentModel payment;
  const _PaymentCard({required this.payment});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    final statusColor = payment.isApproved
        ? const Color(0xFF10B981)
        : payment.isRejected
            ? AppColors.busy
            : AppColors.amber;

    final statusLabel = payment.isApproved
        ? 'Aprobado'
        : payment.isRejected
            ? 'Rechazado'
            : 'Validando...';

    final statusIcon = payment.isApproved
        ? Icons.check_circle_rounded
        : payment.isRejected
            ? Icons.cancel_rounded
            : Icons.access_time_rounded;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: statusColor.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF6D1B7B).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: const Color(0xFF6D1B7B).withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.payment_rounded,
                        size: 12, color: Color(0xFFCE93D8)),
                    const SizedBox(width: 4),
                    Text('Yape · Plan ${payment.planLabel}',
                        style: const TextStyle(
                            color: Color(0xFFCE93D8),
                            fontSize: 11,
                            fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
              const Spacer(),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(statusIcon, size: 14, color: statusColor),
                  const SizedBox(width: 4),
                  Text(statusLabel,
                      style: TextStyle(
                          color: statusColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w600)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('S/ ${payment.amount.toStringAsFixed(2)}',
                  style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 26,
                      fontWeight: FontWeight.w900)),
              const SizedBox(width: 6),
              Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Text('/mes',
                    style: TextStyle(color: c.textMuted, fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            _formatDate(payment.createdAt),
            style: TextStyle(color: c.textMuted, fontSize: 12),
          ),
          if (payment.isRejected && payment.rejectionReason != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.busy.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.busy.withValues(alpha: 0.25)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded,
                      size: 14, color: AppColors.busy),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(payment.rejectionReason!,
                        style: const TextStyle(
                            color: AppColors.busy, fontSize: 12)),
                  ),
                ],
              ),
            ),
          ],
          if (payment.isPending) ...[
            const SizedBox(height: 8),
            Text('Código verificación: ${payment.verificationCode}',
                style: TextStyle(color: c.textMuted, fontSize: 11)),
          ],
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final months = [
      '', 'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
    ];
    return '${dt.day} ${months[dt.month]} ${dt.year}';
  }
}

class _EmptyPayments extends StatelessWidget {
  final dynamic c;
  const _EmptyPayments({required this.c});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF6D1B7B).withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.receipt_long_rounded,
                color: Color(0xFF6D1B7B), size: 44),
          ),
          const SizedBox(height: 20),
          Text('Sin pagos aún',
              style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text('Aquí aparecerán todos tus\ncomprobantes de pago enviados.',
              style: TextStyle(color: c.textMuted, fontSize: 13),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
