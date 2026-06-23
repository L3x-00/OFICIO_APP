import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../domain/models/catalog_product_model.dart';
import '../providers/catalog_manager_provider.dart';
import '../widgets/catalog_product_form_sheet.dart';

/// Pantalla de GESTIÓN del catálogo para el panel del proveedor.
class ManageCatalogScreen extends StatelessWidget {
  const ManageCatalogScreen({super.key, required this.providerId});

  final int providerId;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => CatalogManagerProvider(providerId)..load(),
      child: const _ManageCatalogView(),
    );
  }
}

class _ManageCatalogView extends StatelessWidget {
  const _ManageCatalogView();

  Future<void> _openForm(
    BuildContext context,
    CatalogManagerProvider manager, {
    CatalogProductModel? existing,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          CatalogProductFormSheet(manager: manager, existing: existing),
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    CatalogManagerProvider manager,
    CatalogProductModel item,
  ) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.bgCard,
        title: const Text(
          'Eliminar producto',
          style: TextStyle(color: AppColors.textPrimary),
        ),
        content: Text(
          '¿Eliminar "${item.name}" de tu catálogo?',
          style: const TextStyle(color: AppColors.textSecondary),
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
    final manager = context.watch<CatalogManagerProvider>();
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        title: const Text('Mi catálogo'),
        backgroundColor: AppColors.bgCard,
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.amber,
        foregroundColor: Colors.black,
        onPressed: () => _openForm(context, manager),
        icon: const Icon(Icons.add),
        label: const Text('Añadir producto'),
      ),
      body: switch (manager.status) {
        CatalogStatus.loading ||
        CatalogStatus.idle => const Center(child: CircularProgressIndicator()),
        CatalogStatus.error => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                manager.error ?? 'Error',
                style: const TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 10),
              OutlinedButton(
                onPressed: manager.load,
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
        CatalogStatus.loaded =>
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

  final CatalogProductModel item;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final stockTxt = item.stock != null ? ' · ${item.stock} und' : '';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        onTap: onEdit,
        leading: const CircleAvatar(
          backgroundColor: AppColors.bgInput,
          child: Icon(Icons.inventory_2, color: AppColors.textMuted, size: 20),
        ),
        title: Text(
          item.name,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          'S/ ${item.effectivePrice.toStringAsFixed(2)}$stockTxt'
          '${item.isSoldOut ? ' · Agotado' : ''}',
          style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
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
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.storefront, size: 44, color: AppColors.textMuted),
            SizedBox(height: 12),
            Text(
              'Aún no tienes productos.\nToca "Añadir producto" para empezar tu catálogo.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
