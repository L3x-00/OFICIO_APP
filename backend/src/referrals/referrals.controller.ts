import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { ReferralsService } from './referrals.service.js';

interface AuthedRequest {
  user: { userId: number; role: string };
}

// ── /referrals (autenticado) ────────────────────────────────
@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get('my-code')
  getMyCode(@Request() req: AuthedRequest) {
    return this.referrals.getMyCode(req.user.userId);
  }

  @Get('my-stats')
  getMyStats(@Request() req: AuthedRequest) {
    return this.referrals.getMyStats(req.user.userId);
  }

  @Post('apply')
  applyCode(@Request() req: AuthedRequest, @Body('code') code: string) {
    return this.referrals.applyCode(req.user.userId, code);
  }

  @Get('rewards')
  listRewards() {
    return this.referrals.listActiveRewards();
  }

  @Post('redeem')
  redeem(
    @Request() req: AuthedRequest,
    @Body() body: { rewardId?: number; plan?: string },
  ) {
    return this.referrals.redeem(req.user.userId, body);
  }

  @Get('redemptions')
  listMyRedemptions(@Request() req: AuthedRequest) {
    return this.referrals.listMyRedemptions(req.user.userId);
  }
}

// ── /admin/referrals + /admin/rewards ───────────────────────
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get('referral-stats')
  getStats() {
    return this.referrals.getAdminStats();
  }

  @Get('rewards')
  listRewards() {
    return this.referrals.listAllRewards();
  }

  @Post('rewards')
  createReward(@Body() body: {
    providerId: number;
    title: string;
    description: string;
    coinsCost: number;
  }) {
    return this.referrals.createReward(body);
  }

  @Patch('rewards/:id')
  updateReward(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<{
      title: string;
      description: string;
      coinsCost: number;
      isActive: boolean;
    }>,
  ) {
    return this.referrals.updateReward(id, body);
  }

  @Delete('rewards/:id')
  deleteReward(@Param('id', ParseIntPipe) id: number) {
    return this.referrals.deleteReward(id);
  }
}
