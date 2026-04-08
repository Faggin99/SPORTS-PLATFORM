import { Group, Rect, Line, Circle, Arc, Shape } from 'react-konva';
import { FIELD_TYPES, FOOTBALL_11_FIELD, FUTSAL_FIELD, FIELD_VIEWS, toPixel } from '../../utils/fieldDimensions';

// Grass stripe pattern for football
function GrassStripes({ width, height, stripeCount = 12, baseColor = '#2d8a4e', altColor = '#339155' }) {
  const stripeWidth = width / stripeCount;
  return (
    <Group>
      <Rect x={0} y={0} width={width} height={height} fill={baseColor} />
      {Array.from({ length: stripeCount }, (_, i) => (
        i % 2 === 1 && (
          <Rect
            key={`stripe-${i}`}
            x={stripeWidth * i}
            y={0}
            width={stripeWidth}
            height={height}
            fill={altColor}
          />
        )
      ))}
    </Group>
  );
}

// Court surface for futsal (wooden look)
function CourtSurface({ width, height }) {
  return (
    <Group>
      <Rect x={0} y={0} width={width} height={height} fill="#c88a3e" />
      {/* Wood plank lines */}
      {Array.from({ length: Math.ceil(height / 18) }, (_, i) => (
        <Line
          key={`plank-${i}`}
          points={[0, i * 18, width, i * 18]}
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={0.5}
        />
      ))}
      {/* Slight color variation */}
      {Array.from({ length: 8 }, (_, i) => (
        <Rect
          key={`var-${i}`}
          x={width / 8 * i}
          y={0}
          width={width / 8}
          height={height}
          fill={i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)'}
        />
      ))}
    </Group>
  );
}

// Goal net pattern
function GoalNet({ x, y, width, height, side = 'left' }) {
  const netLines = [];
  const spacing = 4;
  // Vertical lines
  for (let i = 0; i <= Math.abs(width); i += spacing) {
    const lx = side === 'left' ? x + i : x + width - i;
    netLines.push(
      <Line
        key={`v-${i}`}
        points={[lx, y, lx, y + height]}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={0.5}
      />
    );
  }
  // Horizontal lines
  for (let i = 0; i <= height; i += spacing) {
    netLines.push(
      <Line
        key={`h-${i}`}
        points={[x, y + i, x + width, y + i]}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={0.5}
      />
    );
  }
  return (
    <Group>
      <Rect x={x} y={y} width={width} height={height} fill="rgba(255,255,255,0.08)" />
      {netLines}
    </Group>
  );
}

function Football11Field({ width, height, fieldView = FIELD_VIEWS.FULL }) {
  const f = FOOTBALL_11_FIELD;
  const lineColor = 'rgba(255, 255, 255, 0.85)';
  const lineWidth = 1.5;

  // For half-field views, we scale and clip
  let scaleX = 1;
  let offsetX = 0;
  let clipX = 0;
  let clipW = width;
  let renderWidth = width;

  if (fieldView === FIELD_VIEWS.LEFT_HALF) {
    scaleX = 2;
    renderWidth = width * 2;
  } else if (fieldView === FIELD_VIEWS.RIGHT_HALF) {
    scaleX = 2;
    offsetX = -width;
    renderWidth = width * 2;
  } else if (fieldView === FIELD_VIEWS.THIRD_LEFT) {
    scaleX = 3;
    renderWidth = width * 3;
  } else if (fieldView === FIELD_VIEWS.THIRD_RIGHT) {
    scaleX = 3;
    offsetX = -width * 2;
    renderWidth = width * 3;
  }

  const px = (pct) => toPixel(pct, renderWidth);
  const py = (pct) => toPixel(pct, height);

  return (
    <Group clipX={0} clipY={0} clipWidth={width} clipHeight={height}>
      <Group x={offsetX}>
        {/* Grass */}
        <GrassStripes width={renderWidth} height={height} stripeCount={12} />

        {/* Outer boundary */}
        <Rect
          x={0} y={0} width={renderWidth} height={height}
          stroke={lineColor} strokeWidth={lineWidth + 0.5} fill="transparent"
        />

        {/* Center line */}
        <Line
          points={[px(f.centerLine.x1), py(f.centerLine.y1), px(f.centerLine.x2), py(f.centerLine.y2)]}
          stroke={lineColor} strokeWidth={lineWidth}
        />

        {/* Center circle */}
        <Circle
          x={px(f.centerCircle.cx)} y={py(f.centerCircle.cy)}
          radius={py(f.centerCircle.radius)}
          stroke={lineColor} strokeWidth={lineWidth} fill="transparent"
        />

        {/* Center spot */}
        <Circle
          x={px(f.centerSpot.cx)} y={py(f.centerSpot.cy)}
          radius={3} fill={lineColor}
        />

        {/* Left penalty area */}
        <Rect
          x={px(f.leftPenaltyArea.x)} y={py(f.leftPenaltyArea.y)}
          width={px(f.leftPenaltyArea.width)} height={py(f.leftPenaltyArea.height)}
          stroke={lineColor} strokeWidth={lineWidth} fill="transparent"
        />

        {/* Right penalty area */}
        <Rect
          x={px(f.rightPenaltyArea.x)} y={py(f.rightPenaltyArea.y)}
          width={px(f.rightPenaltyArea.width)} height={py(f.rightPenaltyArea.height)}
          stroke={lineColor} strokeWidth={lineWidth} fill="transparent"
        />

        {/* Left goal area */}
        <Rect
          x={px(f.leftGoalArea.x)} y={py(f.leftGoalArea.y)}
          width={px(f.leftGoalArea.width)} height={py(f.leftGoalArea.height)}
          stroke={lineColor} strokeWidth={lineWidth} fill="transparent"
        />

        {/* Right goal area */}
        <Rect
          x={px(f.rightGoalArea.x)} y={py(f.rightGoalArea.y)}
          width={px(f.rightGoalArea.width)} height={py(f.rightGoalArea.height)}
          stroke={lineColor} strokeWidth={lineWidth} fill="transparent"
        />

        {/* Penalty spots */}
        <Circle x={px(f.leftPenaltySpot.cx)} y={py(f.leftPenaltySpot.cy)} radius={3} fill={lineColor} />
        <Circle x={px(f.rightPenaltySpot.cx)} y={py(f.rightPenaltySpot.cy)} radius={3} fill={lineColor} />

        {/* Penalty arcs */}
        <Arc
          x={px(f.leftPenaltyArc.cx)} y={py(f.leftPenaltyArc.cy)}
          innerRadius={py(f.leftPenaltyArc.radius)} outerRadius={py(f.leftPenaltyArc.radius)}
          angle={f.leftPenaltyArc.endAngle - f.leftPenaltyArc.startAngle}
          rotation={f.leftPenaltyArc.startAngle}
          stroke={lineColor} strokeWidth={lineWidth}
        />
        <Arc
          x={px(f.rightPenaltyArc.cx)} y={py(f.rightPenaltyArc.cy)}
          innerRadius={py(f.rightPenaltyArc.radius)} outerRadius={py(f.rightPenaltyArc.radius)}
          angle={f.rightPenaltyArc.endAngle - f.rightPenaltyArc.startAngle}
          rotation={f.rightPenaltyArc.startAngle}
          stroke={lineColor} strokeWidth={lineWidth}
        />

        {/* Corner arcs */}
        {[
          { x: 0, y: 0, rotation: 0 },
          { x: renderWidth, y: 0, rotation: 90 },
          { x: renderWidth, y: height, rotation: 180 },
          { x: 0, y: height, rotation: 270 },
        ].map((corner, i) => (
          <Arc
            key={`corner-${i}`}
            x={corner.x} y={corner.y}
            innerRadius={py(f.cornerRadius)} outerRadius={py(f.cornerRadius)}
            angle={90} rotation={corner.rotation}
            stroke={lineColor} strokeWidth={lineWidth}
          />
        ))}

        {/* Goal nets */}
        <GoalNet
          x={px(f.leftGoal.x)} y={py(f.leftGoal.y)}
          width={px(f.leftGoal.width)} height={py(f.leftGoal.height)}
          side="left"
        />
        <GoalNet
          x={px(f.rightGoal.x)} y={py(f.rightGoal.y)}
          width={px(f.rightGoal.width)} height={py(f.rightGoal.height)}
          side="right"
        />

        {/* Goal posts (thicker lines) */}
        <Rect
          x={px(f.leftGoal.x)} y={py(f.leftGoal.y)}
          width={px(f.leftGoal.width)} height={py(f.leftGoal.height)}
          stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} fill="transparent"
        />
        <Rect
          x={px(f.rightGoal.x)} y={py(f.rightGoal.y)}
          width={px(f.rightGoal.width)} height={py(f.rightGoal.height)}
          stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} fill="transparent"
        />
      </Group>
    </Group>
  );
}

function FutsalField({ width, height, fieldView = FIELD_VIEWS.FULL }) {
  const f = FUTSAL_FIELD;
  const lineColor = 'rgba(255, 255, 255, 0.85)';
  const lineWidth = 1.5;

  let offsetX = 0;
  let renderWidth = width;

  if (fieldView === FIELD_VIEWS.LEFT_HALF) {
    renderWidth = width * 2;
  } else if (fieldView === FIELD_VIEWS.RIGHT_HALF) {
    renderWidth = width * 2;
    offsetX = -width;
  } else if (fieldView === FIELD_VIEWS.THIRD_LEFT) {
    renderWidth = width * 3;
  } else if (fieldView === FIELD_VIEWS.THIRD_RIGHT) {
    renderWidth = width * 3;
    offsetX = -width * 2;
  }

  const px = (pct) => toPixel(pct, renderWidth);
  const py = (pct) => toPixel(pct, height);

  return (
    <Group clipX={0} clipY={0} clipWidth={width} clipHeight={height}>
      <Group x={offsetX}>
        {/* Court surface */}
        <CourtSurface width={renderWidth} height={height} />

        {/* Outer boundary */}
        <Rect
          x={0} y={0} width={renderWidth} height={height}
          stroke={lineColor} strokeWidth={lineWidth + 0.5} fill="transparent"
        />

        {/* Center line */}
        <Line
          points={[px(f.centerLine.x1), py(f.centerLine.y1), px(f.centerLine.x2), py(f.centerLine.y2)]}
          stroke={lineColor} strokeWidth={lineWidth}
        />

        {/* Center circle */}
        <Circle
          x={px(f.centerCircle.cx)} y={py(f.centerCircle.cy)}
          radius={py(f.centerCircle.radius)}
          stroke={lineColor} strokeWidth={lineWidth} fill="transparent"
        />

        {/* Center spot */}
        <Circle x={px(f.centerSpot.cx)} y={py(f.centerSpot.cy)} radius={3} fill={lineColor} />

        {/* Penalty areas (arcs) */}
        <Arc
          x={px(f.leftPenaltyArea.cx)} y={py(f.leftPenaltyArea.cy)}
          innerRadius={py(f.leftPenaltyArea.radius)} outerRadius={py(f.leftPenaltyArea.radius)}
          angle={180} rotation={-90}
          stroke={lineColor} strokeWidth={lineWidth}
        />
        <Arc
          x={px(f.rightPenaltyArea.cx)} y={py(f.rightPenaltyArea.cy)}
          innerRadius={py(f.rightPenaltyArea.radius)} outerRadius={py(f.rightPenaltyArea.radius)}
          angle={180} rotation={90}
          stroke={lineColor} strokeWidth={lineWidth}
        />

        {/* Penalty spots */}
        <Circle x={px(f.leftPenaltySpot.cx)} y={py(f.leftPenaltySpot.cy)} radius={3} fill={lineColor} />
        <Circle x={px(f.rightPenaltySpot.cx)} y={py(f.rightPenaltySpot.cy)} radius={3} fill={lineColor} />
        <Circle x={px(f.leftSecondPenaltySpot.cx)} y={py(f.leftSecondPenaltySpot.cy)} radius={3} fill={lineColor} />
        <Circle x={px(f.rightSecondPenaltySpot.cx)} y={py(f.rightSecondPenaltySpot.cy)} radius={3} fill={lineColor} />

        {/* Corner arcs */}
        {[
          { x: 0, y: 0, rotation: 0 },
          { x: renderWidth, y: 0, rotation: 90 },
          { x: renderWidth, y: height, rotation: 180 },
          { x: 0, y: height, rotation: 270 },
        ].map((corner, i) => (
          <Arc
            key={`corner-${i}`}
            x={corner.x} y={corner.y}
            innerRadius={py(f.cornerRadius)} outerRadius={py(f.cornerRadius)}
            angle={90} rotation={corner.rotation}
            stroke={lineColor} strokeWidth={lineWidth}
          />
        ))}

        {/* Goal nets */}
        <GoalNet
          x={px(f.leftGoal.x)} y={py(f.leftGoal.y)}
          width={px(f.leftGoal.width)} height={py(f.leftGoal.height)}
          side="left"
        />
        <GoalNet
          x={px(f.rightGoal.x)} y={py(f.rightGoal.y)}
          width={px(f.rightGoal.width)} height={py(f.rightGoal.height)}
          side="right"
        />

        {/* Goal posts */}
        <Rect
          x={px(f.leftGoal.x)} y={py(f.leftGoal.y)}
          width={px(f.leftGoal.width)} height={py(f.leftGoal.height)}
          stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} fill="transparent"
        />
        <Rect
          x={px(f.rightGoal.x)} y={py(f.rightGoal.y)}
          width={px(f.rightGoal.width)} height={py(f.rightGoal.height)}
          stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} fill="transparent"
        />
      </Group>
    </Group>
  );
}

export default function FieldBackground({ fieldType, width, height, fieldView = FIELD_VIEWS.FULL }) {
  if (fieldType === FIELD_TYPES.FUTSAL) {
    return <FutsalField width={width} height={height} fieldView={fieldView} />;
  }
  return <Football11Field width={width} height={height} fieldView={fieldView} />;
}
