import { Group, Circle } from 'react-konva';

export default function BallToken({
  x,
  y,
  isSelected = false,
  draggable = true,
  onDragEnd,
  onClick,
}) {
  const radius = 10;

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
          radius={radius + 4}
          stroke="#fbbf24"
          strokeWidth={2}
          dash={[4, 4]}
          fill="transparent"
        />
      )}

      {/* Ball outer */}
      <Circle
        radius={radius}
        fill="white"
        stroke="#333"
        strokeWidth={1.5}
        shadowColor="rgba(0,0,0,0.3)"
        shadowBlur={3}
        shadowOffset={{ x: 1, y: 1 }}
      />

      {/* Ball inner pattern */}
      <Circle
        radius={4}
        fill="#333"
      />
    </Group>
  );
}
