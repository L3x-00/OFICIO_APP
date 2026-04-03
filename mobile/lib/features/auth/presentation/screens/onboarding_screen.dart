import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

/// Se muestra la primera vez que el usuario se registra
/// para elegir qué tipo de perfil quiere crear
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  String? _selectedRole; // 'USUARIO', 'OFICIO', 'NEGOCIO'

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),

              // Título
              const Text(
                '¿Cómo usarás\nOficioApp?',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 30,
                  fontWeight: FontWeight.bold,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Elige tu perfil para personalizar tu experiencia',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 36),

              // Opciones
              _RoleOption(
                icon: Icons.search_rounded,
                title: 'Soy cliente',
                subtitle: 'Busco electricistas, gasfiteros y más servicios',
                roleValue: 'USUARIO',
                isSelected: _selectedRole == 'USUARIO',
                onTap: () => setState(() => _selectedRole = 'USUARIO'),
              ),
              const SizedBox(height: 14),
              _RoleOption(
                icon: Icons.handyman_rounded,
                title: 'Ofrezco un oficio',
                subtitle: 'Soy electricista, pintor, gasfitero, etc.',
                roleValue: 'OFICIO',
                isSelected: _selectedRole == 'OFICIO',
                onTap: () => setState(() => _selectedRole = 'OFICIO'),
              ),
              const SizedBox(height: 14),
              _RoleOption(
                icon: Icons.storefront_rounded,
                title: 'Tengo un negocio',
                subtitle: 'Restaurante, peluquería, tienda, etc.',
                roleValue: 'NEGOCIO',
                isSelected: _selectedRole == 'NEGOCIO',
                onTap: () => setState(() => _selectedRole = 'NEGOCIO'),
              ),

              const Spacer(),

              // Botón continuar
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _selectedRole == null ? null : _continue,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    disabledBackgroundColor: AppColors.bgCard,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    _selectedRole == null ? 'Elige una opción' : 'Continuar',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
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

  void _continue() {
    final auth = context.read<AuthProvider>();

    // Marcar onboarding como completado
    auth.completeOnboarding(role: _selectedRole!);

    // Si eligió ser proveedor, mostrar formulario de perfil
    if (_selectedRole == 'OFICIO' || _selectedRole == 'NEGOCIO') {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => const ProviderOnboardingForm(),
        ),
      );
    }
    // Si es cliente, ir directo a la app
    // El _AppRoot detectará needsOnboarding = false
  }
}

// ─── Opción de rol ─────────────────────────────────────────

class _RoleOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String roleValue;
  final bool isSelected;
  final VoidCallback onTap;

  const _RoleOption({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.roleValue,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withOpacity(0.1)
              : AppColors.bgCard,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected
                ? AppColors.primary.withOpacity(0.6)
                : Colors.white.withOpacity(0.06),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary.withOpacity(0.2)
                    : AppColors.bgInput,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: isSelected ? AppColors.primary : AppColors.textMuted,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: isSelected
                          ? AppColors.textPrimary
                          : AppColors.textSecondary,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(
                Icons.check_circle_rounded,
                color: AppColors.primary,
                size: 22,
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Formulario de perfil de proveedor ────────────────────

/// [providerType] — 'OFICIO' | 'NEGOCIO' (opcional; se puede elegir en el form)
/// [isStandalone] — true cuando el usuario ya está autenticado y llega desde
///                  el modal "Quiero ser parte"; en ese caso el formulario
///                  simplemente regresa al navegar en lugar de cambiar el estado global.
class ProviderOnboardingForm extends StatefulWidget {
  final String? providerType;
  final bool isStandalone;

  const ProviderOnboardingForm({
    super.key,
    this.providerType,
    this.isStandalone = false,
  });

  @override
  State<ProviderOnboardingForm> createState() => _ProviderOnboardingFormState();
}

class _ProviderOnboardingFormState extends State<ProviderOnboardingForm> {
  final _businessNameController = TextEditingController();
  final _phoneController        = TextEditingController();
  final _descriptionController  = TextEditingController();
  final _addressController      = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _businessNameController.dispose();
    _phoneController.dispose();
    _descriptionController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  bool get _isOficio => widget.providerType == 'OFICIO';

  String get _formTitle => _isOficio
      ? 'Perfil de Profesional'
      : widget.providerType == 'NEGOCIO'
          ? 'Perfil de Negocio'
          : 'Configura tu perfil';

  String get _formSubtitle => _isOficio
      ? 'Completa los datos de tu servicio independiente'
      : widget.providerType == 'NEGOCIO'
          ? 'Completa los datos de tu establecimiento'
          : 'Esta información aparecerá en tu tarjeta de servicio';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        backgroundColor: AppColors.bgDark,
        elevation: 0,
        leading: widget.isStandalone
            ? IconButton(
                icon: const Icon(Icons.close, color: AppColors.textSecondary),
                onPressed: () => Navigator.of(context).pop(),
              )
            : null,
        title: Text(
          _formTitle,
          style: const TextStyle(color: AppColors.textPrimary),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Badge de tipo (solo cuando viene del modal)
            if (widget.providerType != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _isOficio
                      ? AppColors.primary.withOpacity(0.1)
                      : const Color(0xFF8E2DE2).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _isOficio
                        ? AppColors.primary.withOpacity(0.3)
                        : const Color(0xFF8E2DE2).withOpacity(0.3),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _isOficio
                          ? Icons.handyman_rounded
                          : Icons.storefront_rounded,
                      size: 14,
                      color: _isOficio
                          ? AppColors.primary
                          : const Color(0xFF8E2DE2),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _isOficio ? 'Profesional Independiente' : 'Negocio',
                      style: TextStyle(
                        color: _isOficio
                            ? AppColors.primary
                            : const Color(0xFF8E2DE2),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
            Text(
              'Cuéntanos sobre tu servicio',
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              _formSubtitle,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 28),
            _buildField(
              controller: _businessNameController,
              label: 'Nombre del servicio o negocio *',
              hint: 'Ej: Juan Electricista o Restaurante El Sabor',
              icon: Icons.storefront_outlined,
            ),
            const SizedBox(height: 16),
            _buildField(
              controller: _phoneController,
              label: 'Teléfono de contacto *',
              hint: '+51 987 654 321',
              icon: Icons.phone_outlined,
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 16),
            _buildField(
              controller: _descriptionController,
              label: 'Descripción del servicio',
              hint: 'Describe qué haces, tu experiencia, especialidades...',
              icon: Icons.description_outlined,
              maxLines: 4,
            ),
            const SizedBox(height: 16),
            _buildField(
              controller: _addressController,
              label: 'Dirección (opcional)',
              hint: 'Jr. Ejemplo 123, Ciudad',
              icon: Icons.location_on_outlined,
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        'Crear mi perfil de proveedor',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: TextButton(
                onPressed: () {
                  if (widget.isStandalone) {
                    // Usuario ya autenticado — solo cierra el formulario
                    Navigator.of(context).pop();
                  } else {
                    // Flujo de onboarding normal — pasar a cliente
                    context.read<AuthProvider>().completeOnboarding(
                      role: 'USUARIO',
                    );
                  }
                },
                child: const Text(
                  'Completar después',
                  style: TextStyle(color: AppColors.textMuted),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (_businessNameController.text.trim().isEmpty ||
        _phoneController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('El nombre y teléfono son obligatorios'),
          backgroundColor: AppColors.busy,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    // TODO Hito 6: llamar al endpoint de creación de proveedor con:
    //   userId: context.read<AuthProvider>().user!.id
    //   businessName: _businessNameController.text.trim()
    //   phone: _phoneController.text.trim()
    //   description: _descriptionController.text.trim()
    //   address: _addressController.text.trim()
    //   type: widget.providerType ?? 'OFICIO'
    await Future.delayed(const Duration(seconds: 1));

    if (!mounted) return;

    if (widget.isStandalone) {
      // Usuario ya autenticado — mostrar éxito y volver a la app
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('¡Perfil de proveedor creado con éxito!'),
          backgroundColor: AppColors.available,
          duration: Duration(seconds: 3),
        ),
      );
      Navigator.of(context).pop();
    } else {
      // Flujo de onboarding normal
      context.read<AuthProvider>().completeOnboarding(role: 'PROVEEDOR');
      setState(() => _isLoading = false);
    }
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
            prefixIcon: maxLines == 1
                ? Icon(icon, color: AppColors.textMuted, size: 20)
                : null,
            filled: true,
            fillColor: AppColors.bgCard,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(
                color: AppColors.primary,
                width: 1.5,
              ),
            ),
            contentPadding: EdgeInsets.all(maxLines > 1 ? 16 : 14),
          ),
        ),
      ],
    );
  }
}