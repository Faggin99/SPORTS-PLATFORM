import { Arrow } from 'react-konva';

export default function MovementArrow({
  fromX,
  fromY,
  toX,
  toY,
  color = 'rgba(255,255,255,0.6)',
}) {
  // Don't render if positions are the same (no movement)
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return null;

  return (
    <Arrow
      points={[fromX, fromY, toX, toY]}
      stroke={color}
      strokeWidth={2}
      fill={color}
      pointerLength={8}
      pointerWidth={6}
      dash={[6, 4]}
      opacity={0.7}
    />
  );
}
