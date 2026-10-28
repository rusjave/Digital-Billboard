import { readFileSync, writeFileSync } from 'node:fs'

const input = new URL('../USER_MANUAL.md', import.meta.url)
const output = new URL('../USER_MANUAL.pdf', import.meta.url)
const source = readFileSync(input, 'utf8')
  .replaceAll('—', '-')
  .replaceAll('“', '"')
  .replaceAll('”', '"')
  .replaceAll('₱', 'PHP ')

const escapePdfText = (text) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
const wrap = (text, width = 88) => {
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  words.forEach(word => {
    const next = line ? `${line} ${word}` : word
    if (next.length > width && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  })
  if (line) lines.push(line)
  return lines
}

const lines = []
source.split(/\r?\n/).forEach(rawLine => {
  const line = rawLine.trim()
  if (!line) {
    lines.push({ text: '', size: 10 })
  } else if (line.startsWith('# ')) {
    lines.push({ text: line.slice(2), size: 18, bold: true })
    lines.push({ text: '', size: 10 })
  } else if (line.startsWith('## ')) {
    lines.push({ text: line.slice(3), size: 13, bold: true })
  } else {
    const text = line.replace(/\*\*/g, '')
    wrap(text).forEach(part => lines.push({ text: part, size: 10 }))
  }
})

const pageLineCount = 48
const pages = Array.from({ length: Math.ceil(lines.length / pageLineCount) }, (_, index) => lines.slice(index * pageLineCount, (index + 1) * pageLineCount))
const objects = []
const addObject = (body) => {
  objects.push(body)
  return objects.length
}

const catalogId = addObject('')
const pagesId = addObject('')
const regularFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')
const pageIds = []

pages.forEach(pageLines => {
  const commands = ['BT', '50 790 Td']
  pageLines.forEach(({ text, size, bold }) => {
    commands.push(`/${bold ? 'F2' : 'F1'} ${size} Tf`)
    commands.push(`(${escapePdfText(text)}) Tj`)
    commands.push('0 -15 Td')
  })
  commands.push('ET')
  const stream = commands.join('\n')
  const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`)
  pageIds.push(addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`))
})

objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

let pdf = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n'
const offsets = [0]
objects.forEach((body, index) => {
  offsets.push(Buffer.byteLength(pdf, 'binary'))
  pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
})
const xrefOffset = Buffer.byteLength(pdf, 'binary')
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

writeFileSync(output, pdf, 'binary')
console.log(`Created ${output.pathname}`)
