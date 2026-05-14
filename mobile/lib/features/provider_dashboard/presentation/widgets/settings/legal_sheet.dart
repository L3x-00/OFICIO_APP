import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'legal_content.dart';

enum LegalSection { privacy, terms, help }

/// Sheet modal con contenido legal/ayuda. Selecciona el texto correcto
/// según el [profileType] (OFICIO|NEGOCIO) y la [section].
///
/// Uso: `LegalSheet.show(context, type: 'OFICIO', section: LegalSection.privacy)`
class LegalSheet extends StatelessWidget {
  final String profileType; // 'OFICIO' | 'NEGOCIO'
  final LegalSection section;

  const LegalSheet({
    super.key,
    required this.profileType,
    required this.section,
  });

  static void show(BuildContext context, {required String type, required LegalSection section}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => LegalSheet(profileType: type, section: section),
    );
  }

  // ── Metadatos por sección y rol ──────────────────────────
  String get _title => switch (section) {
    LegalSection.privacy => 'Política de Privacidad',
    LegalSection.terms   => 'Términos y Condiciones',
    LegalSection.help    => 'Centro de Ayuda',
  };

  IconData get _icon => switch (section) {
    LegalSection.privacy => Icons.privacy_tip_rounded,
    LegalSection.terms   => Icons.description_rounded,
    LegalSection.help    => Icons.help_outline_rounded,
  };

  Color get _accentColor =>
      profileType == 'NEGOCIO' ? AppColors.amber : AppColors.primary;

  String get _content => switch (section) {
    LegalSection.privacy => profileType == 'NEGOCIO' ? kPrivacyNegocio : kPrivacyOficio,
    LegalSection.terms   => profileType == 'NEGOCIO' ? kTermsNegocio   : kTermsOficio,
    LegalSection.help    => profileType == 'NEGOCIO' ? kHelpNegocio    : kHelpOficio,
  };

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final accent = _accentColor;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollController) => Container(
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // ── Handle ───────────────────────────────────────
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 8),
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: c.textMuted.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // ── Header con badge de rol ───────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 16, 12),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(_icon, color: accent, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _title,
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: accent.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            profileType == 'NEGOCIO' ? 'Panel de Negocios' : 'Panel Profesional',
                            style: TextStyle(color: accent, fontSize: 10, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: c.textMuted),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            Divider(height: 1, color: c.border),

            // ── Contenido scrollable ─────────────────────────
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
                child: Text(
                  _content,
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 13,
                    height: 1.75,
                  ),
                ),
              ),
            ),

            // ── Botón cerrar ─────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accent,
                    foregroundColor: profileType == 'NEGOCIO'
                        ? const Color(0xFF3D2B00)
                        : Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Entendido',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
