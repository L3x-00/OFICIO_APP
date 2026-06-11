import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'package:mobile/core/services/geocoding_service.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../domain/models/provider_model.dart';
import 'card_helpers.dart';

/// Texto de DIRECCIÓN/ubicación con regla de prioridad, reutilizable en el
/// detalle y en la "Lista Detallada":
///
///   1. `provider.address` (BD)  → se muestra tal cual.
///   2. Si [fallbackToLocality]: "Provincia, Distrito" (BD).
///   3. Coordenadas → `GeocodingService.reverseGeocodeAddress` (Nominatim),
///      mostrando un shimmer mientras traduce.
///   4. Nada disponible → `SizedBox.shrink()`.
///
/// NUNCA geocodifica si ya hay `address` o (con el flag) locality en BD.
class ProviderAddressText extends StatefulWidget {
  final ProviderModel provider;

  /// Si true, usa "Provincia, Distrito" de BD antes de geocodificar.
  final bool fallbackToLocality;

  final TextStyle style;
  final int maxLines;

  /// Ícono de pin a la izquierda (opcional).
  final IconData? icon;
  final Color? iconColor;
  final double iconSize;

  const ProviderAddressText({
    super.key,
    required this.provider,
    required this.style,
    this.fallbackToLocality = false,
    this.maxLines = 1,
    this.icon,
    this.iconColor,
    this.iconSize = 13,
  });

  @override
  State<ProviderAddressText> createState() => _ProviderAddressTextState();
}

class _ProviderAddressTextState extends State<ProviderAddressText> {
  String? _text; // texto resuelto (BD o geocodificado)
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _resolve();
  }

  @override
  void didUpdateWidget(covariant ProviderAddressText old) {
    super.didUpdateWidget(old);
    if (old.provider.id != widget.provider.id ||
        old.fallbackToLocality != widget.fallbackToLocality) {
      _text = null;
      _loading = false;
      _resolve();
    }
  }

  /// Resolución síncrona (BD) + disparo async del geocoding si hace falta.
  /// Se llama desde initState/didUpdateWidget → setea campos directo; el
  /// build posterior los usa. El geocoding usa setState al completar.
  void _resolve() {
    final p = widget.provider;
    // Privacidad: si ocultó su ubicación exacta, jamás mostramos dirección ni
    // geocodificamos coords — solo "Departamento, Provincia" (o nada).
    if (!p.showExactLocation) {
      _text = departmentProvinceLabel(p);
      return;
    }
    final addr = p.address?.trim();
    if (addr != null && addr.isNotEmpty) {
      _text = addr;
      return;
    }
    if (widget.fallbackToLocality) {
      final loc = provinceDistrictLabel(p);
      if (loc != null) {
        _text = loc;
        return;
      }
    }
    if (p.latitude != null && p.longitude != null) {
      _loading = true;
      _runGeocode(p.latitude!, p.longitude!);
      return;
    }
    _text = null;
  }

  Future<void> _runGeocode(double lat, double lng) async {
    final addr = await GeocodingService.reverseGeocodeAddress(lat, lng);
    if (!mounted) return;
    setState(() {
      _loading = false;
      _text = addr;
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    if (_loading) {
      // Shimmer mientras traduce las coordenadas a dirección.
      return Shimmer.fromColors(
        baseColor: c.bgInput,
        highlightColor: c.border,
        child: Container(
          height: widget.style.fontSize ?? 12,
          width: 140,
          decoration: BoxDecoration(
            color: c.bgInput,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
      );
    }

    final text = _text;
    if (text == null || text.isEmpty) return const SizedBox.shrink();

    final label = Text(
      text,
      style: widget.style,
      maxLines: widget.maxLines,
      overflow: TextOverflow.ellipsis,
    );

    if (widget.icon == null) return label;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 1),
          child: Icon(
            widget.icon,
            size: widget.iconSize,
            color: widget.iconColor ?? c.textMuted,
          ),
        ),
        const SizedBox(width: 4),
        Expanded(child: label),
      ],
    );
  }
}
