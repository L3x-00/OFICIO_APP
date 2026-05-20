import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/app_network_image.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../provider_dashboard/data/offer_posts_repository.dart';
import '../../../provider_dashboard/presentation/screens/provider_panel.dart';
import '../../../providers_list/data/providers_repository.dart';
import '../../../providers_list/presentation/screens/provider_detail_screen.dart';
import '../../domain/models/public_offer_model.dart';
import '../providers/offers_provider.dart';

/// Detalle completo de una oferta pública.
///
/// Se abre al tocar una tarjeta del listado. Muestra foto, descripción
/// extendida, precio, datos del proveedor y un botón que redirige al
/// perfil del profesional o a la carta del negocio (según el tipo).
class OfferDetailSheet extends StatelessWidget {
  final PublicOfferModel offer;
  const OfferDetailSheet({super.key, required this.offer});

  static Future<void> show(BuildContext context, PublicOfferModel offer) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (_) => OfferDetailSheet(offer: offer),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final screenH = MediaQuery.of(context).size.height;
    final p = offer.provider;
    // Detectar si esta oferta es del propio user comparando provider.id
    // con los providerIds del auth (OFICIO + NEGOCIO). En ese caso
    // mostramos opciones de gestión en vez del CTA público.
    final auth = context.watch<AuthProvider>();
    final ownOficioId  = auth.providerDataFor('OFICIO')?['id']  as int?;
    final ownNegocioId = auth.providerDataFor('NEGOCIO')?['id'] as int?;
    final isOwn = p.id == ownOficioId || p.id == ownNegocioId;
    final ownProfileType = p.id == ownNegocioId ? 'NEGOCIO' : 'OFICIO';

    return Container(
      height: screenH * 0.85,
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Handle
          Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 8),
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: c.textMuted.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (offer.photoUrl != null)
                    AppNetworkImage(
                      url: offer.photoUrl!,
                      width: double.infinity,
                      height: 240,
                      fit: BoxFit.cover,
                    ),
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Chips de categoría
                        if (offer.categories.isNotEmpty)
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: offer.categories.map((cat) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.amber.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(cat.name,
                                  style: const TextStyle(
                                      color: AppColors.amber,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600)),
                            )).toList(),
                          ),
                        const SizedBox(height: 12),

                        // Título + tiempo restante
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(offer.title,
                                  style: TextStyle(
                                      color: c.textPrimary,
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold)),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: c.bgInput,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(offer.timeLeftLabel,
                                  style: TextStyle(color: c.textMuted, fontSize: 12)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        // Precio
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.amber.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.local_offer_rounded, color: AppColors.amber, size: 18),
                              const SizedBox(width: 6),
                              Text(offer.priceLabel,
                                  style: const TextStyle(
                                      color: AppColors.amber,
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Descripción
                        Text('Detalles',
                            style: TextStyle(
                                color: c.textSecondary,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.0)),
                        const SizedBox(height: 6),
                        Text(offer.description,
                            style: TextStyle(
                                color: c.textPrimary,
                                fontSize: 14,
                                height: 1.5)),
                        const SizedBox(height: 22),

                        // Proveedor — separador visual
                        Container(height: 1, color: c.border),
                        const SizedBox(height: 16),

                        Row(
                          children: [
                            Container(
                              width: 44, height: 44,
                              decoration: BoxDecoration(
                                color: c.bgInput,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              clipBehavior: Clip.hardEdge,
                              child: p.coverUrl != null
                                  ? AppNetworkImage(url: p.coverUrl!, fit: BoxFit.cover)
                                  : Icon(Icons.storefront_rounded, color: c.textMuted),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Flexible(
                                        child: Text(p.businessName,
                                            style: TextStyle(
                                                color: c.textPrimary,
                                                fontSize: 14,
                                                fontWeight: FontWeight.w700),
                                            overflow: TextOverflow.ellipsis),
                                      ),
                                      if (p.isVerified) ...[
                                        const SizedBox(width: 4),
                                        const Icon(Icons.verified_rounded,
                                            color: AppColors.amber, size: 14),
                                      ],
                                    ],
                                  ),
                                  Row(
                                    children: [
                                      const Icon(Icons.star_rounded,
                                          color: AppColors.star, size: 13),
                                      const SizedBox(width: 2),
                                      Text(p.averageRating.toStringAsFixed(1),
                                          style: TextStyle(color: c.textMuted, fontSize: 11)),
                                      if (p.localityName != null) ...[
                                        const SizedBox(width: 8),
                                        Icon(Icons.place_outlined,
                                            color: c.textMuted, size: 12),
                                        const SizedBox(width: 2),
                                        Flexible(
                                          child: Text(p.localityName!,
                                              style: TextStyle(color: c.textMuted, fontSize: 11),
                                              overflow: TextOverflow.ellipsis),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Si la oferta es del propio user, mostramos
                        // opciones de gestión en vez del CTA público.
                        if (isOwn) ...[
                          _OwnOfferActions(
                            offer: offer,
                            ownProfileType: ownProfileType,
                          ),
                        ] else ...[
                          // CTA — Ver perfil profesional / Ver negocio
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: () => _openProviderCard(context),
                              icon: Icon(
                                p.isBusiness
                                    ? Icons.storefront_rounded
                                    : Icons.person_rounded,
                                size: 18,
                              ),
                              label: Text(
                                p.isBusiness
                                    ? 'Ver negocio'
                                    : 'Ver perfil profesional',
                                style: const TextStyle(
                                    fontSize: 14, fontWeight: FontWeight.bold),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14)),
                                elevation: 0,
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),

                          // Botones de contacto rápido (mantienen utilidad)
                          Row(
                            children: [
                              if (p.whatsapp != null)
                                Expanded(
                                  child: _ContactBtn(
                                    icon: Icons.chat_rounded,
                                    label: 'WhatsApp',
                                    color: const Color(0xFF25D366),
                                    onTap: () => launchUrl(Uri.parse(
                                        'https://wa.me/${p.whatsapp!.replaceAll(RegExp(r'[^\d]'), '')}?text=Hola, vi tu oferta "${offer.title}" en OficioApp')),
                                  ),
                                ),
                              if (p.whatsapp != null && p.phone != null)
                                const SizedBox(width: 8),
                              if (p.phone != null)
                                Expanded(
                                  child: _ContactBtn(
                                    icon: Icons.phone_rounded,
                                    label: 'Llamar',
                                    color: AppColors.primary,
                                    onTap: () => launchUrl(Uri.parse('tel:${p.phone}')),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Cierra este sheet y abre el detalle completo del proveedor.
  /// Cargar el proveedor por id es necesario porque el modelo `OfferProviderInfo`
  /// solo trae un subset; `ProviderDetailSheet` necesita el ProviderModel
  /// completo (servicios, redes, horarios, etc.).
  Future<void> _openProviderCard(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);
    nav.pop(); // cierra este sheet primero

    final result = await ProvidersRepository().getProviderDetail(offer.provider.id);
    if (!context.mounted) return;

    if (result.isSuccess) {
      ProviderDetailSheet.show(context, result.data);
    } else {
      messenger.showSnackBar(
        const SnackBar(content: Text('No se pudo abrir el perfil del proveedor')),
      );
    }
  }
}

/// Acciones que el provider ve cuando entra al detalle de su propia
/// oferta — reemplaza el CTA público de "Ver negocio/perfil" por
/// gestión: ir al panel, editar (redirige al panel→servicios donde
/// está el botón de editar), ocultar de mi vista pública.
class _OwnOfferActions extends StatelessWidget {
  final PublicOfferModel offer;
  final String ownProfileType;
  const _OwnOfferActions({required this.offer, required this.ownProfileType});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final offersProv = context.watch<PublicOffersProvider>();
    final isHidden = offersProv.hiddenOwnOfferIds.contains(offer.id);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
          ),
          child: Row(
            children: [
              Icon(Icons.info_outline_rounded, size: 14, color: c.textSecondary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Esta es tu oferta. Gestiónala desde aquí.',
                  style: TextStyle(color: c.textSecondary, fontSize: 12),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        // ── Ir a mi panel ──
        ElevatedButton.icon(
          onPressed: () {
            Navigator.of(context).pop();
            Navigator.of(context, rootNavigator: true).push(
              MaterialPageRoute(
                builder: (_) => ProviderPanel(providerType: ownProfileType),
              ),
            );
          },
          icon: const Icon(Icons.dashboard_rounded, size: 18),
          label: const Text('Ir a mi panel',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14)),
            elevation: 0,
          ),
        ),
        const SizedBox(height: 8),
        // ── Editar oferta → Panel en el tab Servicios/Productos (3) ──
        OutlinedButton.icon(
          onPressed: () {
            Navigator.of(context).pop();
            Navigator.of(context, rootNavigator: true).push(
              MaterialPageRoute(
                builder: (_) => ProviderPanel(
                  providerType: ownProfileType,
                  initialTabIndex: 3,
                ),
              ),
            );
          },
          icon: const Icon(Icons.edit_rounded, size: 18, color: AppColors.amber),
          label: Text('Editar oferta',
              style: TextStyle(
                  color: c.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
          style: OutlinedButton.styleFrom(
            side: BorderSide(color: c.border),
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14)),
          ),
        ),
        const SizedBox(height: 8),
        // ── Eliminar oferta ──
        OutlinedButton.icon(
          onPressed: () => _confirmDelete(context, offersProv),
          icon: const Icon(Icons.delete_outline_rounded, size: 18, color: AppColors.busy),
          label: const Text('Eliminar oferta',
              style: TextStyle(
                  color: AppColors.busy, fontSize: 13, fontWeight: FontWeight.w600)),
          style: OutlinedButton.styleFrom(
            side: BorderSide(color: AppColors.busy.withValues(alpha: 0.4)),
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14)),
          ),
        ),
        const SizedBox(height: 8),
        // ── Ocultar/mostrar mi oferta del listado público ──
        OutlinedButton.icon(
          onPressed: () {
            if (isHidden) {
              offersProv.unhideOwnOffer(offer.id);
            } else {
              offersProv.hideOwnOffer(offer.id);
            }
          },
          icon: Icon(
            isHidden ? Icons.visibility_rounded : Icons.visibility_off_rounded,
            size: 18,
            color: c.textSecondary,
          ),
          label: Text(
            isHidden
                ? 'Ver mi oferta en la sección Ofertas'
                : 'Ocultar mi oferta para mí',
            style: TextStyle(
                color: c.textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
          ),
          style: OutlinedButton.styleFrom(
            side: BorderSide(color: c.border),
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14)),
          ),
        ),
      ],
    );
  }

  /// Confirma y elimina la oferta vía DELETE /providers/me/offers/:id.
  /// Al borrarla la quitamos del listado en memoria y cerramos el sheet.
  Future<void> _confirmDelete(
      BuildContext context, PublicOffersProvider offersProv) async {
    final c = context.colors;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.bgCard,
        title: const Text('Eliminar oferta'),
        content: const Text(
            '¿Seguro que quieres eliminar esta oferta? No se puede deshacer.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.busy),
            child: const Text('Eliminar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);
    try {
      await OfferPostsRepository().deleteOffer(offer.id);
      offersProv.removeOffer(offer.id);
      if (nav.canPop()) nav.pop();
      messenger.showSnackBar(
          const SnackBar(content: Text('Oferta eliminada')));
    } catch (e) {
      messenger.showSnackBar(
          const SnackBar(content: Text('No se pudo eliminar la oferta')));
    }
  }
}

class _ContactBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _ContactBtn({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Text(label,
                style: TextStyle(
                    color: color, fontSize: 13, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
