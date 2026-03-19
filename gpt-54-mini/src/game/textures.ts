import Phaser from "phaser";

export const TextureKeys = {
  Pixel: "retro-pixel",
  Noise: "retro-noise",
  Scanline: "retro-scanline",
  Glow: "retro-glow",
} as const;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function installRetroTextures(scene: Phaser.Scene): void {
  const textures = scene.textures;
  if (textures.exists(TextureKeys.Pixel)) {
    return;
  }

  const pixel = createCanvas(1, 1);
  const pixelCtx = pixel.getContext("2d");
  if (!pixelCtx) {
    throw new Error("Unable to create pixel texture.");
  }
  pixelCtx.fillStyle = "#ffffff";
  pixelCtx.fillRect(0, 0, 1, 1);
  textures.addCanvas(TextureKeys.Pixel, pixel);

  const scanline = createCanvas(2, 4);
  const scanCtx = scanline.getContext("2d");
  if (!scanCtx) {
    throw new Error("Unable to create scanline texture.");
  }
  scanCtx.clearRect(0, 0, 2, 4);
  scanCtx.fillStyle = "rgba(255,255,255,0.08)";
  scanCtx.fillRect(0, 0, 2, 1);
  scanCtx.fillStyle = "rgba(0,0,0,0.85)";
  scanCtx.fillRect(0, 1, 2, 3);
  textures.addCanvas(TextureKeys.Scanline, scanline);

  const noise = createCanvas(128, 128);
  const noiseCtx = noise.getContext("2d");
  if (!noiseCtx) {
    throw new Error("Unable to create noise texture.");
  }
  const image = noiseCtx.createImageData(128, 128);
  for (let index = 0; index < image.data.length; index += 4) {
    const intensity = Math.floor(Math.random() * 255);
    const alpha = Math.random() > 0.55 ? 18 + Math.floor(Math.random() * 40) : 0;
    image.data[index] = intensity;
    image.data[index + 1] = intensity;
    image.data[index + 2] = intensity;
    image.data[index + 3] = alpha;
  }
  noiseCtx.putImageData(image, 0, 0);
  textures.addCanvas(TextureKeys.Noise, noise);

  const glow = createCanvas(64, 64);
  const glowCtx = glow.getContext("2d");
  if (!glowCtx) {
    throw new Error("Unable to create glow texture.");
  }
  const gradient = glowCtx.createRadialGradient(32, 32, 4, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.2, "rgba(180,255,245,0.95)");
  gradient.addColorStop(0.45, "rgba(90,255,220,0.45)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  glowCtx.fillStyle = gradient;
  glowCtx.fillRect(0, 0, 64, 64);
  textures.addCanvas(TextureKeys.Glow, glow);
}

