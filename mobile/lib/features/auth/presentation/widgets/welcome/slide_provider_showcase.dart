import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'slide_provider_card.dart';

/// Visual del slide de ejemplos: una sola tarjeta que ROTA entre los 3 tipos
/// de proveedor (oficio → profesional → negocio) cada ~2.8 s con crossfade.
/// Fusiona los antiguos slides 3-5 en uno solo para reducir el carrusel.
class SlideProviderShowcase extends StatefulWidget {
  const SlideProviderShowcase({super.key});

  @override
  State<SlideProviderShowcase> createState() => _SlideProviderShowcaseState();
}

class _SlideProviderShowcaseState extends State<SlideProviderShowcase> {
  static const _cards = <SlideProviderCard>[
    SlideProviderCard(
      name: 'Carlos Mendoza',
      category: 'Gasfitero',
      avatarInitials: 'CM',
      rating: 4.8,
      reviews: 31,
      badgeLabel: 'Disponible',
      badgeIcon: Icons.circle,
      badgeColor: AppColors.available,
      accent: AppColors.oficioAccent,
      tags: ['Instalación de tuberías', 'Reparación de fugas', 'Mantenimiento'],
    ),
    SlideProviderCard(
      name: 'Dra. María Fernández',
      category: 'Abogada',
      avatarInitials: 'MF',
      rating: 4.9,
      reviews: 47,
      badgeLabel: 'Verificado',
      badgeIcon: Icons.verified_rounded,
      badgeColor: AppColors.verified,
      accent: AppColors.profesionalAccent,
      tags: ['Derecho civil', 'Derecho laboral', 'Asesoría legal'],
      miniTags: [(icon: Icons.shield_rounded, label: 'Confiable')],
    ),
    SlideProviderCard(
      name: 'Ferretería El Constructor',
      category: 'Ferretería',
      avatarInitials: 'FC',
      rating: 4.7,
      reviews: 58,
      badgeLabel: 'Abierto',
      badgeIcon: Icons.circle,
      badgeColor: AppColors.available,
      accent: AppColors.negocioAccent,
      tags: ['Cemento', 'Ladrillos', 'Herramientas'],
    ),
  ];

  int _index = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 2800), (_) {
      if (!mounted) return;
      setState(() => _index = (_index + 1) % _cards.length);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 450),
        switchInCurve: Curves.easeOut,
        switchOutCurve: Curves.easeIn,
        transitionBuilder: (child, anim) =>
            FadeTransition(opacity: anim, child: child),
        child: KeyedSubtree(key: ValueKey(_index), child: _cards[_index]),
      ),
    );
  }
}
