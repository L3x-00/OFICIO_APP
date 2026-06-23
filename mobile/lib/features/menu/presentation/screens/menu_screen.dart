import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../data/menu_repository.dart';
import '../../domain/models/menu_item_model.dart';
import '../widgets/menu_item_card.dart';

/// Carta PÚBLICA de un proveedor (vista cliente), agrupada por sección.
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

  @override
  void initState() {
    super.initState();
    _future = _repo.getMenu(widget.providerId);
  }

  void _reload() {
    setState(() => _future = _repo.getMenu(widget.providerId));
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
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 28),
              itemCount: menu.sections.length,
              itemBuilder: (_, i) => _SectionBlock(section: menu.sections[i]),
            ),
          );
        },
      ),
    );
  }
}

class _SectionBlock extends StatelessWidget {
  const _SectionBlock({required this.section});
  final MenuSection section;

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
        ...section.items.map((it) => MenuItemCard(item: it)),
      ],
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
