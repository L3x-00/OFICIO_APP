import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
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
  });

  @override
  State<OnboardingSocialSection> createState() => _OnboardingSocialSectionState();
}

class _OnboardingSocialSectionState extends State<OnboardingSocialSection> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    const networks = [
      ('website',     'Página web',          Icons.language_rounded),
      ('instagram',   'Instagram',            Icons.camera_alt_rounded),
      ('tiktok',      'TikTok',               Icons.music_note_rounded),
      ('facebook',    'Facebook',             Icons.facebook_rounded),
      ('linkedin',    'LinkedIn',             Icons.work_rounded),
      ('twitterX',    'Twitter / X',          Icons.alternate_email_rounded),
      ('telegram',    'Telegram',             Icons.send_rounded),
      ('whatsappBiz', 'WhatsApp (negocio)',   Icons.chat_rounded),
    ];

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
          ...networks.map(((String key, String label, IconData icon) entry) {
            final ctrl = controllers[entry.$1]!;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: TextField(
                controller: ctrl,
                style: TextStyle(color: c.textPrimary, fontSize: 14),
                decoration: InputDecoration(
                  prefixIcon: Icon(entry.$3, color: c.textMuted, size: 18),
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
