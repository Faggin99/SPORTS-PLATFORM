// Injeta gráficos NATIVOS do Excel (OOXML) no buffer gerado pelo ExcelJS,
// usando JSZip pra manipular o zip do xlsx.
// Suporta charts do tipo 'pie' e 'barStacked'.

import JSZip from 'jszip';

const CHART_NS = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const MAIN_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const RELS_PKG_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function pieChartXml({ title, sheetName, catRange, valRange }) {
  const safeSheet = sheetName.replace(/'/g, "''");
  return `${XML_HEADER}
<c:chartSpace xmlns:c="${CHART_NS}" xmlns:a="${MAIN_NS}" xmlns:r="${REL_NS}">
  <c:chart>
    ${title ? `<c:title>
      <c:tx><c:rich>
        <a:bodyPr rot="0" spcFirstLastPara="1" vertOverflow="ellipsis" wrap="square" anchor="ctr" anchorCtr="1"/>
        <a:lstStyle/>
        <a:p>
          <a:pPr><a:defRPr sz="1400" b="1"/></a:pPr>
          <a:r><a:rPr lang="pt-BR" sz="1400" b="1"/><a:t>${escapeXml(title)}</a:t></a:r>
        </a:p>
      </c:rich></c:tx>
      <c:overlay val="0"/>
    </c:title>` : ''}
    <c:autoTitleDeleted val="${title ? 0 : 1}"/>
    <c:plotArea>
      <c:layout/>
      <c:doughnutChart>
        <c:varyColors val="1"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:dPt>
            <c:idx val="0"/><c:bubble3D val="0"/>
            <c:spPr><a:solidFill><a:srgbClr val="3B82F6"/></a:solidFill></c:spPr>
          </c:dPt>
          <c:dPt>
            <c:idx val="1"/><c:bubble3D val="0"/>
            <c:spPr><a:solidFill><a:srgbClr val="F59E0B"/></a:solidFill></c:spPr>
          </c:dPt>
          <c:dPt>
            <c:idx val="2"/><c:bubble3D val="0"/>
            <c:spPr><a:solidFill><a:srgbClr val="A855F7"/></a:solidFill></c:spPr>
          </c:dPt>
          <c:dPt>
            <c:idx val="3"/><c:bubble3D val="0"/>
            <c:spPr><a:solidFill><a:srgbClr val="10B981"/></a:solidFill></c:spPr>
          </c:dPt>
          <c:dLbls>
            <c:showLegendKey val="0"/>
            <c:showVal val="1"/>
            <c:showCatName val="0"/>
            <c:showSerName val="0"/>
            <c:showPercent val="1"/>
            <c:showBubbleSize val="0"/>
          </c:dLbls>
          <c:cat>
            <c:strRef>
              <c:f>'${safeSheet}'!${catRange}</c:f>
            </c:strRef>
          </c:cat>
          <c:val>
            <c:numRef>
              <c:f>'${safeSheet}'!${valRange}</c:f>
            </c:numRef>
          </c:val>
        </c:ser>
        <c:firstSliceAng val="0"/>
        <c:holeSize val="50"/>
      </c:doughnutChart>
    </c:plotArea>
    <c:legend>
      <c:legendPos val="r"/>
      <c:overlay val="0"/>
    </c:legend>
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
  </c:chart>
</c:chartSpace>`;
}

function stackedColumnChartXml({ title, sheetName, catRange, seriesList }) {
  // seriesList: [{ name, range, color }]
  const safeSheet = sheetName.replace(/'/g, "''");
  const seriesXml = seriesList.map((s, i) => `
    <c:ser>
      <c:idx val="${i}"/>
      <c:order val="${i}"/>
      <c:tx><c:v>${escapeXml(s.name)}</c:v></c:tx>
      <c:spPr><a:solidFill><a:srgbClr val="${s.color}"/></a:solidFill></c:spPr>
      <c:cat>
        <c:strRef><c:f>'${safeSheet}'!${catRange}</c:f></c:strRef>
      </c:cat>
      <c:val>
        <c:numRef><c:f>'${safeSheet}'!${s.range}</c:f></c:numRef>
      </c:val>
    </c:ser>`).join('');

  return `${XML_HEADER}
<c:chartSpace xmlns:c="${CHART_NS}" xmlns:a="${MAIN_NS}" xmlns:r="${REL_NS}">
  <c:chart>
    ${title ? `<c:title>
      <c:tx><c:rich>
        <a:bodyPr rot="0" anchor="ctr" anchorCtr="1"/><a:lstStyle/>
        <a:p><a:pPr><a:defRPr sz="1400" b="1"/></a:pPr>
        <a:r><a:rPr lang="pt-BR" sz="1400" b="1"/><a:t>${escapeXml(title)}</a:t></a:r></a:p>
      </c:rich></c:tx>
      <c:overlay val="0"/>
    </c:title>` : ''}
    <c:autoTitleDeleted val="${title ? 0 : 1}"/>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="col"/>
        <c:grouping val="stacked"/>
        <c:varyColors val="0"/>
        ${seriesXml}
        <c:gapWidth val="50"/>
        <c:overlap val="100"/>
        <c:axId val="111"/>
        <c:axId val="222"/>
      </c:barChart>
      <c:catAx>
        <c:axId val="111"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="b"/>
        <c:crossAx val="222"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="222"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="l"/>
        <c:crossAx val="111"/>
      </c:valAx>
    </c:plotArea>
    <c:legend>
      <c:legendPos val="b"/>
      <c:overlay val="0"/>
    </c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

function drawingXml(charts) {
  // charts: [{ from: {col, row}, to: {col, row}, relId }]
  const anchors = charts.map((c) => `
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>${c.from.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${c.from.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>${c.to.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${c.to.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr>
        <xdr:cNvPr id="${c.id || 2}" name="Chart ${c.id || 1}"/>
        <xdr:cNvGraphicFramePr/>
      </xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic>
        <a:graphicData uri="${CHART_NS}">
          <c:chart xmlns:c="${CHART_NS}" xmlns:r="${REL_NS}" r:id="${c.relId}"/>
        </a:graphicData>
      </a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>`).join('');

  return `${XML_HEADER}
<xdr:wsDr xmlns:xdr="${DRAWING_NS}" xmlns:a="${MAIN_NS}">${anchors}
</xdr:wsDr>`;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

/**
 * Adiciona um chart nativo ao buffer xlsx (vindo do ExcelJS).
 *
 * @param {ArrayBuffer} buffer - buffer do ExcelJS
 * @param {Array} chartSpecs - [{ sheetName, type, ...config }]
 *    type: 'pie' → { title, catRange, valRange, anchor: {from, to} }
 *    type: 'stackedColumn' → { title, catRange, seriesList, anchor }
 * @returns {Promise<Blob>}
 */
export async function injectNativeCharts(buffer, chartSpecs) {
  const zip = await JSZip.loadAsync(buffer);

  // Lê content types existentes
  let contentTypes = await zip.file('[Content_Types].xml').async('string');

  // Agrupa specs por sheetName
  const bySheet = new Map();
  for (const spec of chartSpecs) {
    if (!bySheet.has(spec.sheetName)) bySheet.set(spec.sheetName, []);
    bySheet.get(spec.sheetName).push(spec);
  }

  // Lê workbook.xml pra mapear nome → sheetId
  const wbXml = await zip.file('xl/workbook.xml').async('string');
  const sheetMap = new Map(); // name → { id, file }
  const sheetTagRe = /<sheet[^>]*name="([^"]+)"[^>]*sheetId="([^"]+)"[^>]*r:id="([^"]+)"/g;
  let m;
  while ((m = sheetTagRe.exec(wbXml)) !== null) {
    sheetMap.set(m[1], { sheetId: m[2], rId: m[3] });
  }

  // Lê workbook.xml.rels pra mapear rId → path
  const wbRelsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const wbRelMap = new Map(); // rId → target
  const relRe = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
  while ((m = relRe.exec(wbRelsXml)) !== null) {
    wbRelMap.set(m[1], m[2]);
  }

  let chartCounter = 1;
  let drawingCounter = 1;
  const addedTypes = new Set();

  for (const [sheetName, specs] of bySheet) {
    const sheetInfo = sheetMap.get(sheetName);
    if (!sheetInfo) { console.warn('Sheet not found:', sheetName); continue; }
    const sheetTarget = wbRelMap.get(sheetInfo.rId);
    if (!sheetTarget) { console.warn('Sheet target not found:', sheetInfo.rId); continue; }
    // sheetTarget: ex "worksheets/sheet1.xml"
    const sheetFile = `xl/${sheetTarget}`;
    const sheetBase = sheetTarget.split('/').pop().replace('.xml', ''); // ex sheet1
    const sheetRelsFile = `xl/worksheets/_rels/${sheetBase}.xml.rels`;

    // Cria ou obtém drawing pra esse sheet
    const drawingFile = `xl/drawings/drawing${drawingCounter}.xml`;
    const drawingRelsFile = `xl/drawings/_rels/drawing${drawingCounter}.xml.rels`;
    const drawingRelId = `rId${drawingCounter}drawing`;

    const chartsForDrawing = [];
    const chartRelsXml = [];

    specs.forEach((spec, i) => {
      const chartFile = `xl/charts/chart${chartCounter}.xml`;
      const chartXml = spec.type === 'pie'
        ? pieChartXml({ title: spec.title, sheetName, catRange: spec.catRange, valRange: spec.valRange })
        : stackedColumnChartXml({ title: spec.title, sheetName, catRange: spec.catRange, seriesList: spec.seriesList });
      zip.file(chartFile, chartXml);
      const relId = `rId${i + 1}`;
      chartsForDrawing.push({
        from: spec.anchor.from, to: spec.anchor.to, relId, id: chartCounter + 1,
      });
      chartRelsXml.push(`<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${chartCounter}.xml"/>`);
      addedTypes.add(`<Override PartName="/${chartFile}" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
      chartCounter++;
    });

    // Drawing.xml
    zip.file(drawingFile, drawingXml(chartsForDrawing));
    // Drawing rels
    zip.file(drawingRelsFile,
      `${XML_HEADER}\n<Relationships xmlns="${RELS_PKG_NS}">${chartRelsXml.join('')}</Relationships>`);
    addedTypes.add(`<Override PartName="/${drawingFile}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);

    // Adiciona relationship sheet → drawing
    let sheetRels;
    if (zip.file(sheetRelsFile)) {
      sheetRels = await zip.file(sheetRelsFile).async('string');
    } else {
      sheetRels = `${XML_HEADER}\n<Relationships xmlns="${RELS_PKG_NS}"></Relationships>`;
    }
    // Acha próximo Id livre
    const existing = [...sheetRels.matchAll(/Id="rId(\d+)"/g)].map((x) => +x[1]);
    const nextId = (existing.length ? Math.max(...existing) : 0) + 1;
    const drawRid = `rId${nextId}`;
    const newRel = `<Relationship Id="${drawRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingCounter}.xml"/>`;
    sheetRels = sheetRels.replace('</Relationships>', `${newRel}</Relationships>`);
    zip.file(sheetRelsFile, sheetRels);

    // Adiciona <drawing> no sheet xml
    let sheetXmlContent = await zip.file(sheetFile).async('string');
    if (!sheetXmlContent.includes('<drawing ')) {
      // Insere antes do </worksheet>
      sheetXmlContent = sheetXmlContent.replace(
        '</worksheet>',
        `<drawing r:id="${drawRid}"/></worksheet>`
      );
      zip.file(sheetFile, sheetXmlContent);
    }

    drawingCounter++;
  }

  // Atualiza [Content_Types].xml
  let newContentTypes = contentTypes;
  for (const typeXml of addedTypes) {
    if (!newContentTypes.includes(typeXml)) {
      newContentTypes = newContentTypes.replace('</Types>', `${typeXml}</Types>`);
    }
  }
  zip.file('[Content_Types].xml', newContentTypes);

  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
