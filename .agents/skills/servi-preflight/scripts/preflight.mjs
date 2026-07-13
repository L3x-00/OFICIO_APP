#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const asJson = process.argv.includes('--json');

function run(file, args, trim = true) {
  try {
    const output = execFileSync(file, args, {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return trim ? output.trim() : output.replace(/\r?\n$/, '');
  } catch {
    return '';
  }
}

function succeeds(file, args) {
  const result = spawnSync(file, args, { cwd: repo, stdio: 'ignore' });
  return !result.error && result.status === 0;
}

const git = (...args) => run('git', ['-C', repo, ...args]);
const gitRaw = (...args) => run('git', ['-C', repo, ...args], false);
const lines = (value) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const normalizePath = (value) => value.replaceAll('\\', '/').replace(/^"|"$/g, '');

const branch = git('branch', '--show-current') || '(detached)';
const head = git('rev-parse', 'HEAD');
const shortHead = head.slice(0, 8) || 'unknown';
const statusLines = gitRaw('status', '--porcelain=v1', '--untracked-files=all')
  .split(/\r?\n/)
  .filter(Boolean);
const dirtyFiles = statusLines.map((line) => {
  const raw = line.slice(3);
  return normalizePath(raw.includes(' -> ') ? raw.split(' -> ').at(-1) : raw);
});
const branchFiles = lines(git('diff', '--name-only', 'main...HEAD')).map(normalizePath);
const changedFiles = [...new Set([...branchFiles, ...dirtyFiles])].sort();

const appNames = ['backend', 'mobile', 'admin', 'web', 'my-video'];
const changedApps = appNames.filter((app) => changedFiles.some((path) => path.startsWith(`${app}/`)));
const sqlGate = changedFiles.some(
  (path) => path === 'backend/prisma/schema.prisma' || path.startsWith('backend/prisma/sql/'),
);
const codeChangedOnMain = branch === 'main' && changedApps.length > 0;

const contextPath = resolve(repo, 'docs/CONTEXTO_PROYECTO.md');
const context = existsSync(contextPath) ? readFileSync(contextPath, 'utf8') : '';
const contextDate = context.match(/\*\*Última actualización:\*\*\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? 'missing';
const contextAgeDays = contextDate === 'missing'
  ? null
  : Math.floor((Date.now() - new Date(`${contextDate}T00:00:00Z`).getTime()) / 86_400_000);

const graphPath = resolve(repo, 'graphify-out/GRAPH_REPORT.md');
const graph = existsSync(graphPath) ? readFileSync(graphPath, 'utf8') : '';
const graphCommit = graph.match(/Built from commit:\s*`([^`]+)`/)?.[1] ?? 'missing';
const graphCommitResolved = graphCommit === 'missing'
  ? ''
  : git('rev-parse', '--verify', `${graphCommit}^{commit}`);
const graphCommitIsAncestor = Boolean(graphCommitResolved)
  && succeeds('git', ['-C', repo, 'merge-base', '--is-ancestor', graphCommitResolved, head]);
const graphChangedFiles = graphCommitIsAncestor
  ? lines(git('diff', '--name-only', `${graphCommitResolved}..${head}`)).map(normalizePath)
  : [];
const graphSourceRoots = new Set(['backend', 'mobile', 'admin', 'web', 'my-video']);
const graphManifestFiles = new Set([
  'package.json',
  'package-lock.json',
  'pubspec.yaml',
  'pubspec.lock',
]);
const graphSourceExtension = /\.(?:ts|tsx|js|jsx|mjs|cjs|dart|prisma|sql|json|ya?ml)$/i;
const graphIgnoredSegment = /(^|\/)(?:node_modules|coverage|dist|build|\.next|public|assets)(\/|$)/i;
const isGraphSourcePath = (path) => {
  const [root] = path.split('/');
  const basename = path.split('/').at(-1) ?? '';
  return graphSourceRoots.has(root)
    && !graphManifestFiles.has(basename)
    && !graphIgnoredSegment.test(path)
    && graphSourceExtension.test(path);
};
const graphRelevantChanges = graphChangedFiles.filter(isGraphSourcePath);
const graphFresh = graphCommitIsAncestor && graphRelevantChanges.length === 0;

const commonSkills = ['verificar', 'subir-pr', 'sql-prod', 'ui-tema', 'cerrar-tanda'];
const codexSkills = [...commonSkills, 'servi-preflight'];
const missingCodexSkills = codexSkills.filter(
  (name) => !existsSync(resolve(repo, '.agents/skills', name, 'SKILL.md')),
);
const missingClaudeSkills = commonSkills.filter(
  (name) => !existsSync(resolve(repo, '.claude/skills', name, 'SKILL.md')),
);
const claudeNewer = commonSkills.filter((name) => {
  const source = resolve(repo, '.claude/skills', name, 'SKILL.md');
  const target = resolve(repo, '.agents/skills', name, 'SKILL.md');
  return existsSync(source) && existsSync(target)
    && statSync(source).mtimeMs > statSync(target).mtimeMs + 1000;
});

const codexMemory = resolve(
  homedir(),
  '.codex/projects/c--Users-Usuario-oficio-app/memory/MEMORY.md',
);
const codexMemoryReady = existsSync(codexMemory);
const trackedEphemeral = lines(
  git('ls-files', '--', '.claude/settings.local.json', '.claude/scheduled_tasks.lock'),
);
const rtkProbe = spawnSync('rtk', ['--version'], { cwd: repo, encoding: 'utf8' });
const rtkAvailable = !rtkProbe.error && rtkProbe.status === 0;
const graphifyProbe = spawnSync('graphify', ['--version'], { cwd: repo, encoding: 'utf8' });
const graphifyAvailable = !graphifyProbe.error && graphifyProbe.status === 0;
const nodeVersionFile = resolve(repo, '.nvmrc');
const expectedNode = existsSync(nodeVersionFile) ? readFileSync(nodeVersionFile, 'utf8').trim() : '20';
const expectedNodeMajor = Number(expectedNode.match(/\d+/)?.[0] ?? 20);
const nodeMajor = Number(process.versions.node.split('.')[0]);
const nodeManagers = [
  { name: 'nvm', args: ['version'], hint: `usar nvm use ${expectedNode}` },
  { name: 'fnm', args: ['--version'], hint: `usar fnm use ${expectedNode}` },
  { name: 'volta', args: ['--version'], hint: `usar volta install node@${expectedNode}` },
].filter((manager) => {
  const probe = spawnSync(manager.name, manager.args, { cwd: repo, encoding: 'utf8' });
  return !probe.error && probe.status === 0;
});
const nodeSwitchHint = nodeManagers[0]?.hint ?? `activar Node ${expectedNode} (.nvmrc)`;
const trackedGenerated = {
  coverage: lines(git('ls-files', 'coverage')).length,
  prismaClient: lines(git('ls-files', 'backend/src/generated')).length,
  androidReports: lines(git('ls-files', ':(glob)**/problems-report.html')).length,
};
const suspiciousArtifacts = changedFiles.filter(
  (path) => path === 'git'
    || /(^|\/)Untitled-\d+\.txt$/i.test(path)
    || /problems-report\.html$/i.test(path)
    || path.startsWith('coverage/'),
);

const warnings = [];
if (!graphFresh) {
  const detail = graphRelevantChanges.length
    ? `; fuente modificada: ${graphRelevantChanges.slice(0, 3).join(', ')}`
    : '';
  warnings.push(`Graphify obsoleto: ${graphCommit} vs ${shortHead}${detail}`);
}
if (!codexMemoryReady) warnings.push('Memoria Codex ausente');
if (!rtkAvailable) warnings.push('RTK no disponible; usar comandos directos');
if (nodeMajor !== expectedNodeMajor) {
  warnings.push(`Node ${process.versions.node} local != Node ${expectedNode} esperado (.nvmrc/CI); ${nodeSwitchHint}`);
}
if (!graphifyAvailable) warnings.push('Graphify CLI no disponible');
if (trackedEphemeral.length) warnings.push(`Archivos locales trackeados: ${trackedEphemeral.join(', ')}`);
if (claudeNewer.length) warnings.push(`Skills Claude más nuevos: ${claudeNewer.join(', ')}`);
if (missingCodexSkills.length) warnings.push(`Skills Codex faltantes: ${missingCodexSkills.join(', ')}`);
if (missingClaudeSkills.length) warnings.push(`Skills Claude faltantes: ${missingClaudeSkills.join(', ')}`);
if (contextAgeDays !== null && contextAgeDays > 14) warnings.push(`Contexto antiguo: ${contextAgeDays} días`);
if (sqlGate) warnings.push('SQL_GATE: requiere aplicación manual antes de merge');
if (codeChangedOnMain) warnings.push('Código modificado sobre main; usar rama para cambio importante');
if (suspiciousArtifacts.length) warnings.push(`${suspiciousArtifacts.length} artefactos sospechosos; no stagear`);
const generatedCount = Object.values(trackedGenerated).reduce((sum, count) => sum + count, 0);
if (generatedCount) warnings.push(`${generatedCount} artefactos generados siguen trackeados`);

const result = {
  repo,
  branch,
  head,
  dirtyCount: dirtyFiles.length,
  changedApps,
  changedFiles,
  sqlGate,
  context: { path: contextPath, date: contextDate, ageDays: contextAgeDays },
  graph: {
    path: graphPath,
    commit: graphCommit,
    resolvedCommit: graphCommitResolved || null,
    fresh: graphFresh,
    relevantChanges: graphRelevantChanges,
  },
  skills: { missingCodex: missingCodexSkills, missingClaude: missingClaudeSkills, claudeNewer },
  codexMemoryReady,
  tools: {
    node: process.versions.node,
    expectedNode,
    nodeManagers: nodeManagers.map((manager) => manager.name),
    rtkAvailable,
    graphifyAvailable,
  },
  trackedEphemeral,
  trackedGenerated,
  suspiciousArtifacts,
  warnings,
};

if (asJson) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  const appLabel = changedApps.length ? changedApps.join(',') : 'ninguna';
  console.log(`Servi preflight | ${branch}@${shortHead} | dirty ${dirtyFiles.length}`);
  console.log(`Contexto ${contextDate} | Graphify ${graphFresh ? 'FRESH' : `STALE(${graphCommit})`}`);
  console.log(`Apps ${appLabel} | SQL_GATE ${sqlGate ? 'SÍ' : 'no'}`);
  console.log(`Skills Codex ${codexSkills.length - missingCodexSkills.length}/${codexSkills.length} | memoria ${codexMemoryReady ? 'OK' : 'FALTA'} | Node ${process.versions.node} | RTK ${rtkAvailable ? 'OK' : 'NO'}`);
  for (const warning of warnings) console.log(`WARN ${warning}`);
}
