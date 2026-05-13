import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../shared/widgets/app_network_image.dart';
import '../../domain/models/public_offer_model.dart';
import '../providers/offers_provider.dart';

class OffersScreen extends StatefulWidget {
  const OffersScreen({super.key});

  @override
  State<OffersScreen> createState() => _OffersScreenState();
}

class _OffersScreenState extends State<OffersScreen> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      context.read<PublicOffersProvider>().load(
        department: auth.user?.department,
        province:   auth.user?.province,
        district:   auth.user?.district,
      );
    });
    _scroll.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 200) {
      context.read<PublicOffersProvider>().loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final c = context.colors;
    final prov = context.watch<PublicOffersProvider>();

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: CustomScrollView(
          controller: _scroll,
          slivers: [
            // ── App Bar ─────────────────────────────────────
            SliverAppBar(
              backgroundColor: c.bgCard,
              pinned: true,
              title: Row(
                children: [
                  const Icon(Icons.local_offer_rounded, color: AppColors.amber, size: 20),
                  const SizedBox(width: 8),
                  Text('Ofertas 💸', style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 18)),
                ],
              ),
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(50),
                child: _CategoryFilterBar(
                  selected: prov.categorySlug,
                  onSelect: (slug) => prov.setCategory(slug),
                ),
              ),
            ),

            // ── Header info ──────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Text(
                  'Promociones y precios especiales de proveedores cercanos',
                  style: TextStyle(color: c.textMuted, fontSize: 12),
                ),
              ),
            ),

            // ── Lista de ofertas ─────────────────────────────
            if (prov.isLoading && prov.offers.isEmpty)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator(color: AppColors.amber)),
              )
            else if (prov.offers.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.local_offer_outlined, size: 64, color: c.textMuted),
                      const SizedBox(height: 16),
                      Text('Sin ofertas disponibles', style: TextStyle(color: c.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Text('Vuelve más tarde para ver promociones.', style: TextStyle(color: c.textMuted, fontSize: 13)),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) {
                      if (i == prov.offers.length) {
                        return prov.hasMore
                            ? const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator(color: AppColors.amber, strokeWidth: 2)))
                            : const SizedBox(height: 16);
                      }
                      return _OfferCard(offer: prov.offers[i]);
                    },
                    childCount: prov.offers.length + 1,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Filtro de categorías ───────────────────────────────────────

class _CategoryFilterBar extends StatelessWidget {
  final String? selected;
  final void Function(String?) onSelect;

  const _CategoryFilterBar({required this.selected, required this.onSelect});

  static const _cats = [
    (slug: null,              label: 'Todas'),
    (slug: 'electricistas',   label: 'Eléctrico'),
    (slug: 'gasfiteria',      label: 'Gasfitería'),
    (slug: 'peluquerias',     label: 'Peluquería'),
    (slug: 'restaurantes',    label: 'Restaurantes'),
    (slug: 'carpinteria',     label: 'Carpintería'),
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SizedBox(
      height: 44,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        itemCount: _cats.length,
        itemBuilder: (_, i) {
          final cat      = _cats[i];
          final isActive = selected == cat.slug;
          return GestureDetector(
            onTap: () => onSelect(cat.slug),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: BoxDecoration(
                color: isActive ? AppColors.amber : c.bgInput,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: isActive ? AppColors.amber : Colors.white.withValues(alpha: 0.08)),
              ),
              child: Text(
                cat.label,
                style: TextStyle(
                  color: isActive ? Colors.black : c.textSecondary,
                  fontSize: 12,
                  fontWeight: isActive ? FontWeight.w700 : FontWeight.normal,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Tarjeta de oferta ─────────────────────────────────────────

class _OfferCard extends StatelessWidget {
  final PublicOfferModel offer;
  const _OfferCard({required this.offer});

  @override
  Widget build(BuildContext context) {
    final c   = context.colors;
    final prov = offer.provider;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Foto (si existe) ─────────────────────────────
          if (offer.photoUrl != null)
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: AppNetworkImage(
                url: offer.photoUrl!,
                width: double.infinity,
                height: 160,
                fit: BoxFit.cover,
              ),
            ),

          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Chips de categoría ─────────────────────
                if (offer.categories.isNotEmpty)
                  Wrap(
                    spacing: 6,
                    children: offer.categories.map((cat) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.amber.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                      child: Text(cat.name, style: const TextStyle(color: AppColors.amber, fontSize: 10, fontWeight: FontWeight.w600)),
                    )).toList(),
                  ),
                const SizedBox(height: 8),

                // ── Título + expiración ────────────────────
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(offer.title, style: TextStyle(color: c.textPrimary, fontSize: 15, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(color: c.bgInput, borderRadius: BorderRadius.circular(6)),
                      child: Text(offer.timeLeftLabel, style: TextStyle(color: c.textMuted, fontSize: 10)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),

                Text(offer.description, style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.4), maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 10),

                // ── Precio + proveedor ─────────────────────
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: AppColors.amber.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                      child: Text(offer.priceLabel, style: const TextStyle(color: AppColors.amber, fontSize: 13, fontWeight: FontWeight.w700)),
                    ),
                    const SizedBox(width: 8),
                    if (prov.isVerified)
                      const Icon(Icons.verified_rounded, color: AppColors.amber, size: 14),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(prov.businessName, style: TextStyle(color: c.textSecondary, fontSize: 12), overflow: TextOverflow.ellipsis),
                    ),
                    if (prov.localityName != null)
                      Text(prov.localityName!, style: TextStyle(color: c.textMuted, fontSize: 11)),
                  ],
                ),
                const SizedBox(height: 12),

                // ── Botones de contacto ────────────────────
                Row(
                  children: [
                    if (prov.whatsapp != null)
                      Expanded(
                        child: _ContactButton(
                          icon: Icons.chat_rounded,
                          label: 'WhatsApp',
                          color: const Color(0xFF25D366),
                          onTap: () => launchUrl(Uri.parse('https://wa.me/${prov.whatsapp!.replaceAll(RegExp(r'[^\d]'), '')}?text=Hola, vi tu oferta "${offer.title}" en OficioApp')),
                        ),
                      ),
                    if (prov.whatsapp != null && prov.phone != null)
                      const SizedBox(width: 8),
                    if (prov.phone != null)
                      Expanded(
                        child: _ContactButton(
                          icon: Icons.phone_rounded,
                          label: 'Llamar',
                          color: AppColors.primary,
                          onTap: () => launchUrl(Uri.parse('tel:${prov.phone}')),
                        ),
                      ),
                    const SizedBox(width: 8),
                    // Botón de reporte
                    IconButton(
                      onPressed: () => _showReportSheet(context, offer.id),
                      icon: Icon(Icons.flag_outlined, size: 18, color: c.textMuted),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      splashRadius: 18,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showReportSheet(BuildContext context, int offerId) {
    final c = context.colors;
    final reasons = ['SPAM', 'PRECIO_FALSO', 'CONTENIDO_INAPROPIADO', 'OTRO'];
    final labels  = ['Spam / publicidad falsa', 'Precio engañoso', 'Contenido inapropiado', 'Otro'];

    showModalBottomSheet(
      context: context,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 14),
            Text('Reportar oferta', style: TextStyle(color: c.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...List.generate(reasons.length, (i) => ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text(labels[i], style: TextStyle(color: c.textPrimary, fontSize: 14)),
              onTap: () async {
                Navigator.pop(context);
                await context.read<PublicOffersProvider>().reportOffer(offerId, reasons[i]);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Reporte enviado. Gracias.'), behavior: SnackBarBehavior.floating),
                  );
                }
              },
            )),
          ],
        ),
      ),
    );
  }
}

class _ContactButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ContactButton({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withValues(alpha: 0.3))),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 15, color: color),
            const SizedBox(width: 5),
            Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
