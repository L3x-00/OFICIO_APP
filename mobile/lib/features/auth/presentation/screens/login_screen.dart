import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/social_login_button.dart';
import '../../../../core/social_auth_service.dart';
import 'forgot_password_screen.dart';
import 'otp_verification_screen.dart';
import 'package:mobile/features/provider_dashboard/presentation/widgets/settings/legal_content.dart';

enum AuthMode { login, register }

class LoginScreen extends StatefulWidget {
  final AuthMode initialMode;

  const LoginScreen({super.key, this.initialMode = AuthMode.register});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  late AuthMode _mode;
  late final AnimationController _animController;
  late final Animation<double> _fadeAnim;

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _password2Controller = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscurePassword2 = true;
  bool _acceptedTerms = false;
  bool _rememberSession = false;
  String? _passwordMismatch;

  /// True durante todo el flujo de login social (selector de cuenta
  /// Google → Firebase → backend). Bloquea el botón de Google y el
  /// botón principal "Crear mi cuenta"/"Ingresar" para evitar el
  /// doble-tap durante el delay del picker — el bug reportado.
  bool _socialBusy = false;

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeIn);
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _password2Controller.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    super.dispose();
  }

  void _switchMode(AuthMode mode) {
    _animController.reverse().then((_) {
      setState(() {
        _mode = mode;
        _passwordMismatch = null;
        _acceptedTerms = false;
      });
      _animController.forward();
    });
  }

  Future<void> _submit() async {
    final auth = context.read<AuthProvider>();

    if (_mode == AuthMode.register) {
      if (_passwordController.text != _password2Controller.text) {
        setState(() => _passwordMismatch = 'Las contraseñas no coinciden');
        return;
      }
      if (!_acceptedTerms) {
        context.showWarningSnack(
          'Debes aceptar los Términos y Condiciones para continuar',
        );
        return;
      }
      setState(() => _passwordMismatch = null);

      final ok = await auth.register(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
      );

      if (ok && mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const OtpVerificationScreen()),
        );
      } else if (!ok && mounted) {
        final error = auth.error ?? 'Error al registrarse';
        context.showErrorSnack(error);
        // Cuenta ya existe → llevar a login
        if (_isConflictError(error)) {
          _switchMode(AuthMode.login);
        }
      }
    } else {
      final ok = await auth.login(
        _emailController.text.trim(),
        _passwordController.text,
        rememberSession: _rememberSession,
      );

      if (ok && mounted) {
        if (auth.savedAccountLimitReached) {
          auth.clearSavedAccountLimitFlag();
          context.showWarningSnack(
            'Sesión iniciada. Límite de 3 cuentas guardadas alcanzado — elimina una desde tu perfil.',
          );
        }
        Navigator.of(context).popUntil((route) => route.isFirst);
      } else if (!ok && mounted) {
        final error = auth.error ?? 'Correo o contraseña incorrectos';
        context.showErrorSnack(error);
        // Correo no registrado → llevar a registro
        if (_isNotRegisteredError(error)) {
          _switchMode(AuthMode.register);
        }
      }
    }
  }

  /// Detecta errores de correo no registrado (404 del backend)
  bool _isNotRegisteredError(String error) {
    final lower = error.toLowerCase();
    return lower.contains('no registrado') ||
        lower.contains('no está registrado') ||
        lower.contains('no encontrado');
  }

  /// Detecta errores de cuenta ya existente (409 del backend)
  bool _isConflictError(String error) {
    final lower = error.toLowerCase();
    return lower.contains('ya tienes una cuenta') ||
        lower.contains('ya está registrado') ||
        lower.contains('ya existe una cuenta');
  }

  void _showForgotPassword() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()));
  }

  Future<void> _handleGoogleLogin() async {
    // Guard de re-entrada: si ya hay un flujo social en curso, ignora
    // el tap. Cubre el caso del doble-tap rapidísimo antes de que el
    // setState propague el disabled al botón.
    if (_socialBusy) return;
    final auth = context.read<AuthProvider>();

    setState(() => _socialBusy = true);
    try {
      final outcome = await SocialAuthService.signInWithGoogle();

      if (!mounted) return;

      if (outcome.isCancelled) return; // el usuario canceló — sin feedback

      if (outcome.isError) {
        context.showErrorSnack(
          outcome.errorMessage ?? 'Error en inicio de sesión social',
        );
        return;
      }

      final ok = await auth.loginWithSocial(outcome.idToken!);

      if (!mounted) return;
      if (ok) {
        Navigator.of(context).popUntil((route) => route.isFirst);
      } else {
        final error = auth.error ?? 'Error en inicio de sesión social';
        context.showErrorSnack(error);
        // Cuenta ya existe con contraseña → llevar a login manual
        if (_isConflictError(error)) {
          _switchMode(AuthMode.login);
        }
      }
    } finally {
      // Libera el flag pase lo que pase (éxito, error, cancel). Si el
      // login tuvo éxito ya navegamos fuera, pero el `mounted` guard
      // evita setState sobre un widget desmontado.
      if (mounted) setState(() => _socialBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final theme = context.watch<ThemeProvider>();
    final isRegister = _mode == AuthMode.register;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: c.textSecondary),
        actions: [
          IconButton(
            tooltip: theme.isDark
                ? 'Cambiar a tema claro'
                : 'Cambiar a tema oscuro',
            icon: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              transitionBuilder: (child, anim) => RotationTransition(
                turns: anim,
                child: FadeTransition(opacity: anim, child: child),
              ),
              child: Icon(
                theme.isDark
                    ? Icons.light_mode_rounded
                    : Icons.dark_mode_rounded,
                key: ValueKey(theme.isDark),
                color: AppColors.amber,
                size: 22,
              ),
            ),
            onPressed: theme.toggle,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnim,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 4, 24, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Logo de marca ───────────────────────────
                Center(
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(c.isDark ? 20 : 0),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.amber.withValues(alpha: 0.18),
                          blurRadius: 28,
                          spreadRadius: 2,
                        ),
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          blurRadius: 36,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(c.isDark ? 20 : 0),
                      child: Image.asset(
                        c.isDark
                            ? 'assets/images/logo/servi.png'
                            : 'assets/images/logo/servi.png',
                        width: isRegister ? 64 : 76,
                        height: isRegister ? 64 : 76,
                        filterQuality: FilterQuality.high,
                      ),
                    ),
                  ),
                ),
                SizedBox(height: isRegister ? 16 : 20),

                // ── Badge de contexto (solo en login) ──────
                if (!isRegister) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.3),
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.person_rounded,
                          color: AppColors.primary,
                          size: 13,
                        ),
                        SizedBox(width: 5),
                        Text(
                          'Ingresando como Cliente',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // ── Título ──────────────────────────────────
                Text(
                  isRegister
                      ? 'Crea tu cuenta\npara empezar'
                      : '¡Bienvenido\nde nuevo!',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  isRegister
                      ? 'Tu comunidad, en quien confiar — gratis'
                      : 'El experto que buscas, en quien puedes confiar',
                  style: TextStyle(color: c.textSecondary, fontSize: 14),
                ),
                const SizedBox(height: 28),

                // ── Botón de inicio de sesión con Google ─────
                SocialLoginButton(
                  provider: SocialProvider.google,
                  busy: _socialBusy,
                  onTap: () => _handleGoogleLogin(),
                ),
                const SizedBox(height: 20),
                // Divisor
                Row(
                  children: [
                    Expanded(child: Divider(color: c.border, thickness: 1)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text(
                        isRegister
                            ? 'O regístrate con tu correo'
                            : 'O ingresa con tu correo',
                        style: TextStyle(color: c.textMuted, fontSize: 12),
                      ),
                    ),
                    Expanded(child: Divider(color: c.border, thickness: 1)),
                  ],
                ),
                const SizedBox(height: 20),

                // ── Campos nombre (solo en registro) ────────
                if (isRegister) ...[
                  Row(
                    children: [
                      Expanded(
                        child: _Field(
                          controller: _firstNameController,
                          label: 'Nombre',
                          icon: Icons.person_outline,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _Field(
                          controller: _lastNameController,
                          label: 'Apellido',
                          icon: Icons.person_outline,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                ],

                // ── Email ───────────────────────────────────
                _Field(
                  controller: _emailController,
                  label: 'Correo electrónico',
                  icon: Icons.email_outlined,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 14),

                // ── Contraseña ──────────────────────────────
                _Field(
                  controller: _passwordController,
                  label: 'Contraseña',
                  icon: Icons.lock_outline,
                  obscureText: _obscurePassword,
                  suffixIcon: _ToggleVisibilityButton(
                    isObscure: _obscurePassword,
                    onToggle: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),

                // ── Enlace ¿Olvidaste tu contraseña? (solo login) ──
                if (!isRegister) ...[
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: GestureDetector(
                      onTap: _showForgotPassword,
                      child: const Text(
                        '¿Olvidaste tu contraseña?',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  // ── Checkbox "Mantener sesión" ─────────────
                  GestureDetector(
                    onTap: () =>
                        setState(() => _rememberSession = !_rememberSession),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: Checkbox(
                            value: _rememberSession,
                            onChanged: (v) =>
                                setState(() => _rememberSession = v ?? false),
                            activeColor: AppColors.primary,
                            checkColor: Colors.white,
                            side: BorderSide(color: c.textMuted, width: 1.5),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4),
                            ),
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Mantener sesión iniciada en este dispositivo',
                            style: TextStyle(color: c.textMuted, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // ── Confirmar contraseña (solo registro) ────
                if (isRegister) ...[
                  const SizedBox(height: 14),
                  _Field(
                    controller: _password2Controller,
                    label: 'Confirmar contraseña',
                    icon: Icons.lock_outline,
                    obscureText: _obscurePassword2,
                    errorText: _passwordMismatch,
                    suffixIcon: _ToggleVisibilityButton(
                      isObscure: _obscurePassword2,
                      onToggle: () => setState(
                        () => _obscurePassword2 = !_obscurePassword2,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Checkbox de términos y condiciones
                  _TermsCheckbox(
                    value: _acceptedTerms,
                    onChanged: (v) =>
                        setState(() => _acceptedTerms = v ?? false),
                  ),
                ],

                const SizedBox(height: 28),

                // ── Botón principal ─────────────────────────
                Consumer<AuthProvider>(
                  builder: (_, auth, _) {
                    // Deshabilitado si: el provider está en loading (submit
                    // normal en curso) O hay un flujo social activo — esto
                    // último cierra la ventana de doble-tap reportada.
                    final busy = auth.isLoading || _socialBusy;
                    return SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: busy ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: auth.isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(
                                isRegister ? 'Crear mi cuenta' : 'Ingresar',
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 20),

                // ── Switch login / registro ─────────────────
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      isRegister
                          ? '¿Ya tienes cuenta? '
                          : '¿No tienes cuenta? ',
                      style: TextStyle(color: c.textMuted, fontSize: 13),
                    ),
                    GestureDetector(
                      onTap: () => _switchMode(
                        isRegister ? AuthMode.login : AuthMode.register,
                      ),
                      child: Text(
                        isRegister ? 'Inicia sesión' : 'Regístrate gratis',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Checkbox de términos y condiciones ──────────────────

class _TermsCheckbox extends StatelessWidget {
  final bool value;
  final ValueChanged<bool?> onChanged;

  const _TermsCheckbox({required this.value, required this.onChanged});

  // Modificado: Ahora recibe el título y el contenido dinámicamente
  void _openLegalModal(BuildContext context, String title, String content) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _TermsModal(title: title, content: content),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => onChanged(!value),
          child: SizedBox(
            width: 20,
            height: 20,
            child: Checkbox(
              value: value,
              onChanged: onChanged,
              activeColor: AppColors.primary,
              checkColor: Colors.white,
              side: BorderSide(color: c.textMuted, width: 1.5),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4),
              ),
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: GestureDetector(
            onTap: () => onChanged(!value),
            child: RichText(
              text: TextSpan(
                style: TextStyle(color: c.textMuted, fontSize: 12, height: 1.5),
                children: [
                  const TextSpan(text: 'Acepto los '),
                  WidgetSpan(
                    alignment: PlaceholderAlignment.baseline,
                    baseline: TextBaseline.alphabetic,
                    child: GestureDetector(
                      // 👉 Llama al modal con los TÉRMINOS DEL CLIENTE
                      onTap: () => _openLegalModal(
                        context,
                        'Términos y Condiciones',
                        kTermsCliente,
                      ),
                      child: const Text(
                        'Términos y Condiciones',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                          height: 1.5,
                          decoration: TextDecoration.underline,
                          decorationColor: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const TextSpan(text: ' y la '),
                  WidgetSpan(
                    alignment: PlaceholderAlignment.baseline,
                    baseline: TextBaseline.alphabetic,
                    child: GestureDetector(
                      // 👉 Llama al modal con la PRIVACIDAD DEL CLIENTE
                      onTap: () => _openLegalModal(
                        context,
                        'Política de Privacidad',
                        kPrivacyCliente,
                      ),
                      child: const Text(
                        'Política de Privacidad',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                          height: 1.5,
                          decoration: TextDecoration.underline,
                          decorationColor: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const TextSpan(text: ' de Servi.'),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ── Modal de Términos y Condiciones ──────────────────────────

class _TermsModal extends StatelessWidget {
  final String title;
  final String content;

  // Modificado: Ahora requiere título y contenido por parámetro
  const _TermsModal({required this.title, required this.content});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollController) => Container(
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // ── Handle ─────────────────────────────────────
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 8),
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: c.textMuted.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // ── Header ─────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 4, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title, // 👉 Título dinámico
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: c.textMuted),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // ── Contenido scrollable ────────────────────────
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
                child: Text(
                  content, // 👉 Contenido dinámico
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 13,
                    height: 1.7,
                  ),
                ),
              ),
            ),

            // ── Botón cerrar ────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
                    'Entendido',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Campo de texto reutilizable ─────────────────────────

class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final TextInputType? keyboardType;
  final bool obscureText;
  final Widget? suffixIcon;
  final String? errorText;

  const _Field({
    required this.controller,
    required this.label,
    required this.icon,
    this.keyboardType,
    this.obscureText = false,
    this.suffixIcon,
    this.errorText,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      style: TextStyle(color: c.textPrimary, fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        errorText: errorText,
        labelStyle: TextStyle(color: c.textMuted, fontSize: 13),
        prefixIcon: Icon(icon, color: c.textMuted, size: 20),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: c.bgCard,
        errorStyle: const TextStyle(color: AppColors.busy, fontSize: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.busy, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.busy, width: 1.5),
        ),
      ),
    );
  }
}

class _ToggleVisibilityButton extends StatelessWidget {
  final bool isObscure;
  final VoidCallback onToggle;

  const _ToggleVisibilityButton({
    required this.isObscure,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return IconButton(
      icon: Icon(
        isObscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
        color: c.textMuted,
        size: 20,
      ),
      onPressed: onToggle,
    );
  }
}
