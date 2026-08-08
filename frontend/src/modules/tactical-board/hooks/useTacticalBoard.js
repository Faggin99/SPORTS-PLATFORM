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

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

export function useTacticalBoard({ initialFieldType } = {}) {
  const [frames, setFramesState] = useState(() => [createInitialFrame()]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [fieldType, setFieldType] = useState(initialFieldType || FIELD_TYPES.FOOTBALL_11);
  const [fieldView, setFieldView] = useState(FIELD_VIEWS.FULL);
  const [teamAColor, setTeamAColor] = useState('#3b82f6');
  const [teamBColor, setTeamBColor] = useState('#ef4444');
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);

  // Undo/redo. framesRef espelha o estado pra mutators calcularem o próximo
  // valor FORA do updater do setState — pushHistory dentro do updater roda
  // duas vezes no StrictMode e duplicava entradas (2 Ctrl+Z por ação).
  const framesRef = useRef(frames);
  const historyRef = useRef([deepClone(frames)]);
  const historyIndexRef = useRef(0);
  // Índice do histórico correspondente ao último save — deriva isDirty.
  const savedHistoryIndexRef = useRef(0);
  // Mudanças salváveis fora do histórico de frames (tipo de campo, vista,
  // cores dos times) também contam como dirty.
  const [metaDirty, setMetaDirty] = useState(false);
  // Contador de versão pra re-render quando só o histórico muda (undo/redo).
  const [, setHistoryVersion] = useState(0);

  const setFrames = useCallback((next) => {
    framesRef.current = next;
    setFramesState(next);
  }, []);

  const commit = useCallback((nextFrames) => {
    const history = historyRef.current.slice(0, historyIndexRef.current + 1);
    history.push(deepClone(nextFrames));
    if (history.length > MAX_HISTORY) {
      history.shift();
      if (savedHistoryIndexRef.current >= 0) savedHistoryIndexRef.current--;
    }
    historyRef.current = history;
    historyIndexRef.current = history.length - 1;
    setFrames(nextFrames);
    setHistoryVersion((v) => v + 1);
  }, [setFrames]);

  const currentFrame = frames[currentFrameIndex] || createInitialFrame();
  const nextFrame = frames[currentFrameIndex + 1] || null;

  // ====== ELEMENTS ======

  // Adiciona ao frame atual e a todos os seguintes
  const addElement = useCallback((elementData) => {
    const id = generateId(elementData.type);
    const newElement = { id, ...elementData };
    const next = framesRef.current.map((frame, i) =>
      i >= currentFrameIndex
        ? { ...frame, elements: [...frame.elements, { ...newElement }] }
        : frame
    );
    commit(next);
    return id;
  }, [currentFrameIndex, commit]);

  // Remove de todos os frames
  const removeElement = useCallback((elementId) => {
    const next = framesRef.current.map((frame) => ({
      ...frame,
      elements: frame.elements.filter((e) => e.id !== elementId),
    }));
    commit(next);
    setSelectedElementId((prev) => (prev === elementId ? null : prev));
  }, [commit]);

  // Move só no frame atual (é assim que a animação por keyframes funciona)
  const updateElementPosition = useCallback((elementId, x, y) => {
    const next = framesRef.current.map((frame, i) => {
      if (i !== currentFrameIndex) return frame;
      return {
        ...frame,
        elements: frame.elements.map((el) =>
          el.id === elementId ? { ...el, x, y } : el
        ),
      };
    });
    commit(next);
  }, [currentFrameIndex, commit]);

  // Patch de identidade (número, nome, time, goleiro) — aplica em TODOS os
  // frames: identidade é global, só posição é por keyframe.
  const updateElementProps = useCallback((elementId, patch) => {
    const next = framesRef.current.map((frame) => ({
      ...frame,
      elements: frame.elements.map((el) =>
        el.id === elementId ? { ...el, ...patch } : el
      ),
    }));
    commit(next);
  }, [commit]);

  // Próximo número de camisa pra jogador genérico do time, derivado do estado
  // (não usa contador externo — sobrevive a undo/remoção/load).
  const nextGenericJersey = useCallback((team) => {
    const els = framesRef.current[currentFrameIndex]?.elements || [];
    const nums = els
      .filter((e) => e.type === 'player' && e.team === team)
      .map((e) => Number(e.jerseyNumber) || 0);
    const max = nums.length ? Math.max(...nums) : 1; // goleiro reserva o 1
    return Math.max(2, max + 1);
  }, [currentFrameIndex]);

  // ====== FORMAÇÕES (não-destrutivo, por time) ======
  // applications = [{ team: 'A'|'B', positions: [{x,y,jerseyNumber,name,isGoalkeeper}] }]
  // Retorna { repositioned, added, kept } agregado pra feedback na UI.
  const applyFormations = useCallback((applications) => {
    let repositioned = 0;
    let added = 0;
    let kept = 0;

    let next = framesRef.current.map((f) => ({
      ...f,
      elements: [...f.elements],
    }));

    for (const { team, positions } of applications) {
      const curr = next[currentFrameIndex];
      // Jogadores do time no frame atual: goleiro primeiro, depois camisa asc,
      // preservando ordem de inserção como desempate.
      const teamPlayers = curr.elements
        .map((el, order) => ({ el, order }))
        .filter(({ el }) => el.type === 'player' && el.team === team)
        .sort((a, b) => {
          if (!!b.el.isGoalkeeper - !!a.el.isGoalkeeper) return (!!b.el.isGoalkeeper) - (!!a.el.isGoalkeeper);
          const na = Number(a.el.jerseyNumber) || 999;
          const nb = Number(b.el.jerseyNumber) || 999;
          if (na !== nb) return na - nb;
          return a.order - b.order;
        });

      positions.forEach((slot, i) => {
        const paired = teamPlayers[i];
        if (paired) {
          // Reposiciona (x,y) no frame ATUAL. Atleta real preserva nome e
          // camisa; genérico adota a identidade do slot — e identidade é
          // global, então propaga em TODOS os frames.
          const isReal = !!paired.el.athleteId;
          const identityPatch = isReal
            ? null
            : {
                jerseyNumber: slot.jerseyNumber,
                name: slot.name,
                isGoalkeeper: !!slot.isGoalkeeper,
              };
          next = next.map((frame, fi) => ({
            ...frame,
            elements: frame.elements.map((el) => {
              if (el.id !== paired.el.id) return el;
              const posPatch = fi === currentFrameIndex ? { x: slot.x, y: slot.y } : null;
              return { ...el, ...(identityPatch || {}), ...(posPatch || {}) };
            }),
          }));
          repositioned++;
        } else {
          // Slot sem jogador: cria genérico no frame atual E seguintes
          const id = generateId('player');
          const newEl = {
            id,
            type: 'player',
            team,
            jerseyNumber: slot.jerseyNumber,
            name: slot.name,
            athleteId: null,
            isGoalkeeper: !!slot.isGoalkeeper,
            x: slot.x,
            y: slot.y,
          };
          next = next.map((frame, i2) =>
            i2 >= currentFrameIndex
              ? { ...frame, elements: [...frame.elements, { ...newEl }] }
              : frame
          );
          added++;
        }
      });

      // Excedentes ficam onde estão (não-destrutivo)
      kept += Math.max(0, teamPlayers.length - positions.length);
    }

    commit(next);
    return { repositioned, added, kept };
  }, [currentFrameIndex, commit]);

  // ====== DRAWINGS ======

  const addDrawing = useCallback((drawingData) => {
    const id = generateId('draw');
    const newDrawing = { id, ...drawingData };
    const next = framesRef.current.map((frame, i) =>
      i >= currentFrameIndex
        ? { ...frame, drawings: [...(frame.drawings || []), { ...newDrawing }] }
        : frame
    );
    commit(next);
    return id;
  }, [currentFrameIndex, commit]);

  const removeDrawing = useCallback((drawingId) => {
    const next = framesRef.current.map((frame) => ({
      ...frame,
      drawings: (frame.drawings || []).filter((d) => d.id !== drawingId),
    }));
    commit(next);
    setSelectedDrawingId((prev) => (prev === drawingId ? null : prev));
  }, [commit]);

  // Aplica em TODOS os frames — desenhos são anotações estáticas clonadas
  // entre frames; editar cor/texto/posição só no frame atual deixaria as
  // cópias dos frames seguintes divergentes.
  const updateDrawing = useCallback((drawingId, updates) => {
    const next = framesRef.current.map((frame) => ({
      ...frame,
      drawings: (frame.drawings || []).map((d) =>
        d.id === drawingId ? { ...d, ...updates } : d
      ),
    }));
    commit(next);
  }, [commit]);

  // ====== FRAMES ======

  const addFrame = useCallback(() => {
    const prev = framesRef.current;
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
    commit(reindexed);
    setCurrentFrameIndex((i) => i + 1);
  }, [currentFrameIndex, commit]);

  const deleteFrame = useCallback(() => {
    const prev = framesRef.current;
    if (prev.length <= 1) return;
    const updated = prev.filter((_, i) => i !== currentFrameIndex);
    const reindexed = updated.map((f, i) => ({ ...f, index: i }));
    commit(reindexed);
    setCurrentFrameIndex((i) => Math.max(0, i - 1));
  }, [currentFrameIndex, commit]);

  const goToFrame = useCallback((index) => {
    setCurrentFrameIndex(Math.max(0, Math.min(index, framesRef.current.length - 1)));
  }, []);

  const goToNextFrame = useCallback(() => {
    setCurrentFrameIndex((prev) => Math.min(prev + 1, framesRef.current.length - 1));
  }, []);

  const goToPrevFrame = useCallback(() => {
    setCurrentFrameIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // ====== HISTÓRICO ======

  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    historyIndexRef.current = idx - 1;
    const restored = deepClone(historyRef.current[idx - 1]);
    setFrames(restored);
    setCurrentFrameIndex((i) => Math.min(i, restored.length - 1));
    setHistoryVersion((v) => v + 1);
  }, [setFrames]);

  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx >= historyRef.current.length - 1) return;
    historyIndexRef.current = idx + 1;
    const restored = deepClone(historyRef.current[idx + 1]);
    setFrames(restored);
    setCurrentFrameIndex((i) => Math.min(i, restored.length - 1));
    setHistoryVersion((v) => v + 1);
  }, [setFrames]);

  // ====== LOAD / RESET / SAVE ======

  const loadPlay = useCallback((playData) => {
    if (!playData) return;
    setFieldType(playData.field_type || FIELD_TYPES.FOOTBALL_11);
    setFieldView(playData.field_view || FIELD_VIEWS.FULL);
    setTeamAColor(playData.team_a_color || '#3b82f6');
    setTeamBColor(playData.team_b_color || '#ef4444');
    const keyframes = playData.keyframes || [createInitialFrame()];
    const framesWithDrawings = keyframes.map(f => ({
      ...f,
      drawings: f.drawings || [],
    }));
    const initial = framesWithDrawings.length > 0 ? framesWithDrawings : [createInitialFrame()];
    setFrames(initial);
    setCurrentFrameIndex(0);
    setSelectedElementId(null);
    setSelectedDrawingId(null);
    historyRef.current = [deepClone(initial)];
    historyIndexRef.current = 0;
    savedHistoryIndexRef.current = 0;
    setMetaDirty(false);
    setHistoryVersion((v) => v + 1);
  }, [setFrames]);

  const resetBoard = useCallback(() => {
    const initial = [createInitialFrame()];
    setFrames(initial);
    setCurrentFrameIndex(0);
    setSelectedElementId(null);
    setSelectedDrawingId(null);
    historyRef.current = [deepClone(initial)];
    historyIndexRef.current = 0;
    savedHistoryIndexRef.current = 0;
    setMetaDirty(false);
    setHistoryVersion((v) => v + 1);
  }, [setFrames]);

  // Marca o estado atual como salvo (chamar após persistir com sucesso)
  const markSaved = useCallback(() => {
    savedHistoryIndexRef.current = historyIndexRef.current;
    setMetaDirty(false);
    setHistoryVersion((v) => v + 1);
  }, []);

  // Setters de meta que contam como alteração salvável
  const setFieldTypeDirty = useCallback((v) => { setFieldType(v); setMetaDirty(true); }, []);
  const setFieldViewDirty = useCallback((v) => { setFieldView(v); setMetaDirty(true); }, []);
  const setTeamAColorDirty = useCallback((v) => { setTeamAColor(v); setMetaDirty(true); }, []);
  const setTeamBColorDirty = useCallback((v) => { setTeamBColor(v); setMetaDirty(true); }, []);

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
    updateElementProps,
    nextGenericJersey,
    applyFormations,
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
    setFieldType: setFieldTypeDirty,
    setFieldView: setFieldViewDirty,
    setTeamAColor: setTeamAColorDirty,
    setTeamBColor: setTeamBColorDirty,
    loadPlay,
    resetBoard,
    getPlayData,
    markSaved,

    // History
    undo,
    redo,
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,
    isDirty: historyIndexRef.current !== savedHistoryIndexRef.current || metaDirty,
  };
}
