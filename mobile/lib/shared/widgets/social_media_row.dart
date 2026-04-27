import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// Fila horizontal con iconos de redes sociales clicables.
/// Cada icono usa el color de su marca y abre la URL correspondiente.
class SocialMediaRow extends StatelessWidget {
  final String? website;
  final String? instagram;
  final String? tiktok;
  final String? facebook;
  final String? linkedin;
  final String? twitterX;
  final String? telegram;
  final String? whatsappBiz;

  const SocialMediaRow({
    super.key,
    this.website,
    this.instagram,
    this.tiktok,
    this.facebook,
    this.linkedin,
    this.twitterX,
    this.telegram,
    this.whatsappBiz,
  });

  bool get hasAny =>
      _v(website)     ||
      _v(instagram)   ||
      _v(tiktok)      ||
      _v(facebook)    ||
      _v(linkedin)    ||
      _v(twitterX)    ||
      _v(telegram)    ||
      _v(whatsappBiz);

  static bool _v(String? s) => s != null && s.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    if (!hasAny) return const SizedBox.shrink();

    final icons = <_SocialIcon>[
      if (_v(website))     _SocialIcon(Icons.public_rounded,     const Color(0xFF1F2937), website!,     prefix: 'https://'),
      if (_v(instagram))   _SocialIcon(Icons.camera_alt_rounded, const Color(0xFFE4405F), instagram!,   prefix: 'https://instagram.com/'),
      if (_v(tiktok))      _SocialIcon(Icons.music_note_rounded, const Color(0xFF000000), tiktok!,      prefix: 'https://tiktok.com/@'),
      if (_v(facebook))    _SocialIcon(Icons.facebook_rounded,   const Color(0xFF1877F2), facebook!,    prefix: 'https://facebook.com/'),
      if (_v(linkedin))    _SocialIcon(Icons.work_rounded,       const Color(0xFF0A66C2), linkedin!,    prefix: 'https://linkedin.com/in/'),
      if (_v(twitterX))    _SocialIcon(Icons.alternate_email,    const Color(0xFF000000), twitterX!,    prefix: 'https://x.com/'),
      if (_v(telegram))    _SocialIcon(Icons.send_rounded,       const Color(0xFF26A5E4), telegram!,    prefix: 'https://t.me/'),
      if (_v(whatsappBiz)) _SocialIcon(Icons.chat_rounded,       const Color(0xFF25D366), whatsappBiz!, prefix: 'https://wa.me/'),
    ];

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: icons.map((s) => _SocialIconButton(data: s)).toList(),
    );
  }
}

class _SocialIcon {
  final IconData icon;
  final Color color;
  final String value;
  final String prefix;
  const _SocialIcon(this.icon, this.color, this.value, {required this.prefix});

  Uri get url {
    final v = value.trim();
    if (v.startsWith('http://') || v.startsWith('https://')) return Uri.parse(v);
    return Uri.parse('$prefix${v.replaceAll(RegExp(r'^@'), '')}');
  }
}

class _SocialIconButton extends StatelessWidget {
  final _SocialIcon data;
  const _SocialIconButton({required this.data});

  Future<void> _launch(BuildContext context) async {
    try {
      final ok = await launchUrl(data.url, mode: LaunchMode.externalApplication);
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
    return InkWell(
      onTap: () => _launch(context),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width:  40,
        height: 40,
        decoration: BoxDecoration(
          color: data.color.withValues(alpha: 0.12),
          shape: BoxShape.circle,
          border: Border.all(color: data.color.withValues(alpha: 0.4)),
        ),
        child: Icon(data.icon, color: data.color, size: 20),
      ),
    );
  }
}
