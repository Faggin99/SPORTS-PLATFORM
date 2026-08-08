import { useMemo } from 'react';
import { Group, Rect, Line, Circle, Arc, Shape } from 'react-konva';
import { FIELD_TYPES, FOOTBALL_11_FIELD, FOOTBALL_7_FIELD, FUTSAL_FIELD, FIELD_VIEWS, toPixel } from '../../utils/fieldDimensions';

// Gramado com listras (mais saturado, listras sutis)
function GrassStripes({ width, height, stripeCount = 14 }) {
  const stripeWidth = width / stripeCount;
  return (
    <Group>
      <Rect x={0} y={0} width={width} height={height} fill="#2f7d3a" />
      {Array.from({ length: stripeCount }, (_, i) => (
        i % 2 === 1 && (
          <Rect
            key={`stripe-${i}`}
            x={stripeWidth * i}
            y={0}
            width={stripeWidth}
            height={height}
            fill="#369342"
          />
        )
      ))}
      {/* Brilho sutil no topo simulando luz dos refletores */}
      <Rect x={0} y={0} width={width} height={height * 0.35} fill="rgba(255,255,255,0.04)" />
      {/* Sombra leve no rodapé pra dar profundidade */}
      <Rect x={0} y={height * 0.7} width={width} height={height * 0.3} fill="rgba(0,0,0,0.08)" />
    </Group>
  );
}

// Piso emborrachado azul-cobalto estilo Sportcourt indoor (quadra moderna de futsal).
// Base sólida + microtextura de poros via createPattern nativo do canvas + vinheta radial.
// Total: 3 nós Konva, escala em qualquer tamanho sem perder qualidade.
function CourtRubber({ width, height }) {
  // patternCanvas 8x8 — gerado UMA UNICA vez por instância (memo).
  const patternCanvas = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 8;
    const pctx = c.getContext('2d');
    // Ponto claro (highlight do poro do PVC)
    pctx.fillStyle = 'rgba(255,255,255,0.05)';
    pctx.beginPath();
    pctx.arc(2, 2, 0.6, 0, Math.PI * 2);
    pctx.fill();
    // Ponto escuro (sombra do poro)
    pctx.fillStyle = 'rgba(0,0,0,0.08)';
    pctx.beginPath();
    pctx.arc(6, 6, 0.6, 0, Math.PI * 2);
    pctx.fill();
    return c;
  }, []);

  return (
    <Group listening={false}>
      {/* Camada 1 — Base sólida cobalto fosca */}
      <Rect x={0} y={0} width={width} height={height} fill="#1E5AA8" listening={false} />

      {/* Camada 2 — Microtextura de poros via createPattern nativo (1 nó Konva) */}
      <Shape
        x={0}
        y={0}
        width={width}
        height={height}
        listening={false}
        perfectDrawEnabled={false}
        sceneFunc={(ctx, shape) => {
          if (!patternCanvas) return;
          const w = shape.width();
          const h = shape.height();
          const pattern = ctx.createPattern(patternCanvas, 'repeat');
          if (!pattern) return;
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, w, h);
          ctx.fillStrokeShape(shape);
        }}
      />

      {/* Camada 3 — Vinheta radial cenital (iluminação de ginásio) */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillRadialGradientStartPoint={{ x: width / 2, y: height / 2 }}
        fillRadialGradientStartRadius={Math.min(width, height) * 0.15}
        fillRadialGradientEndPoint={{ x: width / 2, y: height / 2 }}
        fillRadialGradientEndRadius={Math.max(width, height) * 0.7}
        fillRadialGradientColorStops={[
          0, 'rgba(255,255,255,0.05)',
          1, 'rgba(0,0,0,0.15)',
        ]}
        listening={false}
      />
    </Group>
  );
}

// Gol — caixa branca semi-transparente, traves grossas, rede com padrão denso
function GoalBox({ x, y, width, height, side = 'left' }) {
  const netLines = [];
  const spacing = 3.5;
  // Vertical
  for (let i = 0; i <= Math.abs(width); i += spacing) {
    const lx = side === 'left' ? x + i : x + width - i;
    netLines.push(<Line key={`v-${i}`} points={[lx, y, lx, y + height]} stroke="rgba(255,255,255,0.35)" strokeWidth={0.5} />);
  }
  // Horizontal
  for (let i = 0; i <= height; i += spacing) {
    netLines.push(<Line key={`h-${i}`} points={[x, y + i, x + width, y + i]} stroke="rgba(255,255,255,0.35)" strokeWidth={0.5} />);
  }
  return (
    <Group>
      {/* Fundo da rede (área cinza-claro) */}
      <Rect x={x} y={y} width={width} height={height} fill="rgba(220,225,235,0.55)" />
      {/* Padrão da rede */}
      {netLines}
      {/* Traves (4 lados — grosso na trave da linha de fundo) */}
      <Rect
        x={x} y={y} width={width} height={height}
        stroke="#ffffff" strokeWidth={2.6} fill="transparent"
        shadowColor="rgba(0,0,0,0.6)" shadowBlur={4} shadowOpacity={0.45} shadowOffsetX={side === 'left' ? -1 : 1} shadowOffsetY={1}
      />
      {/* Linha extra na "linha de fundo" do gol pra deixar visível */}
      <Line
        points={side === 'left'
          ? [x, y, x, y + height]
          : [x + width, y, x + width, y + height]}
        stroke="#ffffff" strokeWidth={3.2}
      />
    </Group>
  );
}

// Render genérico de campo retangular (F11 ou F7). Mesma estrutura, só muda o dataset.
function RectangularField({ fieldData, width, height, fieldView = FIELD_VIEWS.FULL, hasPenaltyArc = true }) {
  const f = fieldData;
  const lineColor = '#ffffff';
  const lineWidth = 1.7;

  let scaleX = 1;
  let offsetX = 0;
  let renderWidth = width;
  if (fieldView === FIELD_VIEWS.LEFT_HALF)   { scaleX = 2; renderWidth = width * 2; }
  else if (fieldView === FIELD_VIEWS.RIGHT_HALF)  { scaleX = 2; offsetX = -width;     renderWidth = width * 2; }
  else if (fieldView === FIELD_VIEWS.THIRD_LEFT)  { scaleX = 3; renderWidth = width * 3; }
  else if (fieldView === FIELD_VIEWS.THIRD_RIGHT) { scaleX = 3; offsetX = -width * 2; renderWidth = width * 3; }

  const px = (pct) => toPixel(pct, renderWidth);
  const py = (pct) => toPixel(pct, height);
  void scaleX;

  const isPartialView = fieldView !== FIELD_VIEWS.FULL;
  // Clip só quando é vista parcial (pra esconder o resto do campo). No full,
  // sem clip pra os gols externos (x: -2, x: 100) aparecerem.
  const clipProps = isPartialView
    ? { clipX: 0, clipY: 0, clipWidth: width, clipHeight: height }
    : {};

  return (
    <Group {...clipProps}>
      <Group x={offsetX}>
        <GrassStripes width={renderWidth} height={height} stripeCount={14} />

        {/* Sombra interna pra valorizar o campo */}
        <Rect x={0} y={0} width={renderWidth} height={height} stroke="rgba(0,0,0,0.4)" strokeWidth={3} fill="transparent" />

        {/* Borda externa */}
        <Rect x={0} y={0} width={renderWidth} height={height} stroke={lineColor} strokeWidth={lineWidth + 0.5} fill="transparent" />

        <Line points={[px(f.centerLine.x1), py(f.centerLine.y1), px(f.centerLine.x2), py(f.centerLine.y2)]} stroke={lineColor} strokeWidth={lineWidth} />
        <Circle x={px(f.centerCircle.cx)} y={py(f.centerCircle.cy)} radius={py(f.centerCircle.radius)} stroke={lineColor} strokeWidth={lineWidth} fill="transparent" />
        <Circle x={px(f.centerSpot.cx)} y={py(f.centerSpot.cy)} radius={3} fill={lineColor} />

        <Rect x={px(f.leftPenaltyArea.x)} y={py(f.leftPenaltyArea.y)} width={px(f.leftPenaltyArea.width)} height={py(f.leftPenaltyArea.height)} stroke={lineColor} strokeWidth={lineWidth} fill="transparent" />
        <Rect x={px(f.rightPenaltyArea.x)} y={py(f.rightPenaltyArea.y)} width={px(f.rightPenaltyArea.width)} height={py(f.rightPenaltyArea.height)} stroke={lineColor} strokeWidth={lineWidth} fill="transparent" />
        <Rect x={px(f.leftGoalArea.x)}    y={py(f.leftGoalArea.y)}    width={px(f.leftGoalArea.width)}    height={py(f.leftGoalArea.height)}    stroke={lineColor} strokeWidth={lineWidth} fill="transparent" />
        <Rect x={px(f.rightGoalArea.x)}   y={py(f.rightGoalArea.y)}   width={px(f.rightGoalArea.width)}   height={py(f.rightGoalArea.height)}   stroke={lineColor} strokeWidth={lineWidth} fill="transparent" />

        <Circle x={px(f.leftPenaltySpot.cx)}  y={py(f.leftPenaltySpot.cy)}  radius={3} fill={lineColor} />
        <Circle x={px(f.rightPenaltySpot.cx)} y={py(f.rightPenaltySpot.cy)} radius={3} fill={lineColor} />

        {hasPenaltyArc && f.leftPenaltyArc && (
          <Arc x={px(f.leftPenaltyArc.cx)}  y={py(f.leftPenaltyArc.cy)}  innerRadius={py(f.leftPenaltyArc.radius)}  outerRadius={py(f.leftPenaltyArc.radius)}  angle={f.leftPenaltyArc.endAngle - f.leftPenaltyArc.startAngle}  rotation={f.leftPenaltyArc.startAngle}  stroke={lineColor} strokeWidth={lineWidth} />
        )}
        {hasPenaltyArc && f.rightPenaltyArc && (
          <Arc x={px(f.rightPenaltyArc.cx)} y={py(f.rightPenaltyArc.cy)} innerRadius={py(f.rightPenaltyArc.radius)} outerRadius={py(f.rightPenaltyArc.radius)} angle={f.rightPenaltyArc.endAngle - f.rightPenaltyArc.startAngle} rotation={f.rightPenaltyArc.startAngle} stroke={lineColor} strokeWidth={lineWidth} />
        )}

        {[
          { x: 0,           y: 0,      rotation: 0 },
          { x: renderWidth, y: 0,      rotation: 90 },
          { x: renderWidth, y: height, rotation: 180 },
          { x: 0,           y: height, rotation: 270 },
        ].map((corner, i) => (
          <Arc key={`corner-${i}`} x={corner.x} y={corner.y} innerRadius={py(f.cornerRadius)} outerRadius={py(f.cornerRadius)} angle={90} rotation={corner.rotation} stroke={lineColor} strokeWidth={lineWidth} />
        ))}

        {/* Gols (visíveis, com profundidade) */}
        <GoalBox x={px(f.leftGoal.x)}  y={py(f.leftGoal.y)}  width={px(f.leftGoal.width)}  height={py(f.leftGoal.height)}  side="left" />
        <GoalBox x={px(f.rightGoal.x)} y={py(f.rightGoal.y)} width={px(f.rightGoal.width)} height={py(f.rightGoal.height)} side="right" />
      </Group>
    </Group>
  );
}

function FutsalField({ width, height, fieldView = FIELD_VIEWS.FULL }) {
  const f = FUTSAL_FIELD;
  const lineColor = '#ffffff';
  const lineWidth = 1.7;

  let offsetX = 0;
  let renderWidth = width;
  if (fieldView === FIELD_VIEWS.LEFT_HALF)   { renderWidth = width * 2; }
  else if (fieldView === FIELD_VIEWS.RIGHT_HALF)  { renderWidth = width * 2; offsetX = -width; }
  else if (fieldView === FIELD_VIEWS.THIRD_LEFT)  { renderWidth = width * 3; }
  else if (fieldView === FIELD_VIEWS.THIRD_RIGHT) { renderWidth = width * 3; offsetX = -width * 2; }

  const px = (pct) => toPixel(pct, renderWidth);
  const py = (pct) => toPixel(pct, height);

  const isPartialView = fieldView !== FIELD_VIEWS.FULL;
  const clipProps = isPartialView
    ? { clipX: 0, clipY: 0, clipWidth: width, clipHeight: height }
    : {};

  return (
    <Group {...clipProps}>
      <Group x={offsetX}>
        <CourtRubber width={renderWidth} height={height} />

        {/* Sombra interna suavizada — sobre cobalto fosco fica leve */}
        <Rect x={0} y={0} width={renderWidth} height={height} stroke="rgba(0,0,0,0.25)" strokeWidth={3} fill="transparent" listening={false} />
        <Rect x={0} y={0} width={renderWidth} height={height} stroke={lineColor} strokeWidth={lineWidth + 0.5} fill="transparent" />

        <Line points={[px(f.centerLine.x1), py(f.centerLine.y1), px(f.centerLine.x2), py(f.centerLine.y2)]} stroke={lineColor} strokeWidth={lineWidth} />
        <Circle x={px(f.centerCircle.cx)} y={py(f.centerCircle.cy)} radius={py(f.centerCircle.radius)} stroke={lineColor} strokeWidth={lineWidth} fill="transparent" />
        <Circle x={px(f.centerSpot.cx)} y={py(f.centerSpot.cy)} radius={3} fill={lineColor} />

        <Arc x={px(f.leftPenaltyArea.cx)}  y={py(f.leftPenaltyArea.cy)}  innerRadius={py(f.leftPenaltyArea.radius)}  outerRadius={py(f.leftPenaltyArea.radius)}  angle={180} rotation={-90} stroke={lineColor} strokeWidth={lineWidth} />
        <Arc x={px(f.rightPenaltyArea.cx)} y={py(f.rightPenaltyArea.cy)} innerRadius={py(f.rightPenaltyArea.radius)} outerRadius={py(f.rightPenaltyArea.radius)} angle={180} rotation={90}  stroke={lineColor} strokeWidth={lineWidth} />

        <Circle x={px(f.leftPenaltySpot.cx)}        y={py(f.leftPenaltySpot.cy)}        radius={3} fill={lineColor} />
        <Circle x={px(f.rightPenaltySpot.cx)}       y={py(f.rightPenaltySpot.cy)}       radius={3} fill={lineColor} />
        <Circle x={px(f.leftSecondPenaltySpot.cx)}  y={py(f.leftSecondPenaltySpot.cy)}  radius={3} fill={lineColor} />
        <Circle x={px(f.rightSecondPenaltySpot.cx)} y={py(f.rightSecondPenaltySpot.cy)} radius={3} fill={lineColor} />

        {[
          { x: 0,           y: 0,      rotation: 0 },
          { x: renderWidth, y: 0,      rotation: 90 },
          { x: renderWidth, y: height, rotation: 180 },
          { x: 0,           y: height, rotation: 270 },
        ].map((corner, i) => (
          <Arc key={`corner-${i}`} x={corner.x} y={corner.y} innerRadius={py(f.cornerRadius)} outerRadius={py(f.cornerRadius)} angle={90} rotation={corner.rotation} stroke={lineColor} strokeWidth={lineWidth} />
        ))}

        <GoalBox x={px(f.leftGoal.x)}  y={py(f.leftGoal.y)}  width={px(f.leftGoal.width)}  height={py(f.leftGoal.height)}  side="left" />
        <GoalBox x={px(f.rightGoal.x)} y={py(f.rightGoal.y)} width={px(f.rightGoal.width)} height={py(f.rightGoal.height)} side="right" />
      </Group>
    </Group>
  );
}

export default function FieldBackground({ fieldType, width, height, fieldView = FIELD_VIEWS.FULL }) {
  if (fieldType === FIELD_TYPES.FUTSAL) {
    return <FutsalField width={width} height={height} fieldView={fieldView} />;
  }
  if (fieldType === FIELD_TYPES.FOOTBALL_7) {
    return <RectangularField fieldData={FOOTBALL_7_FIELD} width={width} height={height} fieldView={fieldView} hasPenaltyArc={false} />;
  }
  return <RectangularField fieldData={FOOTBALL_11_FIELD} width={width} height={height} fieldView={fieldView} hasPenaltyArc={true} />;
}
