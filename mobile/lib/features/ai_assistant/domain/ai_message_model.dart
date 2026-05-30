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

  AiMessageModel({
    required this.text,
    required this.sender,
    DateTime? timestamp,
    this.isError = false,
    this.local = false,
  }) : timestamp = timestamp ?? DateTime.now();

  /// Mensaje del usuario (lado derecho, color primario).
  factory AiMessageModel.user(String text) =>
      AiMessageModel(text: text, sender: AiSender.user);

  /// Respuesta de Ofi (lado izquierdo).
  factory AiMessageModel.ofi(String text) =>
      AiMessageModel(text: text, sender: AiSender.ofi);

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
}
