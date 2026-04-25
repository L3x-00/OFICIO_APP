import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/payments_provider.dart';

// Colores Yape
const _kPurple  = Color(0xFF6D1B7B);
const _kCyan    = Color(0xFF00E4C3);
const _kDarkBg  = Color(0xFF1C0A23);
const _kCard    = Color(0xFF2A1236);

// Precios por plan (PEN)
const _kPrices = {
  'ESTANDAR': 30.00,
  'PREMIUM':  50.00,
};

class YapePaymentScreen extends StatefulWidget {
  final String plan;

  const YapePaymentScreen({super.key, required this.plan});

  static Future<bool?> show(BuildContext context, {required String plan}) =>
      Navigator.push<bool>(
        context,
        MaterialPageRoute(
          builder: (_) => ChangeNotifierProvider(
            create: (_) => PaymentsProvider(),
            child: YapePaymentScreen(plan: plan),
          ),
        ),
      );

  @override
  State<YapePaymentScreen> createState() => _YapePaymentScreenState();
}

class _YapePaymentScreenState extends State<YapePaymentScreen> {
  int _step = 0; // 0=resumen, 1=comprobante, 2=éxito

  // Paso 2
  File?   _voucher;
  final   _codeCtrl = TextEditingController();
  final   _noteCtrl = TextEditingController();
  bool    _submitting = false;
  String? _submitError;

  double get _amount => _kPrices[widget.plan.toUpperCase()] ?? 0.0;

  String get _planLabel {
    return switch (widget.plan.toUpperCase()) {
      'PREMIUM'  => 'Premium',
      'ESTANDAR' => 'Estándar',
      _          => widget.plan,
    };
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final xfile  = await picker.pickImage(
      source:     ImageSource.gallery,
      imageQuality: 80,
    );
    if (xfile != null) {
      setState(() {
        _voucher = File(xfile.path);
      });
    }
  }

  Future<void> _openYape() async {
    final uri = Uri.parse('yape://open');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Yape no está instalado. Escanea el QR manualmente.'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  Future<void> _submit() async {
    if (_voucher == null) {
      setState(() => _submitError = 'Adjunta la captura del Yape');
      return;
    }
    if (_codeCtrl.text.length != 3) {
      setState(() => _submitError = 'El código debe tener exactamente 3 dígitos');
      return;
    }

    setState(() { _submitting = true; _submitError = null; });

    final prov = context.read<PaymentsProvider>();

    // 1. Subir imagen
    final url = await prov.uploadVoucher(_voucher!.path);
    if (url == null) {
      setState(() { _submitting = false; _submitError = 'No se pudo subir la imagen'; });
      return;
    }
    // 2. Enviar pago
    final ok = await prov.submitPayment(
      plan:             widget.plan,
      amount:           _amount,
      voucherUrl:       url,
      verificationCode: _codeCtrl.text,
      note:             _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim(),
    );

    if (!mounted) return;

    if (ok) {
      setState(() => _step = 2);
    } else {
      setState(() {
        _submitting = false;
        _submitError = prov.error ?? 'Error al enviar comprobante';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: _kDarkBg,
        colorScheme: const ColorScheme.dark(
          primary: _kPurple,
          secondary: _kCyan,
        ),
      ),
      child: Scaffold(
        backgroundColor: _kDarkBg,
        appBar: AppBar(
          backgroundColor: _kDarkBg,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
            onPressed: () => Navigator.pop(context, false),
          ),
          title: Image.asset('assets/images/yape/yape logo.png',
              height: 28, errorBuilder: (ctx, err, st) =>
              const Text('Yape', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
          centerTitle: true,
        ),
        body: AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          child: _step == 0
              ? _StepSummary(
                  key: const ValueKey(0),
                  planLabel: _planLabel,
                  amount:    _amount,
                  onOpenYape: _openYape,
                  onNext: () => setState(() => _step = 1),
                )
              : _step == 1
                  ? _StepComprobante(
                      key: const ValueKey(1),
                      voucher:     _voucher,
                      codeCtrl:    _codeCtrl,
                      noteCtrl:    _noteCtrl,
                      submitting:  _submitting,
                      error:       _submitError,
                      onPickImage: _pickImage,
                      onSubmit:    _submit,
                    )
                  : _StepSuccess(
                      key: const ValueKey(2),
                      planLabel: _planLabel,
                      onDone: () => Navigator.pop(context, true),
                    ),
        ),
      ),
    );
  }
}

// ── Paso 1: Resumen + QR ──────────────────────────────────────

class _StepSummary extends StatelessWidget {
  final String planLabel;
  final double amount;
  final VoidCallback onOpenYape;
  final VoidCallback onNext;

  const _StepSummary({
    super.key,
    required this.planLabel,
    required this.amount,
    required this.onOpenYape,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      child: Column(
        children: [
          // Step indicator
          _StepIndicator(current: 0),
          const SizedBox(height: 20),

          // Plan + monto
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [_kPurple, _kPurple.withValues(alpha: 0.7)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              children: [
                Text('Plan $planLabel',
                    style: const TextStyle(color: Colors.white70, fontSize: 14)),
                const SizedBox(height: 8),
                Text('S/ ${amount.toStringAsFixed(2)}',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 44,
                        fontWeight: FontWeight.w900)),
                Text('/ mes',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 14)),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // QR
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _kCard,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: _kPurple.withValues(alpha: 0.5)),
            ),
            child: Column(
              children: [
                Text('Escanea con Yape',
                    style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.8), fontSize: 14)),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.asset('assets/images/yape/QR.jpeg',
                      width: 200, height: 200, fit: BoxFit.cover,
                      errorBuilder: (ctx, err, st) => Container(
                        width: 200, height: 200,
                        color: Colors.white10,
                        child: const Center(child: Text('QR no disponible',
                            style: TextStyle(color: Colors.white38))),
                      )),
                ),
                const SizedBox(height: 12),
                Text('Monto exacto: S/ ${amount.toStringAsFixed(2)}',
                    style: const TextStyle(
                        color: _kCyan, fontWeight: FontWeight.w700, fontSize: 13)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Botón abrir Yape
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: onOpenYape,
              icon: const Icon(Icons.open_in_new_rounded, color: Colors.white),
              label: const Text('Abrir Yape',
                  style: TextStyle(
                      color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
              style: ElevatedButton.styleFrom(
                backgroundColor: _kPurple,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 4,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Botón ya pagué
          SizedBox(
            width: double.infinity,
            height: 52,
            child: OutlinedButton(
              onPressed: onNext,
              style: OutlinedButton.styleFrom(
                foregroundColor: _kCyan,
                side: const BorderSide(color: _kCyan, width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('Ya pagué, subir comprobante →',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
          const SizedBox(height: 16),

          // Instrucciones
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.04),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            ),
            child: const Text(
              '① Abre Yape  ②  Escanea el QR o usa "Pagar con número"\n'
              '③  Ingresa el monto exacto  ④  Confirma el pago\n'
              '⑤  Toma captura del comprobante  ⑥  Regresa aquí',
              style: TextStyle(color: Colors.white54, fontSize: 12, height: 1.7),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Paso 2: Comprobante ───────────────────────────────────────

class _StepComprobante extends StatelessWidget {
  final File?   voucher;
  final TextEditingController codeCtrl;
  final TextEditingController noteCtrl;
  final bool    submitting;
  final String? error;
  final VoidCallback onPickImage;
  final VoidCallback onSubmit;

  const _StepComprobante({
    super.key,
    required this.voucher,
    required this.codeCtrl,
    required this.noteCtrl,
    required this.submitting,
    this.error,
    required this.onPickImage,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _StepIndicator(current: 1),
          const SizedBox(height: 20),

          const Text('Sube tu comprobante',
              style: TextStyle(
                  color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('Adjunta la captura de tu operación Yape',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 13)),
          const SizedBox(height: 24),

          // Área de imagen
          GestureDetector(
            onTap: onPickImage,
            child: Container(
              width: double.infinity,
              height: 180,
              decoration: BoxDecoration(
                color: _kCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: voucher != null ? _kCyan : _kPurple.withValues(alpha: 0.5),
                  width: voucher != null ? 2 : 1,
                  style: BorderStyle.solid,
                ),
              ),
              child: voucher != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(15),
                      child: Image.file(voucher!, fit: BoxFit.cover),
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.camera_alt_rounded,
                            color: _kPurple.withValues(alpha: 0.7), size: 44),
                        const SizedBox(height: 10),
                        const Text('Subir captura del Yape',
                            style: TextStyle(
                                color: _kCyan,
                                fontWeight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        Text('Toca para seleccionar de galería',
                            style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.4),
                                fontSize: 12)),
                      ],
                    ),
            ),
          ),
          if (voucher != null) ...[
            const SizedBox(height: 8),
            Center(
              child: TextButton.icon(
                onPressed: onPickImage,
                icon: const Icon(Icons.swap_horiz_rounded, size: 16, color: _kCyan),
                label: const Text('Cambiar imagen',
                    style: TextStyle(color: _kCyan, fontSize: 12)),
              ),
            ),
          ],
          const SizedBox(height: 20),

          // Campo código 3 dígitos
          _YapeLabel('Código de verificación'),
          const SizedBox(height: 6),
          TextField(
            controller: codeCtrl,
            keyboardType: TextInputType.number,
            maxLength: 3,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            textAlign: TextAlign.center,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.w800,
                letterSpacing: 12),
            decoration: InputDecoration(
              counterText: '',
              hintText: '000',
              hintStyle: TextStyle(
                  color: Colors.white.withValues(alpha: 0.2), fontSize: 28, letterSpacing: 12),
              filled: true,
              fillColor: _kCard,
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: _kCyan, width: 2),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text('Ingresa los 3 dígitos de verificación de tu operación',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 11)),
          const SizedBox(height: 20),

          // Campo nota
          _YapeLabel('Nota adicional (Opcional)'),
          const SizedBox(height: 6),
          TextField(
            controller: noteCtrl,
            maxLines: 2,
            maxLength: 200,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Ej: Pagué desde el celular de mi pareja...',
              hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 13),
              filled: true,
              fillColor: _kCard,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: _kCyan, width: 1.5),
              ),
              counterStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3)),
            ),
          ),
          const SizedBox(height: 24),

          if (error != null)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.withValues(alpha: 0.4)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.redAccent, size: 18),
                  const SizedBox(width: 8),
                  Expanded(child: Text(error!,
                      style: const TextStyle(color: Colors.redAccent, fontSize: 13))),
                ],
              ),
            ),

          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: submitting ? null : onSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: _kCyan,
                disabledBackgroundColor: _kCyan.withValues(alpha: 0.4),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: submitting
                  ? const SizedBox(width: 22, height: 22,
                      child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2.5))
                  : const Text('Enviar comprobante',
                      style: TextStyle(
                          color: Colors.black,
                          fontSize: 16,
                          fontWeight: FontWeight.w800)),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Paso 3: Éxito ─────────────────────────────────────────────

class _StepSuccess extends StatelessWidget {
  final String    planLabel;
  final VoidCallback onDone;

  const _StepSuccess({super.key, required this.planLabel, required this.onDone});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 96, height: 96,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [_kCyan.withValues(alpha: 0.3), Colors.transparent],
                ),
                border: Border.all(color: _kCyan, width: 2.5),
              ),
              child: const Icon(Icons.check_rounded, color: _kCyan, size: 52),
            ),
            const SizedBox(height: 28),
            const Text('¡Recibimos tu pago!',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),
            Text(
              'Estamos validando la información.\n'
              'Tu plan $planLabel se activará en breve.',
              style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.65), fontSize: 14, height: 1.6),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Container(
              margin: const EdgeInsets.symmetric(vertical: 20),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              decoration: BoxDecoration(
                color: _kCard,
                borderRadius: BorderRadius.circular(30),
                border: Border.all(color: _kPurple.withValues(alpha: 0.5)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.access_time_rounded, color: _kCyan, size: 16),
                  const SizedBox(width: 8),
                  Text('Estado: Validación en proceso',
                      style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.8),
                          fontSize: 13,
                          fontWeight: FontWeight.w600)),
                ],
              ),
            ),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: onDone,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _kPurple,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('Volver a mi perfil',
                    style: TextStyle(
                        color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Indicador de pasos ────────────────────────────────────────

class _StepIndicator extends StatelessWidget {
  final int current;
  const _StepIndicator({required this.current});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (i) {
        final active = i == current;
        final done   = i < current;
        return Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width:  active ? 28 : 10,
              height: 10,
              decoration: BoxDecoration(
                color: done ? _kCyan : active ? _kPurple : Colors.white12,
                borderRadius: BorderRadius.circular(5),
              ),
            ),
            if (i < 2) const SizedBox(width: 6),
          ],
        );
      }),
    );
  }
}

class _YapeLabel extends StatelessWidget {
  final String text;
  const _YapeLabel(this.text);

  @override
  Widget build(BuildContext context) => Text(text,
      style: TextStyle(
          color: Colors.white.withValues(alpha: 0.7),
          fontSize: 13,
          fontWeight: FontWeight.w600));
}
