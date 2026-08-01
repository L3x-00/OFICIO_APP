import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import '../../../../providers_list/presentation/providers/providers_provider.dart';
import 'profile_sections.dart';

/// Switch de los toggles de Preferencias — mismo look en las 3 filas.
/// `shrinkWrap` evita que el tap target de 48px infle la altura de la fila
/// respecto a los [SectionItem] sin switch.
class _ToggleSwitch extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;
  const _ToggleSwitch({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Switch(
      value: value,
      onChanged: onChanged,
      activeThumbColor: AppColors.amber,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}

/// Toggle tema claro/oscuro — switch sincronizado con [ThemeProvider].
class ThemeToggleRow extends StatelessWidget {
  final ThemeProvider theme;
  const ThemeToggleRow({super.key, required this.theme});

  @override
  Widget build(BuildContext context) {
    return SectionItem(
      icon: theme.isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
      label: theme.isDark ? 'Tema oscuro' : 'Tema claro',
      onTap: theme.toggle,
      trailing: _ToggleSwitch(
        value: !theme.isDark,
        onChanged: (_) => theme.toggle(),
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
    return SectionItem(
      icon: Icons.category_rounded,
      label: 'Mostrar categorías en la pantalla principal',
      onTap: prov.toggleCategoryFilter,
      trailing: _ToggleSwitch(
        value: prov.showCategoryFilter,
        onChanged: (_) => prov.toggleCategoryFilter(),
      ),
    );
  }
}

/// Toggle "Mostrar asistente Ofi" — controla la preferencia persistente del
/// usuario en [ProvidersProvider], leída reactivamente por [AiAssistantFab]
/// en la pantalla principal.
class OfiVisibilityToggleRow extends StatelessWidget {
  final ProvidersProvider prov;
  const OfiVisibilityToggleRow({super.key, required this.prov});

  @override
  Widget build(BuildContext context) {
    return SectionItem(
      icon: Icons.smart_toy_rounded,
      label: 'Mostrar asistente Ofi',
      onTap: () => prov.setOfiFabVisible(!prov.ofiFabVisible),
      trailing: _ToggleSwitch(
        value: prov.ofiFabVisible,
        onChanged: (v) => prov.setOfiFabVisible(v),
      ),
    );
  }
}
