import 'package:dio/dio.dart';
import 'package:mobile/core/network/dio_client.dart';
import '../domain/ai_message_model.dart';

/// Un turno del historial que el cliente envía al backend.
class AiHistoryTurn {
  final String role; // 'user' | 'model'
  final String text;
  const AiHistoryTurn({required this.role, required this.text});

  Map<String, dynamic> toJson() => {'role': role, 'text': text};
}

/// Respuesta de POST /ai-assistant/chat.
class AiChatReply {
  final String reply;
  final String promptVersion;
  final bool blocked;
  final String? reason;
  final bool cached;

  const AiChatReply({
    required this.reply,
    required this.promptVersion,
    required this.blocked,
    this.reason,
    this.cached = false,
  });

  factory AiChatReply.fromJson(Map<String, dynamic> json) {
    final meta = json['meta'] is Map
        ? Map<String, dynamic>.from(json['meta'] as Map)
        : const <String, dynamic>{};
    return AiChatReply(
      reply: json['reply']?.toString() ?? '',
      promptVersion: meta['promptVersion']?.toString() ?? 'v1',
      blocked: meta['blocked'] as bool? ?? false,
      reason: meta['reason']?.toString(),
      cached: meta['cached'] as bool? ?? false,
    );
  }
}

/// Tipos de error que la UI distingue para mostrar el mensaje adecuado.
enum AiErrorKind { rateLimited, disabled, unavailable, network, server }

/// Error tipado del asistente — lleva un mensaje listo para mostrar.
class AiAssistantException implements Exception {
  final String message;
  final AiErrorKind kind;
  const AiAssistantException(this.message, this.kind);

  @override
  String toString() => 'AiAssistantException($kind): $message';
}

/// Sesión expirada (HTTP 401). La UI debe cerrar sesión y pedir re-login.
class SessionExpiredException implements Exception {
  final String message;
  const SessionExpiredException([
    this.message = 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
  ]);

  @override
  String toString() => 'SessionExpiredException: $message';
}

/// Acceso al endpoint del asistente "Ofi".
///
/// El token JWT lo inyecta automáticamente [ApiInterceptor]; aquí solo
/// armamos el request y traducimos los errores HTTP a [AiAssistantException]
/// con mensajes amigables — en especial 429 (límites) y 403 (feature flag).
class AiAssistantRepository {
  final Dio _dio = DioClient.instance.dio;

  Future<AiChatReply> sendMessage({
    required String message,
    List<AiHistoryTurn>? history,
    String? providerType,
    String? context,
  }) async {
    try {
      final res = await _dio.post(
        '/ai-assistant/chat',
        data: {
          'message': message,
          if (history != null && history.isNotEmpty)
            'history': history.map((h) => h.toJson()).toList(),
          if (providerType != null && providerType.isNotEmpty)
            'providerType': providerType,
          // Pantalla activa → el backend fuerza la Estrategia de Contexto.
          if (context != null && context.isNotEmpty) 'context': context,
        },
      );
      return AiChatReply.fromJson(Map<String, dynamic>.from(res.data as Map));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) throw const SessionExpiredException();
      throw _mapError(e);
    }
  }

  /// Trae los últimos mensajes del usuario (cross-device) desde el backend.
  /// 401 → [SessionExpiredException]. Cualquier otro fallo se relanza para que
  /// el provider lo trate como best-effort (mantiene el saludo local).
  Future<List<AiMessageModel>> fetchHistory() async {
    try {
      final res = await _dio.get('/ai-assistant/history');
      final data = Map<String, dynamic>.from(res.data as Map);
      final list = (data['messages'] as List?) ?? const [];
      return list.map((m) {
        final map = Map<String, dynamic>.from(m as Map);
        final role = map['role']?.toString() ?? 'model';
        return AiMessageModel(
          text: map['content']?.toString() ?? '',
          sender: role == 'user' ? AiSender.user : AiSender.ofi,
          timestamp: DateTime.tryParse(map['createdAt']?.toString() ?? ''),
        );
      }).toList();
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) throw const SessionExpiredException();
      rethrow;
    }
  }

  AiAssistantException _mapError(DioException e) {
    final status = e.response?.statusCode;
    final serverMsg = _extractMessage(e.response?.data);

    switch (status) {
      case 429:
        return AiAssistantException(
          serverMsg ??
              'Alcanzaste el límite de consultas por hoy. Intenta más tarde.',
          AiErrorKind.rateLimited,
        );
      case 403:
        return AiAssistantException(
          serverMsg ?? 'El asistente no está disponible por ahora.',
          AiErrorKind.disabled,
        );
      case 503:
        return AiAssistantException(
          serverMsg ??
              'El asistente está ocupado en este momento. Intenta en unos minutos.',
          AiErrorKind.unavailable,
        );
      default:
        if (e.type == DioExceptionType.connectionError ||
            e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout ||
            e.type == DioExceptionType.sendTimeout) {
          return const AiAssistantException(
            'Sin conexión. Revisa tu internet e intenta de nuevo.',
            AiErrorKind.network,
          );
        }
        return AiAssistantException(
          serverMsg ?? 'Ocurrió un error. Intenta de nuevo.',
          AiErrorKind.server,
        );
    }
  }

  /// Extrae el `message` del cuerpo de error de NestJS (string o array).
  String? _extractMessage(dynamic data) {
    if (data is Map) {
      final msg = data['message'];
      if (msg is List && msg.isNotEmpty) return msg.first.toString();
      if (msg != null) return msg.toString();
    }
    return null;
  }
}
