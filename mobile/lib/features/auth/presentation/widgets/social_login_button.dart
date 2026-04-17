import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

enum SocialProvider { google, facebook, apple }

extension _SocialProviderX on SocialProvider {
  String get assetPath {
    switch (this) {
      case SocialProvider.google:   return 'assets/icons/google.svg';
      case SocialProvider.facebook: return 'assets/icons/facebook.svg';
      case SocialProvider.apple:    return 'assets/icons/apple.svg';
    }
  }

  String get label {
    switch (this) {
      case SocialProvider.google:   return 'Continuar con Google';
      case SocialProvider.facebook: return 'Continuar con Facebook';
      case SocialProvider.apple:    return 'Continuar con Apple';
    }
  }

  // Apple icon needs to be tinted to match text color; others use their own colors
  bool get useAdaptiveColor => this == SocialProvider.apple;
}

class SocialLoginButton extends StatefulWidget {
  final SocialProvider provider;
  final VoidCallback? onTap;
  final String? customLabel;

  const SocialLoginButton({
    super.key,
    required this.provider,
    this.onTap,
    this.customLabel,
  });

  @override
  State<SocialLoginButton> createState() => _SocialLoginButtonState();
}

class _SocialLoginButtonState extends State<SocialLoginButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.12)
        : Colors.black.withValues(alpha: 0.10);
    final bgColor = isDark
        ? Colors.white.withValues(alpha: 0.05)
        : Colors.white;
    final textColor = isDark ? Colors.white : const Color(0xFF1A1A1A);

    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        widget.onTap?.call();
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedOpacity(
        opacity: _pressed ? 0.7 : 1.0,
        duration: const Duration(milliseconds: 80),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: 24,
                height: 24,
                child: SvgPicture.asset(
                  widget.provider.assetPath,
                  width: 24,
                  height: 24,
                  colorFilter: widget.provider.useAdaptiveColor
                      ? ColorFilter.mode(textColor, BlendMode.srcIn)
                      : null,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                widget.customLabel ?? widget.provider.label,
                style: TextStyle(
                  color: textColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
