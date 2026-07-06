import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/auth/presentation/screens/onboarding/onboarding_screen.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class OtpVerificationScreen extends StatefulWidget {
  const OtpVerificationScreen({super.key});

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final List<TextEditingController> _controllers = List.generate(
    6,
    (_) => TextEditingController(),
  );
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _fullCode => _controllers.map((c) => c.text).join();

  bool get _isComplete => _fullCode.length == 6;

  Future<void> _verify() async {
    if (!_isComplete) return;

    final authProvider = context.read<AuthProvider>();
    // Capturamos el navegador RAÍZ antes del await.
    // Esto evita que pierda el contexto si el router nos saca de esta pantalla.
    final rootNav = Navigator.of(context, rootNavigator: true);

    final success = await authProvider.verifyOtp(_fullCode);

    if (success) {
      // Mostramos un OVERLAY (no una ruta del Navigator) sobre el navegador
      // raíz. Antes era un showDialog: al cambiar el estado de auth, GoRouter
      // redirigía a /onboarding y LIMPIABA las rutas imperativas → el modal
      // "Código verificado" aparecía un instante y se ocultaba solo. El
      // overlay no es una ruta, así que sobrevive a la redirección y espera
      // a que el usuario pulse "Siguiente".
      _showSuccessOverlay(rootNav);
    } else {
      // Si falló, mostramos el error que guardó el provider
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.error ?? 'Código incorrecto'),
          backgroundColor: Colors.red,
        ),
      );
      // Limpiar los cuadritos para reintentar
      for (var controller in _controllers) {
        controller.clear();
      }
      _focusNodes[0].requestFocus();
    }
  }

  /// Muestra la confirmación como OverlayEntry sobre el overlay del navegador
  /// raíz. Sobrevive a la redirección de GoRouter a /onboarding (la pantalla
  /// de rol queda debajo). Se cierra solo al pulsar "Siguiente".
  void _showSuccessOverlay(NavigatorState rootNav) {
    final overlay = rootNav.overlay;
    if (overlay == null) return;
    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (_) => _OtpSuccessOverlay(onNext: () => entry.remove()),
    );
    overlay.insert(entry);
  }

  Future<void> _resend() async {
    final auth = context.read<AuthProvider>();
    final ok = await auth.resendOtp();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          ok
              ? 'Código reenviado al email registrado'
              : (auth.error ?? 'Error al reenviar'),
        ),
        backgroundColor: ok ? AppColors.available : AppColors.busy,
        duration: const Duration(seconds: 3),
      ),
    );
    if (ok) {
      for (final c in _controllers) {
        c.clear();
      }
      _focusNodes.first.requestFocus();
    }
  }

  void _onDigitInput(String value, int index) {
    if (value.length == 1 && index < 5) {
      _focusNodes[index + 1].requestFocus();
    } else if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final isLoading = context.select<AuthProvider, bool>((a) => a.isLoading);
    final email = context.select<AuthProvider, String>(
      (a) => a.pendingEmail ?? a.user?.email ?? '',
    );

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: c.textSecondary),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () {
            // 1. Limpiamos el ID de registro pendiente en el Provider
            context.read<AuthProvider>().clearPendingRegistration();
            // 2. Volvemos a la pantalla anterior
            Navigator.pop(context);
          },
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Icono ─────────────────────────────────────
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.mark_email_read_rounded,
                    color: AppColors.primary,
                    size: 38,
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // ── Título ─────────────────────────────────────
              Text(
                'Verifica tu email',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              RichText(
                text: TextSpan(
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 14,
                    height: 1.5,
                  ),
                  children: [
                    const TextSpan(
                      text: 'Hemos enviado un código de 6 dígitos a ',
                    ),
                    TextSpan(
                      text: email,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    const TextSpan(text: '. Ingresa el código a continuación.'),
                  ],
                ),
              ),
              const SizedBox(height: 36),

              // ── Campos OTP ─────────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(
                  6,
                  (i) => _OtpBox(
                    controller: _controllers[i],
                    focusNode: _focusNodes[i],
                    onChanged: (v) => _onDigitInput(v, i),
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // ── Botón verificar ────────────────────────────
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: (isLoading || !_isComplete) ? null : _verify,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Verificar',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 20),

              // ── Reenviar código ────────────────────────────
              Center(
                child: GestureDetector(
                  onTap: isLoading ? null : _resend,
                  child: RichText(
                    text: TextSpan(
                      style: TextStyle(color: c.textMuted, fontSize: 14),
                      children: const [
                        TextSpan(text: '¿No recibiste el código? '),
                        TextSpan(
                          text: 'Reenviar',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Caja individual para un dígito del OTP ────────────────

class _OtpBox extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;

  const _OtpBox({
    required this.controller,
    required this.focusNode,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SizedBox(
      width: 46,
      height: 56,
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        textAlign: TextAlign.center,
        keyboardType: TextInputType.number,
        maxLength: 1,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        style: TextStyle(
          color: c.textPrimary,
          fontSize: 22,
          fontWeight: FontWeight.bold,
        ),
        decoration: InputDecoration(
          counterText: '',
          filled: true,
          fillColor: c.bgCard,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.primary, width: 2),
          ),
        ),
        onChanged: onChanged,
      ),
    );
  }
}

/// Overlay de éxito de verificación OTP. No es una ruta del Navigator, por lo
/// que la redirección de GoRouter a /onboarding no lo descarta: se queda
/// visible hasta que el usuario pulsa "Siguiente".
class _OtpSuccessOverlay extends StatelessWidget {
  final VoidCallback onNext;
  const _OtpSuccessOverlay({required this.onNext});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Material(
      color: Colors.black54,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Container(
            padding: const EdgeInsets.all(24),
            constraints: const BoxConstraints(maxWidth: 360),
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.available.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.check_circle_outline,
                    color: AppColors.tintOn(AppColors.available, c.isDark),
                    size: 34,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Código verificado',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: c.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Tu correo ha sido validado correctamente.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: c.textSecondary),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: onNext,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Siguiente',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
