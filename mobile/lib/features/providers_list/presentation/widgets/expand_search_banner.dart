import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';

/// Banner que aparece en el FilterSheet cuando hay un departamento
/// seleccionado. Tiene 2 estados:
///
/// 1. **Filtro específico activo** (prov o dist != null):
///    Muestra "Ampliar búsqueda" con botón habilitado.
/// 2. **Búsqueda ampliada** (solo dept, sin prov ni dist):
///    Muestra "Búsqueda ampliada — Mostrando todo el Perú" con botón bloqueado.
class ExpandSearchBanner extends StatelessWidget {
  final String department;
  final bool isExpanded; // true = ya se amplió (sin prov/dist)
  final VoidCallback onExpand;

  const ExpandSearchBanner({
    super.key,
    required this.department,
    required this.isExpanded,
    required this.onExpand,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isExpanded
            ? Colors.green.withValues(alpha: 0.06)
            : AppColors.amber.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isExpanded
              ? Colors.green.withValues(alpha: 0.25)
              : AppColors.amber.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isExpanded ? Icons.check_circle_outline_rounded : Icons.travel_explore_rounded,
            color: isExpanded ? Colors.green : AppColors.amber,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isExpanded ? 'Búsqueda ampliada' : 'Ampliar búsqueda',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  isExpanded
                      ? 'Mostrando todos los servicios del Perú'
                      : 'Ver servicios de todo el Perú (puede demorar)',
                  style: TextStyle(color: c.textMuted, fontSize: 11, height: 1.3),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          if (!isExpanded)
            TextButton(
              onPressed: () => _confirmAndExpand(context),
              style: TextButton.styleFrom(
                backgroundColor: AppColors.amber.withValues(alpha: 0.15),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text(
                'Ampliar',
                style: TextStyle(
                  color: AppColors.amber,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _confirmAndExpand(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: context.colors.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Icon(Icons.info_outline_rounded, color: AppColors.amber, size: 24),
            const SizedBox(width: 10),
            const Expanded(
              child: Text('Búsqueda ampliada', style: TextStyle(fontSize: 17)),
            ),
          ],
        ),
        content: const Text(
          'Se mostrarán todos los servicios del Perú.\n\n'
          'Este proceso puede demorar unos segundos porque necesita '
          'consultar más datos.',
          style: TextStyle(fontSize: 13, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.amber,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Continuar'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      onExpand();
    }
  }
}