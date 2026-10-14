// Generate a filename for video export — extensão acompanha o mimeType
// (webm no Chrome/Android, mp4 no Safari/iOS)
export function generateVideoFilename(playName, mimeType = 'video/webm') {
  const date = new Date().toISOString().slice(0, 10);
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const safeName = (playName || 'jogada')
    .replace(/[^a-zA-Z0-9À-ɏ]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);
  return `${safeName}_${date}.${ext}`;
}

// Check if MediaRecorder is supported
export function isMediaRecorderSupported() {
  return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
}

// Get supported video MIME type.
// webm primeiro (Chrome/Edge/Firefox/webview Android); mp4 como fallback
// pro Safari/iOS, que não grava webm.
export function getSupportedMimeType() {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return null;
}

// Entrega o vídeo pro usuário.
// - Web: download clássico via <a download> (blob URL)
// - App nativo (Capacitor): grava no cache e abre o share sheet do sistema
//   (WhatsApp, salvar no aparelho etc). O <a download> não funciona em
//   webview — falha silenciosa.
export async function deliverVideo(blob, filename) {
  const { isNative } = await import('../../../lib/platform');
  if (isNative()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const base64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
    });
    try {
      await Share.share({
        title: filename,
        url: written.uri,
        dialogTitle: 'Compartilhar vídeo da jogada',
      });
    } catch (err) {
      // Usuário fechou o share sheet — não é erro
      if (!/cancel/i.test(String(err?.message || err))) throw err;
    }
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result = "data:video/webm;base64,AAAA..." — só a parte base64
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
