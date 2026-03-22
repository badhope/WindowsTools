import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'

export interface ExportOptions {
  fileName: string
  sheetName?: string
}

export function exportToExcel(
  data: Record<string, any>[],
  options: ExportOptions
): void {
  if (data.length === 0) {
    throw new Error('No data to export')
  }

  const worksheet = XLSX.utils.json_to_sheet(data)

  const colWidth = Object.keys(data[0]).map(key => ({
    wch: Math.max(key.length, 20)
  }))
  worksheet['!cols'] = colWidth

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Data')

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  saveAs(blob, `${options.fileName}.xlsx`)
}

export function exportToCSV(
  data: Record<string, any>[],
  options: ExportOptions
): void {
  if (data.length === 0) {
    throw new Error('No data to export')
  }

  const worksheet = XLSX.utils.json_to_sheet(data)
  const csvContent = XLSX.utils.sheet_to_csv(worksheet)

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })

  saveAs(blob, `${options.fileName}.csv`)
}

export function exportToTSV(
  data: Record<string, any>[],
  options: ExportOptions
): void {
  if (data.length === 0) {
    throw new Error('No data to export')
  }

  const worksheet = XLSX.utils.json_to_sheet(data)
  const csvContent = XLSX.utils.sheet_to_csv(worksheet)
  const tsvContent = csvContent.replace(/,/g, '\t')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + tsvContent], { type: 'text/tab-separated-values;charset=utf-8' })

  saveAs(blob, `${options.fileName}.tsv`)
}

export function exportToJSON(
  data: Record<string, any>[],
  options: ExportOptions
): void {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' })

  saveAs(blob, `${options.fileName}.json`)
}

export function exportToHTMLTable(
  data: Record<string, any>[],
  options: ExportOptions
): void {
  if (data.length === 0) {
    throw new Error('No data to export')
  }

  const headers = Object.keys(data[0])

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.fileName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #667eea; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    tr:hover { background-color: #e8e8e8; }
    .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="title">${options.fileName}</div>
  <div class="meta">导出时间: ${new Date().toLocaleString('zh-CN')}</div>
  <table>
    <thead>
      <tr>
        ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.map(row => `
        <tr>
          ${headers.map(h => `<td>${escapeHtml(String(row[h] ?? ''))}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  saveAs(blob, `${options.fileName}.html`)
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function exportToPDF(
  data: Record<string, any>[],
  options: ExportOptions
): void {
  if (data.length === 0) {
    throw new Error('No data to export')
  }

  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text(options.fileName, 14, 22)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`导出时间: ${new Date().toLocaleString('zh-CN')}`, 14, 30)

  const headers = Object.keys(data[0])
  const startY = 40

  doc.setFontSize(8)
  doc.setTextColor(0)

  const colWidth = 180 / headers.length
  let y = startY

  doc.setFillColor(102, 126, 234)
  doc.setTextColor(255, 255, 255)

  headers.forEach((header, i) => {
    doc.rect(10 + i * colWidth, y - 5, colWidth, 8, 'F')
    doc.text(header.slice(0, 20), 12 + i * colWidth, y)
  })

  y += 8
  doc.setTextColor(0)

  data.forEach((row, rowIndex) => {
    if (y > 280) {
      doc.addPage()
      y = 20
    }

    if (rowIndex % 2 === 0) {
      doc.setFillColor(245, 245, 245)
      doc.rect(10, y - 5, 180, 7, 'F')
    }

    headers.forEach((header, i) => {
      const value = String(row[header] ?? '').slice(0, 25)
      doc.text(value, 12 + i * colWidth, y)
    })

    y += 7
  })

  doc.save(`${options.fileName}.pdf`)
}

export function exportToMarkdown(
  data: Record<string, any>[],
  options: ExportOptions
): void {
  if (data.length === 0) {
    throw new Error('No data to export')
  }

  const headers = Object.keys(data[0])

  let md = `# ${options.fileName}\n\n`
  md += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`

  md += `## 数据表格\n\n`
  md += `| ${headers.join(' | ')} |\n`
  md += `| ${headers.map(() => '---').join(' | ')} |\n`

  data.forEach(row => {
    md += `| ${headers.map(h => escapeMarkdown(String(row[h] ?? ''))).join(' | ')} |\n`
  })

  md += `\n\n---\n\n*由 VisualSpider 导出*\n`

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  saveAs(blob, `${options.fileName}.md`)
}

function escapeMarkdown(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ').replace(/\[/g, '\\[').replace(/\]/g, '\\]')
}

export function exportToXML(
  data: Record<string, any>[],
  options: ExportOptions
): void {
  if (data.length === 0) {
    throw new Error('No data to export')
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<${toTagName(options.fileName)}>\n`

  data.forEach((item, index) => {
    xml += `  <item index="${index + 1}">\n`
    Object.entries(item).forEach(([key, value]) => {
      const tag = toTagName(key)
      const content = String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      xml += `    <${tag}>${content}</${tag}>\n`
    })
    xml += `  </item>\n`
  })

  xml += `</${toTagName(options.fileName)}>\n`

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
  saveAs(blob, `${options.fileName}.xml`)
}

function toTagName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'item'
}

export function batchExport(
  data: Record<string, any>[],
  fileName: string,
  formats: ('xlsx' | 'csv' | 'json' | 'html' | 'pdf' | 'md' | 'tsv' | 'xml')[]
): void {
  for (const format of formats) {
    try {
      switch (format) {
        case 'xlsx':
          exportToExcel(data, { fileName })
          break
        case 'csv':
          exportToCSV(data, { fileName })
          break
        case 'json':
          exportToJSON(data, { fileName })
          break
        case 'html':
          exportToHTMLTable(data, { fileName })
          break
        case 'pdf':
          exportToPDF(data, { fileName })
          break
        case 'md':
          exportToMarkdown(data, { fileName })
          break
        case 'tsv':
          exportToTSV(data, { fileName })
          break
        case 'xml':
          exportToXML(data, { fileName })
          break
      }
    } catch (error) {
      console.error(`Failed to export ${format}:`, error)
    }
  }
}
