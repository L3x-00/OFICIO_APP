import { Module } from '@nestjs/common';
import { UserReportsService } from './user-reports.service.js';

/**
 * Reportes de comportamiento usuario→usuario. Exporta el servicio para que
 * UsersModule (POST /users/report) y AdminModule (GET/PATCH admin) lo usen
 * sin duplicar lógica.
 */
@Module({
  providers: [UserReportsService],
  exports: [UserReportsService],
})
export class UserReportsModule {}
