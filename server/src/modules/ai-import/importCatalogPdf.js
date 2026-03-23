import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `Você é um extrator de dados de catálogos de produtos.
Dado um catálogo PDF, extraia TODOS os produtos encontrados e retorne um JSON válido.
Responda APENAS com o JSON, sem texto adicional, sem markdown, sem blocos de código.

Formato obrigatório:
[
  {
    "tipo": "tipo do produto (ex: patinete, bicicleta, scooter)",
    "modelo": "código/modelo do produto (ex: C1, L10, ZX-161)",
    "motor": "ex: 650w",
    "bateria": "ex: 48V 13Ah",
    "velocidade_max": 30,
    "velocidade_min": null,
    "autonomia": "ex: 40 km",
    "pneu": null,
    "suspensao": null,
    "carregador": null,
    "impermeabilidade": null,
    "cambio": null,
    "peso_bruto": null,
    "peso_liquido": null,
    "preco": null,
    "extra": null
  }
]

Regras:
- velocidade_max e velocidade_min: NÚMEROS inteiros ou decimais, nunca string
- preco, peso_bruto, peso_liquido: NÚMERO ou null
- cambio: string descrevendo o tipo de câmbio, ou null se não houver
- Todos os outros campos: string ou null
- Se um campo não aparecer, use null
- Ignore páginas de capa, institucional, mapas e agradecimentos`

export async function importCatalogPdf(buffer) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY não configurada no servidor.')
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const base64Pdf = buffer.toString('base64')

  let raw
  try {
    const response = await client.beta.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      betas: ['pdfs-2024-09-25'],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
            },
            {
              type: 'text',
              text: 'Extraia todos os produtos deste catálogo e retorne apenas o JSON.',
            },
          ],
        },
      ],
    })
    raw = response.content[0]?.text?.trim() ?? ''
    console.log('[importCatalogPdf] Resposta Claude (300 chars):', raw.slice(0, 300))
  } catch (err) {
    console.error('[importCatalogPdf] Erro Anthropic:', {
      status: err.status,
      message: err.message,
      error: err.error,
    })

    const status = err.status
    const detail = err.error?.error?.message || err.message || ''

    if (status === 401) throw new Error('Chave da API Anthropic inválida. Verifique o ANTHROPIC_API_KEY no servidor.')
    if (status === 403 || detail.includes('credit') || detail.includes('balance'))
      throw new Error('Saldo insuficiente na conta Anthropic. Adicione créditos em console.anthropic.com.')
    if (status === 429) throw new Error('Limite de requisições Anthropic atingido. Aguarde alguns instantes e tente novamente.')
    if (status === 400) throw new Error(`Requisição inválida para Claude API: ${detail}`)
    if (status === 529) throw new Error('Claude API temporariamente sobrecarregado. Tente novamente em breve.')

    throw new Error(`Erro ao chamar Claude API: ${detail || err.message}`)
  }

  const jsonStr = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let products
  try {
    products = JSON.parse(jsonStr)
  } catch {
    console.error('[importCatalogPdf] JSON inválido recebido:\n', raw.slice(0, 800))
    throw new Error('Claude retornou uma resposta fora do formato esperado. Tente novamente.')
  }

  if (!Array.isArray(products)) {
    throw new Error('Claude não retornou uma lista de produtos. Tente novamente.')
  }

  console.log(`[importCatalogPdf] ${products.length} produtos extraídos:`, products.map(p => `${p.tipo} ${p.modelo}`).join(', '))

  return products.map(p => ({
    tipo:             p.tipo             ?? null,
    modelo:           p.modelo           ?? null,
    motor:            p.motor            ?? null,
    bateria:          p.bateria          ?? null,
    velocidade_min:   typeof p.velocidade_min === 'number' ? p.velocidade_min : null,
    velocidade_max:   typeof p.velocidade_max === 'number' ? p.velocidade_max : null,
    autonomia:        p.autonomia        ?? null,
    pneu:             p.pneu             ?? null,
    suspensao:        p.suspensao        ?? null,
    carregador:       p.carregador       ?? null,
    impermeabilidade: p.impermeabilidade ?? null,
    cambio:           p.cambio           ?? null,
    peso_bruto:       typeof p.peso_bruto  === 'number' ? p.peso_bruto  : null,
    peso_liquido:     typeof p.peso_liquido === 'number' ? p.peso_liquido : null,
    preco:            typeof p.preco     === 'number' ? p.preco : null,
    estoque:          0,
    imagem:           null,
    extra:            p.extra            ?? null,
  }))
}
