import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../../core/utils/plan_limits.dart';
import '../../../../auth/presentation/providers/auth_provider.dart';
import '../../../../payments/presentation/screens/plan_selector_sheet.dart';
import '../../../../trust_validation/presentation/screens/trust_validation_form_screen.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/offer_posts_provider.dart';
import 'service_components.dart';

/// Bottom sheet para publicar una oferta. El método estático [show]
/// aplica DOS gates antes de abrir el formulario:
///
///   1. Trust Gate — si `trustStatus != 'APPROVED'`, muestra un diálogo
///      bloqueante que enlaza al formulario de validación.
///   2. Plan Limit Gate — si el plan ya alcanzó su máximo de ofertas
///      activas, muestra un diálogo que enlaza al selector de planes.
///
/// Solo si ambos gates pasan se abre el formulario.
class OfferFormSheet extends StatefulWidget {
  final OfferPostsProvider offersProvider;
  final String plan;
  final bool isNegocio;

  const OfferFormSheet({
    super.key,
    required this.offersProvider,
    required this.plan,
    required this.isNegocio,
  });

  static Future<void> show(
    BuildContext context,
    OfferPostsProvider offersProvider,
    String plan,
    bool isNegocio,
  ) {
    final c = context.colors;
    final type = isNegocio ? 'NEGOCIO' : 'OFICIO';

    // ── Gate 1: Trust — solo proveedores validados publican ofertas ──
    final trustStatus = context.read<AuthProvider>().providerDataFor(type)?['trustStatus'] as String? ?? 'NONE';
    if (trustStatus != 'APPROVED') {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          backgroundColor: c.bgCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              const Icon(Icons.lock_rounded, color: AppColors.amber, size: 20),
              const SizedBox(width: 8),
              Text('Perfil sin validar', style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Text(
            'Solo los profesionales con identidad verificada pueden publicar ofertas.\n\nValida tus datos para desbloquear esta función.',
            style: TextStyle(color: c.textSecondary, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Ahora no', style: TextStyle(color: c.textMuted)),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => TrustValidationFormScreen(providerType: type)),
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.amber),
              child: const Text('Validar mis datos', style: TextStyle(color: Colors.black)),
            ),
          ],
        ),
      );
      return Future.value();
    }

    // ── Gate 2: Plan Limit — máximo de ofertas activas según plan ──
    final activeCount = offersProvider.activeOffers.length;
    final maxOffers   = PlanLimits.offers(plan);
    if (!PlanLimits.canPublishOffer(plan, activeCount)) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          backgroundColor: c.bgCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Límite alcanzado', style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold)),
          content: Text(
            'Tu plan $plan permite $maxOffers oferta(s) activa(s) a la vez.\nSube de plan para publicar más.',
            style: TextStyle(color: c.textSecondary),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: Text('Cerrar', style: TextStyle(color: c.textMuted))),
            ElevatedButton(
              onPressed: () { Navigator.pop(context); PlanSelectorSheet.show(context); },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.amber),
              child: const Text('Ver planes', style: TextStyle(color: Colors.black)),
            ),
          ],
        ),
      );
      return Future.value();
    }

    // ── Ambos gates pasados → abrir el formulario ──
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => OfferFormSheet(
        offersProvider: offersProvider,
        plan: plan,
        isNegocio: isNegocio,
      ),
    );
  }

  @override
  State<OfferFormSheet> createState() => _OfferFormSheetState();
}

class _OfferFormSheetState extends State<OfferFormSheet> {
  final _titleCtrl = TextEditingController();
  final _descCtrl  = TextEditingController();
  final _priceCtrl = TextEditingController();
  String? _pickedPath;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final img = await picker.pickImage(source: ImageSource.gallery, imageQuality: 75);
    if (img != null) setState(() => _pickedPath = img.path);
  }

  Future<void> _publish() async {
    if (_titleCtrl.text.trim().length < 5) return;
    if (_descCtrl.text.trim().length < 10) return;
    Navigator.pop(context);
    final type = widget.isNegocio ? 'NEGOCIO' : 'OFICIO';
    await widget.offersProvider.createOffer(
      title: _titleCtrl.text.trim(),
      description: _descCtrl.text.trim(),
      price: double.tryParse(_priceCtrl.text.trim()),
      photoPath: _pickedPath,
      type: type,
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hours = PlanLimits.offerDurationHours(widget.plan);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Icon(Icons.local_offer_rounded, color: AppColors.amber, size: 20),
                  const SizedBox(width: 8),
                  Text('Publicar Oferta', style: TextStyle(color: c.textPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: AppColors.amber.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                    child: Text('${hours}h vigencia', style: const TextStyle(color: AppColors.amber, fontSize: 11, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text('La oferta expirará automáticamente en $hours horas.', style: TextStyle(color: c.textMuted, fontSize: 12)),
              const SizedBox(height: 20),
              ServiceFormField(controller: _titleCtrl, label: 'Título de la oferta *', hint: 'Ej: 20% off en instalaciones eléctricas'),
              const SizedBox(height: 12),
              ServiceFormField(controller: _descCtrl, label: 'Descripción *', hint: 'Detalla qué incluye la oferta', maxLines: 3),
              const SizedBox(height: 12),
              // ── Categorías del perfil (read-only) ─────
              Builder(builder: (bCtx) {
                final cats = bCtx.read<DashboardProvider>().profile?.categories ?? [];
                if (cats.isEmpty) return const SizedBox.shrink();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Categorías de la oferta', style: TextStyle(color: c.textSecondary, fontSize: 12)),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: cats.map((cat) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.amber.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.amber.withValues(alpha: 0.3)),
                        ),
                        child: Text(cat.name, style: const TextStyle(color: AppColors.amber, fontSize: 12, fontWeight: FontWeight.w600)),
                      )).toList(),
                    ),
                    const SizedBox(height: 12),
                  ],
                );
              }),
              ServiceFormField(controller: _priceCtrl, label: 'Precio (opcional)', hint: 'Ej: 80', keyboardType: TextInputType.number),
              const SizedBox(height: 12),
              // Foto opcional
              GestureDetector(
                onTap: _pickPhoto,
                child: Container(
                  height: 80,
                  decoration: BoxDecoration(
                    color: c.bgInput,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _pickedPath != null ? AppColors.amber : Colors.white.withValues(alpha: 0.08)),
                  ),
                  child: Center(
                    child: _pickedPath != null
                        ? Row(mainAxisSize: MainAxisSize.min, children: [
                            const Icon(Icons.check_circle_rounded, color: AppColors.amber, size: 18),
                            const SizedBox(width: 6),
                            Text('Foto seleccionada', style: TextStyle(color: AppColors.amber, fontSize: 13)),
                          ])
                        : Row(mainAxisSize: MainAxisSize.min, children: [
                            Icon(Icons.add_photo_alternate_rounded, color: c.textMuted, size: 20),
                            const SizedBox(width: 6),
                            Text('Añadir foto (opcional)', style: TextStyle(color: c.textMuted, fontSize: 13)),
                          ]),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: widget.offersProvider.isSubmitting ? null : _publish,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.amber,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: widget.offersProvider.isSubmitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                      : const Text('Publicar oferta', style: TextStyle(color: Colors.black, fontSize: 15, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
