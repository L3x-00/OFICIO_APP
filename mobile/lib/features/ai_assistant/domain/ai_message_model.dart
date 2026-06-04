import 'package:mobile/features/providers_list/domain/models/provider_model.dart';

/// Origen de un mensaje en el chat con "Ofi".
enum AiSender { user, ofi }

/// Un mensaje del chat con el asistente IA "Ofi".
///
/// `local` marca mensajes que viven SOLO en el cliente (saludo inicial,
/// errores) y por tanto NO deben enviarse como historial al backend.
class AiMessageModel {
  final String text;
  final AiSender sender;
  final DateTime timestamp;

  /// True si es un mensaje de error mostrado en lugar de respuesta real.
  final bool isError;

  /// True si es un mensaje generado en el cliente (saludo/errores) y no
  /// debe formar parte del historial enviado al modelo.
  final bool local;

  /// Tarjetas de proveedores a renderizar BAJO el texto (tipo
  /// PROVIDER_RESULTS). Null/empty para mensajes normales.
  final List<ProviderModel>? providers;

  AiMessageModel({
    required this.text,
    required this.sender,
    DateTime? timestamp,
    this.isError = false,
    this.local = false,
    this.providers,
  }) : timestamp = timestamp ?? DateTime.now();

  /// Mensaje del usuario (lado derecho, color primario).
  factory AiMessageModel.user(String text) =>
      AiMessageModel(text: text, sender: AiSender.user);

  /// Respuesta de Ofi (lado izquierdo).
  factory AiMessageModel.ofi(String text) =>
      AiMessageModel(text: text, sender: AiSender.ofi);

  /// Respuesta de Ofi con tarjetas de proveedores navegables (el texto se
  /// muestra arriba y las tarjetas debajo).
  factory AiMessageModel.providerResults(
    String text,
    List<ProviderModel> providers,
  ) => AiMessageModel(text: text, sender: AiSender.ofi, providers: providers);

  /// Saludo inicial local (no viaja como historial).
  factory AiMessageModel.greeting(String text) =>
      AiMessageModel(text: text, sender: AiSender.ofi, local: true);

  /// Burbuja de error de Ofi (no viaja como historial).
  factory AiMessageModel.error(String text) => AiMessageModel(
    text: text,
    sender: AiSender.ofi,
    isError: true,
    local: true,
  );

  bool get isUser => sender == AiSender.user;

  /// True si el mensaje trae tarjetas de proveedores para renderizar.
  bool get hasProviders => providers != null && providers!.isNotEmpty;
}
