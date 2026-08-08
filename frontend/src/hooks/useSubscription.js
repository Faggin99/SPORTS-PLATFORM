import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

let cachedSub = null;
const subscribers = new Set();

function notifyAll() {
  subscribers.forEach((fn) => fn(cachedSub));
}

export function refreshSubscription() {
  return api.get('/billing/subscription').then((s) => {
    cachedSub = s;
    notifyAll();
    return s;
  }).catch(() => null);
}

export function invalidateSubscriptionCache() {
  cachedSub = null;
  notifyAll();
}

export function useSubscription() {
  const { isAuthenticated } = useAuth();
  const [sub, setSub] = useState(cachedSub);
  const [loading, setLoading] = useState(cachedSub === null);

  useEffect(() => {
    const fn = (s) => setSub(s);
    subscribers.add(fn);
    if (isAuthenticated && cachedSub === null) {
      refreshSubscription().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return () => { subscribers.delete(fn); };
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = () => {
      cachedSub = null;
      refreshSubscription();
    };
    window.addEventListener('workspace-changed', handler);
    return () => window.removeEventListener('workspace-changed', handler);
  }, []);

  return { sub, loading, refresh: refreshSubscription };
}
