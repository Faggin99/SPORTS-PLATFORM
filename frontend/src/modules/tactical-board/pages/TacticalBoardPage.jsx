import { useState, useRef, useCallback, useEffect } from 'react';
import { Maximize2, Minimize2, Plus, X } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useClub } from '../../../contexts/ClubContext';
import TacticalCanvas from '../components/canvas/TacticalCanvas';
import FrameControls from '../components/toolbar/FrameControls';
import PlaybackControls from '../components/toolbar/PlaybackControls';
import PlayerPalette from '../components/toolbar/PlayerPalette';
import SavePlayModal from '../components/modals/SavePlayModal';
import LoadPlayModal from '../components/modals/LoadPlayModal';
import { useTacticalBoard } from '../hooks/useTacticalBoard';
import { usePlayback } from '../hooks/usePlayback';
import { useVideoExport } from '../hooks/useVideoExport';
import { usePlays } from '../hooks/usePlays';
import { getFormationsForFieldType } from '../utils/defaultFormations';
import { FIELD_VIEWS } from '../utils/fieldDimensions';

// Drawing tool configurations
const ARROW_TOOLS = [
  { id: 'arrow_run', mode: 'arrow_straight', dash: [], label: '→', title: 'Corrida (seta contínua)', color: '#ffffff' },
  { id: 'arrow_pass', mode: 'arrow_straight', dash: [8, 5], label: '⇢', title: 'Passe (seta tracejada)', color: '#fbbf24' },
  { id: 'arrow_dribble', mode: 'arrow_straight', dash: [3, 3], label: '⋯→', title: 'Drible (seta pontilhada)', color: '#22c55e' },
  { id: 'arrow_curved', mode: 'arrow_curved', dash: [], label: '↝', title: 'Seta curva', color: '#ffffff' },
];

const MARKER_TYPES = [
  { type: 'cone', label: '▲', title: 'Cone baixo', color: '#f97316' },
  { type: 'cone_tall', label: '⧋', title: 'Cone alto', color: '#f97316' },
  { type: 'disc', label: '●', title: 'Disco marcador', color: '#22c55e' },
  { type: 'barrier', label: '▬', title: 'Barreira', color: '#a855f7' },
  { type: 'pole', label: '│', title: 'Estaca', color: '#f59e0b' },
  { type: 'flag', label: '⚑', title: 'Bandeira', color: '#ef4444' },
  { type: 'ladder', label: '☰', title: 'Escada agilidade', color: '#facc15' },
  { type: 'mannequin', label: '♟', title: 'Manequim', color: '#3b82f6' },
  { type: 'hoop', label: '○', title: 'Arco', color: '#f97316' },
  { type: 'mini_goal', label: '⊓', title: 'Mini gol', color: '#ffffff' },
];

const FIELD_VIEW_OPTIONS = [
  { view: FIELD_VIEWS.FULL, label: 'Campo inteiro' },
  { view: FIELD_VIEWS.LEFT_HALF, label: 'Meio esquerdo' },
  { view: FIELD_VIEWS.RIGHT_HALF, label: 'Meio direito' },
  { view: FIELD_VIEWS.THIRD_LEFT, label: '⅓ esquerdo' },
  { view: FIELD_VIEWS.THIRD_RIGHT, label: '⅓ direito' },
];

const ZONE_TOOLS = [
  { id: 'zone_rect', mode: 'zone_rect', label: '▭', title: 'Zona retangular' },
  { id: 'zone_circle', mode: 'zone_circle', label: '◯', title: 'Zona circular' },
];

const DRAWING_COLORS = [
  '#ffffff', '#fbbf24', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ec4899',
];

export default function TacticalBoardPage() {
  const { colors } = useTheme();
  const { selectedClub } = useClub();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [currentPlayId, setCurrentPlayId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Drawing mode state
  const [drawingMode, setDrawingMode] = useState(null);
  const [activeToolId, setActiveToolId] = useState(null);
  const [drawingColor, setDrawingColor] = useState('#ffffff');
  const [drawingDash, setDrawingDash] = useState([]);
  const [drawingStrokeWidth, setDrawingStrokeWidth] = useState(2.5);

  // Toolbar section toggles
  const [expandedSection, setExpandedSection] = useState(null);

  const [athletes, setAthletes] = useState([]);
  useEffect(() => {
    import('../../training-management/services/athleteService').then((mod) => {
      const service = mod.athleteService || mod.default;
      if (service?.getAll) {
        service.getAll().then(setAthletes).catch(() => {});
      }
    }).catch(() => {});
  }, [selectedClub]);

  const board = useTacticalBoard();
  const playback = usePlayback(board.frames, board.currentFrameIndex, board.goToFrame);
  const videoExport = useVideoExport(canvasRef, board.frames, board.fieldType);
  const plays = usePlays();

  const displayElements = videoExport.exportElements
    ? videoExport.exportElements
    : playback.isPlaying && playback.interpolatedElements
      ? playback.interpolatedElements
      : board.currentFrame.elements;

  const displayDrawings = board.currentFrame.drawings || [];
  const nextFrameElements = board.nextFrame?.elements || null;
  const playerCountRef = useRef({ A: 0, B: 0 });

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Activate a drawing tool
  const activateDrawingTool = useCallback((toolId, mode, dash = [], color = null) => {
    if (activeToolId === toolId) {
      // Toggle off
      setDrawingMode(null);
      setActiveToolId(null);
      setDrawingDash([]);
      return;
    }
    setDrawingMode(mode);
    setActiveToolId(toolId);
    setDrawingDash(dash);
    if (color) setDrawingColor(color);
    board.setSelectedElementId(null);
    board.setSelectedDrawingId(null);
  }, [activeToolId, board]);

  const clearDrawingMode = useCallback(() => {
    setDrawingMode(null);
    setActiveToolId(null);
    setDrawingDash([]);
  }, []);

  const handleDrawingComplete = useCallback((drawingData) => {
    board.addDrawing(drawingData);
  }, [board]);

  const handleAddPlayer = useCallback((teamOrData) => {
    clearDrawingMode();
    let team, jerseyNumber, name, athleteId, isGoalkeeper;
    if (typeof teamOrData === 'string') {
      team = teamOrData;
      playerCountRef.current[team]++;
      jerseyNumber = playerCountRef.current[team];
      name = '';
      athleteId = null;
      isGoalkeeper = false;
    } else {
      team = teamOrData.team;
      jerseyNumber = teamOrData.jerseyNumber;
      name = teamOrData.name;
      athleteId = teamOrData.athleteId;
      isGoalkeeper = teamOrData.isGoalkeeper || false;
    }
    board.addElement({
      type: 'player', team, jerseyNumber, name, athleteId, isGoalkeeper,
      x: 50 + (Math.random() - 0.5) * 20,
      y: 50 + (Math.random() - 0.5) * 20,
    });
  }, [board, clearDrawingMode]);

  const handleAddGoalkeeper = useCallback((team) => {
    clearDrawingMode();
    playerCountRef.current[team]++;
    board.addElement({
      type: 'player', team, jerseyNumber: 1, name: 'GK', athleteId: null, isGoalkeeper: true,
      x: team === 'A' ? 5 : 95,
      y: 50,
    });
  }, [board, clearDrawingMode]);

  const handleAddBall = useCallback(() => {
    clearDrawingMode();
    board.addElement({ type: 'ball', team: null, x: 50, y: 50 });
  }, [board, clearDrawingMode]);

  const handleAddMarker = useCallback((markerType) => {
    clearDrawingMode();
    board.addElement({
      type: 'marker', team: null, markerType,
      x: 50 + (Math.random() - 0.5) * 30,
      y: 50 + (Math.random() - 0.5) * 30,
    });
  }, [board, clearDrawingMode]);

  const handleRemoveSelected = useCallback(() => {
    if (board.selectedElementId) board.removeElement(board.selectedElementId);
    if (board.selectedDrawingId) board.removeDrawing(board.selectedDrawingId);
  }, [board]);

  const handleSave = useCallback(async ({ name, description }) => {
    const playData = { ...board.getPlayData(), name, description, club_id: selectedClub?.id || null };
    if (currentPlayId) {
      await plays.updatePlay(currentPlayId, playData);
    } else {
      const created = await plays.createPlay(playData);
      setCurrentPlayId(created.id);
    }
  }, [board, currentPlayId, plays, selectedClub]);

  const handleLoad = useCallback((play) => {
    board.loadPlay(play);
    setCurrentPlayId(play.id);
    playerCountRef.current = { A: 0, B: 0 };
    clearDrawingMode();
  }, [board, clearDrawingMode]);

  const handleReset = useCallback(() => {
    if (window.confirm('Limpar todo o quadro tático?')) {
      board.resetBoard();
      setCurrentPlayId(null);
      playerCountRef.current = { A: 0, B: 0 };
      clearDrawingMode();
    }
  }, [board, clearDrawingMode]);

  const handleLoadFormation = useCallback((formationKey) => {
    clearDrawingMode();
    const formations = getFormationsForFieldType(board.fieldType);
    const formation = formations[formationKey];
    if (!formation) return;
    board.resetBoard();
    playerCountRef.current = { A: 0, B: 0 };
    formation.positions.forEach((pos) => {
      playerCountRef.current.A++;
      board.addElement({
        type: 'player', team: 'A',
        jerseyNumber: pos.jerseyNumber, name: pos.name, athleteId: null,
        isGoalkeeper: pos.jerseyNumber === 1 && (pos.name === 'GK' || pos.name === 'GOL'),
        x: pos.x, y: pos.y,
      });
    });
  }, [board, clearDrawingMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') handleRemoveSelected();
      else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); board.undo(); }
      else if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); board.redo(); }
      else if (e.key === ' ') { e.preventDefault(); playback.isPlaying ? playback.pause() : playback.play(); }
      else if (e.key === 'ArrowRight') board.goToNextFrame();
      else if (e.key === 'ArrowLeft') board.goToPrevFrame();
      else if (e.key === 'Escape') { setToolbarOpen(false); setPaletteOpen(false); clearDrawingMode(); setExpandedSection(null); }
      else if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board, playback, handleRemoveSelected, toggleFullscreen, clearDrawingMode]);

  const formations = getFormationsForFieldType(board.fieldType);

  // --- Toolbar button helper ---
  const ToolBtn = ({ onClick, active, color, title, children, style = {} }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '0.2rem 0.4rem',
        borderRadius: '0.25rem',
        border: active ? `1px solid ${color || 'rgba(255,255,255,0.5)'}` : '1px solid transparent',
        backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
        color: color || 'rgba(255,255,255,0.85)',
        cursor: 'pointer',
        fontSize: '0.75rem',
        fontWeight: '500',
        lineHeight: 1.2,
        transition: 'all 0.1s',
        minWidth: 26,
        textAlign: 'center',
        ...style,
      }}
    >
      {children}
    </button>
  );

  const SectionBtn = ({ id, label }) => (
    <button
      onClick={() => setExpandedSection(expandedSection === id ? null : id)}
      style={{
        padding: '0.2rem 0.5rem',
        borderRadius: '0.25rem',
        border: expandedSection === id ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
        backgroundColor: expandedSection === id ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
        color: expandedSection === id ? 'white' : 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
        fontSize: '0.7rem',
        fontWeight: '600',
        transition: 'all 0.1s',
      }}
    >
      {label} {expandedSection === id ? '▾' : '▸'}
    </button>
  );

  const Sep = () => <div style={{ width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />;

  const fabStyle = {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    transition: 'transform 0.15s, background-color 0.15s',
    zIndex: 20,
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '100vh' : 'calc(100vh - 64px)',
        margin: '-1.5rem',
        backgroundColor: '#0f0f1e',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {/* === CANVAS === */}
      <div style={{ flex: 1, position: 'relative' }}>
        <TacticalCanvas
          ref={canvasRef}
          fieldType={board.fieldType}
          fieldView={board.fieldView}
          elements={displayElements}
          drawings={displayDrawings}
          nextFrameElements={nextFrameElements}
          teamAColor={board.teamAColor}
          teamBColor={board.teamBColor}
          isPlaying={playback.isPlaying}
          drawingMode={drawingMode}
          drawingColor={drawingColor}
          drawingDash={drawingDash}
          drawingStrokeWidth={drawingStrokeWidth}
          onElementMove={board.updateElementPosition}
          onElementSelect={board.setSelectedElementId}
          onDrawingSelect={board.setSelectedDrawingId}
          onDrawingComplete={handleDrawingComplete}
          selectedElementId={board.selectedElementId}
          selectedDrawingId={board.selectedDrawingId}
        />

        {/* FAB: Toggle toolbar */}
        <button
          style={{ ...fabStyle, top: 10, left: 10, backgroundColor: toolbarOpen ? '#ef4444' : colors.primary, color: 'white' }}
          onClick={() => setToolbarOpen(!toolbarOpen)}
          title={toolbarOpen ? 'Fechar (Esc)' : 'Menu de ferramentas'}
        >
          {toolbarOpen ? <X size={20} /> : <Plus size={20} />}
        </button>

        {/* FAB: Fullscreen */}
        <button
          style={{ ...fabStyle, top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.12)', color: 'white', backdropFilter: 'blur(8px)' }}
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Sair tela cheia (F11)' : 'Tela cheia (F11)'}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        {/* Drawing mode indicator */}
        {drawingMode && (
          <div style={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 25,
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', borderRadius: '0.5rem',
            padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.7rem', color: 'white',
          }}>
            <span style={{ opacity: 0.7 }}>Modo:</span>
            <span style={{ fontWeight: '600' }}>
              {drawingMode === 'arrow_straight' ? 'Seta reta' :
               drawingMode === 'arrow_curved' ? 'Seta curva' :
               drawingMode === 'free_draw' ? 'Desenho livre' :
               drawingMode === 'zone_rect' ? 'Zona retangular' :
               drawingMode === 'zone_circle' ? 'Zona circular' :
               drawingMode === 'text' ? 'Texto' : drawingMode}
            </span>
            <button onClick={clearDrawingMode}
              style={{ border: 'none', background: 'rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '0.25rem', cursor: 'pointer', padding: '0.1rem 0.3rem', fontSize: '0.65rem' }}>
              Sair
            </button>
          </div>
        )}

        {/* === FLOATING TOOLBAR === */}
        {toolbarOpen && (
          <div style={{
            position: 'absolute', top: 10, left: 56, right: 56, zIndex: 30,
            backgroundColor: 'rgba(12, 12, 28, 0.8)', backdropFilter: 'blur(14px)',
            borderRadius: '0.625rem', border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            {/* Main row */}
            <div style={{
              padding: '0.3rem 0.5rem',
              display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap',
            }}>
              {/* Field type */}
              {['football_11', 'futsal'].map((t) => (
                <ToolBtn key={t} onClick={() => board.setFieldType(t)} active={board.fieldType === t}
                  color={board.fieldType === t ? colors.primary : null}
                  title={t === 'football_11' ? 'Futebol 11' : 'Futsal'}>
                  {t === 'football_11' ? 'F11' : 'Futsal'}
                </ToolBtn>
              ))}

              <Sep />

              {/* Field view */}
              <SectionBtn id="field_view" label="Vista" />

              <Sep />

              {/* Players */}
              <ToolBtn onClick={() => handleAddPlayer('A')} title="Jogador Time A" color={board.teamAColor}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', backgroundColor: board.teamAColor, marginRight: 3, verticalAlign: 'middle' }} />+
              </ToolBtn>
              <ToolBtn onClick={() => handleAddPlayer('B')} title="Jogador Time B" color={board.teamBColor}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', backgroundColor: board.teamBColor, marginRight: 3, verticalAlign: 'middle' }} />+
              </ToolBtn>
              <ToolBtn onClick={() => handleAddGoalkeeper('A')} title="Goleiro Time A" color={board.teamAColor}
                style={{ fontSize: '0.65rem' }}>
                GK<span style={{ fontSize: '0.5rem' }}>A</span>
              </ToolBtn>
              <ToolBtn onClick={() => handleAddGoalkeeper('B')} title="Goleiro Time B" color={board.teamBColor}
                style={{ fontSize: '0.65rem' }}>
                GK<span style={{ fontSize: '0.5rem' }}>B</span>
              </ToolBtn>
              <ToolBtn onClick={handleAddBall} title="Bola">⚽</ToolBtn>

              <Sep />

              {/* Tool sections */}
              <SectionBtn id="markers" label="Objetos" />
              <SectionBtn id="arrows" label="Setas" />
              <SectionBtn id="drawing" label="Desenho" />
              <SectionBtn id="formations" label="Formações" />

              <Sep />

              {/* Actions */}
              <ToolBtn onClick={() => setPaletteOpen(!paletteOpen)} active={paletteOpen}
                title="Plantel" color={paletteOpen ? colors.primary : null}>Plantel</ToolBtn>
              <ToolBtn onClick={() => setSaveModalOpen(true)} title="Salvar">💾</ToolBtn>
              <ToolBtn onClick={() => setLoadModalOpen(true)} title="Carregar">📂</ToolBtn>
              <ToolBtn onClick={() => videoExport.startExport()}
                active={false}
                title="Exportar vídeo"
                color={board.totalFrames > 1 ? colors.primary : 'rgba(255,255,255,0.25)'}
                style={{ cursor: board.totalFrames > 1 ? 'pointer' : 'default' }}>
                {videoExport.isExporting ? '⏳' : '🎬'}
              </ToolBtn>

              <div style={{ flex: 1 }} />

              {/* Undo/redo */}
              <ToolBtn onClick={board.undo} title="Desfazer (Ctrl+Z)"
                color={board.canUndo ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)'}
                style={{ cursor: board.canUndo ? 'pointer' : 'default' }}>↩</ToolBtn>
              <ToolBtn onClick={board.redo} title="Refazer (Ctrl+Y)"
                color={board.canRedo ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)'}
                style={{ cursor: board.canRedo ? 'pointer' : 'default' }}>↪</ToolBtn>
              {(board.selectedElementId || board.selectedDrawingId) && (
                <ToolBtn onClick={handleRemoveSelected} title="Remover (Del)" color="#ef4444">🗑</ToolBtn>
              )}
              <ToolBtn onClick={handleReset} title="Limpar tudo" color="#ef4444"
                style={{ fontSize: '0.65rem' }}>Limpar</ToolBtn>
            </div>

            {/* Expanded sections */}
            {expandedSection === 'field_view' && (
              <div style={{ padding: '0.25rem 0.5rem 0.35rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {FIELD_VIEW_OPTIONS.map(({ view, label }) => (
                  <ToolBtn key={view} onClick={() => board.setFieldView(view)} active={board.fieldView === view}
                    color={board.fieldView === view ? colors.primary : null}>{label}</ToolBtn>
                ))}
              </div>
            )}

            {expandedSection === 'markers' && (
              <div style={{ padding: '0.25rem 0.5rem 0.35rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {MARKER_TYPES.map(({ type, label, title, color }) => (
                  <ToolBtn key={type} onClick={() => handleAddMarker(type)} title={title} color={color}>{label}</ToolBtn>
                ))}
              </div>
            )}

            {expandedSection === 'arrows' && (
              <div style={{ padding: '0.25rem 0.5rem 0.35rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {ARROW_TOOLS.map((tool) => (
                  <ToolBtn key={tool.id} onClick={() => activateDrawingTool(tool.id, tool.mode, tool.dash, tool.color)}
                    active={activeToolId === tool.id} title={tool.title} color={tool.color}>
                    {tool.label}
                  </ToolBtn>
                ))}
                <Sep />
                {/* Color picker for arrows */}
                {DRAWING_COLORS.map((c) => (
                  <button key={c} onClick={() => setDrawingColor(c)} title={c}
                    style={{
                      width: 16, height: 16, borderRadius: '50%', border: drawingColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                      backgroundColor: c, cursor: 'pointer', padding: 0,
                    }} />
                ))}
              </div>
            )}

            {expandedSection === 'drawing' && (
              <div style={{ padding: '0.25rem 0.5rem 0.35rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <ToolBtn onClick={() => activateDrawingTool('free_draw', 'free_draw')}
                  active={activeToolId === 'free_draw'} title="Desenho livre" color="#fbbf24">✏️ Livre</ToolBtn>
                {ZONE_TOOLS.map((tool) => (
                  <ToolBtn key={tool.id} onClick={() => activateDrawingTool(tool.id, tool.mode)}
                    active={activeToolId === tool.id} title={tool.title}>
                    {tool.label} {tool.title.split(' ')[1]}
                  </ToolBtn>
                ))}
                <ToolBtn onClick={() => activateDrawingTool('text', 'text')}
                  active={activeToolId === 'text'} title="Texto">📝 Texto</ToolBtn>
                <Sep />
                {DRAWING_COLORS.map((c) => (
                  <button key={c} onClick={() => setDrawingColor(c)} title={c}
                    style={{
                      width: 16, height: 16, borderRadius: '50%', border: drawingColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                      backgroundColor: c, cursor: 'pointer', padding: 0,
                    }} />
                ))}
              </div>
            )}

            {expandedSection === 'formations' && (
              <div style={{ padding: '0.25rem 0.5rem 0.35rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {Object.entries(formations).map(([key, f]) => (
                  <ToolBtn key={key} onClick={() => handleLoadFormation(key)} title={`Formação ${f.label}`}>{f.label}</ToolBtn>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === PLAYBACK (floating center-bottom, only pill captures clicks) === */}
        <div style={{
          position: 'absolute', bottom: 36, left: 0, right: 0, zIndex: 15,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '1.5rem',
            backdropFilter: 'blur(8px)', padding: '0.125rem 0.5rem',
            pointerEvents: 'auto',
          }}>
            <PlaybackControls
              isPlaying={playback.isPlaying}
              speed={playback.speed}
              currentFrameIndex={board.currentFrameIndex}
              totalFrames={board.totalFrames}
              onPlay={playback.play}
              onPause={playback.pause}
              onRewind={playback.rewind}
              onSpeedChange={playback.setSpeed}
            />
          </div>
        </div>

        {/* === FRAME STRIP (very bottom, thin bar) === */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15,
          pointerEvents: 'none',
        }}>
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            pointerEvents: 'auto',
          }}>
            <FrameControls
              currentFrameIndex={board.currentFrameIndex}
              totalFrames={board.totalFrames}
              onAddFrame={board.addFrame}
              onDeleteFrame={board.deleteFrame}
              onGoToFrame={board.goToFrame}
              onGoToPrevFrame={board.goToPrevFrame}
              onGoToNextFrame={board.goToNextFrame}
            />
          </div>
        </div>
      </div>

      {/* === PLAYER PALETTE === */}
      {paletteOpen && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 25,
          boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
        }}>
          <PlayerPalette
            athletes={athletes}
            onAddPlayer={handleAddPlayer}
            teamAColor={board.teamAColor}
            teamBColor={board.teamBColor}
            isOpen={paletteOpen}
            onClose={() => setPaletteOpen(false)}
          />
        </div>
      )}

      {/* Modals */}
      <SavePlayModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSave}
        initialData={{}}
      />
      <LoadPlayModal
        isOpen={loadModalOpen}
        onClose={() => setLoadModalOpen(false)}
        onLoad={handleLoad}
        onDelete={plays.deletePlay}
        plays={plays.plays}
        loading={plays.loading}
        onFetch={() => plays.fetchPlays(selectedClub?.id)}
      />
    </div>
  );
}
