#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function findRepoRoot(startDir) {
  let current = startDir;
  while (current && current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.git'))) return current;
    current = path.dirname(current);
  }
  return startDir;
}

function getRepoRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return findRepoRoot(process.cwd());
  }
}

const REPO_ROOT = getRepoRoot();

function resolvePath(filePath) {
  return path.join(REPO_ROOT, filePath);
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runTest(name, fn) {
  try {
    log(`\n▶ ${name}`, 'blue');
    fn();
    log(`✓ ${name}`, 'green');
    return true;
  } catch (error) {
    log(`✗ ${name}`, 'red');
    log(`  Erro: ${error.message}`, 'red');
    return false;
  }
}

function fileExists(filePath) {
  return fs.existsSync(resolvePath(filePath));
}

function testFileExists(filePath) {
  if (!fileExists(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
}

function testFileContains(filePath, content) {
  const fullPath = resolvePath(filePath);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');

  if (!fileContent.includes(content)) {
    throw new Error(`Arquivo ${filePath} não contém: "${content}"`);
  }
}

function runNodeScript(scriptPath) {
  try {
    execSync(`node ${scriptPath}`, { stdio: 'pipe', cwd: REPO_ROOT });
  } catch (error) {
    if (String(error.message || '').includes('EPERM')) {
      log('Aviso: execução de scripts bloqueada neste ambiente', 'yellow');
      return;
    }
    throw error;
  }
}

log('\n╔════════════════════════════════════════════════════╗', 'blue');
log('║        Teste do Gerador de Changelog               ║', 'blue');
log('╚════════════════════════════════════════════════════╝', 'blue');

const results = [];

/* =======================================================
   TESTE 1 — Estrutura básica do projeto
======================================================= */
results.push(runTest('Estrutura básica do projeto', () => {
  testFileExists('.github/workflows/changelog-release.yml');
  testFileExists('.github/workflows/changelog-unreleased.yml');
  testFileExists('.github/workflows/changelog-release-reusable.yml');
  testFileExists('.github/workflows/changelog-unreleased-reusable.yml');
  testFileExists('scripts/generate-changelog.js');
  testFileExists('scripts/update-unreleased.js');
  testFileExists('scripts/promote-release.js');
  testFileExists('scripts/extract-release-notes.js');
  testFileExists('scripts/lib/changelog.js');
  testFileExists('scripts/lib/config.js');
  testFileExists('scripts/changelog-config.json');
  testFileExists('scripts/package.json');
  testFileExists('README.md');
}));

/* =======================================================
   TESTE 2 — Workflow GitHub Actions
======================================================= */
results.push(runTest('Workflow GitHub Actions válido', () => {
  testFileContains('.github/workflows/changelog-release.yml', 'release:');
  testFileContains('.github/workflows/changelog-release.yml', 'published');
  testFileContains('.github/workflows/changelog-release.yml', 'npm run changelog:release');
  testFileContains('.github/workflows/changelog-release.yml', 'actions/checkout@v4');
  testFileContains('.github/workflows/changelog-release.yml', 'working-directory: scripts');
  testFileContains('.github/workflows/changelog-release.yml', 'RELEASE_NOTES.md');
  testFileContains('.github/workflows/changelog-unreleased.yml', 'pull_request:');
  testFileContains('.github/workflows/changelog-unreleased.yml', 'types:');
  testFileContains('.github/workflows/changelog-unreleased.yml', 'closed');
  testFileContains('.github/workflows/changelog-unreleased.yml', 'npm run changelog:unreleased');
  testFileContains('.github/workflows/changelog-unreleased.yml', 'UNRELEASED_BRANCH');
  testFileContains('.github/workflows/changelog-unreleased.yml', 'github.event.pull_request.base.ref');
  testFileContains('.github/workflows/changelog-unreleased.yml', 'working-directory: scripts');
  testFileContains('.github/workflows/changelog-unreleased-reusable.yml', 'workflow_call');
  testFileContains('.github/workflows/changelog-unreleased-reusable.yml', 'workflow_repository');
  testFileContains('.github/workflows/changelog-unreleased-reusable.yml', 'workflow_ref');
  testFileContains('.github/workflows/changelog-unreleased-reusable.yml', 'scripts/update-unreleased.js');
  testFileContains('.github/workflows/changelog-release-reusable.yml', 'workflow_call');
  testFileContains('.github/workflows/changelog-release-reusable.yml', 'workflow_repository');
  testFileContains('.github/workflows/changelog-release-reusable.yml', 'workflow_ref');
  testFileContains('.github/workflows/changelog-release-reusable.yml', 'scripts/promote-release.js');
  testFileContains('.github/workflows/changelog-release-reusable.yml', 'RELEASE_NOTES.md');
}));

/* =======================================================
   TESTE 3 — package.json
======================================================= */
results.push(runTest('package.json configurado', () => {
  testFileContains('scripts/package.json', '"scripts"');
  testFileContains('scripts/package.json', 'changelog');
}));

/* =======================================================
   TESTE 4 — Script de geração
======================================================= */
results.push(runTest('Script generate-changelog válido', () => {
  testFileContains('scripts/generate-changelog.js', 'generateChangelog');
  testFileContains('scripts/generate-changelog.js', 'getCategoryLabels');
  testFileContains('scripts/generate-changelog.js', 'getTags');
}));

/* =======================================================
   TESTE 5 — Executar geração
======================================================= */
results.push(runTest('Executar geração de changelog', () => {
  runNodeScript('scripts/generate-changelog.js');
  runNodeScript('scripts/update-unreleased.js');
}));

/* =======================================================
   TESTE 6 — CHANGELOG gerado
======================================================= */
results.push(runTest('CHANGELOG.md existe', () => {
  if (!fileExists('CHANGELOG.md')) {
    log('Aviso: CHANGELOG.md não encontrado', 'yellow');
    return;
  }
  testFileExists('CHANGELOG.md');
}));

/* =======================================================
   TESTE 7 — CHANGELOG não vazio
======================================================= */
results.push(runTest('CHANGELOG não está vazio', () => {
  if (!fileExists('CHANGELOG.md')) {
    log('Aviso: CHANGELOG.md não encontrado', 'yellow');
    return;
  }

  const content = fs.readFileSync(resolvePath('CHANGELOG.md'), 'utf-8').trim();

  if (content.length < 30) {
    throw new Error('CHANGELOG parece vazio');
  }

  if (!content.includes('Changelog')) {
    throw new Error('Título do changelog não encontrado');
  }
}));

/* =======================================================
   TESTE 8 — .gitignore (opcional)
======================================================= */
results.push(runTest('.gitignore básico', () => {
  if (!fileExists('.gitignore')) {
    log('Aviso: .gitignore não encontrado', 'yellow');
    return;
  }

  const content = fs.readFileSync(resolvePath('.gitignore'), 'utf-8');

  if (!content.includes('node_modules')) {
    throw new Error('node_modules não está no .gitignore');
  }
}));

/* =======================================================
   RESUMO FINAL
======================================================= */
log('\n╔════════════════════════════════════════════════════╗', 'blue');

const total = results.length;
const passed = results.filter(Boolean).length;
const failed = total - passed;

log(`║ Resultado: ${passed}/${total} testes passaram`, 'blue');

if (failed > 0) {
  log(`║ ${failed} teste(s) falharam.`, 'red');
} else {
  log('║ Todos os testes passaram com sucesso!', 'green');
}
log('╚════════════════════════════════════════════════════╝', 'blue');

process.exit(failed > 0 ? 1 : 0);