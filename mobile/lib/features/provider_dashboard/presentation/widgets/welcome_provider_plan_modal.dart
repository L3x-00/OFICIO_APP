import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Modal de bienvenida exclusivo para proveedores recién aprobados con
/// el plan de cortesía ESTANDAR de 1 mes. Carrusel de 4 páginas que
/// explica los beneficios; al final, botón "Entendido" que cierra.
///
/// Trigger: se invoca desde `PanelHomeTab` cuando se detecta que el
/// provider tiene `subscription.plan == 'ESTANDAR'`,
/// `subscription.status == 'GRACIA'` y no se ha mostrado antes (flag en
/// SharedPreferences `seen_welcome_estandar_{providerId}`).
class WelcomeProviderPlanModal extends StatefulWidget {
  /// Nombre o businessName que se saluda en el primer slide.
  final String displayName;
  /// providerId — usado para construir la clave de SharedPreferences que
  /// marca que el modal ya se vio.
  final int providerId;

  const WelcomeProviderPlanModal({
    super.key,
    required this.displayName,
    required this.providerId,
  });

  /// Llave de persistencia del flag "ya visto" por proveedor.
  static String _flagKey(int providerId) => 'seen_welcome_estandar_$providerId';

  /// Devuelve true si el modal aún NO se ha mostrado para este providerId.
  static Future<bool> shouldShow(int providerId) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_flagKey(providerId)) != true;
  }

  /// Marca este providerId como "ya vio el modal". Idempotente.
  static Future<void> markShown(int providerId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_flagKey(providerId), true);
  }

  /// Helper conveniente: muestra el modal y registra el flag al cerrarlo.
  /// No vuelve a abrirlo si ya se mostró antes.
  static Future<void> showIfFirstTime(
    BuildContext context, {
    required String displayName,
    required int providerId,
  }) async {
    if (!await shouldShow(providerId)) return;
    if (!context.mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.65),
      builder: (_) => WelcomeProviderPlanModal(
        displayName: displayName,
        providerId: providerId,
      ),
    );
    await markShown(providerId);
  }

  @override
  State<WelcomeProviderPlanModal> createState() => _WelcomeProviderPlanModalState();
}

class _WelcomeProviderPlanModalState extends State<WelcomeProviderPlanModal>
    with SingleTickerProviderStateMixin {
  final _page = PageController();
  late final AnimationController _fadeCtrl;
  late final Animation<double> _fade;
  int _currentPage = 0;

  // Páginas del carrusel — la primera es saludo + anuncio del trial,
  // las siguientes describen beneficios concretos del plan ESTANDAR.
  static const _slides = <_Slide>[
    _Slide(
      icon: Icons.celebration_rounded,
      gradient: [Color(0xFFFFB300), Color(0xFFFF8F00)],
      title: '¡Bienvenido a OficioApp!',
      bodyTemplate:
          'Como regalo de bienvenida, tu cuenta tiene el plan '
          'Estándar activado por 1 mes completamente gratis. '
          'Aprovéchalo para probar todo lo que OficioApp puede '
          'hacer por tu negocio.',
      pill: 'PLAN ESTÁNDAR · 1 MES GRATIS',
    ),
    _Slide(
      icon: Icons.trending_up_rounded,
      gradient: [Color(0xFF00C6FF), Color(0xFF0072FF)],
      title: 'Apareces antes en los resultados',
      bodyTemplate:
          'Con el plan Estándar tu perfil sube en el ranking de búsqueda. '
          'Más clientes te ven primero cuando filtran por tu categoría '
          'o tu ciudad.',
      pill: 'MÁS VISIBILIDAD',
    ),
    _Slide(
      icon: Icons.photo_library_rounded,
      gradient: [Color(0xFF00E676), Color(0xFF00897B)],
      title: 'Hasta 6 fotos y 6 servicios',
      bodyTemplate:
          'Muestra tu trabajo con galería ampliada y publica hasta '
          '6 servicios (o productos si tienes Negocio). Más detalle = '
          'más clientes interesados.',
      pill: 'CATÁLOGO AMPLIADO',
    ),
    _Slide(
      icon: Icons.insights_rounded,
      gradient: [Color(0xFF8E2DE2), Color(0xFF4A00E0)],
      title: 'Estadísticas en tiempo real',
      bodyTemplate:
          'Mira cuántas visitas, llamadas y mensajes recibes cada '
          'día. Toma decisiones con datos: descubre qué horas '
          'rinden más y qué servicios generan más interés.',
      pill: 'INSIGHTS',
    ),
    _Slide(
      icon: Icons.verified_rounded,
      gradient: [Color(0xFFFF6B6B), Color(0xFFFF8E53)],
      title: 'Badge de plan visible',
      bodyTemplate:
          'Tu tarjeta pública lleva una insignia de plan que genera '
          'confianza inmediata en los clientes. Profesionales '
          'verificados convierten más.',
      pill: 'CONFIANZA',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 380),
    );
    _fade = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeIn);
    _fadeCtrl.forward();
  }

  @override
  void dispose() {
    _page.dispose();
    _fadeCtrl.dispose();
    super.dispose();
  }

  bool get _isLast => _currentPage == _slides.length - 1;

  void _next() {
    if (_isLast) {
      Navigator.of(context).pop();
    } else {
      _page.nextPage(
        duration: const Duration(milliseconds: 360),
        curve: Curves.easeOutCubic,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return FadeTransition(
      opacity: _fade,
      child: Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 48),
        backgroundColor: Colors.transparent,
        child: Container(
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.4),
                blurRadius: 40,
                offset: const Offset(0, 16),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── Carrusel ─────────────────────────────────────
              SizedBox(
                height: 360,
                child: PageView.builder(
                  controller: _page,
                  onPageChanged: (i) => setState(() => _currentPage = i),
                  itemCount: _slides.length,
                  itemBuilder: (_, i) => _SlidePage(
                    slide: _slides[i],
                    displayName: widget.displayName,
                    isFirst: i == 0,
                  ),
                ),
              ),

              // ── Dots indicador ───────────────────────────────
              Padding(
                padding: const EdgeInsets.only(top: 6, bottom: 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    _slides.length,
                    (i) => AnimatedContainer(
                      duration: const Duration(milliseconds: 280),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: _currentPage == i ? 24 : 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: _currentPage == i
                            ? AppColors.amber
                            : Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ),

              // ── Botón único: "Siguiente" hasta el final, "Entendido" en el último.
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 4, 22, 24),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _next,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.amber,
                      foregroundColor: const Color(0xFF3D2B00),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    child: Text(
                      _isLast ? 'Entendido' : 'Siguiente',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
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
}

class _Slide {
  final IconData icon;
  final List<Color> gradient;
  final String title;
  final String bodyTemplate;
  /// Etiqueta superior tipo "PLAN ESTÁNDAR · 1 MES GRATIS"
  final String pill;

  const _Slide({
    required this.icon,
    required this.gradient,
    required this.title,
    required this.bodyTemplate,
    required this.pill,
  });
}

class _SlidePage extends StatelessWidget {
  final _Slide slide;
  final String displayName;
  final bool isFirst;
  const _SlidePage({
    required this.slide,
    required this.displayName,
    required this.isFirst,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // El primer slide saluda con el nombre del proveedor antes del cuerpo.
    final greeting = isFirst && displayName.trim().isNotEmpty
        ? 'Hola, ${displayName.trim()} 👋\n'
        : '';

    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 26, 28, 8),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          // Pill superior con identidad del beneficio
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.amber.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.amber.withValues(alpha: 0.4)),
            ),
            child: Text(
              slide.pill,
              style: const TextStyle(
                color: AppColors.amber,
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.6,
              ),
            ),
          ),
          const SizedBox(height: 22),

          // Icono con gradiente
          Container(
            width: 92,
            height: 92,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: slide.gradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(26),
              boxShadow: [
                BoxShadow(
                  color: slide.gradient.first.withValues(alpha: 0.38),
                  blurRadius: 22,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Icon(slide.icon, color: Colors.white, size: 42),
          ),
          const SizedBox(height: 22),

          // Título
          Text(
            slide.title,
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.bold,
              height: 1.25,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),

          // Cuerpo (con greeting prepend en el primer slide)
          Flexible(
            child: SingleChildScrollView(
              child: Text(
                '$greeting${slide.bodyTemplate}',
                style: TextStyle(
                  color: c.textSecondary,
                  fontSize: 14,
                  height: 1.6,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
