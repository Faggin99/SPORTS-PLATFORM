import { useState, useEffect } from 'react';

// Detecta viewport mobile de forma robusta a rotação.
//
// Antes usava window.innerWidth + evento 'resize'. No WebView do Android o
// innerWidth às vezes fica DEFASADO ao girar (reporta a largura da orientação
// anterior), então o app achava que continuava "desktop" depois de voltar pra
// retrato e renderizava o layout largo espremido. matchMedia reflete o estado
// real da media query e dispara 'change' de forma confiável na rotação; ainda
// re-checamos em orientationchange/resize (com atraso) por garantia.
// 900 (e não 768): o header desktop precisa de ~880px; iPads em retrato
// (820/834px) ganhavam layout desktop transbordando na horizontal — a Apple
// reprovou por "crowded UI" no iPad Air 11". Acima de 900 (iPad deitado,
// iPad 13" em pé, desktop) o layout largo cabe com folga.
export function useIsMobile(breakpoint = 900) {
  const query = `(max-width: ${breakpoint}px)`;

  const read = () => {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia) return window.matchMedia(query).matches;
    return window.innerWidth <= breakpoint;
  };

  const [isMobile, setIsMobile] = useState(read);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const update = () => setIsMobile(mql.matches);

    // matchMedia change (principal)
    if (mql.addEventListener) mql.addEventListener('change', update);
    else mql.addListener(update); // Safari antigo

    // Rede de segurança: o WebView às vezes só assenta o layout após a rotação.
    const onOrient = () => {
      update();
      setTimeout(update, 150);
      setTimeout(update, 400);
    };
    window.addEventListener('orientationchange', onOrient);
    window.addEventListener('resize', onOrient);

    update();
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update);
      else mql.removeListener(update);
      window.removeEventListener('orientationchange', onOrient);
      window.removeEventListener('resize', onOrient);
    };
  }, [query, breakpoint]);

  return isMobile;
}
