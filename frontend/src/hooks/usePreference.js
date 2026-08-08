import { useEffect, useState } from 'react';

const EVENT_NAME = 'preference-change';

export function usePreference(key, defaultValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored == null ? defaultValue : stored;
  });

  useEffect(() => {
    function sync() {
      const stored = localStorage.getItem(key);
      setValue(stored == null ? defaultValue : stored);
    }
    function onCustom(e) {
      if (!e.detail || e.detail.key === key) sync();
    }
    window.addEventListener('storage', sync);
    window.addEventListener(EVENT_NAME, onCustom);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(EVENT_NAME, onCustom);
    };
  }, [key, defaultValue]);

  function update(next) {
    if (next == null) localStorage.removeItem(key);
    else localStorage.setItem(key, next);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { key } }));
  }

  return [value, update];
}
