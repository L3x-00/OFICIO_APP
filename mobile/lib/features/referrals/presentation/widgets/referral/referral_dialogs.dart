import 'package:flutter/material.dart';

/// Diálogos de confirmación y éxito para el módulo de referidos.

void showSuccessDialog(BuildContext context, String title, String body) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Row(
        children: const [
          Icon(Icons.check_circle, color: Color(0xFF10B981)),
          SizedBox(width: 8),
          Expanded(child: Text('¡Canje exitoso!')),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(body),
        ],
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Entendido')),
      ],
    ),
  );
}

void showRedeemedRewardDialog(
  BuildContext context, {
  required String title,
  required String providerName,
  String? phone,
  String? whatsapp,
}) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Row(
        children: const [
          Icon(Icons.check_circle, color: Color(0xFF10B981)),
          SizedBox(width: 8),
          Expanded(child: Text('¡Canje exitoso!')),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('Proveedor: $providerName'),
          if (phone != null && phone.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('Teléfono: $phone'),
            ),
          if (whatsapp != null && whatsapp.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('WhatsApp: $whatsapp'),
            ),
          const SizedBox(height: 12),
          const Text(
            'Contacta al proveedor para coordinar el servicio. '
            'Muestra este canje como comprobante.',
            style: TextStyle(fontSize: 12),
          ),
        ],
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Entendido')),
      ],
    ),
  );
}