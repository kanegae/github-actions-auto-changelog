# github-actions-auto-changelog

Prova de conceito para validar o uso de GitHub Actions na geração automática de changelog.

## Objetivo

Validar um workflow que gere o `CHANGELOG.md` a partir do histórico Git, acionado por tags ou releases.

## Como funciona

### Componentes principais

1. **Workflow do GitHub Actions** (`.github/workflows/changelog.yml`)
   - Dispara quando uma tag `v*` é criada
   - Pode ser usado em releases publicados
   - Executa o script de geração
   - Faz commit e push das mudanças automaticamente

2. **Script de geração de changelog** (`scripts/generate-changelog.js`)
   - Lê o histórico e as tags do Git
   - Categoriza commits por tipo (Conventional Commits)
   - Gera entradas formatadas em Markdown

3. **CHANGELOG.md**
   - Armazena o histórico de mudanças
   - Atualizado automaticamente pelo workflow
   - Segue o padrão Keep a Changelog

## Requisitos

- Node.js 16+
- Git

## Uso local

```bash
npm install
npm run changelog
```

## Uso via GitHub Actions

1. Crie uma tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. Ou publique um release no GitHub:
   - Acesse a página de releases do repositório
   - Clique em "Create a new release"
   - Selecione ou crie uma tag
   - Publique o release

3. O workflow será acionado e:
   - Atualiza `CHANGELOG.md`
   - Comita e faz push do changelog

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
│       └── changelog.yml          # Workflow do GitHub Actions
├── scripts/
│   ├── generate-changelog.js      # Script de geração de changelog
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

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/pt-BR/)
- [GitHub Actions](https://docs.github.com/pt/actions)