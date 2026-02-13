# github-actions-auto-changelog

Prova de conceito para validar o uso de GitHub Actions na geração automática de changelog.

## Objetivo

Validar um workflow com GitHub Actions que mantenha o `CHANGELOG.md` atualizado a partir dos títulos de PRs,
mantendo a seção "Não publicado" em merges na branch definida em `UNRELEASED_BRANCH` (ex.: `development`)
e promovendo para versão em releases na branch definida em `RELEASE_BRANCH` (ex.: `master`).

## Como funciona

### Configuração

- `RELEASE_BRANCH` em `/.github/workflows/changelog-release.yml`: branch usada para validar releases e receber o commit do changelog (ex.: `master`).
- `UNRELEASED_BRANCH` em `/.github/workflows/changelog-unreleased.yml`: branch alvo do "Não publicado" e do commit automatizado (ex.: `development`).
- `changelog-config.json` (opcional, no repositório consumidor): sobrescreve os padrões do changelog (títulos, labels, chaves de categorias e filtros de tags).

Se existir `changelog-config.json` na raiz do repositório consumidor, ele sobrescreve os padrões.

Prioridade para filtrar tags por branch:
`CHANGELOG_TAGS_BRANCH` → `RELEASE_BRANCH` → `UNRELEASED_BRANCH` → `tags.branch` → `HEAD`.

Exemplo de sobrescrita:

```json
{
  "categoryOrder": ["feat", "fix", "docs", "chore"],
  "categoryLabels": {
    "feat": "Adicionado",
    "fix": "Corrigido",
    "docs": "Documentação",
    "chore": "Manutenção",
    "build": "Manutenção",
    "ci": "Manutenção",
    "revert": "Manutenção"
  },
  "tags": {
    "pattern": "v*"
  }
}
```

### Componentes principais

1. **Workflow de "Não publicado"** (`.github/workflows/changelog-unreleased.yml`)
   - Dispara em PR fechado; o job só executa quando o PR é mergeado e a branch base é a definida em `UNRELEASED_BRANCH` (ex.: `development`)
   - Ignora PRs de forks (usa apenas o repositório principal)
   - Atualiza a seção `"Não publicado"` usando o título do PR
   - Faz commit e push das mudanças automaticamente

2. **Workflow de Release** (`.github/workflows/changelog-release.yml`)
   - Dispara quando um release é publicado
   - Valida se o release foi feito a partir da branch definida em `RELEASE_BRANCH` (ex.: `master`)
   - Promove o conteúdo de `"Não publicado"` para uma versão com a data do release
   - Atualiza o body do release com a seção da versão atual
   - Faz commit e push das mudanças automaticamente

3. **Scripts de changelog** (em `scripts/`)
   - `scripts/update-unreleased.js`: atualiza a seção `"Não publicado"` usando título do PR
   - `scripts/promote-release.js`: promove `"Não publicado"` para versão
   - `scripts/promote-release.js` aceita `--release-notes` (ou `RELEASE_NOTES_PATH`) para gerar as notas da release
   - `scripts/extract-release-notes.js`: extrai a seção da versão atual para `RELEASE_NOTES.md`
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

Execute os comandos dentro de `scripts/`:

```bash
cd scripts
npm install
npm run changelog:unreleased
```

Observação: localmente, quando não há dados de PR, é utilizado o histórico Git.
O `CHANGELOG.md` é criado/atualizado na raiz do repositório.

### Gerar release localmente (opcional)

```bash
cd scripts
npm run changelog:release -- --version 1.0.0 --date 2026-02-04
```

### Gerar changelog completo (opcional)

```bash
cd scripts
npm run changelog
```

### Gerar notas de release (opcional)

```bash
cd scripts
npm run changelog:release-notes -- --version 1.0.0
```

## Testes

```bash
cd scripts
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
# .github/workflows/changelog-unreleased.yml
name: Changelog / Update Unreleased

on:
  pull_request:
    branches: [development]
    types: [closed]

permissions:
  contents: write

jobs:
  changelog:
    uses: kanegae/github-actions-auto-changelog/.github/workflows/changelog-unreleased-reusable.yml@development
    with:
      unreleased_branch: development
      workflow_repository: kanegae/github-actions-auto-changelog
      workflow_ref: development
```

```yaml
# .github/workflows/changelog-release.yml
name: Changelog / Generate Release

on:
  release:
    types: [published]

permissions:
  contents: write

jobs:
  changelog:
    uses: kanegae/github-actions-auto-changelog/.github/workflows/changelog-release-reusable.yml@development
    with:
      release_branch: master
      workflow_repository: kanegae/github-actions-auto-changelog
      workflow_ref: development
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
│       ├── changelog-release.yml             # Workflow de release
│       ├── changelog-unreleased.yml          # Workflow de "Não publicado"
│       ├── changelog-release-reusable.yml    # Workflow reutilizável de release
│       └── changelog-unreleased-reusable.yml # Workflow reutilizável de "Não publicado"
├── scripts/
│   ├── changelog-config.json                 # Configuração padrão do changelog
│   ├── generate-changelog.js                 # Script de geração de changelog
│   ├── update-unreleased.js                  # Atualiza a seção "Não publicado" com título do PR
│   ├── promote-release.js                    # Promove "Não publicado" para release
│   ├── extract-release-notes.js              # Extrai a seção da versão atual
│   ├── lib/
│   │   ├── changelog.js                      # Funções compartilhadas
│   │   └── config.js                         # Leitura e validação de configurações
│   ├── test-changelog.js                     # Script de testes
│   └── package.json                          # Configuração Node.js
├── CHANGELOG.md                              # Arquivo de changelog (no repositório consumidor)
└── README.md                                 # README do repositório
```

## Observações e melhorias futuras

- `CHANGELOG.md` é gerado no repositório consumidor; se este repositório executar os workflows diretos, o arquivo não deve estar ignorado no `.gitignore`.
- Workflows fazem commit/push automático; branch protection pode bloquear a atualização do changelog.
- `RELEASE_NOTES.md` é gerado durante o workflow para atualizar o body do release e não é versionado.
- `npm ci` exige `package-lock.json` atualizado para builds reprodutíveis.

## Mais informações

- [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/)
- [Keep a Changelog](https://keepachangelog.com/pt-BR/)
- [GitHub Actions](https://docs.github.com/pt/actions)
- [Semantic Versioning](https://semver.org/lang/pt-BR/)