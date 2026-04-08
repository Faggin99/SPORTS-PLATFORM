import { Group, Line, Arrow, Circle, Rect, Text, Shape } from 'react-konva';
import { toPixel } from '../../utils/fieldDimensions';

// Render a single drawn element
function DrawnElement({ element, fieldWidth, fieldHeight, isSelected, onClick, draggable, onDragEnd }) {
  const px = (pct) => toPixel(pct, fieldWidth);
  const py = (pct) => toPixel(pct, fieldHeight);

  const selectionProps = isSelected ? {
    shadowColor: '#fbbf24',
    shadowBlur: 8,
    shadowOpacity: 0.8,
  } : {};

  const commonGroupProps = {
    onClick: () => onClick?.(element.id),
    onTap: () => onClick?.(element.id),
  };

  switch (element.drawType) {
    case 'arrow_straight': {
      const points = [px(element.x1), py(element.y1), px(element.x2), py(element.y2)];
      return (
        <Group {...commonGroupProps}>
          {isSelected && (
            <>
              <Circle x={px(element.x1)} y={py(element.y1)} radius={5} fill="#fbbf24" opacity={0.7} />
              <Circle x={px(element.x2)} y={py(element.y2)} radius={5} fill="#fbbf24" opacity={0.7} />
            </>
          )}
          <Arrow
            points={points}
            stroke={element.color || 'white'}
            strokeWidth={element.strokeWidth || 2.5}
            fill={element.color || 'white'}
            dash={element.dash || []}
            pointerLength={8}
            pointerWidth={7}
            lineCap="round"
            {...selectionProps}
          />
        </Group>
      );
    }

    case 'arrow_curved': {
      // Quadratic bezier arrow
      const pts = [
        px(element.x1), py(element.y1),
        px(element.cx || (element.x1 + element.x2) / 2),
        py(element.cy || (element.y1 + element.y2) / 2 - 15),
        px(element.x2), py(element.y2),
      ];
      return (
        <Group {...commonGroupProps}>
          {isSelected && (
            <>
              <Circle x={px(element.x1)} y={py(element.y1)} radius={5} fill="#fbbf24" opacity={0.7} />
              <Circle x={px(element.x2)} y={py(element.y2)} radius={5} fill="#fbbf24" opacity={0.7} />
              <Circle x={px(element.cx || (element.x1+element.x2)/2)} y={py(element.cy || (element.y1+element.y2)/2-15)} radius={4} fill="#fbbf24" opacity={0.5} />
            </>
          )}
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath();
              ctx.moveTo(pts[0], pts[1]);
              ctx.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
              ctx.setAttr = undefined;
              shape.stroke(element.color || 'white');
              shape.strokeWidth(element.strokeWidth || 2.5);
              shape.dash(element.dash || []);
              ctx.strokeShape(shape);
              // Draw arrowhead
              const angle = Math.atan2(pts[5] - pts[3], pts[4] - pts[2]);
              const headLen = 10;
              ctx.beginPath();
              ctx.moveTo(pts[4], pts[5]);
              ctx.lineTo(pts[4] - headLen * Math.cos(angle - 0.4), pts[5] - headLen * Math.sin(angle - 0.4));
              ctx.moveTo(pts[4], pts[5]);
              ctx.lineTo(pts[4] - headLen * Math.cos(angle + 0.4), pts[5] - headLen * Math.sin(angle + 0.4));
              ctx.strokeShape(shape);
            }}
            stroke={element.color || 'white'}
            strokeWidth={element.strokeWidth || 2.5}
            dash={element.dash || []}
            lineCap="round"
            {...selectionProps}
          />
        </Group>
      );
    }

    case 'free_draw': {
      // Points stored as flat array of percentages [x1,y1,x2,y2,...]
      const pixelPoints = (element.points || []).map((val, i) =>
        i % 2 === 0 ? px(val) : py(val)
      );
      if (pixelPoints.length < 4) return null;
      return (
        <Group {...commonGroupProps}>
          <Line
            points={pixelPoints}
            stroke={element.color || '#fbbf24'}
            strokeWidth={element.strokeWidth || 2}
            lineCap="round"
            lineJoin="round"
            tension={0.3}
            {...selectionProps}
          />
        </Group>
      );
    }

    case 'zone_rect': {
      return (
        <Group
          {...commonGroupProps}
          draggable={draggable}
          onDragEnd={(e) => {
            if (onDragEnd) {
              const node = e.target;
              onDragEnd(element.id, node.x(), node.y());
            }
          }}
        >
          <Rect
            x={px(element.x)}
            y={py(element.y)}
            width={px(element.w)}
            height={py(element.h)}
            fill={element.color || 'rgba(59, 130, 246, 0.2)'}
            stroke={element.strokeColor || 'rgba(59, 130, 246, 0.6)'}
            strokeWidth={1.5}
            cornerRadius={2}
            dash={element.dash || []}
            {...selectionProps}
          />
        </Group>
      );
    }

    case 'zone_circle': {
      return (
        <Group {...commonGroupProps}>
          <Circle
            x={px(element.cx)}
            y={py(element.cy)}
            radius={py(element.radius)}
            fill={element.color || 'rgba(59, 130, 246, 0.2)'}
            stroke={element.strokeColor || 'rgba(59, 130, 246, 0.6)'}
            strokeWidth={1.5}
            dash={element.dash || []}
            {...selectionProps}
          />
        </Group>
      );
    }

    case 'text': {
      return (
        <Group
          x={px(element.x)}
          y={py(element.y)}
          draggable={draggable}
          onDragEnd={(e) => {
            if (onDragEnd) {
              const node = e.target;
              onDragEnd(element.id, node.x(), node.y());
            }
          }}
          {...commonGroupProps}
        >
          {isSelected && (
            <Rect
              x={-3} y={-3}
              width={element.text.length * 8 + 6}
              height={20}
              stroke="#fbbf24"
              strokeWidth={1}
              dash={[3, 3]}
              fill="transparent"
            />
          )}
          <Text
            text={element.text}
            fontSize={element.fontSize || 14}
            fontStyle={element.fontStyle || 'bold'}
            fontFamily="Arial"
            fill={element.color || 'white'}
            shadowColor="rgba(0,0,0,0.7)"
            shadowBlur={3}
          />
        </Group>
      );
    }

    default:
      return null;
  }
}

export default function DrawingLayer({
  drawings = [],
  fieldWidth,
  fieldHeight,
  selectedDrawingId,
  onSelectDrawing,
  draggable = true,
  onDragEnd,
}) {
  return (
    <Group>
      {drawings.map((d) => (
        <DrawnElement
          key={d.id}
          element={d}
          fieldWidth={fieldWidth}
          fieldHeight={fieldHeight}
          isSelected={selectedDrawingId === d.id}
          onClick={onSelectDrawing}
          draggable={draggable}
          onDragEnd={onDragEnd}
        />
      ))}
    </Group>
  );
}
