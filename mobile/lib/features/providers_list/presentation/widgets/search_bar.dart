import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../providers/providers_provider.dart';

/// Barra de búsqueda colapsable.
///
/// Estado inactivo (default): sólo un ícono de lupa con hint "Toca para
/// buscar..." que parpadea suavemente una vez al montar la pantalla.
/// Estado activo: la lupa se expande animadamente a un TextField que
/// recibe foco automático (abre teclado) y dispara una búsqueda al
/// backend tras un debounce de 400ms.
/// Colapsar: al tocar fuera o presionar la X estando el texto vacío,
/// la barra vuelve al ícono y se cierra el teclado.
class CollapsibleSearchBar extends StatefulWidget {
  const CollapsibleSearchBar({super.key});

  @override
  State<CollapsibleSearchBar> createState() => _CollapsibleSearchBarState();
}

class _CollapsibleSearchBarState extends State<CollapsibleSearchBar>
    with TickerProviderStateMixin {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  Timer? _debounce;
  bool _active = false;

  /// Indica si el hint "Toca para buscar..." todavía debe pulsar una vez.
  /// Se desactiva tras la primera interacción para no distraer.
  bool _showHintPulse = true;

  static const _debounceDuration = Duration(milliseconds: 400);

  @override
  void initState() {
    super.initState();
    // Tras un par de segundos sin interacción ocultamos el pulse del hint.
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _showHintPulse = false);
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _focusNode.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _expand() {
    if (_active) return;
    setState(() {
      _active = true;
      _showHintPulse = false;
    });
    // El TextField se construye en el siguiente frame; pedimos foco entonces
    // para que el teclado se abra solo.
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _focusNode.requestFocus(),
    );
  }

  void _collapse({bool clearText = false}) {
    if (!_active && _controller.text.isEmpty) return;
    _debounce?.cancel();
    if (clearText && _controller.text.isNotEmpty) {
      _controller.clear();
      context.read<ProvidersProvider>().setSearch('');
    }
    _focusNode.unfocus();
    setState(() => _active = false);
  }

  void _onChanged(String v) {
    setState(() {});
    _debounce?.cancel();
    _debounce = Timer(_debounceDuration, () {
      if (!mounted) return;
      context.read<ProvidersProvider>().setSearch(v.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: AnimatedSize(
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
        alignment: Alignment.centerLeft,
        child: _active ? _buildExpanded(c) : _buildCollapsed(c),
      ),
    );
  }

  // ── Estado inactivo: lupa + hint sutil ─────────────────────
  Widget _buildCollapsed(AppThemeColors c) {
    return GestureDetector(
      onTap: _expand,
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          // Botón lupa
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: c.border, width: 0.5),
            ),
            child: Icon(Icons.search_rounded, color: c.textSecondary, size: 22),
          ),
          const SizedBox(width: 10),
          // Hint con pulse suave
          AnimatedOpacity(
            duration: const Duration(milliseconds: 500),
            opacity: _showHintPulse ? 0.9 : 0.45,
            child: Text(
              'Toca para buscar...',
              style: TextStyle(
                color: c.textMuted,
                fontSize: 13.5,
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Estado activo: TextField full-width ────────────────────
  Widget _buildExpanded(AppThemeColors c) {
    return TextField(
      controller: _controller,
      focusNode: _focusNode,
      autofocus: false, // el foco se solicita explícitamente en _expand
      style: TextStyle(color: c.textPrimary),
      onChanged: _onChanged,
      // onTapOutside dispara cuando el usuario toca fuera del TextField;
      // colapsamos para devolver al ícono y cerrar el teclado.
      onTapOutside: (_) {
        // Sólo colapsar si no hay texto — preservamos la query si el usuario
        // se desplaza por la lista y quiere volver al TextField luego con su
        // último término. Una X explícita basta para limpiar.
        if (_controller.text.isEmpty) {
          _collapse();
        } else {
          _focusNode.unfocus();
        }
      },
      decoration: InputDecoration(
        hintText: 'Buscar electricistas, pintores...',
        hintStyle: TextStyle(color: c.textMuted),
        prefixIcon: Icon(Icons.search_rounded, color: c.textMuted),
        suffixIcon: IconButton(
          icon: Icon(Icons.close_rounded, color: c.textMuted),
          tooltip: 'Cerrar búsqueda',
          onPressed: () => _collapse(clearText: true),
        ),
        filled: true,
        fillColor: c.bgCard,
        contentPadding: const EdgeInsets.symmetric(vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.border, width: 0.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
    );
  }
}
