#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Script para gerar changelog automaticamente baseado no histórico Git
 * Lê os commits entre tags e gera entrada no CHANGELOG.md
 */

function getGitLog(fromTag, toTag = 'HEAD') {
  try {
    const command = `git log ${fromTag}..${toTag} --pretty=format:"%h|%s|%an|%ae|%ad" --date=short`;
    const output = execSync(command, { encoding: 'utf-8' });
    return output.trim().split('\n').filter(line => line.length > 0);
  } catch (error) {
    console.error('Erro ao buscar histórico Git:', error.message);
    return [];
  }
}

function parseCommit(line) {
  const [hash, subject, author, email, date] = line.split('|');
  return { hash, subject, author, email, date };
}

function categorizeCommit(subject) {
  const feat = subject.toLowerCase().match(/^feat(\(.+\))?:/);
  const fix = subject.toLowerCase().match(/^fix(\(.+\))?:/);
  const docs = subject.toLowerCase().match(/^docs(\(.+\))?:/);
  const style = subject.toLowerCase().match(/^style(\(.+\))?:/);
  const refactor = subject.toLowerCase().match(/^refactor(\(.+\))?:/);
  const perf = subject.toLowerCase().match(/^perf(\(.+\))?:/);
  const test = subject.toLowerCase().match(/^test(\(.+\))?:/);
  const chore = subject.toLowerCase().match(/^chore(\(.+\))?:/);

  if (feat) return 'Features';
  if (fix) return 'Bug Fixes';
  if (docs) return 'Documentation';
  if (style) return 'Styles';
  if (refactor) return 'Refactoring';
  if (perf) return 'Performance';
  if (test) return 'Tests';
  if (chore) return 'Chores';
  return 'Other';
}

function getTags() {
  try {
    const output = execSync('git tag --sort=-creatordate', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(tag => tag.length > 0);
  } catch (error) {
    console.error('Erro ao buscar tags:', error.message);
    return [];
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('pt-BR');
}

function generateChangelogEntry(version, changes, date) {
  let entry = `## [${version}] - ${formatDate(date)}\n\n`;

  // Agrupar changes por categoria
  const categories = {};
  changes.forEach(commit => {
    const category = categorizeCommit(commit.subject);
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(commit);
  });

  // Ordenar categorias
  const order = ['Features', 'Bug Fixes', 'Documentation', 'Performance', 'Refactoring', 'Styles', 'Tests', 'Chores', 'Other'];
  const sortedCategories = Object.keys(categories).sort((a, b) => {
    return order.indexOf(a) - order.indexOf(b);
  });

  // Gerar markdown para cada categoria
  sortedCategories.forEach(category => {
    entry += `### ${category}\n\n`;
    categories[category].forEach(commit => {
      entry += `- ${commit.subject} (${commit.hash.substring(0, 7)}) - ${commit.author}\n`;
    });
    entry += '\n';
  });

  return entry;
}

function generateChangelog() {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  const tags = getTags();

  if (tags.length === 0) {
    console.log('Nenhuma tag encontrada. Criando changelog inicial...');
    const initialContent = `# Changelog\n\nTodas as mudanças notáveis neste projeto serão documentadas neste arquivo.\n\n`;
    fs.writeFileSync(changelogPath, initialContent);
    return;
  }

  let changelogContent = '# Changelog\n\nTodas as mudanças notáveis neste projeto serão documentadas neste arquivo.\n\n';
  changelogContent += 'O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).\n\n';

  // Processar cada tag
  for (let i = 0; i < tags.length; i++) {
    const currentTag = tags[i];
    const previousTag = i + 1 < tags.length ? tags[i + 1] : null;

    console.log(`Processando tag: ${currentTag}${previousTag ? ` (desde ${previousTag})` : ' (primeira release)'}`);

    let commits = [];
    if (previousTag) {
      const log = getGitLog(previousTag, currentTag);
      commits = log.map(parseCommit);
    } else {
      const log = getGitLog(currentTag);
      commits = log.map(parseCommit);
    }

    if (commits.length > 0) {
      const entry = generateChangelogEntry(
        currentTag.replace(/^v/, ''),
        commits,
        commits[0].date
      );
      changelogContent += entry;
    }
  }

  fs.writeFileSync(changelogPath, changelogContent);
  console.log(`✓ Changelog gerado com sucesso em ${changelogPath}`);
}

// Executar
generateChangelog();