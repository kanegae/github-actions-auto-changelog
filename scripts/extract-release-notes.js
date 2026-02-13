#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
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
const RELEASE_NOTES_PATH = path.join(REPO_ROOT, 'RELEASE_NOTES.md');
const NO_CHANGES_LABEL = config.labels.noChanges;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || !process.argv[idx + 1]) return null;
  return process.argv[idx + 1];
}

function getVersion() {
  const argVersion = getArgValue('--version');
  if (argVersion) return argVersion.replace(/^v/, '');

  const envVersion = process.env.RELEASE_VERSION;
  if (envVersion) return envVersion.replace(/^v/, '');

  const refName = process.env.GITHUB_REF_NAME || '';
  if (refName) return refName.replace(/^v/, '');

  return null;
}

function getDate() {
  const argDate = getArgValue('--date');
  if (argDate) return argDate;
  const envDate = process.env.RELEASE_DATE;
  if (envDate) return envDate;
  return new Date().toISOString().slice(0, 10);
}

function extractSection(content, version) {
  const headerRegex = new RegExp(
    `^## \\[${escapeRegExp(version)}\\] - .*`,
    'm'
  );
  const headerMatch = content.match(headerRegex);
  if (!headerMatch) return null;

  const headerIndex = content.indexOf(headerMatch[0]);
  const afterHeader = headerIndex + headerMatch[0].length;
  const rest = content.slice(afterHeader);
  const nextHeaderMatch = rest.match(/\n## \[/);
  const endIndex = nextHeaderMatch
    ? afterHeader + nextHeaderMatch.index
    : content.length;

  return content.slice(headerIndex, endIndex).trimEnd();
}

function extractReleaseNotes() {
  if (!fs.existsSync(CHANGELOG_PATH)) {
    console.error('CHANGELOG.md não encontrado.');
    process.exit(1);
  }

  const version = getVersion();
  if (!version) {
    console.error('Versão não informada. Use --version, RELEASE_VERSION ou GITHUB_REF_NAME.');
    process.exit(1);
  }

  const content = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  const section = extractSection(content, version);

  if (!section) {
    const date = getDate();
    const fallback = `## [${version}] - ${date}\n\n- ${NO_CHANGES_LABEL}\n`;
    fs.writeFileSync(RELEASE_NOTES_PATH, fallback);
    console.log(
      `Aviso: seção da versão ${version} não encontrada no CHANGELOG.md. RELEASE_NOTES.md gerado com fallback.`
    );
    return;
  }

  fs.writeFileSync(RELEASE_NOTES_PATH, `${section}\n`);
  console.log('RELEASE_NOTES.md gerado com sucesso.');
}

extractReleaseNotes();