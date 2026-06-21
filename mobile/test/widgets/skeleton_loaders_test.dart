/// Regresión de los skeleton loaders (gap 3): las pantallas de fetch deben
/// mostrar shimmer en vez de spinner/blanco. Verifica que los widgets
/// skeleton se construyan y usen Shimmer.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shimmer/shimmer.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/skeleton_loaders.dart';

Widget _wrap(Widget child) => MaterialApp(
  theme: AppThemeColors.buildLight(),
  home: Scaffold(body: child),
);

void main() {
  testWidgets('SkeletonBox usa Shimmer', (tester) async {
    await tester.pumpWidget(_wrap(const SkeletonBox(height: 20)));
    expect(find.byType(Shimmer), findsOneWidget);
  });

  testWidgets('ProviderCardSkeleton renderiza con shimmer', (tester) async {
    await tester.pumpWidget(_wrap(const ProviderCardSkeleton()));
    expect(find.byType(Shimmer), findsWidgets);
  });

  testWidgets('OfferCardSkeleton renderiza con shimmer', (tester) async {
    await tester.pumpWidget(_wrap(const OfferCardSkeleton()));
    expect(find.byType(Shimmer), findsWidgets);
  });

  testWidgets('SkeletonList repite el item N veces', (tester) async {
    await tester.pumpWidget(
      _wrap(
        SkeletonList(
          count: 3,
          itemBuilder: (_) => const ProviderCardSkeleton(),
        ),
      ),
    );
    expect(find.byType(ProviderCardSkeleton), findsNWidgets(3));
  });
}
