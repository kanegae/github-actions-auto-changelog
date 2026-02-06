# github-actions-auto-changelog

Prova de conceito para validar o uso de GitHub Actions na geração automática de changelog.

## Objetivo

Validar um workflow que mantenha o `CHANGELOG.md` atualizado a partir do histórico Git, com uma
sessão `Unreleased` em merges e promoção para versão em tags ou releases.

## Como funciona

### Componentes principais

1. **Workflow de Unreleased** (`.github/workflows/unreleased.yml`)
   - Dispara em push nas branches principais
   - Atualiza apenas a sessão `Unreleased`
   - Faz commit e push das mudanças automaticamente

2. **Workflow de Release** (`.github/workflows/changelog.yml`)
   - Dispara quando uma tag `v*` é criada
   - Promove o conteúdo de `Unreleased` para uma versão com data
   - Faz commit e push das mudanças automaticamente

3. **Scripts de changelog**
   - `scripts/update-unreleased.js`: atualiza a sessão `Unreleased`
   - `scripts/promote-release.js`: promove `Unreleased` para versão
   - `scripts/generate-changelog.js`: gera o changelog completo (uso manual)

4. **CHANGELOG.md**
   - Armazena o histórico de mudanças
   - Mantém `Unreleased` no topo
   - Segue o padrão Keep a Changelog

## Requisitos

- Node.js 16+
- Git

## Uso local

```bash
npm install
npm run changelog:unreleased
```

### Gerar release localmente (opcional)

```bash
npm run changelog:release -- --version 1.0.0 --date 2026-02-04
```

### Gerar changelog completo (opcional)

```bash
npm run changelog
```

## Uso via GitHub Actions

1. Merge na branch principal atualiza `Unreleased` automaticamente.

2. Crie uma tag para promover o release:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. Ou publique um release no GitHub:
   - Acesse a página de releases do repositório
   - Clique em "Create a new release"
   - Selecione ou crie uma tag
   - Publique o release

4. O workflow promove `Unreleased` para a nova versão e faz commit/push.

## Convenção de commits

O script reconhece e categoriza commits usando Conventional Commits:

- `feat:` → Features
- `fix:` → Bug Fixes
- `docs:` → Documentation
- `style:` → Styles
- `refactor:` → Refactoring
- `perf:` → Performance
- `test:` → Tests
- `chore:` → Chores

Exemplos:
```
feat(auth): adicionar suporte a OAuth2
fix(api): corrigir erro de validação
docs: atualizar instruções de instalação
```

## Estrutura de arquivos

```
.
├── .github/
│   └── workflows/
│       ├── changelog.yml          # Workflow de release
│       └── unreleased.yml         # Workflow de Unreleased
├── scripts/
│   ├── generate-changelog.js      # Script de geração de changelog
│   ├── update-unreleased.js       # Atualiza a seção Unreleased
│   ├── promote-release.js         # Promove Unreleased para release
│   └── test-changelog.js          # Script de testes
├── CHANGELOG.md                   # Arquivo de changelog
├── package.json                   # Configuração Node.js
└── README.md                      # Este arquivo
```

## Características

- ✅ Automação completa via GitHub Actions
- ✅ Segue padrões de Conventional Commits
- ✅ Categoriza commits automaticamente
- ✅ Suporta múltiplas versões (tags)
- ✅ Execução local e remota
- ✅ Sem dependências externas complexas

## Mais informações

- [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/)
- [Semantic Versioning](https://semver.org/lang/pt-BR/)
- [Keep a Changelog](https://keepachangelog.com/pt-BR/)
- [GitHub Actions](https://docs.github.com/pt/actions)