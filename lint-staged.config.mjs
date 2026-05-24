// lint-staged config — corre por archivos staged en pre-commit.
//
// Reglas:
//   • Solo formato/lint. NUNCA migraciones, NUNCA tests pesados — esos
//     viven en .github/workflows/ci.yml (Fase 1).
//   • Cada subproyecto usa SUS PROPIOS binarios via `npm --prefix X
//     exec`, así no acoplamos versiones de eslint/prettier al root.
//   • Para `dart format` y `dart analyze` usamos los binarios globales
//     del Flutter SDK del usuario (no se instala Dart en node_modules).
//
// Si necesitas saltarte el hook puntualmente, usá `git commit -n` —
// pero la PR igualmente fallará en CI si el código no pasa.

// Citar un path absoluto para que sobreviva al shell — defensivo por si
// hay espacios (raro en este repo). Las rutas que pasa lint-staged son
// absolutas; las pasamos tal cual.
const q = (s) => `"${s}"`;

// ⚠️ Decisión: usamos `npm --prefix <dir> run --silent <script> -- <files>`
// porque `npm run` SÍ cambia el cwd al directorio del package.json (a
// diferencia de `npm exec` que mantiene el cwd del shell). Necesitamos
// ese cwd para que ESLint v9 descubra `eslint.config.mjs` local — desde
// v9 ya no sube por la ruta del archivo, solo desde el cwd.
//
// Los scripts `lint:staged` y `format:staged` viven en cada subproyecto
// (backend/admin) — son alias finos sobre eslint/prettier que reciben
// los paths por argumento (npm `--` los reenvía).

// Filtro común: los archivos de `backend/src/generated/` los emite el
// generador de Prisma y NO se tocan a mano. Los excluimos antes de
// pasarlos a eslint/prettier — si no, el hook intenta arreglar miles
// de líneas autogeneradas y rompe el flujo de commit.
const IGNORE_BACKEND = /[\\/]backend[\\/]src[\\/]generated[\\/]/;
const filterBackend = (files) => files.filter((f) => !IGNORE_BACKEND.test(f));

export default {
  // ── BACKEND (NestJS, TypeScript ESM) ─────────────────────
  'backend/**/*.ts': (files) => {
    const filtered = filterBackend(files);
    if (filtered.length === 0) return [];
    const list = filtered.map(q).join(' ');
    return [
      `npm --prefix backend run --silent lint:staged -- ${list}`,
      `npm --prefix backend run --silent format:staged -- ${list}`,
    ];
  },

  // ── ADMIN (Next.js) ──────────────────────────────────────
  // No tiene prettier instalado — solo eslint --fix.
  'admin/**/*.{ts,tsx,js,jsx,mjs,cjs}': (files) => {
    const list = files.map(q).join(' ');
    return [
      `npm --prefix admin run --silent lint:staged -- ${list}`,
    ];
  },

  // ── MOBILE (Flutter, Dart) ───────────────────────────────
  // `dart format` reescribe in-place; lint-staged hace re-stage
  // automático. `dart analyze` sin flags: la SDK actual ya no acepta
  // `--no-fatal-infos` ("Cannot negate option…"). Si querés bajar la
  // severidad, usá `analysis_options.yaml` en mobile/.
  'mobile/**/*.dart': (files) => {
    const list = files.map(q).join(' ');
    return [
      `dart format ${list}`,
      `dart analyze ${list}`,
    ];
  },
};
