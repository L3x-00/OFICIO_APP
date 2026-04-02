import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import '../../features/auth/presentation/screens/login_screen.dart';

/// Modal informativo "¡Quiero ser parte de OficioApp!"
/// Se abre desde el botón flotante en la pantalla principal
class JoinUsModal extends StatefulWidget {
  const JoinUsModal({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const JoinUsModal(),
    );
  }

  @override
  State<JoinUsModal> createState() => _JoinUsModalState();
}

class _JoinUsModalState extends State<JoinUsModal>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _slideAnim;
  late final Animation<double> _fadeAnim;

  // null = vista inicial, 'OFICIO' = form oficio, 'NEGOCIO' = form negocio
  String? _selectedType;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));

    _fadeAnim = CurvedAnimation(parent: _controller, curve: Curves.easeIn);

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;

    return SlideTransition(
      position: _slideAnim,
      child: FadeTransition(
        opacity: _fadeAnim,
        child: Container(
          height: screenHeight * 0.92,
          decoration: const BoxDecoration(
            color: AppColors.bgDark,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
              // Handle
              Padding(
                padding: const EdgeInsets.only(top: 12, bottom: 4),
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.textMuted.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              Expanded(
                child: _selectedType == null
                    ? _buildInitialView()
                    : _buildTypeDetail(_selectedType!),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Vista inicial: elegir tipo ──────────────────────────

  Widget _buildInitialView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header con gradiente
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFFFF6B35).withOpacity(0.15),
                  const Color(0xFFFFB347).withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: const Color(0xFFFF6B35).withOpacity(0.2),
              ),
            ),
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFF6B35), Color(0xFFFFB347)],
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFFF6B35).withOpacity(0.3),
                        blurRadius: 20,
                        spreadRadius: 3,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.rocket_launch_rounded,
                    color: Colors.white,
                    size: 30,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  '¡Haz crecer tu negocio!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Miles de personas en tu zona buscan tus servicios. '
                  'Aparecer en OficioApp es gratis los primeros 2 meses.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // Beneficios
          const Text(
            '¿POR QUÉ UNIRTE?',
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 14),

          ..._benefits.map(
            (b) => _BenefitRow(
              icon: b['icon'] as IconData,
              title: b['title'] as String,
              subtitle: b['subtitle'] as String,
              color: b['color'] as Color,
            ),
          ),

          const SizedBox(height: 28),

          // Estadísticas ficticias pero motivadoras
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  value: '100%',
                  label: 'Gratis\n2 meses',
                  color: AppColors.available,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  value: '+500',
                  label: 'Búsquedas\nal mes',
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  value: '4.8★',
                  label: 'Calificación\npromedio',
                  color: AppColors.star,
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),

          // Opciones de tipo
          const Text(
            '¿CÓMO QUIERES APARECER?',
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 14),

          // Opción: Oficio personal
          _TypeCard(
            icon: Icons.handyman_rounded,
            title: 'Soy un profesional independiente',
            subtitle: 'Electricista, gasfitero, pintor, carpintero, etc.',
            tag: 'OFICIO',
            gradient: const [Color(0xFF00C6FF), Color(0xFF0072FF)],
            onTap: () => setState(() => _selectedType = 'OFICIO'),
          ),
          const SizedBox(height: 14),

          // Opción: Negocio
          _TypeCard(
            icon: Icons.storefront_rounded,
            title: 'Tengo un negocio establecido',
            subtitle: 'Restaurante, peluquería, ferretería, taller, etc.',
            tag: 'NEGOCIO',
            gradient: const [Color(0xFF8E2DE2), Color(0xFF4A00E0)],
            onTap: () => setState(() => _selectedType = 'NEGOCIO'),
          ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  // ─── Vista de detalle por tipo ───────────────────────────

  Widget _buildTypeDetail(String type) {
    final isOficio = type == 'OFICIO';

    final plans = [
      _PlanData(
        name: 'Gratis',
        price: 'S/ 0',
        period: '2 meses',
        features: [
          'Apareces en búsquedas',
          'Foto de perfil',
          'Botón de WhatsApp',
          'Botón de llamada',
        ],
        isHighlighted: false,
      ),
      _PlanData(
        name: 'Estándar',
        price: 'S/ 29',
        period: 'al mes',
        features: [
          'Todo lo del plan Gratis',
          'Hasta 5 fotos del servicio',
          'Apareces primero en búsquedas',
          'Insignia verificado',
          'Estadísticas de visitas',
        ],
        isHighlighted: true,
      ),
      _PlanData(
        name: 'Premium',
        price: 'S/ 49',
        period: 'al mes',
        features: [
          'Todo lo de Estándar',
          'Posición #1 garantizada',
          'Soporte prioritario',
          'Análisis de clientes',
          'Sin comisiones',
        ],
        isHighlighted: false,
      ),
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Botón volver
          GestureDetector(
            onTap: () => setState(() => _selectedType = null),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.arrow_back_rounded,
                  color: AppColors.textSecondary,
                  size: 18,
                ),
                SizedBox(width: 6),
                Text(
                  'Volver',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Título según tipo
          Text(
            isOficio ? 'Profesional Independiente' : 'Negocio Establecido',
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            isOficio
                ? 'Tu perfil personal como electricista, gasfitero, pintor y más'
                : 'La vitrina digital de tu local: restaurante, salón, taller...',
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 28),

          // Planes
          const Text(
            'ELIGE TU PLAN',
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 14),

          ...plans.map(
            (plan) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _PlanCard(plan: plan),
            ),
          ),

          const SizedBox(height: 8),
          const _FreePeriodBanner(),
          const SizedBox(height: 28),

          // CTA: Registrarse
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) =>
                        const LoginScreen(initialMode: AuthMode.register),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: const Text(
                'Registrarme y empezar gratis',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          const SizedBox(height: 12),
          const Center(
            child: Text(
              'Sin tarjeta de crédito • Sin compromisos',
              style: TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  static const _benefits = [
    {
      'icon': Icons.visibility_rounded,
      'title': 'Visibilidad inmediata',
      'subtitle':
          'Tu servicio aparece en el mapa de tu localidad desde el día 1.',
      'color': AppColors.primary,
    },
    {
      'icon': Icons.chat_rounded,
      'title': 'Contacto directo',
      'subtitle':
          'Los clientes te escriben por WhatsApp o te llaman sin pasar por nadie.',
      'color': AppColors.whatsapp,
    },
    {
      'icon': Icons.shield_rounded,
      'title': 'Perfil verificado',
      'subtitle': 'Sube tus documentos y obtén el check azul de confianza.',
      'color': AppColors.verified,
    },
    {
      'icon': Icons.bar_chart_rounded,
      'title': 'Métricas reales',
      'subtitle':
          'Sabe cuántos clientes potenciales vieron tu perfil cada semana.',
      'color': AppColors.available,
    },
  ];
}

// ─── Widgets auxiliares del modal ─────────────────────────

class _BenefitRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;

  const _BenefitRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String value;
  final String label;
  final Color color;

  const _StatCard({
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textMuted,
              fontSize: 10,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

class _TypeCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String tag;
  final List<Color> gradient;
  final VoidCallback onTap;

  const _TypeCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.tag,
    required this.gradient,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withOpacity(0.06)),
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: gradient),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: Colors.white, size: 26),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.arrow_forward_ios_rounded,
              color: AppColors.textMuted,
              size: 16,
            ),
          ],
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final _PlanData plan;
  const _PlanCard({required this.plan});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: plan.isHighlighted
            ? AppColors.primary.withOpacity(0.08)
            : AppColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: plan.isHighlighted
              ? AppColors.primary.withOpacity(0.4)
              : Colors.white.withOpacity(0.06),
          width: plan.isHighlighted ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                plan.name,
                style: TextStyle(
                  color: plan.isHighlighted
                      ? AppColors.primary
                      : AppColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (plan.isHighlighted) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Popular',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
              const Spacer(),
              RichText(
                text: TextSpan(
                  children: [
                    TextSpan(
                      text: plan.price,
                      style: TextStyle(
                        color: plan.isHighlighted
                            ? AppColors.primary
                            : AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    TextSpan(
                      text: '\n${plan.period}',
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
                textAlign: TextAlign.right,
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...plan.features.map(
            (f) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Icon(
                    Icons.check_circle_rounded,
                    size: 16,
                    color: plan.isHighlighted
                        ? AppColors.primary
                        : AppColors.available,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    f,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FreePeriodBanner extends StatelessWidget {
  const _FreePeriodBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.available.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.available.withOpacity(0.3)),
      ),
      child: const Row(
        children: [
          Icon(Icons.celebration_rounded, color: AppColors.available, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Los primeros proveedores de cada localidad obtienen '
              '2 meses gratis con todos los beneficios del plan Estándar.',
              style: TextStyle(
                color: AppColors.available,
                fontSize: 12,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PlanData {
  final String name;
  final String price;
  final String period;
  final List<String> features;
  final bool isHighlighted;

  const _PlanData({
    required this.name,
    required this.price,
    required this.period,
    required this.features,
    required this.isHighlighted,
  });
}
