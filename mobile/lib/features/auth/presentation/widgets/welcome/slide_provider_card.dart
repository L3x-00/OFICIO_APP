import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Visual del Slide 2: Tarjeta mock de proveedor con rating y acciones.
class SlideProviderCard extends StatelessWidget {
  const SlideProviderCard({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Header: foto + badges
          Row(
            children: [
              // Foto avatar con iniciales
              Container(
                width: 56,
                height: 56,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryDark],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Text(
                    'JS',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Juan Sosa',
                      style: TextStyle(
                        color: c.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Electricista Certificado',
                      style: TextStyle(color: c.textSecondary, fontSize: 12),
                    ),
                    const SizedBox(height: 5),
                    // Etiquetas
                    Row(
                      children: [
                        MiniTag(
                          label: 'Verificado',
                          icon: Icons.verified_rounded,
                          color: AppColors.verified,
                        ),
                        const SizedBox(width: 6),
                        MiniTag(
                          label: 'Premium',
                          icon: Icons.star_rounded,
                          color: AppColors.premium,
                          textColor: const Color(0xFF3D2B00),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Estrellas y disponibilidad
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: c.bgInput,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                ...List.generate(5, (i) => Icon(
                  i < 4 ? Icons.star_rounded : Icons.star_half_rounded,
                  color: AppColors.star,
                  size: 16,
                )),
                const SizedBox(width: 6),
                Text(
                  '4.8',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  ' (23 reseñas)',
                  style: TextStyle(color: c.textSecondary, fontSize: 11),
                ),
                const Spacer(),
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.available,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
                const Text(
                  'Disponible',
                  style: TextStyle(
                    color: AppColors.available,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Botones de acción mock
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.whatsapp.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.whatsapp.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SvgPicture.asset('assets/icons/whatsapp.svg',
                          width: 15, height: 15),
                      const SizedBox(width: 5),
                      const Text(
                        'WhatsApp',
                        style: TextStyle(
                          color: AppColors.whatsapp,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.call.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.call.withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.call_rounded, color: AppColors.call, size: 15),
                      SizedBox(width: 5),
                      Text(
                        'Llamar',
                        style: TextStyle(
                          color: AppColors.call,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Mini etiqueta tipo badge usada en la tarjeta de proveedor.
class MiniTag extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final Color? textColor;

  const MiniTag({
    super.key,
    required this.label,
    required this.icon,
    required this.color,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final tc = textColor ?? color;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: textColor != null ? 1.0 : 0.12),
        borderRadius: BorderRadius.circular(8),
        border: textColor != null
            ? null
            : Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: tc, size: 10),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(
              color: tc,
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}