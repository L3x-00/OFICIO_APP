import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class GreetingHeader extends StatelessWidget {
  final String? liveProvince;
  final String? liveDistrict;
  const GreetingHeader({super.key, this.liveProvince, this.liveDistrict});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final firstName = user?.firstName ?? (auth.isGuest ? null : 'Usuario');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          firstName != null ? '¡Hola, $firstName!' : '¡Explora los servicios!',
          style: TextStyle(
            color: c.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 4),
        Text(
          firstName != null
              ? '¿Qué servicios necesitas hoy?'
              : 'Contrata sin registro • Es gratis',
          style: TextStyle(
            color: c.textMuted,
            fontSize: 13,
            fontWeight: FontWeight.normal,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}
