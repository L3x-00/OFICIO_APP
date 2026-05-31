/**
 * Setup de los Contract Tests. Carga `backend/.env` para exponer
 * GEMINI_API_KEY (y RUN_GEMINI_CONTRACT_TESTS si se define ahí) ANTES de que
 * el spec evalúe su gate de skip. No toca nada más.
 */
import { config } from 'dotenv';

config(); // backend/.env (cwd del runner)
