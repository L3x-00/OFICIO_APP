import 'dart:math';

/// Rutas de las 4 expresiones de la mascota Ofi.
class OfiAssets {
  const OfiAssets._();

  /// Neutral / por defecto.
  static const String defaultFace = 'assets/icons/ofi.png';

  /// Pensando (búsqueda / análisis / idle).
  static const String thinking = 'assets/icons/ofi-pensar.png';

  /// Saludo (saludos / ofrecer ayuda).
  static const String greet = 'assets/icons/ofi-saluda.png';

  /// Felicidad / manos elevadas (recomendaciones / logros / oportunidades).
  static const String happy = 'assets/icons/ofi-manos-elevadas.png';
}

/// Audiencia que determina el set de mensajes del launcher de Ofi.
enum OfiAudience { client, provider, admin }

/// Mensaje del launcher emparejado con la expresión de Ofi que lo acompaña
/// (Fase 1, opción A). Solo datos de UI.
class OfiMessage {
  final String text;
  final String asset;
  const OfiMessage(this.text, this.asset);
}

/// Mensajes contextuales de Ofi por audiencia (Fase 4), cada uno con su
/// expresión empática (Fase 1).
class OfiMessages {
  const OfiMessages._();

  static const List<OfiMessage> client = [
    OfiMessage('¿Necesitas ayuda? Habla con Ofi.', OfiAssets.greet),
    OfiMessage('Ofi puede ayudarte a encontrar servicios.', OfiAssets.greet),
    OfiMessage(
      'Encuentra el profesional ideal en segundos.',
      OfiAssets.thinking,
    ),
    OfiMessage(
      '¿Buscas un electricista, gasfitero o diseñador?',
      OfiAssets.thinking,
    ),
    OfiMessage('Haz tus consultas sin salir de la app.', OfiAssets.thinking),
    OfiMessage('Obtén recomendaciones inteligentes.', OfiAssets.happy),
  ];

  static const List<OfiMessage> provider = [
    OfiMessage('Conoce el estado de tu suscripción.', OfiAssets.greet),
    OfiMessage('Revisa tus estadísticas.', OfiAssets.thinking),
    OfiMessage('Analiza tu rendimiento con Ofi.', OfiAssets.thinking),
    OfiMessage('Descubre nuevas oportunidades.', OfiAssets.happy),
    OfiMessage('¿Quieres más visibilidad?', OfiAssets.happy),
  ];

  static const List<OfiMessage> admin = [
    OfiMessage('Consulta métricas de la plataforma.', OfiAssets.thinking),
    OfiMessage('Detecta proveedores con bajo rendimiento.', OfiAssets.thinking),
    OfiMessage('Revisa aprobaciones pendientes.', OfiAssets.thinking),
    OfiMessage('Consulta indicadores clave.', OfiAssets.thinking),
    OfiMessage('Analiza el crecimiento de usuarios.', OfiAssets.happy),
  ];

  static List<OfiMessage> forAudience(OfiAudience a) {
    switch (a) {
      case OfiAudience.provider:
        return provider;
      case OfiAudience.admin:
        return admin;
      case OfiAudience.client:
        return client;
    }
  }
}

/// Selector ALEATORIO (Fase 3): evita repetir el último mensaje y los
/// últimos 3, con distribución natural. Selecciona el objeto COMPLETO
/// (texto + imagen). Mantiene un historial corto de textos.
class OfiMessageRotator {
  OfiMessageRotator({Random? random}) : _rng = random ?? Random();

  final Random _rng;
  final List<String> _recent = [];

  OfiMessage next(List<OfiMessage> pool) {
    if (pool.isEmpty) return const OfiMessage('', OfiAssets.defaultFace);
    if (pool.length == 1) return pool.first;

    // 1º intento: excluir los últimos 3 mostrados.
    final avoid = _recent.length <= 3
        ? _recent
        : _recent.sublist(_recent.length - 3);
    var candidates = pool.where((m) => !avoid.contains(m.text)).toList();

    // 2º intento: si no quedan, excluir solo el último.
    if (candidates.isEmpty && _recent.isNotEmpty) {
      candidates = pool.where((m) => m.text != _recent.last).toList();
    }
    // Último recurso: todo el pool.
    if (candidates.isEmpty) candidates = pool;

    final pick = candidates[_rng.nextInt(candidates.length)];
    _recent.add(pick.text);
    if (_recent.length > 6) _recent.removeAt(0);
    return pick;
  }
}
