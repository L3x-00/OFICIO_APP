import 'package:flutter/material.dart';

/// Paleta de colores oficial de la app — dirección "cálida artesanal".
///
/// Premium pero suave a la vista: dorado tostado como protagonista, azul
/// medianoche apagado de apoyo, estados en tonos terrosos. Valores afinados
/// para pasar contraste WCAG AA donde hay texto encima (botones, contadores).
///
/// Los widgets leen estos tokens directamente (`AppColors.primary`, etc.), así
/// que cambiar un hex aquí propaga a toda la app. Los colores que dependen del
/// tema (fondos, texto) viven en `AppThemeColors`.
abstract class AppColors {
  // Fondos (legacy oscuro — el tema real vive en AppThemeColors)
  static const Color bgDark = Color(0xFF0F111A);
  static const Color bgCard = Color(0xFF1A1D2A);
  static const Color bgInput = Color(0xFF242838);

  // Primario — azul medianoche suave. #4B6BE5 da 4.6:1 con texto blanco (AA),
  // un punto más profundo que el #5B7FFF puro para que los botones no se laven.
  static const Color primary = Color(0xFF4B6BE5);
  static const Color primaryDark = Color(0xFF3A57C2);

  // Acento PROTAGONISTA — dorado tostado, cálido pero apagado (artesanal).
  static const Color amber = Color(0xFFC4A35A);
  static const Color amberDark = Color(0xFFA88944);
  static const Color amberDeep = Color(0xFF2A2418); // fondo oscuro cálido

  // Estado de disponibilidad — tonos terrosos apagados
  static const Color available = Color(0xFF5B9A6B); // Verde salvia
  static const Color busy = Color(0xFFC4605E); // Rojo teja
  static const Color delayed = Color(0xFFC48A50); // Naranja tostado

  // Acento
  static const Color star = Color(0xFFD4B860); // Dorado suave para estrellas
  static const Color verified = Color(0xFF6B9FD4); // Azul polvoriento
  static const Color favorite = Color(0xFFD4687A); // Rosa apagado

  // Texto (estático — para superficies oscuras de marca; el tema usa AppThemeColors)
  static const Color textPrimary = Color(0xFFF5F3EF); // blanco cálido
  static const Color textSecondary = Color(0xFFAEB4C0);
  static const Color textMuted = Color(0xFF6E7480);

  // WhatsApp y llamada
  static const Color whatsapp = Color(0xFF3DAF5C); // Verde WhatsApp atenuado
  static const Color call = Color(0xFF4B6BE5); // Igual que primario

  // Redes sociales (marca externa — se mantienen reconocibles)
  static const Color google = Color(0xFFEA4335);
  static const Color facebook = Color(0xFF1877F2);

  // Planes de suscripción — dorado suave para Premium, azul para Estándar
  static const Color premium = Color(0xFFD4B860); // Dorado suave (= star)
  static const Color premiumDark = Color(0xFFA08950); // Dorado oscuro apagado
  static const Color premiumGlow = Color(0xFFE8D9A0); // Resplandor dorado suave
  static const Color standard = Color(0xFF4B6BE5); // Azul primario
  static const Color standardBorder = Color(
    0xFF3A57C2,
  ); // Azul oscuro para borde

  // ── Helpers de contraste (centralizan la regla "Suave pero legible AA") ──

  /// Color de glifo/texto LEGIBLE sobre un fill SÓLIDO de [accent]
  /// (avatar, pin de mapa, botón relleno). El dorado es un fill claro → glifo
  /// oscuro; los acentos oscuros (azul) → glifo blanco.
  static Color onSolid(Color accent) =>
      accent == amber ? amberDeep : Colors.white;

  /// Color de texto/ícono de [accent] sobre su PROPIO tinte claro
  /// (chip con fill `accent.withValues(alpha: ~0.1)`). En tema oscuro el acento
  /// se lee bien; en claro (crema) se lava, así que se oscurece para pasar AA.
  static Color tintOn(Color accent, bool isDark) {
    if (isDark) return accent;
    if (accent == amber) return amberDeep; // dorado → casi negro cálido
    return Color.alphaBlend(Colors.black.withValues(alpha: 0.42), accent);
  }
}
