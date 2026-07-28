export const PLAYER_ANIMATION_PRIORITY = Object.freeze([
  'dead', 'hurt', 'aura_cast', 'rise_combo', 'rise', 'dash',
  'attack_3', 'attack_2', 'attack_1', 'run', 'aura_idle', 'idle'
]);

export function directionRow(facing) {
  const horizontal = Math.cos(facing);
  const vertical = Math.sin(facing);
  if (Math.abs(vertical) >= Math.abs(horizontal)) return vertical >= 0 ? 0 : 3;
  return horizontal < 0 ? 1 : 2;
}

export function frameAt(elapsed, duration, frameCount) {
  if (frameCount <= 1 || duration <= 0) return 0;
  const progress = Math.min(1, Math.max(0, elapsed / duration));
  return Math.min(frameCount - 1, Math.floor(progress * frameCount));
}

export function resolveAnimationState({ dead, hurt, aura, action, moving }) {
  if (dead) return 'dead';
  if (hurt > 0) return 'hurt';
  if (action) return action;
  if (moving) return 'run';
  return aura > 0 ? 'aura_idle' : 'idle';
}
