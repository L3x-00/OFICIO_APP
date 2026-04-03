import 'package:flutter/material.dart';

/// Paleta de colores oficial de la app
/// Inspirada en el estilo oscuro premium de tu proyecto anterior
abstract class AppColors {
  // Fondos
  static const Color bgDark      = Color(0xFF0B0D17);
  static const Color bgCard      = Color(0xFF15192B);
  static const Color bgInput     = Color(0xFF1E2235);

  // Primario
  static const Color primary     = Color(0xFF00C6FF);
  static const Color primaryDark = Color(0xFF0072FF);

  // Acento cálido — ámbar/dorado para comunidad y confianza
  static const Color amber       = Color(0xFFFFC107);
  static const Color amberDark   = Color(0xFFFF8F00);
  static const Color amberDeep   = Color(0xFF3D2B00); // fondo oscuro cálido

  // Estado de disponibilidad
  static const Color available   = Color(0xFF00E676);  // Verde
  static const Color busy        = Color(0xFFFF3D00);  // Rojo
  static const Color delayed     = Color(0xFFFF9800);  // Naranja

  // Acento
  static const Color star        = Color(0xFFFFD700);  // Dorado para estrellas
  static const Color verified    = Color(0xFF1DA1F2);  // Azul Twitter para verificado
  static const Color favorite    = Color(0xFFFF3366);  // Rosa para corazón

  // Texto
  static const Color textPrimary   = Colors.white;
  static const Color textSecondary = Color(0xFFB0B8C8);
  static const Color textMuted     = Color(0xFF6B7280);

  // WhatsApp y llamada
  static const Color whatsapp    = Color(0xFF25D366);
  static const Color call        = Color(0xFF0072FF);

  // Redes sociales
  static const Color google      = Color(0xFFEA4335);
  static const Color facebook    = Color(0xFF1877F2);
}