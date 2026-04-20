import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constans/app_colors.dart';
import '../../core/theme/app_theme_colors.dart';

// Países comunes para Latinoamérica / España
const _kCountries = [
  ('+58', 'Venezuela 🇻🇪'),
  ('+52', 'México 🇲🇽'),
  ('+57', 'Colombia 🇨🇴'),
  ('+54', 'Argentina 🇦🇷'),
  ('+56', 'Chile 🇨🇱'),
  ('+34', 'España 🇪🇸'),
  ('+1',  'EE.UU. / Canadá 🇺🇸'),
  ('+55', 'Brasil 🇧🇷'),
  ('+593', 'Ecuador 🇪🇨'),
  ('+591', 'Bolivia 🇧🇴'),
  ('+595', 'Paraguay 🇵🇾'),
  ('+598', 'Uruguay 🇺🇾'),
  ('+507', 'Panamá 🇵🇦'),
];

/// Returns the WhatsApp-ready number for [raw]:
/// - 9-digit Peru → "+51XXXXXXXXX"
/// - Already has "+" → use as-is (strip spaces/dashes)
String formatForWhatsApp(String raw) {
  final n = raw.trim().replaceAll(RegExp(r'[\s\-\(\)]'), '');
  if (n.startsWith('+')) return n;
  if (n.length == 9 && RegExp(r'^\d{9}$').hasMatch(n)) return '+51$n';
  return n;
}

/// [initialPhone]    stored phone (9-digit Peru or "+XX..." foreign)
/// [initialWhatsapp] stored whatsapp (same format) — null means same as phone
/// [onChange]        called with (phone, whatsapp) whenever values change
///                   whatsapp is null if same as phone
class PhoneInputSection extends StatefulWidget {
  final String? initialPhone;
  final String? initialWhatsapp;
  final void Function(String phone, String? whatsapp) onChange;

  const PhoneInputSection({
    super.key,
    required this.onChange,
    this.initialPhone,
    this.initialWhatsapp,
  });

  @override
  State<PhoneInputSection> createState() => _PhoneInputSectionState();
}

class _PhoneInputSectionState extends State<PhoneInputSection> {
  // ── TELÉFONO ─────────────────────────────────────────────
  bool   _phoneForeign = false;
  String _phoneCode    = '+58';
  late TextEditingController _phoneCtrl;

  // ── WHATSAPP ─────────────────────────────────────────────
  bool   _sameNumber    = true;
  bool   _wapForeign    = false;
  String _wapCode       = '+58';
  late TextEditingController _wapCtrl;

  @override
  void initState() {
    super.initState();
    final phone    = widget.initialPhone    ?? '';
    final whatsapp = widget.initialWhatsapp;

    // Detectar si el teléfono es extranjero
    if (phone.startsWith('+')) {
      _phoneForeign = true;
      // Encontrar código
      final match = _kCountries.where((c) => phone.startsWith(c.$1)).toList();
      _phoneCode = match.isNotEmpty ? match.first.$1 : '+58';
      _phoneCtrl = TextEditingController(text: phone.replaceFirst(_phoneCode, '').trim());
    } else {
      _phoneCtrl = TextEditingController(text: phone);
    }

    // ¿Mismo número?
    if (whatsapp == null || whatsapp.isEmpty || whatsapp == phone) {
      _sameNumber = true;
      _wapCtrl = TextEditingController(text: '');
    } else {
      _sameNumber = false;
      if (whatsapp.startsWith('+')) {
        _wapForeign = true;
        final match = _kCountries.where((c) => whatsapp.startsWith(c.$1)).toList();
        _wapCode = match.isNotEmpty ? match.first.$1 : '+58';
        _wapCtrl = TextEditingController(text: whatsapp.replaceFirst(_wapCode, '').trim());
      } else {
        _wapCtrl = TextEditingController(text: whatsapp);
      }
    }

    _phoneCtrl.addListener(_notify);
    _wapCtrl.addListener(_notify);
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _wapCtrl.dispose();
    super.dispose();
  }

  void _notify() {
    final phone = _buildPhone();
    final wap   = _sameNumber ? null : _buildWap();
    widget.onChange(phone, wap);
  }

  String _buildPhone() {
    final num = _phoneCtrl.text.trim();
    if (_phoneForeign) return '$_phoneCode $num';
    return num;
  }

  String? _buildWap() {
    if (_sameNumber) return null;
    final num = _wapCtrl.text.trim();
    if (num.isEmpty) return null;
    if (_wapForeign) return '$_wapCode $num';
    return num;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Campo Teléfono ────────────────────────────────
        _FieldLabel(icon: Icons.phone_rounded, label: 'Teléfono de llamadas *', c: c),
        const SizedBox(height: 6),
        _phoneForeign
            ? _ForeignField(
                code: _phoneCode,
                ctrl: _phoneCtrl,
                onCodeChanged: (v) => setState(() { _phoneCode = v; _notify(); }),
                c: c,
              )
            : _PeruField(ctrl: _phoneCtrl, hint: '987 654 321', c: c),
        const SizedBox(height: 6),
        _ForeignToggle(
          value: _phoneForeign,
          label: 'Número de otro país',
          c: c,
          onChanged: (v) => setState(() {
            _phoneForeign = v;
            _phoneCtrl.clear();
            _notify();
          }),
        ),

        const SizedBox(height: 16),

        // ── Toggle mismo número ───────────────────────────
        _SameNumberToggle(
          value: _sameNumber,
          c: c,
          onChanged: (v) => setState(() {
            _sameNumber = v;
            _notify();
          }),
        ),

        // ── Campo WhatsApp (si diferente) ─────────────────
        if (!_sameNumber) ...[
          const SizedBox(height: 12),
          _FieldLabel(icon: Icons.chat_rounded, label: 'Número de WhatsApp', c: c),
          const SizedBox(height: 6),
          _wapForeign
              ? _ForeignField(
                  code: _wapCode,
                  ctrl: _wapCtrl,
                  onCodeChanged: (v) => setState(() { _wapCode = v; _notify(); }),
                  c: c,
                )
              : _PeruField(ctrl: _wapCtrl, hint: '987 654 321', c: c),
          const SizedBox(height: 6),
          _ForeignToggle(
            value: _wapForeign,
            label: 'WhatsApp de otro país',
            c: c,
            onChanged: (v) => setState(() {
              _wapForeign = v;
              _wapCtrl.clear();
              _notify();
            }),
          ),
        ],
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────

class _FieldLabel extends StatelessWidget {
  final IconData icon;
  final String label;
  final AppThemeColors c;
  const _FieldLabel({required this.icon, required this.label, required this.c});

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Icon(icon, size: 14, color: AppColors.amber),
      const SizedBox(width: 6),
      Text(label, style: TextStyle(color: c.textMuted, fontSize: 12, fontWeight: FontWeight.w500)),
    ],
  );
}

class _PeruField extends StatelessWidget {
  final TextEditingController ctrl;
  final String hint;
  final AppThemeColors c;
  const _PeruField({required this.ctrl, required this.hint, required this.c});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
          ),
          child: Text('+51 🇵🇪', style: TextStyle(color: c.textMuted, fontSize: 13)),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: TextField(
            controller: ctrl,
            keyboardType: TextInputType.phone,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(9),
            ],
            style: TextStyle(color: c.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              filled: true,
              fillColor: c.bgCard,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.amber),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ForeignField extends StatelessWidget {
  final String code;
  final TextEditingController ctrl;
  final ValueChanged<String> onCodeChanged;
  final AppThemeColors c;
  const _ForeignField({
    required this.code,
    required this.ctrl,
    required this.onCodeChanged,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Dropdown de código de país
        GestureDetector(
          onTap: () => _showCountryPicker(context),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.amber.withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                Text(code, style: TextStyle(color: c.textPrimary, fontSize: 13, fontWeight: FontWeight.bold)),
                const SizedBox(width: 4),
                Icon(Icons.arrow_drop_down, size: 16, color: c.textMuted),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: TextField(
            controller: ctrl,
            keyboardType: TextInputType.phone,
            style: TextStyle(color: c.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Número sin código',
              hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              filled: true,
              fillColor: c.bgCard,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: AppColors.amber.withValues(alpha: 0.4)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: AppColors.amber.withValues(alpha: 0.4)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.amber),
              ),
            ),
          ),
        ),
      ],
    );
  }

  void _showCountryPicker(BuildContext context) {
    final c = context.colors;
    showModalBottomSheet(
      context: context,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'Selecciona el país',
              style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
            ),
          ),
          const Divider(height: 1),
          Flexible(
            child: ListView(
              shrinkWrap: true,
              children: _kCountries.map((country) => ListTile(
                title: Text(country.$2, style: TextStyle(color: c.textPrimary, fontSize: 14)),
                trailing: Text(country.$1, style: TextStyle(color: AppColors.amber, fontWeight: FontWeight.bold)),
                selected: country.$1 == code,
                selectedTileColor: AppColors.amber.withValues(alpha: 0.08),
                onTap: () {
                  onCodeChanged(country.$1);
                  Navigator.pop(context);
                },
              )).toList(),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _ForeignToggle extends StatelessWidget {
  final bool value;
  final String label;
  final AppThemeColors c;
  final ValueChanged<bool> onChanged;
  const _ForeignToggle({required this.value, required this.label, required this.c, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: Row(
        children: [
          Icon(
            value ? Icons.public_rounded : Icons.public_off_rounded,
            size: 14,
            color: value ? AppColors.amber : c.textMuted,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: value ? AppColors.amber : c.textMuted,
              fontSize: 12,
              fontWeight: value ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}

class _SameNumberToggle extends StatelessWidget {
  final bool value;
  final AppThemeColors c;
  final ValueChanged<bool> onChanged;
  const _SameNumberToggle({required this.value, required this.c, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: value
              ? AppColors.amber.withValues(alpha: 0.1)
              : c.bgCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: value ? AppColors.amber.withValues(alpha: 0.4) : Colors.white.withValues(alpha: 0.08),
          ),
        ),
        child: Row(
          children: [
            Icon(
              Icons.chat_rounded,
              size: 16,
              color: value ? AppColors.amber : c.textMuted,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Usar el mismo número para WhatsApp',
                style: TextStyle(
                  color: value ? AppColors.amber : c.textMuted,
                  fontSize: 13,
                  fontWeight: value ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ),
            Icon(
              value ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
              size: 18,
              color: value ? AppColors.amber : c.textMuted,
            ),
          ],
        ),
      ),
    );
  }
}
