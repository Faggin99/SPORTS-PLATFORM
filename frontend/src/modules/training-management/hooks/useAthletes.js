import { useState, useEffect } from 'react';
import { athleteService } from '../services/athleteService';

export function useAthletes() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAthletes = async () => {
    try {
      setLoading(true);
      const data = await athleteService.getAll({ status: 'active' });
      setAthletes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAthletes();
  }, []);

  const updateGroups = async (updates) => {
    try {
      await athleteService.batchUpdateGroups(updates);
      await fetchAthletes();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { athletes, loading, error, updateGroups };
}
