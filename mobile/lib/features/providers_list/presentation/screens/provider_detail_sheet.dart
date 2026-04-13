import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:latlong2/latlong.dart';
import 'package:photo_view/photo_view.dart';
import 'package:photo_view/photo_view_gallery.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/constans/app_strings.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../data/reviews_repository.dart';
import '../../domain/models/provider_model.dart';
import '../../domain/models/review_model.dart';
import '../../presentation/widgets/create_review_sheet.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

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
  final _reviewsRepo = ReviewsRepository();

  int _currentImageIndex = 0;
  List<ReviewModel> _reviews = [];
  bool _reviewsLoading = false;
  bool _reviewsError = false;
  late final PageController _pageController = PageController(keepPage: true);

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

  Future<void> _loadReviews() async {
    setState(() { _reviewsLoading = true; _reviewsError = false; });
    try {
      final reviews = await _reviewsRepo.getProviderReviews(widget.provider.id);
      if (mounted) setState(() => _reviews = reviews);
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

                        // ── Horarios ──────────────────────────
                        if (widget.provider.scheduleJson != null &&
                            _hasScheduleData(widget.provider.scheduleJson!)) ...[
                          _buildSectionTitle('Horarios'),
                          const SizedBox(height: 8),
                          _buildSchedule(),
                          const SizedBox(height: 20),
                        ],

                        // ── Productos / Servicios (solo NEGOCIO) ─
                        if (widget.provider.type == ProviderType.negocio) ...[
                          ..._buildServicesSection(),
                        ],

                        // ── Ubicación ─────────────────────────
                        if (widget.provider.address != null ||
                            (widget.provider.latitude != null &&
                             widget.provider.longitude != null)) ...[
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
        if (widget.provider.isVerified)
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
      ],
    );
  }

  // ─── Rating ──────────────────────────────────────────────

  Widget _buildRating() {
    final c = context.colors;
    return Row(
      children: [
        RatingBarIndicator(
          rating: widget.provider.averageRating,
          itemBuilder: (_, _) =>
              const Icon(Icons.star_rounded, color: AppColors.star),
          itemCount: 5,
          itemSize: 20,
        ),
        const SizedBox(width: 8),
        Text(
          '${widget.provider.averageRating.toStringAsFixed(1)} · '
          '${widget.provider.totalReviews} reseñas',
          style: TextStyle(color: c.textSecondary, fontSize: 13),
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

  /// Sección de productos/servicios para tipo NEGOCIO.
  /// Lee la lista "services" del scheduleJson.
  List<Widget> _buildServicesSection() {
    final schedule = widget.provider.scheduleJson;
    final rawServices = schedule?['services'];
    if (rawServices is! List || rawServices.isEmpty) return [];

    final c = context.colors;

    return [
      _buildSectionTitle('Productos y servicios'),
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
                child: Icon(Icons.inventory_2_rounded,
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
        ..._reviews.take(5).map((r) => _ReviewCard(review: r)),
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
                // Obtener userId del AuthProvider
                final authProvider = context.read<AuthProvider>();
                final userId = authProvider.user?.id ?? 0;

                final created = await CreateReviewSheet.show(
                  context,
                  providerId: widget.provider.id,
                  providerName: widget.provider.businessName,
                  userId: userId,
                );
                if (created == true && mounted) {
                  // Recargar reseñas inmediatamente tras publicar
                  await _loadReviews();
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('¡Reseña publicada!'),
                      backgroundColor: AppColors.available,
                    ),
                  );
                }
              },
              icon: const Icon(Icons.star_rounded, size: 18),
              label: Text('Dejar una reseña'),
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
      ),
    );
  }

  Future<void> _openWhatsApp() async {
    final number = (widget.provider.whatsapp ?? widget.provider.phone)
        .replaceAll(RegExp(r'[\s\-\(\)]'), '');
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

// ─── Tarjeta de reseña ────────────────────────────────────

class _ReviewCard extends StatelessWidget {
  final ReviewModel review;
  const _ReviewCard({required this.review});

  void _openDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ReviewDetailSheet(review: review),
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

// ─── Modal de detalle de reseña ───────────────────────────

class _ReviewDetailSheet extends StatelessWidget {
  final ReviewModel review;
  const _ReviewDetailSheet({required this.review});

  String _formatDateFull(DateTime date) {
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    return '${date.day} de ${months[date.month - 1]} de ${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final screenH = MediaQuery.of(context).size.height;

    return Container(
      constraints: BoxConstraints(maxHeight: screenH * 0.85),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
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

          // Título
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
            child: Row(
              children: [
                Text(
                  'Detalle de la reseña',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: c.bgInput,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.close_rounded, color: c.textMuted, size: 18),
                  ),
                ),
              ],
            ),
          ),

          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Cabecera: avatar + nombre + estrellas + fecha
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: c.bgInput,
                        backgroundImage: review.user?.avatarUrl != null
                            ? NetworkImage(review.user!.avatarUrl!)
                            : null,
                        child: review.user?.avatarUrl == null
                            ? Text(
                                review.user?.initial ?? '?',
                                style: const TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 18,
                                ),
                              )
                            : null,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              review.user?.fullName ?? 'Usuario',
                              style: TextStyle(
                                color: c.textPrimary,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                            const SizedBox(height: 4),
                            RatingBarIndicator(
                              rating: review.rating.toDouble(),
                              itemBuilder: (_, _) => const Icon(
                                Icons.star_rounded,
                                color: AppColors.star,
                              ),
                              itemCount: 5,
                              itemSize: 18,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _formatDateFull(review.createdAt),
                              style: TextStyle(color: c.textMuted, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // Comentario completo
                  if (review.comment != null && review.comment!.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: c.bgCard,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: c.border),
                      ),
                      child: Text(
                        review.comment!,
                        style: TextStyle(
                          color: c.textSecondary,
                          fontSize: 14,
                          height: 1.6,
                        ),
                      ),
                    ),
                  ],

                  // Foto de evidencia a tamaño completo
                  if (review.photoUrl.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Text(
                      'Foto de evidencia',
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 10),
                    GestureDetector(
                      onTap: () => Navigator.of(context).push(
                        PageRouteBuilder(
                          opaque: false,
                          barrierColor: Colors.black,
                          pageBuilder: (_, _, _) => _ReviewImageFullscreen(
                            imageUrl: review.photoUrl,
                            heroTag: 'review_detail_photo_${review.id}',
                          ),
                          transitionsBuilder: (_, anim, _, child) =>
                              FadeTransition(opacity: anim, child: child),
                        ),
                      ),
                      child: Hero(
                        tag: 'review_detail_photo_${review.id}',
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.network(
                            review.photoUrl,
                            width: double.infinity,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => Container(
                              height: 160,
                              decoration: BoxDecoration(
                                color: c.bgInput,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Icon(
                                Icons.broken_image_rounded,
                                color: c.textMuted,
                                size: 40,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        'Toca la foto para verla a pantalla completa',
                        style: TextStyle(color: c.textMuted, fontSize: 11),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
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
