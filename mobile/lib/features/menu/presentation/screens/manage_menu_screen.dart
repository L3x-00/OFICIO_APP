import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/models/menu_item_model.dart';
import '../providers/menu_manager_provider.dart';
import '../widgets/menu_item_form_sheet.dart';

/// Pantalla de GESTIÓN de la carta para el panel del proveedor.
class ManageMenuScreen extends StatelessWidget {
  const ManageMenuScreen({super.key, required this.providerId});

  final int providerId;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => MenuManagerProvider(providerId)..load(),
      child: const _ManageMenuView(),
    );
  }
}

class _ManageMenuView extends StatelessWidget {
  const _ManageMenuView();

  Future<void> _openForm(
    BuildContext context,
    MenuManagerProvider manager, {
    MenuItemModel? existing,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => MenuItemFormSheet(manager: manager, existing: existing),
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    MenuManagerProvider manager,
    MenuItemModel item,
  ) async {
    final c = context.colors;
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        title: Text('Eliminar plato', style: TextStyle(color: c.textPrimary)),
        content: Text(
          '¿Eliminar "${item.name}" de tu carta?',
          style: TextStyle(color: c.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Eliminar',
              style: TextStyle(color: AppColors.busy),
            ),
          ),
        ],
      ),
    );
    if (ok == true) {
      final err = await manager.remove(item.id);
      if (err != null && context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(err)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final manager = context.watch<MenuManagerProvider>();
    final c = context.colors;
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(title: const Text('Mi carta'), backgroundColor: c.bgCard),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.amber,
        foregroundColor: AppColors.onSolid(AppColors.amber),
        onPressed: () => _openForm(context, manager),
        icon: const Icon(Icons.add),
        label: const Text('Añadir plato'),
      ),
      body: switch (manager.status) {
        MenuStatus.loading ||
        MenuStatus.idle => const Center(child: CircularProgressIndicator()),
        MenuStatus.error => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                manager.error ?? 'Error',
                style: TextStyle(color: c.textSecondary),
              ),
              const SizedBox(height: 10),
              OutlinedButton(
                onPressed: manager.load,
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
        MenuStatus.loaded =>
          manager.items.isEmpty
              ? const _EmptyManage()
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 90),
                  itemCount: manager.items.length,
                  itemBuilder: (_, i) => _ManageItemTile(
                    item: manager.items[i],
                    onEdit: () =>
                        _openForm(context, manager, existing: manager.items[i]),
                    onDelete: () =>
                        _confirmDelete(context, manager, manager.items[i]),
                    onToggle: () =>
                        manager.toggleAvailability(manager.items[i].id),
                  ),
                ),
      },
    );
  }
}

class _ManageItemTile extends StatelessWidget {
  const _ManageItemTile({
    required this.item,
    required this.onEdit,
    required this.onDelete,
    required this.onToggle,
  });

  final MenuItemModel item;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        onTap: onEdit,
        leading: CircleAvatar(
          backgroundColor: c.bgInput,
          child: Icon(
            item.isFeatured ? Icons.star : Icons.restaurant,
            color: item.isFeatured ? AppColors.amber : c.textMuted,
            size: 20,
          ),
        ),
        title: Text(
          item.name,
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          '${menuSectionLabel(item.category ?? 'otro')} · S/ ${item.effectivePrice.toStringAsFixed(2)}'
          '${item.isAvailable ? '' : ' · Agotado'}',
          style: TextStyle(color: c.textMuted, fontSize: 12),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Switch(
              value: item.isAvailable,
              activeThumbColor: AppColors.available,
              onChanged: (_) => onToggle(),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, color: AppColors.busy),
              onPressed: onDelete,
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyManage extends StatelessWidget {
  const _EmptyManage();
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.restaurant_menu, size: 44, color: c.textMuted),
            const SizedBox(height: 12),
            Text(
              'Aún no tienes platos.\nToca "Añadir plato" para empezar tu carta.',
              textAlign: TextAlign.center,
              style: TextStyle(color: c.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
