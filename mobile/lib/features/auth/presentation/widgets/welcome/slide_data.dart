import 'package:flutter/material.dart';

/// Modelo de datos inmutable para cada slide del welcome carousel.
class SlideData {
  final String title;
  final String subtitle;
  final Widget visual;
  final Color accentColor;

  const SlideData({
    required this.title,
    required this.subtitle,
    required this.visual,
    required this.accentColor,
  });
}