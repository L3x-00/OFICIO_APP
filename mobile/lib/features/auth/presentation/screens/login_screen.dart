import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
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
      });
      _animController.forward();
    });
  }

  Future<void> _submit() async {
    final auth = context.read<AuthProvider>();

    if (_mode == AuthMode.register) {
      // Validar contraseñas iguales
      if (_passwordController.text != _password2Controller.text) {
        setState(() => _passwordMismatch = 'Las contraseñas no coinciden');
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
        // El AuthProvider notifica listeners → _AppRoot reconstruye con OnboardingScreen
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
      );

      if (ok && mounted) {
        // El AuthProvider notifica listeners → _AppRoot reconstruye con _MainNavigation
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

  @override
  Widget build(BuildContext context) {
    final isRegister = _mode == AuthMode.register;

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme:
            const IconThemeData(color: AppColors.textSecondary),
      ),
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnim,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Título
                Text(
                  isRegister ? 'Crear cuenta' : 'Bienvenido de vuelta',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  isRegister
                      ? 'Únete a OficioApp gratis'
                      : 'Ingresa con tu cuenta',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 32),

                // Campos de nombre (solo en registro)
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

                // Email
                _Field(
                  controller: _emailController,
                  label: 'Correo electrónico',
                  icon: Icons.email_outlined,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 14),

                // Contraseña
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

                // Repetir contraseña (solo en registro)
                if (isRegister) ...[
                  const SizedBox(height: 14),
                  _Field(
                    controller: _password2Controller,
                    label: 'Repetir contraseña',
                    icon: Icons.lock_outline,
                    obscureText: _obscurePassword2,
                    errorText: _passwordMismatch,
                    suffixIcon: _ToggleVisibilityButton(
                      isObscure: _obscurePassword2,
                      onToggle: () => setState(
                          () => _obscurePassword2 = !_obscurePassword2),
                    ),
                  ),
                ],

                const SizedBox(height: 28),

                // Botón principal
                Consumer<AuthProvider>(
                  builder: (_, auth, __) => SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: auth.isLoading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding:
                            const EdgeInsets.symmetric(vertical: 16),
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
                              isRegister ? 'Registrarme' : 'Ingresar',
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Switch login/registro
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      isRegister
                          ? '¿Ya tienes cuenta? '
                          : '¿No tienes cuenta? ',
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 13),
                    ),
                    GestureDetector(
                      onTap: () => _switchMode(
                        isRegister ? AuthMode.login : AuthMode.register,
                      ),
                      child: Text(
                        isRegister ? 'Ingresar' : 'Registrarme',
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

// ─── Widgets auxiliares ───────────────────────────────────

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
    return TextField(
      controller:   controller,
      keyboardType: keyboardType,
      obscureText:  obscureText,
      style: const TextStyle(
          color: AppColors.textPrimary, fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        errorText: errorText,
        labelStyle: const TextStyle(
            color: AppColors.textMuted, fontSize: 13),
        prefixIcon:
            Icon(icon, color: AppColors.textMuted, size: 20),
        suffixIcon: suffixIcon,
        filled:     true,
        fillColor:  AppColors.bgCard,
        errorStyle: const TextStyle(
            color: AppColors.busy, fontSize: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(
            color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(
            color: AppColors.busy, width: 1.5),
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
    return IconButton(
      icon: Icon(
        isObscure
            ? Icons.visibility_off_outlined
            : Icons.visibility_outlined,
        color: AppColors.textMuted,
        size: 20,
      ),
      onPressed: onToggle,
    );
  }
}