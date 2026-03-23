import PDFDocument from 'pdfkit'

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function sectionHeader(doc, title) {
  doc.moveDown(0.5)
  const y = doc.y
  const left = doc.page.margins.left
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right
  doc.rect(left, y, width, 22).fill('#1e293b')
  doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
    .text(title, left + 8, y + 5, { width: width - 16, lineBreak: false })
  doc.fillColor('#111827').font('Helvetica').fontSize(10)
  doc.y = y + 22 + 6
}

const TYPE_LABEL = {
  new_client:        'Novo',
  contacted:         'Contatado',
  catalog_requested: 'Catalogo',
  purchased:         'Compra',
}

const TYPE_COLOR = {
  'Novo':      '#22c55e',
  'Contatado': '#60a5fa',
  'Catalogo':  '#facc15',
  'Compra':    '#fbbf24',
}

function mergeClients(details) {
  const map = new Map()
  const order = [
    ['new_client',        details.new_clients],
    ['contacted',         details.contacted],
    ['catalog_requested', details.catalog_requested],
    ['purchased',         details.purchased],
  ]
  for (const [type, list] of order) {
    for (const c of list) {
      if (!map.has(c.client_id)) {
        map.set(c.client_id, { ...c, types: [] })
      }
      map.get(c.client_id).types.push(TYPE_LABEL[type])
    }
  }
  return [...map.values()]
}

function clientRow(doc, client, index) {
  const nome = `${client.client_nome} — ${client.cidade || ''}/${client.uf || ''}`
  const whats = client.whatsapp ? `   Wpp: ${client.whatsapp}` : ''

  doc.fillColor('#374151').font('Helvetica').fontSize(10)
    .text(`${index + 1}. (`, { continued: true, indent: 10 })

  client.types.forEach((type, i) => {
    doc.fillColor(TYPE_COLOR[type] || '#e2e8f0').font('Helvetica-Bold')
      .text(type, { continued: true })
    if (i < client.types.length - 1) {
      doc.fillColor('#374151').font('Helvetica').text(', ', { continued: true })
    }
  })

  doc.fillColor('#374151').font('Helvetica').text(') ', { continued: true })
  doc.fillColor('#111827').font('Helvetica').text(nome + whats)
}

export function generateReportPdf({ date, summary, details }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks = []

    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageW = doc.page.width - 80

    doc.rect(40, 40, pageW, 60).fill('#0f172a')
    doc.fillColor('#38bdf8').fontSize(20).font('Helvetica-Bold')
      .text('RELATÓRIO DIÁRIO', 40, 55, { align: 'center', width: pageW })
    doc.fillColor('#94a3b8').fontSize(12).font('Helvetica')
      .text(`Data: ${formatDate(date)}`, 40, 80, { align: 'center', width: pageW })
    doc.fillColor('#111827')
    doc.moveDown(3)

    doc.fontSize(13).font('Helvetica-Bold').text('RESUMO', { underline: true })
    doc.moveDown(0.4)

    const summaryItems = [
      { label: 'Contatados',        value: summary.contacted,         color: '#3b82f6' },
      { label: 'Clientes Novos',    value: summary.new_client,        color: '#22c55e' },
      { label: 'Pediram Catálogo',  value: summary.catalog_requested, color: '#0ea5e9' },
      { label: 'Finalizaram Compra',value: summary.purchased,         color: '#f59e0b' },
    ]

    for (const item of summaryItems) {
      doc.font('Helvetica').fontSize(11).fillColor('#374151')
        .text(`${item.label}:`, { continued: true })
      doc.font('Helvetica-Bold').fillColor(item.color)
        .text(` ${item.value}`)
      doc.fillColor('#111827')
    }

    const allClients = mergeClients(details)
    if (allClients.length > 0) {
      sectionHeader(doc, `CLIENTES DO DIA (${allClients.length})`)
      allClients.forEach((c, i) => clientRow(doc, c, i))
    }

    doc.moveDown(2)
    doc.fontSize(8).fillColor('#9ca3af')
      .text(`Gerado em ${new Date().toLocaleString('pt-BR')} · CRM Scooter`, { align: 'center' })

    doc.end()
  })
}
