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

function categorizeCommit(subject) {
  const s = subject.toLowerCase();
  if (/^feat(\(.+\))?:/.test(s)) return 'Features';
  if (/^fix(\(.+\))?:/.test(s)) return 'Bug Fixes';
  if (/^docs(\(.+\))?:/.test(s)) return 'Documentation';
  if (/^perf(\(.+\))?:/.test(s)) return 'Performance';
  if (/^refactor(\(.+\))?:/.test(s)) return 'Refactoring';
  if (/^style(\(.+\))?:/.test(s)) return 'Styles';
  if (/^test(\(.+\))?:/.test(s)) return 'Tests';
  if (/^chore(\(.+\))?:/.test(s)) return 'Chores';
  return 'Other';
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('pt-BR');
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
    'Features',
    'Bug Fixes',
    'Documentation',
    'Performance',
    'Refactoring',
    'Styles',
    'Tests',
    'Chores',
    'Other'
  ];

  order.forEach(category => {
    if (!categories[category]) return;

    entry += `### ${category}\n\n`;
    categories[category].forEach(c => {
      entry += `- ${c.subject} (${c.hash}) - ${c.author}\n`;
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
      (previous ? ` (desde ${previous})` : ' (primeira release)')
    );

    const rawCommits = previous
      ? getCommitsBetweenTags(previous, current)
      : getCommitsUntilTag(current);

    const commits = rawCommits.map(parseCommit);
    const entry = generateEntry(current.replace(/^v/, ''), commits);

    content += entry;
  }

  fs.writeFileSync(changelogPath, content);
  console.log(`✓ CHANGELOG.md gerado com sucesso`);
}

generateChangelog();