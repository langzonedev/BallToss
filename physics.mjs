export const chargeSeconds = 1.32;
export const sweetStart = 0.69;
export const sweetEnd = 0.82;
export const roofHeight = 1;
export const catchHeight = 0.018;
export const catchEarly = 0.125;
export const catchLate = 0.105;
export const perfectTiming = 0.048;
const gravity = 5.25;

export function powerAt(heldSeconds) {
  return Math.max(0, Math.min(1, heldSeconds / chargeSeconds));
}

export function isSweet(power) {
  return power >= sweetStart && power <= sweetEnd;
}

export function makeFlight(power) {
  const peak = 0.30 + 0.87 * power;
  const velocity = Math.sqrt(2 * gravity * peak);
  const apex = velocity / gravity;
  const timeAt = (height, direction) => apex + direction * Math.sqrt(2 * (peak - height) / gravity);
  return {
    peak,
    apex,
    roofAt: peak >= roofHeight ? timeAt(roofHeight, -1) : Infinity,
    catchAt: timeAt(catchHeight, 1),
    faceAt: timeAt(-0.42, 1),
    heightAt: (seconds) => velocity * seconds - gravity * seconds ** 2 / 2,
  };
}

export function gradeCatch(flight, elapsed) {
  const offset = elapsed - flight.catchAt;
  if (offset < -catchEarly || offset > catchLate) return null;
  return Math.abs(offset) <= perfectTiming ? 'perfect' : 'caught';
}
