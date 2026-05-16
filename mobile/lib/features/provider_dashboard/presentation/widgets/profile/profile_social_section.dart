import 'package:flutter/material.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import 'package:provider/provider.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../domain/models/dashboard_profile_model.dart';
import '../../providers/dashboard_provider.dart';
import 'profile_components.dart';

/// Sección "Redes sociales" del perfil del proveedor. Cada link es
/// editable inline mediante un diálogo.
///
/// Filtro por tipo:
///   - OFICIO: expone TODOS los campos (website, instagram, tiktok,
///     facebook, linkedin, twitterX, telegram, whatsappBiz).
///   - NEGOCIO: solo whatsappBiz, website, tiktok, facebook,
///     instagram — el resto se omite porque no es típico de negocios
///     locales.
///
/// El backend siempre acepta todos los campos; el filtrado vive solo en
/// la UI para no perder data en migraciones (si un perfil cambia de
/// tipo, los enlaces previos quedan guardados en la BD).
class ProfileSocialSection extends StatelessWidget {
  final DashboardProfileModel? profile;
  final bool isNegocio;
  final ValueSetter<bool> onSavingChanged;

  const ProfileSocialSection({
    super.key,
    required this.profile,
    required this.isNegocio,
    required this.onSavingChanged,
  });

  @override
  Widget build(BuildContext context) {
    final fields = _fieldsForType(profile);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle(
          icon: Icons.share_rounded,
          title: 'Redes sociales',
        ),
        const SizedBox(height: 12),
        ...fields.map((f) => _SocialRow(
              field: f,
              onEdit: (newValue) => _save(context, f.key, newValue),
            )),
      ],
    );
  }

  List<_SocialField> _fieldsForType(DashboardProfileModel? p) {
    if (p == null) return const [];
    final all = <_SocialField>[
      _SocialField(key: 'whatsappBiz', label: 'WhatsApp Business', icon: Icons.chat_rounded,        color: const Color(0xFF25D366), hint: '+51 999 999 999', value: p.whatsappBiz),
      _SocialField(key: 'website',     label: 'Sitio web',          icon: Icons.public_rounded,      color: const Color(0xFF60A5FA), hint: 'https://...',       value: p.website),
      _SocialField(key: 'tiktok',      label: 'TikTok',             icon: Icons.music_note_rounded,  color: const Color(0xFFEC4899), hint: '@usuario',          value: p.tiktok),
      _SocialField(key: 'facebook',    label: 'Facebook',           icon: Icons.facebook_rounded,    color: const Color(0xFF1877F2), hint: 'usuario o URL',     value: p.facebook),
      _SocialField(key: 'instagram',   label: 'Instagram',          icon: Icons.camera_alt_rounded,  color: const Color(0xFFE1306C), hint: '@usuario',          value: p.instagram),
      _SocialField(key: 'linkedin',    label: 'LinkedIn',           icon: Icons.work_rounded,        color: const Color(0xFF0A66C2), hint: 'usuario o URL',     value: p.linkedin),
      _SocialField(key: 'twitterX',    label: 'X (Twitter)',        icon: Icons.alternate_email_rounded, color: const Color(0xFFE5E7EB), hint: '@usuario',     value: p.twitterX),
      _SocialField(key: 'telegram',    label: 'Telegram',           icon: Icons.send_rounded,        color: const Color(0xFF229ED9), hint: '@usuario',          value: p.telegram),
    ];

    if (isNegocio) {
      // Filtrado por las cinco redes pedidas para negocios.
      const allowed = {'whatsappBiz', 'website', 'tiktok', 'facebook', 'instagram'};
      return all.where((f) => allowed.contains(f.key)).toList();
    }
    return all;
  }

  Future<bool> _save(BuildContext context, String key, String? newValue) async {
    final dash = context.read<DashboardProvider>();
    onSavingChanged(true);
    final ok = await dash.updateProfile(
      website:     key == 'website'     ? newValue : null,
      instagram:   key == 'instagram'   ? newValue : null,
      tiktok:      key == 'tiktok'      ? newValue : null,
      facebook:    key == 'facebook'    ? newValue : null,
      linkedin:    key == 'linkedin'    ? newValue : null,
      twitterX:    key == 'twitterX'    ? newValue : null,
      telegram:    key == 'telegram'    ? newValue : null,
      whatsappBiz: key == 'whatsappBiz' ? newValue : null,
    );
    if (context.mounted) onSavingChanged(false);
    if (!context.mounted) return ok;
    if (ok) {
      context.showSuccessSnack('Enlace actualizado');
    } else {
      context.showErrorSnack(dash.error ?? 'No se pudo guardar el enlace');
    }
    return ok;
  }
}

/// Spec de cada fila — config inmutable para el render + valor actual.
class _SocialField {
  final String key;
  final String label;
  final IconData icon;
  final Color color;
  final String hint;
  final String? value;
  const _SocialField({
    required this.key,
    required this.label,
    required this.icon,
    required this.color,
    required this.hint,
    required this.value,
  });
}

class _SocialRow extends StatelessWidget {
  final _SocialField field;
  final Future<bool> Function(String? newValue) onEdit;
  const _SocialRow({required this.field, required this.onEdit});

  Future<void> _openEditor(BuildContext context) async {
    final c       = context.colors;
    final ctrl    = TextEditingController(text: field.value ?? '');
    final rootNav = Navigator.of(context, rootNavigator: true);

    final result = await showDialog<String?>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Editar ${field.label}',
            style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          style: TextStyle(color: c.textPrimary),
          decoration: InputDecoration(
            hintText: field.hint,
            hintStyle: TextStyle(color: c.textMuted),
            filled: true,
            fillColor: c.bgInput,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
        actions: [
          TextButton(
            // Sentinel string "__cancel__" para diferenciar cancelar
            // de "borrar" (pop null limpia el campo, lo que sería
            // confuso si lo lanzara el botón Cancelar).
            onPressed: () => Navigator.of(dialogCtx).pop('__cancel__'),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          if ((field.value ?? '').isNotEmpty)
            TextButton(
              onPressed: () => Navigator.of(dialogCtx).pop(''), // borrar
              child: Text('Eliminar', style: TextStyle(color: AppColors.busy)),
            ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogCtx).pop(ctrl.text.trim()),
            style: ElevatedButton.styleFrom(
              backgroundColor: field.color,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Guardar', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (result == '__cancel__' || result == null) return;
    // Captura el navegador para evitar context inválido tras el await.
    rootNav.context; // no-op: ensure capture lifecycle
    await onEdit(result.isEmpty ? '' : result);
  }

  @override
  Widget build(BuildContext context) {
    final c        = context.colors;
    final hasValue = (field.value ?? '').isNotEmpty;
    return GestureDetector(
      onTap: () => _openEditor(context),
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
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: field.color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(field.icon, color: field.color, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(field.label, style: TextStyle(color: c.textMuted, fontSize: 11)),
                  const SizedBox(height: 2),
                  Text(
                    hasValue ? field.value! : 'Toca para agregar',
                    style: TextStyle(
                      color: hasValue ? c.textPrimary : c.textMuted,
                      fontSize: 13.5,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Icon(
              hasValue ? Icons.edit_rounded : Icons.add_rounded,
              color: c.textMuted, size: 16,
            ),
          ],
        ),
      ),
    );
  }
}
