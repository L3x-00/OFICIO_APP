import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/utils/plan_limits.dart';

/// Sheet de selección de plan en el onboarding del proveedor.
///
/// Lógica consolidada (2026-05):
///   - GRATIS  → tarjeta BLOQUEADA, informativa, no seleccionable.
///   - ESTÁNDAR → mensaje de bienvenida estático. Es el plan por
///     defecto: todo proveedor nuevo lo recibe gratis por 1 mes. Al
///     continuar con él, el formulario se envía para aprobación.
///   - PREMIUM → ÚNICO plan interactivo/seleccionable. Al elegirlo, el
///     flujo de pago (MercadoPago / Yape) se dispara tras el registro.
///
/// `onContinue` devuelve 'ESTANDAR' (bienvenida) o 'PREMIUM' (pago).
class OnboardingPlansSheet extends StatefulWidget {
  final String providerType;
  final ValueChanged<String> onContinue;

  const OnboardingPlansSheet({
    super.key,
    required this.providerType,
    required this.onContinue,
  });

  @override
  State<OnboardingPlansSheet> createState() => _OnboardingPlansSheetState();
}

class _OnboardingPlansSheetState extends State<OnboardingPlansSheet> {
  /// false = Estándar de bienvenida (default). true = Premium de pago.
  bool _wantsPremium = false;

  bool get _isNegocio => widget.providerType == 'NEGOCIO';

  @override
  Widget build(BuildContext context) {
    final c      = context.colors;
    final accent = _isNegocio ? AppColors.amber : AppColors.primary;

    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      minChildSize:     0.6,
      maxChildSize:     0.95,
      builder: (_, scrollController) => Container(
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 4),
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: c.textMuted.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 16, 4),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _isNegocio ? Icons.storefront_rounded : Icons.handyman_rounded,
                      color: accent, size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Tu plan de bienvenida',
                          style: TextStyle(color: c.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'Empieza con el Estándar gratis o sube a Premium',
                          style: TextStyle(color: c.textSecondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: c.textMuted),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: c.border),
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Column(
                  children: [
                    // ── ESTÁNDAR — bienvenida estática (default) ──
                    _WelcomeStandardCard(
                      isNegocio: _isNegocio,
                      // Al destacarse cuando NO se quiere Premium se ve
                      // como "el plan elegido por defecto".
                      highlighted: !_wantsPremium,
                      onTap: () => setState(() => _wantsPremium = false),
                      features: [
                        _feat(Icons.photo_library_rounded,
                            '${PlanLimits.photos('ESTANDAR')} fotos de perfil'),
                        _feat(
                          _isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
                          PlanLimits.itemsLabel('ESTANDAR', isNegocio: _isNegocio),
                        ),
                        if (_isNegocio)
                          _feat(Icons.image_rounded, 'Foto por producto incluida'),
                        _feat(Icons.bar_chart_rounded, 'Gestión de visitas y estadísticas'),
                        _feat(Icons.verified_rounded, 'Badge verificado azul'),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // ── PREMIUM — único plan seleccionable de pago ──
                    _SelectablePlanCard(
                      planId:    'PREMIUM',
                      title:     'Premium',
                      price:     'S/ 39.90',
                      priceNote: 'por mes',
                      color:     AppColors.premium,
                      icon:      Icons.workspace_premium_rounded,
                      isSelected: _wantsPremium,
                      onTap:      () => setState(() => _wantsPremium = true),
                      features: [
                        _feat(Icons.photo_library_rounded,
                            '${PlanLimits.photos('PREMIUM')} fotos de perfil'),
                        _feat(
                          _isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
                          PlanLimits.itemsLabel('PREMIUM', isNegocio: _isNegocio),
                        ),
                        if (_isNegocio)
                          _feat(Icons.image_rounded, 'Fotos ilimitadas por producto'),
                        _feat(Icons.bar_chart_rounded, 'Estadísticas avanzadas'),
                        _feat(Icons.workspace_premium_rounded, 'Badge dorado Premium'),
                        _feat(Icons.star_rounded, 'Posición #1 en búsqueda garantizada'),
                        _feat(Icons.support_agent_rounded, 'Soporte prioritario 24/7'),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // ── GRATIS — bloqueado, solo informativo ──
                    _LockedGratisCard(isNegocio: _isNegocio),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => widget.onContinue(_wantsPremium ? 'PREMIUM' : 'ESTANDAR'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _wantsPremium ? AppColors.premium : accent,
                    foregroundColor: _wantsPremium
                        ? Colors.white
                        : (_isNegocio ? const Color(0xFF3D2B00) : Colors.white),
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: Text(
                    _wantsPremium
                        ? 'Adquirir Plan Premium'
                        : 'Continuar con mi Plan Estándar gratis',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static PlanFeatureItem _feat(IconData icon, String text, {bool locked = false}) =>
      PlanFeatureItem(icon: icon, text: text, locked: locked);
}

class PlanFeatureItem {
  final IconData icon;
  final String text;
  final bool locked;
  const PlanFeatureItem({required this.icon, required this.text, this.locked = false});
}

class PlanBadge extends StatelessWidget {
  final String label;
  final Color color;
  const PlanBadge({super.key, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}

/// Tarjeta de bienvenida del plan Estándar. NO es un radio común: muestra
/// el mensaje atractivo de cortesía y al tocarse "elige" el plan
/// Estándar (deseleccionando Premium).
class _WelcomeStandardCard extends StatelessWidget {
  final bool isNegocio;
  final bool highlighted;
  final VoidCallback onTap;
  final List<PlanFeatureItem> features;

  const _WelcomeStandardCard({
    required this.isNegocio,
    required this.highlighted,
    required this.onTap,
    required this.features,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    const color = AppColors.standard;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: highlighted
              ? color.withValues(alpha: c.isDark ? 0.14 : 0.08)
              : c.bg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: highlighted ? color : c.border,
            width: highlighted ? 2.0 : 1.0,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Banner de bienvenida — mensaje estático atractivo.
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    color.withValues(alpha: 0.22),
                    color.withValues(alpha: 0.08),
                  ],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Text('🎉', style: TextStyle(fontSize: 22)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '¡Bienvenido a SERVI! Por ser nuevo, obtienes el '
                      'Plan Estándar por 1 mes gratis.',
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.verified_rounded, color: color, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text('Estándar',
                              style: TextStyle(
                                  color: color,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold)),
                          const SizedBox(width: 6),
                          const PlanBadge(label: 'GRATIS 1 MES', color: color),
                        ],
                      ),
                      Text('Incluido al registrarte',
                          style: TextStyle(color: c.textMuted, fontSize: 12)),
                    ],
                  ),
                ),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 160),
                  width: 22, height: 22,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: highlighted ? color : Colors.transparent,
                    border: Border.all(
                        color: highlighted ? color : c.border, width: 2),
                  ),
                  child: highlighted
                      ? const Icon(Icons.check_rounded, color: Colors.white, size: 14)
                      : null,
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...features.map((f) => Padding(
              padding: const EdgeInsets.only(bottom: 7),
              child: Row(
                children: [
                  Icon(f.icon, color: color, size: 15),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(f.text,
                        style: TextStyle(color: c.textSecondary, fontSize: 13)),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }
}

/// Tarjeta del plan GRATIS — bloqueada (no seleccionable). Solo informa
/// que es el plan al que se cae tras vencer el trial Estándar.
class _LockedGratisCard extends StatelessWidget {
  final bool isNegocio;
  const _LockedGratisCard({required this.isNegocio});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    const muted = Color(0xFF6B7280);

    return Opacity(
      opacity: 0.7,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.bg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: c.border),
        ),
        child: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: const BoxDecoration(
                color: Color(0x1A6B7280),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.lock_rounded, color: muted, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('Gratis',
                          style: TextStyle(
                              color: muted,
                              fontSize: 15,
                              fontWeight: FontWeight.bold)),
                      const SizedBox(width: 6),
                      const PlanBadge(label: 'No disponible', color: muted),
                    ],
                  ),
                  Text(
                    'Tu cuenta pasa a este plan automáticamente cuando '
                    'vence el mes de bienvenida.',
                    style: TextStyle(color: c.textMuted, fontSize: 11.5, height: 1.35),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Tarjeta seleccionable de un plan de pago (Premium). El borde y el
/// radio reflejan `isSelected`; todo el card es tappable.
class _SelectablePlanCard extends StatelessWidget {
  final String planId;
  final String title;
  final String price;
  final String priceNote;
  final Color color;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;
  final List<PlanFeatureItem> features;

  const _SelectablePlanCard({
    required this.planId,
    required this.title,
    required this.price,
    required this.priceNote,
    required this.color,
    required this.icon,
    required this.features,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? color.withValues(alpha: c.isDark ? 0.14 : 0.08)
              : c.bg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected ? color : c.border,
            width: isSelected ? 2.0 : 1.0,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(title,
                              style: TextStyle(
                                  color: color,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold)),
                          const SizedBox(width: 6),
                          const PlanBadge(label: '⭐ Recomendado', color: AppColors.premium),
                        ],
                      ),
                      Text('$price $priceNote',
                          style: TextStyle(color: c.textMuted, fontSize: 12)),
                    ],
                  ),
                ),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 160),
                  width: 22, height: 22,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isSelected ? color : Colors.transparent,
                    border: Border.all(color: isSelected ? color : c.border, width: 2),
                  ),
                  child: isSelected
                      ? const Icon(Icons.check_rounded, color: Colors.white, size: 14)
                      : null,
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...features.map((f) => Padding(
              padding: const EdgeInsets.only(bottom: 7),
              child: Row(
                children: [
                  Icon(f.icon, color: color, size: 15),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(f.text,
                        style: TextStyle(color: c.textSecondary, fontSize: 13)),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }
}
