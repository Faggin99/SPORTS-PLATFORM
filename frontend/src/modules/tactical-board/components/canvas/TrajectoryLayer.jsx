import { Group } from 'react-konva';
import MovementArrow from './MovementArrow';
import { toPixel } from '../../utils/fieldDimensions';

export default function TrajectoryLayer({
  currentElements = [],
  nextElements = null,
  fieldWidth,
  fieldHeight,
  teamAColor = '#3b82f6',
  teamBColor = '#ef4444',
  visible = true,
}) {
  if (!visible || !nextElements || nextElements.length === 0) return null;

  return (
    <Group>
      {currentElements.map((currentEl) => {
        const nextEl = nextElements.find((e) => e.id === currentEl.id);
        if (!nextEl) return null;

        let arrowColor = 'rgba(255,255,255,0.5)';
        if (currentEl.team === 'A') arrowColor = teamAColor + '99';
        else if (currentEl.team === 'B') arrowColor = teamBColor + '99';
        else if (currentEl.type === 'ball') arrowColor = 'rgba(255,255,255,0.7)';

        return (
          <MovementArrow
            key={`arrow-${currentEl.id}`}
            fromX={toPixel(currentEl.x, fieldWidth)}
            fromY={toPixel(currentEl.y, fieldHeight)}
            toX={toPixel(nextEl.x, fieldWidth)}
            toY={toPixel(nextEl.y, fieldHeight)}
            color={arrowColor}
          />
        );
      })}
    </Group>
  );
}
