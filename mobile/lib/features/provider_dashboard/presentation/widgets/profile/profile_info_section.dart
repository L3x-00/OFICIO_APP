import 'package:flutter/material.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import 'package:provider/provider.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../../shared/widgets/phone_input_section.dart';
import '../../../domain/models/dashboard_profile_model.dart';
import '../../providers/dashboard_provider.dart';
import 'profile_components.dart';

/// Sección de información básica del perfil: nombre, contacto, dirección
/// (oculta tras toggle en OFICIO, siempre visible en NEGOCIO) y descripción.
///
/// [onSavingChanged] notifica al tab cuando se está guardando, para que el
/// indicador del AppBar siga funcionando.
class ProfileInfoSection extends StatefulWidget {
  final DashboardProfileModel? profile;
  final bool isNegocio;
  final ValueSetter<bool> onSavingChanged;

  const ProfileInfoSection({
    super.key,
    required this.profile,
    required this.isNegocio,
    required this.onSavingChanged,
  });

  @override
  State<ProfileInfoSection> createState() => _ProfileInfoSectionState();
}

class _ProfileInfoSectionState extends State<ProfileInfoSection> {
  bool _showAddressCard = false;

  bool _hasAddress(DashboardProfileModel? profile) =>
      profile?.address != null && profile!.address!.isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    final dash = context.read<DashboardProvider>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle(
          icon: Icons.edit_rounded,
          title: 'Información básica',
        ),
        const SizedBox(height: 12),
        EditCard(
          title: widget.isNegocio ? 'Nombre del negocio' : 'Nombre profesional',
          value: profile?.businessName ?? '',
          icon: Icons.storefront_rounded,
          onTap: () => _showEditDialog(
            context: context,
            title: widget.isNegocio ? 'Nombre del negocio' : 'Nombre profesional',
            initialValue: profile?.businessName ?? '',
            onSave: (val) => dash.updateProfile(businessName: val),
          ),
        ),
        ContactCard(
          phone: profile?.phone ?? '',
          whatsapp: profile?.whatsapp,
          onTap: () => _showPhoneDialog(context, profile, dash),
        ),
        // OFICIO: dirección oculta por defecto, toggle para mostrar
        if (!widget.isNegocio) ...[
          GestureDetector(
            onTap: () => setState(() => _showAddressCard = !_showAddressCard),
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 6),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: _showAddressCard
                    ? AppColors.primary.withValues(alpha: 0.08)
                    : context.colors.bgCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _showAddressCard
                      ? AppColors.primary.withValues(alpha: 0.35)
                      : context.colors.border,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    _showAddressCard
                        ? Icons.expand_less_rounded
                        : Icons.add_location_alt_outlined,
                    size: 16,
                    color: _showAddressCard ? AppColors.primary : context.colors.textMuted,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _hasAddress(profile)
                          ? 'Editar dirección'
                          : 'Agregar dirección (opcional)',
                      style: TextStyle(
                        fontSize: 13,
                        color: _showAddressCard ? AppColors.primary : context.colors.textMuted,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  if (_hasAddress(profile))
                    Icon(Icons.check_circle_rounded,
                        size: 14, color: AppColors.available),
                ],
              ),
            ),
          ),
          if (_showAddressCard)
            EditCard(
              title: 'Dirección',
              value: profile?.address ?? 'No configurada',
              icon: Icons.location_on_rounded,
              onTap: () => _showEditDialog(
                context: context,
                title: 'Dirección',
                initialValue: profile?.address ?? '',
                onSave: (val) async {
                  final ok = await dash.updateProfile(address: val);
                  if (ok && context.mounted && val.isNotEmpty) {
                    context.showSuccessSnack('Dirección guardada');
                  }
                  return ok;
                },
              ),
            ),
        ] else
          EditCard(
            title: 'Dirección',
            value: profile?.address ?? 'No configurada',
            icon: Icons.location_on_rounded,
            onTap: () => _showEditDialog(
              context: context,
              title: 'Dirección',
              initialValue: profile?.address ?? '',
              onSave: (val) async {
                final ok = await dash.updateProfile(address: val);
                if (ok && context.mounted && val.isNotEmpty) {
                  context.showSuccessSnack('Dirección guardada');
                }
                return ok;
              },
            ),
          ),
        EditCard(
          title: 'Descripción',
          value: profile?.description ?? 'Sin descripción',
          icon: Icons.description_rounded,
          multiline: true,
          onTap: () => _showEditDialog(
            context: context,
            title: 'Descripción del servicio',
            initialValue: profile?.description ?? '',
            multiline: true,
            onSave: (val) => dash.updateProfile(description: val),
          ),
        ),
      ],
    );
  }

  // ── DIÁLOGOS ──────────────────────────────────────────────

  Future<void> _showPhoneDialog(
    BuildContext context,
    DashboardProfileModel? profile,
    DashboardProvider dash,
  ) async {
    final c = context.colors;
    String phone    = profile?.phone    ?? '';
    String? whatsapp = profile?.whatsapp;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20, right: 20, top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: StatefulBuilder(
            builder: (_, setLocal) => Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.phone_rounded, color: AppColors.amber, size: 18),
                    const SizedBox(width: 8),
                    Text('Números de contacto',
                        style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
                    const Spacer(),
                    IconButton(
                      icon: Icon(Icons.close_rounded, color: c.textMuted),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                PhoneInputSection(
                  initialPhone: profile?.phone,
                  initialWhatsapp: profile?.whatsapp,
                  onChange: (p, w) {
                    phone    = p;
                    whatsapp = w;
                  },
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      Navigator.pop(ctx);
                      widget.onSavingChanged(true);
                      await dash.updateProfile(phone: phone, whatsapp: whatsapp);
                      if (mounted) widget.onSavingChanged(false);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.amber,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Guardar', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _showEditDialog({
    required BuildContext context,
    required String title,
    required String initialValue,
    required Future<bool> Function(String) onSave,
    TextInputType keyboardType = TextInputType.text,
    bool multiline = false,
  }) async {
    final c = context.colors;
    final ctrl = TextEditingController(text: initialValue);
    final ok = await showDialog<bool>(
      context: context,
      // Recibimos el `dialogCtx` y lo usamos para Navigator.pop. Con
      // go_router, hacer pop sobre el context del árbol cierra la pantalla
      // padre y rebota al home; el dialog context apunta solo al overlay
      // del diálogo y se cierra como corresponde.
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(title, style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: ctrl,
          keyboardType: multiline ? TextInputType.multiline : keyboardType,
          maxLines: multiline ? 4 : 1,
          autofocus: true,
          style: TextStyle(color: c.textPrimary),
          decoration: InputDecoration(
            filled: true,
            fillColor: c.bgInput,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.amber),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.amber,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Text('Guardar', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (ok == true && mounted) {
      widget.onSavingChanged(true);
      final saved = await onSave(ctrl.text.trim());
      if (mounted) widget.onSavingChanged(false);
      // Feedback al usuario — antes podía guardar pero parecer que no.
      if (mounted) {
        if (saved) {
          context.showSuccessSnack('$title actualizado');
        } else {
          context.showErrorSnack('No se pudo guardar $title');
        }
      }
    }
  }
}

/// Tarjeta de campo editable (nombre, dirección, descripción).
class EditCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final VoidCallback onTap;
  final bool multiline;

  const EditCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.onTap,
    this.multiline = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.amber, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(color: c.textMuted, fontSize: 11)),
                  const SizedBox(height: 2),
                  Text(
                    value.isEmpty ? 'Toca para editar' : value,
                    style: TextStyle(
                      color: value.isEmpty ? c.textMuted : c.textPrimary,
                      fontSize: 14,
                    ),
                    maxLines: multiline ? 2 : 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 18),
          ],
        ),
      ),
    );
  }
}

/// Tarjeta de contacto: teléfono + WhatsApp.
class ContactCard extends StatelessWidget {
  final String  phone;
  final String? whatsapp;
  final VoidCallback onTap;

  const ContactCard({super.key, required this.phone, required this.whatsapp, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Row(
          children: [
            Icon(Icons.phone_rounded, color: AppColors.amber, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Contacto', style: TextStyle(color: c.textMuted, fontSize: 11)),
                  const SizedBox(height: 2),
                  Text(
                    phone.isEmpty ? 'Sin teléfono' : phone,
                    style: TextStyle(color: phone.isEmpty ? c.textMuted : c.textPrimary, fontSize: 14),
                  ),
                  if (whatsapp != null && whatsapp!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Icon(Icons.chat_rounded, size: 12, color: AppColors.whatsapp),
                        const SizedBox(width: 4),
                        Text(whatsapp!, style: TextStyle(color: AppColors.whatsapp, fontSize: 12)),
                      ],
                    ),
                  ] else
                    Text('WhatsApp: mismo número', style: TextStyle(color: c.textMuted, fontSize: 12)),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 18),
          ],
        ),
      ),
    );
  }
}
