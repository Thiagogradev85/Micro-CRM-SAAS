# Módulo WhatsApp

Envio em massa via WhatsApp Web usando [Baileys](https://github.com/WhiskeySockets/Baileys). Não depende de API paga.

## Arquivos

```
server/src/modules/whatsapp/
├── WhatsAppService.js   # Classe singleton
└── index.js             # export { whatsAppService }
```

## Estados da conexão

| Status | Descrição |
|--------|-----------|
| `disconnected` | Não conectado (estado inicial) |
| `connecting` | Aguardando leitura do QR code |
| `connected` | Autenticado, pronto para enviar |

## Autenticação

1. `POST /whatsapp/connect` inicia a conexão
2. Baileys gera um QR code → frontend exibe como imagem
3. Usuário escaneia com o celular
4. Após autenticação, `status = 'connected'`
5. Sessão salva em `.whatsapp-session/` (reconnecta automaticamente no próximo boot)

## Envio em massa

```
POST /whatsapp/send-bulk
{ status_id, ufs, message, delay_ms }
```

- Resposta imediata: `"Iniciando envio para N clientes..."`
- Envio roda em background (não bloqueia a resposta HTTP)
- Após cada envio bem-sucedido: cliente marcado como **Contatado** + evento `contacted` no relatório

## Variáveis de template

| Variável | Substituído por |
|----------|----------------|
| `{{nome}}` | `client.nome` |
| `{{cidade}}` | `client.cidade` |
| `{{uf}}` | `client.uf` |

## Boas práticas anti-bloqueio

| Prática | Motivo |
|---------|--------|
| Delay mínimo 3s (recomendado 10–30s) | Evita detecção de automação |
| Mensagens com `{{nome}}` | Evita textos idênticos em massa |
| Máximo ~50–80 envios/dia | Reduz risco de bloqueio do número |
| Número com histórico real | Números novos têm tolerância menor |
