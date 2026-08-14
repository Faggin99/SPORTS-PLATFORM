// Entrega universal de arquivos gerados no cliente (PDF, XLSX, etc):
// - App NATIVO (Capacitor): grava no Cache e abre a folha de compartilhar
//   (download de navegador não funciona no WebView).
// - Web: download normal via âncora.
import { isNative } from './platform';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = String(reader.result || '');
      resolve(s.slice(s.indexOf('base64,') + 'base64,'.length));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function deliverFile(blob, filename, dialogTitle = 'Compartilhar arquivo') {
  if (isNative()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const base64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
    try {
      await Share.share({ title: filename, url: written.uri, dialogTitle });
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

// Atalho pra documentos jsPDF: `deliverPdf(doc, nome)` substitui `doc.save(nome)`
// (que é morto no app nativo). Na web continua o download direto do jsPDF.
export async function deliverPdf(doc, filename) {
  if (isNative()) {
    const blob = doc.output('blob');
    await deliverFile(blob, filename, 'Compartilhar PDF');
    return;
  }
  doc.save(filename);
}
