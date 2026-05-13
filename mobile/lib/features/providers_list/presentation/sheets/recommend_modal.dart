import 'package:flutter/material.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../data/providers_repository.dart';

/// Modal post-reseña que pregunta al usuario si recomendaría el proveedor.
/// Solo se muestra después de crear la PRIMERA reseña.
class RecommendModal {
  static Future<void> show(
    BuildContext context, {
    required int providerId,
    required int userId,
    required ProvidersRepository repo,
  }) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      builder: (_) => _RecommendModalSheet(
        providerId: providerId,
        userId: userId,
        repo: repo,
      ),
    );
  }
}

class _RecommendModalSheet extends StatefulWidget {
  final int providerId;
  final int userId;
  final ProvidersRepository repo;
  const _RecommendModalSheet({
    required this.providerId,
    required this.userId,
    required this.repo,
  });

  @override
  State<_RecommendModalSheet> createState() => _RecommendModalSheetState();
}

class _RecommendModalSheetState extends State<_RecommendModalSheet> {
  bool _loading = false;

  Future<void> _recommend() async {
    if (widget.userId == 0) { Navigator.of(context).pop(); return; }
    setState(() => _loading = true);
    try {
      await widget.repo.recommend(widget.providerId, widget.userId);
    } catch (_) {
      // silencioso — no bloquear UX
    }
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: EdgeInsets.fromLTRB(
        24, 20, 24,
        MediaQuery.of(context).padding.bottom + 24,
      ),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: c.textMuted.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Ícono
          Container(
            width: 64, height: 64,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.thumb_up_rounded, color: AppColors.primary, size: 30),
          ),
          const SizedBox(height: 16),

          Text(
            '¿Recomendarías este servicio?',
            style: TextStyle(color: c.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Tu recomendación ayuda a otros usuarios a elegir mejor.',
            style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.5),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),

          // Sí, recomendar
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _loading ? null : _recommend,
              icon: _loading
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.thumb_up_rounded, size: 18),
              label: const Text('Sí, recomendar', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Después
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: _loading ? null : () => Navigator.of(context).pop(),
              style: OutlinedButton.styleFrom(
                foregroundColor: c.textSecondary,
                side: BorderSide(color: c.border),
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Después', style: TextStyle(fontSize: 14)),
            ),
          ),
          const SizedBox(height: 8),

          // No lo recomiendo
          TextButton(
            onPressed: _loading ? null : () => Navigator.of(context).pop(),
            child: Text(
              'No lo recomiendo',
              style: TextStyle(color: c.textMuted, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
