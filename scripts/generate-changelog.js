#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const {
  getCategoryOrder,
  getCategoryLabels,
  categorizeSubject,
  formatSubject
} = require('./lib/changelog');
const {
  loadConfig,
  resolveChangelogPath,
  buildTagListCommand
} = require('./lib/config');

const FIELD_SEPARATOR = '\x1f';

function getRepoRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return process.cwd();
  }
}

const REPO_ROOT = getRepoRoot();
const config = loadConfig(REPO_ROOT);
const CATEGORY_ORDER = getCategoryOrder(config);
const CATEGORY_LABELS = getCategoryLabels(config);
const CHANGELOG_PATH = resolveChangelogPath(REPO_ROOT, config);
const HISTORY_HEADING = config.headings.history;
const HISTORY_PLACEHOLDER = `${config.placeholders.history}\n\n`;

function run(cmd) {
  return execSync(cmd, { encoding: 'utf-8', cwd: REPO_ROOT }).trim();
}

function getTags() {
  try {
    const output = run(buildTagListCommand(config));
    return output.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getTagDate(tag) {
  try {
    const output = run(
      `git for-each-ref --format="%(creatordate:short)" "refs/tags/${tag}"`
    );
    const date = output.split('\n').filter(Boolean)[0];
    return date || null;
  } catch {
    return null;
  }
}

function getCommitsUntilTag(tag) {
  try {
    const cmd = `git log ${tag} --pretty=format:"%h%x1f%s%x1f%an%x1f%ae%x1f%ad" --date=short`;
    return run(cmd).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getCommitsBetweenTags(fromTag, toTag) {
  try {
    const cmd = `git log ${fromTag}..${toTag} --pretty=format:"%h%x1f%s%x1f%an%x1f%ae%x1f%ad" --date=short`;
    return run(cmd).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function parseCommit(line) {
  const [hash, subject, author, email, date] = line.split(FIELD_SEPARATOR);
  return { hash, subject, author, email, date };
}

function formatDate(date) {
  if (!date) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.valueOf())) return date;
  return parsed.toISOString().slice(0, 10);
}

function generateEntry(version, commits, releaseDate) {
  if (!commits.length) return '';

  const date = releaseDate || formatDate(commits[0].date);
  let entry = `## [${version}] - ${date}\n\n`;

  const categories = {};

  commits.forEach(commit => {
    const category = categorizeSubject(commit.subject);
    categories[category] ??= [];
    categories[category].push(commit);
  });

  CATEGORY_ORDER.forEach(category => {
    if (!categories[category]) return;

    const label = CATEGORY_LABELS[category] || category;
    entry += `### ${label}\n\n`;
    categories[category].forEach(c => {
      const subject = formatSubject(c.subject);
      entry += `- ${subject} - ${c.author}\n`;
    });
    entry += '\n';
  });

  return entry;
}

function generateChangelog() {
  const tags = getTags();

  let content = `# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).

${HISTORY_HEADING}

`;

  if (!tags.length) {
    fs.writeFileSync(CHANGELOG_PATH, (content + HISTORY_PLACEHOLDER).trimEnd());
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
    const releaseDate = getTagDate(current);
    const entry = generateEntry(current.replace(/^v/, ''), commits, releaseDate);

    content += entry;
  }

  fs.writeFileSync(CHANGELOG_PATH, content.trimEnd());
  console.log('CHANGELOG.md gerado com sucesso.');
}

generateChangelog();