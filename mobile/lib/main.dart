import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'features/providers_list/presentation/screens/providers_screen.dart';

void main() {
  runApp(const OficioApp());
}

class OficioApp extends StatelessWidget {
  const OficioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OficioApp',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.bgDark,
        colorScheme: ColorScheme.dark(
          primary: AppColors.primary,
          surface: AppColors.bgCard,
        ),
        useMaterial3: true,
      ),
      home: const ProvidersScreen(),
    );
  }
}
