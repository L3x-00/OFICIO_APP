import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'ai_assistant_screen.dart';

/// FAB ámbar que abre el chat con "Ofi". Reutilizable desde la pantalla
/// principal de proveedores y desde el panel del proveedor.
///
/// `heroTag` propio para no chocar con otros FAB de la misma pantalla
/// (p.ej. el de "Únete" en la home).
class AiAssistantFab extends StatelessWidget {
  /// Perfil activo (OFICIO|NEGOCIO) si se abre desde el panel del proveedor.
  final String? providerType;

  const AiAssistantFab({super.key, this.providerType});

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      heroTag: 'ai_ofi_fab',
      backgroundColor: AppColors.amber,
      foregroundColor: Colors.black,
      tooltip: 'Pregúntale a Ofi',
      elevation: 4,
      onPressed: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => AiAssistantScreen(providerType: providerType),
          ),
        );
      },
      child: const Icon(Icons.smart_toy_rounded, size: 26),
    );
  }
}
