# Exemplos de Uso

Este documento mostra exemplos práticos de como usar o projeto.

## Exemplo 1: Workflow Completo Local

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/github-actions-auto-changelog.git
cd github-actions-auto-changelog

# Instalar dependências
npm install

# Gerar changelog
npm run changelog

# Ver o resultado
cat CHANGELOG.md
```

## Exemplo 2: Adicionar Commits e Criar Release

```bash
# Fazer alguns commits com conventional commits
git commit -m "feat(auth): adicionar autenticação OAuth2"
git commit -m "fix(api): corrigir erro de validação"
git commit -m "docs: atualizar instruções de instalação"

# Criar uma tag (versão)
git tag v1.0.0

# Push para o repositório remoto
git push origin main v1.0.0

# O GitHub Actions será acionado automaticamente!
# O changelog será gerado e atualizado
```

## Exemplo 3: Publicar uma Release no GitHub

```bash
# Opção 1: Via CLI (gh)
gh release create v1.1.0 --generate-notes

# Opção 2: Via GitHub Web
# 1. Vá para https://github.com/seu-usuario/seu-repo/releases
# 2. Clique em "Create a new release"
# 3. Selecione a tag ou crie uma nova
# 4. Preencha título e descrição
# 5. Clique em "Publish release"

# O workflow será acionado e o changelog será atualizado!
```

## Exemplo 4: Commits Convencionais

### Features (Novas funcionalidades)
```bash
git commit -m "feat(login): adicionar suporte a 2FA"
git commit -m "feat(api): adicionar endpoint de refresh token"
git commit -m "feat: implementar caching de resultados"
```

### Bug Fixes (Correções)
```bash
git commit -m "fix(auth): corrigir vazamento de sessão"
git commit -m "fix(api): validar entrada de usuário"
git commit -m "fix: remover console.log de produção"
```

### Documentação
```bash
git commit -m "docs: adicionar guia de contribuição"
git commit -m "docs(api): documentar novo endpoint"
git commit -m "docs: atualizar exemplos de uso"
```

### Refatoração
```bash
git commit -m "refactor(core): simplificar lógica de validação"
git commit -m "refactor: extrair função de utilitário"
```

### Performance
```bash
git commit -m "perf(query): otimizar busca de banco de dados"
git commit -m "perf: melhorar tempo de inicialização"
```

### Testes
```bash
git commit -m "test: adicionar testes unitários"
git commit -m "test(auth): cobrir casos de erro"
```

### Chores (Manutenção)
```bash
git commit -m "chore: atualizar dependências"
git commit -m "chore(ci): configurar lint"
git commit -m "chore: remover código não utilizado"
```

## Exemplo 5: Changelog Gerado

Após executar `npm run changelog`, o arquivo CHANGELOG.md será atualizado assim:

```markdown
# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).

## [1.0.0] - 2024-01-15

### Features

- feat(auth): adicionar autenticação OAuth2 (a1b2c3d) - Anderson Rocha
- feat(api): adicionar endpoint de refresh token (b2c3d4e) - Anderson Rocha

### Bug Fixes

- fix(auth): corrigir vazamento de sessão (c3d4e5f) - Anderson Rocha
- fix(api): validar entrada de usuário (d4e5f6g) - Anderson Rocha

### Documentation

- docs: atualizar instruções de instalação (e5f6g7h) - Anderson Rocha

## [0.1.0] - 2024-01-10

### Features

- feat: implementar estrutura básica (f6g7h8i) - Anderson Rocha
```

## Exemplo 6: Integração com CI/CD

### GitHub Actions
O workflow `.github/workflows/changelog.yml` é automaticamente acionado quando:

```yaml
on:
  push:
    tags:
      - 'v*'           # Qualquer tag iniciada com v
  release:
    types:
      - published       # Quando um release é publicado
```

### Verificar execução

1. Vá para a aba **Actions** no GitHub
2. Procure pelo workflow **Auto Generate Changelog**
3. Veja os logs e resultado da execução

## Exemplo 7: Customizar o Workflow

Para adicionar mais ações após gerar o changelog:

```yaml
# Em .github/workflows/changelog.yml

- name: Generate changelog
  run: npm run changelog

- name: Criar Pull Request
  uses: peter-evans/create-pull-request@v4
  with:
    commit-message: 'docs: update changelog'
    title: 'Update changelog'
    branch: 'changelog-update'

# Ou notificar um canal no Slack
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
```

## Troubleshooting

### P: Commits não aparecem no changelog
R: Certifique-se de:
- Usar Conventional Commits (`feat:`, `fix:`, etc.)
- Criar tags com o padrão `v*` (ex: v1.0.0)
- Fazer push das tags: `git push origin v1.0.0`

### P: Changelog vazio
R:
- Verifique se existem tags: `git tag`
- Verifique se existem commits: `git log`
- Execute manualmente: `npm run changelog`

### P: Workflow não executa
R:
- Verifique as permissões em Settings > Actions
- Confira se a tag segue o padrão `v*`
- Verifique os logs em Actions

## Dicas

✅ Use commits atomizados (um commit = uma mudança)
✅ Sempre use Conventional Commits
✅ Crie tags para cada release
✅ Mantenha CHANGELOG.md legível
✅ Revise as mudanças antes de fazer push

## Mais Recursos

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Actions Documentation](https://docs.github.com/pt/actions)