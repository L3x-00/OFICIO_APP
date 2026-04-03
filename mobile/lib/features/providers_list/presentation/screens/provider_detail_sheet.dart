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

  @override
  void initState() {
    super.initState();
    _loadReviews();
  }

  Future<void> _loadReviews() async {
    setState(() => _reviewsLoading = true);
    try {
      final reviews = await _reviewsRepo.getProviderReviews(widget.provider.id);
      if (mounted) setState(() => _reviews = reviews);
    } catch (_) {
      // No crítico — la app sigue funcionando sin reseñas
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
    final screenHeight = MediaQuery.of(context).size.height;

    return Container(
      height: screenHeight * 0.92,
      decoration: const BoxDecoration(
        color: AppColors.bgDark,
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
                color: AppColors.textMuted.withOpacity(0.4),
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
                        const SizedBox(height: 16),
                        _buildAvailabilityBadge(),
                        const SizedBox(height: 16),

                        if (widget.provider.description != null) ...[
                          _buildSectionTitle('Descripción'),
                          const SizedBox(height: 8),
                          Text(
                            widget.provider.description!,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 14,
                              height: 1.6,
                            ),
                          ),
                          const SizedBox(height: 20),
                        ],

                        if (widget.provider.scheduleJson != null) ...[
                          _buildSectionTitle('Horarios'),
                          const SizedBox(height: 8),
                          _buildSchedule(),
                          const SizedBox(height: 20),
                        ],

                        if (widget.provider.latitude != null &&
                            widget.provider.longitude != null) ...[
                          _buildSectionTitle('Ubicación'),
                          if (widget.provider.address != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 4, bottom: 8),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.location_on_rounded,
                                    color: AppColors.primary,
                                    size: 16,
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      widget.provider.address!,
                                      style: const TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          _buildMap(),
                          const SizedBox(height: 20),
                        ],

                        // ── Sección de reseñas ────────────────
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
    return SizedBox(
      height: 240,
      child: Stack(
        children: [
          PageView.builder(
            itemCount: _allImages.length,
            onPageChanged: (i) => setState(() => _currentImageIndex = i),
            itemBuilder: (context, index) => GestureDetector(
              onTap: () => _openFullscreenGallery(index),
              child: Image.network(
                _allImages[index],
                fit: BoxFit.cover,
                width: double.infinity,
                errorBuilder: (_, __, ___) => Container(
                  color: AppColors.bgInput,
                  child: const Icon(
                    Icons.image_not_supported,
                    color: AppColors.textMuted,
                    size: 48,
                  ),
                ),
                loadingBuilder: (_, child, progress) => progress == null
                    ? child
                    : Container(
                        color: AppColors.bgInput,
                        child: const Center(
                          child: CircularProgressIndicator(
                            color: AppColors.primary,
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
                          ? AppColors.primary
                          : Colors.white.withOpacity(0.4),
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
                color: Colors.black.withOpacity(0.6),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${_currentImageIndex + 1}/${_allImages.length}',
                style: const TextStyle(color: Colors.white, fontSize: 12),
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
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.provider.businessName,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                widget.provider.categoryName,
                style: const TextStyle(
                  color: AppColors.primary,
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
              color: AppColors.verified.withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.verified.withOpacity(0.4)),
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
    return Row(
      children: [
        RatingBarIndicator(
          rating: widget.provider.averageRating,
          itemBuilder: (_, __) =>
              const Icon(Icons.star_rounded, color: AppColors.star),
          itemCount: 5,
          itemSize: 20,
        ),
        const SizedBox(width: 8),
        Text(
          '${widget.provider.averageRating.toStringAsFixed(1)} · '
          '${widget.provider.totalReviews} reseñas',
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
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
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
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

  // ─── Horarios ─────────────────────────────────────────────

  Widget _buildSchedule() {
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
        color: AppColors.bgCard,
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
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                ),
                Text(
                  hours,
                  style: TextStyle(
                    color: isClosed ? AppColors.busy : AppColors.textPrimary,
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
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.4),
                          blurRadius: 12,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.storefront_rounded,
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
    return Text(
      title,
      style: const TextStyle(
        color: AppColors.textPrimary,
        fontSize: 16,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  // ─── Botones de contacto fijos ────────────────────────────

  Widget _buildContactButtons() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.06)),
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
              label: const Text('Dejar una reseña'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.star,
                side: BorderSide(color: AppColors.star.withOpacity(0.4)),
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

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.bgInput,
                backgroundImage: review.user?.avatarUrl != null
                    ? NetworkImage(review.user!.avatarUrl!)
                    : null,
                child: review.user?.avatarUrl == null
                    ? Text(
                        review.user?.initial ?? '?',
                        style: const TextStyle(
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
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    RatingBarIndicator(
                      rating: review.rating.toDouble(),
                      itemBuilder: (_, __) =>
                          const Icon(Icons.star_rounded, color: AppColors.star),
                      itemCount: 5,
                      itemSize: 14,
                    ),
                  ],
                ),
              ),
              Text(
                _formatDate(review.createdAt),
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 11,
                ),
              ),
            ],
          ),
          if (review.comment != null && review.comment!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                review.comment!,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
            ),
          if (review.photoUrl.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: GestureDetector(
                onTap: () => Navigator.of(context).push(
                  PageRouteBuilder(
                    opaque: false,
                    barrierColor: Colors.black,
                    pageBuilder: (_, __, ___) => _ReviewImageFullscreen(
                      imageUrl: review.photoUrl,
                      heroTag: 'review_photo_${review.id}',
                    ),
                    transitionsBuilder: (_, anim, __, child) =>
                        FadeTransition(opacity: anim, child: child),
                  ),
                ),
                child: Hero(
                  tag: 'review_photo_${review.id}',
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      review.photoUrl,
                      height: 80,
                      width: 80,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                    ),
                  ),
                ),
              ),
            ),
        ],
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
          color: color.withOpacity(0.15),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.4)),
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
                  color: Colors.black.withOpacity(0.55),
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
              errorBuilder: (_, __, ___) => const Column(
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
