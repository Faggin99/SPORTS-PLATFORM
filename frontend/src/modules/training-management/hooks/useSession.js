import { useState, useCallback } from 'react';
import { sessionService } from '../services/sessionService';

export function useSession() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  const updateSession = useCallback(async (sessionId, blocks) => {
    try {
      setUpdating(true);
      const data = await sessionService.update(sessionId, blocks);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  return { updateSession, updating, error };
}
