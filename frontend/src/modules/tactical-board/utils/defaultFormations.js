// Default formations with positions in percentage (0-100)
// x = horizontal (left to right), y = vertical (top to bottom)

export const FOOTBALL_11_FORMATIONS = {
  '4-4-2': {
    label: '4-4-2',
    positions: [
      { x: 5, y: 50, jerseyNumber: 1, name: 'GK' },
      { x: 20, y: 15, jerseyNumber: 2, name: 'LD' },
      { x: 20, y: 38, jerseyNumber: 4, name: 'ZAG' },
      { x: 20, y: 62, jerseyNumber: 3, name: 'ZAG' },
      { x: 20, y: 85, jerseyNumber: 6, name: 'LE' },
      { x: 45, y: 15, jerseyNumber: 7, name: 'MD' },
      { x: 45, y: 38, jerseyNumber: 8, name: 'VOL' },
      { x: 45, y: 62, jerseyNumber: 5, name: 'VOL' },
      { x: 45, y: 85, jerseyNumber: 11, name: 'ME' },
      { x: 70, y: 35, jerseyNumber: 9, name: 'ATA' },
      { x: 70, y: 65, jerseyNumber: 10, name: 'ATA' },
    ],
  },
  '4-3-3': {
    label: '4-3-3',
    positions: [
      { x: 5, y: 50, jerseyNumber: 1, name: 'GK' },
      { x: 20, y: 15, jerseyNumber: 2, name: 'LD' },
      { x: 20, y: 38, jerseyNumber: 4, name: 'ZAG' },
      { x: 20, y: 62, jerseyNumber: 3, name: 'ZAG' },
      { x: 20, y: 85, jerseyNumber: 6, name: 'LE' },
      { x: 45, y: 25, jerseyNumber: 8, name: 'VOL' },
      { x: 45, y: 50, jerseyNumber: 5, name: 'MEI' },
      { x: 45, y: 75, jerseyNumber: 10, name: 'MEI' },
      { x: 72, y: 15, jerseyNumber: 7, name: 'PD' },
      { x: 75, y: 50, jerseyNumber: 9, name: 'CA' },
      { x: 72, y: 85, jerseyNumber: 11, name: 'PE' },
    ],
  },
  '3-5-2': {
    label: '3-5-2',
    positions: [
      { x: 5, y: 50, jerseyNumber: 1, name: 'GK' },
      { x: 20, y: 25, jerseyNumber: 4, name: 'ZAG' },
      { x: 20, y: 50, jerseyNumber: 3, name: 'ZAG' },
      { x: 20, y: 75, jerseyNumber: 5, name: 'ZAG' },
      { x: 40, y: 8, jerseyNumber: 2, name: 'ALD' },
      { x: 42, y: 35, jerseyNumber: 8, name: 'VOL' },
      { x: 42, y: 50, jerseyNumber: 10, name: 'MEI' },
      { x: 42, y: 65, jerseyNumber: 6, name: 'VOL' },
      { x: 40, y: 92, jerseyNumber: 11, name: 'ALE' },
      { x: 70, y: 35, jerseyNumber: 9, name: 'ATA' },
      { x: 70, y: 65, jerseyNumber: 7, name: 'ATA' },
    ],
  },
};

export const FUTSAL_FORMATIONS = {
  '1-2-2': {
    label: '1-2-2',
    positions: [
      { x: 5, y: 50, jerseyNumber: 1, name: 'GOL' },
      { x: 30, y: 30, jerseyNumber: 2, name: 'FIX' },
      { x: 30, y: 70, jerseyNumber: 3, name: 'FIX' },
      { x: 60, y: 30, jerseyNumber: 4, name: 'ALA' },
      { x: 60, y: 70, jerseyNumber: 5, name: 'ALA' },
    ],
  },
  '2-2': {
    label: '2-2 (Quadrado)',
    positions: [
      { x: 5, y: 50, jerseyNumber: 1, name: 'GOL' },
      { x: 30, y: 25, jerseyNumber: 2, name: 'FIX' },
      { x: 30, y: 75, jerseyNumber: 3, name: 'FIX' },
      { x: 60, y: 25, jerseyNumber: 4, name: 'PIV' },
      { x: 60, y: 75, jerseyNumber: 5, name: 'ALA' },
    ],
  },
  '1-2-1': {
    label: '1-2-1 (Losango)',
    positions: [
      { x: 5, y: 50, jerseyNumber: 1, name: 'GOL' },
      { x: 25, y: 50, jerseyNumber: 2, name: 'FIX' },
      { x: 45, y: 25, jerseyNumber: 3, name: 'ALA' },
      { x: 45, y: 75, jerseyNumber: 4, name: 'ALA' },
      { x: 65, y: 50, jerseyNumber: 5, name: 'PIV' },
    ],
  },
};

export function getFormationsForFieldType(fieldType) {
  if (fieldType === 'futsal') return FUTSAL_FORMATIONS;
  return FOOTBALL_11_FORMATIONS;
}
