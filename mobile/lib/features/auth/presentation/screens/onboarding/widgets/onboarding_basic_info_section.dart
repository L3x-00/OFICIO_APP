import 'package:flutter/material.dart';
import 'package:mobile/shared/widgets/phone_input_section.dart';
import 'onboarding_form_components.dart';

/// Contenido de la sección "Información Básica": nombre, documento
/// (DNI para Oficio/Profesional, RUC para Negocio) y teléfono/WhatsApp.
/// Los campos exclusivos de Profesional viven aparte, en
/// [OnboardingProfessionalProfileSection] — separados para no saturar
/// esta sección cuando el tipo es PROFESIONAL.
class OnboardingBasicInfoSection extends StatelessWidget {
  final TextEditingController businessNameController;
  final TextEditingController dniController;
  final TextEditingController rucController;

  /// `true` para Oficio y Profesional (individuales); `false` solo Negocio.
  final bool isOficio;
  final String nameLabel;
  final String nameHint;
  final IconData nameIcon;

  final String phoneSeed;
  final String whatsappSeed;
  final void Function(String phone, String? whatsapp) onPhoneChanged;

  const OnboardingBasicInfoSection({
    super.key,
    required this.businessNameController,
    required this.dniController,
    required this.rucController,
    required this.isOficio,
    required this.nameLabel,
    required this.nameHint,
    required this.nameIcon,
    required this.phoneSeed,
    required this.whatsappSeed,
    required this.onPhoneChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FormFieldTile(
          controller: businessNameController,
          label: nameLabel,
          hint: nameHint,
          icon: nameIcon,
        ),
        const SizedBox(height: 14),
        if (isOficio) ...[
          FormFieldTile(
            controller: dniController,
            label: 'DNI del titular (opcional)',
            hint: '12345678',
            icon: Icons.badge_outlined,
            keyboardType: TextInputType.number,
            maxLength: 8,
          ),
          const SizedBox(height: 14),
        ],
        if (!isOficio) ...[
          FormFieldTile(
            controller: rucController,
            label: 'RUC (opcional)',
            hint: '20123456789',
            icon: Icons.receipt_long_outlined,
            keyboardType: TextInputType.number,
            maxLength: 11,
          ),
          const SizedBox(height: 14),
        ],
        PhoneInputSection(
          key: ValueKey('phone-$phoneSeed-$whatsappSeed'),
          initialPhone: phoneSeed.isEmpty ? null : phoneSeed,
          initialWhatsapp: whatsappSeed.isEmpty ? null : whatsappSeed,
          onChange: onPhoneChanged,
        ),
      ],
    );
  }
}
