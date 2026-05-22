import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

/// Pantalla post-social-login para usuarios que se acaban de registrar
/// con Google/Facebook. Permite establecer una contraseña real para
/// que después puedan iniciar sesión manualmente con su correo. Puede
/// omitirse — si lo hace, su passwordHash queda en el dummy y siempre
/// podrá entrar con el botón social.
class SetupPasswordScreen extends StatefulWidget {
  const SetupPasswordScreen({super.key});

  @override
  State<SetupPasswordScreen> createState() => _SetupPasswordScreenState();
}

class _SetupPasswordScreenState extends State<SetupPasswordScreen> {
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl  = TextEditingController();
  bool _obscure       = true;
  bool _obscureConfirm = true;
  bool _saving        = false;

  @override
  void dispose() {
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final pwd     = _passwordCtrl.text;
    final confirm = _confirmCtrl.text;
    if (pwd.length < 6) {
      context.showErrorSnack('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (pwd != confirm) {
      context.showErrorSnack('Las contraseñas no coinciden.');
      return;
    }
    setState(() => _saving = true);
    final auth = context.read<AuthProvider>();
    final ok = await auth.setupPassword(pwd);
    if (!mounted) return;
    setState(() => _saving = false);
    if (ok) {
      auth.clearSocialPasswordPrompt();
      context.showSuccessSnack('Contraseña establecida. Ya puedes iniciar sesión con tu correo.');
      Navigator.of(context).pop();
    } else {
      context.showErrorSnack(auth.error ?? 'No se pudo guardar la contraseña.');
    }
  }

  void _skip() {
    context.read<AuthProvider>().clearSocialPasswordPrompt();
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return PopScope(
      // No permitir back físico — solo "Omitir" o "Guardar" cierran.
      canPop: false,
      child: Scaffold(
        backgroundColor: c.bg,
        appBar: AppBar(
          backgroundColor: c.bg,
          elevation: 0,
          automaticallyImplyLeading: false,
          actions: [
            TextButton(
              onPressed: _saving ? null : _skip,
              child: Text(
                'Omitir',
                style: TextStyle(color: c.textMuted, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.35)),
                  ),
                  child: const Icon(Icons.lock_outline_rounded,
                      color: AppColors.primary, size: 28),
                ),
                const SizedBox(height: 20),
                Text(
                  'Crea una contraseña',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Ingresaste con Google. Establece una contraseña para '
                  'poder iniciar sesión también con tu correo o cambiarla '
                  'más adelante desde el panel.',
                  style: TextStyle(
                      color: c.textSecondary, fontSize: 13, height: 1.45),
                ),
                const SizedBox(height: 24),

                _PasswordField(
                  controller: _passwordCtrl,
                  label: 'Nueva contraseña',
                  obscure: _obscure,
                  onToggle: () => setState(() => _obscure = !_obscure),
                  enabled: !_saving,
                ),
                const SizedBox(height: 14),
                _PasswordField(
                  controller: _confirmCtrl,
                  label: 'Confirmar contraseña',
                  obscure: _obscureConfirm,
                  onToggle: () => setState(() => _obscureConfirm = !_obscureConfirm),
                  enabled: !_saving,
                ),
                const SizedBox(height: 8),
                Text(
                  'Mínimo 6 caracteres.',
                  style: TextStyle(color: c.textMuted, fontSize: 11),
                ),
                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _saving
                        ? const SizedBox(
                            width: 20, height: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2,
                            ),
                          )
                        : const Text(
                            'Guardar contraseña',
                            style: TextStyle(
                                fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
                const SizedBox(height: 10),
                Center(
                  child: TextButton(
                    onPressed: _saving ? null : _skip,
                    child: Text(
                      'Más tarde',
                      style: TextStyle(color: c.textMuted),
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

class _PasswordField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool obscure;
  final VoidCallback onToggle;
  final bool enabled;

  const _PasswordField({
    required this.controller,
    required this.label,
    required this.obscure,
    required this.onToggle,
    required this.enabled,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return TextField(
      controller: controller,
      obscureText: obscure,
      enabled: enabled,
      style: TextStyle(color: c.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: c.textMuted),
        filled: true,
        fillColor: c.bgInput,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        suffixIcon: IconButton(
          icon: Icon(
            obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
            color: c.textMuted,
            size: 20,
          ),
          onPressed: onToggle,
        ),
      ),
    );
  }
}
