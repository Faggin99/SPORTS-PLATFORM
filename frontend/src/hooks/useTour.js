import { useEffect, useState, useCallback } from 'react';

/**
 * Gerencia o estado de um tour por página.
 * Auto-abre na primeira visita (se autoStart=true e o user não pulou ainda).
 * Pode ser disparado manualmente via `start()`.
 *
 * @param key — identificador único do tour (ex: 'training', 'plantel')
 * @param autoStart — se deve abrir automaticamente quando user nunca viu
 */
export function useTour(key, autoStart = true) {
  const storageKey = `tour_seen_${key}`;
  const [isOpen, setIsOpen] = useState(false);

  // Auto-abrir uma vez quando o user nunca viu
  useEffect(() => {
    if (!autoStart) return;
    try {
      const seen = localStorage.getItem(storageKey);
      if (!seen) {
        // pequeno delay pra a página renderizar primeiro
        const t = setTimeout(() => setIsOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch (_) {}
  }, [storageKey, autoStart]);

  const start = useCallback(() => {
    // limpa "já vi" pra forçar re-mostrar do início
    try { localStorage.removeItem(storageKey); } catch (_) {}
    setIsOpen(true);
  }, [storageKey]);

  const stop = useCallback(() => setIsOpen(false), []);

  return { isOpen, setIsOpen, start, stop, storageKey };
}

/**
 * Dispara qualquer tour pelo seu key (limpando o "já vi").
 * Útil pra o botão "Ver tutorial novamente" nas Configurações.
 */
export function replayTour(key) {
  try { localStorage.removeItem(`tour_seen_${key}`); } catch (_) {}
  window.dispatchEvent(new CustomEvent('tour-replay', { detail: { key } }));
}

/**
 * Use em uma página pra ouvir o evento de replay e ativar o tour da própria página.
 */
export function useTourReplayListener(key, onReplay) {
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.key === key) onReplay();
    };
    window.addEventListener('tour-replay', handler);
    return () => window.removeEventListener('tour-replay', handler);
  }, [key, onReplay]);
}
