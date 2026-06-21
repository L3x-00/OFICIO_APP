import 'dart:async';
import 'dart:math' as math;
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

/// Sección "Contáctanos" colapsable al final del perfil del cliente.
///
/// Inicia expandida y se colapsa automáticamente a los 2 segundos.
/// Al tocar el encabezado se expande/colapsa con animación suave
/// y stagger en los íconos.
class ContactUsSection extends StatefulWidget {
  const ContactUsSection({super.key});

  @override
  State<ContactUsSection> createState() => _ContactUsSectionState();
}

class _ContactUsSectionState extends State<ContactUsSection>
    with SingleTickerProviderStateMixin {
  bool _isExpanded = true;
  late AnimationController _controller;
  late Animation<double> _arrowRotation;
  Timer? _autoCollapseTimer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _arrowRotation = Tween<double>(
      begin: 0,
      end: math.pi / 2,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));

    // Inicia expandido
    _controller.forward();

    // Auto-colapsa tras 2 segundos (se cancela si el usuario toca antes)
    _autoCollapseTimer = Timer(const Duration(seconds: 2), () {
      if (mounted) _collapse();
    });
  }

  void _toggle() {
    _autoCollapseTimer?.cancel();
    setState(() => _isExpanded = !_isExpanded);
    _isExpanded ? _controller.forward() : _controller.reverse();
  }

  void _collapse() {
    if (!_isExpanded) return;
    setState(() => _isExpanded = false);
    _controller.reverse();
  }

  @override
  void dispose() {
    _autoCollapseTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

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
          // ── Cabecera colapsable ─────────────────────────────
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: _toggle,
              borderRadius: BorderRadius.circular(10),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
                child: Row(
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
                    const Spacer(),
                    RotationTransition(
                      turns: _arrowRotation,
                      child: Icon(
                        Icons.chevron_right,
                        color: c.textMuted,
                        size: 22,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── Contenido colapsable con stagger ────────────────
          SizeTransition(
            sizeFactor: _controller,
            axisAlignment: -1.0, // Se revela desde arriba
            child: ClipRect(
              child: Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FadeTransition(
                      opacity: _controller,
                      child: Text(
                        '¿Dudas o problemas? Escríbenos por cualquiera'
                        ' de estos canales.',
                        style: TextStyle(
                          color: c.textMuted,
                          fontSize: 12,
                          height: 1.4,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            crossAxisSpacing: 8,
                            mainAxisSpacing: 10,
                            childAspectRatio: 1.2,
                          ),
                      itemCount: channels.length,
                      itemBuilder: (context, index) {
                        return _StaggeredGridItem(
                          channel: channels[index],
                          animation: _controller,
                          index: index,
                          totalItems: channels.length,
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Modelo interno ────────────────────────────────────────────
class _Channel {
  final String svg;
  final String label;
  final String url;
  const _Channel({required this.svg, required this.label, required this.url});
}

// ── Ítem de grilla con aparición escalonada ───────────────────
class _StaggeredGridItem extends StatefulWidget {
  final _Channel channel;
  final Animation<double> animation;
  final int index;
  final int totalItems;

  const _StaggeredGridItem({
    required this.channel,
    required this.animation,
    required this.index,
    required this.totalItems,
  });

  @override
  State<_StaggeredGridItem> createState() => _StaggeredGridItemState();
}

class _StaggeredGridItemState extends State<_StaggeredGridItem> {
  late final Animation<double> _fadeAnim;
  late final Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();

    // Cada ítem arranca un poco después del anterior
    const staggerFraction = 0.07;
    const intervalSpan = 0.45;
    final start = (widget.index * staggerFraction).clamp(0.0, 0.8);
    final end = (start + intervalSpan).clamp(start + 0.15, 1.0);

    _fadeAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: widget.animation,
        curve: Interval(start, end, curve: Curves.easeOut),
      ),
    );

    _slideAnim = Tween<Offset>(begin: const Offset(0, -0.25), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: widget.animation,
            curve: Interval(start, end, curve: Curves.easeOutCubic),
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnim,
      child: SlideTransition(
        position: _slideAnim,
        child: _ChannelGridItem(channel: widget.channel),
      ),
    );
  }
}

// ── Ítem base (sin cambios funcionales) ──────────────────────
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
          SvgPicture.asset(channel.svg, width: 24, height: 24),
          const SizedBox(height: 4),
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
