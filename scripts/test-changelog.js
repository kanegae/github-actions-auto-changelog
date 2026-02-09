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
  return fs.existsSync(path.join(process.cwd(), filePath));
}

function testFileExists(filePath) {
  if (!fileExists(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
}

function testFileContains(filePath, content) {
  const fullPath = path.join(process.cwd(), filePath);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');

  if (!fileContent.includes(content)) {
    throw new Error(`Arquivo ${filePath} não contém: "${content}"`);
  }
}

function runNodeScript(scriptPath) {
  execSync(`node ${scriptPath}`, { stdio: 'pipe' });
}

log('\n╔════════════════════════════════════════════════════╗', 'blue');
log('║        Teste do Gerador de Changelog               ║', 'blue');
log('╚════════════════════════════════════════════════════╝', 'blue');

const results = [];

/* =======================================================
   TESTE 1 — Estrutura básica do projeto
======================================================= */
results.push(runTest('Estrutura básica do projeto', () => {
  testFileExists('.github/workflows/changelog.yml');
  testFileExists('.github/workflows/unreleased.yml');
  testFileExists('scripts/generate-changelog.js');
  testFileExists('scripts/update-unreleased.js');
  testFileExists('scripts/promote-release.js');
  testFileExists('package.json');
  testFileExists('README.md');
  testFileExists('CHANGELOG.md');
}));

/* =======================================================
   TESTE 2 — Workflow GitHub Actions
======================================================= */
results.push(runTest('Workflow GitHub Actions válido', () => {
  testFileContains('.github/workflows/changelog.yml', 'release:');
  testFileContains('.github/workflows/changelog.yml', 'published');
  testFileContains('.github/workflows/changelog.yml', 'npm run changelog:release');
  testFileContains('.github/workflows/changelog.yml', 'actions/checkout@v4');
  testFileContains('.github/workflows/unreleased.yml', 'pull_request:');
  testFileContains('.github/workflows/unreleased.yml', 'types:');
  testFileContains('.github/workflows/unreleased.yml', 'closed');
  testFileContains('.github/workflows/unreleased.yml', 'development');
  testFileContains('.github/workflows/unreleased.yml', 'npm run changelog:unreleased');
  testFileContains('.github/workflows/unreleased.yml', 'UNRELEASED_BRANCH');
}));

/* =======================================================
   TESTE 3 — package.json
======================================================= */
results.push(runTest('package.json configurado', () => {
  testFileContains('package.json', '"scripts"');
  testFileContains('package.json', 'changelog');
}));

/* =======================================================
   TESTE 4 — Script de geração
======================================================= */
results.push(runTest('Script generate-changelog válido', () => {
  testFileContains('scripts/generate-changelog.js', 'generateChangelog');
  testFileContains('scripts/generate-changelog.js', 'categorizeCommit');
  testFileContains('scripts/generate-changelog.js', 'getTags');
}));

/* =======================================================
   TESTE 5 — Executar geração
======================================================= */
results.push(runTest('Executar geração de changelog', () => {
  runNodeScript('scripts/generate-changelog.js');
}));

/* =======================================================
   TESTE 6 — CHANGELOG gerado
======================================================= */
results.push(runTest('CHANGELOG.md existe', () => {
  testFileExists('CHANGELOG.md');
}));

/* =======================================================
   TESTE 7 — CHANGELOG não vazio
======================================================= */
results.push(runTest('CHANGELOG não está vazio', () => {
  const content = fs.readFileSync('CHANGELOG.md', 'utf-8').trim();

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

  const content = fs.readFileSync('.gitignore', 'utf-8');

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
