import { useState, useCallback, useRef } from 'react';
import { interpolateElements } from '../utils/interpolation';
import { generateVideoFilename, getSupportedMimeType } from '../utils/exportHelpers';

const EXPORT_FPS = 30;
const FRAME_DURATION_MS = 1500;

function waitFrame() {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

export function useVideoExport(stageRef, frames, fieldType) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportElements, setExportElements] = useState(null);
  const recorderRef = useRef(null);
  // Guarda síncrona de reentrada — dois cliques rápidos criavam dois
  // MediaRecorders concorrentes disputando setExportElements (vídeo corrompido)
  const exportingRef = useRef(false);
  const abortRef = useRef(false);

  const startExport = useCallback(async (playName = 'jogada') => {
    if (exportingRef.current) return;
    if (!stageRef?.current || frames.length <= 1) return;

    const stage = stageRef.current.getStage();
    if (!stage) return;

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      const { notify } = await import('../../../lib/notify');
      notify.error('Seu navegador não suporta exportação de vídeo.');
      return;
    }

    exportingRef.current = true;
    abortRef.current = false;
    setIsExporting(true);
    setProgress(0);

    try {
      await new Promise((r) => setTimeout(r, 200));

      // Create an offscreen canvas to composite all Konva layers
      // Use the actual pixel dimensions of the Konva canvas (accounts for pixelRatio)
      const firstLayer = stage.getLayers()[0];
      const firstCanvas = firstLayer.getCanvas()._canvas;
      const w = firstCanvas.width;
      const h = firstCanvas.height;
      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const ctx = offscreen.getContext('2d');

      // Capture stream from the offscreen composite canvas
      const stream = offscreen.captureStream(EXPORT_FPS);
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });
      recorderRef.current = recorder;

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const downloadPromise = new Promise((resolve) => {
        recorder.onstop = () => {
          // Export cancelado: descarta os chunks, não baixa vídeo parcial
          if (abortRef.current) { resolve(); return; }
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = generateVideoFilename(playName);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          resolve();
        };
      });

      // Helper: composite all Konva layer canvases onto the offscreen canvas
      function compositeFrame() {
        ctx.clearRect(0, 0, w, h);
        const layers = stage.getLayers();
        for (const layer of layers) {
          const layerCanvas = layer.getCanvas()._canvas;
          ctx.drawImage(layerCanvas, 0, 0);
        }
      }

      recorder.start();

      const totalTransitions = frames.length - 1;

      for (let frameIdx = 0; frameIdx < totalTransitions && !abortRef.current; frameIdx++) {
        const frameA = frames[frameIdx];
        const frameB = frames[frameIdx + 1];
        const totalSteps = Math.ceil((FRAME_DURATION_MS / 1000) * EXPORT_FPS);

        for (let step = 0; step <= totalSteps && !abortRef.current; step++) {
          const t = step / totalSteps;
          const interpolated = interpolateElements(frameA, frameB, t);

          // Update React state -> triggers re-render -> Konva layers update
          setExportElements(interpolated);

          // Wait for React to render and Konva to draw
          await waitFrame();

          // Force Konva to redraw all layers
          stage.batchDraw();
          await waitFrame();

          // Composite all layers onto offscreen canvas
          compositeFrame();
        }

        setProgress(((frameIdx + 1) / totalTransitions) * 100);
      }

      // Hold last frame for 1 second
      const holdSteps = EXPORT_FPS;
      for (let i = 0; i < holdSteps && !abortRef.current; i++) {
        compositeFrame();
        await waitFrame();
      }

      if (recorder.state === 'recording') recorder.stop();
      await downloadPromise;
    } catch (error) {
      console.error('Erro na exportação de vídeo:', error);
      const { notify } = await import('../../../lib/notify');
      notify.error('Erro ao exportar vídeo. Tente novamente.');
    } finally {
      exportingRef.current = false;
      setIsExporting(false);
      setProgress(0);
      setExportElements(null);
      recorderRef.current = null;
    }
  }, [stageRef, frames, fieldType]);

  const cancelExport = useCallback(() => {
    abortRef.current = true;
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  return {
    isExporting,
    progress,
    exportElements,
    startExport,
    cancelExport,
  };
}
