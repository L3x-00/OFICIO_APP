/// Excepción base de la aplicación
/// En lugar de usar String para errores, usamos clases tipadas
sealed class AppException implements Exception {
  final String message;
  const AppException(this.message);

  @override
  String toString() => message;
}

/// Error de red (sin conexión, timeout)
class NetworkException extends AppException {
  const NetworkException([super.message = 'Sin conexión a internet']);
}

/// Error del servidor (500, 503)
class ServerException extends AppException {
  final int? statusCode;
  const ServerException(super.message, {this.statusCode});
}

/// Error de autenticación (401, 403)
class AuthException extends AppException {
  const AuthException([super.message = 'Tu sesión ha expirado. Vuelve a iniciar sesión.']);
}

/// Error de validación (400)
class ValidationException extends AppException {
  final Map<String, String>? fields;
  const ValidationException(super.message, {this.fields});
}

/// Recurso no encontrado (404)
class NotFoundException extends AppException {
  const NotFoundException([super.message = 'No encontrado']);
}

/// Error de conflicto (409) — ej: email ya registrado
class ConflictException extends AppException {
  const ConflictException(super.message);
}