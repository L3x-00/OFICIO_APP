part of 'offers_screen.dart';

// Tarjetas de la pantalla de Ofertas (oferta pública, necesidad de cliente) y
// botón de contacto. Extraídas de offers_screen.dart por mantenibilidad
// (part file → comparten imports y privacidad de la librería). Cero cambios
// funcionales.

// ── Tarjeta de oferta ─────────────────────────────────────────

class _OfferCard extends StatelessWidget {
  final PublicOfferModel offer;
  const _OfferCard({required this.offer});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final prov = offer.provider;

    return GestureDetector(
      onTap: () => OfferDetailSheet.show(context, offer),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: c.border, width: 0.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (offer.photoUrl != null)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
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
                  // Badge de tipo + chips de categoría
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: prov.isBusiness
                              ? AppColors.amber.withValues(alpha: 0.15)
                              : AppColors.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              prov.isBusiness
                                  ? Icons.storefront_rounded
                                  : Icons.engineering_rounded,
                              size: 10,
                              color: prov.isBusiness
                                  ? AppColors.tintOn(AppColors.amber, c.isDark)
                                  : AppColors.tintOn(
                                      AppColors.primary,
                                      c.isDark,
                                    ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              prov.isBusiness ? 'Negocio' : 'Profesional',
                              style: TextStyle(
                                color: prov.isBusiness
                                    ? AppColors.tintOn(
                                        AppColors.amber,
                                        c.isDark,
                                      )
                                    : AppColors.tintOn(
                                        AppColors.primary,
                                        c.isDark,
                                      ),
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Wrap(
                          spacing: 4,
                          children: offer.categories
                              .take(2)
                              .map(
                                (cat) => Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 3,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.amber.withValues(
                                      alpha: 0.1,
                                    ),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    cat.name,
                                    style: TextStyle(
                                      color: AppColors.tintOn(
                                        AppColors.amber,
                                        c.isDark,
                                      ),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Título + expiración
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          offer.title,
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: c.bgInput,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          offer.timeLeftLabel,
                          style: TextStyle(color: c.textMuted, fontSize: 10),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),

                  Text(
                    offer.description,
                    style: TextStyle(
                      color: c.textSecondary,
                      fontSize: 13,
                      height: 1.4,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 10),

                  // Precio + proveedor
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.amber.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          offer.priceLabel,
                          style: TextStyle(
                            color: AppColors.tintOn(AppColors.amber, c.isDark),
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (prov.isVerified)
                        const Icon(
                          Icons.verified_rounded,
                          color: AppColors.amber,
                          size: 14,
                        ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          prov.businessName,
                          style: TextStyle(
                            color: c.textSecondary,
                            fontSize: 12,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (prov.localityName != null)
                        Text(
                          prov.localityName!,
                          style: TextStyle(color: c.textMuted, fontSize: 11),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Botones de contacto
                  Row(
                    children: [
                      if (prov.whatsapp != null)
                        Expanded(
                          child: _ContactButton(
                            svgAsset: 'assets/icons/whatsapp.svg',
                            label: 'WhatsApp',
                            color: AppColors.whatsapp,
                            onTap: () => launchUrl(
                              Uri.parse(
                                'https://wa.me/${prov.whatsapp!.replaceAll(RegExp(r'[^\d]'), '')}?text=Hola, vi tu oferta "${offer.title}" en Servi',
                              ),
                            ),
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
                            onTap: () =>
                                launchUrl(Uri.parse('tel:${prov.phone}')),
                          ),
                        ),
                      const SizedBox(width: 8),
                      Builder(
                        builder: (ctx) {
                          final isReported = ctx
                              .watch<PublicOffersProvider>()
                              .isOfferReported(offer.id);
                          return IconButton(
                            onPressed: isReported
                                ? null
                                : () => _showReportSheet(ctx, offer.id),
                            icon: Icon(
                              isReported
                                  ? Icons.flag_rounded
                                  : Icons.flag_outlined,
                              size: 18,
                              color: isReported
                                  ? c.textMuted.withValues(alpha: 0.4)
                                  : c.textMuted,
                            ),
                            tooltip: isReported
                                ? 'Ya reportaste esta oferta'
                                : 'Reportar oferta',
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            splashRadius: 18,
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showReportSheet(BuildContext context, int offerId) {
    final c = context.colors;
    final reasons = ['SPAM', 'PRECIO_FALSO', 'CONTENIDO_INAPROPIADO', 'OTRO'];
    final labels = [
      'Spam / publicidad falsa',
      'Precio engañoso',
      'Contenido inapropiado',
      'Otro',
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Reportar oferta',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ...List.generate(
              reasons.length,
              (i) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                title: Text(
                  labels[i],
                  style: TextStyle(color: c.textPrimary, fontSize: 14),
                ),
                onTap: () async {
                  Navigator.pop(context);
                  try {
                    final res = await context
                        .read<PublicOffersProvider>()
                        .reportOffer(offerId, reasons[i]);
                    if (!context.mounted) return;
                    if (res.already) {
                      // 409: ya lo había reportado → toast + botón off.
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Ya habías reportado esta oferta'),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    } else if (res.ok) {
                      await showDialog<void>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: ctx.colors.bgCard,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                          icon: const Icon(
                            Icons.verified_rounded,
                            color: AppColors.primary,
                            size: 52,
                          ),
                          title: Text(
                            'Reporte enviado',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: ctx.colors.textPrimary,
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          content: Text(
                            'Gracias por ayudar a la comunidad a hacer un '
                            'lugar mejor para todos',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: ctx.colors.textSecondary,
                              fontSize: 13,
                              height: 1.5,
                            ),
                          ),
                          actions: [
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: () => Navigator.pop(ctx),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: const Text('Entendido'),
                              ),
                            ),
                          ],
                        ),
                      );
                    }
                  } catch (_) {
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'No se pudo enviar el reporte. Intenta de nuevo.',
                        ),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Tarjeta de necesidad de cliente ───────────────────────────

class _NeedCard extends StatelessWidget {
  final OpportunityModel need;

  /// true cuando la necesidad la publicó el usuario actual → puede
  /// eliminarla.
  final bool isOwn;

  const _NeedCard({required this.need, required this.isOwn});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final left = need.timeLeft;
    final hours = left.inHours;
    final mins = left.inMinutes.remainder(60);
    final expired = left.isNegative;
    final timeLabel = expired
        ? 'Expirada'
        : (hours > 0 ? 'Expira en ${hours}h ${mins}m' : 'Expira en ${mins}m');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.amber.withValues(alpha: 0.22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Categoría + countdown
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.amber.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    need.categoryName,
                    style: TextStyle(
                      color: AppColors.tintOn(AppColors.amber, c.isDark),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const Spacer(),
                Icon(
                  Icons.timer_outlined,
                  size: 13,
                  color: expired ? AppColors.busy : c.textMuted,
                ),
                const SizedBox(width: 3),
                Text(
                  timeLabel,
                  style: TextStyle(
                    color: expired ? AppColors.busy : c.textMuted,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          // Foto + descripción
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: need.photoUrl != null
                      ? Image.network(
                          need.photoUrl!,
                          width: 64,
                          height: 64,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => _photoFallback(),
                        )
                      : _photoFallback(),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        need.description,
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          if (need.district != null)
                            _needMeta(
                              Icons.location_city_rounded,
                              need.district!,
                              c.textMuted,
                            ),
                          if (need.distanceKm != null)
                            _needMeta(
                              Icons.place_rounded,
                              'A ${need.distanceKm!.toStringAsFixed(1)} km',
                              AppColors.primary,
                            ),
                          if (need.budgetMin != null || need.budgetMax != null)
                            _needMeta(
                              Icons.payments_rounded,
                              _budget(need.budgetMin, need.budgetMax),
                              AppColors.tintOn(AppColors.available, c.isDark),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Footer: progreso de ofertas + (si es propia) eliminar
          Container(
            decoration: BoxDecoration(
              color: c.bg.withValues(alpha: 0.4),
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(15),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '${need.offersCount}/${need.maxOffers} profesionales ofertaron',
                    style: TextStyle(color: c.textMuted, fontSize: 11),
                  ),
                ),
                if (isOwn) ...[
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: () => _confirmDelete(context),
                    icon: const Icon(Icons.delete_outline_rounded, size: 15),
                    label: const Text('Eliminar necesidad'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.busy,
                      side: BorderSide(
                        color: AppColors.busy.withValues(alpha: 0.45),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      textStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _photoFallback() => Container(
    width: 64,
    height: 64,
    decoration: BoxDecoration(
      color: AppColors.amber.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(10),
    ),
    child: const Icon(Icons.handyman_rounded, color: AppColors.amber, size: 28),
  );

  Widget _needMeta(IconData icon, String label, Color color) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 12, color: color),
      const SizedBox(width: 3),
      Text(label, style: TextStyle(color: color, fontSize: 11)),
    ],
  );

  String _budget(double? min, double? max) {
    if (min != null && max != null) {
      return 'S/ ${min.toStringAsFixed(0)}–${max.toStringAsFixed(0)}';
    }
    if (min != null) return 'S/ ${min.toStringAsFixed(0)}+';
    if (max != null) return 'Hasta S/ ${max.toStringAsFixed(0)}';
    return '';
  }

  /// Flujo de eliminación con la regla de reputación: si hay
  /// profesionales que ya ofertaron, se advierte que la reputación
  /// bajará antes de confirmar.
  Future<void> _confirmDelete(BuildContext context) async {
    final c = context.colors;
    final hasOffers = need.offersCount > 0;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        icon: Icon(
          hasOffers
              ? Icons.warning_amber_rounded
              : Icons.delete_outline_rounded,
          color: AppColors.busy,
          size: 40,
        ),
        title: Text(
          hasOffers ? 'Tu reputación bajará' : 'Eliminar necesidad',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: c.textPrimary,
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          hasOffers
              ? 'Eliminar sin aceptar a un profesional hará que tu '
                    'reputación baje. ${need.offersCount} profesional(es) ya '
                    'enviaron su propuesta. ¿Eliminar de todas formas?'
              : '¿Seguro que quieres eliminar esta necesidad? '
                    'No se puede deshacer.',
          textAlign: TextAlign.center,
          style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.busy,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    final result = await context.read<SubastasProvider>().deleteRequest(
      need.id,
    );
    if (!context.mounted) return;
    if (result != null) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            result['hadOffers'] == true
                ? 'Necesidad eliminada. Se avisó a los profesionales que ofertaron.'
                : 'Necesidad eliminada.',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      messenger.showSnackBar(
        const SnackBar(
          content: Text('No se pudo eliminar la necesidad'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}

class _ContactButton extends StatelessWidget {
  final IconData? icon;
  final String? svgAsset;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ContactButton({
    this.icon,
    this.svgAsset,
    required this.label,
    required this.color,
    required this.onTap,
  }) : assert(icon != null || svgAsset != null);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            svgAsset != null
                ? SvgPicture.asset(svgAsset!, width: 15, height: 15)
                : Icon(
                    icon,
                    size: 15,
                    color: AppColors.tintOn(color, context.colors.isDark),
                  ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: AppColors.tintOn(color, context.colors.isDark),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
