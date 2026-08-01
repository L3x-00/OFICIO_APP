import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'onboarding_form_components.dart';

/// Contenido de la sección "Perfil Profesional" (solo tipo PROFESIONAL):
/// especialidad, título, institución, años de experiencia y colegiatura.
/// Antes vivían dentro de "Información Básica" — se separaron a su propia
/// sección de acordeón porque el formulario resultaba demasiado largo.
class OnboardingProfessionalProfileSection extends StatelessWidget {
  final TextEditingController specialtyController;
  final TextEditingController titleController;
  final TextEditingController institutionController;
  final TextEditingController yearsExperienceController;
  final TextEditingController registrationNumberController;
  final TextEditingController registrationIssuerController;

  const OnboardingProfessionalProfileSection({
    super.key,
    required this.specialtyController,
    required this.titleController,
    required this.institutionController,
    required this.yearsExperienceController,
    required this.registrationNumberController,
    required this.registrationIssuerController,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FormFieldTile(
          controller: specialtyController,
          label: 'Especialidad *',
          hint: 'Ej: Abogado corporativo, Contador tributario…',
          icon: Icons.school_outlined,
          maxLength: 120,
        ),
        const SizedBox(height: 14),
        FormFieldTile(
          controller: titleController,
          label: 'Título o certificado (opcional)',
          hint: 'Ej: Abogado colegiado, CPC N° 12345',
          icon: Icons.workspace_premium_outlined,
          maxLength: 160,
        ),
        const SizedBox(height: 14),
        FormFieldTile(
          controller: institutionController,
          label: 'Universidad o institución (opcional)',
          hint: 'Ej: Universidad Nacional del Centro',
          icon: Icons.account_balance_outlined,
          maxLength: 160,
        ),
        const SizedBox(height: 14),
        FormFieldTile(
          controller: yearsExperienceController,
          label: 'Años de experiencia (opcional)',
          hint: 'Ej: 5',
          icon: Icons.timelapse_outlined,
          keyboardType: TextInputType.number,
          maxLength: 2,
        ),
        const SizedBox(height: 14),
        FormFieldTile(
          controller: registrationNumberController,
          label: 'N° de colegiatura o registro (opcional)',
          hint: 'Ej: CAL 12345',
          icon: Icons.confirmation_number_outlined,
          maxLength: 100,
        ),
        const SizedBox(height: 14),
        FormFieldTile(
          controller: registrationIssuerController,
          label: 'Entidad que lo emite (opcional)',
          hint: 'Ej: Colegio de Abogados de Lima',
          icon: Icons.apartment_outlined,
          maxLength: 160,
        ),
        Padding(
          padding: const EdgeInsets.only(top: 6, left: 4),
          child: Text(
            'El título, la institución y la colegiatura son '
            'opcionales, pero generan más confianza con tus '
            'clientes.',
            style: TextStyle(color: c.textMuted, fontSize: 11),
          ),
        ),
      ],
    );
  }
}
