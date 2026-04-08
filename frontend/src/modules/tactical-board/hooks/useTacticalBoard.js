import { useState, useCallback, useRef } from 'react';
import { FIELD_TYPES, FIELD_VIEWS } from '../utils/fieldDimensions';

const MAX_HISTORY = 50;

function createInitialFrame() {
  return { index: 0, elements: [], drawings: [] };
}

let elementCounter = 0;
function generateId(type) {
  elementCounter++;
  return `${type}-${Date.now()}-${elementCounter}`;
}

export function useTacticalBoard() {
  const [frames, setFrames] = useState([createInitialFrame()]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [fieldType, setFieldType] = useState(FIELD_TYPES.FOOTBALL_11);
  const [fieldView, setFieldView] = useState(FIELD_VIEWS.FULL);
  const [teamAColor, setTeamAColor] = useState('#3b82f6');
  const [teamBColor, setTeamBColor] = useState('#ef4444');
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);

  // Undo/redo history
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);

  const pushHistory = useCallback((newFrames) => {
    const history = historyRef.current;
    const idx = historyIndexRef.current;
    historyRef.current = history.slice(0, idx + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(newFrames)));
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const currentFrame = frames[currentFrameIndex] || createInitialFrame();
  const nextFrame = frames[currentFrameIndex + 1] || null;

  // Add element to current frame and all subsequent frames
  const addElement = useCallback((elementData) => {
    const id = generateId(elementData.type);
    const newElement = { id, ...elementData };

    setFrames((prev) => {
      const updated = prev.map((frame, i) => {
        if (i >= currentFrameIndex) {
          return { ...frame, elements: [...frame.elements, { ...newElement }] };
        }
        return frame;
      });
      pushHistory(updated);
      return updated;
    });

    return id;
  }, [currentFrameIndex, pushHistory]);

  // Remove element from all frames
  const removeElement = useCallback((elementId) => {
    setFrames((prev) => {
      const updated = prev.map((frame) => ({
        ...frame,
        elements: frame.elements.filter((e) => e.id !== elementId),
      }));
      pushHistory(updated);
      return updated;
    });
    setSelectedElementId((prev) => (prev === elementId ? null : prev));
  }, [pushHistory]);

  // Update element position in current frame
  const updateElementPosition = useCallback((elementId, x, y) => {
    setFrames((prev) => {
      const updated = prev.map((frame, i) => {
        if (i !== currentFrameIndex) return frame;
        return {
          ...frame,
          elements: frame.elements.map((el) =>
            el.id === elementId ? { ...el, x, y } : el
          ),
        };
      });
      pushHistory(updated);
      return updated;
    });
  }, [currentFrameIndex, pushHistory]);

  // ====== DRAWINGS (arrows, free draw, zones, text) ======

  const addDrawing = useCallback((drawingData) => {
    const id = generateId('draw');
    const newDrawing = { id, ...drawingData };

    setFrames((prev) => {
      const updated = prev.map((frame, i) => {
        if (i >= currentFrameIndex) {
          return { ...frame, drawings: [...(frame.drawings || []), { ...newDrawing }] };
        }
        return frame;
      });
      pushHistory(updated);
      return updated;
    });

    return id;
  }, [currentFrameIndex, pushHistory]);

  const removeDrawing = useCallback((drawingId) => {
    setFrames((prev) => {
      const updated = prev.map((frame) => ({
        ...frame,
        drawings: (frame.drawings || []).filter((d) => d.id !== drawingId),
      }));
      pushHistory(updated);
      return updated;
    });
    setSelectedDrawingId((prev) => (prev === drawingId ? null : prev));
  }, [pushHistory]);

  const updateDrawing = useCallback((drawingId, updates) => {
    setFrames((prev) => {
      const updated = prev.map((frame, i) => {
        if (i !== currentFrameIndex) return frame;
        return {
          ...frame,
          drawings: (frame.drawings || []).map((d) =>
            d.id === drawingId ? { ...d, ...updates } : d
          ),
        };
      });
      pushHistory(updated);
      return updated;
    });
  }, [currentFrameIndex, pushHistory]);

  // ====== FRAME MANAGEMENT ======

  const addFrame = useCallback(() => {
    setFrames((prev) => {
      const currentElements = prev[currentFrameIndex]?.elements || [];
      const currentDrawings = prev[currentFrameIndex]?.drawings || [];
      const newFrame = {
        index: prev.length,
        elements: currentElements.map((el) => ({ ...el })),
        drawings: currentDrawings.map((d) => ({ ...d })),
      };
      const updated = [...prev];
      updated.splice(currentFrameIndex + 1, 0, newFrame);
      const reindexed = updated.map((f, i) => ({ ...f, index: i }));
      pushHistory(reindexed);
      return reindexed;
    });
    setCurrentFrameIndex((prev) => prev + 1);
  }, [currentFrameIndex, pushHistory]);

  const deleteFrame = useCallback(() => {
    setFrames((prev) => {
      if (prev.length <= 1) return prev;
      const updated = prev.filter((_, i) => i !== currentFrameIndex);
      const reindexed = updated.map((f, i) => ({ ...f, index: i }));
      pushHistory(reindexed);
      return reindexed;
    });
    setCurrentFrameIndex((prev) => Math.max(0, prev - 1));
  }, [currentFrameIndex, pushHistory]);

  const goToFrame = useCallback((index) => {
    setCurrentFrameIndex(Math.max(0, Math.min(index, frames.length - 1)));
  }, [frames.length]);

  const goToNextFrame = useCallback(() => {
    setCurrentFrameIndex((prev) => Math.min(prev + 1, frames.length - 1));
  }, [frames.length]);

  const goToPrevFrame = useCallback(() => {
    setCurrentFrameIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Undo
  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    historyIndexRef.current = idx - 1;
    setFrames(JSON.parse(JSON.stringify(historyRef.current[idx - 1])));
  }, []);

  // Redo
  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx >= historyRef.current.length - 1) return;
    historyIndexRef.current = idx + 1;
    setFrames(JSON.parse(JSON.stringify(historyRef.current[idx + 1])));
  }, []);

  // Load play data
  const loadPlay = useCallback((playData) => {
    if (!playData) return;
    setFieldType(playData.field_type || FIELD_TYPES.FOOTBALL_11);
    setFieldView(playData.field_view || FIELD_VIEWS.FULL);
    setTeamAColor(playData.team_a_color || '#3b82f6');
    setTeamBColor(playData.team_b_color || '#ef4444');
    const keyframes = playData.keyframes || [createInitialFrame()];
    // Ensure drawings array exists on each frame
    const framesWithDrawings = keyframes.map(f => ({
      ...f,
      drawings: f.drawings || [],
    }));
    setFrames(framesWithDrawings.length > 0 ? framesWithDrawings : [createInitialFrame()]);
    setCurrentFrameIndex(0);
    setSelectedElementId(null);
    setSelectedDrawingId(null);
    historyRef.current = [JSON.parse(JSON.stringify(framesWithDrawings))];
    historyIndexRef.current = 0;
  }, []);

  // Reset board
  const resetBoard = useCallback(() => {
    const initial = [createInitialFrame()];
    setFrames(initial);
    setCurrentFrameIndex(0);
    setSelectedElementId(null);
    setSelectedDrawingId(null);
    historyRef.current = [JSON.parse(JSON.stringify(initial))];
    historyIndexRef.current = 0;
  }, []);

  // Get serializable play data
  const getPlayData = useCallback(() => ({
    field_type: fieldType,
    field_view: fieldView,
    team_a_color: teamAColor,
    team_b_color: teamBColor,
    keyframes: frames,
  }), [fieldType, fieldView, teamAColor, teamBColor, frames]);

  return {
    // State
    frames,
    currentFrameIndex,
    currentFrame,
    nextFrame,
    fieldType,
    fieldView,
    teamAColor,
    teamBColor,
    selectedElementId,
    selectedDrawingId,
    totalFrames: frames.length,

    // Element actions
    addElement,
    removeElement,
    updateElementPosition,
    setSelectedElementId,

    // Drawing actions
    addDrawing,
    removeDrawing,
    updateDrawing,
    setSelectedDrawingId,

    // Frame actions
    addFrame,
    deleteFrame,
    goToFrame,
    goToNextFrame,
    goToPrevFrame,

    // Board actions
    setFieldType,
    setFieldView,
    setTeamAColor,
    setTeamBColor,
    loadPlay,
    resetBoard,
    getPlayData,

    // History
    undo,
    redo,
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,
  };
}
