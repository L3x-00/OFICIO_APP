import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/phone_input_section.dart'
    show formatForWhatsApp;
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
import 'package:flutter_svg/flutter_svg.dart';

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

  /// true si el usuario ya interactuó con el proveedor (chat, llamada o
  /// subasta) y por tanto puede dejar una reseña.
  final bool canReview;

  /// Callback para recargar las reseñas del padre después de crear/editar.
  final Future<void> Function() onReloadReviews;

  const ProviderContactBar({
    super.key,
    required this.provider,
    required this.isOwnCard,
    required this.myReview,
    required this.isRecommended,
    required this.repo,
    required this.canReview,
    required this.onReloadReviews,
  });

  // ── Acciones de contacto ───────────────────────────────────

  Future<void> _openWhatsApp() async {
    // Tracking analítico — fire-and-forget; nunca debe bloquear la apertura.
    unawaited(repo.trackEvent(provider.id, 'whatsapp_click'));
    final raw = provider.whatsapp ?? provider.phone;
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
        clientId: auth.user!.id,
        providerId: provider.id,
      );
      if (!context.mounted) return;
      Navigator.of(
        context,
      ).push(MaterialPageRoute(builder: (_) => ChatScreen(roomId: roomId)));
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('No se pudo abrir el chat: $e')));
    }
  }

  void _showLoginRequired(BuildContext context) {
    final c = context.colors;
    // Capturamos el rootNavigator ANTES del pop. Con go_router en el shell,
    // hacer Navigator.pop(context) sobre el context del árbol cierra la
    // ruta padre y deja el diálogo colgado — usamos `dialogCtx` para el
    // pop y `rootNav` para la navegación posterior.
    final rootNav = Navigator.of(context, rootNavigator: true);
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 220),
      pageBuilder: (dialogCtx, animation, secondaryAnimation) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Inicia sesión para continuar',
          style: TextStyle(
            color: c.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 17,
          ),
        ),
        content: Text(
          'Necesitas una cuenta para realizar esta acción.',
          style: TextStyle(color: c.textSecondary, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: Text('Ahora no', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              rootNav.push(
                MaterialPageRoute(
                  builder: (_) =>
                      const LoginScreen(initialMode: AuthMode.login),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text(
              'Iniciar sesión / Registrarme',
              style: TextStyle(color: Colors.white, fontSize: 12),
            ),
          ),
        ],
      ),
      transitionBuilder: (_, animation, secondaryAnimation, child) {
        final curved = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOut,
        );
        return FadeTransition(
          opacity: curved,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.92, end: 1.0).animate(curved),
            child: child,
          ),
        );
      },
    );
  }

  Future<void> _onReviewButton(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    if (auth.user == null) {
      _showLoginRequired(context);
      return;
    }
    final userId = auth.user!.id;
    final existing = myReview;

    if (existing != null) {
      // ── EDITAR reseña existente ──────────────
      final updated = await CreateReviewSheet.show(
        context,
        providerId: provider.id,
        providerName: provider.businessName,
        userId: userId,
        existingReview: existing,
        initiallyRecommended: isRecommended,
      );
      if (updated == true && context.mounted) {
        await onReloadReviews();
      }
    } else {
      // ── CREAR nueva reseña ───────────────────
      final created = await CreateReviewSheet.show(
        context,
        providerId: provider.id,
        providerName: provider.businessName,
        userId: userId,
      );
      if (created == true && context.mounted) {
        await onReloadReviews();
        if (!context.mounted) return;
        // Modal de recomendación solo en la primera reseña
        await RecommendModal.show(
          context,
          providerId: provider.id,
          userId: userId,
          repo: repo,
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

    // Bottom padding dinámico: respeta el inset de gesture-nav del
    // sistema. El 28px fijo previo se solapaba con la barra de
    // navegación en algunos Android.
    final bottomInset = MediaQuery.of(context).padding.bottom;
    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 12 + bottomInset),
      decoration: BoxDecoration(
        color: c.bgCard,
        border: Border(top: BorderSide(color: c.border, width: 0.5)),
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
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.30),
                    width: 0.5,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Icon(
                      Icons.dashboard_rounded,
                      color: AppColors.primary,
                      size: 20,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Ir a mi panel',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
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
                    // Glifo oscuro cálido sobre relleno dorado claro: amber
                    // sobre amber@0.10 se lava (sobre todo en tema claro).
                    glyphColor: AppColors.amberDeep,
                    fillAlpha: 0.10,
                    borderAlpha: 0.25,
                    onTap: () => _openInternalChat(context),
                  ),
                ),
                // Plan paga + toggle de privacidad: el proveedor puede ocultar
                // WhatsApp/llamada aunque su plan los permita (privacidad > plan).
                if ((provider.subscriptionPlan == 'PREMIUM' ||
                        provider.subscriptionPlan == 'ESTANDAR') &&
                    provider.showWhatsapp) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: _BigIconButton(
                      svgAsset: 'assets/icons/whatsapp.svg',
                      color: AppColors.whatsapp,
                      // Verde oscurecido sobre relleno verde claro: whatsapp
                      // sobre whatsapp@fill se lava en tema claro.
                      glyphColor: Color.alphaBlend(
                        Colors.black.withValues(alpha: 0.30),
                        AppColors.whatsapp,
                      ),
                      onTap: _openWhatsApp,
                    ),
                  ),
                ],
                if ((provider.subscriptionPlan == 'PREMIUM' ||
                        provider.subscriptionPlan == 'ESTANDAR') &&
                    provider.showPhone) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: _BigIconButton(
                      icon: Icons.call_rounded,
                      color: AppColors.call,
                      // Glifo en azul oscuro de marca sobre relleno claro:
                      // call sobre call@fill se lava en tema claro.
                      glyphColor: AppColors.primaryDark,
                      onTap: _makeCall,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 10),
            // El botón de reseña se habilita si el usuario ya reseñó
            // (puede editar) o si interactuó con el proveedor (canReview).
            // Prueba de interacción: reemplaza la validación GPS/QR.
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: (myReview != null || canReview)
                    ? () => _onReviewButton(context)
                    : null,
                icon: Icon(
                  myReview != null ? Icons.edit_rounded : Icons.star_rounded,
                  size: 18,
                ),
                label: Text(
                  myReview != null ? 'Editar mi reseña' : 'Dejar una reseña',
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: BorderSide(
                    color: AppColors.primary.withValues(alpha: 0.40),
                    width: 0.5,
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
            if (myReview == null && !canReview) ...[
              const SizedBox(height: 6),
              Text(
                'Solo puedes reseñar a proveedores con los que hayas '
                'interactuado (chat, llamada o subasta).',
                style: TextStyle(color: c.textMuted, fontSize: 11, height: 1.3),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _BigIconButton extends StatefulWidget {
  final IconData? icon;
  final String? svgAsset; // ← nuevo: ruta del SVG
  final Color color;

  /// Color del glifo (ícono). Por defecto = `color`, pero sobre rellenos
  /// dorados claros conviene un glifo oscuro cálido (amberDeep) para no
  /// lavarse en tema claro.
  final Color? glyphColor;

  /// Opacidad del relleno y del borde — permiten afinar cada botón.
  final double fillAlpha;
  final double borderAlpha;

  /// `FutureOr<void>` para soportar tanto handlers sync (`_makeCall`) como
  /// async (`_openInternalChat`). El widget bloquea taps adicionales
  /// hasta que el handler complete + un debounce de 600ms — sin esto,
  /// un doble-tap rápido lanza 2 chats o 2 llamadas simultáneas.
  final FutureOr<void> Function() onTap;

  const _BigIconButton({
    this.icon,
    this.svgAsset,
    required this.color,
    this.glyphColor,
    this.fillAlpha = 0.12,
    this.borderAlpha = 0.28,
    required this.onTap,
  }) : assert(icon != null || svgAsset != null);

  @override
  State<_BigIconButton> createState() => _BigIconButtonState();
}

class _BigIconButtonState extends State<_BigIconButton> {
  bool _busy = false;

  Future<void> _handleTap() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await widget.onTap();
    } catch (_) {
      // Errores los maneja el handler — aquí solo queremos garantizar
      // que liberamos el lock pase lo que pase.
    } finally {
      // Pequeño debounce extra: tras navegar la pantalla nueva aún
      // queda 1-2 frames antes de cubrir el botón, donde un tap
      // residual podría volver a disparar.
      await Future<void>.delayed(const Duration(milliseconds: 600));
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _busy ? null : _handleTap,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 120),
        opacity: _busy ? 0.5 : 1.0,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: widget.color.withValues(alpha: widget.fillAlpha),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: widget.color.withValues(alpha: widget.borderAlpha),
              width: 0.5,
            ),
          ),
          child: Center(
            child: widget.svgAsset != null
                ? SvgPicture.asset(widget.svgAsset!, width: 22, height: 22)
                : Icon(
                    widget.icon,
                    color: widget.glyphColor ?? widget.color,
                    size: 22,
                  ),
          ),
        ),
      ),
    );
  }
}
