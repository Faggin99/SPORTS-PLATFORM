import { Group, Circle, Text, Rect, Line, Shape } from 'react-konva';

export default function PlayerToken({
  x,
  y,
  jerseyNumber = '',
  name = '',
  color = '#3b82f6',
  isGoalkeeper = false,
  isSelected = false,
  draggable = true,
  onDragEnd,
  onClick,
}) {
  const radius = 16;

  if (isGoalkeeper) {
    return (
      <Group
        x={x} y={y}
        draggable={draggable}
        onDragEnd={onDragEnd}
        onClick={onClick}
        onTap={onClick}
      >
        {/* Selection ring */}
        {isSelected && (
          <Circle
            radius={radius + 5}
            stroke="#fbbf24"
            strokeWidth={2}
            dash={[4, 4]}
            fill="transparent"
          />
        )}

        {/* Goalkeeper diamond/rhombus shape */}
        <Shape
          sceneFunc={(ctx, shape) => {
            ctx.beginPath();
            ctx.moveTo(0, -radius);
            ctx.lineTo(radius, 0);
            ctx.lineTo(0, radius);
            ctx.lineTo(-radius, 0);
            ctx.closePath();
            ctx.fillStrokeShape(shape);
          }}
          fill={color}
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={2}
          shadowColor="rgba(0,0,0,0.4)"
          shadowBlur={4}
          shadowOffset={{ x: 1, y: 1 }}
        />

        {/* Glove icon (two small lines) */}
        <Line points={[-5, -3, -3, -5]} stroke="rgba(255,255,255,0.5)" strokeWidth={1} lineCap="round" />
        <Line points={[5, -3, 3, -5]} stroke="rgba(255,255,255,0.5)" strokeWidth={1} lineCap="round" />

        {/* Jersey number */}
        <Text
          text={String(jerseyNumber)}
          fontSize={12}
          fontStyle="bold"
          fontFamily="Arial"
          fill="white"
          align="center"
          verticalAlign="middle"
          width={radius * 2}
          height={radius * 2}
          offsetX={radius}
          offsetY={radius}
        />

        {/* Player name */}
        {name && (
          <Text
            text={name.length > 10 ? name.slice(0, 9) + '…' : name}
            fontSize={9}
            fontFamily="Arial"
            fill="white"
            align="center"
            width={60}
            offsetX={30}
            y={radius + 3}
            shadowColor="rgba(0,0,0,0.8)"
            shadowBlur={3}
          />
        )}
      </Group>
    );
  }

  return (
    <Group
      x={x} y={y}
      draggable={draggable}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onTap={onClick}
    >
      {/* Selection ring */}
      {isSelected && (
        <Circle
          radius={radius + 5}
          stroke="#fbbf24"
          strokeWidth={2}
          dash={[4, 4]}
          fill="transparent"
        />
      )}

      {/* Player circle with gradient effect */}
      <Circle
        radius={radius}
        fill={color}
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={2}
        shadowColor="rgba(0,0,0,0.35)"
        shadowBlur={5}
        shadowOffset={{ x: 1, y: 2 }}
      />

      {/* Inner highlight for 3D effect */}
      <Circle
        radius={radius - 3}
        fill="transparent"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1}
      />

      {/* Jersey number */}
      <Text
        text={String(jerseyNumber)}
        fontSize={13}
        fontStyle="bold"
        fontFamily="Arial"
        fill="white"
        align="center"
        verticalAlign="middle"
        width={radius * 2}
        height={radius * 2}
        offsetX={radius}
        offsetY={radius}
      />

      {/* Player name */}
      {name && (
        <Text
          text={name.length > 10 ? name.slice(0, 9) + '…' : name}
          fontSize={9}
          fontFamily="Arial"
          fill="white"
          align="center"
          width={60}
          offsetX={30}
          y={radius + 3}
          shadowColor="rgba(0,0,0,0.8)"
          shadowBlur={3}
        />
      )}
    </Group>
  );
}
