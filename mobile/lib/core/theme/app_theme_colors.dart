import 'package:flutter/material.dart';
import '../constans/app_colors.dart';

/// Colores que cambian según el tema (claro/oscuro).
/// Los colores de marca (amber, primary, status) permanecen estáticos en AppColors.
@immutable
class AppThemeColors extends ThemeExtension<AppThemeColors> {
  final Color bg;           // fondo principal
  final Color bgCard;       // fondo de tarjetas
  final Color bgInput;      // fondo de campos de texto
  final Color textPrimary;  // texto principal
  final Color textSecondary;// texto secundario
  final Color textMuted;    // texto apagado
  final Color warmDeep;     // fondo cálido ámbar (usado en gradientes)
  final Color border;       // borde sutil
  final bool  isDark;

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

  static const AppThemeColors dark = AppThemeColors(
    bg:            Color(0xFF0B0D17),
    bgCard:        Color(0xFF15192B),
    bgInput:       Color(0xFF1E2235),
    textPrimary:   Colors.white,
    textSecondary: Color(0xFFB0B8C8),
    textMuted:     Color(0xFF6B7280),
    warmDeep:      Color(0xFF3D2B00),
    border:        Color(0x0FFFFFFF),  // white @ 6%
    isDark:        true,
  );

  // ── TEMA CLARO ────────────────────────────────────────────

  static const AppThemeColors light = AppThemeColors(
    bg:            Color(0xFFF0F2F7),  // gris azulado claro
    bgCard:        Color(0xFFFFFFFF),  // blanco puro
    bgInput:       Color(0xFFECEFF6),  // gris ligeramente azulado
    textPrimary:   Color(0xFF111827),  // casi negro
    textSecondary: Color(0xFF4B5563),  // gris medio
    textMuted:     Color(0xFF9CA3AF),  // gris claro
    warmDeep:      Color(0xFFFFF8E1),  // amarillo muy claro
    border:        Color(0x14000000),  // black @ 8%
    isDark:        false,
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
    bool?  isDark,
  }) {
    return AppThemeColors(
      bg:            bg            ?? this.bg,
      bgCard:        bgCard        ?? this.bgCard,
      bgInput:       bgInput       ?? this.bgInput,
      textPrimary:   textPrimary   ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textMuted:     textMuted     ?? this.textMuted,
      warmDeep:      warmDeep      ?? this.warmDeep,
      border:        border        ?? this.border,
      isDark:        isDark        ?? this.isDark,
    );
  }

  @override
  AppThemeColors lerp(AppThemeColors? other, double t) {
    if (other == null) return this;
    return AppThemeColors(
      bg:            Color.lerp(bg,            other.bg,            t)!,
      bgCard:        Color.lerp(bgCard,        other.bgCard,        t)!,
      bgInput:       Color.lerp(bgInput,       other.bgInput,       t)!,
      textPrimary:   Color.lerp(textPrimary,   other.textPrimary,   t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textMuted:     Color.lerp(textMuted,     other.textMuted,     t)!,
      warmDeep:      Color.lerp(warmDeep,      other.warmDeep,      t)!,
      border:        Color.lerp(border,        other.border,        t)!,
      isDark:        t < 0.5 ? isDark : other.isDark,
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
      brightness:              brightness,
      useMaterial3:            true,
      scaffoldBackgroundColor: c.bg,
      extensions:              [c],
      colorScheme: ColorScheme(
        brightness:         brightness,
        primary:            AppColors.primary,
        onPrimary:          Colors.white,
        secondary:          AppColors.amber,
        onSecondary:        Colors.black,
        surface:            c.bgCard,
        onSurface:          c.textPrimary,
        error:              AppColors.busy,
        onError:            Colors.white,
        outline:            c.border,
        surfaceContainerLow:  c.bgCard,
        surfaceContainer:     c.bgInput,
        onSurfaceVariant:     c.textSecondary,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor:  c.bg,
        foregroundColor:  c.textPrimary,
        elevation:        0,
        iconTheme:        IconThemeData(color: c.textPrimary),
        titleTextStyle:   TextStyle(
          color:      c.textPrimary,
          fontSize:   18,
          fontWeight: FontWeight.bold,
        ),
      ),
      cardTheme: CardThemeData(
        color:        c.bgCard,
        elevation:    isDark ? 0 : 2,
        shadowColor:  isDark ? Colors.transparent : Colors.black.withValues(alpha: 0.08),
        shape:        RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled:           true,
        fillColor:        c.bgInput,
        hintStyle:        TextStyle(color: c.textMuted),
        border:           OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide:   BorderSide.none,
        ),
        focusedBorder:    OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide:   const BorderSide(color: AppColors.amber, width: 1.5),
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
        backgroundColor:   c.bgCard,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: c.textMuted,
        elevation:         0,
        type:              BottomNavigationBarType.fixed,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: c.bgCard,
        shape:           RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
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
