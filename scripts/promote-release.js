#!/usr/bin/env node

const fs = require('fs');
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
const HISTORY_HEADING = '## [Histórico]';
const HISTORY_PLACEHOLDER = 'Sem versões publicadas';
const UNRELEASED_HEADING = '## [Não publicado]';
const NO_CHANGES_LABEL = 'Sem mudanças';

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

function parseUnreleased(body) {
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

function buildReleaseSection(version, date, categories) {
  let section = `## [${version}] - ${date}\n`;
  let hasAny = false;

  CATEGORY_ORDER.forEach(category => {
    const items = categories[category] || [];
    if (!items.length) return;
    hasAny = true;
    section += `### ${category}\n`;
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
  const content = fs.readFileSync(CHANGELOG_PATH, 'utf-8');

  const unreleasedRegex = new RegExp(
    `${escapeRegExp(UNRELEASED_HEADING)}\\n([\\s\\S]*?)\\n---`
  );
  const match = content.match(unreleasedRegex);
  if (!match) {
    console.error('Sessão "Não publicado" não encontrada no CHANGELOG.md.');
    process.exit(1);
  }

  const categories = parseUnreleased(match[1]);
  const releaseSection = buildReleaseSection(version, date, categories);

  if (!releaseSection) {
    console.log('Sem entradas em "Não publicado". Nada para promover.');
    return;
  }

  const withHistory = ensureHistoryHeading(content);
  const sanitizedHistory = removeHistoryPlaceholder(withHistory);
  const unreleasedSectionRegex = new RegExp(
    `${escapeRegExp(UNRELEASED_HEADING)}[\\s\\S]*?^---\\s*$\\r?\\n*`,
    'm'
  );
  let updated = sanitizedHistory.replace(unreleasedSectionRegex, '');

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
  return content.replace(/---\r?\n\r?\n/, `---\n\n${HISTORY_HEADING}\n\n`);
}

promoteRelease();