import 'package:flutter/foundation.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import '../data/ai_assistant_repository.dart';
import '../domain/ai_message_model.dart';

/// Estado del chat con "Ofi". Mantiene la lista de mensajes, el indicador
/// de carga ("escribiendo…") y el último error. Resiliente: un fallo del
/// backend se muestra como burbuja de error sin romper la conversación.
class AiAssistantProvider extends ChangeNotifier {
  final AiAssistantRepository _repo;

  /// Perfil de proveedor activo (OFICIO|NEGOCIO) cuando se abre desde el
  /// panel — contextualiza las respuestas. Null para el rol cliente.
  final String? providerType;

  /// True si el chat se abrió desde el panel del proveedor.
  bool get _isProviderContext => providerType != null;

  /// Contexto/pantalla que se envía al backend para forzar la Estrategia de
  /// Contexto: 'PROVIDER' desde el panel del proveedor, 'CLIENT' en cliente.
  String get context => _isProviderContext ? 'PROVIDER' : 'CLIENT';

  /// Máximo de turnos de historial que el cliente adjunta como respaldo
  /// (el backend recupera el historial real de BD; esto es fallback).
  static const int _historyCap = 8;

  AiAssistantProvider({AiAssistantRepository? repo, this.providerType})
    : _repo = repo ?? AiAssistantRepository();

  final List<AiMessageModel> _messages = [];
  bool _isLoading = false;
  String? _error;

  AuthProvider? _auth;
  bool _sessionExpired = false;
  bool _disposed = false;

  List<AiMessageModel> get messages => List.unmodifiable(_messages);
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasMessages => _messages.isNotEmpty;

  /// True cuando el backend devolvió 401: la UI debe avisar y cerrar sesión.
  bool get sessionExpired => _sessionExpired;

  /// Inserta el saludo inicial de Ofi (solo una vez). El saludo cambia según
  /// el contexto: negocio (panel proveedor) vs cliente.
  void seedGreeting() {
    if (_messages.isNotEmpty) return;
    final greeting = _isProviderContext
        ? '¡Hola! 👋 Soy Ofi, tu asistente de negocio en Servi. '
              'Puedo ayudarte a mejorar tu visibilidad, entender tu plan y '
              'revisar tus estadísticas. ¿En qué te ayudo?'
        : '¡Hola! 👋 Soy Ofi, tu asistente de Servi. '
              'Puedo ayudarte a encontrar proveedores, explicarte cómo funciona '
              'la app y más. ¿En qué te ayudo?';
    _messages.add(AiMessageModel.greeting(greeting));
    notifyListeners();
  }

  /// Envía un mensaje del usuario y agrega la respuesta de Ofi.
  Future<void> send(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _isLoading) return;

    _messages.add(AiMessageModel.user(trimmed));
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final reply = await _repo.sendMessage(
        message: trimmed,
        history: _recentHistory(),
        providerType: providerType,
        context: context,
      );
      _messages.add(AiMessageModel.ofi(reply.reply));
    } on SessionExpiredException catch (e) {
      // 401: no agregamos burbuja de error; flageamos para que la UI avise
      // y cierre sesión. El `finally` notifica.
      _flagSessionExpired(e.message);
    } on AiAssistantException catch (e) {
      _error = e.message;
      _messages.add(AiMessageModel.error(e.message));
    } catch (_) {
      _error = 'Ocurrió un error inesperado. Intenta de nuevo.';
      _messages.add(AiMessageModel.error(_error!));
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Limpia la conversación y vuelve a sembrar el saludo.
  void reset() {
    _messages.clear();
    _error = null;
    _isLoading = false;
    seedGreeting();
  }

  /// Conecta el [AuthProvider] global para (a) limpiar el chat al cerrar
  /// sesión — independencia de cuentas — y (b) que la UI pueda hacer logout.
  void attachAuth(AuthProvider auth) {
    if (identical(_auth, auth)) return;
    _auth?.removeListener(_onAuthChanged);
    _auth = auth;
    _auth!.addListener(_onAuthChanged);
  }

  void _onAuthChanged() {
    // Al cerrar sesión, descartamos el historial del usuario anterior.
    if (_auth != null && !_auth!.isAuthenticated) clear();
  }

  /// Carga el historial del backend (cross-device) y puebla los mensajes.
  /// Best-effort: si falla (red/servidor) mantiene el saludo local; un 401
  /// se trata como sesión expirada.
  Future<void> loadHistory() async {
    try {
      final history = await _repo.fetchHistory();
      if (history.isNotEmpty) {
        _messages
          ..clear()
          ..addAll(history);
        _error = null;
        _safeNotify();
      }
    } on SessionExpiredException catch (e) {
      _flagSessionExpired(e.message);
      _safeNotify();
    } catch (_) {
      // Historial es opcional: no rompemos la pantalla si falla.
    }
  }

  /// Marca sesión expirada (lo consume la UI para mostrar el SnackBar).
  void _flagSessionExpired(String message) {
    _error = message;
    _sessionExpired = true;
  }

  /// La UI confirma que ya mostró el aviso de sesión expirada.
  void acknowledgeSessionExpired() {
    _sessionExpired = false;
  }

  /// Limpia todo el estado (logout / cambio de cuenta).
  void clear() {
    _messages.clear();
    _error = null;
    _isLoading = false;
    _sessionExpired = false;
    _safeNotify();
  }

  void _safeNotify() {
    if (_disposed) return;
    notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _auth?.removeListener(_onAuthChanged);
    super.dispose();
  }

  /// Historial reciente excluyendo el mensaje actual (último user), los
  /// errores y los mensajes locales (saludo). Tope: [_historyCap] turnos.
  List<AiHistoryTurn> _recentHistory() {
    final turns = _messages
        .where((m) => !m.local && !m.isError)
        .map(
          (m) => AiHistoryTurn(role: m.isUser ? 'user' : 'model', text: m.text),
        )
        .toList();

    // El último turno es el mensaje actual del usuario → no va en historial.
    if (turns.isNotEmpty && turns.last.role == 'user') {
      turns.removeLast();
    }
    if (turns.length > _historyCap) {
      return turns.sublist(turns.length - _historyCap);
    }
    return turns;
  }
}
