import 'package:flutter/material.dart';

/// Mapa de slug de macrocategoría → ícono Flutter representativo.
/// Compartido entre [FilterBar] y la sección de categorías del filter sheet.
const kParentCategoryIcons = <String, IconData>{
  'hogar':               Icons.home_repair_service_rounded,
  'gastronomia':         Icons.restaurant_rounded,
  'belleza':             Icons.face_retouching_natural_rounded,
  'transporte-general':  Icons.directions_car_rounded,
  'tecnologia':          Icons.computer_rounded,
  'salud':               Icons.health_and_safety_rounded,
  'educacion':           Icons.school_rounded,
  'ingenieria':          Icons.engineering_rounded,
};
