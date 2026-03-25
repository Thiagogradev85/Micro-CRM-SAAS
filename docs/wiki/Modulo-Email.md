# Módulo E-mail

Envio em massa via SMTP usando [Nodemailer](https://nodemailer.com). Funciona com Gmail, Outlook ou qualquer servidor SMTP.

## Arquivos

```
server/src/modules/email/
├── EmailService.js   # Classe singleton
└── index.js          # export { emailService }
```

## Fluxo de uso

1. `POST /email/configure` — configura e testa a conexão SMTP
2. `GET /email/preview` — veja quais clientes receberão o e-mail
3. `POST /email/send-test` — envia e-mail de teste com dados fictícios
4. `POST /email/send-bulk` — dispara o envio em massa

## Variáveis de template

Suportadas no assunto e no corpo HTML (case-insensitive):

| Variável | Substituído por |
|----------|----------------|
| `{{nome}}` | `client.nome` |
| `{{cidade}}` | `client.cidade` |
| `{{uf}}` | `client.uf` |

**Exemplo:**
```
Assunto: Novidades para lojistas de {{cidade}}/{{uf}}
Corpo:   Olá {{nome}}, temos produtos novos para você!
```

## Configuração SMTP

| Campo | Exemplo Gmail |
|-------|--------------|
| host | `smtp.gmail.com` |
| port | `465` |
| secure | `true` |
| user | `seuemail@gmail.com` |
| pass | senha de app (não a senha normal) |

> Para Gmail, gere uma **Senha de App** em Conta Google → Segurança → Senhas de app.
