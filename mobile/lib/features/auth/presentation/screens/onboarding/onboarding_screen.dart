import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart' show AppColors;
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../../../../shared/widgets/location_picker_sheet.dart';
import '../../../../../features/providers_list/presentation/providers/providers_provider.dart';
import 'onboarding_plans_sheet.dart';
import 'provider_onboarding_form.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  String? _selectedRole;
  bool _isNavigating = false;

  Future<void> _confirmCancel(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('¿Cancelar registro?'),
        content: const Text(
          'Si cancelas ahora perderás el progreso y tendrás que registrarte nuevamente con un nuevo código de verificación.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Continuar registro'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Sí, cancelar'),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      await context.read<AuthProvider>().logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _confirmCancel(context);
      },
      child: Scaffold(
        backgroundColor: c.bg,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: Icon(Icons.arrow_back_rounded, color: c.textSecondary),
            onPressed: () => _confirmCancel(context),
          ),
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 4, 24, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '¿Cómo te ayudamos\nhoy?',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 30,
                    fontWeight: FontWeight.bold,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Cuéntanos quién eres para personalizar tu experiencia',
                  style: TextStyle(color: c.textSecondary, fontSize: 15),
                ),
                const SizedBox(height: 36),

                _RoleOption(
                  icon: Icons.search_rounded,
                  title: 'Soy cliente',
                  subtitle:
                      'Busco, comparo y contrato profesionales o negocios en mi zona.',
                  roleValue: 'USUARIO',
                  isSelected: _selectedRole == 'USUARIO',
                  onTap: () => setState(() => _selectedRole = 'USUARIO'),
                ),
                const SizedBox(height: 14),
                _RoleOption(
                  icon: Icons.handyman_rounded,
                  title: 'Soy profesional',
                  subtitle:
                      'Ofrezco mis servicios como independiente y quiero conseguir más clientes.',
                  roleValue: 'OFICIO',
                  isSelected: _selectedRole == 'OFICIO',
                  onTap: () => _goToProviderForm('OFICIO'),
                ),
                const SizedBox(height: 14),
                _RoleOption(
                  icon: Icons.storefront_rounded,
                  title: 'Tengo un negocio',
                  subtitle:
                      'Promociono mi establecimiento y llego a más personas en mi ciudad.',
                  roleValue: 'NEGOCIO',
                  isSelected: _selectedRole == 'NEGOCIO',
                  onTap: () => _goToProviderForm('NEGOCIO'),
                ),

                const Spacer(),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: (_selectedRole == null || _isNavigating)
                        ? null
                        : _continue,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      disabledBackgroundColor: c.bgCard,
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
      ),
    );
  }

  Future<void> _continue() async {
    if (_isNavigating) return;
    setState(() => _isNavigating = true);

    try {
      if (_selectedRole == 'USUARIO') {
        final auth = context.read<AuthProvider>();
        if (auth.user?.hasLocation != true) {
          final result = await LocationPickerSheet.show(context);
          if (!mounted) return;
          if (result == null) return;
          await auth.updateLocation(
            department: result.department,
            province: result.province,
            district: result.district,
          );
          if (!mounted) return;
          context.read<ProvidersProvider>().setUserLocation(
            department: result.department,
            province: result.province,
            district: result.district,
          );
        }
      }
      if (!mounted) return;
      context.read<AuthProvider>().completeOnboarding(role: _selectedRole!);
    } finally {
      if (mounted) setState(() => _isNavigating = false);
    }
  }

  void _goToProviderForm(String type) {
    setState(() => _selectedRole = type);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => OnboardingPlansSheet(
        providerType: type,
        onContinue: (selectedPlan) {
          Navigator.pop(context);
          // rootNavigator: true saca el formulario del shell del
          // cliente — sin esto, la bottom nav quedaba visible
          // debajo del formulario y arruinaba la UX.
          Navigator.of(context, rootNavigator: true).push(
            MaterialPageRoute(
              builder: (_) => ProviderOnboardingForm(
                providerType: type,
                selectedPlan: selectedPlan,
              ),
            ),
          );
        },
      ),
    );
  }
}

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
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.1)
              : c.bgCard,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected
                ? AppColors.primary.withValues(alpha: 0.6)
                : c.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary.withValues(alpha: 0.2)
                    : c.bgInput,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: isSelected ? AppColors.primary : c.textMuted,
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
                      color: isSelected ? c.textPrimary : c.textSecondary,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: TextStyle(color: c.textMuted, fontSize: 12),
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
