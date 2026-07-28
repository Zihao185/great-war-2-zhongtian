export const WORLD_ART = Object.freeze({
  platform: { src: '/assets/world/zhongtian-platform-cursed-community-v2.webp', ratio: '3:2' },
  security: { src: '/assets/world/security-office-cursed-community-v2.webp', ratio: '3:2' },
  building2_floor1: { src: '/assets/world/building2-lobby-cursed-community-v2.webp', ratio: '5:3' },
  building2_floor2: { src: '/assets/world/building2-corridor-cursed-community-v2.webp', ratio: '2:1' },
  building2_boss: { src: '/assets/world/building2-property-office-cursed-community-v2.webp', ratio: '5:3' }
});

const images = new Map();

export function worldArtDefinition(regionId) {
  return WORLD_ART[regionId] || null;
}

function imageFor(regionId) {
  const definition = worldArtDefinition(regionId);
  if (!definition || typeof Image === 'undefined') return null;
  if (!images.has(regionId)) {
    const image = new Image();
    image.src = definition.src;
    images.set(regionId, image);
  }
  return images.get(regionId);
}

function waitForImage(image) {
  if (!image || image.complete) return Promise.resolve();
  return new Promise(resolve => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', resolve, { once: true });
  });
}

export function preloadWorldArt() {
  return Promise.all(Object.keys(WORLD_ART).map(regionId => waitForImage(imageFor(regionId))));
}

export function drawWorldArt(ctx, regionId, width, height) {
  const image = imageFor(regionId);
  if (!image?.complete || !image.naturalWidth) return false;
  ctx.drawImage(image, 0, 0, width, height);
  return true;
}
