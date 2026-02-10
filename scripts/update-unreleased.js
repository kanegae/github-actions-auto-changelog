#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const CHANGELOG_PATH = path.join(process.cwd(), 'CHANGELOG.md');
const CATEGORY_ORDER = [
  'Adicionado',
  'Corrigido',
  'Documentação',
  'Estilo',
  'Refatoração',
  'Desempenho',
  'Testes',
  'Manutenção'
];

const DEFAULT_HEADER =
  '# Changelog\n\n' +
  'Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.\n' +
  'O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).\n\n';

const FIELD_SEPARATOR = '\x1f';
const HISTORY_HEADING = '## [Histórico]';
const HISTORY_PLACEHOLDER = 'Sem versões publicadas\n\n';
const NO_CHANGES_LABEL = 'Sem mudanças';
const UNRELEASED_HEADING = '## [Não publicado]';
const INTRO_SECTION_REGEX = /# Changelog[\s\S]*?O formato.*\n\n/;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

function getCommitsSinceTag(tag) {
  try {
    const range = tag ? `${tag}..HEAD` : 'HEAD';
    const cmd = `git log ${range} --pretty=format:"%h%x1f%s%x1f%an%x1f%ae%x1f%ad" --date=short`;
    return run(cmd).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function parseCommit(line) {
  const [hash, subject, author, email, date] = line.split(FIELD_SEPARATOR);
  return { hash, subject, author, email, date };
}

function categorizeTitle(subject) {
  const s = subject.toLowerCase();
  if (/^feat(\(.+\))?!?:/.test(s)) return 'Adicionado';
  if (/^fix(\(.+\))?!?:/.test(s)) return 'Corrigido';
  if (/^docs(\(.+\))?!?:/.test(s)) return 'Documentação';
  if (/^style(\(.+\))?!?:/.test(s)) return 'Estilo';
  if (/^refactor(\(.+\))?!?:/.test(s)) return 'Refatoração';
  if (/^perf(\(.+\))?!?:/.test(s)) return 'Desempenho';
  if (/^test(\(.+\))?!?:/.test(s)) return 'Testes';
  if (/^(chore|build|ci|revert)(\(.+\))?!?:/.test(s)) return 'Manutenção';
  return 'Manutenção';
}

function formatSubject(subject) {
  const cleaned = subject.replace(/^[a-z]+(\([^)]+\))?!?:\s*/i, '');
  const updateRelease = cleaned.match(/^update changelog for (.+)$/i);
  if (updateRelease) {
    return normalizeRefs(`Atualização do changelog para ${updateRelease[1]}`);
  }
  if (/^update unreleased changelog$/i.test(cleaned)) {
    return normalizeRefs('Atualização da seção "Não publicado" do changelog');
  }
  if (!cleaned) return cleaned;
  const normalized = cleaned[0].toUpperCase() + cleaned.slice(1);
  return normalizeRefs(normalized);
}

function normalizeRefs(text) {
  return text
    .replace(/refs\/tags\/([^\s]+)/g, '$1')
    .replace(/refs\/heads\/([^\s]+)/g, '$1');
}

function formatEntry(subject, author) {
  const title = formatSubject(subject);
  if (!title) return '';
  if (author) return `${title} - ${author}`;
  return title;
}

function buildUnreleasedSection(categories) {
  let section = `${UNRELEASED_HEADING}\n\n`;

  CATEGORY_ORDER.forEach(category => {
    section += `### ${category}\n\n`;
    const items = categories[category] || [];

    if (items.length) {
      items.forEach(item => {
        section += `- ${item}\n`;
      });
    } else {
      section += `- ${NO_CHANGES_LABEL}\n`;
    }

    section += '\n';
  });

  section += '---\n\n';
  return section;
}

function loadChangelog() {
  if (!fs.existsSync(CHANGELOG_PATH)) {
    return DEFAULT_HEADER + buildUnreleasedSection({});
  }

  const content = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  return content.trim() ? content : DEFAULT_HEADER + buildUnreleasedSection({});
}

function parseUnreleasedSection(body) {
  const lines = body.split('\n');
  const categories = {};
  let current = null;

  lines.forEach(line => {
    const heading = line.match(/^###\s+(.*)$/);
    if (heading) {
      current = heading[1].trim();
      categories[current] ??= [];
      return;
    }

    if (!current) return;

    const item = line.match(/^- (.*)$/);
    if (!item) return;

    const text = item[1].trim();
    if (!text) return;
    if (text === NO_CHANGES_LABEL) return;

    categories[current].push(text);
  });

  return categories;
}

function getPullRequestInfo() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return null;

  try {
    const payload = JSON.parse(fs.readFileSync(eventPath, 'utf-8'));
    if (!payload.pull_request) return null;

    if (payload.pull_request.merged === false) return null;

    const title = payload.pull_request.title?.trim();
    if (!title) return null;

    const author = payload.pull_request.user?.login || '';

    return { title, author };
  } catch {
    return null;
  }
}

function getUnreleasedCategories(content) {
  const unreleasedRegex = new RegExp(
    `${escapeRegExp(UNRELEASED_HEADING)}\\n([\\s\\S]*?)\\n---`
  );
  const match = content.match(unreleasedRegex);
  if (!match) return {};
  return parseUnreleasedSection(match[1]);
}

function insertUnreleasedIfMissing(content, section) {
  if (content.includes(UNRELEASED_HEADING)) return content;

  const introMatch = content.match(INTRO_SECTION_REGEX);
  const baseContent = introMatch
    ? content.slice(0, introMatch[0].length) + section + content.slice(introMatch[0].length)
    : section + content;

  return ensureHistoryHeading(baseContent);
}

function replaceUnreleased(content, section) {
  const unreleasedRegex = new RegExp(
    `${escapeRegExp(UNRELEASED_HEADING)}[\\s\\S]*?^---\\s*$\\n*`,
    'm'
  );
  if (unreleasedRegex.test(content)) {
    const withHistory = ensureHistoryHeading(content);
    return withHistory.replace(unreleasedRegex, section.trimEnd() + '\n\n');
  }

  return insertUnreleasedIfMissing(content, section);
}

function ensureHistoryHeading(content) {
  let updated = content;
  if (!updated.includes(HISTORY_HEADING)) {
    updated = updated.replace(/---\n\n/, `---\n\n${HISTORY_HEADING}\n\n`);
  }
  return ensureHistoryPlaceholder(updated);
}

function ensureHistoryPlaceholder(content) {
  const historyHeading = `${HISTORY_HEADING}\n\n`;
  const historyIndex = content.indexOf(historyHeading);
  if (historyIndex === -1) return content;

  const body = content.slice(historyIndex + historyHeading.length).trim();
  if (!body) {
    return content.replace(
      historyHeading,
      `${historyHeading}${HISTORY_PLACEHOLDER}`
    );
  }
  if (body === HISTORY_PLACEHOLDER.trim()) return content;
  return content;
}

function updateUnreleased() {
  const content = loadChangelog();
  const pullRequest = getPullRequestInfo();

  if (pullRequest) {
    const categories = getUnreleasedCategories(content);
    const category = categorizeTitle(pullRequest.title);
    categories[category] ??= [];

    const entry = formatEntry(pullRequest.title, pullRequest.author);
    if (entry && !categories[category].includes(entry)) {
      categories[category].unshift(entry);
    }

    const newSection = buildUnreleasedSection(categories);
    const updated = replaceUnreleased(content, newSection);
    fs.writeFileSync(CHANGELOG_PATH, updated.trimEnd());
    console.log('Seção "Não publicado" do changelog foi atualizada com título do PR.');
    return;
  }

  const tags = getTags();
  const latestTag = tags[0];
  const rawCommits = getCommitsSinceTag(latestTag);
  const commits = rawCommits.map(parseCommit);

  const categories = {};
  commits.forEach(commit => {
    const category = categorizeTitle(commit.subject);
    categories[category] ??= [];
    const entry = formatEntry(commit.subject, commit.author);
    if (entry) categories[category].push(entry);
  });

  const newSection = buildUnreleasedSection(categories);
  const updated = replaceUnreleased(content, newSection);

  fs.writeFileSync(CHANGELOG_PATH, updated.trimEnd());
  console.log('Seção "Não publicado" do changelog foi atualizada com sucesso.');
}

updateUnreleased();