function getCategoryOrder(config) {
  if (!config || !Array.isArray(config.categoryOrder) || !config.categoryOrder.length) {
    throw new Error('Configuração inválida: categoryOrder deve ser um array não vazio.');
  }

  return config.categoryOrder.filter(Boolean);
}

function getCategoryLabels(config) {
  if (!config || !config.categoryLabels || typeof config.categoryLabels !== 'object') {
    throw new Error('Configuração inválida: categoryLabels deve ser um objeto.');
  }

  return { ...config.categoryLabels };
}

function categorizeSubject(subject) {
  const s = subject.toLowerCase();
  if (/^feat(\(.+\))?!?:/.test(s)) return 'feat';
  if (/^fix(\(.+\))?!?:/.test(s)) return 'fix';
  if (/^docs(\(.+\))?!?:/.test(s)) return 'docs';
  if (/^style(\(.+\))?!?:/.test(s)) return 'style';
  if (/^refactor(\(.+\))?!?:/.test(s)) return 'refactor';
  if (/^perf(\(.+\))?!?:/.test(s)) return 'perf';
  if (/^test(\(.+\))?!?:/.test(s)) return 'test';
  if (/^(chore|build|ci|revert)(\(.+\))?!?:/.test(s)) return 'chore';
  return 'chore';
}

function normalizeRefs(text) {
  return text
    .replace(/refs\/tags\/([^\s]+)/g, '$1')
    .replace(/refs\/heads\/([^\s]+)/g, '$1');
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

module.exports = {
  getCategoryOrder,
  getCategoryLabels,
  categorizeSubject,
  formatSubject,
  normalizeRefs
};