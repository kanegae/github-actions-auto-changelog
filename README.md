# github-actions-auto-changelog

Prova de conceito para validar o uso de GitHub Actions na geração automática de changelog.

## Objetivo
Validar um workflow utilizando GitHub Actions que gere o changelog a partir do histórico do
repositório, disparado por tags e releases.

## Como Funciona

Este projeto implementa uma solução automatizada para gerar changelog baseado no histórico Git:

### Componentes Principais

1. **Workflow do GitHub Actions** (`.github/workflows/changelog.yml`)
   - Dispara automaticamente quando uma tag `v*` é criada
   - Dispara quando um release é publicado
   - Executa o script de geração de changelog
   - Faz commit e push das mudanças automaticamente

2. **Script de Geração de Changelog** (`scripts/generate-changelog.js`)
   - Lê o histórico Git e tags do repositório
   - Categoriza commits por tipo (feat, fix, docs, etc.)
   - Segue o padrão Conventional Commits
   - Gera entradas formatadas em Markdown

3. **CHANGELOG.md**
   - Arquivo que armazena o histórico de mudanças
   - Atualizado automaticamente pelo workflow
   - Segue o padrão Keep a Changelog

## Convenção de Commits

O script reconhece e categoriza commits usando Conventional Commits:

- `feat:` → Features
- `fix:` → Bug Fixes
- `docs:` → Documentation
- `style:` → Styles
- `refactor:` → Refactoring
- `perf:` → Performance
- `test:` → Tests
- `chore:` → Chores

Exemplo de commit válido:
```
feat(auth): adicionar suporte a OAuth2
fix(api): corrigir erro de validação
docs: atualizar instruções de instalação
```

## Instalação Local

```bash
# Instalar dependências
npm install

# Gerar changelog manualmente
npm run changelog
```

## Como Usar

1. **Criar uma tag**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Ou criar um release no GitHub**:
   - Acesse a página de releases do repositório
   - Clique em "Create a new release"
   - Selecione ou crie uma tag
   - Preencha o título e descrição
   - Clique em "Publish release"

3. **O workflow será acionado automaticamente**:
   - Gerará uma nova entrada no CHANGELOG.md
   - Fará commit das mudanças
   - Fará push do changelog atualizado

## Estrutura de Arquivos

```
.
├── .github/
│   └── workflows/
│       └── changelog.yml          # Workflow do GitHub Actions
├── scripts/
│   └── generate-changelog.js      # Script de geração de changelog
├── CHANGELOG.md                   # Arquivo de changelog
├── package.json                   # Configuração Node.js
└── README.md                      # Este arquivo
```

## Características

✅ Automação completa via GitHub Actions
✅ Segue padrões de Conventional Commits
✅ Categoriza commits automaticamente
✅ Suporta múltiplas versões (tags)
✅ Execução local e remota
✅ Sem dependências externas complexas

## Próximas Melhorias

- [ ] Suporte a templates customizáveis
- [ ] Integração com GitHub Release Notes
- [ ] Geração de resumo de mudanças
- [ ] Notificações de changelog
- [ ] Suporte a múltiplos idiomas
