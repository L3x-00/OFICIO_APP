import 'package:flutter/material.dart';
import 'package:showcaseview/showcaseview.dart';
import '../../core/constants/app_colors.dart';
import 'showcase_data.dart';
import 'showcase_manager.dart';

/// Polling defensivo: espera hasta que TODAS las `keys` tengan
/// `currentContext` (= están montadas y han pasado por su primera
/// build) o hasta `maxMs`. Retorna las keys que sí están montadas
/// al momento de salir (puede ser un subset si el timeout expira
/// antes de que algunas monten).
///
/// Reemplaza al `await Future.delayed(500)` fijo que era frágil en
/// equipos lentos (Android low-end con slivers grandes podían tardar
/// > 500ms en montar la primera ServiceCard).
Future<List<GlobalKey>> _waitForKeys(
  List<GlobalKey> keys, {
  int maxMs = 1500,
  int pollMs = 80,
}) async {
  final start = DateTime.now();
  while (true) {
    final live = keys.where((k) => k.currentContext != null).toList();
    if (live.length == keys.length) return live;
    if (DateTime.now().difference(start).inMilliseconds >= maxMs) return live;
    await Future<void>.delayed(Duration(milliseconds: pollMs));
  }
}

/// Tooltip custom reusable: title + description + botones "Omitir" /
/// "Siguiente" o "Empezar" en el último paso. Cada widget target lo
/// declara como `Showcase.withWidget(container: ShowcaseTooltipCard(...))`.
class ShowcaseTooltipCard extends StatelessWidget {
  final String title;
  final String description;
  final bool isLast;
  final VoidCallback onNext;
  final VoidCallback onSkip;

  const ShowcaseTooltipCard({
    super.key,
    required this.title,
    required this.description,
    required this.isLast,
    required this.onNext,
    required this.onSkip,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 320),
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A1F),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.55),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            description,
            style: const TextStyle(
              color: Color(0xFFD1D5DB),
              fontSize: 13,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              TextButton(
                onPressed: onSkip,
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  minimumSize: const Size(0, 32),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text(
                  'Omitir',
                  style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                ),
              ),
              const Spacer(),
              ElevatedButton(
                onPressed: onNext,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
                child: Text(
                  isLast ? 'Empezar' : 'Siguiente',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Wrapper para cada widget target: aplica `Showcase.withWidget` con
/// el `ShowcaseTooltipCard` correspondiente y resuelve los handlers
/// `onNext`/`onSkip` desde el `ShowCaseWidget` ancestro.
///
/// Uso:
///   ShowcaseTarget(
///     step: kShowcaseStepsRegistered[0],
///     isLast: false,
///     child: widget-target,
///   )
class ShowcaseTarget extends StatelessWidget {
  final ShowcaseStep step;
  final bool isLast;
  final Widget child;

  /// NOTA: estos params existen por compatibilidad con call-sites
  /// previos pero NO se usan — en `Showcase.withWidget`, los argumentos
  /// `height`/`width` describen el tamaño del *container del tooltip*,
  /// no el del target. El spotlight se calcula del RenderBox real del
  /// child. Usamos un container fijo (320x160) que envuelve al
  /// [ShowcaseTooltipCard].
  final double targetHeight;
  final double targetWidth;

  const ShowcaseTarget({
    super.key,
    required this.step,
    required this.isLast,
    required this.child,
    this.targetHeight = 50,
    this.targetWidth  = 50,
  });

  @override
  Widget build(BuildContext context) {
    return Showcase.withWidget(
      key: step.key,
      // Dimensiones del tooltip — fijas, NO del target. El tooltip
      // real (ShowcaseTooltipCard) se limita a maxWidth=320 vía
      // BoxConstraints interno; aquí reservamos el slot que el lib
      // posiciona junto al spotlight.
      height: 160,
      width:  320,
      targetBorderRadius: BorderRadius.circular(12),
      targetPadding: const EdgeInsets.all(4),
      overlayColor: Colors.black,
      overlayOpacity: 0.78,
      disposeOnTap: false,
      // Tap sobre el target NO avanza — todo se controla por botones
      // del tooltip para que el usuario decida cuándo seguir.
      onTargetClick: () {},
      container: Builder(builder: (ctx) {
        return ShowcaseTooltipCard(
          title: step.title,
          description: step.description,
          isLast: isLast,
          onNext: () {
            final state = ShowCaseWidget.of(ctx);
            if (isLast) {
              state.dismiss();
            } else {
              state.next();
            }
          },
          onSkip: () => ShowCaseWidget.of(ctx).dismiss(),
        );
      }),
      child: child,
    );
  }
}

/// Raíz del Feature Discovery — debe envolver el AppShell para que
/// TODOS los `Showcase`/`ShowcaseTarget` (incluyendo los del
/// BottomNavigationBar y la pantalla principal) encuentren un mismo
/// `ShowCaseWidget` ancestro.
///
/// `onFinish` dispara al completar el último paso o al pulsar
/// "Omitir". Como aquí no conocemos al usuario (auth está dentro), el
/// marcado se delega a [HomeShowcaseHost] mediante el callback.
class ShowcaseRoot extends StatefulWidget {
  final Widget child;
  const ShowcaseRoot({super.key, required this.child});

  static _ShowcaseRootState? _of(BuildContext context) =>
      context.findAncestorStateOfType<_ShowcaseRootState>();

  @override
  State<ShowcaseRoot> createState() => _ShowcaseRootState();
}

class _ShowcaseRootState extends State<ShowcaseRoot> {
  int? _activeUserId;
  bool _activeIsGuest = true;

  void _registerActive({required int? userId, required bool isGuest}) {
    _activeUserId  = userId;
    _activeIsGuest = isGuest;
  }

  @override
  Widget build(BuildContext context) {
    return ShowCaseWidget(
      // Scroll automático si el target queda fuera del viewport
      // (ej. la primera ServiceCard cuando hay banners arriba que
      // empujan la lista hacia abajo).
      enableAutoScroll: true,
      // C-7: bloquear tap en el fondo oscuro para que el user no
      // dismiss accidentalmente el tour tocando fuera del spotlight.
      // Avance/cierre solo via los botones del ShowcaseTooltipCard.
      disableBarrierInteraction: true,
      autoPlayDelay: const Duration(milliseconds: 300),
      onFinish: () {
        ShowcaseManager.markSeen(
          userId: _activeUserId,
          isGuest: _activeIsGuest,
        );
      },
      builder: (ctx) => widget.child,
    );
  }
}

/// Auto-trigger del tutorial dentro de la pantalla principal. Lee el
/// user actual (registered/guest), registra los datos en el
/// [ShowcaseRoot] ancestro (para que `onFinish` los use) y dispara
/// `startShowCase` con el deck correspondiente — solo la primera vez.
///
/// Si el usuario cierra la app sin terminar el tour, al volver lo
/// vuelve a ver (`markSeen` solo corre on finish/skip).
class HomeShowcaseHost extends StatelessWidget {
  /// userId del registrado. null si es invitado.
  final int? userId;
  final bool isGuest;
  final Widget child;

  const HomeShowcaseHost({
    super.key,
    required this.userId,
    required this.isGuest,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    // Registra al user actual en el root para que el `onFinish` del
    // ShowCaseWidget sepa contra quién persistir el flag.
    ShowcaseRoot._of(context)?._registerActive(
      userId: userId,
      isGuest: isGuest,
    );
    return _AutoStart(
      userId: userId,
      isGuest: isGuest,
      child: child,
    );
  }
}

/// Watcher interno: cuando el sub-tree se monta, consulta `hasSeen`;
/// si es false llama a `startShowCase` con el deck correspondiente
/// (registrado o invitado).
class _AutoStart extends StatefulWidget {
  final int? userId;
  final bool isGuest;
  final Widget child;
  const _AutoStart({
    required this.userId,
    required this.isGuest,
    required this.child,
  });

  @override
  State<_AutoStart> createState() => _AutoStartState();
}

class _AutoStartState extends State<_AutoStart> {
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _maybeStart();
  }

  /// C-8: si cambia la identidad (guest → registrado tras login en la
  /// misma sesión, o user logout → guest), reseteamos `_started` para
  /// reevaluar contra el deck del nuevo rol.
  @override
  void didUpdateWidget(covariant _AutoStart oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.userId != widget.userId || oldWidget.isGuest != widget.isGuest) {
      _started = false;
      _maybeStart();
    }
  }

  Future<void> _maybeStart() async {
    if (_started) return;
    // Esperamos a que el primer frame se pinte para que todos los
    // GlobalKey estén montados — startShowCase falla silenciosamente
    // si una key no está en el árbol.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted || _started) return;
      final seen = await ShowcaseManager.hasSeen(
        userId: widget.userId,
        isGuest: widget.isGuest,
      );
      if (!mounted) return;
      if (seen) {
        // C-5: solo marcamos _started cuando ya tenemos respuesta —
        // si hasSeen fallara, didChangeDependencies puede reintentar.
        _started = true;
        return;
      }
      final steps = widget.isGuest
          ? kShowcaseStepsGuest
          : kShowcaseStepsRegistered;

      // C-6: polling con timeout en vez de delay fijo. En equipos
      // lentos un sliver grande puede tardar > 500ms en montar la
      // primera ServiceCard; antes el delay fijo disparaba con la
      // key sin RenderBox. Ahora esperamos hasta que TODAS las keys
      // del deck estén montadas, máximo 1.5s.
      //
      // C-1 + C-2: el polling retorna el subset que SÍ se montó al
      // expirar el timeout (caso edge: empty state de providers
      // donde kShowcaseProviderCard nunca aparece). Si liveKeys
      // queda vacío, NO marcamos seen para que la próxima build
      // (cuando carguen los providers) reintente.
      final liveKeys = await _waitForKeys(steps.map((s) => s.key).toList());
      if (!mounted) return;
      if (liveKeys.isEmpty) return;
      _started = true;
      ShowCaseWidget.of(context).startShowCase(liveKeys);
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

// ═══════════════════════════════════════════════════════════════
// PANEL DEL PROVEEDOR — wrapper + trigger por tab
// ═══════════════════════════════════════════════════════════════

/// Envuelve el `ProviderPanel` con su PROPIO `ShowCaseWidget` —
/// aislado del cliente. Razón: el deck del cliente vive bajo el
/// `ShowcaseRoot` del `AppShell`; cuando el user abre el panel vía
/// `rootNavigator.push(...)`, esta ruta queda FUERA del subtree del
/// shell, así que necesita su propio root. Beneficio extra: los
/// GlobalKey del panel nunca colisionan con los del cliente porque
/// viven en árboles `Overlay` distintos.
///
/// `markSeen` se delega al [AdminTabShowcase] que conoce el tab
/// activo — el `onFinish` aquí solo dispara la persistencia con los
/// datos registrados.
class AdminShowcaseWrapper extends StatefulWidget {
  final Widget child;
  const AdminShowcaseWrapper({super.key, required this.child});

  static _AdminShowcaseWrapperState? _of(BuildContext context) =>
      context.findAncestorStateOfType<_AdminShowcaseWrapperState>();

  @override
  State<AdminShowcaseWrapper> createState() => _AdminShowcaseWrapperState();
}

class _AdminShowcaseWrapperState extends State<AdminShowcaseWrapper> {
  // Datos del tab que está corriendo el tutorial en este momento — el
  // `AdminTabShowcase` los registra cuando dispara el showcase para
  // que `onFinish` sepa contra qué clave persistir.
  String? _activeTab;
  int?    _activeUserId;
  String? _activeProviderType;

  /// C-9: bandera para distinguir "dismiss por user" (botón Omitir o
  /// Empezar) vs "dismiss programático" (cambio de tab). Solo el
  /// primero marca el tab como visto. El segundo deja el flag intacto
  /// para que el user vea el tour si vuelve al tab en una sesión
  /// futura.
  bool _suppressNextOnFinishMark = false;

  void _registerActive({
    required String tab,
    required int    userId,
    required String providerType,
  }) {
    _activeTab          = tab;
    _activeUserId       = userId;
    _activeProviderType = providerType;
  }

  void _clearActive() {
    _activeTab          = null;
    _activeUserId       = null;
    _activeProviderType = null;
  }

  /// Llamado por `AdminTabShowcase.dismissActive` antes del `dismiss`
  /// programático. El onFinish leerá esta bandera y se saltará el
  /// `markSeenAdminTab` — el user no completó el tour, solo cambió
  /// de tab, así que no lo consideramos "visto".
  void _suppressNextOnFinish() {
    _suppressNextOnFinishMark = true;
  }

  @override
  Widget build(BuildContext context) {
    return ShowCaseWidget(
      // autoScroll para que pasos debajo del pliegue (gráfico, FAB)
      // hagan scroll automático al viewport antes del spotlight.
      enableAutoScroll: true,
      // C-7: bloquear tap en el fondo oscuro.
      disableBarrierInteraction: true,
      autoPlayDelay: const Duration(milliseconds: 300),
      onFinish: () {
        if (_suppressNextOnFinishMark) {
          // C-9: fue un dismiss programático (cambio de tab). No
          // marcamos seen — el user no terminó el tour. La sesión
          // actual queda con `_started=true` (no re-dispara hasta
          // restart de app), pero al volver a abrir la app verá el
          // tour normalmente desde SharedPreferences.
          _suppressNextOnFinishMark = false;
          _clearActive();
          return;
        }
        final tab    = _activeTab;
        final userId = _activeUserId;
        final type   = _activeProviderType;
        if (tab != null && userId != null && type != null) {
          ShowcaseManager.markSeenAdminTab(
            tab:          tab,
            userId:       userId,
            providerType: type,
          );
        }
        _clearActive();
      },
      builder: (ctx) => widget.child,
    );
  }
}

/// Disparador por tab. Móntalo dentro del tab correspondiente (Home,
/// Services o Stats). Cuando el tab se monta:
///   1. Verifica que `verificationStatus`/`isVerified` == aprobado.
///   2. Verifica que NO se haya visto antes (clave por tab + user +
///      providerType).
///   3. Construye los pasos dinámicos (filtra los condicionales:
///      switch-role solo si hay ambos perfiles, FAB solo si está en
///      el límite, etc.).
///   4. Dispara `startShowCase` tras un delay de 300ms para que la
///      animación de transición del tab termine antes del spotlight.
///
/// Si el user cambia de tab mid-tour, el `ProviderPanel` llama a
/// [dismissActive] desde el `onTap` del BottomNav — el `markSeen`
/// del `onFinish` se ejecuta y ese tab queda marcado.
class AdminTabShowcase extends StatefulWidget {
  /// Identificador del tab — usa [AdminTab.home/services/stats].
  final String tab;
  /// userId del provider activo (no del rol cliente).
  final int? userId;
  /// 'OFICIO' o 'NEGOCIO'.
  final String providerType;
  /// True si el provider ya está aprobado. Si false, NO se dispara.
  final bool isApproved;
  /// Pasos del deck — generados por `buildAdmin{Tab}Steps(...)`. Si
  /// la lista está vacía, el tab no tiene tutorial.
  final List<ShowcaseStep> steps;
  final Widget child;

  const AdminTabShowcase({
    super.key,
    required this.tab,
    required this.userId,
    required this.providerType,
    required this.isApproved,
    required this.steps,
    required this.child,
  });

  /// Cancela el tutorial activo (cualquier tab). Lo llama el
  /// `ProviderPanel` al cambiar de tab. Es seguro llamarlo cuando no
  /// hay tutorial activo — `dismiss()` es idempotente.
  ///
  /// C-9: marca el dismiss como "programático" en el wrapper antes
  /// de invocar al ShowCaseWidget. El onFinish del wrapper detecta
  /// esa bandera y se salta el `markSeenAdminTab` — el user no
  /// completó el tour, solo cambió de tab. Próxima sesión lo verá.
  static void dismissActive(BuildContext context) {
    AdminShowcaseWrapper._of(context)?._suppressNextOnFinish();
    try {
      ShowCaseWidget.of(context).dismiss();
    } catch (_) {
      // Sin ShowCaseWidget ancestro — nada que cancelar.
    }
  }

  @override
  State<AdminTabShowcase> createState() => _AdminTabShowcaseState();
}

class _AdminTabShowcaseState extends State<AdminTabShowcase> {
  /// C-15: flag de instancia. Como AdminTabShowcase es child de
  /// IndexedStack, su State persiste mientras viva el panel —
  /// volver al mismo tab dentro de la misma sesión NO re-dispara
  /// el tour aunque `dismissActive` (C-9) ya NO marque seen en
  /// SharedPreferences. Trade-off intencional para que el user no
  /// vea spotlight de nuevo apenas toca otro tab y vuelve. Para
  /// re-disparo en sesiones futuras: SharedPreferences sigue limpio
  /// y la próxima vez que abra la app, el deck arranca normal.
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _maybeStart();
  }

  /// C-4: didChangeDependencies SOLO corre cuando una InheritedWidget
  /// cambia — no cuando los props del widget cambian. Si la primera
  /// build llegó con `isApproved=false` (dashboard aún cargando) y
  /// luego el padre re-builda con `isApproved=true`, sin esto el tour
  /// nunca dispara. didUpdateWidget cubre ese caso.
  @override
  void didUpdateWidget(covariant AdminTabShowcase oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_started) return;
    final approvedChanged = oldWidget.isApproved != widget.isApproved;
    final stepsChanged    = oldWidget.steps.length != widget.steps.length;
    final userChanged     = oldWidget.userId != widget.userId;
    if (approvedChanged || stepsChanged || userChanged) {
      _maybeStart();
    }
  }

  void _maybeStart() {
    if (_started) return;
    if (!widget.isApproved)      return;
    if (widget.userId == null)   return;
    if (widget.steps.isEmpty)    return;

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted || _started) return;
      final seen = await ShowcaseManager.hasSeenAdminTab(
        tab:          widget.tab,
        userId:       widget.userId!,
        providerType: widget.providerType,
      );
      if (!mounted) return;
      if (seen) {
        // C-5: marcar _started solo tras conocer el flag — si
        // hasSeen fallara, didUpdateWidget puede reintentar.
        _started = true;
        return;
      }

      // C-6: 300ms iniciales para que la animación de cambio de
      // tab termine, luego polling hasta 1s para que las keys
      // condicionales (FAB en atLimit, switch role en dual) monten
      // su RenderBox tras la primera build.
      await Future<void>.delayed(const Duration(milliseconds: 300));
      if (!mounted) return;

      // C-1: filtrar pasos cuya key no esté montada en el árbol.
      // Pasos condicionales pueden estar declarados en `widget.steps`
      // pero el wrapper físico oculto si el render del padre ya filtró
      // ese caso (ej. FAB no aparece si !atLimit). Defensa en profundidad.
      final liveKeys = await _waitForKeys(
        widget.steps.map((s) => s.key).toList(),
        maxMs: 1000,
      );
      if (!mounted) return;
      if (liveKeys.isEmpty) return;

      AdminShowcaseWrapper._of(context)?._registerActive(
        tab:          widget.tab,
        userId:       widget.userId!,
        providerType: widget.providerType,
      );
      _started = true;
      ShowCaseWidget.of(context).startShowCase(liveKeys);
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
