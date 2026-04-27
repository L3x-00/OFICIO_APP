import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:photo_view/photo_view.dart';
import 'package:photo_view/photo_view_gallery.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../shared/widgets/phone_input_section.dart' show formatForWhatsApp;
import '../../../../core/constans/app_strings.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../core/utils/permission_service.dart';
import '../../data/reviews_repository.dart';
import '../../domain/models/provider_model.dart';
import '../../domain/models/review_model.dart';
import '../../data/providers_repository.dart';
import '../../presentation/widgets/create_review_sheet.dart';
import '../../../../shared/widgets/social_media_row.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../provider_dashboard/presentation/screens/provider_panel.dart';

/// Modal de detalle completo del proveedor
class ProviderDetailSheet extends StatefulWidget {
  final ProviderModel provider;

  const ProviderDetailSheet({super.key, required this.provider});

  static Future<void> show(BuildContext context, ProviderModel provider) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ProviderDetailSheet(provider: provider),
    );
  }

  @override
  State<ProviderDetailSheet> createState() => _ProviderDetailSheetState();
}

class _ProviderDetailSheetState extends State<ProviderDetailSheet> {
  final _reviewsRepo    = ReviewsRepository();
  final _providersRepo  = ProvidersRepository();

  int _currentImageIndex = 0;
  List<ReviewModel> _reviews = [];
  bool _reviewsLoading  = false;
  bool _reviewsError    = false;
  bool _isRecommended   = false;
  late final PageController _pageController = PageController(keepPage: true);

  bool get _isOwnCard {
    final auth = context.read<AuthProvider>();
    return auth.user != null &&
        widget.provider.userId != null &&
        widget.provider.userId == auth.user!.id;
  }

  /// Color de acento según el tipo de proveedor:
  /// NEGOCIO → morado | OFICIO → azul primary
  Color get _accent => widget.provider.type == ProviderType.negocio
      ? const Color(0xFF8E2DE2)
      : AppColors.primary;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _loadReviews();
  }

  /// Reseña del usuario actual para este proveedor (null si no ha reseñado).
  ReviewModel? get _myReview {
    final uid = context.read<AuthProvider>().user?.id ?? 0;
    if (uid == 0) return null;
    try {
      return _reviews.firstWhere((r) => r.userId == uid);
    } catch (_) {
      return null;
    }
  }

  Future<void> _loadReviews() async {
    setState(() { _reviewsLoading = true; _reviewsError = false; });
    try {
      final reviews = await _reviewsRepo.getProviderReviews(widget.provider.id);
      if (!mounted) return;
      setState(() => _reviews = reviews);

      // Cargar estado de recomendación del usuario actual
      final uid = context.read<AuthProvider>().user?.id ?? 0;
      if (uid != 0) {
        final recommended = await _providersRepo.checkRecommendation(
            widget.provider.id, uid);
        if (mounted) setState(() => _isRecommended = recommended);
      }
    } catch (_) {
      if (mounted) setState(() => _reviewsError = true);
    } finally {
      if (mounted) setState(() => _reviewsLoading = false);
    }
  }

  List<String> get _allImages {
    final images = <String>[];
    if (widget.provider.coverImageUrl != null) {
      images.add(widget.provider.coverImageUrl!);
    }
    images.addAll(widget.provider.thumbnailUrls);
    return images;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final screenHeight = MediaQuery.of(context).size.height;

    return Container(
      height: screenHeight * 0.92,
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // ── Handle ─────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 8),
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: c.textMuted.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // ── Contenido scrollable ────────────────────────────
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_allImages.isNotEmpty) _buildGallery(),

                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildHeader(),
                        const SizedBox(height: 12),
                        _buildRating(),
                        const SizedBox(height: 12),
                        _buildAvailabilityBadge(),
                        const SizedBox(height: 16),
                        _buildContactInfo(),
                        const SizedBox(height: 16),

                        if (widget.provider.description != null) ...[
                          _buildSectionTitle(
                            widget.provider.type == ProviderType.oficio
                                ? 'Sobre el profesional'
                                : 'Sobre el negocio',
                          ),
                          const SizedBox(height: 8),
                          Text(
                            widget.provider.description!,
                            style: TextStyle(
                              color: c.textSecondary,
                              fontSize: 14,
                              height: 1.6,
                            ),
                          ),
                          const SizedBox(height: 20),
                        ],

                        // ── Redes sociales ────────────────────
                        if (SocialMediaRow(
                          website:     widget.provider.website,
                          instagram:   widget.provider.instagram,
                          tiktok:      widget.provider.tiktok,
                          facebook:    widget.provider.facebook,
                          linkedin:    widget.provider.linkedin,
                          twitterX:    widget.provider.twitterX,
                          telegram:    widget.provider.telegram,
                          whatsappBiz: widget.provider.whatsappBiz,
                        ).hasAny) ...[
                          _buildSectionTitle('Redes sociales'),
                          const SizedBox(height: 10),
                          SocialMediaRow(
                            website:     widget.provider.website,
                            instagram:   widget.provider.instagram,
                            tiktok:      widget.provider.tiktok,
                            facebook:    widget.provider.facebook,
                            linkedin:    widget.provider.linkedin,
                            twitterX:    widget.provider.twitterX,
                            telegram:    widget.provider.telegram,
                            whatsappBiz: widget.provider.whatsappBiz,
                          ),
                          const SizedBox(height: 20),
                        ],

                        // ── Horarios (solo NEGOCIO) ───────────
                        if (widget.provider.type == ProviderType.negocio &&
                            widget.provider.scheduleJson != null &&
                            _hasScheduleData(widget.provider.scheduleJson!)) ...[
                          _buildSectionTitle('Horarios'),
                          const SizedBox(height: 8),
                          _buildSchedule(),
                          const SizedBox(height: 20),
                        ],

                        // ── Productos (NEGOCIO) / Servicios (OFICIO) ─
                        ..._buildServicesSection(),

                        // ── Ubicación (solo NEGOCIO — profesionales no exponen dirección) ──
                        if (widget.provider.type == ProviderType.negocio &&
                            (widget.provider.address != null ||
                            (widget.provider.latitude != null &&
                             widget.provider.longitude != null))) ...[
                          _buildSectionTitle('Ubicación'),
                          const SizedBox(height: 8),
                          if (widget.provider.address != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(Icons.location_on_rounded,
                                      color: _accent, size: 16),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      widget.provider.address!,
                                      style: TextStyle(
                                        color: c.textSecondary,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  GestureDetector(
                                    onTap: _openMaps,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 5),
                                      decoration: BoxDecoration(
                                        color: _accent.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.directions_rounded,
                                              color: _accent, size: 14),
                                          const SizedBox(width: 4),
                                          Text(
                                            'Cómo llegar',
                                            style: TextStyle(
                                              color: _accent,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          if (widget.provider.latitude != null &&
                              widget.provider.longitude != null)
                            _buildMap(),
                          const SizedBox(height: 20),
                        ],

                        // ── Reseñas ───────────────────────────
                        _buildReviewsSection(),

                        // ── Reportar (solo clientes, no el propio proveedor) ──
                        if (!_isOwnCard) _buildReportButton(),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Botones de contacto fijos ──────────────────────
          _buildContactButtons(),
        ],
      ),
    );
  }

  // ─── Galería de imágenes ─────────────────────────────────

  Widget _buildGallery() {
    final c = context.colors;
    return SizedBox(
      height: 240,
      child: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            itemCount: _allImages.length,
            onPageChanged: (i) => setState(() => _currentImageIndex = i),
            itemBuilder: (context, index) => RepaintBoundary(
              child: GestureDetector(
                onTap: () => _openFullscreenGallery(index),
                child: Image.network(
                  _allImages[index],
                  fit: BoxFit.cover,
                  width: double.infinity,
                  errorBuilder: (_, _, _) => Container(
                    color: c.bgInput,
                    child: Icon(
                      Icons.image_not_supported,
                      color: c.textMuted,
                      size: 48,
                    ),
                  ),
                  loadingBuilder: (_, child, progress) => progress == null
                      ? child
                      : Container(
                          color: c.bgInput,
                          child: const Center(
                            child: CircularProgressIndicator(
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                ),
              ),
            ),
          ),

          if (_allImages.length > 1)
            Positioned(
              bottom: 12,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  _allImages.length,
                  (i) => AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: i == _currentImageIndex ? 20 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: i == _currentImageIndex
                          ? _accent
                          : Colors.white.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
              ),
            ),

          Positioned(
            top: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${_currentImageIndex + 1}/${_allImages.length}',
                style: TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _openFullscreenGallery(int initialIndex) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            iconTheme: const IconThemeData(color: Colors.white),
          ),
          body: PhotoViewGallery.builder(
            itemCount: _allImages.length,
            pageController: PageController(initialPage: initialIndex),
            builder: (context, index) => PhotoViewGalleryPageOptions(
              imageProvider: NetworkImage(_allImages[index]),
              minScale: PhotoViewComputedScale.contained,
              maxScale: PhotoViewComputedScale.covered * 2,
            ),
          ),
        ),
      ),
    );
  }

  // ─── Header ──────────────────────────────────────────────

  Widget _buildHeader() {
    final c = context.colors;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.provider.businessName,
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                widget.provider.categoryName,
                style: TextStyle(
                  color: _accent,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        if (widget.provider.isVerified &&
            (widget.provider.subscriptionPlan == 'PREMIUM' ||
             widget.provider.subscriptionPlan == 'ESTANDAR' ||
             widget.provider.subscriptionPlan == 'BASICO'))
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.verified.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.verified.withValues(alpha: 0.4)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.verified_rounded, color: AppColors.verified, size: 14),
                SizedBox(width: 4),
                Text(
                  'Verificado',
                  style: TextStyle(color: AppColors.verified, fontSize: 11),
                ),
              ],
            ),
          ),
        // Badge "Confiable" — validación de documentos aprobada
        if (widget.provider.isTrusted)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.13),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.shield_rounded, color: Color(0xFF10B981), size: 14),
                SizedBox(width: 4),
                Text('Confiable', style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        // Badge "Va a domicilio" — solo OFICIO
        if (widget.provider.type == ProviderType.oficio &&
            widget.provider.hasHomeService)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.available.withValues(alpha: 0.13),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.available.withValues(alpha: 0.4)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.home_repair_service_rounded, color: AppColors.available, size: 14),
                SizedBox(width: 4),
                Text(
                  'Va a domicilio',
                  style: TextStyle(color: AppColors.available, fontSize: 11),
                ),
              ],
            ),
          ),
      ],
    );
  }

  // ─── Rating ──────────────────────────────────────────────

  Widget _buildRating() {
    final c = context.colors;
    final p = widget.provider;
    return Wrap(
      spacing: 12,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            RatingBarIndicator(
              rating: p.averageRating,
              itemBuilder: (_, _) =>
                  const Icon(Icons.star_rounded, color: AppColors.star),
              itemCount: 5,
              itemSize: 20,
            ),
            const SizedBox(width: 8),
            Text(
              '${p.averageRating.toStringAsFixed(1)} · ${p.totalReviews} reseñas',
              style: TextStyle(color: c.textSecondary, fontSize: 13),
            ),
          ],
        ),
        if (p.totalRecommendations > 0)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.thumb_up_rounded, size: 14, color: c.textMuted),
              const SizedBox(width: 5),
              Text(
                'Recomendado por ${p.totalRecommendations} ${p.totalRecommendations == 1 ? 'persona' : 'personas'}',
                style: TextStyle(color: c.textMuted, fontSize: 12),
              ),
            ],
          ),
      ],
    );
  }

  // ─── Disponibilidad ───────────────────────────────────────

  Widget _buildAvailabilityBadge() {
    final Color color = switch (widget.provider.availability) {
      AvailabilityStatus.disponible => AppColors.available,
      AvailabilityStatus.ocupado    => AppColors.busy,
      AvailabilityStatus.conDemora  => AppColors.delayed,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            widget.provider.availability.label,
            style: TextStyle(
              color: color,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  // ─── Información de contacto / identidad ─────────────────

  Widget _buildContactInfo() {
    final c = context.colors;
    final p = widget.provider;
    final isOficio = p.type == ProviderType.oficio;

    final rows = <Widget>[];

    // Para OFICIO: nombre real del profesional con avatar
    if (isOficio && p.ownerName != null) {
      rows.add(_InfoChip(
        leading: _ownerAvatar(p),
        icon: null,
        label: p.ownerName!,
        sublabel: 'Profesional independiente',
      ));
    }

    // Teléfono de contacto
    rows.add(_InfoChip(
      icon: Icons.phone_outlined,
      label: p.phone,
      sublabel: 'Teléfono',
      onTap: _makeCall,
    ));

    // Dirección (negocios o quienes la tengan)
    if (p.address != null && p.address!.isNotEmpty) {
      rows.add(_InfoChip(
        icon: Icons.location_on_outlined,
        label: p.address!,
        sublabel: 'Dirección',
      ));
    }

    if (rows.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        children: rows
            .expand((w) => [w, const Divider(height: 1, thickness: 0.5)])
            .toList()
          ..removeLast(),
      ),
    );
  }

  Widget _ownerAvatar(ProviderModel p) {
    if (p.ownerAvatarUrl != null) {
      return ClipOval(
        child: Image.network(
          p.ownerAvatarUrl!,
          width: 36,
          height: 36,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => _avatarPlaceholder(p),
        ),
      );
    }
    return _avatarPlaceholder(p);
  }

  Widget _avatarPlaceholder(ProviderModel p) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: _accent,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          (p.ownerName ?? p.businessName).isNotEmpty
              ? (p.ownerName ?? p.businessName)[0].toUpperCase()
              : '?',
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ),
    );
  }

  // ─── Helpers ──────────────────────────────────────────────

  /// true si el scheduleJson tiene al menos un día con horario definido
  bool _hasScheduleData(Map<String, dynamic> schedule) {
    const dayKeys = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
    return dayKeys.any((d) => schedule[d] != null);
  }

  /// Abre Google Maps / Maps con la dirección o coordenadas
  Future<void> _openMaps() async {
    final p = widget.provider;
    Uri uri;
    if (p.latitude != null && p.longitude != null) {
      uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}');
    } else if (p.address != null) {
      final q = Uri.encodeComponent(p.address!);
      uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$q');
    } else {
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  /// Sección de productos (NEGOCIO) o servicios (OFICIO).
  /// Lee la lista "services" del scheduleJson.
  List<Widget> _buildServicesSection() {
    final schedule = widget.provider.scheduleJson;
    final rawServices = schedule?['services'];
    if (rawServices is! List || rawServices.isEmpty) return [];

    final isNegocio = widget.provider.type == ProviderType.negocio;
    final c = context.colors;

    return [
      _buildSectionTitle(isNegocio ? 'Productos' : 'Servicios'),
      const SizedBox(height: 10),
      ...rawServices.map((raw) {
        if (raw is! Map<String, dynamic>) return const SizedBox.shrink();
        final name  = raw['name']  as String? ?? '';
        final desc  = raw['description'] as String?;
        final price = (raw['price'] as num?)?.toDouble();
        final unit  = raw['unit']  as String?;
        final phone = raw['phone'] as String?;

        String priceLabel = 'Consultar precio';
        if (price != null) {
          final formatted = price % 1 == 0
              ? 'S/ ${price.toInt()}'
              : 'S/ ${price.toStringAsFixed(2)}';
          priceLabel = unit != null ? '$formatted $unit' : formatted;
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: c.border),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: _accent.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                    isNegocio ? Icons.inventory_2_rounded : Icons.build_circle_outlined,
                    color: _accent, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        )),
                    if (desc != null && desc.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(desc,
                          style: TextStyle(
                            color: c.textMuted,
                            fontSize: 12,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis),
                    ],
                    if (phone != null && phone.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Icon(Icons.phone_outlined,
                              color: c.textMuted, size: 12),
                          const SizedBox(width: 4),
                          Text(phone,
                              style: TextStyle(
                                color: c.textMuted,
                                fontSize: 11,
                              )),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: _accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  priceLabel,
                  style: TextStyle(
                    color: _accent,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        );
      }),
      const SizedBox(height: 12),
    ];
  }

  // ─── Horarios ─────────────────────────────────────────────

  Widget _buildSchedule() {
    final c = context.colors;
    final schedule = widget.provider.scheduleJson;
    if (schedule == null) return const SizedBox.shrink();

    final days = {
      'lun': 'Lunes',
      'mar': 'Martes',
      'mie': 'Miércoles',
      'jue': 'Jueves',
      'vie': 'Viernes',
      'sab': 'Sábado',
      'dom': 'Domingo',
    };

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: days.entries.map((entry) {
          final hours = schedule[entry.key] as String?;
          if (hours == null) return const SizedBox.shrink();
          final isClosed = hours == 'Cerrado';
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                SizedBox(
                  width: 88,
                  child: Text(
                    entry.value,
                    style: TextStyle(
                      color: c.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                ),
                Text(
                  hours,
                  style: TextStyle(
                    color: isClosed ? AppColors.busy : c.textPrimary,
                    fontSize: 13,
                    fontWeight: isClosed ? FontWeight.normal : FontWeight.w500,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  // ─── Mapa ─────────────────────────────────────────────────

  Widget _buildMap() {
    final lat = widget.provider.latitude!;
    final lng = widget.provider.longitude!;
    final position = LatLng(lat, lng);

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 200,
        child: FlutterMap(
          options: MapOptions(initialCenter: position, initialZoom: 15),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.oficioapp.mobile',
            ),
            MarkerLayer(
              markers: [
                Marker(
                  point: position,
                  width: 48,
                  height: 48,
                  child: Container(
                    decoration: BoxDecoration(
                      color: _accent,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: _accent.withValues(alpha: 0.4),
                          blurRadius: 12,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: Icon(
                      widget.provider.type == ProviderType.negocio
                          ? Icons.storefront_rounded
                          : Icons.handyman_rounded,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ─── Sección de reseñas ───────────────────────────────────

  Widget _buildReviewsSection() {
    if (_reviewsLoading) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionTitle('Reseñas'),
          const SizedBox(height: 12),
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: CircularProgressIndicator(
                color: AppColors.primary,
                strokeWidth: 2,
              ),
            ),
          ),
        ],
      );
    }

    if (_reviewsError) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionTitle('Reseñas'),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: _loadReviews,
            child: Text(
              'No se pudieron cargar las reseñas. Toca para reintentar.',
              style: TextStyle(color: context.colors.textMuted, fontSize: 13),
            ),
          ),
          const SizedBox(height: 16),
        ],
      );
    }

    if (_reviews.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Reseñas (${_reviews.length})'),
        const SizedBox(height: 12),
        ..._reviews.take(5).map((r) => _ReviewCard(
              review: r,
              providerUserId: widget.provider.userId ?? 0,
            )),
        const SizedBox(height: 8),
      ],
    );
  }

  // ─── Título de sección ────────────────────────────────────

  Widget _buildSectionTitle(String title) {
    final c = context.colors;
    return Text(
      title,
      style: TextStyle(
        color: c.textPrimary,
        fontSize: 16,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  // ─── Botones de contacto fijos ────────────────────────────

  Widget _buildContactButtons() {
    final c = context.colors;
    final ownCard = _isOwnCard;

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
          if (ownCard)
            GestureDetector(
              onTap: () {
                Navigator.of(context).pop();
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => ProviderPanel(
                      providerType: widget.provider.type == ProviderType.negocio
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
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: _BigContactButton(
                    label: 'WhatsApp',
                    icon: Icons.chat_rounded,
                    color: AppColors.whatsapp,
                    onTap: _openWhatsApp,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _BigContactButton(
                    label: 'Llamar',
                    icon: Icons.call_rounded,
                    color: AppColors.call,
                    onTap: _makeCall,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  final auth   = context.read<AuthProvider>();
                  final userId = auth.user?.id ?? 0;
                  final myReview = _myReview;

                  if (myReview != null) {
                    // ── EDITAR reseña existente ──────────────
                    final updated = await CreateReviewSheet.show(
                      context,
                      providerId:           widget.provider.id,
                      providerName:         widget.provider.businessName,
                      userId:               userId,
                      existingReview:       myReview,
                      initiallyRecommended: _isRecommended,
                    );
                    if (updated == true && mounted) {
                      await _loadReviews(); // recarga reseñas + estado recomendación
                    }
                  } else {
                    // ── CREAR nueva reseña ───────────────────
                    final created = await CreateReviewSheet.show(
                      context,
                      providerId:   widget.provider.id,
                      providerName: widget.provider.businessName,
                      userId:       userId,
                    );
                    if (created == true && mounted) {
                      await _loadReviews();
                      if (!mounted) return;
                      // Modal de recomendación solo en la primera reseña
                      await _RecommendModal.show(
                        context,
                        providerId: widget.provider.id,
                        userId:     userId,
                        repo:       _providersRepo,
                      );
                    }
                  }
                },
                icon: Icon(
                  _myReview != null ? Icons.edit_rounded : Icons.star_rounded,
                  size: 18,
                ),
                label: Text(_myReview != null ? 'Editar mi reseña' : 'Dejar una reseña'),
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

  // ─── Botón reportar ──────────────────────────────────────

  Widget _buildReportButton() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: OutlinedButton.icon(
        onPressed: () {
          final userId = context.read<AuthProvider>().user?.id ?? 0;
          if (userId == 0) return;
          _ReportSheet.show(
            context,
            providerId:    widget.provider.id,
            providerName:  widget.provider.businessName,
            userId:        userId,
            repo:          _providersRepo,
          );
        },
        icon: const Icon(Icons.flag_rounded, size: 16, color: Color(0xFFEF4444)),
        label: const Text(
          'Reportar este servicio',
          style: TextStyle(color: Color(0xFFEF4444), fontSize: 13, fontWeight: FontWeight.w500),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Color(0xFFEF4444), width: 1.2),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
    );
  }

  Future<void> _openWhatsApp() async {
    final raw    = widget.provider.whatsapp ?? widget.provider.phone;
    final number = formatForWhatsApp(raw).replaceAll(RegExp(r'[\s\-\(\)]'), '');
    final message = Uri.encodeComponent(
      AppStrings.whatsappMessage(widget.provider.businessName),
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
    final uri = Uri.parse('tel:${widget.provider.phone}');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }
}

// ─── Modal de recomendación post-reseña ──────────────────

class _RecommendModal {
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

// ─── Tarjeta de reseña ────────────────────────────────────

class _ReviewCard extends StatelessWidget {
  final ReviewModel review;
  final int providerUserId;
  const _ReviewCard({required this.review, required this.providerUserId});

  void _openDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ReviewDetailSheet(
        review: review,
        providerUserId: providerUserId,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: () => _openDetail(context),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: c.border.withValues(alpha: 0.5)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: c.bgInput,
                  backgroundImage: review.user?.avatarUrl != null
                      ? NetworkImage(review.user!.avatarUrl!)
                      : null,
                  child: review.user?.avatarUrl == null
                      ? Text(
                          review.user?.initial ?? '?',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        review.user?.fullName ?? 'Usuario',
                        style: TextStyle(
                          color: c.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      RatingBarIndicator(
                        rating: review.rating.toDouble(),
                        itemBuilder: (_, _) =>
                            const Icon(Icons.star_rounded, color: AppColors.star),
                        itemCount: 5,
                        itemSize: 14,
                      ),
                    ],
                  ),
                ),
                Text(
                  _formatDate(review.createdAt),
                  style: TextStyle(color: c.textMuted, fontSize: 11),
                ),
                const SizedBox(width: 6),
                Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 16),
              ],
            ),
            if (review.comment != null && review.comment!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  review.comment!,
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 13,
                    height: 1.5,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            if (review.photoUrl.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        review.photoUrl,
                        height: 60,
                        width: 60,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => const SizedBox.shrink(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Ver foto',
                      style: TextStyle(color: AppColors.primary, fontSize: 12),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inDays == 0) return 'Hoy';
    if (diff.inDays == 1) return 'Ayer';
    if (diff.inDays < 7) return 'Hace ${diff.inDays} días';
    if (diff.inDays < 30) return 'Hace ${(diff.inDays / 7).floor()} sem.';
    if (diff.inDays < 365) return 'Hace ${(diff.inDays / 30).floor()} mes.';
    return 'Hace ${(diff.inDays / 365).floor()} año(s)';
  }
}

// ─── Modal de detalle de reseña (con hilo de respuestas) ─

class _ReviewDetailSheet extends StatefulWidget {
  final ReviewModel review;
  final int providerUserId;
  const _ReviewDetailSheet({required this.review, required this.providerUserId});

  @override
  State<_ReviewDetailSheet> createState() => _ReviewDetailSheetState();
}

class _ReviewDetailSheetState extends State<_ReviewDetailSheet> {
  final _reviewsRepo     = ReviewsRepository();
  final _replyController = TextEditingController();
  final _scrollController = ScrollController();

  List<ReviewReplyModel> _replies = [];
  bool _repliesLoading = false;
  bool _sending        = false;
  File? _replyPhoto;

  int get _currentUserId =>
      context.read<AuthProvider>().user?.id ?? 0;

  bool get _canReply =>
      _currentUserId == widget.review.userId ||
      _currentUserId == widget.providerUserId;

  bool get _isMine => _currentUserId == widget.review.userId;

  @override
  void initState() {
    super.initState();
    _loadReplies();
  }

  @override
  void dispose() {
    _replyController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadReplies() async {
    setState(() => _repliesLoading = true);
    try {
      final replies = await _reviewsRepo.getReplies(widget.review.id);
      if (mounted) setState(() => _replies = replies);
    } catch (_) {
      // silencioso — thread vacío
    } finally {
      if (mounted) setState(() => _repliesLoading = false);
    }
  }

  Future<void> _pickReplyPhoto() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded),
              title: const Text('Cámara'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded),
              title: const Text('Galería'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;
    if (!context.mounted) return;

    // ignore: use_build_context_synchronously
    final ok = source == ImageSource.camera
        // ignore: use_build_context_synchronously
        ? await PermissionService.requestCamera(context)
        // ignore: use_build_context_synchronously
        : await PermissionService.requestGallery(context);
    if (!ok || !context.mounted) return;

    final picked = await ImagePicker().pickImage(source: source, imageQuality: 75);
    if (picked != null && mounted) setState(() => _replyPhoto = File(picked.path));
  }

  Future<void> _sendReply() async {
    final text = _replyController.text.trim();
    if (text.isEmpty && _replyPhoto == null) return;
    if (_currentUserId == 0) return;

    setState(() => _sending = true);
    try {
      String? photoUrl;
      if (_replyPhoto != null) {
        photoUrl = await _reviewsRepo.uploadPhoto(_replyPhoto!);
      }
      final reply = await _reviewsRepo.createReply(
        reviewId: widget.review.id,
        userId:   _currentUserId,
        content:  text.isNotEmpty ? text : '📷',
        photoUrl: photoUrl,
      );
      if (mounted) {
        setState(() {
          _replies.add(reply);
          _replyController.clear();
          _replyPhoto = null;
        });
        // Scroll al final del thread
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scrollController.hasClients) {
            _scrollController.animateTo(
              _scrollController.position.maxScrollExtent,
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOut,
            );
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al enviar: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  String _formatDateFull(DateTime date) {
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    return '${date.day} de ${months[date.month - 1]} de ${date.year}';
  }

  String _formatDateShort(DateTime date) {
    final now  = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 1)  return 'Ahora';
    if (diff.inHours   < 1)  return 'Hace ${diff.inMinutes} min';
    if (diff.inDays    < 1)  return 'Hace ${diff.inHours} h';
    if (diff.inDays    < 7)  return 'Hace ${diff.inDays} d';
    return '${date.day}/${date.month}/${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final c       = context.colors;
    final screenH = MediaQuery.of(context).size.height;
    final bottomPad = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(maxHeight: screenH * 0.92),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Handle ──────────────────────────────────────────
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

          // ── Título ──────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Row(
              children: [
                Text(
                  'Reseña',
                  style: TextStyle(color: c.textPrimary, fontSize: 17, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(color: c.bgInput, shape: BoxShape.circle),
                    child: Icon(Icons.close_rounded, color: c.textMuted, size: 18),
                  ),
                ),
              ],
            ),
          ),

          // ── Contenido scrollable ────────────────────────────
          Flexible(
            child: ListView(
              controller: _scrollController,
              padding: EdgeInsets.fromLTRB(20, 0, 20, _canReply ? 8 : 32),
              children: [
                // Cabecera reseña original
                _buildReviewHeader(c),

                // Comentario
                if (widget.review.comment != null && widget.review.comment!.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  _buildCommentBubble(c),
                ],

                // Foto de evidencia
                if (widget.review.photoUrl.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  _buildEvidencePhoto(c),
                ],

                // ── Hilo de respuestas ───────────────────────
                if (_repliesLoading) ...[
                  const SizedBox(height: 20),
                  const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2)),
                ] else if (_replies.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Divider(color: c.border, height: 1),
                  const SizedBox(height: 12),
                  Text(
                    'Respuestas (${_replies.length})',
                    style: TextStyle(color: c.textMuted, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 10),
                  ..._replies.map((r) => _buildReplyBubble(r, c)),
                ],

                // Preview foto adjunta
                if (_replyPhoto != null) ...[
                  const SizedBox(height: 12),
                  Stack(
                    alignment: Alignment.topRight,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(_replyPhoto!, height: 100, fit: BoxFit.cover),
                      ),
                      GestureDetector(
                        onTap: () => setState(() => _replyPhoto = null),
                        child: Container(
                          margin: const EdgeInsets.all(4),
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                          child: const Icon(Icons.close_rounded, color: Colors.white, size: 14),
                        ),
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 8),
              ],
            ),
          ),

          // ── Input de respuesta (solo autorizado) ────────────
          if (_canReply)
            Padding(
              padding: EdgeInsets.fromLTRB(12, 8, 12, 12 + bottomPad),
              child: Row(
                children: [
                  // Adjuntar foto
                  GestureDetector(
                    onTap: _pickReplyPhoto,
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: c.bgCard,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: c.border),
                      ),
                      child: Icon(Icons.attach_file_rounded, color: c.textMuted, size: 20),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Campo de texto
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                      decoration: BoxDecoration(
                        color: c.bgCard,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: c.border),
                      ),
                      child: TextField(
                        controller: _replyController,
                        style: TextStyle(color: c.textPrimary, fontSize: 14),
                        maxLines: 3,
                        minLines: 1,
                        decoration: InputDecoration(
                          hintText: _isMine ? 'Responde al proveedor…' : 'Responde a esta reseña…',
                          hintStyle: TextStyle(color: c.textMuted, fontSize: 14),
                          border: InputBorder.none,
                          isDense: true,
                        ),
                        onSubmitted: (_) => _sendReply(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Botón enviar
                  GestureDetector(
                    onTap: _sending ? null : _sendReply,
                    child: Container(
                      padding: const EdgeInsets.all(11),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: _sending
                          ? const SizedBox(
                              width: 18, height: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  // ── Cabecera de la reseña original ───────────────────────
  Widget _buildReviewHeader(AppThemeColors c) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 22,
          backgroundColor: c.bgInput,
          backgroundImage: widget.review.user?.avatarUrl != null
              ? NetworkImage(widget.review.user!.avatarUrl!)
              : null,
          child: widget.review.user?.avatarUrl == null
              ? Text(
                  widget.review.user?.initial ?? '?',
                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 16),
                )
              : null,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.review.user?.fullName ?? 'Usuario',
                style: TextStyle(color: context.colors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(height: 3),
              RatingBarIndicator(
                rating: widget.review.rating.toDouble(),
                itemBuilder: (_, _) => const Icon(Icons.star_rounded, color: AppColors.star),
                itemCount: 5,
                itemSize: 16,
              ),
              const SizedBox(height: 3),
              Text(
                _formatDateFull(widget.review.createdAt),
                style: TextStyle(color: context.colors.textMuted, fontSize: 11),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Burbuja del comentario original ──────────────────────
  Widget _buildCommentBubble(AppThemeColors c) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.border),
      ),
      child: Text(
        widget.review.comment!,
        style: TextStyle(color: c.textSecondary, fontSize: 14, height: 1.6),
      ),
    );
  }

  // ── Foto de evidencia ─────────────────────────────────────
  Widget _buildEvidencePhoto(AppThemeColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Foto de evidencia',
            style: TextStyle(color: c.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () => Navigator.of(context).push(
            PageRouteBuilder(
              opaque: false,
              barrierColor: Colors.black,
              pageBuilder: (_, _, _) => _ReviewImageFullscreen(
                imageUrl: widget.review.photoUrl,
                heroTag: 'review_detail_photo_${widget.review.id}',
              ),
              transitionsBuilder: (_, anim, _, child) =>
                  FadeTransition(opacity: anim, child: child),
            ),
          ),
          child: Hero(
            tag: 'review_detail_photo_${widget.review.id}',
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: Image.network(
                widget.review.photoUrl,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(
                  height: 140,
                  decoration: BoxDecoration(color: c.bgInput, borderRadius: BorderRadius.circular(14)),
                  child: Icon(Icons.broken_image_rounded, color: c.textMuted, size: 36),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text('Toca para ver a pantalla completa',
            style: TextStyle(color: c.textMuted, fontSize: 11)),
      ],
    );
  }

  // ── Burbuja de respuesta ──────────────────────────────────
  Widget _buildReplyBubble(ReviewReplyModel reply, AppThemeColors c) {
    final isMe      = reply.userId == _currentUserId;
    final isProvider = reply.userId == widget.providerUserId;
    final bubbleColor = isMe ? AppColors.primary.withValues(alpha: 0.12) : c.bgCard;
    final borderColor = isMe ? AppColors.primary.withValues(alpha: 0.3) : c.border;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isMe) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: c.bgInput,
              backgroundImage: reply.user?.avatarUrl != null
                  ? NetworkImage(reply.user!.avatarUrl!)
                  : null,
              child: reply.user?.avatarUrl == null
                  ? Text(
                      reply.user?.initial ?? '?',
                      style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold),
                    )
                  : null,
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: bubbleColor,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(14),
                  topRight: const Radius.circular(14),
                  bottomLeft: Radius.circular(isMe ? 14 : 4),
                  bottomRight: Radius.circular(isMe ? 4 : 14),
                ),
                border: Border.all(color: borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Nombre + badge proveedor
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        isMe ? 'Tú' : (reply.user?.fullName ?? 'Usuario'),
                        style: TextStyle(
                          color: isMe ? AppColors.primary : c.textPrimary,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (isProvider && !isMe) ...[
                        const SizedBox(width: 5),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Proveedor',
                            style: TextStyle(color: AppColors.primary, fontSize: 9, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  // Texto del mensaje
                  if (reply.content != '📷' || reply.photoUrl == null)
                    Text(reply.content, style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.4)),
                  // Foto adjunta
                  if (reply.photoUrl != null) ...[
                    if (reply.content != '📷') const SizedBox(height: 6),
                    GestureDetector(
                      onTap: () => Navigator.of(context).push(
                        PageRouteBuilder(
                          opaque: false,
                          barrierColor: Colors.black,
                          pageBuilder: (_, _, _) => _ReviewImageFullscreen(
                            imageUrl: reply.photoUrl!,
                            heroTag: 'reply_photo_${reply.id}',
                          ),
                          transitionsBuilder: (_, anim, _, child) =>
                              FadeTransition(opacity: anim, child: child),
                        ),
                      ),
                      child: Hero(
                        tag: 'reply_photo_${reply.id}',
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.network(
                            reply.photoUrl!,
                            height: 120,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => const SizedBox.shrink(),
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 4),
                  Text(
                    _formatDateShort(reply.createdAt),
                    style: TextStyle(color: c.textMuted, fontSize: 10),
                  ),
                ],
              ),
            ),
          ),
          if (isMe) const SizedBox(width: 8),
        ],
      ),
    );
  }
}

// ─── Botón de contacto ────────────────────────────────────

class _BigContactButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _BigContactButton({
    required this.label,
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
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Visor de imagen a pantalla completa ─────────────────

class _ReviewImageFullscreen extends StatelessWidget {
  final String imageUrl;
  final String heroTag;

  const _ReviewImageFullscreen({
    required this.imageUrl,
    required this.heroTag,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12, top: 8),
            child: GestureDetector(
              onTap: () => Navigator.of(context).pop(),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.55),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.close_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ),
          ),
        ],
      ),
      body: Center(
        child: Hero(
          tag: heroTag,
          child: InteractiveViewer(
            minScale: 0.5,
            maxScale: 5.0,
            clipBehavior: Clip.none,
            child: Image.network(
              imageUrl,
              fit: BoxFit.contain,
              loadingBuilder: (_, child, progress) {
                if (progress == null) return child;
                return Center(
                  child: CircularProgressIndicator(
                    value: progress.expectedTotalBytes != null
                        ? progress.cumulativeBytesLoaded /
                            progress.expectedTotalBytes!
                        : null,
                    color: Colors.white54,
                    strokeWidth: 2,
                  ),
                );
              },
              errorBuilder: (_, _, _) => const Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.broken_image_rounded,
                      color: Colors.white24, size: 64),
                  SizedBox(height: 12),
                  Text(
                    'No se pudo cargar la imagen',
                    style: TextStyle(color: Colors.white38, fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Fila de información de contacto/identidad ────────────

class _InfoChip extends StatelessWidget {
  final Widget? leading;
  final IconData? icon;
  final String label;
  final String sublabel;
  final VoidCallback? onTap;

  const _InfoChip({
    this.leading,
    this.icon,
    required this.label,
    required this.sublabel,
    this.onTap,
  }) : assert(leading != null || icon != null);

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final content = Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          if (leading != null)
            leading!
          else
            Icon(icon, color: AppColors.primary, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  sublabel,
                  style: TextStyle(color: c.textMuted, fontSize: 11),
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          if (onTap != null)
            Icon(Icons.arrow_forward_ios_rounded, color: c.textMuted, size: 14),
        ],
      ),
    );

    if (onTap != null) {
      return GestureDetector(onTap: onTap, child: content);
    }
    return content;
  }
}

// ─── Sheet de reporte ─────────────────────────────────────

class _ReportSheet {
  static const _reasons = [
    ('INFORMACION_FALSA',  'Información falsa o engañosa'),
    ('COMPORTAMIENTO',     'Comportamiento inapropiado'),
    ('FRAUDE',             'Posible fraude o estafa'),
    ('FOTO_INAPROPIADA',   'Fotos inapropiadas'),
    ('NO_PRESTO',          'No prestó el servicio'),
    ('OTRO',               'Otro motivo'),
  ];

  static Future<void> show(
    BuildContext context, {
    required int providerId,
    required String providerName,
    required int userId,
    required ProvidersRepository repo,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ReportSheetContent(
        providerId:   providerId,
        providerName: providerName,
        userId:       userId,
        repo:         repo,
        reasons:      _reasons,
      ),
    );
  }
}

class _ReportSheetContent extends StatefulWidget {
  final int providerId;
  final String providerName;
  final int userId;
  final ProvidersRepository repo;
  final List<(String, String)> reasons;

  const _ReportSheetContent({
    required this.providerId,
    required this.providerName,
    required this.userId,
    required this.repo,
    required this.reasons,
  });

  @override
  State<_ReportSheetContent> createState() => _ReportSheetContentState();
}

class _ReportSheetContentState extends State<_ReportSheetContent> {
  String? _selectedReason;
  final _descController = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_selectedReason == null) return;
    setState(() => _sending = true);
    try {
      await widget.repo.reportProvider(
        providerId:  widget.providerId,
        userId:      widget.userId,
        reason:      _selectedReason!,
        description: _descController.text.trim(),
      );
      if (mounted) {
        Navigator.of(context).pop();
        _showReportSuccessDialog(context);
      }
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().toLowerCase().contains('ya enviaste')
          ? 'Ya enviaste un reporte para este proveedor.'
          : 'No se pudo enviar el reporte. Intenta de nuevo.';
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.red.shade700),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _showReportSuccessDialog(BuildContext ctx) {
    final c = ctx.colors;
    showDialog(
      context: ctx,
      builder: (dCtx) => Dialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60, height: 60,
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 32),
              ),
              const SizedBox(height: 16),
              Text(
                'Reporte enviado con éxito',
                style: TextStyle(color: c.textPrimary, fontSize: 17, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Gracias por hacer de esta una comunidad saludable. Nuestro equipo revisará tu reporte a la brevedad.',
                style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.5),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(dCtx).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Aceptar', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c          = context.colors;
    final bottomPad  = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 24 + bottomPad),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: c.textMuted.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Título
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.busy.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.flag_rounded, color: AppColors.busy, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Reportar proveedor',
                      style: TextStyle(
                        color: c.textPrimary, fontSize: 16, fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      widget.providerName,
                      style: TextStyle(color: c.textMuted, fontSize: 12),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              GestureDetector(
                onTap: () => Navigator.of(context).pop(),
                child: Icon(Icons.close_rounded, color: c.textMuted, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 20),

          Text(
            '¿Cuál es el motivo del reporte?',
            style: TextStyle(color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),

          // Motivos
          ...widget.reasons.map(((String, String) r) {
            final (key, label) = r;
            final selected = _selectedReason == key;
            return GestureDetector(
              onTap: () => setState(() => _selectedReason = key),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.busy.withValues(alpha: 0.08)
                      : c.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: selected
                        ? AppColors.busy.withValues(alpha: 0.5)
                        : c.border,
                  ),
                ),
                child: Row(
                  children: [
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 150),
                      child: Icon(
                        selected
                            ? Icons.radio_button_checked_rounded
                            : Icons.radio_button_unchecked_rounded,
                        color: selected ? AppColors.busy : c.textMuted,
                        size: 18,
                        key: ValueKey(selected),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      label,
                      style: TextStyle(
                        color: selected ? c.textPrimary : c.textSecondary,
                        fontSize: 13,
                        fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),

          const SizedBox(height: 4),

          // Detalle opcional
          TextField(
            controller: _descController,
            style: TextStyle(color: c.textPrimary, fontSize: 13),
            maxLines: 2,
            maxLength: 300,
            decoration: InputDecoration(
              hintText: 'Detalle adicional (opcional)…',
              hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
              filled: true,
              fillColor: c.bgCard,
              counterStyle: TextStyle(color: c.textMuted, fontSize: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
          ),
          const SizedBox(height: 16),

          // Botones
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _sending ? null : () => Navigator.of(context).pop(),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: c.textSecondary,
                    side: BorderSide(color: c.border),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Cancelar'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: (_selectedReason == null || _sending) ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.busy,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppColors.busy.withValues(alpha: 0.4),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: _sending
                      ? const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text('Enviar reporte', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
