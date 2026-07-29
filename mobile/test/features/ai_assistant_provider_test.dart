import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/ai_assistant/data/ai_assistant_repository.dart';
import 'package:mobile/features/ai_assistant/presentation/ai_assistant_provider.dart';

class _FakeRepository extends AiAssistantRepository {
  bool startedNewChat = false;
  AiChatReply? nextReply;

  @override
  Future<void> startNewChat() async {
    startedNewChat = true;
  }

  @override
  Future<AiChatReply> sendMessage({
    required String message,
    List<AiHistoryTurn>? history,
    String? providerType,
    String? context,
  }) async {
    return nextReply ??
        const AiChatReply(
          reply: 'Respuesta de prueba',
          promptVersion: 'v2',
          blocked: false,
        );
  }
}

void main() {
  test(
    'nuevo chat crea conversación remota y reinicia el contador local',
    () async {
      final repo = _FakeRepository();
      final provider = AiAssistantProvider(repo: repo);
      provider.seedGreeting();

      await provider.startNewChat();

      expect(repo.startedNewChat, isTrue);
      expect(provider.messageCount, 0);
      expect(provider.messages, hasLength(1));
      expect(provider.messages.single.local, isTrue);
    },
  );

  test('soporte conserva acciones oficiales en la respuesta de Ofi', () async {
    final repo = _FakeRepository()
      ..nextReply = AiChatReply.fromJson({
        'reply': 'Te conecto con soporte.',
        'supportActions': [
          {
            'kind': 'whatsapp',
            'label': 'Escribir por WhatsApp',
            'href': 'https://wa.me/51930759515?text=Hola',
          },
          {
            'kind': 'email',
            'label': 'Enviar correo a soporte',
            'href': 'mailto:soporteofiapp@gmail.com',
          },
        ],
        'meta': {'promptVersion': 'v2', 'blocked': false},
      });
    final provider = AiAssistantProvider(repo: repo);

    await provider.send('Necesito soporte con mi cuenta');

    final response = provider.messages.last;
    expect(response.hasSupportActions, isTrue);
    expect(response.supportActions, hasLength(2));
    expect(response.supportActions!.first.href, contains('51930759515'));
    expect(
      response.supportActions!.last.href,
      'mailto:soporteofiapp@gmail.com',
    );
  });
}
