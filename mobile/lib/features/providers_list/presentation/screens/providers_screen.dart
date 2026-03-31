import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import '../../../../core/constants/app_colors.dart';
import '../../domain/models/provider_model.dart';
import '../widgets/service_card.dart';

/// Pantalla temporal con datos de prueba
/// En el Hito 3 la conectaremos al backend real
class ProvidersScreen extends StatefulWidget {
  const ProvidersScreen({super.key});

  @override
  State<ProvidersScreen> createState() => _ProvidersScreenState();
}

class _ProvidersScreenState extends State<ProvidersScreen> {
  // Lista de proveedores de prueba para ver el diseño
  late List<ProviderModel> _providers;

  @override
  void initState() {
    super.initState();
    _providers = _mockProviders();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        backgroundColor: AppColors.bgDark,
        title: const Text(
          'Servicios cerca de ti',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        elevation: 0,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _providers.length,
        itemBuilder: (context, index) {
          return ServiceCard(
            provider: _providers[index],
            onTap: () {
              // Hito 3: navegar al detalle
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'Ver detalle de ${_providers[index].businessName}',
                  ),
                ),
              );
            },
            onFavoriteToggle: () {
              // Actualiza el estado local del favorito
              setState(() {
                _providers[index] = _providers[index].copyWith(
                  isFavorite: !_providers[index].isFavorite,
                );
              });
            },
          );
        },
      ),
    );
  }

  /// Datos de prueba para visualizar el componente
  List<ProviderModel> _mockProviders() {
    return [
      ProviderModel(
        id: 1,
        businessName: 'Juan Electricista',
        categoryName: 'Electricistas',
        phone: '+51987654321',
        whatsapp: '+51987654321',
        averageRating: 4.5,
        totalReviews: 23,
        availability: AvailabilityStatus.disponible,
        isVerified: true,
        hasCleanRecord: true,
        type: ProviderType.oficio,
        distanceKm: 0.8,
      ),
      ProviderModel(
        id: 2,
        businessName: 'Restaurante El Sabor',
        categoryName: 'Restaurantes',
        phone: '+51912345678',
        averageRating: 4.1,
        totalReviews: 57,
        availability: AvailabilityStatus.conDemora,
        isVerified: false,
        hasCleanRecord: false,
        type: ProviderType.negocio,
        distanceKm: 1.2,
        thumbnailUrls: [],
      ),
      ProviderModel(
        id: 3,
        businessName: 'Carlos Gasfitero',
        categoryName: 'Gasfiteros',
        phone: '+51998877665',
        averageRating: 3.8,
        totalReviews: 11,
        availability: AvailabilityStatus.ocupado,
        isVerified: true,
        hasCleanRecord: false,
        type: ProviderType.oficio,
        distanceKm: 2.5,
        isFavorite: true,
      ),
    ];
  }
}