import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../auth/presentation/providers/auth_provider.dart';
import '../../../domain/models/service_item_model.dart';
import '../../providers/dashboard_provider.dart';
import 'service_components.dart';

/// Bottom sheet para crear/editar un servicio (OFICIO) o producto (NEGOCIO).
///
/// Uso: `ServiceFormSheet.show(context, dash, existing: item, onSaving: cb)`.
/// El sheet recopila los datos y los retorna como [ServiceItem] vía
/// `Navigator.pop`; el método [show] hace el merge en la lista y llama a
/// `dash.saveServices`, reportando el estado de guardado vía [onSaving] —
/// esto evita usar `setState` sobre un sheet ya cerrado.
class ServiceFormSheet extends StatefulWidget {
  final DashboardProvider dash;
  final ServiceItem? existing;
  final bool isNegocio;

  const ServiceFormSheet({
    super.key,
    required this.dash,
    required this.isNegocio,
    this.existing,
  });

  /// Abre el sheet y, si el usuario guarda, persiste la lista actualizada.
  /// [onSaving] notifica al tab para el indicador de carga del AppBar.
  static Future<void> show(
    BuildContext context,
    DashboardProvider dash, {
    ServiceItem? existing,
    ValueSetter<bool>? onSaving,
  }) async {
    final c = context.colors;
    final isNegocio = dash.profile?.type == 'NEGOCIO';

    final result = await showModalBottomSheet<ServiceItem>(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => ServiceFormSheet(
        dash: dash,
        isNegocio: isNegocio,
        existing: existing,
      ),
    );

    if (result == null) return;

    final updated = List<ServiceItem>.from(dash.services);
    if (existing != null) {
      final idx = updated.indexWhere((s) => s.id == existing.id);
      if (idx >= 0) updated[idx] = result;
    } else {
      updated.add(result);
    }

    onSaving?.call(true);
    await dash.saveServices(updated);
    onSaving?.call(false);
  }

  @override
  State<ServiceFormSheet> createState() => _ServiceFormSheetState();
}

class _ServiceFormSheetState extends State<ServiceFormSheet> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _descCtrl;
  late final TextEditingController _priceCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _unitCtrl;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;

    // Teléfono inicial: si es edición usa el del servicio; si no, el del
    // perfil del proveedor. Prioridad: provider.phone > user.phone > vacío.
    final providerPhone = widget.dash.profile?.phone
        ?? context.read<AuthProvider>().user?.phone
        ?? '';
    final initialPhone = _isEdit ? (existing!.phone ?? providerPhone) : providerPhone;

    _nameCtrl  = TextEditingController(text: existing?.name ?? '');
    _descCtrl  = TextEditingController(text: existing?.description ?? '');
    _priceCtrl = TextEditingController(
      text: existing?.price != null ? existing!.price.toString() : '',
    );
    _phoneCtrl = TextEditingController(text: initialPhone);
    _unitCtrl  = TextEditingController(text: existing?.unit ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    _phoneCtrl.dispose();
    _unitCtrl.dispose();
    super.dispose();
  }

  void _save() {
    if (_nameCtrl.text.trim().isEmpty) return;

    final newItem = ServiceItem(
      id: widget.existing?.id ??
          DateTime.now().millisecondsSinceEpoch.toString(),
      name: _nameCtrl.text.trim(),
      description: _descCtrl.text.trim().isEmpty
          ? null
          : _descCtrl.text.trim(),
      price: double.tryParse(_priceCtrl.text.trim()),
      unit: _unitCtrl.text.trim().isEmpty
          ? null
          : _unitCtrl.text.trim(),
      phone: _phoneCtrl.text.trim().isEmpty
          ? null
          : _phoneCtrl.text.trim(),
    );

    Navigator.pop(context, newItem);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final isNegocio = widget.isNegocio;

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
              Text(
                _isEdit
                    ? (isNegocio ? 'Editar producto' : 'Editar servicio')
                    : (isNegocio ? 'Nuevo producto' : 'Nuevo servicio'),
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),
              ServiceFormField(
                controller: _nameCtrl,
                label: isNegocio ? 'Nombre del producto' : 'Nombre del servicio',
                hint: isNegocio ? 'Ej: Corte de cabello' : 'Ej: Instalación de cañería',
              ),
              const SizedBox(height: 12),
              ServiceFormField(
                controller: _descCtrl,
                label: 'Descripción (opcional)',
                hint: 'Breve descripción de lo que incluye',
                maxLines: 2,
              ),
              const SizedBox(height: 12),
              ServiceFormField(
                controller: _phoneCtrl,
                label: 'Teléfono de Contacto',
                hint: 'Ej: +51 987 654 321',
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: ServiceFormField(
                      controller: _priceCtrl,
                      label: 'Precio (opcional)',
                      hint: 'Ej: 5000',
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 3,
                    child: ServiceFormField(
                      controller: _unitCtrl,
                      label: 'Unidad',
                      hint: 'por hora, por trabajo…',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.amber,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Text(
                    _isEdit ? 'Actualizar' : 'Guardar',
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
