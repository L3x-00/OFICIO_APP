import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Vista previa (mock) del perfil que el usuario tendrá según el tipo
/// seleccionado: foto de portada, avatar + nombre + badge verificado,
/// miniaturas (solo NEGOCIO) y botones de contacto.
///
/// [isOficio] cambia los colores de acento (azul para OFICIO, morado para
/// NEGOCIO), los placeholders de texto y oculta las miniaturas en OFICIO.
class ProfilePreviewMock extends StatelessWidget {
  final bool isOficio;
  const ProfilePreviewMock({super.key, required this.isOficio});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final accentColors = isOficio
        ? [const Color(0xFF00C6FF), const Color(0xFF0072FF)]
        : [const Color(0xFF8E2DE2), const Color(0xFF4A00E0)];

    return Container(
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Foto de portada placeholder
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Container(
              height: 90,
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    accentColors[0].withValues(alpha: 0.25),
                    accentColors[1].withValues(alpha: 0.25),
                  ],
                ),
              ),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isOficio
                          ? Icons.add_photo_alternate_rounded
                          : Icons.photo_library_rounded,
                      color: Colors.white54,
                      size: 28,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tu foto de portada aquí',
                      style: TextStyle(color: Colors.white54, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar + nombre + badge
                Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: accentColors),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isOficio
                            ? Icons.person_rounded
                            : Icons.storefront_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isOficio
                                ? 'Tu nombre profesional'
                                : 'Nombre de tu negocio',
                            style: TextStyle(
                              color: c.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            isOficio
                                ? 'Especialidad (ej: Electricista)'
                                : 'Categoría (ej: Restaurante)',
                            style: TextStyle(
                              color: c.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.verified.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: AppColors.verified.withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.verified_rounded,
                              color: AppColors.verified, size: 12),
                          SizedBox(width: 3),
                          Text(
                            'Verificado',
                            style: TextStyle(
                              color: AppColors.verified,
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                // Miniaturas de fotos (solo para negocios, 3 slots)
                if (!isOficio) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: List.generate(
                      3,
                      (i) => Expanded(
                        child: Container(
                          height: 50,
                          margin: EdgeInsets.only(right: i < 2 ? 6 : 0),
                          decoration: BoxDecoration(
                            color: c.bgInput,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                                color: Colors.white.withValues(alpha: 0.06)),
                          ),
                          child: Center(
                            child: Icon(
                              Icons.image_rounded,
                              color: c.textMuted.withValues(alpha: 0.4),
                              size: 18,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Center(
                    child: Text(
                      'Tus fotos aparecen en la tarjeta del negocio',
                      style: TextStyle(
                          color: c.textMuted, fontSize: 10),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],

                // Botones de contacto mock
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.whatsapp.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: AppColors.whatsapp.withValues(alpha: 0.25)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SvgPicture.asset('assets/icons/whatsapp.svg',
                                width: 14, height: 14),
                            const SizedBox(width: 4),
                            const Text(
                              'WhatsApp',
                              style: TextStyle(
                                  color: AppColors.whatsapp,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.call.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: AppColors.call.withValues(alpha: 0.25)),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.call_rounded,
                                color: AppColors.call, size: 14),
                            SizedBox(width: 4),
                            Text(
                              'Llamar',
                              style: TextStyle(
                                  color: AppColors.call,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
