import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../core/utils/permission_service.dart';
import '../../../../shared/widgets/app_snack_bar.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/reviews_repository.dart';
import '../../domain/models/review_model.dart';
import 'review_image_fullscreen.dart';

/// Sheet modal con el hilo completo de respuestas para una reseña.
/// Solo el autor de la reseña y el dueño del proveedor pueden responder.
class ReviewDetailSheet extends StatefulWidget {
  final ReviewModel review;
  final int providerUserId;
  const ReviewDetailSheet({
    super.key,
    required this.review,
    required this.providerUserId,
  });

  @override
  State<ReviewDetailSheet> createState() => _ReviewDetailSheetState();
}

class _ReviewDetailSheetState extends State<ReviewDetailSheet> {
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
        context.showErrorSnack('Error al enviar: $e');
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
              pageBuilder: (_, _, _) => ReviewImageFullscreen(
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
                          pageBuilder: (_, _, _) => ReviewImageFullscreen(
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
