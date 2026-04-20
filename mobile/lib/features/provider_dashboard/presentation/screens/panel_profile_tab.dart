import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/phone_input_section.dart';
import '../../../../shared/widgets/schedule_editor.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../trust_validation/presentation/screens/trust_validation_form_screen.dart';
import '../providers/dashboard_provider.dart';
import '../../domain/models/dashboard_profile_model.dart';

class PanelProfileTab extends StatefulWidget {
  final bool isNegocio;
  final bool isPaused;
  final ValueChanged<bool> onPauseToggle;

  const PanelProfileTab({
    super.key,
    required this.isNegocio,
    required this.isPaused,
    required this.onPauseToggle,
  });

  @override
  State<PanelProfileTab> createState() => _PanelProfileTabState();
}

class _PanelProfileTabState extends State<PanelProfileTab> {
  bool _isSaving = false;
  bool _showAddressCard = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final dash = context.watch<DashboardProvider>();
    final profile = dash.profile;

    return Scaffold(
      backgroundColor: c.bg,
      body: CustomScrollView(
        slivers: [
          _buildAppBar(),
          if (dash.isLoading && profile == null)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator(color: AppColors.amber)),
            )
          else ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Fotos
                    _buildPhotosSection(profile),
                    const SizedBox(height: 20),
                    // Info básica
                    _buildInfoSection(profile, dash),
                    const SizedBox(height: 20),
                    // OFICIO: disponibilidad  |  NEGOCIO: horario de atención
                    if (!widget.isNegocio)
                      _buildAvailabilitySection(profile, dash)
                    else
                      _buildScheduleSection(profile, dash),
                    const SizedBox(height: 20),
                    // Validación de confianza
                    _buildTrustSection(context),
                    const SizedBox(height: 20),
                    // Zona peligrosa
                    _buildDangerZone(context, dash),
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── APP BAR ───────────────────────────────────────────────

  SliverAppBar _buildAppBar() {
    final c    = context.colors;
    final dash = context.watch<DashboardProvider>();
    final busy = _isSaving || dash.isUploadingPhoto;
    return SliverAppBar(
      backgroundColor: c.bgCard,
      pinned: true,
      title: Text(
        widget.isNegocio ? 'Perfil de Negocio' : 'Perfil Profesional',
        style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
      ),
      actions: [
        if (busy)
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                color: dash.isUploadingPhoto ? AppColors.primary : AppColors.amber,
                strokeWidth: 2,
              ),
            ),
          ),
      ],
    );
  }

  // ── FOTOS ─────────────────────────────────────────────────

  Widget _buildPhotosSection(DashboardProfileModel? profile) {
    final c = context.colors;
    final images = profile?.images ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(
          icon: Icons.photo_library_rounded,
          title: 'Fotos del servicio',
          subtitle: '${images.length}/4 fotos',
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 100,
          child: Row(
            children: [
              // Fotos existentes
              ...images.take(4).map((img) => _PhotoTile(
                    url: img.url,
                    onDelete: () => _confirmDeletePhoto(img),
                  )),
              // Botón añadir (si hay menos de 4)
              if (images.length < 4)
                _AddPhotoTile(onTap: _pickPhoto),
              // Espaciadores vacíos
              ...List.generate(
                (3 - images.length).clamp(0, 3),
                (_) => const _EmptyPhotoTile(),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'La primera foto es tu imagen principal. Toca para reordenar.',
          style: TextStyle(color: c.textMuted, fontSize: 11),
        ),
      ],
    );
  }

  // ── INFO BÁSICA ───────────────────────────────────────────

  Widget _buildInfoSection(DashboardProfileModel? profile, DashboardProvider dash) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(
          icon: Icons.edit_rounded,
          title: 'Información básica',
        ),
        const SizedBox(height: 12),
        _EditCard(
          title: widget.isNegocio ? 'Nombre del negocio' : 'Nombre profesional',
          value: profile?.businessName ?? '',
          icon: Icons.storefront_rounded,
          onTap: () => _showEditDialog(
            context: context,
            title: widget.isNegocio ? 'Nombre del negocio' : 'Nombre profesional',
            initialValue: profile?.businessName ?? '',
            onSave: (val) => dash.updateProfile(businessName: val),
          ),
        ),
        _ContactCard(
          phone: profile?.phone ?? '',
          whatsapp: profile?.whatsapp,
          onTap: () => _showPhoneDialog(context, profile, dash),
        ),
        // OFICIO: dirección oculta por defecto, toggle para mostrar
        if (!widget.isNegocio) ...[
          GestureDetector(
            onTap: () => setState(() => _showAddressCard = !_showAddressCard),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Icon(
                    _showAddressCard
                        ? Icons.expand_less_rounded
                        : Icons.add_location_alt_outlined,
                    size: 16,
                    color: _showAddressCard ? AppColors.primary : context.colors.textMuted,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _showAddressCard ? 'Ocultar dirección' : 'Agregar dirección (opcional)',
                    style: TextStyle(
                      fontSize: 13,
                      color: _showAddressCard ? AppColors.primary : context.colors.textMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_showAddressCard)
            _EditCard(
              title: 'Dirección',
              value: profile?.address ?? 'No configurada',
              icon: Icons.location_on_rounded,
              onTap: () => _showEditDialog(
                context: context,
                title: 'Dirección',
                initialValue: profile?.address ?? '',
                onSave: (val) => dash.updateProfile(address: val),
              ),
            ),
        ] else
          _EditCard(
            title: 'Dirección',
            value: profile?.address ?? 'No configurada',
            icon: Icons.location_on_rounded,
            onTap: () => _showEditDialog(
              context: context,
              title: 'Dirección',
              initialValue: profile?.address ?? '',
              onSave: (val) => dash.updateProfile(address: val),
            ),
          ),
        _EditCard(
          title: 'Descripción',
          value: profile?.description ?? 'Sin descripción',
          icon: Icons.description_rounded,
          multiline: true,
          onTap: () => _showEditDialog(
            context: context,
            title: 'Descripción del servicio',
            initialValue: profile?.description ?? '',
            multiline: true,
            onSave: (val) => dash.updateProfile(description: val),
          ),
        ),
      ],
    );
  }

  // ── DISPONIBILIDAD ────────────────────────────────────────

  Widget _buildAvailabilitySection(DashboardProfileModel? profile, DashboardProvider dash) {
    final c = context.colors;
    final isPaused = widget.isPaused;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(
          icon: Icons.toggle_on_rounded,
          title: 'Visibilidad del perfil',
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isPaused
                  ? AppColors.delayed.withValues(alpha: 0.4)
                  : AppColors.available.withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isPaused ? 'Perfil pausado' : 'Perfil activo',
                          style: TextStyle(
                            color: isPaused ? AppColors.delayed : AppColors.available,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          isPaused
                              ? 'Tu perfil no aparece en las búsquedas de clientes.'
                              : 'Los clientes pueden encontrarte y contactarte.',
                          style: TextStyle(color: c.textSecondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: !isPaused,
                    onChanged: (val) => _togglePause(!val, dash),
                    activeThumbColor: AppColors.available,
                    inactiveThumbColor: AppColors.delayed,
                    inactiveTrackColor: AppColors.delayed.withValues(alpha: 0.3),
                  ),
                ],
              ),
              if (isPaused) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.delayed.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.info_outline_rounded, size: 14, color: AppColors.delayed),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Reactivar tu perfil puede tomar unos minutos en reflejarse.',
                          style: TextStyle(color: AppColors.delayed, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Estado de disponibilidad (independiente de pausar)
        Text(
          'Estado de disponibilidad',
          style: TextStyle(color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _AvailabilityChip(
              label: 'Disponible',
              color: AppColors.available,
              selected: profile?.availability == 'DISPONIBLE',
              onTap: () => dash.setAvailability('DISPONIBLE'),
            ),
            const SizedBox(width: 8),
            _AvailabilityChip(
              label: 'Con demora',
              color: AppColors.delayed,
              selected: profile?.availability == 'CON_DEMORA',
              onTap: () => dash.setAvailability('CON_DEMORA'),
            ),
            const SizedBox(width: 8),
            _AvailabilityChip(
              label: 'Ocupado',
              color: AppColors.busy,
              selected: profile?.availability == 'OCUPADO',
              onTap: () => dash.setAvailability('OCUPADO'),
            ),
          ],
        ),
      ],
    );
  }

  // ── HORARIO DE ATENCIÓN (solo NEGOCIO) ───────────────────

  Widget _buildScheduleSection(DashboardProfileModel? profile, DashboardProvider dash) {
    return ScheduleEditor(
      initialSchedule: profile?.scheduleJson,
      onSave: (schedule) async {
        final ok = await dash.updateProfile(scheduleJson: schedule);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(ok ? 'Horario guardado' : dash.error ?? 'Error al guardar'),
          backgroundColor: ok ? AppColors.available : AppColors.busy,
        ));
      },
    );
  }

  // ── ZONA PELIGROSA ────────────────────────────────────────

  Widget _buildTrustSection(BuildContext context) {
    final c    = context.colors;
    final auth = context.watch<AuthProvider>();
    final type = widget.isNegocio ? 'NEGOCIO' : 'OFICIO';
    final trustStatus = auth.providerDataFor(type)?['trustStatus'] as String? ?? 'NONE';
    final isTrusted   = auth.providerDataFor(type)?['isTrusted']   as bool?   ?? false;

    // Colores y textos según estado
    final Color accent;
    final IconData icon;
    final String title;
    final String subtitle;

    if (isTrusted) {
      accent   = const Color(0xFF10B981);
      icon     = Icons.verified_rounded;
      title    = '¡Perfil verificado como confiable!';
      subtitle = 'Tu perfil cuenta con el badge de "Profesional Confiable". Los clientes pueden contratarte con total seguridad.';
    } else if (trustStatus == 'PENDING') {
      accent   = AppColors.amber;
      icon     = Icons.hourglass_top_rounded;
      title    = 'Validación en proceso';
      subtitle = 'Tu solicitud está siendo revisada por nuestro equipo. Te notificaremos cuando tengamos una respuesta.';
    } else if (trustStatus == 'REJECTED') {
      accent   = const Color(0xFFEF4444);
      icon     = Icons.cancel_rounded;
      title    = 'Solicitud rechazada';
      subtitle = 'Tu solicitud fue rechazada. Puedes enviar una nueva solicitud corrigiendo la información.';
    } else {
      accent   = AppColors.primary;
      icon     = Icons.shield_outlined;
      title    = 'Solicitar validación de datos';
      subtitle = 'Valida tu identidad para obtener el badge de "Profesional Confiable" y generar más confianza en los clientes.';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(icon: Icons.shield_rounded, title: 'Confianza y Validación', color: accent),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: accent.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: accent.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, color: accent, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(title,
                      style: TextStyle(color: accent, fontSize: 14, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(subtitle,
                style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.5)),
              if (!isTrusted && trustStatus != 'PENDING') ...[
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => TrustValidationFormScreen(providerType: type),
                    )),
                    icon: Icon(
                      trustStatus == 'REJECTED' ? Icons.refresh_rounded : Icons.verified_user_rounded,
                      size: 16,
                    ),
                    label: Text(
                      trustStatus == 'REJECTED' ? 'Reintentar validación' : 'Solicitar validación de datos',
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDangerZone(BuildContext context, DashboardProvider dash) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(icon: Icons.warning_rounded, title: 'Zona de peligro', color: AppColors.busy),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.busy.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Eliminar perfil',
                style: TextStyle(
                  color: AppColors.busy,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Esta acción eliminará permanentemente tu perfil profesional, todas tus fotos y reseñas. No se puede deshacer.',
                style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.5),
              ),
              const SizedBox(height: 14),
              OutlinedButton.icon(
                onPressed: () => _confirmDeleteProfile(context),
                icon: Icon(Icons.delete_forever_rounded, size: 18),
                label: Text('Eliminar mi perfil'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.busy,
                  side: const BorderSide(color: AppColors.busy),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── ACCIONES ──────────────────────────────────────────────

  void _togglePause(bool pause, DashboardProvider dash) {
    final status = pause ? 'OCUPADO' : 'DISPONIBLE';
    widget.onPauseToggle(pause);
    dash.setAvailability(status);
  }

  Future<void> _pickPhoto() async {
    final dash = context.read<DashboardProvider>();
    if (dash.isUploadingPhoto) return; // evitar doble tap

    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (file == null || !mounted) return;

    // Validar tamaño antes de subir (5 MB)
    final bytes = await file.readAsBytes();
    if (!mounted) return;
    if (bytes.length > 5 * 1024 * 1024) {
      _showSnack('La imagen supera 5 MB. Elige una más pequeña.', isError: true);
      return;
    }

    final url = await dash.uploadProviderPhoto(file.path);

    if (!mounted) return;

    if (url != null) {
      _showSnack('¡Foto subida con éxito!');
    } else {
      _showSnack(
        dash.uploadError ?? 'Error al subir la imagen. Inténtalo de nuevo.',
        isError: true,
      );
    }
  }

  void _showSnack(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? AppColors.busy : AppColors.available,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _confirmDeletePhoto(ProfileImage img) {
    final c = context.colors;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Eliminar foto', style: TextStyle(color: c.textPrimary)),
        content: Text(
          '¿Quieres eliminar esta foto de tu perfil?',
          style: TextStyle(color: c.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              final dash = context.read<DashboardProvider>();
              final ok = await dash.deleteProviderImage(img.id);
              if (!mounted) return;
              _showSnack(
                ok ? 'Foto eliminada' : 'Error al eliminar la foto',
                isError: !ok,
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.busy),
            child: Text('Eliminar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteProfile(BuildContext context) {
    final c = context.colors;
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          '¿Eliminar perfil?',
          style: TextStyle(color: AppColors.busy, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Esta acción es IRREVERSIBLE. Escribe ELIMINAR para confirmar:',
              style: TextStyle(color: c.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              style: TextStyle(color: c.textPrimary),
              decoration: InputDecoration(
                hintText: 'Escribe ELIMINAR',
                hintStyle: TextStyle(color: c.textMuted),
                filled: true,
                fillColor: c.bgInput,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          StatefulBuilder(
            builder: (ctx, setS) => ElevatedButton(
              onPressed: () {
                if (controller.text.trim().toUpperCase() == 'ELIMINAR') {
                  Navigator.pop(ctx);
                  context.read<AuthProvider>().logout();
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.busy),
              child: Text('Eliminar perfil', style: TextStyle(color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showPhoneDialog(
    BuildContext context,
    DashboardProfileModel? profile,
    DashboardProvider dash,
  ) async {
    final c = context.colors;
    String phone    = profile?.phone    ?? '';
    String? whatsapp = profile?.whatsapp;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20, right: 20, top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: StatefulBuilder(
            builder: (_, setLocal) => Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.phone_rounded, color: AppColors.amber, size: 18),
                    const SizedBox(width: 8),
                    Text('Números de contacto',
                        style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
                    const Spacer(),
                    IconButton(
                      icon: Icon(Icons.close_rounded, color: c.textMuted),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                PhoneInputSection(
                  initialPhone: profile?.phone,
                  initialWhatsapp: profile?.whatsapp,
                  onChange: (p, w) {
                    phone    = p;
                    whatsapp = w;
                  },
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      Navigator.pop(ctx);
                      setState(() => _isSaving = true);
                      await dash.updateProfile(phone: phone, whatsapp: whatsapp);
                      if (mounted) setState(() => _isSaving = false);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.amber,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Guardar', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _showEditDialog({
    required BuildContext context,
    required String title,
    required String initialValue,
    required Future<bool> Function(String) onSave,
    TextInputType keyboardType = TextInputType.text,
    bool multiline = false,
  }) async {
    final c = context.colors;
    final ctrl = TextEditingController(text: initialValue);
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(title, style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: ctrl,
          keyboardType: multiline ? TextInputType.multiline : keyboardType,
          maxLines: multiline ? 4 : 1,
          autofocus: true,
          style: TextStyle(color: c.textPrimary),
          decoration: InputDecoration(
            filled: true,
            fillColor: c.bgInput,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.amber),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.amber,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Text('Guardar', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (ok == true && mounted) {
      setState(() => _isSaving = true);
      await onSave(ctrl.text.trim());
      if (mounted) setState(() => _isSaving = false);
    }
  }
}

// ─── WIDGETS LOCALES ──────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Color color;

  const _SectionTitle({
    required this.icon,
    required this.title,
    this.subtitle,
    this.color = AppColors.amber,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            color: c.textPrimary,
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
        if (subtitle != null) ...[
          const Spacer(),
          Text(subtitle!, style: TextStyle(color: c.textMuted, fontSize: 12)),
        ],
      ],
    );
  }
}

class _EditCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final VoidCallback onTap;
  final bool multiline;

  const _EditCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.onTap,
    this.multiline = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.amber, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(color: c.textMuted, fontSize: 11)),
                  const SizedBox(height: 2),
                  Text(
                    value.isEmpty ? 'Toca para editar' : value,
                    style: TextStyle(
                      color: value.isEmpty ? c.textMuted : c.textPrimary,
                      fontSize: 14,
                    ),
                    maxLines: multiline ? 2 : 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 18),
          ],
        ),
      ),
    );
  }
}

class _PhotoTile extends StatelessWidget {
  final String url;
  final VoidCallback onDelete;

  const _PhotoTile({required this.url, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      width: 90,
      height: 90,
      margin: const EdgeInsets.only(right: 8),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(12),
        image: DecorationImage(
          image: NetworkImage(url),
          fit: BoxFit.cover,
          onError: (_, _) {},
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: 4,
            right: 4,
            child: GestureDetector(
              onTap: onDelete,
              child: Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: AppColors.busy,
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.close_rounded, color: Colors.white, size: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AddPhotoTile extends StatelessWidget {
  final VoidCallback onTap;
  const _AddPhotoTile({required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 90,
        height: 90,
        margin: const EdgeInsets.only(right: 8),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.amber.withValues(alpha: 0.4), width: 1.5),
        ),
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add_photo_alternate_rounded, color: AppColors.amber, size: 28),
            SizedBox(height: 4),
            Text('Añadir', style: TextStyle(color: AppColors.amber, fontSize: 11)),
          ],
        ),
      ),
    );
  }
}

class _EmptyPhotoTile extends StatelessWidget {
  const _EmptyPhotoTile();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      width: 90,
      height: 90,
      margin: const EdgeInsets.only(right: 8),
      decoration: BoxDecoration(
        color: c.bgCard.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
    );
  }
}

class _AvailabilityChip extends StatelessWidget {
  final String label;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const _AvailabilityChip({
    required this.label,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.2) : c.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? color : Colors.white.withValues(alpha: 0.1)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? color : c.textMuted,
            fontSize: 12,
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  final String  phone;
  final String? whatsapp;
  final VoidCallback onTap;

  const _ContactCard({required this.phone, required this.whatsapp, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Row(
          children: [
            Icon(Icons.phone_rounded, color: AppColors.amber, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Contacto', style: TextStyle(color: c.textMuted, fontSize: 11)),
                  const SizedBox(height: 2),
                  Text(
                    phone.isEmpty ? 'Sin teléfono' : phone,
                    style: TextStyle(color: phone.isEmpty ? c.textMuted : c.textPrimary, fontSize: 14),
                  ),
                  if (whatsapp != null && whatsapp!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Icon(Icons.chat_rounded, size: 12, color: AppColors.whatsapp),
                        const SizedBox(width: 4),
                        Text(whatsapp!, style: TextStyle(color: AppColors.whatsapp, fontSize: 12)),
                      ],
                    ),
                  ] else
                    Text('WhatsApp: mismo número', style: TextStyle(color: c.textMuted, fontSize: 12)),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 18),
          ],
        ),
      ),
    );
  }
}
