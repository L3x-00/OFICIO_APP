import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_strings.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../../shared/widgets/phone_input_section.dart' show formatForWhatsApp;
import '../../../data/providers_repository.dart';
import '../../../domain/models/provider_model.dart';

/// Acciones de contacto compartidas por las variantes de tarjeta.
/// Unifica la lógica de WhatsApp y llamada que antes estaba duplicada en
/// `ServiceCard` y `ServiceCardContent`.
class CardContactActions {
  const CardContactActions._();

  /// Abre WhatsApp (app nativa o web) con un mensaje pre-armado.
  /// Tracking analítico fire-and-forget — nunca bloquea la apertura ni
  /// propaga errores (el repo captura internamente).
  static Future<void> openWhatsApp(BuildContext context, ProviderModel provider) async {
    unawaited(ProvidersRepository().trackEvent(provider.id, 'whatsapp_click'));
    final raw     = provider.whatsapp ?? provider.phone;
    final number  = formatForWhatsApp(raw).replaceAll(RegExp(r'[\s\-\(\)]'), '');
    final message = Uri.encodeComponent(AppStrings.whatsappMessage(provider.businessName));
    final native  = Uri.parse('whatsapp://send?phone=$number&text=$message');
    final web     = Uri.parse('https://wa.me/$number?text=$message');
    if (await canLaunchUrl(native)) {
      await launchUrl(native);
    } else {
      await launchUrl(web, mode: LaunchMode.externalApplication);
    }
  }

  /// Abre el marcador telefónico con el número del proveedor.
  static Future<void> makeCall(BuildContext context, ProviderModel provider) async {
    unawaited(ProvidersRepository().trackEvent(provider.id, 'call_click'));
    final uri = Uri.parse('tel:${provider.phone}');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }
}
