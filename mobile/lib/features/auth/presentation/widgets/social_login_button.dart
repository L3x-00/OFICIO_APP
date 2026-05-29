import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'package:mobile/core/social_auth_service.dart';

extension _SocialProviderX on SocialProvider {
  String get assetPath {
    switch (this) {
      case SocialProvider.google:
        return 'assets/icons/google.svg';
      case SocialProvider.facebook:
        return 'assets/icons/facebook.svg';
      case SocialProvider.tiktok:
        return 'assets/icons/tiktok.svg';
    }
  }

  String get label {
    switch (this) {
      case SocialProvider.google:
        return 'Continuar con Google';
      case SocialProvider.facebook:
        return 'Continuar con Facebook';
      case SocialProvider.tiktok:
        return 'Continuar con TikTok';
    }
  }

  bool get useAdaptiveColor => false;
}

class SocialLoginButton extends StatefulWidget {
  final SocialProvider provider;
  final VoidCallback? onTap;
  final String? customLabel;

  /// Cuando true, el botón se deshabilita (ignora taps), baja su
  /// opacidad y reemplaza el ícono por un spinner. Lo usa el login
  /// screen mientras corre el flujo social (selector de cuenta +
  /// Firebase + backend) para evitar doble-tap durante el delay.
  final bool busy;

  const SocialLoginButton({
    super.key,
    required this.provider,
    this.onTap,
    this.customLabel,
    this.busy = false,
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
    final busy = widget.busy;

    return GestureDetector(
      // `busy` deshabilita por completo el gesto — sin taps durante el
      // flujo social en curso.
      onTapDown: busy ? null : (_) => setState(() => _pressed = true),
      onTapUp: busy
          ? null
          : (_) {
              setState(() => _pressed = false);
              widget.onTap?.call();
            },
      onTapCancel: busy ? null : () => setState(() => _pressed = false),
      child: AnimatedOpacity(
        opacity: busy ? 0.55 : (_pressed ? 0.7 : 1.0),
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
                child: busy
                    ? Padding(
                        padding: const EdgeInsets.all(2),
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          valueColor: AlwaysStoppedAnimation(textColor),
                        ),
                      )
                    : SvgPicture.asset(
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
                busy
                    ? 'Conectando…'
                    : (widget.customLabel ?? widget.provider.label),
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
