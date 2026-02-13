#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const { getCategoryOrder, getCategoryLabels } = require('./lib/changelog');
const { loadConfig, resolveChangelogPath } = require('./lib/config');

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
const HISTORY_HEADING = config.headings.history;
const HISTORY_PLACEHOLDER = config.placeholders.history;
const UNRELEASED_HEADING = config.headings.unreleased;
const NO_CHANGES_LABEL = config.labels.noChanges;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeHistoryPlaceholder(content) {
  const placeholderRegex = new RegExp(
    `^${escapeRegExp(HISTORY_HEADING)}\\r?\\n(?:\\r?\\n)*${escapeRegExp(
      HISTORY_PLACEHOLDER
    )}(?:\\r?\\n)*`,
    'm'
  );
  return content.replace(placeholderRegex, `${HISTORY_HEADING}\n\n`);
}

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || !process.argv[idx + 1]) return null;
  return process.argv[idx + 1];
}

function getVersion() {
  const argVersion = getArgValue('--version');
  if (argVersion) return argVersion;
  const refName = process.env.GITHUB_REF_NAME || '';
  return refName.replace(/^v/, '');
}

function getDate() {
  const argDate = getArgValue('--date');
  if (argDate) return argDate;
  return new Date().toISOString().slice(0, 10);
}

function getReleaseNotesPath() {
  const argPath = getArgValue('--release-notes');
  if (argPath) return argPath;
  if (process.env.RELEASE_NOTES_PATH) return process.env.RELEASE_NOTES_PATH;
  return null;
}

function resolveOutputPath(outputPath) {
  if (!outputPath) return null;
  return path.isAbsolute(outputPath)
    ? outputPath
    : path.join(process.cwd(), outputPath);
}

function writeReleaseNotes(section, version, date, outputPath) {
  if (!outputPath) return;
  const resolvedPath = resolveOutputPath(outputPath);
  const notes = section
    ? section.trimEnd()
    : `## [${version}] - ${date}\n\n- ${NO_CHANGES_LABEL}\n`;
  fs.writeFileSync(resolvedPath, notes.trimEnd());
}

function parseUnreleased(body) {
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

function removeUnreleasedSection(content) {
  const withSeparator = new RegExp(
    `${escapeRegExp(UNRELEASED_HEADING)}[\\s\\S]*?\\r?\\n---\\s*(?:\\r?\\n)*`
  );
  if (withSeparator.test(content)) {
    return content.replace(withSeparator, '');
  }

  const beforeHistory = new RegExp(
    `${escapeRegExp(UNRELEASED_HEADING)}[\\s\\S]*?\\r?\\n(?:\\r?\\n)*(?=${escapeRegExp(
      HISTORY_HEADING
    )})`
  );
  if (beforeHistory.test(content)) {
    return content.replace(beforeHistory, '');
  }

  const toEnd = new RegExp(
    `${escapeRegExp(UNRELEASED_HEADING)}[\\s\\S]*$`
  );
  return content.replace(toEnd, '');
}

function buildReleaseSection(version, date, categories) {
  let section = `## [${version}] - ${date}\n`;
  let hasAny = false;

  CATEGORY_ORDER.forEach(category => {
    const items = categories[category] || [];
    if (!items.length) return;
    hasAny = true;
    const label = CATEGORY_LABELS[category] || category;
    section += `### ${label}\n`;
    items.forEach(item => {
      section += `- ${item}\n`;
    });
    section += '\n';
  });

  return hasAny ? section.trimEnd() : '';
}

function promoteRelease() {
  if (!fs.existsSync(CHANGELOG_PATH)) {
    console.error('CHANGELOG.md não encontrado.');
    process.exit(1);
  }

  const version = getVersion();
  if (!version) {
    console.error('Versão não informada. Use --version ou GITHUB_REF_NAME.');
    process.exit(1);
  }

  const date = getDate();
  const releaseNotesPath = getReleaseNotesPath();
  const content = fs.readFileSync(CHANGELOG_PATH, 'utf-8');

  const body = getUnreleasedBody(content);
  if (!body) {
    console.error('Sessão "Não publicado" não encontrada no CHANGELOG.md.');
    process.exit(1);
  }

  const categories = parseUnreleased(body);
  const releaseSection = buildReleaseSection(version, date, categories);
  writeReleaseNotes(releaseSection, version, date, releaseNotesPath);

  let updated = removeUnreleasedSection(content);
  updated = ensureHistoryHeading(updated);

  if (!releaseSection) {
    fs.writeFileSync(CHANGELOG_PATH, updated.trimEnd());
    console.log('Sem entradas em "Não publicado". Seção removida do CHANGELOG.md.');
    return;
  }

  const sanitizedHistory = removeHistoryPlaceholder(updated);
  updated = sanitizedHistory;

  const historyInsertRegex = new RegExp(
    `${escapeRegExp(HISTORY_HEADING)}\\r?\\n(?:\\r?\\n)*`
  );
  if (historyInsertRegex.test(updated)) {
    updated = updated.replace(
      historyInsertRegex,
      `${HISTORY_HEADING}\n\n${releaseSection}\n`
    );
  } else {
    updated = updated.replace(
      HISTORY_HEADING,
      `${HISTORY_HEADING}\n\n${releaseSection}\n`
    );
  }

  fs.writeFileSync(CHANGELOG_PATH, updated.trimEnd());
  console.log(`Release ${version} promovida no CHANGELOG.md`);
}

function ensureHistoryHeading(content) {
  if (content.includes(HISTORY_HEADING)) return content;

  const separatorRegex = /---\r?\n\r?\n/;
  if (separatorRegex.test(content)) {
    return content.replace(
      separatorRegex,
      `---\n\n${HISTORY_HEADING}\n\n`
    );
  }

  const match = content.match(/^##\s+/m);
  if (match) {
    const before = content.slice(0, match.index).trimEnd();
    const after = content.slice(match.index).trimStart();
    return `${before}\n\n${HISTORY_HEADING}\n\n${after}`;
  }

  return `${content.trimEnd()}\n\n${HISTORY_HEADING}\n\n`;
}

promoteRelease();