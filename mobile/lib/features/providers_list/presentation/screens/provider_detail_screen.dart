import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/social_media_row.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/presentation/screens/login_screen.dart';
import '../../data/providers_repository.dart';
import '../../data/reviews_repository.dart';
import '../../domain/models/provider_model.dart';
import '../../domain/models/review_model.dart';
import '../sheets/report_sheet.dart';
import '../widgets/provider_contact_bar.dart';
import '../widgets/provider_gallery.dart';
import '../widgets/provider_info_section.dart';
import '../widgets/review_card.dart';
import '../widgets/service_schedule_section.dart';

/// Modal de detalle completo del proveedor.
///
/// Compone todas las secciones (galería, header, rating, disponibilidad,
/// contacto, redes, horarios, productos/servicios, ubicación, reseñas,
/// reportar) y la barra fija inferior de contacto.
///
/// El nombre del archivo cambió a `provider_detail_screen.dart` pero la
/// clase pública sigue siendo `ProviderDetailSheet` por compatibilidad con
/// los callers existentes.
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
  final _reviewsRepo   = ReviewsRepository();
  final _providersRepo = ProvidersRepository();

  List<ReviewModel> _reviews = [];
  bool _reviewsLoading  = false;
  bool _reviewsError    = false;
  bool _isRecommended   = false;

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

  List<String> get _allImages {
    final images = <String>[];
    if (widget.provider.coverImageUrl != null) {
      images.add(widget.provider.coverImageUrl!);
    }
    images.addAll(widget.provider.thumbnailUrls);
    return images;
  }

  @override
  void initState() {
    super.initState();
    _loadReviews();
    // Tracking analítico: registra una vista del perfil al abrir el sheet.
    // Fire-and-forget — el repo absorbe errores internamente.
    unawaited(_providersRepo.trackEvent(widget.provider.id, 'view'));
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

  Future<void> _makeCall() async {
    // Tracking analítico — fire-and-forget; nunca debe bloquear la llamada.
    unawaited(_providersRepo.trackEvent(widget.provider.id, 'call_click'));
    final uri = Uri.parse('tel:${widget.provider.phone}');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  void _showLoginRequired() {
    final c = context.colors;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Inicia sesión para continuar',
            style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 17)),
        content: Text('Necesitas una cuenta para realizar esta acción.',
            style: TextStyle(color: c.textSecondary, height: 1.5)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Ahora no', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.of(context).push(MaterialPageRoute(
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

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final screenHeight = MediaQuery.of(context).size.height;
    final p = widget.provider;
    final hasSchedule = p.scheduleJson != null &&
        ScheduleTable.hasScheduleData(p.scheduleJson!);
    final hasServices = (p.scheduleJson?['services'] is List) &&
        (p.scheduleJson!['services'] as List).isNotEmpty;
    final hasLocation = p.type == ProviderType.negocio &&
        (p.address != null || (p.latitude != null && p.longitude != null));
    final social = SocialMediaRow(
      website:     p.website,
      instagram:   p.instagram,
      tiktok:      p.tiktok,
      facebook:    p.facebook,
      linkedin:    p.linkedin,
      twitterX:    p.twitterX,
      telegram:    p.telegram,
      whatsappBiz: p.whatsappBiz,
    );

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
                  if (_allImages.isNotEmpty)
                    ProviderGallery(images: _allImages, accent: _accent),

                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ProviderHeader(provider: p, accent: _accent),
                        const SizedBox(height: 12),
                        ProviderRating(provider: p),
                        const SizedBox(height: 12),
                        ProviderAvailabilityBadge(availability: p.availability),
                        const SizedBox(height: 16),
                        ProviderContactInfo(
                          provider: p,
                          accent: _accent,
                          onCall: _makeCall,
                        ),
                        const SizedBox(height: 16),

                        if (p.description != null) ...[
                          SectionTitle(
                            p.type == ProviderType.oficio
                                ? 'Sobre el profesional'
                                : 'Sobre el negocio',
                          ),
                          const SizedBox(height: 8),
                          Text(
                            p.description!,
                            style: TextStyle(
                              color: c.textSecondary,
                              fontSize: 14,
                              height: 1.6,
                            ),
                          ),
                          const SizedBox(height: 20),
                        ],

                        // ── Redes sociales ────────────────────
                        if (social.hasAny) ...[
                          const SectionTitle('Redes sociales'),
                          const SizedBox(height: 10),
                          social,
                          const SizedBox(height: 20),
                        ],

                        // ── Horarios (solo NEGOCIO) ───────────
                        if (p.type == ProviderType.negocio && hasSchedule) ...[
                          const SectionTitle('Horarios'),
                          const SizedBox(height: 8),
                          ScheduleTable(schedule: p.scheduleJson!),
                          const SizedBox(height: 20),
                        ],

                        // ── Productos (NEGOCIO) / Servicios (OFICIO) ─
                        if (hasServices) ...[
                          SectionTitle(
                            p.type == ProviderType.negocio
                                ? 'Productos'
                                : 'Servicios',
                          ),
                          const SizedBox(height: 10),
                          ServicesList(provider: p, accent: _accent),
                          const SizedBox(height: 12),
                        ],

                        // ── Ubicación (solo NEGOCIO) ──────────
                        if (hasLocation) ...[
                          const SectionTitle('Ubicación'),
                          const SizedBox(height: 8),
                          ProviderLocationSection(provider: p, accent: _accent),
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
          ProviderContactBar(
            provider: p,
            isOwnCard: _isOwnCard,
            myReview: _myReview,
            isRecommended: _isRecommended,
            repo: _providersRepo,
            onReloadReviews: _loadReviews,
          ),
        ],
      ),
    );
  }

  // ─── Sección de reseñas ───────────────────────────────────

  Widget _buildReviewsSection() {
    if (_reviewsLoading) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle('Reseñas'),
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
          const SectionTitle('Reseñas'),
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
        SectionTitle('Reseñas (${_reviews.length})'),
        const SizedBox(height: 12),
        ..._reviews.take(5).map((r) => ReviewCard(
              review: r,
              providerUserId: widget.provider.userId ?? 0,
            )),
        const SizedBox(height: 8),
      ],
    );
  }

  // ─── Botón reportar ──────────────────────────────────────

  Widget _buildReportButton() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: OutlinedButton.icon(
        onPressed: () {
          final auth = context.read<AuthProvider>();
          if (auth.user == null) { _showLoginRequired(); return; }
          ReportSheet.show(
            context,
            providerId:    widget.provider.id,
            providerName:  widget.provider.businessName,
            userId:        auth.user!.id,
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
}
