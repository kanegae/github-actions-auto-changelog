#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const CHANGELOG_PATH = path.join(process.cwd(), 'CHANGELOG.md');
const CATEGORY_ORDER = [
  'Added',
  'Fixed',
  'Changed',
  'Deprecated',
  'Removed',
  'Security'
];

const DEFAULT_HEADER =
  '# Changelog\n\n' +
  'Todas as mudancas notáveis neste projeto serão documentadas neste arquivo.\n' +
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
  if (/^feat(\(.+\))?:/.test(s)) return 'Added';
  if (/^fix(\(.+\))?:/.test(s)) return 'Fixed';
  if (/^security(\(.+\))?:/.test(s)) return 'Security';
  if (
    /^(perf|refactor|style|docs|test|chore|revert)(\(.+\))?:/.test(s)
  ) {
    return 'Changed';
  }
  return 'Changed';
}

function buildUnreleasedSection(categories) {
  let section = '## [Unreleased]\n';

  CATEGORY_ORDER.forEach(category => {
    section += `### ${category}\n`;
    const items = categories[category] || [];

    if (items.length) {
      items.forEach(c => {
        section += `- ${c.subject} (${c.hash}) - ${c.author}\n`;
      });
    } else {
      section += '-\n';
    }

    section += '\n';
  });

  section += '---\n';
  return section;
}

function loadChangelog() {
  if (!fs.existsSync(CHANGELOG_PATH)) {
    return DEFAULT_HEADER + buildUnreleasedSection({});
  }

  const content = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  return content.trim() ? content : DEFAULT_HEADER + buildUnreleasedSection({});
}

function insertUnreleasedIfMissing(content, section) {
  if (content.includes('## [Unreleased]')) return content;

  const introMatch = content.match(/# Changelog[\s\S]*?O formato.*\n\n/);

  if (introMatch) {
    const idx = introMatch[0].length;
    return content.slice(0, idx) + section + '\n' + content.slice(idx);
  }

  return section + '\n' + content;
}

function replaceUnreleased(content, section) {
  const unreleasedRegex = /## \[Unreleased\][\s\S]*?^---\s*$/m;
  if (unreleasedRegex.test(content)) {
    return content.replace(unreleasedRegex, section.trimEnd());
  }

  return insertUnreleasedIfMissing(content, section);
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

  fs.writeFileSync(CHANGELOG_PATH, updated.trimEnd() + '\n');
  console.log('✓ CHANGELOG.md (Unreleased) atualizado com sucesso');
}

updateUnreleased();