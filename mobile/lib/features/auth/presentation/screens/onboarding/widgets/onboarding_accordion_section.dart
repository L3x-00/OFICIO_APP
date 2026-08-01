import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Sección de acordeón reutilizable del formulario de onboarding: header
/// tocable (título + check de completitud + flecha animada) y contenido
/// que se expande/colapsa con [AnimatedSize]. Usada 2 veces (Oficio/Negocio)
/// o 3 veces (Profesional) por [ProviderOnboardingForm].
class OnboardingAccordionSection extends StatelessWidget {
  final String title;
  final bool isExpanded;
  final bool isComplete;
  final VoidCallback onToggle;
  final List<Widget> children;

  const OnboardingAccordionSection({
    super.key,
    required this.title,
    required this.isExpanded,
    required this.isComplete,
    required this.onToggle,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          width: 0.5,
          color: isComplete
              ? AppColors.available.withValues(alpha: 0.4)
              : c.border,
        ),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: onToggle,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  if (isComplete)
                    Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: Icon(
                        Icons.check_circle,
                        size: 18,
                        color: AppColors.available,
                      ),
                    ),
                  AnimatedRotation(
                    turns: isExpanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 300),
                    child: Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: c.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            child: isExpanded
                ? Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: children,
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}
