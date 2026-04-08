// Field dimensions in percentage coordinates (0-100)
// All positions stored as percentages for resolution independence

export const FIELD_TYPES = {
  FOOTBALL_11: 'football_11',
  FUTSAL: 'futsal',
};

export const FIELD_VIEWS = {
  FULL: 'full',
  LEFT_HALF: 'left_half',
  RIGHT_HALF: 'right_half',
  THIRD_LEFT: 'third_left',
  THIRD_RIGHT: 'third_right',
};

// Aspect ratios (width:height)
export const FIELD_ASPECT_RATIOS = {
  [FIELD_TYPES.FOOTBALL_11]: 105 / 68, // ~1.544
  [FIELD_TYPES.FUTSAL]: 40 / 20,       // 2.0
};

// Half-field aspect ratios
export const HALF_FIELD_ASPECT_RATIOS = {
  [FIELD_TYPES.FOOTBALL_11]: (105 / 2) / 68, // ~0.772
  [FIELD_TYPES.FUTSAL]: (40 / 2) / 20,       // 1.0
};

export const THIRD_FIELD_ASPECT_RATIOS = {
  [FIELD_TYPES.FOOTBALL_11]: (105 / 3) / 68,
  [FIELD_TYPES.FUTSAL]: (40 / 3) / 20,
};

// Football 11 field markings (all in percentage 0-100)
export const FOOTBALL_11_FIELD = {
  boundary: { x: 0, y: 0, width: 100, height: 100 },
  centerCircle: { cx: 50, cy: 50, radius: 14.3 },
  centerLine: { x1: 50, y1: 0, x2: 50, y2: 100 },
  centerSpot: { cx: 50, cy: 50 },
  leftPenaltyArea: { x: 0, y: 20.6, width: 15.7, height: 58.8 },
  rightPenaltyArea: { x: 84.3, y: 20.6, width: 15.7, height: 58.8 },
  leftGoalArea: { x: 0, y: 36.5, width: 5.2, height: 27 },
  rightGoalArea: { x: 94.8, y: 36.5, width: 5.2, height: 27 },
  leftPenaltySpot: { cx: 10.5, cy: 50 },
  rightPenaltySpot: { cx: 89.5, cy: 50 },
  leftPenaltyArc: { cx: 10.5, cy: 50, radius: 14.3, startAngle: -53, endAngle: 53 },
  rightPenaltyArc: { cx: 89.5, cy: 50, radius: 14.3, startAngle: 127, endAngle: 233 },
  cornerRadius: 1.5,
  leftGoal: { x: -2, y: 44.6, width: 2, height: 10.8 },
  rightGoal: { x: 100, y: 44.6, width: 2, height: 10.8 },
};

// Futsal court markings (all in percentage 0-100)
export const FUTSAL_FIELD = {
  boundary: { x: 0, y: 0, width: 100, height: 100 },
  centerCircle: { cx: 50, cy: 50, radius: 15 },
  centerLine: { x1: 50, y1: 0, x2: 50, y2: 100 },
  centerSpot: { cx: 50, cy: 50 },
  leftPenaltyArea: { cx: 0, cy: 50, radius: 30 },
  rightPenaltyArea: { cx: 100, cy: 50, radius: 30 },
  leftPenaltySpot: { cx: 15, cy: 50 },
  rightPenaltySpot: { cx: 85, cy: 50 },
  leftSecondPenaltySpot: { cx: 25, cy: 50 },
  rightSecondPenaltySpot: { cx: 75, cy: 50 },
  cornerRadius: 1.25,
  leftSubZone: { y1: -2, y2: -2, x: 50 },
  leftGoal: { x: -2.5, y: 42.5, width: 2.5, height: 15 },
  rightGoal: { x: 100, y: 42.5, width: 2.5, height: 15 },
};

// Convert percentage position to pixel position
export function toPixel(percent, totalPixels) {
  return (percent / 100) * totalPixels;
}

// Convert pixel position to percentage
export function toPercent(pixel, totalPixels) {
  return (pixel / totalPixels) * 100;
}

// Get aspect ratio for a given field type and view
export function getAspectRatio(fieldType, fieldView = FIELD_VIEWS.FULL) {
  if (fieldView === FIELD_VIEWS.LEFT_HALF || fieldView === FIELD_VIEWS.RIGHT_HALF) {
    return HALF_FIELD_ASPECT_RATIOS[fieldType];
  }
  if (fieldView === FIELD_VIEWS.THIRD_LEFT || fieldView === FIELD_VIEWS.THIRD_RIGHT) {
    return THIRD_FIELD_ASPECT_RATIOS[fieldType];
  }
  return FIELD_ASPECT_RATIOS[fieldType];
}

// Calculate canvas dimensions that fit a container while maintaining aspect ratio
export function calculateCanvasDimensions(containerWidth, containerHeight, fieldType, fieldView = FIELD_VIEWS.FULL) {
  const aspectRatio = getAspectRatio(fieldType, fieldView);
  const padding = 4;

  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;

  let width, height;

  if (availableWidth / availableHeight > aspectRatio) {
    // Container wider than field - fit to height (common for F11)
    height = availableHeight;
    width = height * aspectRatio;
  } else {
    // Container taller than field - fit to width (common for futsal)
    width = availableWidth;
    height = width / aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
    offsetX: Math.round((containerWidth - width) / 2),
    offsetY: Math.round((containerHeight - height) / 2),
  };
}
