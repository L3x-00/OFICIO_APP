import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart'; // Asegúrate de tener este paquete
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

class OnboardingSocialSection extends StatefulWidget {
  final TextEditingController websiteCtrl;
  final TextEditingController instagramCtrl;
  final TextEditingController tiktokCtrl;
  final TextEditingController facebookCtrl;
  final TextEditingController linkedinCtrl;
  final TextEditingController twitterCtrl;
  final TextEditingController telegramCtrl;
  final TextEditingController whatsappBizCtrl;
  /// true cuando el form pertenece a un NEGOCIO. Filtra las redes a las
  /// 5 típicas (WhatsApp Biz, web, IG, TikTok, FB). OFICIO ve todas.
  final bool isNegocio;

  const OnboardingSocialSection({
    super.key,
    required this.websiteCtrl,
    required this.instagramCtrl,
    required this.tiktokCtrl,
    required this.facebookCtrl,
    required this.linkedinCtrl,
    required this.twitterCtrl,
    required this.telegramCtrl,
    required this.whatsappBizCtrl,
    this.isNegocio = false,
  });

  @override
  State<OnboardingSocialSection> createState() => _OnboardingSocialSectionState();
}

class _OnboardingSocialSectionState extends State<OnboardingSocialSection> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    // Mapeo: (Key, Label, Ruta del SVG). El orden coloca primero las
    // redes que NEGOCIO también usa para no reordenar visualmente la
    // sección al cambiar de tipo de perfil.
    const networks = [
      ('whatsappBiz', 'WhatsApp (negocio)',   'assets/icons/whatsapp.svg'),
      ('website',     'Página web',          'assets/icons/website.svg'),
      ('instagram',   'Instagram',            'assets/icons/instagram.svg'),
      ('tiktok',      'TikTok',               'assets/icons/tiktok.svg'),
      ('facebook',    'Facebook',             'assets/icons/facebook.svg'),
      ('linkedin',    'LinkedIn',             'assets/icons/linkedin.svg'),
      ('twitterX',    'Twitter / X',          'assets/icons/twitterx.svg'),
      ('telegram',    'Telegram',             'assets/icons/telegram.svg'),
    ];

    // NEGOCIO: limitar a las 5 redes típicas. El backend acepta todos
    // los campos, así que el filtrado vive solo en UI (mismo criterio
    // que la sección editable del panel del proveedor).
    const negocioAllowed = {'whatsappBiz', 'website', 'instagram', 'tiktok', 'facebook'};
    final visible = widget.isNegocio
        ? networks.where((n) => negocioAllowed.contains(n.$1)).toList()
        : networks;

    final controllers = {
      'website':     widget.websiteCtrl,
      'instagram':   widget.instagramCtrl,
      'tiktok':      widget.tiktokCtrl,
      'facebook':    widget.facebookCtrl,
      'linkedin':    widget.linkedinCtrl,
      'twitterX':    widget.twitterCtrl,
      'telegram':    widget.telegramCtrl,
      'whatsappBiz': widget.whatsappBizCtrl,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
                    _expanded ? 'Ocultar redes sociales' : 'Añadir redes sociales (opcional)',
                    style: TextStyle(color: c.textPrimary, fontSize: 14, fontWeight: FontWeight.w500),
                  ),
                ),
                Icon(
                  _expanded ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                  color: c.textMuted,
                ),
              ],
            ),
          ),
        ),
        if (_expanded) ...[
          const SizedBox(height: 12),
          ...visible.map(((String key, String label, String svgPath) entry) {
            final ctrl = controllers[entry.$1]!;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: TextField(
                controller: ctrl,
                style: TextStyle(color: c.textPrimary, fontSize: 14),
                decoration: InputDecoration(
                  // Aquí reemplazamos el Icon() por SvgPicture.asset()
                  prefixIcon: Padding(
                    padding: const EdgeInsetsDirectional.only(start: 12.0, end: 8.0),
                    child: SvgPicture.asset(
                      entry.$3,
                      width: 18,
                      height: 18,
                      // Sin colorFilter para que brillen los colores originales de marca
                    ),
                  ),
                  prefixIconConstraints: const BoxConstraints(minWidth: 36, minHeight: 18),
                  labelText: entry.$2,
                  labelStyle: TextStyle(color: c.textMuted, fontSize: 13),
                  filled: true,
                  fillColor: c.bgInput,
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
                    borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
            );
          }),
        ],
      ],
    );
  }
}