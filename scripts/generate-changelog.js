#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Gera CHANGELOG.md automaticamente a partir do histórico Git.
 * - Primeira tag: histórico completo até a tag
 * - Demais tags: commits entre tags
 */

function run(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

function getTags() {
  try {
    const output = run('git tag --sort=-creatordate');
    return output.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getCommitsUntilTag(tag) {
  try {
    const cmd = `git log ${tag} --pretty=format:"%h|%s|%an|%ae|%ad" --date=short`;
    return run(cmd).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getCommitsBetweenTags(fromTag, toTag) {
  try {
    const cmd = `git log ${fromTag}..${toTag} --pretty=format:"%h|%s|%an|%ae|%ad" --date=short`;
    return run(cmd).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function parseCommit(line) {
  const [hash, subject, author, email, date] = line.split('|');
  return { hash, subject, author, email, date };
}

function extractGithubHandle(email) {
  if (!email) return null;
  const match = email.match(/^[^@]+@users\.noreply\.github\.com$/);
  if (!match) return null;
  const local = email.split('@')[0];
  const plusIdx = local.indexOf('+');
  const handle = plusIdx !== -1 ? local.slice(plusIdx + 1) : local;
  return handle ? `@${handle}` : null;
}

function formatAuthor(author, email) {
  return extractGithubHandle(email) || author;
}

function categorizeCommit(subject) {
  const s = subject.toLowerCase();
  if (/^feat(\(.+\))?:/.test(s)) return 'Adicionado';
  if (/^fix(\(.+\))?:/.test(s)) return 'Corrigido';
  if (/^docs(\(.+\))?:/.test(s)) return 'Documentação';
  if (/^perf(\(.+\))?:/.test(s)) return 'Desempenho';
  if (/^refactor(\(.+\))?:/.test(s)) return 'Refatoração';
  if (/^style(\(.+\))?:/.test(s)) return 'Estilo';
  if (/^test(\(.+\))?:/.test(s)) return 'Testes';
  if (/^chore(\(.+\))?:/.test(s)) return 'Manutenção';
  return 'Outros';
}

function formatSubject(subject) {
  const cleaned = subject.replace(/^[a-z]+(\([^)]+\))?!?:\s*/i, '');
  const updateRelease = cleaned.match(/^update changelog for (.+)$/i);
  if (updateRelease) {
    return `Atualização changelog para ${updateRelease[1]}`;
  }
  if (/^update unreleased changelog$/i.test(cleaned)) {
    return 'Atualização changelog do não publicado';
  }
  if (!cleaned) return cleaned;
  return cleaned[0].toUpperCase() + cleaned.slice(1);
}

function formatDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function generateEntry(version, commits) {
  if (!commits.length) return '';

  const date = commits[0].date;
  let entry = `## [${version}] - ${formatDate(date)}\n\n`;

  const categories = {};

  commits.forEach(commit => {
    const category = categorizeCommit(commit.subject);
    categories[category] ??= [];
    categories[category].push(commit);
  });

  const order = [
    'Adicionado',
    'Corrigido',
    'Documentação',
    'Desempenho',
    'Refatoração',
    'Estilo',
    'Testes',
    'Manutenção',
    'Outros'
  ];

  order.forEach(category => {
    if (!categories[category]) return;

    entry += `### ${category}\n\n`;
    categories[category].forEach(c => {
      const subject = formatSubject(c.subject);
      entry += `- ${subject} (${c.hash}) - ${formatAuthor(c.author, c.email)}\n`;
    });
    entry += '\n';
  });

  return entry;
}

function generateChangelog() {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  const tags = getTags();

  let content = `# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).

`;

  if (!tags.length) {
    fs.writeFileSync(changelogPath, content);
    console.log('Nenhuma tag encontrada. Changelog base criado.');
    return;
  }

  for (let i = 0; i < tags.length; i++) {
    const current = tags[i];
    const previous = tags[i + 1];

    console.log(
      `Processando ${current}` +
      (previous ? ` (desde ${previous}).` : ' (primeira release).')
    );

    const rawCommits = previous
      ? getCommitsBetweenTags(previous, current)
      : getCommitsUntilTag(current);

    const commits = rawCommits.map(parseCommit);
    const entry = generateEntry(current.replace(/^v/, ''), commits);

    content += entry;
  }

  fs.writeFileSync(changelogPath, content);
  console.log('CHANGELOG.md gerado com sucesso.');
}

generateChangelog();