import 'server-only'

import JSZip from 'jszip'

import { chartXml, drawingRelsXml, drawingXml, type ChartSpec } from './charts'

/**
 * Mete gráficas nativas en un .xlsx ya generado por ExcelJS.
 *
 * Un .xlsx es un ZIP de XML. ExcelJS produce las hojas y el formato, pero no
 * sabe de gráficas, así que aquí se añaden las partes que faltan y se
 * enlazan: chart → drawing → hoja → content types. Si alguna de esas cuatro
 * referencias falla, Excel declara el archivo dañado, de ahí que se toquen
 * todas de forma coordinada.
 *
 * @param buffer  el .xlsx tal como lo escribió ExcelJS
 * @param bySheet gráficas por hoja, indexadas por su posición (1 = primera)
 */
export async function injectCharts(
  buffer: ArrayBuffer | Buffer,
  bySheet: Map<number, ChartSpec[]>,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer)

  const contentTypesPath = '[Content_Types].xml'
  let contentTypes = await zip.file(contentTypesPath)!.async('string')

  let chartSeq = 0
  let drawingSeq = 0
  const overrides: string[] = []

  for (const [sheetIndex, specs] of [...bySheet.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    if (specs.length === 0) continue

    const sheetPath = `xl/worksheets/sheet${sheetIndex}.xml`
    const sheetFile = zip.file(sheetPath)
    if (!sheetFile) continue

    drawingSeq += 1
    const drawingFile = `drawing${drawingSeq}.xml`
    const chartFiles: string[] = []

    // 1. Una parte por gráfica.
    for (const spec of specs) {
      chartSeq += 1
      const file = `chart${chartSeq}.xml`
      zip.file(`xl/charts/${file}`, chartXml(spec))
      chartFiles.push(file)
      overrides.push(
        `<Override PartName="/xl/charts/${file}" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`,
      )
    }

    // 2. El dibujo que las coloca, y sus relaciones hacia cada gráfica.
    zip.file(`xl/drawings/${drawingFile}`, drawingXml(specs))
    zip.file(
      `xl/drawings/_rels/${drawingFile}.rels`,
      drawingRelsXml(chartFiles),
    )
    overrides.push(
      `<Override PartName="/xl/drawings/${drawingFile}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
    )

    // 3. La hoja apunta al dibujo. Puede que ya tenga relaciones propias
    //    (hipervínculos, por ejemplo), así que se toma el siguiente rId libre.
    const relsPath = `xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`
    const existing = zip.file(relsPath)
    let relsXml = existing
      ? await existing.async('string')
      : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`

    const usados = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) =>
      Number(m[1]),
    )
    const relId = `rId${(usados.length ? Math.max(...usados) : 0) + 1}`

    relsXml = relsXml.replace(
      '</Relationships>',
      `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/${drawingFile}"/></Relationships>`,
    )
    zip.file(relsPath, relsXml)

    // 4. Y la hoja declara el dibujo. Va al final del elemento: en el esquema
    //    <drawing> es de los últimos hijos válidos de <worksheet>.
    let sheetXml = await sheetFile.async('string')
    sheetXml = sheetXml.replace(
      '</worksheet>',
      `<drawing r:id="${relId}"/></worksheet>`,
    )
    zip.file(sheetPath, sheetXml)
  }

  // 5. Declarar los tipos de todas las partes nuevas.
  if (overrides.length > 0) {
    contentTypes = contentTypes.replace(
      '</Types>',
      `${overrides.join('')}</Types>`,
    )
    zip.file(contentTypesPath, contentTypes)
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}
