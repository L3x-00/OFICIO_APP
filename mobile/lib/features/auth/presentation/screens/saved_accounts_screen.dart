import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../data/saved_accounts_storage.dart';
import '../providers/auth_provider.dart';

class SavedAccountsScreen extends StatefulWidget {
  const SavedAccountsScreen({super.key});

  @override
  State<SavedAccountsScreen> createState() => _SavedAccountsScreenState();
}

class _SavedAccountsScreenState extends State<SavedAccountsScreen> {
  List<SavedAccount> _accounts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final accounts = await SavedAccountsStorage.getAll();
    if (mounted) {
      setState(() {
        _accounts = accounts;
        _loading  = false;
      });
    }
  }

  Future<void> _remove(String email) async {
    final confirmed = await _confirmDelete(email);
    if (!confirmed) return;
    await SavedAccountsStorage.remove(email);
    await _load();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cuenta eliminada del dispositivo'),
          backgroundColor: AppColors.available,
        ),
      );
    }
  }

  Future<bool> _confirmDelete(String email) async {
    final c = context.colors;
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Eliminar cuenta guardada',
            style: TextStyle(color: c.textPrimary)),
        content: Text(
          '¿Deseas eliminar "$email" de este dispositivo?\nTu cuenta no se borrará, solo la sesión guardada.',
          style: TextStyle(color: c.textSecondary, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.busy,
              shape:
                  RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Eliminar',
                style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  Future<void> _loginAs(SavedAccount account) async {
    final auth = context.read<AuthProvider>();
    final ok = await auth.loginFromSaved(account);
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.error ?? 'No se pudo restaurar la sesión'),
          backgroundColor: AppColors.busy,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        iconTheme: IconThemeData(color: c.textPrimary),
        title: Text(
          'Cuentas guardadas',
          style: TextStyle(
              color: c.textPrimary, fontWeight: FontWeight.bold),
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : _accounts.isEmpty
              ? _EmptyState()
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
                      child: Text(
                        'GUARDADAS EN ESTE DISPOSITIVO (${_accounts.length}/${SavedAccountsStorage.maxAccounts})',
                        style: TextStyle(
                          color: c.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ),
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                        itemCount: _accounts.length,
                        itemBuilder: (_, i) => _AccountTile(
                          account:  _accounts[i],
                          onLogin:  () => _loginAs(_accounts[i]),
                          onDelete: () => _remove(_accounts[i].email),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}

// ─── Empty state ──────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 48),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.people_outline_rounded, size: 64, color: c.textMuted),
            const SizedBox(height: 16),
            Text(
              'Sin cuentas guardadas',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Activa "Mantener sesión iniciada" al ingresar para guardar tu cuenta en este dispositivo (máximo 3).',
              textAlign: TextAlign.center,
              style:
                  TextStyle(color: c.textSecondary, fontSize: 14, height: 1.6),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Tile de cuenta ───────────────────────────────────────

class _AccountTile extends StatelessWidget {
  final SavedAccount account;
  final VoidCallback onLogin;
  final VoidCallback onDelete;

  const _AccountTile({
    required this.account,
    required this.onLogin,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
        boxShadow: c.isDark
            ? null
            : [
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 6)
              ],
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 46,
          height: 46,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
                colors: [AppColors.primary, AppColors.primaryDark]),
          ),
          child: Center(
            child: Text(
              account.initial,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        title: Text(
          account.fullName,
          style: TextStyle(
              color: c.textPrimary, fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          account.email,
          style: TextStyle(color: c.textSecondary, fontSize: 13),
        ),
        trailing: Consumer<AuthProvider>(
          builder: (_, auth, _) => Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              auth.isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          color: AppColors.primary, strokeWidth: 2),
                    )
                  : TextButton(
                      onPressed: onLogin,
                      child: const Text(
                        'Ingresar',
                        style: TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
              IconButton(
                icon: const Icon(Icons.delete_outline_rounded,
                    color: AppColors.busy, size: 20),
                onPressed: onDelete,
                tooltip: 'Eliminar cuenta guardada',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
