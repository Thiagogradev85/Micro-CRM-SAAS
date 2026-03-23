import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

const COLS = [
  { key: 'nome',        label: 'Nome'           },
  { key: 'responsavel', label: 'Responsável'     },
  { key: 'cidade',      label: 'Cidade'          },
  { key: 'uf',          label: 'UF'              },
  { key: 'cep',         label: 'CEP'             },
  { key: 'logradouro',  label: 'Logradouro'      },
  { key: 'numero',      label: 'Número'          },
  { key: 'complemento', label: 'Complemento'     },
  { key: 'bairro',      label: 'Bairro'          },
  { key: 'whatsapp',    label: 'WhatsApp'        },
  { key: 'telefone',    label: 'Telefone Fixo'   },
  { key: 'email',       label: 'E-mail'          },
  { key: 'site',        label: 'Site'            },
  { key: 'instagram',   label: 'Instagram'       },
  { key: 'facebook',    label: 'Facebook'        },
  { key: 'twitter',     label: 'X (Twitter)'     },
  { key: 'linkedin',    label: 'LinkedIn'        },
  { key: 'status_nome', label: 'Status'          },
  { key: 'nota',        label: 'Nota'            },
  { key: 'seller_nome', label: 'Vendedor'        },
  { key: 'catalog_nome',label: 'Catálogo'        },
  { key: 'ativo',       label: 'Ativo'           },
]

export async function toExcel(clients) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CRM Scooter'
  const ws = wb.addWorksheet('Clientes', { views: [{ state: 'frozen', ySplit: 1 }] })

  ws.columns = COLS.map(({ label, key }) => {
    const maxLen = Math.max(label.length, ...clients.map(c => String(c[key] ?? '').length))
    return { header: label, key, width: Math.min(Math.max(maxLen + 2, 10), 50) }
  })

  const headerRow = ws.getRow(1)
  headerRow.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F3460' } }
    cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF16213E' } } }
  })
  headerRow.height = 22

  clients.forEach((c, i) => {
    const values = {}
    COLS.forEach(({ key }) => {
      let val = c[key]
      if (key === 'ativo') val = val ? 'Sim' : 'Não'
      if (key === 'nota') val = val ? ['', 'Fraco', 'Médio', 'Excelente'][val] || val : ''
      values[key] = val ?? ''
    })

    const row = ws.addRow(values)
    const bgColor = i % 2 === 0 ? 'FFF0F4FF' : 'FFFFFFFF'
    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      cell.font = { size: 10, color: { argb: 'FF1A1A2E' } }
      cell.alignment = { vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFD0D9F0' } } }
    })
    row.height = 18
  })

  ws.autoFilter = { from: 'A1', to: { row: 1, column: COLS.length } }
  return wb.xlsx.writeBuffer()
}

export function toPDF(clients) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    doc.fontSize(16).font('Helvetica-Bold').text('Relatório de Clientes', { align: 'center' })
    doc.fontSize(9).font('Helvetica').text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
    doc.moveDown(0.5)

    const pdfCols = [
      { key: 'nome',        label: 'Nome',      w: 130 },
      { key: 'cidade',      label: 'Cidade',    w: 70  },
      { key: 'uf',          label: 'UF',        w: 25  },
      { key: 'whatsapp',    label: 'WhatsApp',  w: 80  },
      { key: 'email',       label: 'E-mail',    w: 110 },
      { key: 'instagram',   label: 'Instagram', w: 90  },
      { key: 'status_nome', label: 'Status',    w: 80  },
      { key: 'nota',        label: 'Nota',      w: 55  },
      { key: 'seller_nome', label: 'Vendedor',  w: 70  },
    ]

    const startX = 40
    let y = doc.y + 5

    doc.fontSize(7).font('Helvetica-Bold')
    doc.rect(startX, y, pdfCols.reduce((s, c) => s + c.w, 0), 14).fill('#1e3a5f')
    doc.fill('white')
    let x = startX
    pdfCols.forEach(col => {
      doc.text(col.label, x + 3, y + 3, { width: col.w - 6, ellipsis: true })
      x += col.w
    })
    doc.fill('black')
    y += 14

    doc.fontSize(7).font('Helvetica')
    clients.forEach((c, i) => {
      if (y > 520) { doc.addPage(); y = 40 }
      const bg = i % 2 === 0 ? '#1a1a2e' : '#16213e'
      doc.rect(startX, y, pdfCols.reduce((s, col) => s + col.w, 0), 13).fill(bg)
      doc.fill('#e2e8f0')
      x = startX
      pdfCols.forEach(col => {
        let val = c[col.key] ?? ''
        if (col.key === 'nota') val = val ? ['', 'Fraco', 'Médio', 'Excelente'][val] || val : ''
        doc.text(String(val), x + 3, y + 3, { width: col.w - 6, ellipsis: true })
        x += col.w
      })
      doc.fill('black')
      y += 13
    })

    doc.end()
  })
}
