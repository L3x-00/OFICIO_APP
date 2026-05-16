import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

/// Saludo del usuario. Antes incluía un chip de ubicación a la derecha,
/// pero quedaban dos pills (este + [LocationChipBar] debajo) compitiendo
/// por el mismo dato. Se eliminó la pill derecha para dejar el chip
/// único justo encima del feed; ese chip es ahora la fuente única de
/// verdad de la ubicación activa.
///
/// Los params [liveProvince] / [liveDistrict] se mantienen por compat
/// con callsites pero ya no se renderizan aquí — el chip los consume
/// directamente del provider.
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

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            firstName != null ? '¡Hola, $firstName!' : '¡Explora los servicios!',
            style: TextStyle(color: c.textPrimary, fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 2),
          Text(
            firstName != null ? '¿Qué necesitas hoy?' : 'Contrata sin registro • Es gratis',
            style: TextStyle(color: c.textSecondary, fontSize: 13),
          ),
        ],
      ),
    );
  }
}
