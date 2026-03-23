import PDFDocument from 'pdfkit'

const BG = '#18181b'
const CARD = '#27272a'
const TEXT = '#f4f4f5'
const MUTED = '#a1a1aa'
const ACCENT = '#38bdf8'

export async function generateCatalogPdf({ catalog, products }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: catalog.nome } })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(BG)

    // Header
    doc.fillColor(ACCENT).fontSize(20).font('Helvetica-Bold').text(catalog.nome, 40, 40)
    const dt = new Date(catalog.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    doc.fillColor(MUTED).fontSize(11).font('Helvetica').text(dt, 40, 66)
    doc.fillColor(MUTED).fontSize(10).text(`${products.length} produto(s)`, { align: 'right' })

    doc.moveDown(1.5)

    const pageW = doc.page.width - 80

    products.forEach((p) => {
      // check if we need a new page
      if (doc.y > doc.page.height - 160) {
        doc.addPage()
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(BG)
        doc.y = 40
      }

      const cardY = doc.y
      // Card background
      doc.roundedRect(40, cardY, pageW, 120, 6).fill(CARD)

      // Product name
      doc.fillColor(TEXT).fontSize(13).font('Helvetica-Bold')
        .text(`${p.tipo || ''} ${p.modelo || ''}`.trim(), 52, cardY + 12, { width: pageW - 100 })

      // Price
      if (p.preco) {
        const priceStr = `R$ ${Number(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        doc.fillColor(ACCENT).fontSize(12).font('Helvetica-Bold')
          .text(priceStr, 40, cardY + 12, { width: pageW, align: 'right' })
      }

      // Specs row 1
      const specs = []
      if (p.motor)          specs.push(`Motor: ${p.motor}`)
      if (p.bateria)        specs.push(`Bateria: ${p.bateria}`)
      if (p.velocidade_max) specs.push(`Vel. máx: ${p.velocidade_max} km/h`)
      if (p.autonomia)      specs.push(`Aut: ${p.autonomia}`)
      if (p.pneu)           specs.push(`Pneu: ${p.pneu}`)
      if (p.cambio)         specs.push(`Câmbio: ${p.cambio}`)

      doc.fillColor(MUTED).fontSize(9).font('Helvetica')
        .text(specs.join('  ·  '), 52, cardY + 36, { width: pageW - 24 })

      // Specs row 2
      const specs2 = []
      if (p.peso_bruto)   specs2.push(`Peso bruto: ${p.peso_bruto} kg`)
      if (p.peso_liquido) specs2.push(`Peso líq: ${p.peso_liquido} kg`)
      if (p.comprimento || p.largura || p.altura)
        specs2.push(`Dim: ${[p.comprimento, p.largura, p.altura].filter(Boolean).join(' × ')} mm`)
      if (p.impermeabilidade) specs2.push(p.impermeabilidade)

      if (specs2.length > 0) {
        doc.fillColor(MUTED).fontSize(9)
          .text(specs2.join('  ·  '), 52, cardY + 54, { width: pageW - 24 })
      }

      // Extra / obs
      if (p.extra) {
        doc.fillColor(MUTED).fontSize(8).font('Helvetica-Oblique')
          .text(p.extra, 52, cardY + 72, { width: pageW - 24 })
      }

      // Stock badge
      doc.fillColor(MUTED).fontSize(9).font('Helvetica')
        .text(`Estoque: ${p.estoque ?? 0}`, 52, cardY + 96)

      doc.y = cardY + 130
    })

    if (products.length === 0) {
      doc.fillColor(MUTED).fontSize(12).text('Nenhum produto neste catálogo.', { align: 'center' })
    }

    doc.end()
  })
}
