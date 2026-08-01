import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'stagger_fade.dart';

/// Visual del Slide 7: conversación simulada con el asistente virtual "Ofi",
/// con burbujas apareciendo progresivamente.
class SlideOfiAssistant extends StatelessWidget {
  const SlideOfiAssistant({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          StaggerFade(
            index: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Flexible(
                  child: _ChatBubble(
                    text: 'Necesito un pintor',
                    fromUser: true,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          StaggerFade(
            index: 1,
            total: 2,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  width: 30,
                  height: 30,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.smart_toy_rounded,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
                const Flexible(
                  child: _ChatBubble(
                    text:
                        '¡Claro! Tengo 3 pintores cerca de ti con '
                        'excelentes reseñas.',
                    fromUser: false,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          StaggerFade(
            index: 2,
            total: 2,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.bolt_rounded,
                      color: AppColors.primary,
                      size: 13,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      'Respuestas al instante, 24/7',
                      style: TextStyle(
                        color: AppColors.tintOn(AppColors.primary, c.isDark),
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                      ),
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

class _ChatBubble extends StatelessWidget {
  final String text;
  final bool fromUser;

  const _ChatBubble({required this.text, required this.fromUser});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
      decoration: BoxDecoration(
        color: fromUser ? AppColors.primary : c.bgCard.withValues(alpha: 0.92),
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(16),
          topRight: const Radius.circular(16),
          bottomLeft: Radius.circular(fromUser ? 16 : 4),
          bottomRight: Radius.circular(fromUser ? 4 : 16),
        ),
        border: fromUser
            ? null
            : Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: c.isDark ? 0.25 : 0.06),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Text(
        text,
        style: TextStyle(
          color: fromUser ? Colors.white : c.textPrimary,
          fontSize: 12.5,
          height: 1.35,
        ),
      ),
    );
  }
}
