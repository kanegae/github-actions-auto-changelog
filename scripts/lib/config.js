const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function readJsonStrict(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} não encontrado: ${filePath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new Error(`${label} inválido (${filePath}): ${error.message}`);
  }
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isObject(base)) return override;
  const result = { ...base };

  if (!isObject(override)) return result;

  Object.keys(override).forEach(key => {
    const baseValue = base[key];
    const overrideValue = override[key];

    if (isObject(baseValue) && isObject(overrideValue)) {
      result[key] = deepMerge(baseValue, overrideValue);
      return;
    }

    result[key] = overrideValue;
  });

  return result;
}

function warnConfig(config, label) {
  const warnings = [];

  if (config.categoryOrder && !Array.isArray(config.categoryOrder)) {
    warnings.push('categoryOrder deve ser um array de chaves.');
  } else if (Array.isArray(config.categoryOrder)) {
    const invalidKeys = config.categoryOrder.filter(key => typeof key !== 'string');
    if (invalidKeys.length) {
      warnings.push('categoryOrder contém chaves inválidas (esperado string).');
    }
  }

  if (!config.changelogPath || typeof config.changelogPath !== 'string') {
    warnings.push('changelogPath deve ser uma string.');
  }

  if (
    !config.headings ||
    typeof config.headings !== 'object' ||
    typeof config.headings.unreleased !== 'string' ||
    typeof config.headings.history !== 'string'
  ) {
    warnings.push('headings.unreleased e headings.history devem ser strings.');
  }

  if (
    !config.placeholders ||
    typeof config.placeholders !== 'object' ||
    typeof config.placeholders.history !== 'string'
  ) {
    warnings.push('placeholders.history deve ser string.');
  }

  if (
    !config.labels ||
    typeof config.labels !== 'object' ||
    typeof config.labels.noChanges !== 'string'
  ) {
    warnings.push('labels.noChanges deve ser string.');
  }

  if (
    config.categoryLabels &&
    (typeof config.categoryLabels !== 'object' || Array.isArray(config.categoryLabels))
  ) {
    warnings.push('categoryLabels deve ser um objeto.');
  }

  if (
    config.tags &&
    (typeof config.tags !== 'object' || Array.isArray(config.tags))
  ) {
    warnings.push('tags deve ser um objeto.');
  }

  if (
    !config.tags ||
    typeof config.tags.sort !== 'string' ||
    typeof config.tags.pattern !== 'string' ||
    typeof config.tags.branch !== 'string'
  ) {
    warnings.push('tags.sort, tags.pattern e tags.branch devem ser strings.');
  }

  const labels = config.categoryLabels && typeof config.categoryLabels === 'object'
    ? config.categoryLabels
    : {};
  const order = Array.isArray(config.categoryOrder) ? config.categoryOrder : [];
  const missingLabels = order.filter(key => !labels[key]);
  if (missingLabels.length) {
    warnings.push(
      `categoryLabels não define label para: ${missingLabels.join(', ')}.`
    );
  }

  if (warnings.length) {
    warnings.forEach(message => {
      console.warn(`Aviso (${label}): ${message}`);
    });
  }
}

function loadConfig(repoRoot) {
  const defaultPath = path.join(__dirname, '..', 'changelog-config.json');
  const baseConfig = readJsonStrict(defaultPath, 'Configuração base');
  warnConfig(baseConfig, 'Configuração base');

  if (!repoRoot) return baseConfig;

  const repoPath = path.join(repoRoot, 'changelog-config.json');
  if (!fs.existsSync(repoPath)) return baseConfig;

  let overrideConfig = {};
  try {
    overrideConfig = readJsonStrict(
      repoPath,
      'Configuração do repositório consumidor'
    );
  } catch (error) {
    console.warn(`Aviso: ${error.message}. Usando configuração base.`);
    return baseConfig;
  }

  const mergedConfig = deepMerge(baseConfig, overrideConfig);
  warnConfig(mergedConfig, 'Configuração final');
  return mergedConfig;
}

function resolveChangelogPath(repoRoot, config) {
  const changelogPath = (config && config.changelogPath) || 'CHANGELOG.md';
  if (path.isAbsolute(changelogPath)) return changelogPath;
  return path.join(repoRoot, changelogPath);
}

function resolveTagsBranch(config) {
  return (
    process.env.CHANGELOG_TAGS_BRANCH ||
    process.env.RELEASE_BRANCH ||
    process.env.UNRELEASED_BRANCH ||
    (config && config.tags && config.tags.branch) ||
    'HEAD'
  );
}

function buildTagListCommand(config) {
  const sort = (config && config.tags && config.tags.sort) || '-version:refname';
  const pattern = (config && config.tags && config.tags.pattern) || '*';
  const branch = resolveTagsBranch(config);
  const normalizedPattern =
    typeof pattern === 'string' ? pattern.trim() : String(pattern || '').trim();

  if (branch && branch !== 'HEAD') {
    try {
      execSync(`git show-ref --verify --quiet "refs/heads/${branch}"`, {
        stdio: 'ignore'
      });
    } catch {
      console.warn(
        `Aviso: branch "${branch}" não encontrada localmente para filtro de tags.`
      );
    }
  }

  let cmd = `git tag --sort=${sort}`;
  if (branch) cmd += ` --merged "${branch.replace(/"/g, '\\"')}"`;
  if (normalizedPattern) {
    cmd += ` --list "${normalizedPattern.replace(/"/g, '\\"')}"`;
  }

  return cmd;
}

module.exports = {
  loadConfig,
  resolveChangelogPath,
  resolveTagsBranch,
  buildTagListCommand
};