import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/app_network_image.dart';
import '../../data/quotation_repository.dart';
import 'my_quotations_screen.dart';

/// Pantalla de solicitud de cotización (cliente): describe lo que necesita
/// + foto opcional → envía.
class RequestQuotationScreen extends StatefulWidget {
  const RequestQuotationScreen({
    super.key,
    required this.providerId,
    this.businessName,
  });

  final int providerId;
  final String? businessName;

  @override
  State<RequestQuotationScreen> createState() => _RequestQuotationScreenState();
}

class _RequestQuotationScreenState extends State<RequestQuotationScreen> {
  final _repo = QuotationRepository();
  final _descCtrl = TextEditingController();
  String? _photoUrl;
  bool _uploading = false;
  bool _submitting = false;

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1280,
      imageQuality: 80,
    );
    if (file == null) return;
    setState(() => _uploading = true);
    final res = await _repo.uploadPhoto(file.path);
    if (!mounted) return;
    setState(() => _uploading = false);
    res.when(
      success: (url) => setState(() => _photoUrl = url),
      failure: (e) => ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message))),
    );
  }

  Future<void> _submit() async {
    if (_descCtrl.text.trim().length < 5) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Describe lo que necesitas.')),
      );
      return;
    }
    setState(() => _submitting = true);
    final res = await _repo.create(
      providerId: widget.providerId,
      description: _descCtrl.text,
      photoUrl: _photoUrl,
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    res.when(
      success: (_) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              '¡Solicitud enviada! Te avisaremos cuando respondan.',
            ),
          ),
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const MyQuotationsScreen()),
        );
      },
      failure: (e) => ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message))),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: Text(
          widget.businessName == null
              ? 'Pedir cotización'
              : 'Cotizar · ${widget.businessName}',
        ),
        backgroundColor: c.bgCard,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            '¿Qué necesitas cotizar?',
            style: TextStyle(
              color: c.textPrimary,
              fontWeight: FontWeight.w700,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _descCtrl,
            maxLength: 1000,
            minLines: 4,
            maxLines: 8,
            style: TextStyle(color: c.textPrimary),
            decoration: InputDecoration(
              hintText:
                  'Describe el trabajo, medidas, materiales, plazos… mientras más detalle, mejor el presupuesto.',
              hintStyle: TextStyle(color: c.textMuted),
              filled: true,
              fillColor: c.bgCard,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: 8),
          _photoSection(c),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _submitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.amber,
                foregroundColor: AppColors.onSolid(AppColors.amber),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: _submitting
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(
                      'Enviar solicitud',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _photoSection(AppThemeColors c) {
    if (_photoUrl != null) {
      return Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: AppNetworkImage(
              url: _photoUrl!,
              height: 160,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
          Positioned(
            top: 6,
            right: 6,
            child: GestureDetector(
              onTap: () => setState(() => _photoUrl = null),
              child: const CircleAvatar(
                radius: 14,
                backgroundColor: Colors.black54,
                child: Icon(Icons.close, size: 16, color: Colors.white),
              ),
            ),
          ),
        ],
      );
    }
    return OutlinedButton.icon(
      onPressed: _uploading ? null : _pickPhoto,
      icon: _uploading
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(Icons.add_a_photo, size: 18, color: c.textMuted),
      label: Text(
        _uploading ? 'Subiendo…' : 'Adjuntar foto (opcional)',
        style: TextStyle(color: c.textSecondary),
      ),
    );
  }
}
