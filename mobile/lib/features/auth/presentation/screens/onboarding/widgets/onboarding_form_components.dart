import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Etiqueta de sección reutilizable en el formulario de onboarding.
class FormSectionHeader extends StatelessWidget {
  final String label;
  const FormSectionHeader({super.key, required this.label});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Text(
      label,
      style: TextStyle(
        color: c.textMuted,
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.2,
      ),
    );
  }
}

/// Badge visual que diferencia entre Oficio, Profesional y Negocio.
class TypeBadge extends StatelessWidget {
  /// 'OFICIO' | 'PROFESIONAL' | 'NEGOCIO'.
  final String providerType;
  const TypeBadge({super.key, required this.providerType});

  bool get _isProfesional => providerType == 'PROFESIONAL';
  bool get _isNegocio => providerType == 'NEGOCIO';

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final color = _isNegocio
        ? AppColors.amber
        : _isProfesional
        ? AppColors.available
        : AppColors.primary;
    final glyph = AppColors.tintOn(color, c.isDark);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _isNegocio
                ? Icons.storefront_rounded
                : _isProfesional
                ? Icons.school_rounded
                : Icons.handyman_rounded,
            size: 14,
            color: glyph,
          ),
          const SizedBox(width: 6),
          Text(
            _isNegocio
                ? 'Negocio'
                : _isProfesional
                ? 'Servicios profesionales'
                : 'Profesional Independiente',
            style: TextStyle(
              color: glyph,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Campo de texto genérico para el formulario de onboarding.
class FormFieldTile extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData icon;
  final TextInputType? keyboardType;
  final int maxLines;
  final int? maxLength;

  const FormFieldTile({
    super.key,
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    this.keyboardType,
    this.maxLines = 1,
    this.maxLength,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: c.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          maxLength: maxLength,
          style: TextStyle(color: c.textPrimary),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
            prefixIcon: maxLines == 1
                ? Icon(icon, color: c.textMuted, size: 20)
                : null,
            counterText: '',
            filled: true,
            fillColor: c.bgInput,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(
                color: AppColors.primary,
                width: 1.5,
              ),
            ),
            contentPadding: EdgeInsets.all(maxLines > 1 ? 16 : 14),
          ),
        ),
      ],
    );
  }
}
