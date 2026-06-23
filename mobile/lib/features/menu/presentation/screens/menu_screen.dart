import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../data/menu_repository.dart';
import '../../domain/menu_order.dart';
import '../../domain/models/menu_item_model.dart';
import '../widgets/menu_item_card.dart';

/// Carta PÚBLICA de un proveedor (vista cliente), agrupada por sección,
/// con carrito: se agregan varios platos y se piden en UN solo mensaje
/// de WhatsApp.
class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key, required this.providerId, this.businessName});

  final int providerId;
  final String? businessName;

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  final _repo = MenuRepository();
  late Future<ApiResult<MenuResponse>> _future;

  /// itemId → cantidad en el carrito.
  final Map<int, int> _cart = {};

  @override
  void initState() {
    super.initState();
    _future = _repo.getMenu(widget.providerId);
  }

  void _reload() {
    setState(() {
      _cart.clear();
      _future = _repo.getMenu(widget.providerId);
    });
  }

  void _add(int id) => setState(() => _cart[id] = (_cart[id] ?? 0) + 1);

  void _remove(int id) => setState(() {
    final q = (_cart[id] ?? 0) - 1;
    if (q <= 0) {
      _cart.remove(id);
    } else {
      _cart[id] = q;
    }
  });

  List<CartLine> _lines(Map<int, MenuItemModel> byId) => _cart.entries
      .where((e) => byId.containsKey(e.key))
      .map((e) => CartLine(byId[e.key]!, e.value))
      .toList();

  Future<void> _order(String? number, List<CartLine> lines) async {
    final url = buildOrderUrl(
      number: number,
      businessName: widget.businessName ?? 'el negocio',
      lines: lines,
    );
    if (url == null) return;
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: Text(widget.businessName ?? 'Carta'),
        backgroundColor: AppColors.bgCard,
      ),
      body: FutureBuilder<ApiResult<MenuResponse>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final result = snap.data;
          if (result == null || result.isFailure) {
            return _ErrorState(
              message: result?.errorMessage ?? 'No se pudo cargar la carta',
              onRetry: _reload,
            );
          }
          final menu = result.data;
          if (menu.isEmpty) {
            return const _EmptyState();
          }
          final byId = {for (final it in menu.allItems) it.id: it};
          // El número del proveedor sale de cualquier ítem pedible.
          final number = menu.allItems
              .map((it) => extractWhatsappNumber(it.whatsappOrderUrl))
              .firstWhere((n) => n != null, orElse: () => null);
          final orderable = number != null;
          final lines = _lines(byId);

          return Column(
            children: [
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async => _reload(),
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 28),
                    itemCount: menu.sections.length,
                    itemBuilder: (_, i) => _SectionBlock(
                      section: menu.sections[i],
                      quantityOf: (id) => _cart[id] ?? 0,
                      onAdd: orderable ? _add : null,
                      onRemove: _remove,
                    ),
                  ),
                ),
              ),
              if (lines.isNotEmpty)
                _CartBar(
                  count: cartCount(lines),
                  total: cartTotal(lines),
                  onOrder: () => _order(number, lines),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _SectionBlock extends StatelessWidget {
  const _SectionBlock({
    required this.section,
    required this.quantityOf,
    required this.onAdd,
    required this.onRemove,
  });

  final MenuSection section;
  final int Function(int id) quantityOf;
  final void Function(int id)? onAdd;
  final void Function(int id) onRemove;

  @override
  Widget build(BuildContext context) {
    if (section.items.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 6, bottom: 10),
          child: Text(
            section.label,
            style: const TextStyle(
              color: AppColors.amber,
              fontSize: 16,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.2,
            ),
          ),
        ),
        ...section.items.map(
          (it) => MenuItemCard(
            item: it,
            quantity: quantityOf(it.id),
            onAdd: onAdd == null ? null : () => onAdd!(it.id),
            onRemove: () => onRemove(it.id),
          ),
        ),
      ],
    );
  }
}

/// Barra inferior del carrito: total + botón de pedido por WhatsApp.
class _CartBar extends StatelessWidget {
  const _CartBar({
    required this.count,
    required this.total,
    required this.onOrder,
  });

  final int count;
  final double total;
  final VoidCallback onOrder;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 6, 14, 10),
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: onOrder,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.whatsapp,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.chat, size: 18),
                const SizedBox(width: 8),
                Text(
                  'Pedir $count ${count == 1 ? 'plato' : 'platos'} · S/ ${total.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
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

class _EmptyState extends StatelessWidget {
  const _EmptyState();
  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.restaurant_menu, size: 44, color: AppColors.textMuted),
          SizedBox(height: 12),
          Text(
            'Este negocio aún no publicó su carta.',
            style: TextStyle(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 40, color: AppColors.busy),
          const SizedBox(height: 12),
          Text(message, style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: onRetry, child: const Text('Reintentar')),
        ],
      ),
    );
  }
}
