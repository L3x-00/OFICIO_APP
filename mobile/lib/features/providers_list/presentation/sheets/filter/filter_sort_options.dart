import 'package:flutter/material.dart';

/// Datos inmutables de una opción de orden del filter sheet.
class SortOption {
  final String? value;
  final String label;
  final String subtitle;
  final IconData icon;
  const SortOption({
    required this.value,
    required this.label,
    required this.subtitle,
    required this.icon,
  });
}

/// Catálogo de orden — consumido por [SortBySection].
const List<SortOption> kSortOptions = [
  SortOption(
    value: null,
    label: 'Relevancia',
    subtitle: 'Resultados más relevantes primero',
    icon: Icons.auto_awesome_rounded,
  ),
  SortOption(
    value: 'reviews',
    label: 'Más reseñas',
    subtitle: 'Mayor número de opiniones de clientes',
    icon: Icons.chat_bubble_outline_rounded,
  ),
  SortOption(
    value: 'availability',
    label: 'Mayor disponibilidad',
    subtitle: 'Disponibles primero, con demora después',
    icon: Icons.schedule_rounded,
  ),
  SortOption(
    value: 'rating',
    label: 'Mejor calificación',
    subtitle: 'Ordenar por puntuación promedio',
    icon: Icons.star_outline_rounded,
  ),
];
