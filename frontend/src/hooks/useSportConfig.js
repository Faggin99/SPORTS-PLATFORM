import { useMemo } from 'react';
import { useClub } from '../contexts/ClubContext';
import { getSportConfig } from '../lib/sportConfig';

// Resolve a config esportiva a partir do clube ativo no contexto.
// Sem clube selecionado, cai pro default football_11.
//
//   const sport = useSportConfig();
//   sport.positions  → [{ code, name }, ...]
//   sport.defaultDuration → 90 / 50 / 40
//   sport.eventTypes / sport.bolaParadaSubtypes / etc.
export function useSportConfig(clubOverride) {
  const { selectedClub } = useClub();
  const club = clubOverride || selectedClub;
  return useMemo(() => getSportConfig(club?.modality), [club?.modality]);
}
