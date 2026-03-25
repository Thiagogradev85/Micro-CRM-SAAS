# Versioning

O projeto usa [Semantic Versioning](https://semver.org/lang/pt-BR/) com Git tags e GitHub Releases.

## Convenção

| Versão | Quando usar |
|--------|-------------|
| `vX.0.0` | Mudança que quebra o sistema (novo schema, reescrita) |
| `v1.X.0` | Nova funcionalidade (novo módulo, nova página) |
| `v1.1.X` | Bug fix ou ajuste pequeno |

## Passo a passo

```bash
# 1. Commit normal
git add .
git commit -m "feat: descrição"
git push

# 2. Criar tag
git tag -a v1.4.0 -m "Descrição curta da versão"
git push origin v1.4.0

# 3. Criar release no GitHub
gh release create v1.4.0 --title "v1.4.0 — Título" --notes "## O que mudou
- Item 1
- Item 2"
```

## Histórico

| Tag | Descrição |
|-----|-----------|
| `v1.0.0` | Sistema base (clientes, catálogos, relatório diário) |
| `v1.1.0` | Contato diário e reset automático de status |
| `v1.2.0` | Refatoração de módulos, dimensões nos produtos |
| `v1.3.0` | WhatsApp em massa (Baileys), e-mail em massa (Nodemailer) |
| `v1.4.0` | AppError + useAppModalError, fix timezone relatório diário |
