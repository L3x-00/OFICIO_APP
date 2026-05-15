import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../providers/referrals_provider.dart';
import '../widgets/referral/referral_my_code_tab.dart';
import '../widgets/referral/referral_earn_coins_tab.dart';
import '../widgets/referral/referral_history_tab.dart';

/// Pantalla principal de Promociones y Referidos con 3 pestañas.
class ReferralScreen extends StatelessWidget {
  const ReferralScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ReferralsProvider()..loadAll(),
      child: const _ReferralScreenContent(),
    );
  }
}

class _ReferralScreenContent extends StatelessWidget {
  const _ReferralScreenContent();

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<AppThemeColors>()!;
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: c.bg,
        appBar: AppBar(
          backgroundColor: c.bg,
          elevation: 0,
          title: Text(
            'Promociones',
            style: TextStyle(
              color: c.textPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 18,
            ),
          ),
          iconTheme: IconThemeData(color: c.textPrimary),
          bottom: TabBar(
            indicatorColor: AppColors.primary,
            indicatorWeight: 3,
            labelColor: AppColors.primary,
            unselectedLabelColor: c.textMuted,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            tabs: const [
              Tab(text: 'Mi código'),
              Tab(text: 'Ganar monedas'),
              Tab(text: 'Historial'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            MyCodeTab(),
            EarnCoinsTab(),
            HistoryTab(),
          ],
        ),
      ),
    );
  }
}