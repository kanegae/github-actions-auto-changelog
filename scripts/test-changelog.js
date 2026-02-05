#!/usr/bin/env node

/**
 * Script de teste para validar o gerador de changelog
 * Execute com: node scripts/test-changelog.js
 */

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

function testFileExists(filePath, name) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
}

function testFileContains(filePath, content, name) {
  const fullPath = path.join(process.cwd(), filePath);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  if (!fileContent.includes(content)) {
    throw new Error(`Arquivo não contém: "${content}"`);
  }
}

function testGitTag(tag) {
  try {
    execSync(`git rev-parse ${tag}`, { encoding: 'utf-8' });
  } catch (error) {
    throw new Error(`Tag Git não existe: ${tag}`);
  }
}

function testNodeScript(scriptPath) {
  try {
    execSync(`node ${scriptPath}`, { encoding: 'utf-8' });
  } catch (error) {
    throw new Error(`Script falhou: ${error.message}`);
  }
}

log('\n╔═════════════════════════════════════════==═════════╗', 'blue');
log('║  Teste do Gerador de Changelog                     ║', 'blue');
log('╚════════════════════════════════════════════════════╝', 'blue');

const results = [];

// Teste 1: Verificar estrutura de diretórios
results.push(runTest('Verificar estrutura de diretórios', () => {
  testFileExists('.github/workflows/changelog.yml', 'Workflow do GitHub Actions');
  testFileExists('scripts/generate-changelog.js', 'Script de geração');
  testFileExists('package.json', 'Configuração Node.js');
  testFileExists('CHANGELOG.md', 'Arquivo de changelog');
}));

// Teste 2: Verificar conteúdo do workflow
results.push(runTest('Verificar conteúdo do workflow GitHub Actions', () => {
  testFileContains('.github/workflows/changelog.yml', 'Auto Generate Changelog', 'Nome do workflow');
  testFileContains('.github/workflows/changelog.yml', 'npm run changelog', 'Comando do changelog');
}));

// Teste 3: Verificar conteúdo do package.json
results.push(runTest('Verificar package.json', () => {
  testFileContains('package.json', 'github-actions-auto-changelog', 'Nome do projeto');
  testFileContains('package.json', 'changelog', 'Script de changelog');
}));

// Teste 4: Verificar conteúdo do CHANGELOG.md
results.push(runTest('Verificar CHANGELOG.md', () => {
  testFileContains('CHANGELOG.md', 'Changelog', 'Título principal');
  testFileContains('CHANGELOG.md', 'Keep a Changelog', 'Referência ao padrão');
}));

// Teste 5: Verificar script de geração
results.push(runTest('Verificar script de geração', () => {
  testFileContains('scripts/generate-changelog.js', 'getGitLog', 'Função de leitura Git');
  testFileContains('scripts/generate-changelog.js', 'categorizeCommit', 'Função de categorização');
  testFileContains('scripts/generate-changelog.js', 'generateChangelog', 'Função principal');
}));

// Teste 6: Executar script de geração
results.push(runTest('Executar script de geração de changelog', () => {
  testNodeScript('scripts/generate-changelog.js');
}));

// Teste 7: Verificar documentação
results.push(runTest('Verificar documentação', () => {
  testFileExists('README.md', 'README');
  testFileExists('DEVELOPMENT.md', 'Guia de desenvolvimento');
  testFileExists('EXAMPLES.md', 'Exemplos de uso');
}));

// Teste 8: Verificar .gitignore
results.push(runTest('Verificar .gitignore', () => {
  testFileContains('.gitignore', 'node_modules', 'Ignorar node_modules');
  testFileContains('.gitignore', 'npm-debug.log', 'Ignorar logs npm');
}));

// Resumo
log('\n╔════════════════════════════════════════════════════╗', 'blue');
const totalTests = results.length;
const passedTests = results.filter(r => r).length;
const failedTests = totalTests - passedTests;

log(`║  Resultado: ${passedTests}/${totalTests} testes passaram${' '.repeat(20 - `${passedTests}/${totalTests}`.length)}║`, 'blue');

if (failedTests > 0) {
  log(`║  ${failedTests} teste(s) falharam${' '.repeat(30 - `${failedTests} teste(s) falharam`.length)}║`, 'red');
} else {
  log('║  ✓ Todos os testes passaram com sucesso!         ║', 'green');
}

log('╚════════════════════════════════════════════════════╝', 'blue');

process.exit(failedTests > 0 ? 1 : 0);