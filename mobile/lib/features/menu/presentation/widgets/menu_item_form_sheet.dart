import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../shared/widgets/app_network_image.dart';
import '../../domain/models/menu_item_model.dart';
import '../providers/menu_manager_provider.dart';

/// Formulario (bottom sheet) para crear/editar un plato de la carta.
/// Usa el [MenuManagerProvider] para subir la foto y guardar.
class MenuItemFormSheet extends StatefulWidget {
  const MenuItemFormSheet({super.key, required this.manager, this.existing});

  final MenuManagerProvider manager;
  final MenuItemModel? existing;

  @override
  State<MenuItemFormSheet> createState() => _MenuItemFormSheetState();
}

class _MenuItemFormSheetState extends State<MenuItemFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _desc;
  late final TextEditingController _price;
  late final TextEditingController _offer;

  late String _category;
  late bool _isAvailable;
  late bool _isFeatured;
  String? _photoUrl;
  bool _uploading = false;
  bool _saving = false;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _name = TextEditingController(text: e?.name ?? '');
    _desc = TextEditingController(text: e?.description ?? '');
    _price = TextEditingController(text: e != null ? e.price.toString() : '');
    _offer = TextEditingController(
      text: e?.offerPrice != null ? e!.offerPrice.toString() : '',
    );
    _category = e?.category ?? 'fondo';
    _isAvailable = e?.isAvailable ?? true;
    _isFeatured = e?.isFeatured ?? false;
    _photoUrl = e?.photoUrl;
  }

  @override
  void dispose() {
    _name.dispose();
    _desc.dispose();
    _price.dispose();
    _offer.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1280,
      imageQuality: 80,
    );
    if (file == null) return;
    setState(() => _uploading = true);
    final url = await widget.manager.uploadPhoto(file.path);
    if (!mounted) return;
    setState(() {
      _uploading = false;
      if (url != null) _photoUrl = url;
    });
    if (url == null) {
      _snack('No se pudo subir la imagen');
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final offer = double.tryParse(_offer.text.trim());
    final payload = <String, dynamic>{
      'name': _name.text.trim(),
      'description': _desc.text.trim().isEmpty ? null : _desc.text.trim(),
      'price': double.parse(_price.text.trim()),
      'offerPrice': offer,
      'category': _category,
      'photoUrl': _photoUrl,
      'isAvailable': _isAvailable,
      'isFeatured': _isFeatured,
    };
    final err = await widget.manager.save(
      existing: widget.existing,
      payload: payload,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (err == null) {
      Navigator.of(context).pop();
    } else {
      _snack(err);
    }
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
        decoration: const BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isEdit ? 'Editar plato' : 'Nuevo plato',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 16),
                _photoPicker(),
                const SizedBox(height: 14),
                _field(_name, 'Nombre', required: true),
                const SizedBox(height: 12),
                _field(_desc, 'Descripción', maxLines: 2),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _field(
                        _price,
                        'Precio (S/)',
                        required: true,
                        number: true,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _field(_offer, 'Oferta (opcional)', number: true),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _categoryDropdown(),
                const SizedBox(height: 6),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text(
                    'Disponible',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                    ),
                  ),
                  value: _isAvailable,
                  activeThumbColor: AppColors.available,
                  onChanged: (v) => setState(() => _isAvailable = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text(
                    'Menú del día (destacado)',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                    ),
                  ),
                  subtitle: const Text(
                    'Exclusivo del plan Premium',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11.5,
                    ),
                  ),
                  value: _isFeatured,
                  activeThumbColor: AppColors.amber,
                  onChanged: (v) => setState(() => _isFeatured = v),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.amber,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: _saving
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(_isEdit ? 'Guardar cambios' : 'Crear plato'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _photoPicker() {
    return Center(
      child: GestureDetector(
        onTap: _uploading ? null : _pickPhoto,
        child: Container(
          width: 110,
          height: 110,
          decoration: BoxDecoration(
            color: AppColors.bgInput,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
          ),
          clipBehavior: Clip.antiAlias,
          child: _uploading
              ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
              : _photoUrl != null
              ? AppNetworkImage(url: _photoUrl!, fit: BoxFit.cover)
              : const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.add_a_photo, color: AppColors.textMuted),
                    SizedBox(height: 6),
                    Text(
                      'Foto',
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController c,
    String label, {
    bool required = false,
    bool number = false,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: c,
      maxLines: maxLines,
      keyboardType: number
          ? const TextInputType.numberWithOptions(decimal: true)
          : TextInputType.text,
      inputFormatters: number
          ? [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))]
          : null,
      style: const TextStyle(color: AppColors.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppColors.textMuted),
        filled: true,
        fillColor: AppColors.bgInput,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
      ),
      validator: (v) {
        if (required && (v == null || v.trim().isEmpty)) return 'Requerido';
        if (number && v != null && v.trim().isNotEmpty) {
          if (double.tryParse(v.trim()) == null) return 'Número inválido';
        }
        return null;
      },
    );
  }

  Widget _categoryDropdown() {
    return DropdownButtonFormField<String>(
      initialValue: _category,
      dropdownColor: AppColors.bgCard,
      style: const TextStyle(color: AppColors.textPrimary),
      decoration: InputDecoration(
        labelText: 'Sección',
        labelStyle: const TextStyle(color: AppColors.textMuted),
        filled: true,
        fillColor: AppColors.bgInput,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
      ),
      items: kMenuSections
          .map(
            (s) => DropdownMenuItem(value: s, child: Text(menuSectionLabel(s))),
          )
          .toList(),
      onChanged: (v) => setState(() => _category = v ?? 'fondo'),
    );
  }
}
