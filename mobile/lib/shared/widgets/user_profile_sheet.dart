import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/network/dio_client.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/providers_list/presentation/widgets/login_required_dialog.dart';
import 'package:mobile/shared/widgets/app_network_image.dart';
import 'package:mobile/shared/widgets/user_report_sheet.dart';

/// Perfil público mínimo de un usuario (cliente). Por seguridad el backend
/// solo expone primer nombre, primer apellido, avatar y fecha de registro.
class UserPublicProfile {
  final int id;
  final String firstName;
  final String lastName;
  final String? avatarUrl;
  final DateTime? createdAt;

  const UserPublicProfile({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.avatarUrl,
    this.createdAt,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory UserPublicProfile.fromJson(Map<String, dynamic> json) {
    return UserPublicProfile(
      id: (json['id'] as num).toInt(),
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      createdAt: json['createdAt'] is String
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }
}

/// Abre un modal con los datos públicos del usuario [userId]. Pensado para
/// que el PROVEEDOR toque la foto de un usuario en una reseña o chat.
///
/// [seedName] y [seedAvatarUrl] se muestran al instante (los traemos del
/// payload de la reseña/chat) mientras se resuelve la fecha de registro vía
/// `GET /users/:id/public`. Si la red falla, el seed se mantiene.
Future<void> showUserProfileSheet(
  BuildContext context, {
  required int userId,
  String? seedName,
  String? seedAvatarUrl,
}) {
  return showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (_) => _UserProfileSheet(
      userId: userId,
      seedName: seedName,
      seedAvatarUrl: seedAvatarUrl,
    ),
  );
}

class _UserProfileSheet extends StatefulWidget {
  final int userId;
  final String? seedName;
  final String? seedAvatarUrl;

  const _UserProfileSheet({
    required this.userId,
    this.seedName,
    this.seedAvatarUrl,
  });

  @override
  State<_UserProfileSheet> createState() => _UserProfileSheetState();
}

class _UserProfileSheetState extends State<_UserProfileSheet> {
  UserPublicProfile? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await DioClient.instance.dio.get(
        '/users/${widget.userId}/public',
      );
      if (!mounted) return;
      setState(() {
        _profile = UserPublicProfile.fromJson(res.data as Map<String, dynamic>);
        _loading = false;
      });
    } catch (_) {
      // Sin conexión / 401: mantenemos el seed y ocultamos la fecha.
      if (mounted) setState(() => _loading = false);
    }
  }

  static const _months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  String _memberSince(DateTime d) =>
      'Miembro desde ${_months[d.month - 1]} de ${d.year}';

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final auth = context.read<AuthProvider>();
    // 3.1: no se puede reportar al propio usuario logueado.
    final isSelf = auth.user != null && auth.user!.id == widget.userId;
    // 3.2: invitado (sin sesión) → modal bloqueante en vez de reportar.
    final isGuest = auth.user == null || auth.isGuest;
    final name = _profile?.fullName.isNotEmpty == true
        ? _profile!.fullName
        : (widget.seedName?.trim().isNotEmpty == true
              ? widget.seedName!.trim()
              : 'Usuario');
    final avatarUrl = _profile?.avatarUrl ?? widget.seedAvatarUrl;
    final hasAvatar = avatarUrl != null && avatarUrl.isNotEmpty;
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return SafeArea(
      top: false,
      child: Container(
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: c.textMuted.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 22),

            // Avatar
            Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
                border: Border.all(color: c.border, width: 0.5),
              ),
              clipBehavior: Clip.antiAlias,
              child: hasAvatar
                  ? AppNetworkImage(
                      url: avatarUrl,
                      width: 84,
                      height: 84,
                      fit: BoxFit.cover,
                      placeholder: _initialAvatar(initial),
                      errorWidget: _initialAvatar(initial),
                    )
                  : _initialAvatar(initial),
            ),
            const SizedBox(height: 16),

            // Nombre
            Text(
              name,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),

            // Fecha de registro (o spinner mientras carga)
            if (_loading)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.primary,
                  ),
                ),
              )
            else if (_profile?.createdAt != null)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.event_rounded, size: 14, color: c.textMuted),
                  const SizedBox(width: 6),
                  Text(
                    _memberSince(_profile!.createdAt!),
                    style: TextStyle(color: c.textSecondary, fontSize: 13),
                  ),
                ],
              ),
            const SizedBox(height: 20),

            // Nota de privacidad
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: c.bgInput,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: c.border, width: 0.5),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.lock_outline_rounded,
                    size: 16,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Por seguridad solo se muestra información básica del '
                      'usuario.',
                      style: TextStyle(
                        color: c.textMuted,
                        fontSize: 12,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Reportar comportamiento inapropiado (FASE 2 · #3). Oculto si es
            // el propio usuario logueado (3.1). Invitado → modal bloqueante de
            // login en vez de reportar (3.2). POST /users/report con JWT.
            if (!isSelf)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    final navigator = Navigator.of(context);
                    if (isGuest) {
                      navigator.pop();
                      showLoginRequiredDialog(
                        navigator.context,
                        title: 'Inicia sesión para reportar',
                        message:
                            'Regístrate o inicia sesión para realizar esta acción.',
                      );
                      return;
                    }
                    navigator.pop();
                    UserReportSheet.show(
                      navigator.context,
                      reportedUserId: widget.userId,
                      userName: name,
                    );
                  },
                  icon: const Icon(
                    Icons.flag_outlined,
                    size: 18,
                    color: AppColors.busy,
                  ),
                  label: const Text('Reportar comportamiento inapropiado'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.busy,
                    side: BorderSide(
                      color: AppColors.busy.withValues(alpha: 0.5),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _initialAvatar(String initial) => Center(
    child: Text(
      initial,
      style: const TextStyle(
        color: AppColors.primary,
        fontSize: 30,
        fontWeight: FontWeight.bold,
      ),
    ),
  );
}
