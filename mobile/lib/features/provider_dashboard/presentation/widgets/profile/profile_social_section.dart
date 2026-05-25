import 'package:flutter/material.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import 'package:provider/provider.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../domain/models/dashboard_profile_model.dart';
import '../../providers/dashboard_provider.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Sección desglosable "Redes sociales" del panel del proveedor.
///
/// Diseño:
///   - Toggle (header) abre/cierra todo el contenido.
///   - Adentro solo se listan las redes que YA tienen valor — cada
///     una es editable con tap (diálogo con guardar / eliminar /
///     cancelar).
///   - Si quedan redes permitidas vacías, aparece un CTA
///     "+ Añadir red" que abre un bottom sheet con la lista de
///     redes disponibles aún sin valor.
///
/// Filtro por tipo:
///   - OFICIO  → todas (8 redes).
///   - NEGOCIO → solo whatsappBiz, website, instagram, tiktok,
///     facebook (5).
///
/// El filtrado vive solo en UI para no perder data en migraciones —
/// el backend acepta todos los campos.
class ProfileSocialSection extends StatefulWidget {
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
  State<ProfileSocialSection> createState() => _ProfileSocialSectionState();
}

class _ProfileSocialSectionState extends State<ProfileSocialSection> {
  bool _expanded = true;

  /// Catálogo completo de redes que la app soporta. Orden: las cinco que
  /// negocio puede usar arriba — así se mantiene estable al alternar el
  /// tipo de perfil.
  List<_SocialSpec> get _allSpecs => const [
    _SocialSpec(
      key: 'whatsappBiz',
      label: 'WhatsApp Business',
      svgAsset: 'assets/icons/whatsapp.svg',
      color: Color(0xFF25D366),
      hint: '+51 999 999 999',
    ),
    _SocialSpec(
      key: 'website',
      label: 'Sitio web',
      svgAsset: 'assets/icons/website.svg',
      color: Color(0xFF60A5FA),
      hint: 'https://...',
    ),
    _SocialSpec(
      key: 'instagram',
      label: 'Instagram',
      svgAsset: 'assets/icons/instagram.svg',
      color: Color(0xFFE1306C),
      hint: '@usuario',
    ),
    _SocialSpec(
      key: 'tiktok',
      label: 'TikTok',
      svgAsset: 'assets/icons/tiktok.svg',
      color: Color(0xFFEC4899),
      hint: '@usuario',
    ),
    _SocialSpec(
      key: 'facebook',
      label: 'Facebook',
      svgAsset: 'assets/icons/facebook.svg',
      color: Color(0xFF1877F2),
      hint: 'usuario o URL',
    ),
    _SocialSpec(
      key: 'linkedin',
      label: 'LinkedIn',
      svgAsset: 'assets/icons/linkedin.svg',
      color: Color(0xFF0A66C2),
      hint: 'usuario o URL',
    ),
    _SocialSpec(
      key: 'twitterX',
      label: 'X (Twitter)',
      svgAsset: 'assets/icons/twitterx.svg',
      color: Color(0xFFE5E7EB),
      hint: '@usuario',
    ),
    _SocialSpec(
      key: 'telegram',
      label: 'Telegram',
      svgAsset: 'assets/icons/telegram.svg',
      color: Color(0xFF229ED9),
      hint: '@usuario',
    ),
  ];

  List<_SocialSpec> _allowedSpecs() {
    if (!widget.isNegocio) return _allSpecs;
    const allowed = {
      'whatsappBiz',
      'website',
      'instagram',
      'tiktok',
      'facebook',
    };
    return _allSpecs.where((s) => allowed.contains(s.key)).toList();
  }

  String? _valueFor(String key) {
    final p = widget.profile;
    if (p == null) return null;
    return switch (key) {
      'whatsappBiz' => p.whatsappBiz,
      'website' => p.website,
      'instagram' => p.instagram,
      'tiktok' => p.tiktok,
      'facebook' => p.facebook,
      'linkedin' => p.linkedin,
      'twitterX' => p.twitterX,
      'telegram' => p.telegram,
      _ => null,
    };
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final allowed = _allowedSpecs();
    final filled = allowed
        .where((s) => (_valueFor(s.key) ?? '').isNotEmpty)
        .toList();
    final empty = allowed
        .where((s) => (_valueFor(s.key) ?? '').isEmpty)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header desglosable — replica el patrón de OnboardingSocialSection.
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            ),
            child: Row(
              children: [
                Icon(Icons.share_rounded, size: 18, color: AppColors.amber),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Redes sociales${filled.isEmpty ? '' : ' (${filled.length})'}',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Icon(
                  _expanded
                      ? Icons.expand_less_rounded
                      : Icons.expand_more_rounded,
                  color: c.textMuted,
                ),
              ],
            ),
          ),
        ),

        if (_expanded) ...[
          const SizedBox(height: 10),
          // Solo se renderizan las redes con valor — el catálogo completo
          // se expone por el CTA "+ Añadir red" para no inundar de
          // placeholders vacíos.
          if (filled.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
              child: Text(
                'Aún no agregaste ninguna red social.',
                style: TextStyle(color: c.textMuted, fontSize: 12.5),
              ),
            )
          else
            ...filled.map(
              (s) => _SocialRow(
                spec: s,
                value: _valueFor(s.key)!,
                onEdit: (newValue) => _save(context, s.key, newValue),
              ),
            ),

          if (empty.isNotEmpty) ...[
            const SizedBox(height: 6),
            OutlinedButton.icon(
              onPressed: () => _showAddSheet(context, empty),
              icon: const Icon(
                Icons.add_rounded,
                size: 18,
                color: AppColors.amber,
              ),
              label: Text(
                'Añadir red',
                style: TextStyle(
                  color: AppColors.amber,
                  fontWeight: FontWeight.w600,
                ),
              ),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppColors.amber.withValues(alpha: 0.4)),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ],
      ],
    );
  }

  Future<void> _showAddSheet(
    BuildContext context,
    List<_SocialSpec> empty,
  ) async {
    final c = context.colors;
    final picked = await showModalBottomSheet<_SocialSpec>(
      context: context,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Row(
                children: [
                  Text(
                    'Añadir red social',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: c.textMuted),
                    onPressed: () => Navigator.of(sheetCtx).pop(),
                  ),
                ],
              ),
            ),
            ...empty.map(
              (s) => ListTile(
                leading: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: s.color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: SvgPicture.asset(s.svgAsset, width: 18, height: 18),
                  ),
                ),
                title: Text(
                  s.label,
                  style: TextStyle(color: c.textPrimary, fontSize: 14),
                ),
                onTap: () => Navigator.of(sheetCtx).pop(s),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
    if (picked == null || !mounted) return;
    await _openEditor(context, picked, initial: '');
  }

  Future<void> _openEditor(
    BuildContext context,
    _SocialSpec spec, {
    required String initial,
  }) async {
    final c = context.colors;
    final ctrl = TextEditingController(text: initial);
    final result = await showDialog<String?>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Editar ${spec.label}',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
        ),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          style: TextStyle(color: c.textPrimary),
          decoration: InputDecoration(
            hintText: spec.hint,
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
            // Sentinel "__cancel__" distingue cancelar de eliminar
            // (pop null vacío significaría borrar, lo cual confunde
            // al usuario que solo quería cerrar el diálogo).
            onPressed: () => Navigator.of(dialogCtx).pop('__cancel__'),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          if (initial.isNotEmpty)
            TextButton(
              onPressed: () => Navigator.of(dialogCtx).pop(''),
              child: Text('Eliminar', style: TextStyle(color: AppColors.busy)),
            ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogCtx).pop(ctrl.text.trim()),
            style: ElevatedButton.styleFrom(
              backgroundColor: spec.color,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text(
              'Guardar',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
    if (result == '__cancel__' || result == null) return;
    if (!context.mounted) return;
    await _save(context, spec.key, result);
  }

  Future<bool> _save(BuildContext context, String key, String? newValue) async {
    final dash = context.read<DashboardProvider>();
    widget.onSavingChanged(true);
    final ok = await dash.updateProfile(
      website: key == 'website' ? newValue : null,
      instagram: key == 'instagram' ? newValue : null,
      tiktok: key == 'tiktok' ? newValue : null,
      facebook: key == 'facebook' ? newValue : null,
      linkedin: key == 'linkedin' ? newValue : null,
      twitterX: key == 'twitterX' ? newValue : null,
      telegram: key == 'telegram' ? newValue : null,
      whatsappBiz: key == 'whatsappBiz' ? newValue : null,
    );
    if (!context.mounted) return ok;
    widget.onSavingChanged(false);
    if (ok) {
      context.showSuccessSnack('Enlace actualizado');
    } else {
      context.showErrorSnack(dash.error ?? 'No se pudo guardar el enlace');
    }
    return ok;
  }
}

class _SocialSpec {
  final String key;
  final String label;
  final String svgAsset; // Ya no es opcional, siempre habrá un SVG
  final Color color;
  final String hint;
  const _SocialSpec({
    required this.key,
    required this.label,
    required this.svgAsset, // Parámetro obligatorio
    required this.color,
    required this.hint,
  });
}

class _SocialRow extends StatelessWidget {
  final _SocialSpec spec;
  final String value;
  final Future<bool> Function(String? newValue) onEdit;
  const _SocialRow({
    required this.spec,
    required this.value,
    required this.onEdit,
  });

  Future<void> _open(BuildContext context) async {
    final c = context.colors;
    final ctrl = TextEditingController(text: value);
    final rootNav = Navigator.of(context, rootNavigator: true);
    final result = await showDialog<String?>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Editar ${spec.label}',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
        ),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          style: TextStyle(color: c.textPrimary),
          decoration: InputDecoration(
            hintText: spec.hint,
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
            onPressed: () => Navigator.of(dialogCtx).pop('__cancel__'),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(''),
            child: Text('Eliminar', style: TextStyle(color: AppColors.busy)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogCtx).pop(ctrl.text.trim()),
            style: ElevatedButton.styleFrom(
              backgroundColor: spec.color,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text(
              'Guardar',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
    // Captura el rootNav (no usado aquí — onEdit usa su propio context)
    // por consistencia con otros callsites por si en el futuro hay que
    // navegar tras editar.
    rootNav.context;
    if (result == '__cancel__' || result == null) return;
    await onEdit(result.isEmpty ? '' : result);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: () => _open(context),
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
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: spec.color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: SvgPicture.asset(spec.svgAsset, width: 18, height: 18),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    spec.label,
                    style: TextStyle(color: c.textMuted, fontSize: 11),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: TextStyle(color: c.textPrimary, fontSize: 13.5),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Icon(Icons.edit_rounded, color: c.textMuted, size: 16),
          ],
        ),
      ),
    );
  }
}
