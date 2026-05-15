import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import '../../../../providers_list/presentation/providers/providers_provider.dart';

/// Toggle tema claro/oscuro — switch sincronizado con [ThemeProvider].
class ThemeToggleRow extends StatelessWidget {
  final ThemeProvider theme;
  const ThemeToggleRow({super.key, required this.theme});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: theme.toggle,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: c.border),
        ),
        child: Row(
          children: [
            Icon(
              theme.isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
              color: AppColors.amber,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                theme.isDark ? 'Tema oscuro' : 'Tema claro',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Switch(
              value: !theme.isDark,
              onChanged: (_) => theme.toggle(),
              activeThumbColor: AppColors.amber,
            ),
          ],
        ),
      ),
    );
  }
}

/// Toggle "Mostrar categorías en la pantalla principal" — controla la
/// preferencia persistente del usuario en [ProvidersProvider].
class CategoryFilterToggleRow extends StatelessWidget {
  final ProvidersProvider prov;
  const CategoryFilterToggleRow({super.key, required this.prov});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: prov.toggleCategoryFilter,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: c.border),
        ),
        child: Row(
          children: [
            Icon(
              Icons.category_rounded,
              color: AppColors.primary,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Mostrar categorías en la pantalla principal',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Switch(
              value: prov.showCategoryFilter,
              onChanged: (_) => prov.toggleCategoryFilter(),
              activeThumbColor: AppColors.primary,
            ),
          ],
        ),
      ),
    );
  }
}
