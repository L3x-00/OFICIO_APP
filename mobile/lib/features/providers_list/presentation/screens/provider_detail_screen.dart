import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/social_media_row.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/presentation/screens/login_screen.dart';
import '../../data/providers_repository.dart';
import '../../data/reviews_repository.dart';
import '../../domain/models/provider_model.dart';
import '../../domain/models/review_model.dart';
import '../providers/providers_provider.dart';
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

  /// Copia mutable del proveedor — se refresca tras dejar reseña / recomendar
  /// para que los contadores (`averageRating`, `totalReviews`,
  /// `totalRecommendations`) reflejen el valor real al instante.
  late ProviderModel _provider = widget.provider;

  List<ReviewModel> _reviews = [];
  bool _reviewsLoading  = false;
  bool _reviewsError    = false;
  bool _isRecommended   = false;

  bool get _isOwnCard {
    final auth = context.read<AuthProvider>();
    return auth.user != null &&
        _provider.userId != null &&
        _provider.userId == auth.user!.id;
  }

  /// Color de acento según el tipo de proveedor:
  /// NEGOCIO → morado | OFICIO → azul primary
  Color get _accent => _provider.type == ProviderType.negocio
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
    if (_provider.coverImageUrl != null) {
      images.add(_provider.coverImageUrl!);
    }
    images.addAll(_provider.thumbnailUrls);
    return images;
  }

  @override
  void initState() {
    super.initState();
    _loadReviews();
    // Tracking analítico: registra una vista del perfil al abrir el sheet.
    // Fire-and-forget — el repo absorbe errores internamente.
    unawaited(_providersRepo.trackEvent(_provider.id, 'view'));
  }

  Future<void> _loadReviews() async {
    setState(() { _reviewsLoading = true; _reviewsError = false; });
    try {
      final reviews = await _reviewsRepo.getProviderReviews(_provider.id);
      if (!mounted) return;
      setState(() => _reviews = reviews);

      // Cargar estado de recomendación del usuario actual
      final uid = context.read<AuthProvider>().user?.id ?? 0;
      if (uid != 0) {
        final recommended = await _providersRepo.checkRecommendation(
            _provider.id, uid);
        if (mounted) setState(() => _isRecommended = recommended);
      }
    } catch (_) {
      if (mounted) setState(() => _reviewsError = true);
    } finally {
      if (mounted) setState(() => _reviewsLoading = false);
    }
  }

  /// Refresca los contadores del proveedor (rating, reseñas, recomendaciones)
  /// desde el backend. Se llama después de crear/editar reseña o cambiar
  /// recomendación para que la tarjeta refleje el cambio al instante,
  /// tanto en este sheet como en la lista del home (propagado vía
  /// `ProvidersProvider.refreshProvider`).
  Future<void> _refreshProviderStats() async {
    final updated = await context
        .read<ProvidersProvider>()
        .refreshProvider(_provider.id);
    if (!mounted || updated == null) return;
    setState(() => _provider = updated.copyWith(isFavorite: _provider.isFavorite));
  }

  /// Recarga reseñas y refresca contadores en paralelo. Pasado como
  /// callback a [ProviderContactBar] para que tras crear/editar/recomendar
  /// la UI quede coherente sin pedir un refresh manual al usuario.
  Future<void> _onReviewActionDone() async {
    await Future.wait([_loadReviews(), _refreshProviderStats()]);
  }

  /// Lanza el share-sheet nativo (Android/iOS) o Web Share API con la
  /// Vanity URL del proveedor + un copy con el nombre. La URL apunta al
  /// dominio público (`oficioapp.org.pe/p/:slug`) que sirve la tarjeta
  /// SSR con OG tags — al pegarla en WhatsApp / Facebook se ve preview
  /// con foto y descripción.
  ///
  /// Tracking analítico fire-and-forget (mismo bus que call/whatsapp).
  Future<void> _shareProfile(ProviderModel p) async {
    unawaited(_providersRepo.trackEvent(p.id, 'view'));
    // Prefer slug; si todavía no se generó (perfil viejo sin backfill),
    // cae al id numérico — el backend resuelve `/profiles/:id` también
    // y backfilla el slug al primer hit.
    final pathSegment = (p.slug != null && p.slug!.isNotEmpty) ? p.slug! : '${p.id}';
    final url = '${DioClient.publicWebUrl}/p/$pathSegment';
    final text = p.type == ProviderType.negocio
        ? 'Mira el negocio ${p.businessName} en OficioApp'
        : 'Mira el perfil de ${p.businessName} en OficioApp';
    await Share.share('$text\n$url', subject: p.businessName);
  }

  Future<void> _makeCall() async {
    // Tracking analítico — fire-and-forget; nunca debe bloquear la llamada.
    unawaited(_providersRepo.trackEvent(_provider.id, 'call_click'));
    final uri = Uri.parse('tel:${_provider.phone}');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  void _showLoginRequired() {
    final c       = context.colors;
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

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final screenHeight = MediaQuery.of(context).size.height;
    final p = _provider;
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
          // El botón de compartir vivía aquí; se movió como overlay en
          // la galería (inferior-derecha de la foto) para que esté
          // visualmente sobre el contenido y libere espacio en el
          // header.
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

          // ── Contenido scrollable ────────────────────────────
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_allImages.isNotEmpty)
                    ProviderGallery(
                      images: _allImages,
                      accent: _accent,
                      // Siempre disponible: si el provider aún no tiene
                      // slug, _shareProfile cae al id numérico (que el
                      // backend resuelve y backfilla el slug en el
                      // primer hit).
                      trailingAction: _ShareFab(onTap: () => _shareProfile(p)),
                    ),

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
            onReloadReviews: _onReviewActionDone,
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

    // Empty state visible: proveedores recién aprobados sin reseñas todavía
    // necesitan que la sección exista (con placeholder) para que el botón
    // "Dejar una reseña" del contact bar tenga contexto visual.
    if (_reviews.isEmpty) {
      final c = context.colors;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle('Reseñas'),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: c.border),
            ),
            child: Column(
              children: [
                Icon(Icons.rate_review_outlined, color: c.textMuted, size: 26),
                const SizedBox(height: 6),
                Text(
                  'Aún sin reseñas',
                  style: TextStyle(
                      color: c.textSecondary,
                      fontSize: 13,
                      fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  'Sé el primero en dejar una reseña tras contratar este servicio.',
                  style: TextStyle(color: c.textMuted, fontSize: 12, height: 1.4),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle('Reseñas (${_reviews.length})'),
        const SizedBox(height: 12),
        ..._reviews.take(5).map((r) => ReviewCard(
              review: r,
              providerUserId: _provider.userId ?? 0,
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
            providerId:    _provider.id,
            providerName:  _provider.businessName,
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

/// FAB compacto para compartir el perfil — se monta como overlay en la
/// esquina inferior-derecha de la galería del proveedor. Fondo oscuro
/// translúcido para mantener contraste sobre cualquier foto.
class _ShareFab extends StatelessWidget {
  final VoidCallback onTap;
  const _ShareFab({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.55),
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: const Padding(
          padding: EdgeInsets.all(10),
          child: Icon(Icons.ios_share_rounded, color: Colors.white, size: 20),
        ),
      ),
    );
  }
}
