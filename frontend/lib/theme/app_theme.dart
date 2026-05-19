import 'package:flutter/material.dart';

class AppColors {
  final Color bgPrimary;
  final Color bgSecondary;
  final Color bgTertiary;
  final Color bgHover;
  final Color borderPrimary;
  final Color borderSecondary;
  final Color textPrimary;
  final Color textSecondary;
  final Color textTertiary;
  final Color accent;
  final Color accentSubtle;
  final Color success;
  final Color successSubtle;
  final Color warning;
  final Color warningSubtle;
  final Color danger;
  final Color dangerSubtle;
  final Color info;
  final Color infoSubtle;
  final Color overlay;

  const AppColors({
    required this.bgPrimary,
    required this.bgSecondary,
    required this.bgTertiary,
    required this.bgHover,
    required this.borderPrimary,
    required this.borderSecondary,
    required this.textPrimary,
    required this.textSecondary,
    required this.textTertiary,
    required this.accent,
    required this.accentSubtle,
    required this.success,
    required this.successSubtle,
    required this.warning,
    required this.warningSubtle,
    required this.danger,
    required this.dangerSubtle,
    required this.info,
    required this.infoSubtle,
    required this.overlay,
  });

  static const dark = AppColors(
    bgPrimary: Color(0xFF0F0F11),
    bgSecondary: Color(0xFF17171A),
    bgTertiary: Color(0xFF1E1E22),
    bgHover: Color(0xFF26262C),
    borderPrimary: Color(0xFF2E2E36),
    borderSecondary: Color(0xFF3A3A44),
    textPrimary: Color(0xFFF0F0F2),
    textSecondary: Color(0xFF9090A0),
    textTertiary: Color(0xFF5A5A6A),
    accent: Color(0xFF6C5CE7),
    accentSubtle: Color(0x1F6C5CE7),
    success: Color(0xFF3ECF8E),
    successSubtle: Color(0x1F3ECF8E),
    warning: Color(0xFFF5A623),
    warningSubtle: Color(0x1FF5A623),
    danger: Color(0xFFE05C6A),
    dangerSubtle: Color(0x1FE05C6A),
    info: Color(0xFF4EA8DE),
    infoSubtle: Color(0x1F4EA8DE),
    overlay: Color(0x80000000),
  );

  static const light = AppColors(
    bgPrimary: Color(0xFFFFFFFF),
    bgSecondary: Color(0xFFF5F5F7),
    bgTertiary: Color(0xFFEBEBEF),
    bgHover: Color(0xFFE2E2E8),
    borderPrimary: Color(0xFFD8D8E0),
    borderSecondary: Color(0xFFC8C8D4),
    textPrimary: Color(0xFF111114),
    textSecondary: Color(0xFF505060),
    textTertiary: Color(0xFF8888A0),
    accent: Color(0xFF5B4FD4),
    accentSubtle: Color(0x1A5B4FD4),
    success: Color(0xFF1A9E68),
    successSubtle: Color(0x1A1A9E68),
    warning: Color(0xFFC47E00),
    warningSubtle: Color(0x1AC47E00),
    danger: Color(0xFFC0404E),
    dangerSubtle: Color(0x1AC0404E),
    info: Color(0xFF2B7BB8),
    infoSubtle: Color(0x1A2B7BB8),
    overlay: Color(0x4D000000),
  );
}

class AppThemeExt extends ThemeExtension<AppThemeExt> {
  final AppColors colors;
  const AppThemeExt(this.colors);

  @override
  AppThemeExt copyWith({AppColors? colors}) => AppThemeExt(colors ?? this.colors);

  @override
  AppThemeExt lerp(ThemeExtension<AppThemeExt>? other, double t) => this;
}

ThemeData buildTheme(Brightness brightness) {
  final c = brightness == Brightness.dark ? AppColors.dark : AppColors.light;
  // Fall back to system sans if DMSans assets are missing.
  const fontFamily = 'DMSans';
  return ThemeData(
    brightness: brightness,
    useMaterial3: true,
    scaffoldBackgroundColor: c.bgPrimary,
    canvasColor: c.bgPrimary,
    fontFamily: fontFamily,
    fontFamilyFallback: const ['Roboto', 'Helvetica', 'Arial'],
    colorScheme: ColorScheme.fromSeed(
      seedColor: c.accent,
      brightness: brightness,
      surface: c.bgSecondary,
      onSurface: c.textPrimary,
    ),
    dividerColor: c.borderPrimary,
    extensions: [AppThemeExt(c)],
    textTheme: TextTheme(
      displayLarge: TextStyle(color: c.textPrimary, fontFamily: fontFamily),
      bodyLarge: TextStyle(color: c.textPrimary, fontFamily: fontFamily),
      bodyMedium: TextStyle(color: c.textPrimary, fontFamily: fontFamily),
      bodySmall: TextStyle(color: c.textSecondary, fontFamily: fontFamily),
      labelMedium: TextStyle(color: c.textSecondary, fontFamily: fontFamily),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: c.bgTertiary,
      hintStyle: TextStyle(color: c.textTertiary),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: c.borderPrimary),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: c.borderPrimary),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: c.accent),
      ),
    ),
  );
}

extension AppColorsX on BuildContext {
  AppColors get c => Theme.of(this).extension<AppThemeExt>()!.colors;
}
