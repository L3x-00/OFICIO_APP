import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

enum AuthMode { login, register }

class LoginScreen extends StatefulWidget {
  final AuthMode initialMode;

  const LoginScreen({
    super.key,
    this.initialMode = AuthMode.register,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  late AuthMode _mode;
  late final AnimationController _animController;
  late final Animation<double> _fadeAnim;

  final _emailController     = TextEditingController();
  final _passwordController  = TextEditingController();
  final _password2Controller = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController  = TextEditingController();

  bool _obscurePassword  = true;
  bool _obscurePassword2 = true;
  bool _acceptedTerms    = false;
  bool _rememberSession  = false;
  String? _passwordMismatch;

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _fadeAnim = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeIn,
    );
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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Debes aceptar los Términos y Condiciones para continuar'),
            backgroundColor: AppColors.busy,
          ),
        );
        return;
      }
      setState(() => _passwordMismatch = null);

      final ok = await auth.register(
        email:     _emailController.text.trim(),
        password:  _passwordController.text,
        firstName: _firstNameController.text.trim(),
        lastName:  _lastNameController.text.trim(),
      );

      if (ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Cuenta creada! Elige tu rol para continuar.'),
            backgroundColor: AppColors.available,
            duration: Duration(seconds: 3),
          ),
        );
        Navigator.of(context).popUntil((route) => route.isFirst);
      } else if (!ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.error ?? 'Error al registrarse'),
            backgroundColor: AppColors.busy,
          ),
        );
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
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Sesión iniciada. Límite de 3 cuentas guardadas alcanzado — elimina una desde tu perfil.',
              ),
              backgroundColor: AppColors.amber,
              duration: Duration(seconds: 5),
            ),
          );
        }
        Navigator.of(context).popUntil((route) => route.isFirst);
      } else if (!ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.error ?? 'Correo o contraseña incorrectos'),
            backgroundColor: AppColors.busy,
          ),
        );
      }
    }
  }

  void _showForgotPassword() {
    final c = context.colors;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Recuperar contraseña',
          style: TextStyle(color: c.textPrimary, fontSize: 18),
        ),
        content: Text(
          'Pronto podrás recuperar tu contraseña por correo electrónico. Esta función estará disponible muy pronto.',
          style: TextStyle(color: c.textSecondary, fontSize: 14, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Entendido',
                style: TextStyle(color: AppColors.primary)),
          ),
        ],
      ),
    );
  }

  void _socialLoginPlaceholder(String provider) {
    final c = context.colors;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Inicio con $provider próximamente'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: c.bgCard,
      ),
    );
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
            tooltip: theme.isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
            icon: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              transitionBuilder: (child, anim) => RotationTransition(
                turns: anim,
                child: FadeTransition(opacity: anim, child: child),
              ),
              child: Icon(
                theme.isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
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
                      borderRadius:
                          BorderRadius.circular(c.isDark ? 20 : 0),
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
                      borderRadius:
                          BorderRadius.circular(c.isDark ? 20 : 0),
                      child: Image.asset(
                        c.isDark
                            ? 'assets/images/logo/logo_dark.png'
                            : 'assets/images/logo/logo_light.png',
                        width:  isRegister ? 64 : 76,
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
                        horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: AppColors.primary.withOpacity(0.3)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.person_rounded,
                            color: AppColors.primary, size: 13),
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
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 28),

                // ── Botones de login social (solo en registro) ──
                if (isRegister) ...[
                  _SocialButton(
                    label: 'Continuar con Google',
                    brandLetter: 'G',
                    brandColor: AppColors.google,
                    onTap: () => _socialLoginPlaceholder('Google'),
                  ),
                  const SizedBox(height: 10),
                  _SocialButton(
                    label: 'Continuar con Facebook',
                    brandLetter: 'f',
                    brandColor: AppColors.facebook,
                    onTap: () => _socialLoginPlaceholder('Facebook'),
                  ),
                  const SizedBox(height: 20),
                  // Divisor "O regístrate con tu correo"
                  Row(
                    children: [
                      Expanded(
                        child: Divider(
                          color: c.border,
                          thickness: 1,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text(
                          'O regístrate con tu correo',
                          style: TextStyle(
                            color: c.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Divider(
                          color: c.border,
                          thickness: 1,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                ],

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
                            onChanged: (v) => setState(
                                () => _rememberSession = v ?? false),
                            activeColor: AppColors.primary,
                            checkColor: Colors.white,
                            side: BorderSide(
                                color: c.textMuted, width: 1.5),
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
                            style: TextStyle(
                              color: c.textMuted,
                              fontSize: 13,
                            ),
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
                          () => _obscurePassword2 = !_obscurePassword2),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Checkbox de términos y condiciones
                  _TermsCheckbox(
                    value: _acceptedTerms,
                    onChanged: (v) => setState(() => _acceptedTerms = v ?? false),
                  ),
                ],

                const SizedBox(height: 28),

                // ── Botón principal ─────────────────────────
                Consumer<AuthProvider>(
                  builder: (_, auth, __) => SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: auth.isLoading ? null : _submit,
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
                  ),
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
                      style: TextStyle(
                          color: c.textMuted, fontSize: 13),
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

// ─── Botón de login social ────────────────────────────────

class _SocialButton extends StatelessWidget {
  final String label;
  final String brandLetter;
  final Color brandColor;
  final VoidCallback onTap;

  const _SocialButton({
    required this.label,
    required this.brandLetter,
    required this.brandColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: c.border),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Ícono de marca
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: brandColor,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  brandLetter,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
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

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
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
          const SizedBox(width: 10),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: TextStyle(
                  color: c.textMuted,
                  fontSize: 12,
                  height: 1.5,
                ),
                children: const [
                  TextSpan(text: 'Acepto los '),
                  TextSpan(
                    text: 'Términos y Condiciones',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  TextSpan(text: ' y la '),
                  TextSpan(
                    text: 'Política de Privacidad',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  TextSpan(text: ' de ConfiServ.'),
                ],
              ),
            ),
          ),
        ],
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
      controller:   controller,
      keyboardType: keyboardType,
      obscureText:  obscureText,
      style: TextStyle(color: c.textPrimary, fontSize: 15),
      decoration: InputDecoration(
        labelText:  label,
        errorText:  errorText,
        labelStyle: TextStyle(color: c.textMuted, fontSize: 13),
        prefixIcon: Icon(icon, color: c.textMuted, size: 20),
        suffixIcon: suffixIcon,
        filled:     true,
        fillColor:  c.bgCard,
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
        isObscure
            ? Icons.visibility_off_outlined
            : Icons.visibility_outlined,
        color: c.textMuted,
        size: 20,
      ),
      onPressed: onToggle,
    );
  }
}
