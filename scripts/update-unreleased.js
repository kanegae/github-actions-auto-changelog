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

function getRepoRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return process.cwd();
  }
}

const REPO_ROOT = getRepoRoot();
const config = loadConfig(REPO_ROOT);
const CHANGELOG_PATH = resolveChangelogPath(REPO_ROOT, config);
const CATEGORY_ORDER = getCategoryOrder(config);
const CATEGORY_LABELS = getCategoryLabels(config);

const DEFAULT_HEADER =
  '# Changelog\n\n' +
  'Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.\n' +
  'O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).\n\n';

const FIELD_SEPARATOR = '\x1f';
const HISTORY_HEADING = config.headings.history;
const HISTORY_PLACEHOLDER = config.placeholders.history;
const NO_CHANGES_LABEL = config.labels.noChanges;
const UNRELEASED_HEADING = config.headings.unreleased;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

function getCommitsSinceTag(tag) {
  try {
    const range = tag ? `${tag}..HEAD` : 'HEAD';
    const cmd = `git log ${range} --no-merges --pretty=format:"%h%x1f%s%x1f%an%x1f%ae%x1f%ad" --date=short`;
    return run(cmd).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function parseCommit(line) {
  const [hash, subject, author, email, date] = line.split(FIELD_SEPARATOR);
  return { hash, subject, author, email, date };
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
    const label = CATEGORY_LABELS[category] || category;
    section += `### ${label}\n\n`;
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
  const labelToKey = {};
  CATEGORY_ORDER.forEach(key => {
    const label = CATEGORY_LABELS[key] || key;
    if (!labelToKey[label]) labelToKey[label] = key;
  });
  let current = null;

  lines.forEach(line => {
    const heading = line.match(/^###\s+(.*)$/);
    if (heading) {
      const label = heading[1].trim();
      current = labelToKey[label] || label;
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

function findFirstSectionIndex(content) {
  const match = content.match(/^##\s+/m);
  return match ? match.index : -1;
}

function insertUnreleasedIfMissing(content, section) {
  if (content.includes(UNRELEASED_HEADING)) return content;

  const idx = findFirstSectionIndex(content);
  if (idx === -1) {
    const trimmed = content.trimEnd();
    return ensureHistoryHeading(`${trimmed}\n\n${section}`);
  }

  const before = content.slice(0, idx);
  const after = content.slice(idx);
  const prefix = before.endsWith('\n') ? before : `${before}\n`;

  return ensureHistoryHeading(prefix + section + after);
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
  if (content.includes(HISTORY_HEADING)) {
    return ensureHistoryPlaceholder(content);
  }

  const separatorRegex = /---\r?\n\r?\n/;
  if (separatorRegex.test(content)) {
    const updated = content.replace(
      separatorRegex,
      `---\n\n${HISTORY_HEADING}\n\n`
    );
    return ensureHistoryPlaceholder(updated);
  }

  if (content.includes(UNRELEASED_HEADING)) {
    const updated = `${content.trimEnd()}\n\n${HISTORY_HEADING}\n\n`;
    return ensureHistoryPlaceholder(updated);
  }

  const idx = findFirstSectionIndex(content);
  if (idx !== -1) {
    const before = content.slice(0, idx).trimEnd();
    const after = content.slice(idx).trimStart();
    const updated = `${before}\n\n${HISTORY_HEADING}\n\n${after}`;
    return ensureHistoryPlaceholder(updated);
  }

  return ensureHistoryPlaceholder(`${content.trimEnd()}\n\n${HISTORY_HEADING}\n\n`);
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
    const category = categorizeSubject(pullRequest.title);
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
    const category = categorizeSubject(commit.subject);
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