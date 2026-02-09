#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
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

const DEFAULT_HEADER =
  '# Changelog\n\n' +
  'Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.\n' +
  'O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).\n\n';

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
    const cmd = `git log ${range} --pretty=format:"%h|%s|%an|%ae|%ad" --date=short`;
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
  if (/^feat(\(.+\))?:/.test(s)) return 'Adicionado';
  if (/^fix(\(.+\))?:/.test(s)) return 'Corrigido';
  if (/^docs(\(.+\))?:/.test(s)) return 'Documentação';
  if (/^security(\(.+\))?:/.test(s)) return 'Segurança';
  if (
    /^(perf|refactor|style|test|chore|revert)(\(.+\))?:/.test(s)
  ) {
    return 'Alterado';
  }
  return 'Alterado';
}

function formatSubject(subject) {
  const cleaned = subject.replace(/^[a-z]+(\([^)]+\))?!?:\s*/i, '');
  const updateRelease = cleaned.match(/^update changelog for (.+)$/i);
  if (updateRelease) {
    return normalizeRefs(`Atualizar changelog para ${updateRelease[1]}`);
  }
  if (/^update unreleased changelog$/i.test(cleaned)) {
    return normalizeRefs('Atualização do changelog do "Não publicado"');
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

function buildUnreleasedSection(categories) {
  let section = '## [Não publicado]\n\n';

  CATEGORY_ORDER.forEach(category => {
    section += `### ${category}\n\n`;
    const items = categories[category] || [];

    if (items.length) {
      items.forEach(c => {
        const subject = formatSubject(c.subject);
        section += `- ${subject} - ${c.author}\n`;
      });
    } else {
      section += '- Sem mudanças\n';
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

const HISTORY_HEADING = '## [Histórico]';
const LEGACY_HISTORY_HEADING = '## Lançamentos';

function insertUnreleasedIfMissing(content, section) {
  if (content.includes('## [Não publicado]')) return content;

  const introMatch = content.match(/# Changelog[\s\S]*?O formato.*\n\n/);
  const baseContent = introMatch
    ? content.slice(0, introMatch[0].length) + section + content.slice(introMatch[0].length)
    : section + content;

  return ensureHistoryHeading(baseContent);
}

function replaceUnreleased(content, section) {
  const unreleasedRegex = /## \[Não publicado\][\s\S]*?^---\s*$\n*/m;
  if (unreleasedRegex.test(content)) {
    const withHistory = ensureHistoryHeading(content);
    return withHistory.replace(unreleasedRegex, section.trimEnd() + '\n\n');
  }

  return insertUnreleasedIfMissing(content, section);
}

function ensureHistoryHeading(content) {
  if (content.includes(HISTORY_HEADING)) return content;
  if (content.includes(LEGACY_HISTORY_HEADING)) {
    return content.replace(LEGACY_HISTORY_HEADING, HISTORY_HEADING);
  }
  return content.replace(/---\n\n/, `---\n\n${HISTORY_HEADING}\n\n`);
}

function updateUnreleased() {
  const tags = getTags();
  const latestTag = tags[0];
  const rawCommits = getCommitsSinceTag(latestTag);
  const commits = rawCommits.map(parseCommit);

  const categories = {};
  commits.forEach(commit => {
    const category = categorizeCommit(commit.subject);
    categories[category] ??= [];
    categories[category].push(commit);
  });

  const newSection = buildUnreleasedSection(categories);
  const content = loadChangelog();
  const updated = replaceUnreleased(content, newSection);

  fs.writeFileSync(CHANGELOG_PATH, updated.trimEnd());
  console.log('CHANGELOG.md "Não publicado" atualizado com sucesso.');
}

updateUnreleased();
