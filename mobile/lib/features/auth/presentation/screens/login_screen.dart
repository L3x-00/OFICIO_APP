import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/social_login_button.dart';
import '../../../../core/social_auth_service.dart';
import 'forgot_password_screen.dart';
import 'otp_verification_screen.dart';

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
        // Navegar a la pantalla de verificación OTP (reemplaza esta ruta)
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const OtpVerificationScreen()),
        );
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
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
    );
  }

  Future<void> _handleSocialLogin(SocialProvider provider) async {
    final auth = context.read<AuthProvider>();

    String? idToken;
    if (provider == SocialProvider.google) {
      idToken = await SocialAuthService.signInWithGoogle();
    } else if (provider == SocialProvider.facebook) {
      idToken = await SocialAuthService.signInWithFacebook();
    }

    if (idToken == null) return; // cancelado o error silencioso

    final ok = await auth.loginWithSocial(idToken);

    if (!mounted) return;
    if (ok) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.error ?? 'Error en inicio de sesión social'),
          backgroundColor: AppColors.busy,
          behavior: SnackBarBehavior.floating,
        ),
      );
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
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.3)),
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
                  SocialLoginButton(
                    provider: SocialProvider.google,
                    onTap: () => _handleSocialLogin(SocialProvider.google),
                  ),
                  const SizedBox(height: 10),
                  SocialLoginButton(
                    provider: SocialProvider.facebook,
                    onTap: () => _handleSocialLogin(SocialProvider.facebook),
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
                  builder: (_, auth, _) => SizedBox(
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


// ─── Checkbox de términos y condiciones ──────────────────

class _TermsCheckbox extends StatelessWidget {
  final bool value;
  final ValueChanged<bool?> onChanged;

  const _TermsCheckbox({required this.value, required this.onChanged});

  void _openTerms(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _TermsModal(),
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
                      onTap: () => _openTerms(context),
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
                      onTap: () => _openTerms(context),
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
                  const TextSpan(text: ' de ConfiServ.'),
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
  const _TermsModal();

  // ══════════════════════════════════════════════════════════
  // TEXTO DE TÉRMINOS Y CONDICIONES
  // Pega aquí el contenido completo cuando esté listo.
  // ══════════════════════════════════════════════════════════
  static const String _termsText = '''
TÉRMINOS Y CONDICIONES DE USO — ConfiServ

Bienvenido a ConfiServ. Antes de utilizar nuestra plataforma, lea detenidamente estos Términos y Condiciones. Al marcar el check de aceptación durante el registro, usted declara haber leído, comprendido y aceptado quedar vinculado legalmente por este documento.

1. NATURALEZA DEL SERVICIO: DIRECTORIO INTERMEDIARIO
ConfiServ funciona exclusivamente como una plataforma de centralización de información y "puente" de contacto.
No somos agencia de empleos: No contratamos ni seleccionamos al personal.
No somos pasarela de servicios: La negociación de precios, condiciones de trabajo y pagos por los servicios o productos ofrecidos por los Proveedores se realizan fuera de la aplicación, directamente vía WhatsApp, teléfono o de forma presencial.
Exención de comisión: ConfiServ no cobra comisiones por los contratos celebrados entre Usuarios y Proveedores.
2. DESLINDE DE RESPONSABILIDAD (CLÁUSULA DE INDEMNIDAD)
El Usuario acepta que el uso de la aplicación es bajo su propia cuenta y riesgo.
Suplantación y Fraude: Dado que ningún sistema de validación digital es infalible al 100%, ConfiServ no se hace responsable por fraudes, suplantaciones de identidad o actos ilícitos cometidos por terceros.
Calidad del Servicio: No garantizamos la calidad, puntualidad o idoneidad del servicio prestado por el Proveedor. Cualquier reclamo por daños y perjuicios derivados de un mal servicio debe dirigirse directamente al Proveedor contratado.
3. SISTEMA DE VERIFICACIÓN Y INSIGNIA "CONFIABLE"
La insignia "Confiable" es una herramienta de filtrado basada en una validación superficial de datos públicos (SUNAT, consultas RUC/DNI).
Limitación de la Insignia: La insignia no constituye una garantía absoluta de honestidad o pericia profesional. Es solo una indicación de que el Proveedor ha cumplido con entregar la documentación solicitada.
Revocación: ConfiServ se reserva el derecho de retirar la insignia "Confiable" de forma inmediata si se recibe un reporte fundamentado o se detectan irregularidades, notificando al Proveedor el motivo de la revocación.
4. PROTECCIÓN DE DATOS PERSONALES (LEY N° 29733)
De conformidad con la legislación peruana, el Usuario autoriza expresamente a ConfiServ a:
Recolección Sensible: Almacenar fotos del DNI (ambas caras), selfies de validación biométrica y datos de ubicación (GPS) con el fin exclusivo de prevenir el fraude y gestionar el sistema de confianza.
Finalidad: Los datos se utilizarán para validar la identidad del Proveedor. En caso de estafa reportada, ConfiServ podrá facilitar estos datos a las autoridades competentes para coadyuvar en investigaciones externas.
Derechos ARCO: El Usuario puede solicitar el acceso, rectificación, cancelación u oposición de sus datos escribiendo al canal oficial de soporte de la App.
5. PLANES DE SUSCRIPCIÓN Y REEMBOLSOS
El acceso a planes Estándar o Premium se rige por las siguientes reglas:
Plazo de Arrepentimiento: El Proveedor tiene hasta 5 días calendario tras la compra para solicitar un reembolso total, siempre que fundamente la eliminación de su cuenta.
Baneo por Mal Comportamiento: Si un Proveedor es expulsado por reportes de fraude o faltas éticas, se aplicará un reembolso parcial proporcional al tiempo no utilizado, descontando gastos administrativos, salvo que la falta sea grave, en cuyo caso se podrá denegar el reembolso para cubrir gastos de mediación.
Pasarela: Los pagos se procesan a través de Culqi, bajo sus propios términos de seguridad.
6. CONTENIDO Y RESEÑA
Moderación: ConfiServ no edita ni elimina reseñas arbitrariamente. Sin embargo, podrá ocultar reseñas de la vista pública bajo un proceso de mediación si existe un conflicto de intereses o si el profesional demuestra que factores externos ajenos a su labor afectaron el resultado.
Gestión de Prestigio: El acceso a servicios de mediación o gestión de reseñas negativas podrá estar sujeto a planes de pago específicos, entendidos como un servicio de soporte administrativo y no como una alteración fraudulenta del ranking.
Uso de Imágenes: El Usuario otorga a ConfiServ una licencia gratuita, no exclusiva y mundial para utilizar las fotos de perfil, logotipos y fotos de trabajos subidos a la App con fines de publicidad y marketing de la plataforma.

Última actualización: 23 de abril de 2026
''';
  // ══════════════════════════════════════════════════════════

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
                      'Términos y Condiciones',
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
                  _termsText,
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
