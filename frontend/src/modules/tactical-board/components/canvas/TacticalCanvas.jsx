import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer } from 'react-konva';
import FieldBackground from './FieldBackground';
import PlayerToken from './PlayerToken';
import BallToken from './BallToken';
import MarkerToken from './MarkerToken';
import TrajectoryLayer from './TrajectoryLayer';
import DrawingLayer from './DrawingLayer';
import { FIELD_TYPES, FIELD_VIEWS, calculateCanvasDimensions, toPercent, toPixel } from '../../utils/fieldDimensions';

const TacticalCanvas = forwardRef(function TacticalCanvas({
  fieldType = FIELD_TYPES.FOOTBALL_11,
  fieldView = FIELD_VIEWS.FULL,
  elements = [],
  drawings = [],
  nextFrameElements = null,
  teamAColor = '#3b82f6',
  teamBColor = '#ef4444',
  isPlaying = false,
  drawingMode = null, // 'arrow_straight', 'arrow_curved', 'free_draw', 'zone_rect', 'zone_circle', 'text'
  drawingColor = 'white',
  drawingDash = [],
  drawingStrokeWidth = 2.5,
  onElementMove,
  onElementSelect,
  onDrawingSelect,
  onDrawingComplete,
  selectedElementId,
  selectedDrawingId,
}, ref) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500, offsetX: 0, offsetY: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingStartRef = useRef(null);
  const freeDrawPointsRef = useRef([]);

  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
    getCanvas: () => stageRef.current?.toCanvas(),
  }));

  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dims = calculateCanvasDimensions(rect.width, rect.height, fieldType, fieldView);
    setDimensions(dims);
  }, [fieldType, fieldView]);

  useEffect(() => {
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateDimensions]);

  const handleDragEnd = useCallback((elementId, e) => {
    if (isPlaying || !onElementMove) return;
    const node = e.target;
    const x = toPercent(node.x(), dimensions.width);
    const y = toPercent(node.y(), dimensions.height);
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    node.x(toPixel(clampedX, dimensions.width));
    node.y(toPixel(clampedY, dimensions.height));
    onElementMove(elementId, clampedX, clampedY);
  }, [isPlaying, onElementMove, dimensions]);

  const handleElementClick = useCallback((elementId) => {
    if (drawingMode) return;
    if (onElementSelect) onElementSelect(elementId);
  }, [onElementSelect, drawingMode]);

  const handleStageClick = useCallback((e) => {
    if (drawingMode) return;
    if (e.target === stageRef.current || e.target.getParent()?.attrs?.name === 'field-background') {
      if (onElementSelect) onElementSelect(null);
      if (onDrawingSelect) onDrawingSelect(null);
    }
  }, [onElementSelect, onDrawingSelect, drawingMode]);

  // Drawing mode mouse handlers
  const handleMouseDown = useCallback((e) => {
    if (!drawingMode || isPlaying) return;
    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const x = toPercent(pointer.x, dimensions.width);
    const y = toPercent(pointer.y, dimensions.height);

    if (drawingMode === 'text') {
      const text = prompt('Digite o texto:');
      if (text) {
        onDrawingComplete?.({
          drawType: 'text',
          x, y,
          text,
          color: drawingColor,
          fontSize: 14,
        });
      }
      return;
    }

    setIsDrawing(true);
    drawingStartRef.current = { x, y };

    if (drawingMode === 'free_draw') {
      freeDrawPointsRef.current = [x, y];
    }
  }, [drawingMode, isPlaying, dimensions, drawingColor, onDrawingComplete]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing || !drawingMode || drawingMode === 'text') return;
    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    if (drawingMode === 'free_draw') {
      const x = toPercent(pointer.x, dimensions.width);
      const y = toPercent(pointer.y, dimensions.height);
      freeDrawPointsRef.current.push(x, y);
      // Force update for live preview could be added here
    }
  }, [isDrawing, drawingMode, dimensions]);

  const handleMouseUp = useCallback((e) => {
    if (!isDrawing || !drawingMode) return;
    setIsDrawing(false);
    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    if (!pointer || !drawingStartRef.current) return;

    const x2 = toPercent(pointer.x, dimensions.width);
    const y2 = toPercent(pointer.y, dimensions.height);
    const { x: x1, y: y1 } = drawingStartRef.current;

    // Minimum distance check
    const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    if (dist < 2 && drawingMode !== 'free_draw') return;

    switch (drawingMode) {
      case 'arrow_straight':
        onDrawingComplete?.({
          drawType: 'arrow_straight',
          x1, y1, x2, y2,
          color: drawingColor,
          strokeWidth: drawingStrokeWidth,
          dash: drawingDash,
        });
        break;
      case 'arrow_curved': {
        // Control point perpendicular to midpoint
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const perpX = midX - dy * 0.3;
        const perpY = midY + dx * 0.3;
        onDrawingComplete?.({
          drawType: 'arrow_curved',
          x1, y1, x2, y2,
          cx: perpX, cy: perpY,
          color: drawingColor,
          strokeWidth: drawingStrokeWidth,
          dash: drawingDash,
        });
        break;
      }
      case 'free_draw': {
        const pts = freeDrawPointsRef.current;
        if (pts.length >= 4) {
          onDrawingComplete?.({
            drawType: 'free_draw',
            points: [...pts],
            color: drawingColor,
            strokeWidth: drawingStrokeWidth,
          });
        }
        freeDrawPointsRef.current = [];
        break;
      }
      case 'zone_rect': {
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        onDrawingComplete?.({
          drawType: 'zone_rect',
          x: rx, y: ry,
          w: Math.abs(x2 - x1),
          h: Math.abs(y2 - y1),
          color: drawingColor.includes('rgba') ? drawingColor : hexToRgba(drawingColor, 0.15),
          strokeColor: drawingColor.includes('rgba') ? drawingColor : hexToRgba(drawingColor, 0.5),
        });
        break;
      }
      case 'zone_circle': {
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        onDrawingComplete?.({
          drawType: 'zone_circle',
          cx: x1, cy: y1,
          radius,
          color: drawingColor.includes('rgba') ? drawingColor : hexToRgba(drawingColor, 0.15),
          strokeColor: drawingColor.includes('rgba') ? drawingColor : hexToRgba(drawingColor, 0.5),
        });
        break;
      }
    }
  }, [isDrawing, drawingMode, dimensions, drawingColor, drawingStrokeWidth, drawingDash, onDrawingComplete]);

  const renderElement = (element) => {
    const pixelX = toPixel(element.x, dimensions.width);
    const pixelY = toPixel(element.y, dimensions.height);
    const isSelected = selectedElementId === element.id;
    const color = element.team === 'A' ? teamAColor : element.team === 'B' ? teamBColor : null;

    const commonProps = {
      x: pixelX,
      y: pixelY,
      draggable: !isPlaying && !drawingMode,
      isSelected,
      onDragEnd: (e) => handleDragEnd(element.id, e),
      onClick: () => handleElementClick(element.id),
    };

    switch (element.type) {
      case 'player':
        return (
          <PlayerToken
            key={element.id}
            {...commonProps}
            jerseyNumber={element.jerseyNumber}
            name={element.name}
            color={color}
            isGoalkeeper={element.isGoalkeeper || false}
          />
        );
      case 'ball':
        return <BallToken key={element.id} {...commonProps} />;
      case 'marker':
        return <MarkerToken key={element.id} {...commonProps} markerType={element.markerType} />;
      default:
        return null;
    }
  };

  const cursorStyle = drawingMode
    ? 'crosshair'
    : isPlaying
      ? 'default'
      : 'pointer';

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        style={{ cursor: cursorStyle }}
      >
        {/* Layer 1: Field background (static) */}
        <Layer name="field-background" listening={false}>
          <FieldBackground
            fieldType={fieldType}
            width={dimensions.width}
            height={dimensions.height}
            fieldView={fieldView}
          />
        </Layer>

        {/* Layer 2: Drawings (zones, arrows, free draw, text) */}
        <Layer>
          <DrawingLayer
            drawings={drawings}
            fieldWidth={dimensions.width}
            fieldHeight={dimensions.height}
            selectedDrawingId={selectedDrawingId}
            onSelectDrawing={onDrawingSelect}
            draggable={!isPlaying && !drawingMode}
          />
        </Layer>

        {/* Layer 3: Movement arrows */}
        <Layer listening={false}>
          <TrajectoryLayer
            currentElements={elements}
            nextElements={nextFrameElements}
            fieldWidth={dimensions.width}
            fieldHeight={dimensions.height}
            teamAColor={teamAColor}
            teamBColor={teamBColor}
            visible={!isPlaying}
          />
        </Layer>

        {/* Layer 4: Interactive elements (players, ball, markers) */}
        <Layer>
          {elements.map(renderElement)}
        </Layer>
      </Stage>
    </div>
  );
});

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default TacticalCanvas;
