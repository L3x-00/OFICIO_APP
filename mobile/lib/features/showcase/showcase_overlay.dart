import 'package:flutter/material.dart';
import 'package:showcaseview/showcaseview.dart';
import '../../core/constants/app_colors.dart';
import 'showcase_data.dart';
import 'showcase_manager.dart';

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
  /// Tamaño aproximado del target — se usa para `height`/`width` del
  /// container del tooltip (showcaseview lo requiere cuando se usa
  /// `withWidget`). Default razonable para botones; el caller puede
  /// ajustar para widgets grandes (tarjetas).
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
      height: targetHeight,
      width:  targetWidth,
      targetBorderRadius: BorderRadius.circular(12),
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
    if (_started) return;
    _started = true;
    // Esperamos a que el primer frame se pinte para que todos los
    // GlobalKey estén montados — startShowCase falla silenciosamente
    // si una key no está en el árbol.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final seen = await ShowcaseManager.hasSeen(
        userId: widget.userId,
        isGuest: widget.isGuest,
      );
      if (seen || !mounted) return;
      final steps = widget.isGuest
          ? kShowcaseStepsGuest
          : kShowcaseStepsRegistered;
      // Pequeño delay extra para asegurar que el bottom nav del shell
      // padre también está montado (vive fuera de esta sub-tree pero
      // sus keys están registradas globalmente).
      await Future<void>.delayed(const Duration(milliseconds: 250));
      if (!mounted) return;
      ShowCaseWidget.of(context).startShowCase(steps.map((s) => s.key).toList());
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
