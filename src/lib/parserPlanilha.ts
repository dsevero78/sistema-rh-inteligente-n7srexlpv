/**
 * Utilitário de parsing e exportação para CSV e XLSX (client-side nativo e robusto)
 */

export interface LinhaPlanilha {
  [coluna: string]: string
}

export interface ResultadoParsePlanilha {
  cabecalhos: string[]
  linhas: LinhaPlanilha[]
  totalLinhas: number
  nomeArquivo: string
  tipo: 'csv' | 'xlsx'
}

/**
 * Converte arquivo CSV em matriz de cabeçalhos e linhas.
 * Suporta separadores vírgula, ponto-e-vírgula e tabulação, além de campos com aspas e quebras de linha.
 */
export function parseCSVString(conteudo: string): {
  cabecalhos: string[]
  linhas: LinhaPlanilha[]
} {
  // Limpar BOM se existir
  const limpo = conteudo.replace(/^\uFEFF/, '').trim()
  if (!limpo) return { cabecalhos: [], linhas: [] }

  // Detectar delimitador olhando a primeira linha
  const primeiraLinha = limpo.split(/\r\n|\n|\r/)[0] || ''
  const virgulas = (primeiraLinha.match(/,/g) || []).length
  const pontoEVirgulas = (primeiraLinha.match(/;/g) || []).length
  const tabs = (primeiraLinha.match(/\t/g) || []).length

  let delimitador = ','
  if (pontoEVirgulas > virgulas && pontoEVirgulas >= tabs) {
    delimitador = ';'
  } else if (tabs > virgulas && tabs > pontoEVirgulas) {
    delimitador = '\t'
  }

  // Parser robusto com tratamento de aspas
  const linhasMatriz: string[][] = []
  let linhaAtual: string[] = []
  let campoAtual = ''
  let dentroDeAspas = false

  for (let i = 0; i < limpo.length; i++) {
    const char = limpo[i]
    const proxChar = limpo[i + 1]

    if (dentroDeAspas) {
      if (char === '"') {
        if (proxChar === '"') {
          campoAtual += '"'
          i++ // pular a aspa escapada
        } else {
          dentroDeAspas = false
        }
      } else {
        campoAtual += char
      }
    } else {
      if (char === '"') {
        dentroDeAspas = true
      } else if (char === delimitador) {
        linhaAtual.push(campoAtual.trim())
        campoAtual = ''
      } else if (char === '\r') {
        if (proxChar === '\n') {
          i++
        }
        linhaAtual.push(campoAtual.trim())
        campoAtual = ''
        if (linhaAtual.some((c) => c.length > 0)) {
          linhasMatriz.push(linhaAtual)
        }
        linhaAtual = []
      } else if (char === '\n') {
        linhaAtual.push(campoAtual.trim())
        campoAtual = ''
        if (linhaAtual.some((c) => c.length > 0)) {
          linhasMatriz.push(linhaAtual)
        }
        linhaAtual = []
      } else {
        campoAtual += char
      }
    }
  }

  // Último campo se sobrou
  if (campoAtual.length > 0 || linhaAtual.length > 0) {
    linhaAtual.push(campoAtual.trim())
    if (linhaAtual.some((c) => c.length > 0)) {
      linhasMatriz.push(linhaAtual)
    }
  }

  if (linhasMatriz.length === 0) return { cabecalhos: [], linhas: [] }

  const cabecalhos = linhasMatriz[0].map((h) => h.replace(/^["']|["']$/g, '').trim())
  const linhas: LinhaPlanilha[] = []

  for (let r = 1; r < linhasMatriz.length; r++) {
    const row = linhasMatriz[r]
    // Pular linha vazia
    if (row.length === 0 || (row.length === 1 && !row[0])) continue

    const obj: LinhaPlanilha = {}
    cabecalhos.forEach((header, idx) => {
      obj[header] = row[idx] !== undefined ? row[idx] : ''
    })
    linhas.push(obj)
  }

  return { cabecalhos, linhas }
}

/**
 * Parser client-side para XLSX descompactando XML interno via standard Web API (JSZip/Decompress ou formato XML inline).
 * Para máxima confiabilidade sem dependência externa adicional de 1MB, implementamos a leitura de arquivos
 * .xlsx lendo as células XML da planilha principal ou usando fallback para CSV/XML.
 */
export async function parseXLSXArrayBuffer(
  buffer: ArrayBuffer,
): Promise<{ cabecalhos: string[]; linhas: LinhaPlanilha[] }> {
  try {
    // Tentar decodificar se for XML ou CSV com extensão trocada
    const textDecoder = new TextDecoder('utf-8')
    const textual = textDecoder.decode(buffer.slice(0, 2048))
    if (!textual.startsWith('PK')) {
      // É um arquivo de texto/csv disfarçado
      const fullText = textDecoder.decode(buffer)
      return parseCSVString(fullText)
    }

    // Se for um arquivo ZIP (XLSX padrão da Microsoft)
    // Usaremos a descompressão manual de ZIP para extrair xl/sharedStrings.xml e xl/worksheets/sheet1.xml
    return await parseZipXLSX(buffer)
  } catch (err) {
    console.error('Falha ao parsear XLSX binário:', err)
    throw new Error(
      'Não foi possível ler o arquivo Excel. Se preferir, salve como CSV (separado por vírgula) e tente novamente.',
    )
  }
}

/**
 * Parser ZIP leve para arquivos .xlsx Office Open XML usando APIs nativas do navegador.
 * Lê o Local File Header de ZIPs padrão e descomprime com DecompressionStream('raw').
 */
async function parseZipXLSX(
  buffer: ArrayBuffer,
): Promise<{ cabecalhos: string[]; linhas: LinhaPlanilha[] }> {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  let offset = 0
  const files: Record<string, Uint8Array> = {}

  // Ler Local File Headers
  while (offset < bytes.length - 30) {
    const sig = view.getUint32(offset, true)
    if (sig !== 0x04034b50) {
      // Se não for assinatura de local file header, avança procurando
      break
    }
    const compressionMethod = view.getUint16(offset + 8, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const uncompressedSize = view.getUint32(offset + 22, true)
    const nameLen = view.getUint16(offset + 26, true)
    const extraLen = view.getUint16(offset + 28, true)

    const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen)
    const fileName = new TextDecoder().decode(nameBytes)
    const dataOffset = offset + 30 + nameLen + extraLen
    const compData = bytes.subarray(dataOffset, dataOffset + compressedSize)

    if (compressionMethod === 0) {
      // Uncompressed
      files[fileName] = compData
    } else if (compressionMethod === 8) {
      // Deflate
      try {
        if (typeof DecompressionStream !== 'undefined') {
          const ds = new DecompressionStream('deflate-raw')
          const writer = ds.writable.getWriter()
          writer.write(compData)
          writer.close()
          const chunks: Uint8Array[] = []
          const reader = ds.readable.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) chunks.push(value)
          }
          const totalLen = chunks.reduce((acc, c) => acc + c.length, 0)
          const merged = new Uint8Array(totalLen)
          let p = 0
          for (const c of chunks) {
            merged.set(c, p)
            p += c.length
          }
          files[fileName] = merged
        }
      } catch (e) {
        console.warn(`Não foi possível descompactar ${fileName}:`, e)
      }
    }

    offset = dataOffset + compressedSize
  }

  // 1. Obter sharedStrings
  const sharedStrings: string[] = []
  const ssKey = Object.keys(files).find((k) => k.toLowerCase().endsWith('sharedstrings.xml'))
  if (ssKey && files[ssKey]) {
    const ssXml = new TextDecoder().decode(files[ssKey])
    const matches = ssXml.matchAll(/<si>(.*?)<\/si>/gs)
    for (const match of matches) {
      const inner = match[1]
      // Extrair todos os <t>...</t>
      const tMatches = inner.matchAll(/<t[^>]*>(.*?)<\/t>/gs)
      let str = ''
      for (const tm of tMatches) {
        str += tm[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
      }
      sharedStrings.push(str)
    }
  }

  // 2. Obter sheet1.xml
  const sheetKey = Object.keys(files).find(
    (k) => k.toLowerCase().includes('sheet1.xml') || k.toLowerCase().includes('worksheets/sheet'),
  )
  if (!sheetKey || !files[sheetKey]) {
    throw new Error('Nenhuma planilha encontrada dentro do arquivo Excel.')
  }

  const sheetXml = new TextDecoder().decode(files[sheetKey])
  const rowMatches = sheetXml.matchAll(/<row[^>]*>(.*?)<\/row>/gs)
  const rowsMatriz: string[][] = []

  // Converte letra da coluna (A, B, AA...) em índice 0-based
  const colLetterToIndex = (ref: string): number => {
    const letters = ref.replace(/[^A-Z]/g, '')
    let index = 0
    for (let i = 0; i < letters.length; i++) {
      index = index * 26 + (letters.charCodeAt(i) - 64)
    }
    return index - 1
  }

  for (const rMatch of rowMatches) {
    const rContent = rMatch[1]
    const cMatches = rContent.matchAll(/<c\s+([^>]*?)>(.*?)<\/c>/gs)
    const currentRow: string[] = []

    for (const cMatch of cMatches) {
      const attrs = cMatch[1]
      const cellBody = cMatch[2]

      const rAttr = attrs.match(/r="([A-Z0-9]+)"/)
      const tAttr = attrs.match(/t="([a-z0-9]+)"/)
      const colIdx = rAttr ? colLetterToIndex(rAttr[1]) : currentRow.length

      let val = ''
      const vMatch = cellBody.match(/<v>(.*?)<\/v>/)
      if (vMatch) {
        const rawVal = vMatch[1]
        if (tAttr && tAttr[1] === 's') {
          // É índice do sharedStrings
          const sIdx = parseInt(rawVal, 10)
          val = sharedStrings[sIdx] || ''
        } else {
          val = rawVal
        }
      } else {
        // Tentar inlineString
        const isMatch = cellBody.match(/<t[^>]*>(.*?)<\/t>/)
        if (isMatch) val = isMatch[1]
      }

      val = val
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim()

      while (currentRow.length < colIdx) {
        currentRow.push('')
      }
      currentRow[colIdx] = val
    }

    if (currentRow.some((c) => c && c.length > 0)) {
      rowsMatriz.push(currentRow)
    }
  }

  if (rowsMatriz.length === 0) return { cabecalhos: [], linhas: [] }

  const cabecalhos = rowsMatriz[0].map((h) => h.trim())
  const linhas: LinhaPlanilha[] = []

  for (let r = 1; r < rowsMatriz.length; r++) {
    const row = rowsMatriz[r]
    const obj: LinhaPlanilha = {}
    cabecalhos.forEach((h, idx) => {
      obj[h] = row[idx] || ''
    })
    linhas.push(obj)
  }

  return { cabecalhos, linhas }
}

/**
 * Lê um arquivo File (CSV ou XLSX) e devolve a estrutura processada
 */
export async function processarArquivoPlanilha(arquivo: File): Promise<ResultadoParsePlanilha> {
  const nomeArquivo = arquivo.name
  const ext = nomeArquivo.split('.').pop()?.toLowerCase() || ''

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await arquivo.arrayBuffer()
    const { cabecalhos, linhas } = await parseXLSXArrayBuffer(buffer)
    return {
      cabecalhos,
      linhas,
      totalLinhas: linhas.length,
      nomeArquivo,
      tipo: 'xlsx',
    }
  } else {
    // CSV ou texto delimitado
    const texto = await arquivo.text()
    const { cabecalhos, linhas } = parseCSVString(texto)
    return {
      cabecalhos,
      linhas,
      totalLinhas: linhas.length,
      nomeArquivo,
      tipo: 'csv',
    }
  }
}

/**
 * Gera e dispara o download de um arquivo CSV formatado com BOM UTF-8
 */
export function baixarArquivoCSV(
  nomeArquivo: string,
  cabecalhos: string[],
  linhas: Array<Record<string, any>>,
) {
  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const cabecalhoLinha = cabecalhos.map(escapeCSV).join(';')
  const linhasTexto = linhas.map((row) => cabecalhos.map((c) => escapeCSV(row[c])).join(';'))

  const conteudo = '\uFEFF' + [cabecalhoLinha, ...linhasTexto].join('\r\n')
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
