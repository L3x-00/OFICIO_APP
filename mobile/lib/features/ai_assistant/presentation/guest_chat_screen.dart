import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../domain/ai_message_model.dart';

/// Preguntas frecuentes del MODO INVITADO. Respuestas 100% locales (Dart),
/// SIN llamar al backend ni gastar cuota de IA. La IA completa y personalizada
/// queda detrás del login.
const Map<String, String> kGuestFaq = {
  '¿Qué es Servi?':
      'Servi es un marketplace de servicios locales del Perú. Conecta a clientes '
      'con profesionales y negocios verificados de tu ciudad: electricistas, '
      'gasfiteros, peluquerías, restaurantes y mucho más.',
  '¿Cómo contratar?':
      'Busca el servicio que necesitas, revisa el perfil del proveedor (reseñas, '
      'sello y ubicación) y contáctalo directo por WhatsApp o teléfono. Para el '
      'cliente, Servi es gratis y sin comisiones.',
  '¿Planes y precios?':
      'Para clientes, Servi es totalmente gratis. Los proveedores eligen una '
      'suscripción (Gratis, Estándar o Premium): a mayor plan, más visibilidad '
      'y más especialidades publicables.',
  'Sello Confiable':
      'El Sello Confiable marca a los proveedores verificados por Servi: identidad '
      'validada y buen historial. Búscalo en el perfil para contratar con '
      'tranquilidad.',
  'Sistema de Monedas':
      'Las Monedas son créditos dentro de Servi que ganas al referir amigos y usar '
      'la app. Te dan beneficios y descuentos en la plataforma.',
  '¿Cómo publico mi servicio?':
      'Regístrate como proveedor (Oficio o Negocio), completa tu perfil, elige tus '
      'especialidades y publícalo. Tras la verificación, tu servicio aparece en '
      'las búsquedas de los clientes.',
};

/// Chat de "Ofi" para usuarios NO autenticados.
///
/// Muestra 6 chips de preguntas frecuentes; al tocar uno responde con un
/// mensaje local de Ofi (mapa estático [kGuestFaq], sin red). Abajo, un CTA
/// invita a iniciar sesión para desbloquear la IA completa.
class GuestChatScreen extends StatefulWidget {
  const GuestChatScreen({super.key});

  @override
  State<GuestChatScreen> createState() => _GuestChatScreenState();
}

class _GuestChatScreenState extends State<GuestChatScreen> {
  final _scroll = ScrollController();

  final List<AiMessageModel> _messages = [
    AiMessageModel.greeting(
      '¡Hola! Soy Ofi 🤖 Como invitado puedo responder preguntas frecuentes '
      'sobre Servi. Toca una opción para empezar.',
    ),
  ];

  void _ask(String question) {
    final answer = kGuestFaq[question];
    if (answer == null) return;
    setState(() {
      _messages.add(AiMessageModel.user(question));
      _messages.add(AiMessageModel.ofi(answer));
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOut,
      );
    });
  }

  void _goToLogin() {
    // Pantalla abierta con Navigator.push (MaterialPageRoute). Capturamos el
    // GoRouter ANTES de hacer pop para no usar un context desactivado.
    final router = GoRouter.of(context);
    if (Navigator.of(context).canPop()) Navigator.of(context).pop();
    router.go('/login');
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bgCard,
        elevation: 0,
        titleSpacing: 0,
        title: Row(
          children: [
            const _OfiAvatar(size: 38),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Ofi',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  'Modo invitado',
                  style: TextStyle(color: c.textMuted, fontSize: 12),
                ),
              ],
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                controller: _scroll,
                padding: const EdgeInsets.fromLTRB(12, 16, 12, 12),
                children: [
                  for (final m in _messages) _GuestBubble(message: m),
                  const SizedBox(height: 12),
                  _FaqChips(onTap: _ask),
                ],
              ),
            ),
            _GuestCta(onLogin: _goToLogin),
          ],
        ),
      ),
    );
  }
}

/// Sección con los 6 chips de preguntas frecuentes.
class _FaqChips extends StatelessWidget {
  final ValueChanged<String> onTap;
  const _FaqChips({required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            'Preguntas frecuentes',
            style: TextStyle(
              color: c.textMuted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.4,
            ),
          ),
        ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final q in kGuestFaq.keys)
              Material(
                color: Color.alphaBlend(
                  AppColors.amber.withValues(alpha: 0.12),
                  c.bgCard,
                ),
                borderRadius: BorderRadius.circular(20),
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => onTap(q),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 9,
                    ),
                    child: Text(
                      q,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// Banner inferior: invita a iniciar sesión / registrarse.
class _GuestCta extends StatelessWidget {
  final VoidCallback onLogin;
  const _GuestCta({required this.onLogin});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      decoration: BoxDecoration(
        color: c.bgCard,
        border: Border(top: BorderSide(color: c.border)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(
                Icons.lock_outline_rounded,
                size: 16,
                color: AppColors.amber,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Inicia sesión o regístrate para hablar con la IA completa y '
                  'personalizada.',
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 13,
                    height: 1.3,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: onLogin,
              icon: const Icon(Icons.login_rounded, size: 18),
              label: const Text('Iniciar sesión / Registrarme'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                textStyle: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Burbuja de mensaje del modo invitado (Ofi izquierda ámbar, usuario derecha).
class _GuestBubble extends StatelessWidget {
  final AiMessageModel message;
  const _GuestBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final isUser = message.isUser;
    final Color bg = isUser
        ? AppColors.primary
        : Color.alphaBlend(AppColors.amber.withValues(alpha: 0.10), c.bgCard);
    final Color fg = isUser ? Colors.white : c.textPrimary;

    final bubble = Container(
      constraints: BoxConstraints(
        maxWidth: MediaQuery.of(context).size.width * 0.76,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(16),
          topRight: const Radius.circular(16),
          bottomLeft: Radius.circular(isUser ? 16 : 4),
          bottomRight: Radius.circular(isUser ? 4 : 16),
        ),
      ),
      child: Text(
        message.text,
        style: TextStyle(color: fg, fontSize: 15, height: 1.35),
      ),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: isUser
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            const _OfiAvatar(size: 28),
            const SizedBox(width: 8),
          ],
          Flexible(child: bubble),
        ],
      ),
    );
  }
}

/// Avatar circular de Ofi (ámbar + smart_toy).
class _OfiAvatar extends StatelessWidget {
  final double size;
  const _OfiAvatar({this.size = 32});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [AppColors.amber, AppColors.amberDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Icon(
        Icons.smart_toy_rounded,
        color: Colors.black,
        size: size * 0.58,
      ),
    );
  }
}
