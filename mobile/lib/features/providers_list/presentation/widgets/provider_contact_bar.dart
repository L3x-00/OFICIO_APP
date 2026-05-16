import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/phone_input_section.dart' show formatForWhatsApp;
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/presentation/screens/login_screen.dart';
import '../../../chat/presentation/providers/chat_provider.dart';
import '../../../chat/presentation/screens/chat_screen.dart';
import '../../../provider_dashboard/presentation/screens/provider_panel.dart';
import '../../data/providers_repository.dart';
import '../../domain/models/provider_model.dart';
import '../../domain/models/review_model.dart';
import '../sheets/recommend_modal.dart';
import 'create_review_sheet.dart';

/// Barra fija inferior con los botones de contacto (chat / WhatsApp / llamada)
/// + botón de reseña. Si es la tarjeta del propio dueño muestra "Ir a mi panel".
///
/// Gating por plan:
///   - GRATIS:           solo chat interno
///   - ESTANDAR/PREMIUM: chat + WhatsApp + llamada
class ProviderContactBar extends StatelessWidget {
  final ProviderModel provider;
  final bool isOwnCard;
  final ReviewModel? myReview;
  final bool isRecommended;
  final ProvidersRepository repo;

  /// Callback para recargar las reseñas del padre después de crear/editar.
  final Future<void> Function() onReloadReviews;

  const ProviderContactBar({
    super.key,
    required this.provider,
    required this.isOwnCard,
    required this.myReview,
    required this.isRecommended,
    required this.repo,
    required this.onReloadReviews,
  });

  // ── Acciones de contacto ───────────────────────────────────

  Future<void> _openWhatsApp() async {
    // Tracking analítico — fire-and-forget; nunca debe bloquear la apertura.
    unawaited(repo.trackEvent(provider.id, 'whatsapp_click'));
    final raw    = provider.whatsapp ?? provider.phone;
    final number = formatForWhatsApp(raw).replaceAll(RegExp(r'[\s\-\(\)]'), '');
    final message = Uri.encodeComponent(
      AppStrings.whatsappMessage(provider.businessName),
    );
    final nativeUrl = Uri.parse('whatsapp://send?phone=$number&text=$message');
    final webUrl = Uri.parse('https://wa.me/$number?text=$message');

    if (await canLaunchUrl(nativeUrl)) {
      await launchUrl(nativeUrl);
    } else {
      await launchUrl(webUrl, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _makeCall() async {
    unawaited(repo.trackEvent(provider.id, 'call_click'));
    final uri = Uri.parse('tel:${provider.phone}');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  /// Abre el chat interno con este proveedor. Crea/recupera la sala
  /// y navega a `ChatScreen`. Requiere usuario autenticado.
  Future<void> _openInternalChat(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    if (auth.user == null) {
      _showLoginRequired(context);
      return;
    }
    final chat = context.read<ChatProvider>();
    try {
      final roomId = await chat.openRoom(
        clientId:   auth.user!.id,
        providerId: provider.id,
      );
      if (!context.mounted) return;
      Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => ChatScreen(roomId: roomId),
      ));
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo abrir el chat: $e')),
      );
    }
  }

  void _showLoginRequired(BuildContext context) {
    final c       = context.colors;
    // Capturamos el rootNavigator ANTES del pop. Con go_router en el shell,
    // hacer Navigator.pop(context) sobre el context del árbol cierra la
    // ruta padre y deja el diálogo colgado — usamos `dialogCtx` para el
    // pop y `rootNav` para la navegación posterior.
    final rootNav = Navigator.of(context, rootNavigator: true);
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Inicia sesión para continuar',
            style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 17)),
        content: Text('Necesitas una cuenta para realizar esta acción.',
            style: TextStyle(color: c.textSecondary, height: 1.5)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: Text('Ahora no', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              rootNav.push(MaterialPageRoute(
                builder: (_) => const LoginScreen(initialMode: AuthMode.login),
              ));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Iniciar sesión / Registrarme',
                style: TextStyle(color: Colors.white, fontSize: 12)),
          ),
        ],
      ),
    );
  }

  Future<void> _onReviewButton(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    if (auth.user == null) { _showLoginRequired(context); return; }
    final userId = auth.user!.id;
    final existing = myReview;

    if (existing != null) {
      // ── EDITAR reseña existente ──────────────
      final updated = await CreateReviewSheet.show(
        context,
        providerId:           provider.id,
        providerName:         provider.businessName,
        userId:               userId,
        existingReview:       existing,
        initiallyRecommended: isRecommended,
      );
      if (updated == true && context.mounted) {
        await onReloadReviews();
      }
    } else {
      // ── CREAR nueva reseña ───────────────────
      final created = await CreateReviewSheet.show(
        context,
        providerId:   provider.id,
        providerName: provider.businessName,
        userId:       userId,
      );
      if (created == true && context.mounted) {
        await onReloadReviews();
        if (!context.mounted) return;
        // Modal de recomendación solo en la primera reseña
        await RecommendModal.show(
          context,
          providerId: provider.id,
          userId:     userId,
          repo:       repo,
        );
        // Refresca de nuevo tras la recomendación para que
        // `totalRecommendations` quede al día en la tarjeta.
        if (context.mounted) await onReloadReviews();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
      decoration: BoxDecoration(
        color: c.bgCard,
        border: Border(
          top: BorderSide(color: Colors.white.withValues(alpha: 0.06)),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isOwnCard)
            GestureDetector(
              onTap: () {
                Navigator.of(context).pop();
                // rootNavigator: el panel debe salir del shell tabuado
                // para ocultar la bottom nav del cliente.
                Navigator.of(context, rootNavigator: true).push(
                  MaterialPageRoute(
                    builder: (_) => ProviderPanel(
                      providerType: provider.type == ProviderType.negocio
                          ? 'NEGOCIO'
                          : 'OFICIO',
                    ),
                  ),
                );
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Icon(Icons.dashboard_rounded, color: AppColors.primary, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Ir a mi panel',
                      style: TextStyle(color: AppColors.primary, fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            )
          else ...[
            // Plan gating: GRATIS solo expone el chat interno; ESTANDAR/PREMIUM
            // muestran chat + WhatsApp + llamada.
            Row(
              children: [
                Expanded(
                  child: _BigIconButton(
                    icon: Icons.forum_rounded,
                    color: AppColors.amber,
                    onTap: () => _openInternalChat(context),
                  ),
                ),
                if (provider.subscriptionPlan == 'PREMIUM' ||
                    provider.subscriptionPlan == 'ESTANDAR') ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: _BigIconButton(
                      icon: Icons.chat_rounded,
                      color: AppColors.whatsapp,
                      onTap: _openWhatsApp,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _BigIconButton(
                      icon: Icons.call_rounded,
                      color: AppColors.call,
                      onTap: _makeCall,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _onReviewButton(context),
                icon: Icon(
                  myReview != null ? Icons.edit_rounded : Icons.star_rounded,
                  size: 18,
                ),
                label: Text(myReview != null ? 'Editar mi reseña' : 'Dejar una reseña'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.star,
                  side: BorderSide(color: AppColors.star.withValues(alpha: 0.4)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _BigIconButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _BigIconButton({
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Center(
          child: Icon(icon, color: color, size: 22),
        ),
      ),
    );
  }
}
