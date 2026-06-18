import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../../core/theme/app_theme_colors.dart';

// ───────────────────────────────────────────────────────────────
// Datos oficiales de soporte de Ofiapp.
// ⚠️ CONFIRMA estos valores con el equipo antes de publicar:
//   • _kSupportWhatsApp: número real de WhatsApp soporte (solo dígitos,
//     con código país, ej. 51987654321). Vacío = oculta el botón.
//   • _kWebUrl: URL real de tu página web.
// ───────────────────────────────────────────────────────────────
const String _kSupportWhatsApp =
    '51930759515'; // 👈 CAMBIA ESTO por tu número real
const String _kSupportEmail = 'soporteofiapp@gmail.com';
const String _kWebUrl =
    'https://www.oficioapp.org.pe'; // 👈 CAMBIA ESTO por tu web real
const String _kTiktokHandle = 'ofiapp.pe';
const String _kInstagramHandle = 'ofiapp.pe';
const String _kFacebookHandle = 'ofiapp.pe';

/// Sección "Contáctanos" al final del perfil del cliente.
///
/// Muestra los canales oficiales con sus iconos SVG propios, sin contenedores
/// ni fondos que alteren el diseño original de los iconos.
class ContactUsSection extends StatelessWidget {
  const ContactUsSection({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    final channels = <_Channel>[
      if (_kSupportWhatsApp.trim().isNotEmpty)
        _Channel(
          svg: 'assets/icons/whatsapp.svg',
          label: 'WhatsApp',
          url: 'https://wa.me/$_kSupportWhatsApp',
        ),
      _Channel(
        svg: 'assets/icons/gmail.svg',
        label: 'Correo',
        url: 'mailto:$_kSupportEmail',
      ),
      _Channel(
        svg: 'assets/icons/website.svg',
        label: 'Página Web',
        url: _kWebUrl,
      ),
      _Channel(
        svg: 'assets/icons/tiktok.svg',
        label: 'TikTok',
        url: 'https://www.tiktok.com/@$_kTiktokHandle',
      ),
      _Channel(
        svg: 'assets/icons/instagram.svg',
        label: 'Instagram',
        url: 'https://instagram.com/$_kInstagramHandle',
      ),
      _Channel(
        svg: 'assets/icons/facebook.svg',
        label: 'Facebook',
        url: 'https://facebook.com/$_kFacebookHandle',
      ),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
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
          const SizedBox(height: 16),

          // ── Cuadrícula compacta (3 columnas) ───────────────────
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 10,
              childAspectRatio: 1.2, // Ajusta el alto/ancho de los chips
            ),
            itemCount: channels.length,
            itemBuilder: (context, index) {
              return _ChannelGridItem(channel: channels[index]);
            },
          ),
        ],
      ),
    );
  }
}

class _Channel {
  final String svg;
  final String label;
  final String url;
  const _Channel({required this.svg, required this.label, required this.url});
}

class _ChannelGridItem extends StatelessWidget {
  final _Channel channel;
  const _ChannelGridItem({required this.channel});

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
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Ícono SVG original con sus propios colores
          SvgPicture.asset(channel.svg, width: 24, height: 24),
          const SizedBox(height: 4),
          // Etiqueta corta
          Text(
            channel.label,
            style: TextStyle(
              color: c.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
