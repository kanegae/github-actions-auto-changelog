# github-actions-auto-changelog

Prova de conceito para validar o uso de GitHub Actions na geração automática de changelog.

## Objetivo

Validar um workflow que mantenha o `CHANGELOG.md` atualizado a partir do histórico Git, com uma
seção `"Não publicado"` em merges e promoção para versão em releases na branch definida em `RELEASE_BRANCH`.

## Como funciona

### Configuração

- `RELEASE_BRANCH` em `/.github/workflows/changelog.yml`: branch usada para validar releases e receber o commit do changelog.
- `UNRELEASED_BRANCH` em `/.github/workflows/unreleased.yml`: branch alvo do "Não publicado" e do commit automatizado.

### Componentes principais

1. **Workflow de "Não publicado"** (`.github/workflows/unreleased.yml`)
   - Dispara em PR fechado na branch `development` (apenas quando o PR é mergeado)
   - Ignora PRs de forks (somente `github.repository`)
   - Atualiza apenas a seção `"Não publicado"`
   - Faz commit e push das mudanças automaticamente

2. **Workflow de Release** (`.github/workflows/changelog.yml`)
   - Dispara quando um release é publicado
   - Valida se o release foi feito a partir da branch definida em `RELEASE_BRANCH`
   - Promove o conteúdo de `"Não publicado"` para uma versão com data
   - Faz commit e push das mudanças automaticamente

3. **Scripts de changelog**
   - `scripts/update-unreleased.js`: atualiza a seção `"Não publicado"`
   - `scripts/promote-release.js`: promove `"Não publicado"` para versão
   - `scripts/generate-changelog.js`: gera o changelog completo (uso manual)

4. **CHANGELOG.md**
   - Armazena o histórico de mudanças
   - Mantém `"Não publicado"` no topo quando gerado por `changelog:unreleased`
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

## Testes

```bash
npm run test
```

## Uso via GitHub Actions

1. Merge em `development` atualiza `"Não publicado"` automaticamente.

2. Publique um release no GitHub:
   - Acesse a página de releases do repositório
   - Clique em "Create a new release"
   - Selecione ou crie uma tag
   - Escolha a branch definida em `RELEASE_BRANCH` como base do release
   - Publique o release

3. O workflow promove `"Não publicado"` para a nova versão e faz commit/push.

## Convenção de commits

O script reconhece e categoriza commits usando Conventional Commits:

- `feat:` → Adicionado
- `fix:` → Corrigido
- `docs:` → Documentação
- `style:` → Estilo
- `refactor:` → Refatoração
- `perf:` → Desempenho
- `test:` → Testes
- `chore:` → Manutenção

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
│       └── unreleased.yml         # Workflow de "Não publicado"
├── scripts/
│   ├── generate-changelog.js      # Script de geração de changelog
│   ├── update-unreleased.js       # Atualiza a seção "Não publicado"
│   ├── promote-release.js         # Promove "Não publicado" para release
│   └── test-changelog.js          # Script de testes
├── CHANGELOG.md                   # Arquivo de changelog
├── package.json                   # Configuração Node.js
└── README.md                      # Este arquivo
```

## Mais informações

- [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/)
- [Semantic Versioning](https://semver.org/lang/pt-BR/)
- [Keep a Changelog](https://keepachangelog.com/pt-BR/)
- [GitHub Actions](https://docs.github.com/pt/actions)
