import 'server-only'

/**
 * Gráficas NATIVAS de Excel.
 *
 * ExcelJS no sabe crear gráficas (es una petición abierta desde hace años),
 * y ninguna librería de JS lo hace de forma fiable. Un .xlsx es un ZIP de
 * XML, así que aquí se generan a mano las partes que definen una gráfica y
 * después se inyectan en el archivo que produjo ExcelJS.
 *
 * Se generan gráficas de verdad —editables, con sus datos vinculados a las
 * celdas— y no imágenes: al tocar los números en la hoja, la gráfica cambia.
 *
 * Formato: ECMA-376 (SpreadsheetML + DrawingML).
 */

const NS_C = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

export type ChartKind = 'pie' | 'bar'

export interface ChartSpec {
  kind: ChartKind
  title: string
  /** Hoja donde viven los datos. */
  sheet: string
  /** Fila del encabezado de la serie (1-indexada). */
  headerRow: number
  /** Primera y última fila de datos (1-indexadas). */
  firstRow: number
  lastRow: number
  /** Columna de las etiquetas y de los valores, en letra. */
  labelCol: string
  valueCol: string
  /** Celda superior izquierda donde se ancla, 0-indexada. */
  anchor: { col: number; row: number }
  /** Colores por punto, en hex sin '#'. Solo se usan en las de pastel. */
  colors?: string[]
}

/** Escapa texto para XML. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Referencia a un rango. El nombre de hoja se cita siempre: los nuestros
 * llevan espacios y acentos, y sin comillas Excel rechaza el archivo.
 */
function ref(sheet: string, col: string, from: number, to?: number): string {
  const name = `'${sheet.replace(/'/g, "''")}'`
  return to === undefined
    ? `${name}!$${col}$${from}`
    : `${name}!$${col}$${from}:$${col}$${to}`
}

function titleXml(text: string): string {
  return `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr><a:r><a:rPr lang="es-MX" sz="1200" b="1"/><a:t>${esc(
    text,
  )}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`
}

/** Un punto coloreado — así el pastel respeta los colores de la app. */
function dPtXml(colors: string[]): string {
  return colors
    .map(
      (hex, i) =>
        `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${hex
          .replace('#', '')
          .toUpperCase()}"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`,
    )
    .join('')
}

function seriesXml(spec: ChartSpec, withColors: boolean): string {
  const cat = ref(spec.sheet, spec.labelCol, spec.firstRow, spec.lastRow)
  const val = ref(spec.sheet, spec.valueCol, spec.firstRow, spec.lastRow)
  const name = ref(spec.sheet, spec.valueCol, spec.headerRow)

  return `<c:ser><c:idx val="0"/><c:order val="0"/>
    <c:tx><c:strRef><c:f>${name}</c:f></c:strRef></c:tx>
    ${withColors && spec.colors?.length ? dPtXml(spec.colors) : ''}
    <c:cat><c:strRef><c:f>${cat}</c:f></c:strRef></c:cat>
    <c:val><c:numRef><c:f>${val}</c:f></c:numRef></c:val>
  </c:ser>`
}

function pieChartXml(spec: ChartSpec): string {
  return `<c:pieChart><c:varyColors val="1"/>${seriesXml(spec, true)}
    <c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>
    <c:firstSliceAng val="0"/></c:pieChart>`
}

function barChartXml(spec: ChartSpec): string {
  // Ejes: obligatorios en barChart. Sin ellos Excel marca el archivo dañado.
  return `<c:barChart><c:barDir val="bar"/><c:grouping val="clustered"/><c:varyColors val="0"/>
    ${seriesXml(spec, false)}
    <c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>
    <c:gapWidth val="60"/><c:axId val="111111111"/><c:axId val="222222222"/></c:barChart>
    <c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="maxMin"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="222222222"/></c:catAx>
    <c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:majorGridlines/><c:numFmt formatCode="General" sourceLinked="1"/><c:crossAx val="111111111"/></c:valAx>`
}

/** chart{n}.xml — la definición de una gráfica. */
export function chartXml(spec: ChartSpec): string {
  const plot = spec.kind === 'pie' ? pieChartXml(spec) : barChartXml(spec)
  const legend =
    spec.kind === 'pie'
      ? '<c:legend><c:legendPos val="r"/><c:overlay val="0"/></c:legend>'
      : ''

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${NS_C}" xmlns:a="${NS_A}" xmlns:r="${NS_R}">
  <c:chart>
    ${titleXml(spec.title)}
    <c:plotArea><c:layout/>${plot}</c:plotArea>
    ${legend}
    <c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/>
  </c:chart>
</c:chartSpace>`
}

/** drawing{n}.xml — dónde y de qué tamaño va cada gráfica en la hoja. */
export function drawingXml(specs: ChartSpec[]): string {
  const anchors = specs
    .map((spec, i) => {
      const { col, row } = spec.anchor
      return `<xdr:twoCellAnchor editAs="oneCell">
      <xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
      <xdr:to><xdr:col>${col + 8}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row + 18}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
      <xdr:graphicFrame macro="">
        <xdr:nvGraphicFramePr>
          <xdr:cNvPr id="${i + 2}" name="Gráfica ${i + 1}"/>
          <xdr:cNvGraphicFramePr/>
        </xdr:nvGraphicFramePr>
        <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
        <a:graphic><a:graphicData uri="${NS_C}">
          <c:chart xmlns:c="${NS_C}" xmlns:r="${NS_R}" r:id="rId${i + 1}"/>
        </a:graphicData></a:graphic>
      </xdr:graphicFrame>
      <xdr:clientData/>
    </xdr:twoCellAnchor>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="${NS_A}">
${anchors}
</xdr:wsDr>`
}

/** drawing{n}.xml.rels — enlaza cada anclaje con su chart. */
export function drawingRelsXml(chartFiles: string[]): string {
  const rels = chartFiles
    .map(
      (file, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/${file}"/>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`
}
