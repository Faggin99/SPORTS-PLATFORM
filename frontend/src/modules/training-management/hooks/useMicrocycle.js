import { useState, useEffect } from 'react';
import { microcycleService } from '../services/microcycleService';

export function useMicrocycle(weekIdentifier) {
  const [microcycle, setMicrocycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!weekIdentifier) return;

    const fetchMicrocycle = async () => {
      try {
        setLoading(true);
        const data = await microcycleService.getOrCreate(weekIdentifier);
        setMicrocycle(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMicrocycle();
  }, [weekIdentifier]);

  return { microcycle, loading, error, refetch: () => fetchMicrocycle() };
}
