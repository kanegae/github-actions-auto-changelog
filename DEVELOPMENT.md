# Guia de Desenvolvimento Local

Este documento descreve como desenvolver e testar o projeto localmente.

## Pré-requisitos

- Node.js 16.0.0 ou superior
- Git
- Acesso ao terminal

## Setup Inicial

### 1. Clonar o repositório

```bash
git clone https://github.com/kanegae/github-actions-auto-changelog.git
cd github-actions-auto-changelog
```

### 2. Instalar dependências

```bash
npm install
```

## Testando Localmente

### Gerar changelog com commits atuais

```bash
npm run changelog
```

Isso irá:
1. Ler todas as tags do repositório
2. Buscar os commits entre as tags
3. Categorizar os commits
4. Gerar/atualizar o arquivo `CHANGELOG.md`

### Exemplo Prático

Para testar o fluxo completo:

```bash
# 1. Fazer alguns commits com conventional commits
git commit -m "feat: adicionar nova funcionalidade"
git commit -m "fix: corrigir bug no parser"

# 2. Criar uma tag
git tag v1.0.0

# 3. Fazer mais commits
git commit -m "docs: atualizar README"

# 4. Gerar o changelog
npm run changelog

# 5. Ver o resultado
cat CHANGELOG.md
```

## Estrutura do Script

O script `scripts/generate-changelog.js` funciona da seguinte forma:

```
1. Buscar todas as tags (git tag --sort=-creatordate)
2. Para cada tag:
   - Buscar commits desde a tag anterior até a atual
   - Parsear os commits (hash, subject, author, date)
   - Categorizar por tipo (feat, fix, docs, etc)
3. Gerar markdown formatado
4. Escrever no arquivo CHANGELOG.md
```

## Debug

Para debug, você pode adicionar logs no script:

```javascript
// Em scripts/generate-changelog.js
console.log('Tags encontradas:', tags);
console.log('Commits do log:', log);
```

## Workflow do GitHub Actions

O workflow em `.github/workflows/changelog.yml` faz:

1. Faz checkout do repositório
2. Instala Node.js
3. Instala dependências (npm install)
4. Executa o script (npm run changelog)
5. Faz commit e push das mudanças

## Troubleshooting

### Script não gera nenhum changelog
- Verifique se existem tags: `git tag`
- Verifique se existem commits: `git log`
- Verifique se os commits seguem Conventional Commits

### CHANGELOG.md não é atualizado no GitHub Actions
- Verifique as permissões da action
- Verifique se a tag segue o padrão `v*`
- Verifique os logs da action no GitHub

### Commits não são categorizados corretamente
- Certifique-se de usar Conventional Commits:
  - `feat: ...`
  - `fix: ...`
  - `docs: ...`
  - etc.

## Contribuindo

1. Fork o repositório
2. Crie uma branch para a sua feature (`git checkout -b feature/sua-feature`)
3. Faça commits usando Conventional Commits
4. Push para a branch (`git push origin feature/sua-feature`)
5. Abra um Pull Request

## Mais Informações

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Actions](https://docs.github.com/pt/actions)