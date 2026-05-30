import 'package:flutter/foundation.dart';
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

  /// Máximo de turnos de historial que el cliente adjunta como respaldo
  /// (el backend recupera el historial real de BD; esto es fallback).
  static const int _historyCap = 8;

  AiAssistantProvider({AiAssistantRepository? repo, this.providerType})
    : _repo = repo ?? AiAssistantRepository();

  final List<AiMessageModel> _messages = [];
  bool _isLoading = false;
  String? _error;

  List<AiMessageModel> get messages => List.unmodifiable(_messages);
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasMessages => _messages.isNotEmpty;

  /// Inserta el saludo inicial de Ofi (solo una vez).
  void seedGreeting() {
    if (_messages.isNotEmpty) return;
    _messages.add(
      AiMessageModel.greeting(
        '¡Hola! 👋 Soy Ofi, tu asistente de Servi. '
        'Puedo ayudarte a encontrar proveedores, explicarte cómo funciona '
        'la app y más. ¿En qué te ayudo?',
      ),
    );
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
      );
      _messages.add(AiMessageModel.ofi(reply.reply));
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
