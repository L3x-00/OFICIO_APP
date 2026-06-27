import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../../core/utils/plan_limits.dart';
import '../../../../auth/presentation/providers/auth_provider.dart';
import '../../../../payments/presentation/screens/plan_selector_sheet.dart';
import '../../../../trust_validation/presentation/screens/trust_validation_form_screen.dart';
import '../../../domain/models/offer_post_model.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/offer_posts_provider.dart';
import 'service_components.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';

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

  /// Si viene, el sheet abre en modo EDICIÓN — pre-llena campos y
  /// muestra un switch para resetear la duración de la oferta.
  final OfferPostModel? existing;

  const OfferFormSheet({
    super.key,
    required this.offersProvider,
    required this.plan,
    required this.isNegocio,
    this.existing,
  });

  static Future<void> show(
    BuildContext context,
    OfferPostsProvider offersProvider,
    String plan,
    bool isNegocio, {
    OfferPostModel? existing,
  }) {
    final c = context.colors;
    final type = isNegocio ? 'NEGOCIO' : 'OFICIO';

    // ── Gate 1: Trust — solo proveedores validados publican ofertas ──
    final trustStatus =
        context.read<AuthProvider>().providerDataFor(type)?['trustStatus']
            as String? ??
        'NONE';
    if (trustStatus != 'APPROVED') {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          backgroundColor: c.bgCard,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Row(
            children: [
              const Icon(Icons.lock_rounded, color: AppColors.amber, size: 20),
              const SizedBox(width: 8),
              Text(
                'Perfil sin validar',
                style: TextStyle(
                  color: c.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
              ),
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
                  MaterialPageRoute(
                    builder: (_) =>
                        TrustValidationFormScreen(providerType: type),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.amber),
              child: const Text(
                'Validar mis datos',
                style: TextStyle(color: Colors.black),
              ),
            ),
          ],
        ),
      );
      return Future.value();
    }

    // ── Gate 2: Plan Limit — máximo de ofertas activas según plan ──
    final activeCount = offersProvider.activeOffers.length;
    final maxOffers = PlanLimits.offers(plan);
    if (!PlanLimits.canPublishOffer(plan, activeCount)) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          backgroundColor: c.bgCard,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            'Límite alcanzado',
            style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
          ),
          content: Text(
            'Tu plan $plan permite $maxOffers oferta(s) activa(s) a la vez.\nSube de plan para publicar más.',
            style: TextStyle(color: c.textSecondary),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cerrar', style: TextStyle(color: c.textMuted)),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                PlanSelectorSheet.show(context);
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.amber),
              child: const Text(
                'Ver planes',
                style: TextStyle(color: Colors.black),
              ),
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
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => OfferFormSheet(
        offersProvider: offersProvider,
        plan: plan,
        isNegocio: isNegocio,
        existing: existing,
      ),
    );
  }

  @override
  State<OfferFormSheet> createState() => _OfferFormSheetState();
}

class _OfferFormSheetState extends State<OfferFormSheet> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  String? _pickedPath;

  /// Switch del modo edición: si está marcado al guardar, backend
  /// resetea expiresAt al tope del plan (no se puede modificar el
  /// tiempo de otra manera).
  bool _resetDuration = false;

  /// Duración (horas) elegida para la oferta en modo CREATE. Arranca en el
  /// tope del plan; el backend la limita a ese tope. `late` para poder leer
  /// `widget.plan` en el inicializador.
  late int _durationHours = PlanLimits.offerDurationHours(widget.plan);

  bool get _isEdit => widget.existing != null;

  /// Opciones de duración ≤ tope del plan, garantizando incluir el tope.
  List<int> get _durationOptions {
    final maxH = PlanLimits.offerDurationHours(widget.plan);
    final opts = const [6, 12, 24, 48, 72].where((h) => h <= maxH).toList();
    if (!opts.contains(maxH)) opts.add(maxH);
    return opts;
  }

  /// Clave del borrador, separada por tipo de perfil para que el borrador de
  /// OFICIO no pise el de NEGOCIO.
  String get _draftKey =>
      'offer_draft_${widget.isNegocio ? 'NEGOCIO' : 'OFICIO'}';

  @override
  void initState() {
    super.initState();
    final ex = widget.existing;
    if (ex != null) {
      _titleCtrl.text = ex.title;
      _descCtrl.text = ex.description;
      _priceCtrl.text = ex.price != null ? ex.price!.toStringAsFixed(0) : '';
    } else {
      // CREATE: restauramos el borrador (si saliste sin publicar) y lo
      // persistimos en cada cambio, así no se pierde lo escrito.
      _restoreDraft();
      _titleCtrl.addListener(_saveDraft);
      _descCtrl.addListener(_saveDraft);
      _priceCtrl.addListener(_saveDraft);
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  // ── Borrador de oferta (solo modo CREATE) ─────────────────────

  Future<void> _restoreDraft() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_draftKey);
    if (raw == null || !mounted) return;
    try {
      final d = jsonDecode(raw) as Map<String, dynamic>;
      _titleCtrl.text = d['title'] as String? ?? '';
      _descCtrl.text = d['description'] as String? ?? '';
      _priceCtrl.text = d['price'] as String? ?? '';
      final path = d['photoPath'] as String?;
      setState(() {
        if (d['durationHours'] is int) {
          _durationHours = d['durationHours'] as int;
        }
        // La foto solo se restaura si el archivo temporal sigue existiendo.
        if (path != null && File(path).existsSync()) _pickedPath = path;
      });
    } catch (_) {
      /* borrador corrupto: lo ignoramos */
    }
  }

  void _saveDraft() {
    if (_isEdit) return;
    final data = jsonEncode({
      'title': _titleCtrl.text,
      'description': _descCtrl.text,
      'price': _priceCtrl.text,
      'durationHours': _durationHours,
      'photoPath': _pickedPath,
    });
    SharedPreferences.getInstance().then((p) => p.setString(_draftKey, data));
  }

  void _clearDraft() {
    SharedPreferences.getInstance().then((p) => p.remove(_draftKey));
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final img = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 75,
    );
    if (img != null) {
      setState(() => _pickedPath = img.path);
      _saveDraft();
    }
  }

  Future<void> _publish() async {
    if (_titleCtrl.text.trim().length < 5) {
      context.showErrorSnack('El título debe tener al menos 5 caracteres.');
      return;
    }
    if (_descCtrl.text.trim().length < 10) {
      context.showErrorSnack(
        'La descripción debe tener al menos 10 caracteres.',
      );
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);

    // ── EDIT MODE ──
    if (_isEdit) {
      final ok = await widget.offersProvider.updateOffer(
        offerId: widget.existing!.id,
        title: _titleCtrl.text.trim(),
        description: _descCtrl.text.trim(),
        price: double.tryParse(_priceCtrl.text.trim()),
        photoPath: _pickedPath,
        resetDuration: _resetDuration,
      );
      if (!mounted) return;
      if (ok) {
        nav.pop();
        messenger.showSnackBar(
          const SnackBar(content: Text('Oferta actualizada')),
        );
      } else {
        messenger.showSnackBar(
          SnackBar(
            content: Text(
              widget.offersProvider.error ?? 'No se pudo actualizar la oferta',
            ),
          ),
        );
      }
      return;
    }

    // ── CREATE MODE ──
    final type = widget.isNegocio ? 'NEGOCIO' : 'OFICIO';
    final ok = await widget.offersProvider.createOffer(
      title: _titleCtrl.text.trim(),
      description: _descCtrl.text.trim(),
      price: double.tryParse(_priceCtrl.text.trim()),
      photoPath: _pickedPath,
      type: type,
      durationHours: _durationHours,
    );
    if (!mounted) return;
    if (ok) {
      _clearDraft(); // publicada → ya no hay borrador que conservar
      nav.pop();
      messenger.showSnackBar(const SnackBar(content: Text('Oferta publicada')));
    } else {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            widget.offersProvider.error ?? 'No se pudo publicar la oferta',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hours = PlanLimits.offerDurationHours(widget.plan);

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Icon(
                    Icons.local_offer_rounded,
                    color: AppColors.amber,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _isEdit ? 'Editar oferta' : 'Publicar Oferta',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.amber.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${_isEdit ? hours : _durationHours}h vigencia',
                      style: const TextStyle(
                        color: AppColors.amber,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                _isEdit
                    ? 'Tu oferta expira: ${widget.existing!.timeLeftLabel}'
                    : 'La oferta expirará automáticamente en $_durationHours horas.',
                style: TextStyle(color: c.textMuted, fontSize: 12),
              ),
              const SizedBox(height: 20),
              ServiceFormField(
                controller: _titleCtrl,
                label: 'Título de la oferta *',
                hint: 'Ej: 20% off en instalaciones eléctricas',
              ),
              const SizedBox(height: 12),
              ServiceFormField(
                controller: _descCtrl,
                label: 'Descripción *',
                hint: 'Detalla qué incluye la oferta',
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              // ── Categorías del perfil (read-only) ─────
              Builder(
                builder: (bCtx) {
                  final cats =
                      bCtx.read<DashboardProvider>().profile?.categories ?? [];
                  if (cats.isEmpty) return const SizedBox.shrink();
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Categorías de la oferta',
                        style: TextStyle(color: c.textSecondary, fontSize: 12),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: cats
                            .map(
                              (cat) => Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.amber.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: AppColors.amber.withValues(
                                      alpha: 0.3,
                                    ),
                                  ),
                                ),
                                child: Text(
                                  cat.name,
                                  style: const TextStyle(
                                    color: AppColors.amber,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                      ),
                      const SizedBox(height: 12),
                    ],
                  );
                },
              ),
              ServiceFormField(
                controller: _priceCtrl,
                label: 'Precio (opcional)',
                hint: 'Ej: 80',
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              // ── Duración de la oferta (solo al crear) ──
              if (!_isEdit) ...[
                Text(
                  'Tiempo de duración de la oferta',
                  style: TextStyle(color: c.textSecondary, fontSize: 12),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _durationOptions.map((h) {
                    final sel = _durationHours == h;
                    return ChoiceChip(
                      label: Text(
                        h % 24 == 0 ? '${h ~/ 24} día(s)' : '${h}h',
                        style: TextStyle(
                          color: sel ? Colors.black : c.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      selected: sel,
                      onSelected: (_) {
                        setState(() => _durationHours = h);
                        _saveDraft();
                      },
                      backgroundColor: c.bgInput,
                      selectedColor: AppColors.amber,
                      showCheckmark: false,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                        side: BorderSide(
                          color: sel ? AppColors.amber : c.border,
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 6),
                Text(
                  'Máximo según tu plan ${widget.plan}: ${PlanLimits.offerDurationHours(widget.plan)}h.',
                  style: TextStyle(color: c.textMuted, fontSize: 11),
                ),
                const SizedBox(height: 12),
              ],
              // Foto opcional
              GestureDetector(
                onTap: _pickPhoto,
                child: Container(
                  height: 80,
                  decoration: BoxDecoration(
                    color: c.bgInput,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _pickedPath != null
                          ? AppColors.amber
                          : Colors.white.withValues(alpha: 0.08),
                    ),
                  ),
                  child: Center(
                    child: _pickedPath != null
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.check_circle_rounded,
                                color: AppColors.amber,
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Foto seleccionada',
                                style: TextStyle(
                                  color: AppColors.amber,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          )
                        : Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.add_photo_alternate_rounded,
                                color: c.textMuted,
                                size: 20,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Añadir foto (opcional)',
                                style: TextStyle(
                                  color: c.textMuted,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
              if (_isEdit) ...[
                const SizedBox(height: 12),
                // Switch para reiniciar la duración: backend cambia
                // expiresAt = now + planHours. Sin esto el "tiempo
                // restante" se mantenía aunque se editaran los datos.
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  title: Text(
                    'Reiniciar tiempo de vigencia',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  subtitle: Text(
                    'Vuelve a contar las $hours horas desde ahora.',
                    style: TextStyle(color: c.textMuted, fontSize: 11.5),
                  ),
                  value: _resetDuration,
                  activeThumbColor: AppColors.amber,
                  onChanged: (v) => setState(() => _resetDuration = v),
                ),
              ],
              const SizedBox(height: 20),
              ListenableBuilder(
                listenable: widget.offersProvider,
                builder: (_, _) {
                  final busy = widget.offersProvider.isSubmitting;
                  return SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: busy ? null : _publish,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.amber,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: busy
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                color: Colors.black,
                                strokeWidth: 2,
                              ),
                            )
                          : Text(
                              _isEdit ? 'Guardar cambios' : 'Publicar oferta',
                              style: const TextStyle(
                                color: Colors.black,
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
