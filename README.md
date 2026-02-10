# github-actions-auto-changelog

Prova de conceito para validar o uso de GitHub Actions na geração automática de changelog.

## Objetivo

Validar um workflow com GitHub Actions que mantenha o `CHANGELOG.md` atualizado a partir dos títulos de PRs,
mantendo a seção `"Não publicado"` em merges na branch definida em `UNRELEASED_BRANCH` (ex.: `development`)
e promovendo para versão em releases na branch definida em `RELEASE_BRANCH` (ex.: `master`).

## Como funciona

### Configuração

- `RELEASE_BRANCH` em `/.github/workflows/changelog.yml`: branch usada para validar releases e receber o commit do changelog (ex.: `master`).
- `UNRELEASED_BRANCH` em `/.github/workflows/unreleased.yml`: branch alvo do "Não publicado" e do commit automatizado (ex.: `development`).

### Componentes principais

1. **Workflow de "Não publicado"** (`.github/workflows/unreleased.yml`)
   - Dispara em PR fechado na branch definida em `UNRELEASED_BRANCH` (ex.: `development`, apenas quando o PR é mergeado)
   - Ignora PRs de forks (usa apenas o repositório principal)
   - Atualiza a seção `"Não publicado"` usando o título do PR
   - Faz commit e push das mudanças automaticamente

2. **Workflow de Release** (`.github/workflows/changelog.yml`)
   - Dispara quando um release é publicado
   - Valida se o release foi feito a partir da branch definida em `RELEASE_BRANCH` (ex.: `master`)
   - Promove o conteúdo de `"Não publicado"` para uma versão com data
   - Faz commit e push das mudanças automaticamente

3. **Scripts de changelog**
   - `scripts/update-unreleased.js`: atualiza a seção `"Não publicado"` usando título do PR
   - `scripts/promote-release.js`: promove `"Não publicado"` para versão
   - `scripts/generate-changelog.js`: gera o changelog completo (uso manual)

4. **CHANGELOG.md**
   - Armazena o histórico de mudanças
   - Mantém `"Não publicado"` no topo quando gerado por `changelog:unreleased`
   - Organiza os releases sob `## [Histórico]`
   - Segue o padrão Keep a Changelog

## Requisitos

- Node.js 16+
- Git

## Uso local

```bash
npm install
npm run changelog:unreleased
```

Observação: localmente, quando não há dados de PR, é utilizado o histórico Git.

### Gerar release localmente (opcional)

```bash
npm run changelog:release -- --version 1.0.0 --date 2026-02-04
```

### Gerar changelog completo (opcional)

```bash
npm run changelog
```

## Testes

```bash
npm run test
```

## Uso via GitHub Actions

1. Merge na branch definida em `UNRELEASED_BRANCH` (ex.: `development`) atualiza `"Não publicado"` com o título do PR automaticamente.

2. Publique um release no GitHub:
   - Acesse a página de releases do repositório
   - Clique em "Create a new release"
   - Selecione ou crie uma tag
   - Escolha a branch definida em `RELEASE_BRANCH` como base do release (ex.: `master`)
   - Publique o release

3. O workflow promove `"Não publicado"` para a nova versão e faz commit/push.

## Uso em outros repositórios (reusable workflow)

Crie os workflows no repositório consumidor apontando para este projeto:

```yaml
# .github/workflows/unreleased.yml
name: Update Unreleased Changelog

on:
  pull_request:
    branches: [development]
    types: [closed]

permissions:
  contents: write

jobs:
  changelog:
    uses: org/github-actions-auto-changelog/.github/workflows/reusable-unreleased.yml@v1
    with:
      unreleased_branch: development
```

```yaml
# .github/workflows/release.yml
name: Generate Changelog

on:
  release:
    types: [published]

permissions:
  contents: write

jobs:
  changelog:
    uses: org/github-actions-auto-changelog/.github/workflows/reusable-release.yml@v1
    with:
      release_branch: master
```

Observação: se o checkout do repositório do workflow falhar por permissões, passe `workflow_token`
com acesso ao repositório deste workflow.

## Convenção de títulos

Para a categorização funcionar, os títulos de PRs devem seguir Conventional Commits:

- `feat:` → Adicionado
- `fix:` → Corrigido
- `docs:` → Documentação
- `style:` → Estilo
- `refactor:` → Refatoração
- `perf:` → Desempenho
- `test:` → Testes
- `chore:` → Manutenção
- `build:` → Manutenção
- `ci:` → Manutenção
- `revert:` → Manutenção

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
│       ├── unreleased.yml         # Workflow de "Não publicado"
│       ├── reusable-release.yml   # Workflow reutilizável de release
│       └── reusable-unreleased.yml # Workflow reutilizável de "Não publicado"
├── scripts/
│   ├── generate-changelog.js      # Script de geração de changelog
│   ├── update-unreleased.js       # Atualiza a seção "Não publicado" com título do PR
│   ├── promote-release.js         # Promove "Não publicado" para release
│   └── test-changelog.js          # Script de testes
├── CHANGELOG.md                   # Arquivo de changelog
├── package.json                   # Configuração Node.js
└── README.md                      # Este arquivo
```

## Mais informações

- [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/)
- [Keep a Changelog](https://keepachangelog.com/pt-BR/)
- [GitHub Actions](https://docs.github.com/pt/actions)
- [Semantic Versioning](https://semver.org/lang/pt-BR/)
