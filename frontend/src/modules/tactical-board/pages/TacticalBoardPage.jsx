import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Users, UserPlus, ArrowRight, Pencil, LayoutGrid,
  Save, FolderOpen, Film, Undo2, Redo2, Trash2, Eye, Maximize2, Minimize2,
  Keyboard, Pause, Plus, X, Cone, Smartphone,
  PenLine, Square as SquareIcon, Circle as CircleIcon, Type,
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useClub } from '../../../contexts/ClubContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useSportConfig } from '../../../hooks/useSportConfig';
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
import { TourGuide } from '../../../components/common/TourGuide';
import { useTour, useTourReplayListener } from '../../../hooks/useTour';
import { getFormationsForFieldType } from '../utils/defaultFormations';
import { FIELD_VIEWS } from '../utils/fieldDimensions';

// ─────────────────────────────────────────────────────────────────
// Catálogos
// ─────────────────────────────────────────────────────────────────
const ARROW_TOOLS = [
  { id: 'arrow_run',     mode: 'arrow_straight', dash: [],     label: 'Corrida',  desc: 'Seta contínua',  color: '#ffffff' },
  { id: 'arrow_pass',    mode: 'arrow_straight', dash: [8, 5], label: 'Passe',    desc: 'Seta tracejada', color: '#fbbf24' },
  { id: 'arrow_dribble', mode: 'arrow_straight', dash: [3, 3], label: 'Drible',   desc: 'Seta pontilhada', color: '#22c55e' },
  { id: 'arrow_curved',  mode: 'arrow_curved',   dash: [],     label: 'Curva',    desc: 'Seta curva',     color: '#ffffff' },
];

const MARKER_TYPES = [
  { type: 'cone',       label: 'Cone baixo',   icon: '▲' },
  { type: 'cone_tall',  label: 'Cone alto',    icon: '⧋' },
  { type: 'disc',       label: 'Disco',        icon: '●' },
  { type: 'barrier',    label: 'Barreira',     icon: '▬' },
  { type: 'pole',       label: 'Estaca',       icon: '│' },
  { type: 'flag',       label: 'Bandeira',     icon: '⚑' },
  { type: 'ladder',     label: 'Escada',       icon: '☰' },
  { type: 'mannequin',  label: 'Manequim',     icon: '♟' },
  { type: 'hoop',       label: 'Arco',         icon: '○' },
  { type: 'mini_goal',  label: 'Mini gol',     icon: '⊓' },
];

const FIELD_VIEW_OPTIONS = [
  { view: FIELD_VIEWS.FULL,        label: 'Campo inteiro' },
  { view: FIELD_VIEWS.LEFT_HALF,   label: 'Metade esquerda' },
  { view: FIELD_VIEWS.RIGHT_HALF,  label: 'Metade direita' },
  { view: FIELD_VIEWS.THIRD_LEFT,  label: 'Terço esquerdo' },
  { view: FIELD_VIEWS.THIRD_RIGHT, label: 'Terço direito' },
];

const DRAWING_COLORS = ['#ffffff', '#fbbf24', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ec4899'];

const SHORTCUTS = [
  ['Espaço',          'Play / Pause'],
  ['← / →',           'Frame anterior / próximo'],
  ['Ctrl+Z / Ctrl+Y', 'Desfazer / Refazer'],
  ['Delete',          'Remover seleção'],
  ['Esc',             'Cancelar / fechar painéis'],
  ['F11',             'Tela cheia'],
];

// ─────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────
export default function TacticalBoardPage() {
  const { colors, isDark } = useTheme();
  const { selectedClub } = useClub();
  const isMobile = useIsMobile();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [currentPlayId, setCurrentPlayId] = useState(null);
  const [currentPlayName, setCurrentPlayName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Drawing mode
  const [drawingMode, setDrawingMode] = useState(null);
  const [activeToolId, setActiveToolId] = useState(null);
  const [drawingColor, setDrawingColor] = useState('#ffffff');
  const [drawingDash, setDrawingDash] = useState([]);
  const [drawingStrokeWidth] = useState(2.5);

  // Sidebar flyout
  const [openSection, setOpenSection] = useState(null); // 'players' | 'arrows' | 'draw' | 'objects' | 'formations' | 'view'

  const [athletes, setAthletes] = useState([]);
  useEffect(() => {
    import('../../training-management/services/athleteService').then((mod) => {
      const service = mod.athleteService || mod.default;
      if (service?.getAll) service.getAll().then(setAthletes).catch(() => {});
    }).catch(() => {});
  }, [selectedClub]);

  const sport = useSportConfig();
  const board = useTacticalBoard({ initialFieldType: sport.defaultFieldType });
  const playback = usePlayback(board.frames, board.currentFrameIndex, board.goToFrame);
  const videoExport = useVideoExport(canvasRef, board.frames, board.fieldType);
  const plays = usePlays();

  const tour = useTour('tactical-board');
  useTourReplayListener('tactical-board', () => tour.setIsOpen(true));
  const tourSteps = useMemo(() => [
    { title: 'Quadro Tático', content: 'Aqui você cria jogadas animadas pra mostrar ao time. Sidebar à esquerda agrupa todas as ferramentas.' },
    { title: 'Adicionar peças', content: 'Clique em "Peças" na sidebar pra adicionar jogadores das duas equipes, goleiros e bola.' },
    { title: 'Animação', content: 'Use a barra inferior pra criar frames. Em cada frame, mova as peças onde quiser. O play interpola entre frames.' },
    { title: 'Salvar/Exportar', content: 'Salve sua jogada pra reusar depois ou exporte como vídeo .mp4 pra mandar pro grupo do clube.' },
    { title: 'Atalhos', content: 'Espaço pra play, ← → pra frames, Del pra remover, Ctrl+Z pra desfazer. Veja todos no botão "?" no canto.' },
  ], []);

  const playerCountRef = useRef({ A: 0, B: 0 });

  const displayElements = videoExport.exportElements
    ? videoExport.exportElements
    : (playback.isPlaying && playback.interpolatedElements)
      ? playback.interpolatedElements
      : board.currentFrame.elements;
  const displayDrawings = board.currentFrame.drawings || [];
  const nextFrameElements = board.nextFrame?.elements || null;

  // ── Fullscreen ──
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    else document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
  }, []);
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Drawing helpers ──
  const activateDrawingTool = useCallback((toolId, mode, dash = [], color = null) => {
    if (activeToolId === toolId) {
      setDrawingMode(null); setActiveToolId(null); setDrawingDash([]); return;
    }
    setDrawingMode(mode); setActiveToolId(toolId); setDrawingDash(dash);
    if (color) setDrawingColor(color);
    board.setSelectedElementId(null);
    board.setSelectedDrawingId(null);
  }, [activeToolId, board]);
  const clearDrawingMode = useCallback(() => { setDrawingMode(null); setActiveToolId(null); setDrawingDash([]); }, []);
  const handleDrawingComplete = useCallback((d) => board.addDrawing(d), [board]);

  // ── Elementos ──
  const handleAddPlayer = useCallback((teamOrData) => {
    clearDrawingMode();
    let team, jerseyNumber, name, athleteId, isGoalkeeper;
    if (typeof teamOrData === 'string') {
      team = teamOrData; playerCountRef.current[team]++;
      jerseyNumber = playerCountRef.current[team]; name = ''; athleteId = null; isGoalkeeper = false;
    } else {
      ({ team, jerseyNumber, name, athleteId } = teamOrData); isGoalkeeper = teamOrData.isGoalkeeper || false;
    }
    board.addElement({
      type: 'player', team, jerseyNumber, name, athleteId, isGoalkeeper,
      x: 50 + (Math.random() - 0.5) * 20, y: 50 + (Math.random() - 0.5) * 20,
    });
  }, [board, clearDrawingMode]);

  const handleAddGoalkeeper = useCallback((team) => {
    clearDrawingMode();
    playerCountRef.current[team]++;
    board.addElement({
      type: 'player', team, jerseyNumber: 1, name: 'GK', athleteId: null, isGoalkeeper: true,
      x: team === 'A' ? 5 : 95, y: 50,
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
      x: 50 + (Math.random() - 0.5) * 30, y: 50 + (Math.random() - 0.5) * 30,
    });
  }, [board, clearDrawingMode]);

  const handleRemoveSelected = useCallback(() => {
    if (board.selectedElementId) board.removeElement(board.selectedElementId);
    if (board.selectedDrawingId) board.removeDrawing(board.selectedDrawingId);
  }, [board]);

  const handleSave = useCallback(async ({ name, description }) => {
    const playData = { ...board.getPlayData(), name, description, club_id: selectedClub?.id || null };
    if (currentPlayId) await plays.updatePlay(currentPlayId, playData);
    else {
      const created = await plays.createPlay(playData);
      setCurrentPlayId(created.id);
    }
    setCurrentPlayName(name);
  }, [board, currentPlayId, plays, selectedClub]);

  const handleLoad = useCallback((play) => {
    board.loadPlay(play);
    setCurrentPlayId(play.id);
    setCurrentPlayName(play.name || '');
    playerCountRef.current = { A: 0, B: 0 };
    clearDrawingMode();
    setOpenSection(null);
  }, [board, clearDrawingMode]);

  const handleReset = useCallback(() => {
    if (window.confirm('Limpar todo o quadro tático?')) {
      board.resetBoard();
      setCurrentPlayId(null);
      setCurrentPlayName('');
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
        type: 'player', team: 'A', jerseyNumber: pos.jerseyNumber, name: pos.name, athleteId: null,
        isGoalkeeper: pos.jerseyNumber === 1 && (pos.name === 'GK' || pos.name === 'GOL'),
        x: pos.x, y: pos.y,
      });
    });
    setOpenSection(null);
  }, [board, clearDrawingMode]);

  // ── Atalhos ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') handleRemoveSelected();
      else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); board.undo(); }
      else if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); board.redo(); }
      else if (e.key === ' ') { e.preventDefault(); playback.isPlaying ? playback.pause() : playback.play(); }
      else if (e.key === 'ArrowRight') board.goToNextFrame();
      else if (e.key === 'ArrowLeft')  board.goToPrevFrame();
      else if (e.key === 'Escape') { setPaletteOpen(false); setOpenSection(null); clearDrawingMode(); setShortcutsOpen(false); }
      else if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [board, playback, handleRemoveSelected, toggleFullscreen, clearDrawingMode]);

  const formations = getFormationsForFieldType(board.fieldType);
  const selectedElement = useMemo(
    () => board.currentFrame.elements.find(el => el.id === board.selectedElementId) || null,
    [board.currentFrame.elements, board.selectedElementId]
  );

  // ─────────────────── Renderização ───────────────────
  // Detecta navegador mobile — bloqueia edição e mostra aviso do app oficial
  // Mobile: em vez de bloquear, adaptamos o layout (Flyout vira overlay,
  // hint discreto se estiver em retrato). Um botão em MobileHint sugere
  // rotacionar. O usuário PODE editar; só é menos confortável.

  return (
    <div ref={containerRef} style={{
      position: 'relative', width: '100%',
      height: isFullscreen ? '100vh' : 'calc(100vh - 64px)',
      margin: '-1.5rem',
      backgroundColor: 'transparent', // herda o fundo do estádio do Layout
      overflow: 'hidden',
      display: 'flex',
      color: colors.text,
      // Em mobile: melhor toque, evita scroll acidental
      touchAction: isMobile ? 'none' : 'auto',
    }}>
      <TourGuide isOpen={tour.isOpen} onClose={tour.stop} steps={tourSteps} storageKey={tour.storageKey} />
      {isMobile && <MobileRotateHint colors={colors} />}

      {/* ─── SIDEBAR ─── */}
      <Sidebar
        openSection={openSection}
        setOpenSection={(s) => { setOpenSection(s); clearDrawingMode(); }}
        canUndo={board.canUndo}
        canRedo={board.canRedo}
        onUndo={board.undo}
        onRedo={board.redo}
        onSave={() => setSaveModalOpen(true)}
        onLoad={() => setLoadModalOpen(true)}
        onExport={() => board.totalFrames > 1 && videoExport.startExport()}
        canExport={board.totalFrames > 1}
        exporting={videoExport.isExporting}
        onReset={handleReset}
        primary={colors.primary}
      />

      {/* ─── FLYOUT (painel da seção aberta) ─── */}
      {openSection && (
        <Flyout
          title={SECTIONS_TITLES[openSection]}
          onClose={() => setOpenSection(null)}
        >
          {openSection === 'players' && (
            <PlayersFlyout
              teamAColor={board.teamAColor} teamBColor={board.teamBColor}
              setTeamAColor={board.setTeamAColor} setTeamBColor={board.setTeamBColor}
              onAddA={() => handleAddPlayer('A')} onAddB={() => handleAddPlayer('B')}
              onAddGKA={() => handleAddGoalkeeper('A')} onAddGKB={() => handleAddGoalkeeper('B')}
              onAddBall={handleAddBall}
              onOpenPalette={() => { setPaletteOpen(true); setOpenSection(null); }}
            />
          )}
          {openSection === 'arrows' && (
            <ArrowsFlyout
              activeToolId={activeToolId}
              onActivate={(t) => activateDrawingTool(t.id, t.mode, t.dash, t.color)}
              drawingColor={drawingColor}
              setDrawingColor={setDrawingColor}
            />
          )}
          {openSection === 'draw' && (
            <DrawFlyout
              activeToolId={activeToolId}
              onActivate={activateDrawingTool}
              drawingColor={drawingColor}
              setDrawingColor={setDrawingColor}
            />
          )}
          {openSection === 'objects' && (
            <ObjectsFlyout onAdd={handleAddMarker} />
          )}
          {openSection === 'formations' && (
            <FormationsFlyout formations={formations} onLoad={handleLoadFormation} />
          )}
          {openSection === 'view' && (
            <ViewFlyout
              fieldType={board.fieldType} setFieldType={board.setFieldType}
              fieldView={board.fieldView} setFieldView={board.setFieldView}
            />
          )}
        </Flyout>
      )}

      {/* ─── ÁREA PRINCIPAL ─── */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0, zIndex: 1 }}>
        {/* TOP BAR — compacto pra dar espaço ao campo */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.3rem 0.65rem',
          backgroundColor: 'rgba(15,23,42,0.5)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          gap: '0.5rem',
          minHeight: 36,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Jogada:</span>
            <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
              {currentPlayName || 'Sem nome'}
            </span>
            {board.totalFrames > 1 && (
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', padding: '0.1rem 0.4rem', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                {board.totalFrames} frames
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <TopBtn onClick={() => setOpenSection('view')} title="Vista / tipo de campo" active={openSection === 'view'}>
              <Eye size={16} />
            </TopBtn>
            <TopBtn onClick={() => setShortcutsOpen(true)} title="Atalhos de teclado">
              <Keyboard size={16} />
            </TopBtn>
            <TopBtn onClick={toggleFullscreen} title={isFullscreen ? 'Sair tela cheia (F11)' : 'Tela cheia (F11)'}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </TopBtn>
          </div>
        </div>

        {/* CANVAS */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
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

          {/* Indicador de modo de desenho */}
          {drawingMode && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 25,
              backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', borderRadius: '0.5rem',
              padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.75rem', color: 'white',
            }}>
              <PenLine size={13} style={{ opacity: 0.7 }} />
              <span style={{ fontWeight: 600 }}>{describeMode(drawingMode)}</span>
              <button onClick={clearDrawingMode}
                style={{ border: 'none', background: 'rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: '0.25rem', cursor: 'pointer', padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}>
                Sair (Esc)
              </button>
            </div>
          )}

          {/* Painel de propriedades flutuante (canto inferior direito) quando há seleção */}
          {(board.selectedElementId || board.selectedDrawingId) && (
            <div style={{
              position: 'absolute', bottom: 110, right: 12, zIndex: 22,
              backgroundColor: 'rgba(12,12,28,0.92)', backdropFilter: 'blur(14px)',
              borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)',
              padding: '0.55rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            }}>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                {selectedElement ? `${selectedElement.type === 'player' ? `#${selectedElement.jerseyNumber || '—'}` : selectedElement.type === 'ball' ? 'Bola' : 'Objeto'}` : 'Desenho selecionado'}
              </span>
              <button onClick={handleRemoveSelected}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.55rem', background: 'rgba(239,68,68,0.18)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.3rem', fontSize: '0.72rem', cursor: 'pointer' }}>
                <Trash2 size={12} /> Remover
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM BAR — playback + frames */}
        <div style={{
          flexShrink: 0,
          backgroundColor: 'rgba(15,23,42,0.5)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.15rem 0' }}>
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
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
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

      {/* PALETTE (drawer direito) */}
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

      {/* Modais */}
      <SavePlayModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSave}
        initialData={{ name: currentPlayName }}
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

      {shortcutsOpen && (
        <ShortcutsModal onClose={() => setShortcutsOpen(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Auxiliares
// ─────────────────────────────────────────────────────────────────
const SECTIONS_TITLES = {
  players:    'Peças',
  arrows:     'Setas',
  draw:       'Desenho',
  objects:    'Objetos',
  formations: 'Formações',
  view:       'Vista do campo',
};

function describeMode(m) {
  switch (m) {
    case 'arrow_straight': return 'Seta reta';
    case 'arrow_curved':   return 'Seta curva';
    case 'free_draw':      return 'Desenho livre';
    case 'zone_rect':      return 'Zona retangular';
    case 'zone_circle':    return 'Zona circular';
    case 'text':           return 'Texto';
    default: return m;
  }
}

// ── Sidebar (compacta, só ícones com tooltip) ──
function Sidebar({ openSection, setOpenSection, canUndo, canRedo, onUndo, onRedo, onSave, onLoad, onExport, canExport, exporting, onReset, primary }) {
  const item = (key, Icon, label, onClick, opts = {}) => {
    const active = openSection === key;
    const disabled = opts.disabled;
    return (
      <button
        key={key || label}
        onClick={() => { if (disabled) return; onClick ? onClick() : setOpenSection(active ? null : key); }}
        title={label}
        aria-label={label}
        style={{
          width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active ? `${primary}30` : 'transparent',
          border: 'none',
          borderLeft: active ? `2px solid ${primary}` : '2px solid transparent',
          color: disabled ? 'rgba(255,255,255,0.25)' : (active ? primary : 'rgba(255,255,255,0.85)'),
          cursor: disabled ? 'default' : 'pointer',
          transition: 'all 0.12s',
        }}
        onMouseEnter={(e) => { if (!disabled && !active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
        onMouseLeave={(e) => { if (!disabled && !active) e.currentTarget.style.background = 'transparent'; }}
      >
        <Icon size={19} strokeWidth={1.85} />
      </button>
    );
  };
  const divider = (
    <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', margin: '0.3rem 0.5rem' }} />
  );

  return (
    <div style={{
      width: 44,
      flexShrink: 0,
      backgroundColor: 'rgba(15,23,42,0.55)',
      backdropFilter: 'blur(10px)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: '0.3rem',
      paddingBottom: '0.3rem',
      zIndex: 30,
    }}>
      {item('players',    UserPlus,   'Peças')}
      {item('formations', LayoutGrid, 'Formações')}
      {item('arrows',     ArrowRight, 'Setas')}
      {item('draw',       Pencil,     'Desenho')}
      {item('objects',    Cone,       'Objetos')}
      {divider}
      {item(null, Save,       'Salvar jogada',   onSave)}
      {item(null, FolderOpen, 'Abrir jogada',    onLoad)}
      {item(null, exporting ? Pause : Film, 'Exportar vídeo', onExport, { disabled: !canExport })}
      {divider}
      {item(null, Undo2, 'Desfazer (Ctrl+Z)', onUndo, { disabled: !canUndo })}
      {item(null, Redo2, 'Refazer (Ctrl+Y)',  onRedo, { disabled: !canRedo })}
      <div style={{ flex: 1 }} />
      {item(null, Trash2, 'Limpar tudo', onReset)}
    </div>
  );
}

// ── Flyout (painel ao lado da sidebar) ──
function Flyout({ title, onClose, children }) {
  const isMobile = useIsMobile();
  // Em mobile o Flyout vira overlay flutuante (position absolute) pra não
  // empurrar o canvas nem consumir metade da tela. Em desktop segue como
  // coluna que ocupa espaço no flex do container principal.
  const containerStyle = isMobile
    ? {
        position: 'absolute',
        top: 0, left: 44, bottom: 0,
        width: 'min(260px, calc(100vw - 60px))',
        backgroundColor: 'rgba(15,23,42,0.92)',
        backdropFilter: 'blur(14px)',
        boxShadow: '4px 0 20px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        zIndex: 40,
      }
    : {
        width: 230, flexShrink: 0,
        backgroundColor: 'rgba(15,23,42,0.82)',
        backdropFilter: 'blur(14px)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '4px 0 20px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column',
        zIndex: 29,
      };
  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 2 }}>
          <X size={15} />
        </button>
      </div>
      <div style={{ padding: '0.65rem 0.7rem', overflowY: 'auto', flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

// ── Flyouts específicos ──
function PlayersFlyout({ teamAColor, teamBColor, setTeamAColor, setTeamBColor, onAddA, onAddB, onAddGKA, onAddGKB, onAddBall, onOpenPalette }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div>
        <FlyoutLabel>Times</FlyoutLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <FlyBtn onClick={onAddA} color={teamAColor}><Plus size={11} /> Jogador A</FlyBtn>
          <FlyBtn onClick={onAddB} color={teamBColor}><Plus size={11} /> Jogador B</FlyBtn>
          <FlyBtn onClick={onAddGKA} color={teamAColor} small>GK Time A</FlyBtn>
          <FlyBtn onClick={onAddGKB} color={teamBColor} small>GK Time B</FlyBtn>
        </div>
      </div>
      <div>
        <FlyoutLabel>Bola e plantel</FlyoutLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <FlyBtn onClick={onAddBall}>Bola</FlyBtn>
          <FlyBtn onClick={onOpenPalette}><Users size={12} /> Plantel</FlyBtn>
        </div>
      </div>
      <div>
        <FlyoutLabel>Cores das equipes</FlyoutLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ColorRow label="Time A" color={teamAColor} setColor={setTeamAColor} />
          <ColorRow label="Time B" color={teamBColor} setColor={setTeamBColor} />
        </div>
      </div>
    </div>
  );
}

function ArrowsFlyout({ activeToolId, onActivate, drawingColor, setDrawingColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div>
        <FlyoutLabel>Tipo de seta</FlyoutLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {ARROW_TOOLS.map((t) => (
            <FlyBtn key={t.id} onClick={() => onActivate(t)} active={activeToolId === t.id}>
              <ArrowRight size={13} style={{ color: t.color }} />
              <span style={{ flex: 1, textAlign: 'left' }}>{t.label}</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{t.desc}</span>
            </FlyBtn>
          ))}
        </div>
      </div>
      <div>
        <FlyoutLabel>Cor</FlyoutLabel>
        <ColorPalette current={drawingColor} onPick={setDrawingColor} />
      </div>
    </div>
  );
}

function DrawFlyout({ activeToolId, onActivate, drawingColor, setDrawingColor }) {
  const tools = [
    { id: 'free_draw',   mode: 'free_draw',   icon: PenLine,    label: 'Desenho livre' },
    { id: 'zone_rect',   mode: 'zone_rect',   icon: SquareIcon, label: 'Zona retangular' },
    { id: 'zone_circle', mode: 'zone_circle', icon: CircleIcon, label: 'Zona circular' },
    { id: 'text',        mode: 'text',        icon: Type,       label: 'Texto' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div>
        <FlyoutLabel>Ferramenta</FlyoutLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <FlyBtn key={t.id} onClick={() => onActivate(t.id, t.mode)} active={activeToolId === t.id}>
                <Icon size={13} /><span>{t.label}</span>
              </FlyBtn>
            );
          })}
        </div>
      </div>
      <div>
        <FlyoutLabel>Cor</FlyoutLabel>
        <ColorPalette current={drawingColor} onPick={setDrawingColor} />
      </div>
    </div>
  );
}

function ObjectsFlyout({ onAdd }) {
  return (
    <div>
      <FlyoutLabel>Adicionar objeto</FlyoutLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        {MARKER_TYPES.map((m) => (
          <FlyBtn key={m.type} onClick={() => onAdd(m.type)}>
            <span style={{ width: 14, textAlign: 'center', fontSize: '0.85rem' }}>{m.icon}</span>
            <span>{m.label}</span>
          </FlyBtn>
        ))}
      </div>
    </div>
  );
}

function FormationsFlyout({ formations, onLoad }) {
  const entries = Object.entries(formations || {});
  if (entries.length === 0) return <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Sem formações para esse tipo de campo.</div>;
  return (
    <div>
      <FlyoutLabel>Aplicar formação (Time A)</FlyoutLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {entries.map(([key, f]) => (
          <FlyBtn key={key} onClick={() => onLoad(key)}>
            <LayoutGrid size={12} /><span>{f.label}</span>
          </FlyBtn>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
        ⚠ Aplicar uma formação substitui as peças atuais.
      </div>
    </div>
  );
}

function ViewFlyout({ fieldType, setFieldType, fieldView, setFieldView }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div>
        <FlyoutLabel>Tipo de campo</FlyoutLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          <FlyBtn onClick={() => setFieldType('football_11')} active={fieldType === 'football_11'}>Futebol 11</FlyBtn>
          <FlyBtn onClick={() => setFieldType('futsal')} active={fieldType === 'futsal'}>Futsal</FlyBtn>
        </div>
      </div>
      <div>
        <FlyoutLabel>Vista do campo</FlyoutLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {FIELD_VIEW_OPTIONS.map((v) => (
            <FlyBtn key={v.view} onClick={() => setFieldView(v.view)} active={fieldView === v.view}>{v.label}</FlyBtn>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Primitivos visuais ──
function FlyoutLabel({ children }) {
  return (
    <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 5 }}>
      {children}
    </div>
  );
}

function FlyBtn({ onClick, active, children, color, small }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: small ? '0.32rem 0.5rem' : '0.42rem 0.55rem',
        backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '0.35rem',
        color: color || 'rgba(255,255,255,0.9)',
        fontSize: small ? '0.7rem' : '0.74rem',
        fontWeight: 500,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
    >
      {children}
    </button>
  );
}

function ColorPalette({ current, onPick }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {DRAWING_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onPick(c)}
          title={c}
          style={{
            width: 22, height: 22, borderRadius: '50%',
            border: current === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.18)',
            backgroundColor: c, cursor: 'pointer', padding: 0,
          }}
        />
      ))}
    </div>
  );
}

function ColorRow({ label, color, setColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', width: 50 }}>{label}</span>
      <input
        type="color" value={color} onChange={(e) => setColor(e.target.value)}
        style={{ width: 28, height: 22, border: 'none', borderRadius: 4, backgroundColor: 'transparent', cursor: 'pointer' }}
      />
      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{color}</span>
    </div>
  );
}

function TopBtn({ children, onClick, title, active }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32, height: 32,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(255,255,255,0.08)',
        background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        color: '#fff', cursor: 'pointer',
        borderRadius: '0.35rem',
      }}
    >
      {children}
    </button>
  );
}

// Tela de bloqueio em mobile — Quadro Tático precisa de tela maior pra ser usável
// Hint discreto no topo pra sugerir modo paisagem. Some após 5s
// ou quando o usuário rotaciona pra landscape.
function MobileRotateHint({ colors }) {
  const [visible, setVisible] = useState(true);
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== 'undefined' && window.innerWidth > window.innerHeight
  );
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 5000);
    const onResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  if (!visible || isLandscape) return null;
  return (
    <div style={{
      position: 'absolute',
      top: 12, left: '50%', transform: 'translateX(-50%)',
      zIndex: 90,
      backgroundColor: 'rgba(15,23,42,0.9)',
      color: '#fff',
      padding: '0.5rem 0.9rem',
      borderRadius: '999px',
      fontSize: '0.72rem',
      fontWeight: 600,
      boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      pointerEvents: 'none',
    }}>
      <Smartphone size={13} />
      Gire o celular pra paisagem — cabe mais campo
    </div>
  );
}

// Mantido caso volte a fazer sentido bloquear (device muito pequeno, versão
// legacy, etc.). Hoje NÃO é usado — usuário mobile tem acesso completo.
function MobileBlockScreen({ colors }) {
  return (
    <div style={{
      width: '100%', minHeight: 'calc(100vh - 64px)',
      margin: '-1.5rem -1.5rem 0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1.5rem',
      backgroundColor: 'transparent',
    }}>
      <div style={{
        maxWidth: 360,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '0.75rem',
        padding: '1.75rem 1.5rem',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          backgroundColor: `${colors.primary}1A`, color: colors.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem',
        }}>
          <Smartphone size={28} strokeWidth={1.75} />
        </div>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: colors.text }}>
          Quadro Tático no celular
        </h2>
        <p style={{ margin: '0.6rem 0 0', fontSize: '0.875rem', color: colors.textSecondary, lineHeight: 1.5 }}>
          A edição do quadro tático precisa de tela maior pra dar conta dos jogadores, setas e frames.
          No navegador mobile a experiência fica comprometida.
        </p>
        <div style={{
          marginTop: '1.1rem',
          padding: '0.75rem 0.9rem',
          backgroundColor: `${colors.primary}10`,
          border: `1px solid ${colors.primary}30`,
          borderRadius: '0.5rem',
          color: colors.primary,
          fontSize: '0.825rem',
          fontWeight: 600,
        }}>
          📱 App oficial em desenvolvimento — em breve!
        </div>
        <p style={{ margin: '1rem 0 0', fontSize: '0.78rem', color: colors.textSecondary }}>
          Por enquanto, abra o Quadro Tático em um computador ou tablet em modo paisagem.
        </p>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 380,
        backgroundColor: '#0f0f1e', color: '#fff',
        borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>Atalhos de teclado</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '0.85rem 1rem' }}>
          {SHORTCUTS.map(([keys, desc]) => (
            <div key={keys} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <kbd style={{ fontFamily: 'monospace', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.45rem', borderRadius: '0.25rem', color: '#fff' }}>{keys}</kbd>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
