import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../../core/theme/app_theme_colors.dart';

// ───────────────────────────────────────────────────────────────
// Datos oficiales de soporte de Ofiapp.
// ⚠️ CONFIRMA estos valores con el equipo antes de publicar:
//   • _kSupportWhatsApp: número real de WhatsApp soporte (solo dígitos,
//     con código país, ej. 51987654321). Vacío = oculta el botón.
//   • _kInstagram / _kFacebook: handle/usuario real si difiere de la marca.
// ───────────────────────────────────────────────────────────────
const String _kSupportWhatsApp = ''; // p.ej. '51987654321' — vacío oculta chip
const String _kSupportEmail = 'soporteofiapp@gmail.com';
const String _kTiktokHandle = 'ofiapp.pe';
const String _kInstagramHandle = 'ofiapp.pe';
const String _kFacebookHandle = 'ofiapp.pe';

/// Sección "Contáctanos" al final del perfil del cliente (FASE 2 · #5).
///
/// Canales oficiales con iconos SVG de `assets/icons/` en sus colores de
/// marca. Cada fila abre el enlace correspondiente vía url_launcher. El chip
/// de WhatsApp solo aparece si [_kSupportWhatsApp] tiene número (evita abrir
/// un wa.me hacia un número inexistente).
class ContactUsSection extends StatelessWidget {
  const ContactUsSection({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    final channels = <_Channel>[
      if (_kSupportWhatsApp.trim().isNotEmpty)
        _Channel(
          svg: 'assets/icons/whatsapp.svg',
          color: const Color(0xFF25D366),
          label: 'WhatsApp soporte',
          url: 'https://wa.me/$_kSupportWhatsApp',
        ),
      _Channel(
        svg: 'assets/icons/gmail.svg',
        color: const Color(0xFFEA4335),
        label: _kSupportEmail,
        url: 'mailto:$_kSupportEmail',
      ),
      _Channel(
        svg: 'assets/icons/tiktok.svg',
        color: const Color(0xFF000000),
        label: 'TikTok @$_kTiktokHandle',
        url: 'https://www.tiktok.com/@$_kTiktokHandle',
      ),
      _Channel(
        svg: 'assets/icons/instagram.svg',
        color: const Color(0xFFE4405F),
        label: 'Instagram @$_kInstagramHandle',
        url: 'https://instagram.com/$_kInstagramHandle',
      ),
      _Channel(
        svg: 'assets/icons/facebook.svg',
        color: const Color(0xFF1877F2),
        label: 'Facebook',
        url: 'https://facebook.com/$_kFacebookHandle',
      ),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.support_agent_rounded,
                  color: Color(0xFFFFB347),
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  'Contáctanos',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '¿Dudas o problemas? Escríbenos por cualquiera de estos canales.',
              style: TextStyle(color: c.textMuted, fontSize: 12, height: 1.4),
            ),
            const SizedBox(height: 12),
            ...channels.map((ch) => _ChannelRow(channel: ch)),
          ],
        ),
      ),
    );
  }
}

class _Channel {
  final String svg;
  final Color color;
  final String label;
  final String url;
  const _Channel({
    required this.svg,
    required this.color,
    required this.label,
    required this.url,
  });
}

class _ChannelRow extends StatelessWidget {
  final _Channel channel;
  const _ChannelRow({required this.channel});

  Future<void> _launch(BuildContext context) async {
    try {
      final ok = await launchUrl(
        Uri.parse(channel.url),
        mode: LaunchMode.externalApplication,
      );
      if (!ok && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo abrir el enlace')),
        );
      }
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo abrir el enlace')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return InkWell(
      onTap: () => _launch(context),
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: channel.color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
                border: Border.all(color: channel.color.withValues(alpha: 0.4)),
              ),
              child: Center(
                child: SvgPicture.asset(channel.svg, width: 18, height: 18),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                channel.label,
                style: TextStyle(color: c.textSecondary, fontSize: 13.5),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Icon(Icons.open_in_new_rounded, color: c.textMuted, size: 16),
          ],
        ),
      ),
    );
  }
}
