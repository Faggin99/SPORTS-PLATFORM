import { Group, Line, Rect, Circle, RegularPolygon, Text, Shape } from 'react-konva';

export default function MarkerToken({
  x,
  y,
  markerType = 'cone',
  isSelected = false,
  draggable = true,
  onDragEnd,
  onClick,
}) {
  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onTap={onClick}
    >
      {/* Selection ring */}
      {isSelected && (
        <Circle
          radius={18}
          stroke="#fbbf24"
          strokeWidth={2}
          dash={[4, 4]}
          fill="transparent"
        />
      )}

      {markerType === 'cone' && <ConeMarker />}
      {markerType === 'cone_tall' && <TallConeMarker />}
      {markerType === 'barrier' && <BarrierMarker />}
      {markerType === 'pole' && <PoleMarker />}
      {markerType === 'flag' && <FlagMarker />}
      {markerType === 'ladder' && <LadderMarker />}
      {markerType === 'mannequin' && <MannequinMarker />}
      {markerType === 'disc' && <DiscMarker />}
      {markerType === 'hoop' && <HoopMarker />}
      {markerType === 'mini_goal' && <MiniGoalMarker />}
    </Group>
  );
}

// --- Flat training cone (low, wide) ---
function ConeMarker() {
  return (
    <Group>
      {/* Shadow */}
      <Shape sceneFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.ellipse(0, 4, 11, 3, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fill();
      }} />
      {/* Cone body */}
      <Shape sceneFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(-10, 4);
        ctx.quadraticCurveTo(0, 8, 10, 4);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
        fill="#f97316"
        stroke="#e85d04"
        strokeWidth={1}
      />
      {/* Cone highlight */}
      <Line
        points={[0, -7, -4, 1]}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.5}
        lineCap="round"
      />
    </Group>
  );
}

// --- Tall cone ---
function TallConeMarker() {
  return (
    <Group>
      <Shape sceneFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.ellipse(0, 6, 8, 3, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fill();
      }} />
      <Shape sceneFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(-8, 5);
        ctx.quadraticCurveTo(0, 9, 8, 5);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
        fill="#f97316"
        stroke="#e85d04"
        strokeWidth={1}
      />
      {/* White stripe */}
      <Line points={[-5, -2, 5, -2]} stroke="white" strokeWidth={1.5} />
      <Line points={[0, -13, -2, -4]} stroke="rgba(255,255,255,0.35)" strokeWidth={1} lineCap="round" />
    </Group>
  );
}

// --- Barrier / hurdle ---
function BarrierMarker() {
  return (
    <Group>
      {/* Shadow */}
      <Rect x={-16} y={5} width={32} height={3} fill="rgba(0,0,0,0.15)" cornerRadius={1} />
      {/* Posts */}
      <Rect x={-14} y={-6} width={2.5} height={14} fill="#7c3aed" cornerRadius={0.5} />
      <Rect x={11.5} y={-6} width={2.5} height={14} fill="#7c3aed" cornerRadius={0.5} />
      {/* Bar */}
      <Rect x={-14} y={-8} width={28} height={4} fill="#a855f7" cornerRadius={1} stroke="#7c3aed" strokeWidth={0.5} />
      {/* Highlight */}
      <Line points={[-12, -7, 10, -7]} stroke="rgba(255,255,255,0.3)" strokeWidth={1} lineCap="round" />
    </Group>
  );
}

// --- Pole / stick ---
function PoleMarker() {
  return (
    <Group>
      <Circle y={8} radius={3} fill="rgba(0,0,0,0.15)" />
      <Rect x={-1.5} y={-16} width={3} height={24} fill="#f59e0b" cornerRadius={1.5} />
      <Circle y={-16} radius={3} fill="#f59e0b" stroke="#d97706" strokeWidth={0.5} />
      <Line points={[0, -16, -0.5, -2]} stroke="rgba(255,255,255,0.3)" strokeWidth={1} lineCap="round" />
    </Group>
  );
}

// --- Flag ---
function FlagMarker() {
  return (
    <Group>
      <Circle y={12} radius={2.5} fill="rgba(0,0,0,0.15)" />
      {/* Pole */}
      <Rect x={-1} y={-14} width={2} height={26} fill="#666" cornerRadius={1} />
      {/* Flag fabric */}
      <Shape sceneFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(1, -14);
        ctx.quadraticCurveTo(8, -11, 14, -12);
        ctx.lineTo(14, -4);
        ctx.quadraticCurveTo(8, -5, 1, -4);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
        fill="#ef4444"
        stroke="#dc2626"
        strokeWidth={0.5}
      />
    </Group>
  );
}

// --- Agility Ladder ---
function LadderMarker() {
  const rungs = 5;
  const w = 16;
  const h = 28;
  const rungSpacing = h / (rungs + 1);
  return (
    <Group>
      <Rect x={-w / 2 - 1} y={-h / 2} width={w + 2} height={h} fill="rgba(0,0,0,0.1)" cornerRadius={1} />
      {/* Side rails */}
      <Rect x={-w / 2} y={-h / 2} width={2} height={h} fill="#facc15" cornerRadius={0.5} />
      <Rect x={w / 2 - 2} y={-h / 2} width={2} height={h} fill="#facc15" cornerRadius={0.5} />
      {/* Rungs */}
      {Array.from({ length: rungs }, (_, i) => (
        <Rect
          key={i}
          x={-w / 2 + 2}
          y={-h / 2 + rungSpacing * (i + 1) - 1}
          width={w - 4}
          height={2}
          fill="#fde047"
          cornerRadius={0.5}
        />
      ))}
    </Group>
  );
}

// --- Mannequin / dummy ---
function MannequinMarker() {
  return (
    <Group>
      {/* Shadow */}
      <Shape sceneFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.ellipse(0, 14, 8, 3, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fill();
      }} />
      {/* Base */}
      <Shape sceneFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.ellipse(0, 12, 7, 3, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
        fill="#1e40af"
        stroke="#1e3a8a"
        strokeWidth={0.5}
      />
      {/* Pole */}
      <Rect x={-1.5} y={-4} width={3} height={16} fill="#333" cornerRadius={1} />
      {/* Arms */}
      <Line points={[-10, 0, 10, 0]} stroke="#333" strokeWidth={2.5} lineCap="round" />
      {/* Head */}
      <Circle y={-8} radius={5} fill="#1e40af" stroke="#1e3a8a" strokeWidth={0.5} />
      <Circle y={-8} radius={2} fill="rgba(255,255,255,0.2)" />
    </Group>
  );
}

// --- Flat disc marker ---
function DiscMarker() {
  return (
    <Group>
      <Shape sceneFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.ellipse(0, 1, 9, 4, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
        fill="#22c55e"
        stroke="#16a34a"
        strokeWidth={1}
      />
      <Shape sceneFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.ellipse(0, -1, 9, 4, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
        fill="#4ade80"
        stroke="#22c55e"
        strokeWidth={0.5}
      />
    </Group>
  );
}

// --- Hoop / ring ---
function HoopMarker() {
  return (
    <Group>
      <Circle radius={12} stroke="#f97316" strokeWidth={2.5} fill="rgba(249,115,22,0.1)" />
      <Circle radius={10} stroke="rgba(249,115,22,0.3)" strokeWidth={0.5} fill="transparent" />
    </Group>
  );
}

// --- Mini goal ---
function MiniGoalMarker() {
  return (
    <Group>
      {/* Net background */}
      <Rect x={-14} y={-10} width={28} height={20} fill="rgba(255,255,255,0.08)" />
      {/* Net lines */}
      {Array.from({ length: 5 }, (_, i) => (
        <Line key={`nv-${i}`} points={[-14 + i * 7, -10, -14 + i * 7, 10]} stroke="rgba(255,255,255,0.2)" strokeWidth={0.5} />
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <Line key={`nh-${i}`} points={[-14, -10 + i * 6.66, 14, -10 + i * 6.66]} stroke="rgba(255,255,255,0.2)" strokeWidth={0.5} />
      ))}
      {/* Frame */}
      <Line
        points={[-14, 10, -14, -10, 14, -10, 14, 10]}
        stroke="white"
        strokeWidth={2.5}
        lineCap="round"
        lineJoin="round"
      />
      {/* Ground line */}
      <Line points={[-16, 10, 16, 10]} stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
    </Group>
  );
}
