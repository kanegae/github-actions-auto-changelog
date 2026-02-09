#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CHANGELOG_PATH = path.join(process.cwd(), 'CHANGELOG.md');
const CATEGORY_ORDER = [
  'Adicionado',
  'Corrigido',
  'Documentação',
  'Alterado',
  'Descontinuado',
  'Removido',
  'Segurança'
];
const HISTORY_HEADING = '## [Histórico]';
const LEGACY_HISTORY_HEADING = '## Lançamentos';

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

function buildUnreleasedSection() {
  let section = '## [Não publicado]\n\n';

  CATEGORY_ORDER.forEach(category => {
    section += `### ${category}\n\n`;
    section += '- Sem mudanças\n\n';
  });

  section += '---\n\n';
  return section;
}

function parseUnreleased(body) {
  const lines = body.split('\n');
  const categories = {};
  let current = null;

  lines.forEach(line => {
    const heading = line.match(/^###\s+(.*)$/);
    if (heading) {
      current = heading[1];
      categories[current] ??= [];
      return;
    }

    if (!current) return;

    const item = line.match(/^- (.*)$/);
    if (!item) return;

    const text = item[1].trim();
    if (!text) return;
    if (text === 'Sem mudanças') return;

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

  const match = content.match(/## \[Não publicado\]\n([\s\S]*?)\n---/);
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

  const newUnreleased = buildUnreleasedSection();
  const updated = ensureHistoryHeading(content).replace(
    /## \[Não publicado\][\s\S]*?^---\s*$\n*/m,
    newUnreleased.trimEnd() + '\n\n' + releaseSection + '\n'
  );

  fs.writeFileSync(CHANGELOG_PATH, updated.trimEnd());
  console.log(`Release ${version} promovida no CHANGELOG.md`);
}

function ensureHistoryHeading(content) {
  if (content.includes(HISTORY_HEADING)) return content;
  if (content.includes(LEGACY_HISTORY_HEADING)) {
    return content.replace(LEGACY_HISTORY_HEADING, HISTORY_HEADING);
  }
  return content.replace(/---\n\n/, `---\n\n${HISTORY_HEADING}\n\n`);
}

promoteRelease();
