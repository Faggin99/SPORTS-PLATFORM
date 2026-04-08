// Linear interpolation between two values
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Interpolate element positions between two frames
export function interpolateElements(frameA, frameB, t) {
  if (!frameA || !frameB) return frameA?.elements || [];

  return frameA.elements.map((elementA) => {
    const elementB = frameB.elements.find((e) => e.id === elementA.id);

    if (!elementB) return elementA;

    return {
      ...elementA,
      x: lerp(elementA.x, elementB.x, t),
      y: lerp(elementA.y, elementB.y, t),
    };
  });
}
