import { Request } from 'express';

/**
 * Request HTTP autenticado: `req.user` lo puebla `JwtStrategy.validate()`.
 *
 * El shape coincide EXACTAMENTE con lo que devuelve la estrategia
 * (`{ userId, id, email, role }`). Se incluye `id` (además de `userId`)
 * porque la estrategia lo expone y varios controllers lo usan.
 */
export interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    id: number;
    email: string;
    role: string;
  };
}
