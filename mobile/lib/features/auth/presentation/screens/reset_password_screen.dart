import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String email;
  /// Token de 6 dígitos pre-llenado solo en entornos de desarrollo
  final String? devToken;

  const ResetPasswordScreen({
    super.key,
    required this.email,
    this.devToken,
  });

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey     = GlobalKey<FormState>();
  late final TextEditingController _tokenCtrl;
  final _newPassCtrl    = TextEditingController();
  final _confirmCtrl    = TextEditingController();

  bool _obscureNew      = true;
  bool _obscureConfirm  = true;

  @override
  void initState() {
    super.initState();
    _tokenCtrl = TextEditingController(text: widget.devToken ?? '');
  }

  @override
  void dispose() {
    _tokenCtrl.dispose();
    _newPassCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final ok = await auth.resetPassword(
      email:       widget.email,
      token:       _tokenCtrl.text.trim(),
      newPassword: _newPassCtrl.text,
    );

    if (!mounted) return;

    if (ok) {
      // Volver al login limpiando toda la pila
      Navigator.of(context).popUntil((route) => route.isFirst);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Contraseña restablecida. Ya puedes iniciar sesión.'),
          backgroundColor: AppColors.available,
          duration: Duration(seconds: 4),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.error ?? 'Código inválido o expirado'),
          backgroundColor: AppColors.busy,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c    = context.colors;
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: c.textPrimary, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Nueva contraseña',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Email en el que se envió el código
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.email_outlined, color: AppColors.primary, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Código enviado a ${widget.email}',
                        style: TextStyle(color: c.textSecondary, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              Text(
                'Ingresa el código de 6 dígitos y tu nueva contraseña.',
                style: TextStyle(color: c.textSecondary, fontSize: 14, height: 1.5),
              ),
              const SizedBox(height: 24),

              // Campo código
              TextFormField(
                controller:  _tokenCtrl,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(6),
                ],
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 8,
                ),
                textAlign: TextAlign.center,
                validator: (v) {
                  if (v == null || v.length != 6) return 'El código debe tener 6 dígitos';
                  return null;
                },
                decoration: InputDecoration(
                  labelText:  'Código de verificación',
                  labelStyle: TextStyle(color: c.textMuted, fontSize: 13),
                  filled:     true,
                  fillColor:  c.bgCard,
                  errorStyle: const TextStyle(color: AppColors.busy, fontSize: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.primary, width: 2),
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
              ),
              const SizedBox(height: 16),

              // Nueva contraseña
              _PasswordField(
                controller: _newPassCtrl,
                label:      'Nueva contraseña',
                isObscure:  _obscureNew,
                onToggle:   () => setState(() => _obscureNew = !_obscureNew),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Campo requerido';
                  if (v.length < 8) return 'Mínimo 8 caracteres';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Confirmar nueva contraseña
              _PasswordField(
                controller: _confirmCtrl,
                label:      'Confirmar nueva contraseña',
                isObscure:  _obscureConfirm,
                onToggle:   () => setState(() => _obscureConfirm = !_obscureConfirm),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Campo requerido';
                  if (v != _newPassCtrl.text) return 'Las contraseñas no coinciden';
                  return null;
                },
              ),
              const SizedBox(height: 36),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: auth.isLoading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: auth.isLoading
                      ? const SizedBox(
                          height: 20, width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text(
                          'Restablecer contraseña',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
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

class _PasswordField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool isObscure;
  final VoidCallback onToggle;
  final String? Function(String?)? validator;

  const _PasswordField({
    required this.controller,
    required this.label,
    required this.isObscure,
    required this.onToggle,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return TextFormField(
      controller:  controller,
      obscureText: isObscure,
      style: TextStyle(color: c.textPrimary, fontSize: 15),
      validator: validator,
      decoration: InputDecoration(
        labelText:  label,
        labelStyle: TextStyle(color: c.textMuted, fontSize: 13),
        prefixIcon: Icon(Icons.lock_outline, color: c.textMuted, size: 20),
        suffixIcon: IconButton(
          icon: Icon(
            isObscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
            color: c.textMuted, size: 20,
          ),
          onPressed: onToggle,
        ),
        filled:    true,
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
