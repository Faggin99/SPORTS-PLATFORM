import { useState, useCallback, useRef } from 'react';
import { interpolateElements } from '../utils/interpolation';
import { generateVideoFilename, getSupportedMimeType, deliverVideo } from '../utils/exportHelpers';

const EXPORT_FPS = 30;
const FRAME_DURATION_MS = 1500;
// H.264 baseline 3.1 (compatível com tudo) suporta até 1280x720@30 — o frame
// do export é reduzido pra caber nesse envelope (e dimensões PARES, exigência
// do codec).
const MAX_W = 1280;
const MAX_H = 720;

function waitFrame() {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

// Caminho PREFERIDO: WebCodecs (VideoEncoder) + mp4-muxer. Codifica cada frame
// com timestamp exato e monta o MP4 nós mesmos — determinístico em Chrome,
// Android e Safari/iOS 16.4+. (O MediaRecorder do Safari gerava MP4 corrompido
// — preto e 0s — a partir de canvas.captureStream.)
async function createWebCodecsRecorder(width, height) {
  if (typeof window === 'undefined' || typeof window.VideoEncoder === 'undefined' || typeof window.VideoFrame === 'undefined') return null;
  const config = {
    codec: 'avc1.42001f', // H.264 Baseline 3.1
    width,
    height,
    bitrate: 2_500_000,
    framerate: EXPORT_FPS,
    avc: { format: 'avc' },
  };
  try {
    const support = await window.VideoEncoder.isConfigSupported(config);
    if (!support?.supported) return null;
  } catch {
    return null;
  }
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });
  let encodeError = null;
  const encoder = new window.VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encodeError = e; },
  });
  encoder.configure(config);

  let frameIndex = 0;
  const usPerFrame = Math.round(1_000_000 / EXPORT_FPS);
  return {
    kind: 'webcodecs',
    mimeType: 'video/mp4',
    addFrame(canvas) {
      if (encodeError) throw encodeError;
      const vf = new window.VideoFrame(canvas, {
        timestamp: frameIndex * usPerFrame,
        duration: usPerFrame,
      });
      // Keyframe a cada 2s pra seeking decente
      encoder.encode(vf, { keyFrame: frameIndex % (EXPORT_FPS * 2) === 0 });
      vf.close();
      frameIndex++;
      // Backpressure: se a fila do encoder crescer, espera esvaziar
      if (encoder.encodeQueueSize > 8) {
        return new Promise((r) => {
          const check = () => (encoder.encodeQueueSize <= 2 ? r() : setTimeout(check, 15));
          check();
        });
      }
      return Promise.resolve();
    },
    async finish() {
      if (encodeError) throw encodeError;
      await encoder.flush();
      encoder.close();
      muxer.finalize();
      return new Blob([muxer.target.buffer], { type: 'video/mp4' });
    },
    abort() {
      try { encoder.close(); } catch { /* noop */ }
    },
  };
}

// Fallback (browsers sem WebCodecs, ex. Firefox antigo): MediaRecorder com
// captureStream + requestFrame explícito.
function createMediaRecorderFallback(canvas) {
  const mimeType = getSupportedMimeType();
  if (!mimeType) return null;
  const stream = canvas.captureStream(EXPORT_FPS);
  const track = stream.getVideoTracks()[0];
  const pushFrame = () => {
    try {
      if (track && typeof track.requestFrame === 'function') track.requestFrame();
      else if (typeof stream.requestFrame === 'function') stream.requestFrame();
    } catch { /* noop */ }
  };
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
  recorder.start();
  return {
    kind: 'mediarecorder',
    mimeType,
    addFrame() { pushFrame(); return Promise.resolve(); },
    async finish() {
      if (recorder.state === 'recording') recorder.stop();
      await stopped;
      stream.getTracks().forEach((t) => t.stop());
      return new Blob(chunks, { type: mimeType });
    },
    abort() {
      try { if (recorder.state === 'recording') recorder.stop(); } catch { /* noop */ }
      try { stream.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    },
  };
}

export function useVideoExport(stageRef, frames, fieldType) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportElements, setExportElements] = useState(null);
  const recorderRef = useRef(null);
  // Guarda síncrona de reentrada — dois cliques rápidos criavam dois
  // gravadores concorrentes disputando setExportElements (vídeo corrompido)
  const exportingRef = useRef(false);
  const abortRef = useRef(false);

  const startExport = useCallback(async (playName = 'jogada') => {
    if (exportingRef.current) return;
    if (!stageRef?.current || frames.length <= 1) return;

    const stage = stageRef.current.getStage();
    if (!stage) return;

    exportingRef.current = true;
    abortRef.current = false;
    setIsExporting(true);
    setProgress(0);

    let offscreenEl = null;

    try {
      await new Promise((r) => setTimeout(r, 200));

      // Canvas de composição: junta as layers do Konva num frame só, reduzido
      // pro envelope 1280x720 e com dimensões PARES (exigência do H.264).
      const firstLayer = stage.getLayers()[0];
      const firstCanvas = firstLayer.getCanvas()._canvas;
      const srcW = firstCanvas.width;
      const srcH = firstCanvas.height;
      const scale = Math.min(1, MAX_W / srcW, MAX_H / srcH);
      const w = Math.floor((srcW * scale) / 2) * 2;
      const h = Math.floor((srcH * scale) / 2) * 2;

      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      // Anexado invisível: o fallback MediaRecorder precisa disso (Safari não
      // captura canvas fora do DOM); pro WebCodecs é indiferente.
      offscreen.style.cssText =
        'position:fixed;bottom:0;right:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1;';
      document.body.appendChild(offscreen);
      offscreenEl = offscreen;
      const ctx = offscreen.getContext('2d');

      // Gravador: WebCodecs (preferido) ou MediaRecorder (fallback)
      const rec = (await createWebCodecsRecorder(w, h)) || createMediaRecorderFallback(offscreen);
      if (!rec) {
        const { notify } = await import('../../../lib/notify');
        notify.error('Seu navegador não suporta exportação de vídeo.');
        return;
      }
      recorderRef.current = rec;

      // Composita todas as layers do Konva no canvas de export (com escala)
      function compositeFrame() {
        ctx.clearRect(0, 0, w, h);
        const layers = stage.getLayers();
        for (const layer of layers) {
          const layerCanvas = layer.getCanvas()._canvas;
          ctx.drawImage(layerCanvas, 0, 0, srcW, srcH, 0, 0, w, h);
        }
      }

      const totalTransitions = frames.length - 1;

      for (let frameIdx = 0; frameIdx < totalTransitions && !abortRef.current; frameIdx++) {
        const frameA = frames[frameIdx];
        const frameB = frames[frameIdx + 1];
        const totalSteps = Math.ceil((FRAME_DURATION_MS / 1000) * EXPORT_FPS);

        for (let step = 0; step <= totalSteps && !abortRef.current; step++) {
          const t = step / totalSteps;
          const interpolated = interpolateElements(frameA, frameB, t);

          // Update React state -> re-render -> Konva layers atualizam
          setExportElements(interpolated);
          await waitFrame();
          stage.batchDraw();
          await waitFrame();

          compositeFrame();
          await rec.addFrame(offscreen);
        }

        setProgress(((frameIdx + 1) / totalTransitions) * 100);
      }

      // Segura o último frame por 1 segundo
      const holdSteps = EXPORT_FPS;
      for (let i = 0; i < holdSteps && !abortRef.current; i++) {
        compositeFrame();
        await rec.addFrame(offscreen);
        await waitFrame();
      }

      if (abortRef.current) {
        rec.abort();
        return;
      }

      const blob = await rec.finish();
      if (!blob || blob.size < 20000) {
        const { notify } = await import('../../../lib/notify');
        notify.error(`A gravação saiu vazia (${blob?.size ?? 0}b). Tente de novo; se persistir, reporte "erro V3".`);
        return;
      }
      // Web: download direto; app nativo: share sheet (WhatsApp etc)
      await deliverVideo(blob, generateVideoFilename(playName, rec.mimeType));
    } catch (error) {
      console.error('Erro na exportação de vídeo:', error);
      const { notify } = await import('../../../lib/notify');
      notify.error('Erro ao exportar vídeo. Tente novamente.');
    } finally {
      try {
        if (offscreenEl?.parentNode) offscreenEl.parentNode.removeChild(offscreenEl);
      } catch { /* noop */ }
      exportingRef.current = false;
      setIsExporting(false);
      setProgress(0);
      setExportElements(null);
      recorderRef.current = null;
    }
  }, [stageRef, frames, fieldType]);

  const cancelExport = useCallback(() => {
    abortRef.current = true;
  }, []);

  return {
    isExporting,
    progress,
    exportElements,
    startExport,
    cancelExport,
  };
}
