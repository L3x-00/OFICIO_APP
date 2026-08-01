import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/utils/plan_limits.dart';
import 'package:mobile/shared/widgets/collapsible_schedule.dart';
import 'package:mobile/features/providers_list/data/providers_repository.dart';
import 'onboarding_address_section.dart';
import 'onboarding_category_section.dart';
import 'onboarding_delivery_section.dart';
import 'onboarding_location_section.dart';
import 'onboarding_social_section.dart';
import 'onboarding_photo_section.dart';
import 'onboarding_form_components.dart';

/// Contenido de la sección "Detalles del Servicio": dirección (Negocio),
/// especialidades/categorías, descripción, delivery/domicilio, horario
/// (Negocio), ubicación administrativa, redes sociales y fotos. Es la
/// última sección del acordeón (Oficio/Negocio: sección 2; Profesional:
/// sección 3) — sin botón "Continuar" porque no hay una sección siguiente.
class OnboardingServiceDetailsSection extends StatelessWidget {
  final String? providerType;
  final bool isOficio;
  final String planChoice;

  // ── Dirección (solo Negocio/Profesional, !isOficio) ──
  final TextEditingController addressController;
  final TextEditingController mapsUrlController;
  final bool showAddressSection;
  final bool gpsLoading;
  final Position? gpsPosition;
  final VoidCallback onToggleAddressSection;
  final VoidCallback onFetchGps;
  final VoidCallback onClearGps;
  final VoidCallback onParseMapsUrl;

  // ── Categorías / especialidades ──
  final List<CategoryModel> categories;
  final List<CategorySelectionResult> selectedCategories;
  final int? primaryCategoryId;
  final void Function(List<CategorySelectionResult> selected, int? primaryId)
  onCategoriesChanged;

  // ── Descripción ──
  final TextEditingController descriptionController;

  // ── Delivery / domicilio ──
  final bool hasDelivery;
  final bool plenaCoordinacion;
  final ValueChanged<bool> onDeliveryChanged;
  final ValueChanged<bool> onPlenaChanged;

  // ── Horario (solo !isOficio) ──
  final Map<String, dynamic> scheduleJson;
  final ValueChanged<Map<String, dynamic>> onScheduleSaved;

  // ── Ubicación administrativa ──
  final String? department;
  final String? province;
  final String? district;
  final void Function(String? department, String? province, String? district)
  onLocationChanged;

  // ── Redes sociales ──
  final TextEditingController websiteCtrl;
  final TextEditingController instagramCtrl;
  final TextEditingController tiktokCtrl;
  final TextEditingController facebookCtrl;
  final TextEditingController linkedinCtrl;
  final TextEditingController twitterCtrl;
  final TextEditingController telegramCtrl;
  final TextEditingController whatsappBizCtrl;

  // ── Fotos ──
  final List<XFile> photos;
  final int maxPhotos;
  final VoidCallback onPickPhoto;
  final void Function(int index) onRemovePhoto;
  final void Function(int from, int to) onReorderPhotos;

  const OnboardingServiceDetailsSection({
    super.key,
    required this.providerType,
    required this.isOficio,
    required this.planChoice,
    required this.addressController,
    required this.mapsUrlController,
    required this.showAddressSection,
    required this.gpsLoading,
    required this.gpsPosition,
    required this.onToggleAddressSection,
    required this.onFetchGps,
    required this.onClearGps,
    required this.onParseMapsUrl,
    required this.categories,
    required this.selectedCategories,
    required this.primaryCategoryId,
    required this.onCategoriesChanged,
    required this.descriptionController,
    required this.hasDelivery,
    required this.plenaCoordinacion,
    required this.onDeliveryChanged,
    required this.onPlenaChanged,
    required this.scheduleJson,
    required this.onScheduleSaved,
    required this.department,
    required this.province,
    required this.district,
    required this.onLocationChanged,
    required this.websiteCtrl,
    required this.instagramCtrl,
    required this.tiktokCtrl,
    required this.facebookCtrl,
    required this.linkedinCtrl,
    required this.twitterCtrl,
    required this.telegramCtrl,
    required this.whatsappBizCtrl,
    required this.photos,
    required this.maxPhotos,
    required this.onPickPhoto,
    required this.onRemovePhoto,
    required this.onReorderPhotos,
  });

  /// Abre el picker de ubicación y, si el usuario eligió algo, avisa al
  /// llamador vía [onLocationChanged] (que decide si aplicar `setState` —
  /// mismo patrón que el resto de callbacks de esta sección).
  Future<void> _pickLocation(BuildContext context) async {
    final locSection = OnboardingLocationSection(
      department: department,
      province: province,
      district: district,
    );
    final result = await locSection.showPicker(context);
    if (result != null) {
      onLocationChanged(result.department, result.province, result.district);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!isOficio) ...[
          OnboardingAddressSection(
            addressController: addressController,
            mapsUrlController: mapsUrlController,
            showAddressSection: showAddressSection,
            gpsLoading: gpsLoading,
            gpsPosition: gpsPosition,
            onToggleSection: onToggleAddressSection,
            onFetchGps: onFetchGps,
            onClearGps: onClearGps,
            onParseMapsUrl: onParseMapsUrl,
          ),
          const SizedBox(height: 14),
        ],
        OnboardingCategorySection(
          providerType: providerType,
          categories: categories,
          selected: selectedCategories,
          primaryCategoryId: primaryCategoryId,
          maxCategories: PlanLimits.specialties(planChoice),
          onChanged: onCategoriesChanged,
        ),
        const SizedBox(height: 14),
        FormFieldTile(
          controller: descriptionController,
          label: isOficio ? 'Describe tu servicio' : 'Describe tu negocio',
          hint: isOficio
              ? 'Experiencia, especialidades, horario de trabajo...'
              : 'Qué ofreces, horarios, especialidades...',
          icon: Icons.description_outlined,
          maxLines: 4,
        ),
        const SizedBox(height: 14),
        OnboardingDeliverySection(
          isOficio: isOficio,
          hasDelivery: hasDelivery,
          plenaCoordinacion: plenaCoordinacion,
          onDeliveryChanged: onDeliveryChanged,
          onPlenaChanged: onPlenaChanged,
        ),
        const SizedBox(height: 14),
        if (!isOficio) ...[
          CollapsibleSchedule(
            scheduleJson: scheduleJson,
            onSave: onScheduleSaved,
          ),
          const SizedBox(height: 14),
        ],
        GestureDetector(
          onTap: () => _pickLocation(context),
          child: OnboardingLocationSection(
            department: department,
            province: province,
            district: district,
          ),
        ),
        const SizedBox(height: 14),
        OnboardingSocialSection(
          websiteCtrl: websiteCtrl,
          instagramCtrl: instagramCtrl,
          tiktokCtrl: tiktokCtrl,
          facebookCtrl: facebookCtrl,
          linkedinCtrl: linkedinCtrl,
          twitterCtrl: twitterCtrl,
          telegramCtrl: telegramCtrl,
          whatsappBizCtrl: whatsappBizCtrl,
          isNegocio: !isOficio,
        ),
        const SizedBox(height: 14),
        OnboardingPhotoSection(
          photos: photos,
          maxPhotos: maxPhotos,
          onPickPhoto: onPickPhoto,
          onRemovePhoto: onRemovePhoto,
          onReorderPhotos: onReorderPhotos,
        ),
      ],
    );
  }
}
