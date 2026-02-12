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
const HISTORY_PLACEHOLDER = 'Sem versões publicadas';
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

function buildUnreleasedSection(categories, options = {}) {
  const includeSeparator = options.includeSeparator ?? true;
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

  if (includeSeparator) {
    section += '---\n\n';
  }
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

function getUnreleasedBody(content) {
  const withSeparator = new RegExp(
    `${escapeRegExp(UNRELEASED_HEADING)}\\r?\\n([\\s\\S]*?)\\r?\\n---\\s*(?:\\r?\\n|$)`
  );
  const matchSeparator = content.match(withSeparator);
  if (matchSeparator) return matchSeparator[1];

  const beforeHistory = new RegExp(
    `${escapeRegExp(UNRELEASED_HEADING)}\\r?\\n([\\s\\S]*?)(?=\\r?\\n${escapeRegExp(
      HISTORY_HEADING
    )})`
  );
  const matchHistory = content.match(beforeHistory);
  if (matchHistory) return matchHistory[1];

  const toEnd = new RegExp(
    `${escapeRegExp(UNRELEASED_HEADING)}\\r?\\n([\\s\\S]*)$`
  );
  const matchEnd = content.match(toEnd);
  if (matchEnd) return matchEnd[1];

  return null;
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
  const body = getUnreleasedBody(content);
  if (!body) return {};
  return parseUnreleasedSection(body);
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
  const withHistory = ensureHistoryHeading(content);
  const unreleasedWithSeparatorRegex = new RegExp(
    `${escapeRegExp(UNRELEASED_HEADING)}[\\s\\S]*?\\r?\\n---\\s*(?:\\r?\\n)*`
  );
  if (unreleasedWithSeparatorRegex.test(withHistory)) {
    return withHistory.replace(
      unreleasedWithSeparatorRegex,
      section.trimEnd() + '\n\n'
    );
  }

  const unreleasedBeforeHistoryRegex = new RegExp(
    `${escapeRegExp(UNRELEASED_HEADING)}[\\s\\S]*?\\r?\\n(?:\\r?\\n)*(?=${escapeRegExp(
      HISTORY_HEADING
    )})`
  );
  if (unreleasedBeforeHistoryRegex.test(withHistory)) {
    return withHistory.replace(
      unreleasedBeforeHistoryRegex,
      section.trimEnd() + '\n\n'
    );
  }

  const unreleasedToEndRegex = new RegExp(
    `${escapeRegExp(UNRELEASED_HEADING)}[\\s\\S]*$`
  );
  if (unreleasedToEndRegex.test(withHistory)) {
    return withHistory.replace(unreleasedToEndRegex, section.trimEnd());
  }

  return insertUnreleasedIfMissing(withHistory, section);
}

function ensureHistoryHeading(content) {
  let updated = content;
  if (!updated.includes(HISTORY_HEADING)) {
    updated = updated.replace(/---\r?\n\r?\n/, `---\n\n${HISTORY_HEADING}\n\n`);
  }
  return ensureHistoryPlaceholder(updated);
}

function ensureHistoryPlaceholder(content) {
  const historyHeadingRegex = new RegExp(
    `^${escapeRegExp(HISTORY_HEADING)}\\r?\\n(?:\\r?\\n)*`,
    'm'
  );
  const match = content.match(historyHeadingRegex);
  if (!match) return content;

  const startIndex = match.index + match[0].length;
  const body = content.slice(startIndex).trim();
  if (!body) {
    return (
      content.slice(0, startIndex) +
      HISTORY_PLACEHOLDER +
      '\n\n' +
      content.slice(startIndex)
    );
  }
  if (body === HISTORY_PLACEHOLDER.trim()) return content;
  return content;
}

function hasReleaseSections(content) {
  const releaseHeadingRegex = /^## \[(?!Não publicado\]|Histórico\])[^\]]+\]/m;
  return releaseHeadingRegex.test(content);
}

function stripHistoryIfNoReleases(content) {
  if (!content.includes(HISTORY_HEADING)) return content;
  if (hasReleaseSections(content)) return content;

  const historyBlockRegex = new RegExp(
    `\\r?\\n*(?:---\\s*\\r?\\n(?:\\r?\\n)*)?${escapeRegExp(
      HISTORY_HEADING
    )}[\\s\\S]*$`
  );
  return content.replace(historyBlockRegex, '').trimEnd();
}

function updateUnreleased() {
  const content = loadChangelog();
  const pullRequest = getPullRequestInfo();
  const hasReleases = hasReleaseSections(content);

  if (pullRequest) {
    const categories = getUnreleasedCategories(content);
    const category = categorizeTitle(pullRequest.title);
    categories[category] ??= [];

    const entry = formatEntry(pullRequest.title, pullRequest.author);
    if (entry && !categories[category].includes(entry)) {
      categories[category].unshift(entry);
    }

    const newSection = buildUnreleasedSection(categories, {
      includeSeparator: hasReleases
    });
    const updated = stripHistoryIfNoReleases(
      replaceUnreleased(content, newSection)
    );
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

  const newSection = buildUnreleasedSection(categories, {
    includeSeparator: hasReleases
  });
  const updated = stripHistoryIfNoReleases(
    replaceUnreleased(content, newSection)
  );

  fs.writeFileSync(CHANGELOG_PATH, updated.trimEnd());
  console.log('Seção "Não publicado" do changelog foi atualizada com sucesso.');
}

updateUnreleased();