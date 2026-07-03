import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

/// Colores que cambian según el tema (claro/oscuro).
/// Los colores de marca (amber, primary, status) permanecen estáticos en AppColors.
@immutable
class AppThemeColors extends ThemeExtension<AppThemeColors> {
  final Color bg; // fondo principal
  final Color bgCard; // fondo de tarjetas
  final Color bgInput; // fondo de campos de texto
  final Color textPrimary; // texto principal
  final Color textSecondary; // texto secundario
  final Color textMuted; // texto apagado
  final Color warmDeep; // fondo cálido ámbar (usado en gradientes)
  final Color border; // borde sutil
  final bool isDark;

  const AppThemeColors({
    required this.bg,
    required this.bgCard,
    required this.bgInput,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.warmDeep,
    required this.border,
    required this.isDark,
  });

  // ── TEMA OSCURO (valores actuales) ────────────────────────

  // Oscuro CÁLIDO (espresso charcoal) — subtono ámbar/marrón (NO rojo/naranja:
  // ese undertone se descartó por poco agradable). Más oscuro que el intento
  // anterior; la calidez ahora es la misma familia que el crema del tema claro
  // (amarillo-marrón tenue), como su contraparte oscura — "lo opuesto del
  // beige" en luminosidad, no en tono. R≳G>B en los fondos, gap sutil.
  static const AppThemeColors dark = AppThemeColors(
    bg: Color(0xFF0D0B08), // casi negro cálido (no rojizo, no azul)
    bgCard: Color(0xFF1A160F), // tarjeta cálida apenas más clara
    bgInput: Color(0xFF241F15), // input cálido
    textPrimary: Color(
      0xFFF5F3EF,
    ), // blanco cálido (no #FFF puro → menos fatiga)
    textSecondary: Color(0xFFB7AD9F), // gris cálido (antes azulado)
    textMuted: Color(
      0xFF9A8E7C,
    ), // muted cálido (más claro → legible AA en oscuro)
    warmDeep: Color(0xFF2A2418), // fondo cálido ámbar para gradientes
    border: Color(0x0FFFFFFF), // white @ 6%
    isDark: true,
  );

  // ── TEMA CLARO ── crema cálido artesanal ──────────────────

  static const AppThemeColors light = AppThemeColors(
    bg: Color(0xFFFAF7F2), // crema cálido (firma artesanal)
    bgCard: Color(0xFFFFFFFF), // blanco
    bgInput: Color(0xFFF2EEE7), // gris cálido claro
    textPrimary: Color(0xFF2A2723), // casi negro cálido
    textSecondary: Color(0xFF5C574F), // gris cálido medio
    textMuted: Color(0xFF9B958A), // gris cálido apagado
    warmDeep: Color(0xFFFBF3E2), // crema más cálido para gradientes
    border: Color(0x12000000), // black @ 7% (más suave)
    isDark: false,
  );

  // ── ThemeExtension impl ───────────────────────────────────

  @override
  AppThemeColors copyWith({
    Color? bg,
    Color? bgCard,
    Color? bgInput,
    Color? textPrimary,
    Color? textSecondary,
    Color? textMuted,
    Color? warmDeep,
    Color? border,
    bool? isDark,
  }) {
    return AppThemeColors(
      bg: bg ?? this.bg,
      bgCard: bgCard ?? this.bgCard,
      bgInput: bgInput ?? this.bgInput,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textMuted: textMuted ?? this.textMuted,
      warmDeep: warmDeep ?? this.warmDeep,
      border: border ?? this.border,
      isDark: isDark ?? this.isDark,
    );
  }

  @override
  AppThemeColors lerp(AppThemeColors? other, double t) {
    if (other == null) return this;
    return AppThemeColors(
      bg: Color.lerp(bg, other.bg, t)!,
      bgCard: Color.lerp(bgCard, other.bgCard, t)!,
      bgInput: Color.lerp(bgInput, other.bgInput, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
      warmDeep: Color.lerp(warmDeep, other.warmDeep, t)!,
      border: Color.lerp(border, other.border, t)!,
      isDark: t < 0.5 ? isDark : other.isDark,
    );
  }

  // ── Helpers de tema completo ──────────────────────────────

  /// ThemeData completo para tema oscuro
  static ThemeData buildDark() => _build(dark, Brightness.dark);

  /// ThemeData completo para tema claro
  static ThemeData buildLight() => _build(light, Brightness.light);

  static ThemeData _build(AppThemeColors c, Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return ThemeData(
      brightness: brightness,
      useMaterial3: true,
      scaffoldBackgroundColor: c.bg,
      extensions: [c],
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: AppColors.primary,
        onPrimary: Colors.white,
        secondary: AppColors.amber,
        onSecondary: Colors.black,
        surface: c.bgCard,
        onSurface: c.textPrimary,
        error: AppColors.busy,
        onError: Colors.white,
        outline: c.border,
        surfaceContainerLow: c.bgCard,
        surfaceContainer: c.bgInput,
        onSurfaceVariant: c.textSecondary,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: c.bg,
        foregroundColor: c.textPrimary,
        elevation: 0,
        iconTheme: IconThemeData(color: c.textPrimary),
        titleTextStyle: TextStyle(
          color: c.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      cardTheme: CardThemeData(
        color: c.bgCard,
        // Sombra más sutil: elevación 1 en claro, 0 (plano) en oscuro.
        elevation: isDark ? 0 : 1,
        shadowColor: isDark
            ? Colors.transparent
            : Colors.black.withValues(alpha: 0.05),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.bgInput,
        hintStyle: TextStyle(color: c.textMuted),
        // Borde por defecto sutil (antes invisible) — da contorno suave al campo.
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return AppColors.amber;
          return isDark ? const Color(0xFF6B7280) : Colors.white;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppColors.amber.withValues(alpha: 0.4);
          }
          return isDark
              ? Colors.white.withValues(alpha: 0.1)
              : Colors.black.withValues(alpha: 0.12);
        }),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: c.bgCard,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: c.textMuted,
        elevation: 0,
        type: BottomNavigationBarType.fixed,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: c.bgCard,
        contentTextStyle: TextStyle(color: c.textPrimary),
      ),
    );
  }
}

/// Atajo de contexto: `context.colors.bgCard`
extension AppThemeColorsX on BuildContext {
  AppThemeColors get colors => Theme.of(this).extension<AppThemeColors>()!;
}
