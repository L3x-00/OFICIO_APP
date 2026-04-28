import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../../../shared/widgets/app_snack_bar.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../providers_list/data/providers_repository.dart';
import '../providers/subastas_provider.dart';

class PublishRequestSheet extends StatefulWidget {
  const PublishRequestSheet({super.key});

  static Future<bool?> show(BuildContext context) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ChangeNotifierProvider.value(
        value: context.read<SubastasProvider>(),
        child: const PublishRequestSheet(),
      ),
    );
  }

  @override
  State<PublishRequestSheet> createState() => _PublishRequestSheetState();
}

class _PublishRequestSheetState extends State<PublishRequestSheet> {
  final _formKey = GlobalKey<FormState>();
  final _descCtrl = TextEditingController();
  final _budgetMinCtrl = TextEditingController();
  final _budgetMaxCtrl = TextEditingController();
  final _repo = ProvidersRepository();

  int? _selectedCategoryId;
  File? _photo;
  DateTime? _desiredDate;
  double? _lat, _lng;
  bool _locating = false;

  List<CategoryModel> _categories = [];
  bool _loadingCats = true;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  @override
  void dispose() {
    _descCtrl.dispose();
    _budgetMinCtrl.dispose();
    _budgetMaxCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    final result = await _repo.getCategories();
    if (!mounted) return;
    result.when(
      success: (cats) {
        // Aplanar: padres + hijos directos
        final flat = <CategoryModel>[];
        for (final c in cats) {
          if (c.children.isEmpty) {
            flat.add(c);
          } else {
            flat.addAll(c.children);
          }
        }
        setState(() {
          _categories = flat.take(16).toList();
          _loadingCats = false;
        });
      },
      failure: (_) => setState(() => _loadingCats = false),
    );
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final img = await picker.pickImage(source: ImageSource.camera, imageQuality: 70);
    if (img != null) setState(() => _photo = File(img.path));
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 30)),
    );
    if (picked != null) setState(() => _desiredDate = picked);
  }

  Future<void> _getLocation() async {
    setState(() => _locating = true);
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.whileInUse ||
          perm == LocationPermission.always) {
        final pos = await Geolocator.getCurrentPosition();
        setState(() {
          _lat = pos.latitude;
          _lng = pos.longitude;
        });
      }
    } catch (_) {
      // location optional
    } finally {
      setState(() => _locating = false);
    }
  }

  Future<void> _submit() async {
    if (_selectedCategoryId == null) {
      context.showWarningSnack('Selecciona una categoría');
      return;
    }
    if (!_formKey.currentState!.validate()) {
      context.showWarningSnack('Completa la descripción (mínimo 10 caracteres).');
      return;
    }

    // Leer ubicación del usuario para enriquecer la solicitud
    final authUser = context.read<AuthProvider>().user;

    final prov = context.read<SubastasProvider>();
    final ok = await prov.createRequest(
      categoryId: _selectedCategoryId!,
      description: _descCtrl.text.trim(),
      budgetMin: double.tryParse(_budgetMinCtrl.text),
      budgetMax: double.tryParse(_budgetMaxCtrl.text),
      desiredDate: _desiredDate,
      latitude: _lat,
      longitude: _lng,
      department: authUser?.department,
      province: authUser?.province,
      district: authUser?.district,
    );

    if (!mounted) return;
    if (ok) {
      Navigator.of(context).pop(true);
    } else {
      context.showErrorSnack(prov.error ?? 'No se pudo publicar');
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final submitting = context.watch<SubastasProvider>().submitting;

    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      maxChildSize: 0.97,
      minChildSize: 0.6,
      builder: (_, ctrl) => Container(
        decoration: BoxDecoration(
          color: c.bg,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            // Handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: c.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.campaign_rounded,
                        color: AppColors.primary, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Publicar necesidad',
                            style: TextStyle(
                              color: c.textPrimary,
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                            )),
                        Text('Recibe ofertas de técnicos cercanos',
                            style: TextStyle(color: c.textMuted, fontSize: 12)),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(Icons.close, color: c.textMuted),
                  ),
                ],
              ),
            ),

            const Divider(height: 24),

            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  controller: ctrl,
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
                  children: [
                    // ── Categoría ──────────────────────────────
                    Text('Categoría *',
                        style: TextStyle(
                          color: c.textSecondary,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        )),
                    const SizedBox(height: 10),

                    if (_loadingCats)
                      const SizedBox(
                        height: 82,
                        child: Center(
                          child: CircularProgressIndicator(
                              color: AppColors.primary, strokeWidth: 2),
                        ),
                      )
                    else if (_categories.isEmpty)
                      Container(
                        height: 60,
                        alignment: Alignment.center,
                        child: Text('No se pudieron cargar categorías',
                            style: TextStyle(color: c.textMuted, fontSize: 13)),
                      )
                    else
                      SizedBox(
                        height: 82,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: _categories.length,
                          separatorBuilder: (_, _) => const SizedBox(width: 8),
                          itemBuilder: (_, i) {
                            final cat = _categories[i];
                            final selected = cat.id == _selectedCategoryId;
                            return GestureDetector(
                              onTap: () => setState(() => _selectedCategoryId = cat.id),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                width: 72,
                                decoration: BoxDecoration(
                                  color: selected
                                      ? AppColors.primary.withValues(alpha: 0.18)
                                      : c.bgCard,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: selected
                                        ? AppColors.primary
                                        : c.border,
                                    width: selected ? 1.5 : 1,
                                  ),
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      _catIcon(cat.name),
                                      color: selected
                                          ? AppColors.primary
                                          : c.textMuted,
                                      size: 22,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      cat.name,
                                      style: TextStyle(
                                        color: selected
                                            ? AppColors.primary
                                            : c.textMuted,
                                        fontSize: 9.5,
                                        fontWeight: selected
                                            ? FontWeight.w700
                                            : FontWeight.w400,
                                      ),
                                      textAlign: TextAlign.center,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),

                    const SizedBox(height: 20),

                    // ── Descripción ────────────────────────────
                    Text('¿Qué necesitas? *',
                        style: TextStyle(
                            color: c.textSecondary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _descCtrl,
                      style: TextStyle(color: c.textPrimary),
                      maxLines: 3,
                      maxLength: 500,
                      decoration: _inputDeco(c,
                          'Ej: "Se me fue la luz en el baño, necesito revisar el interruptor"'),
                      validator: (v) => (v == null || v.trim().length < 10)
                          ? 'Mínimo 10 caracteres'
                          : null,
                    ),

                    const SizedBox(height: 16),

                    // ── Foto ───────────────────────────────────
                    Text('Foto del problema (opcional)',
                        style: TextStyle(
                            color: c.textSecondary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: _pickPhoto,
                      child: Container(
                        height: 100,
                        decoration: BoxDecoration(
                          color: c.bgCard,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: _photo != null
                                  ? AppColors.primary
                                  : c.border),
                        ),
                        child: _photo != null
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(11),
                                child: Image.file(_photo!,
                                    fit: BoxFit.cover, width: double.infinity),
                              )
                            : Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.add_a_photo_outlined,
                                      color: c.textMuted, size: 28),
                                  const SizedBox(height: 4),
                                  Text('Tomar foto',
                                      style: TextStyle(
                                          color: c.textMuted, fontSize: 12)),
                                ],
                              ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ── Presupuesto ────────────────────────────
                    Text('Presupuesto estimado S/ (opcional)',
                        style: TextStyle(
                            color: c.textSecondary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _budgetMinCtrl,
                            style: TextStyle(color: c.textPrimary),
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly
                            ],
                            decoration: _inputDeco(c, 'Mínimo'),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Text('—',
                              style: TextStyle(color: c.textMuted)),
                        ),
                        Expanded(
                          child: TextFormField(
                            controller: _budgetMaxCtrl,
                            style: TextStyle(color: c.textPrimary),
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly
                            ],
                            decoration: _inputDeco(c, 'Máximo'),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // ── Fecha deseada ──────────────────────────
                    Text('Fecha deseada (opcional)',
                        style: TextStyle(
                            color: c.textSecondary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: _pickDate,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 14),
                        decoration: BoxDecoration(
                          color: c.bgCard,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: _desiredDate != null
                                  ? AppColors.primary
                                  : c.border),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.calendar_today_outlined,
                                color: _desiredDate != null
                                    ? AppColors.primary
                                    : c.textMuted,
                                size: 18),
                            const SizedBox(width: 10),
                            Text(
                              _desiredDate != null
                                  ? '${_desiredDate!.day}/${_desiredDate!.month}/${_desiredDate!.year}'
                                  : 'Seleccionar fecha',
                              style: TextStyle(
                                color: _desiredDate != null
                                    ? c.textPrimary
                                    : c.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ── Ubicación ──────────────────────────────
                    Text('Ubicación precisa (recomendado)',
                        style: TextStyle(
                            color: c.textSecondary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: _locating ? null : _getLocation,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 14),
                        decoration: BoxDecoration(
                          color: c.bgCard,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: _lat != null
                                  ? AppColors.available
                                  : c.border),
                        ),
                        child: Row(
                          children: [
                            _locating
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: AppColors.primary),
                                  )
                                : Icon(Icons.my_location_rounded,
                                    color: _lat != null
                                        ? AppColors.available
                                        : c.textMuted,
                                    size: 18),
                            const SizedBox(width: 10),
                            Text(
                              _lat != null
                                  ? 'Ubicación GPS obtenida ✓'
                                  : 'Usar mi ubicación actual',
                              style: TextStyle(
                                color: _lat != null
                                    ? AppColors.available
                                    : c.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 28),

                    // ── Info banner ────────────────────────────
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.amber.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: AppColors.amber.withValues(alpha: 0.25)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.info_outline_rounded,
                              color: AppColors.amber, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Tu solicitud recibirá hasta 5 ofertas en 24 h. '
                              'Los técnicos de tu zona serán notificados.',
                              style: TextStyle(
                                  color: AppColors.amber, fontSize: 11.5),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ── Botón publicar ─────────────────────────
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: submitting ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14)),
                        ),
                        child: submitting
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2.5, color: Colors.white),
                              )
                            : const Text('Publicar solicitud',
                                style: TextStyle(
                                    fontWeight: FontWeight.w700, fontSize: 15)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDeco(AppThemeColors c, String hint) => InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
        filled: true,
        fillColor: c.bgCard,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: c.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: c.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
      );

  /// Icono por nombre de categoría (fallback genérico).
  IconData _catIcon(String name) {
    final n = name.toLowerCase();
    if (n.contains('electr'))  return Icons.electrical_services_rounded;
    if (n.contains('gasf') || n.contains('plom')) return Icons.plumbing_rounded;
    if (n.contains('carpin'))  return Icons.carpenter_rounded;
    if (n.contains('pintur'))  return Icons.format_paint_rounded;
    if (n.contains('limpi'))   return Icons.cleaning_services_rounded;
    if (n.contains('cerraj'))  return Icons.lock_outline_rounded;
    if (n.contains('techo') || n.contains('teja')) return Icons.roofing_rounded;
    if (n.contains('jardin'))  return Icons.grass_rounded;
    if (n.contains('comput') || n.contains('tecno')) return Icons.computer_rounded;
    if (n.contains('albaÑil') || n.contains('albanil') || n.contains('constru')) return Icons.construction_rounded;
    if (n.contains('mecani') || n.contains('auto'))  return Icons.car_repair_rounded;
    if (n.contains('mudanz'))  return Icons.local_shipping_rounded;
    return Icons.handyman_rounded;
  }
}
