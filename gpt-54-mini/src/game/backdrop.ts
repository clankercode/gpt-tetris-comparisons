import Phaser from "phaser";
import { COLORS } from "./theme";
import { TextureKeys } from "./textures";

export interface BackdropHandle {
  resize(width: number, height: number): void;
  update(delta: number): void;
  destroy(): void;
}

interface Star {
  sprite: Phaser.GameObjects.Image;
  speed: number;
  drift: number;
  phase: number;
}

function drawBackdrop(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  mode: "menu" | "game" | "overlay",
): void {
  graphics.clear();
  graphics.fillStyle(COLORS.background, 1);
  graphics.fillRect(0, 0, width, height);

  const panelColor = mode === "game" ? 0x081522 : 0x07101d;
  graphics.fillStyle(panelColor, 1);
  graphics.fillRoundedRect(18, 18, width - 36, height - 36, 28);

  graphics.fillStyle(0x0b1930, 0.55);
  graphics.fillEllipse(width * 0.25, height * 0.2, width * 0.75, height * 0.55);
  graphics.fillStyle(0x0e2e39, mode === "game" ? 0.22 : 0.15);
  graphics.fillEllipse(width * 0.8, height * 0.14, width * 0.55, height * 0.35);

  graphics.lineStyle(1, COLORS.panelEdgeDim, 0.25);
  const gridSpacing = mode === "game" ? 40 : 46;
  for (let x = 0; x <= width; x += gridSpacing) {
    graphics.lineBetween(x, height * 0.58, x, height);
  }

  const horizonY = Math.floor(height * 0.62);
  graphics.lineStyle(2, COLORS.panelEdge, mode === "game" ? 0.22 : 0.15);
  graphics.lineBetween(0, horizonY, width, horizonY);
  graphics.lineStyle(1, 0x63ffd8, 0.08);
  for (let y = horizonY + 18; y < height; y += 28) {
    graphics.lineBetween(0, y, width, y);
  }
}

export function createRetroBackdrop(
  scene: Phaser.Scene,
  mode: "menu" | "game" | "overlay" = "menu",
): BackdropHandle {
  const width = scene.scale.width;
  const height = scene.scale.height;

  const background = scene.add.graphics().setDepth(-50);
  const grid = scene.add.graphics().setDepth(-22);
  const glow = scene.add.image(width * 0.18, height * 0.18, TextureKeys.Glow).setDepth(-30);
  glow.setAlpha(mode === "game" ? 0.18 : 0.22);
  glow.setTint(mode === "game" ? 0x63ffd8 : 0x8ef5ff);
  glow.setBlendMode(Phaser.BlendModes.ADD);
  glow.setDisplaySize(Math.max(width * 0.72, 500), Math.max(height * 0.72, 500));

  const scanlines = scene.add.tileSprite(0, 0, width, height, TextureKeys.Scanline).setOrigin(0);
  scanlines.setDepth(20);
  scanlines.setAlpha(mode === "game" ? 0.11 : 0.15);

  const noise = scene.add.tileSprite(0, 0, width, height, TextureKeys.Noise).setOrigin(0);
  noise.setDepth(21);
  noise.setAlpha(mode === "game" ? 0.04 : 0.06);
  noise.setBlendMode(Phaser.BlendModes.MULTIPLY);

  const stars: Star[] = Array.from({ length: mode === "game" ? 28 : 44 }, (_, index) => {
    const sprite = scene.add.image(
      Phaser.Math.Between(0, width),
      Phaser.Math.Between(0, height),
      TextureKeys.Glow,
    );
    sprite.setDepth(-35);
    sprite.setScale(Phaser.Math.FloatBetween(0.04, 0.12));
    sprite.setAlpha(Phaser.Math.FloatBetween(0.08, 0.22));
    sprite.setTint(index % 3 === 0 ? 0x63ffd8 : index % 3 === 1 ? 0x8ef5ff : 0xffd84d);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    return {
      sprite,
      speed: Phaser.Math.FloatBetween(7, mode === "game" ? 20 : 14),
      drift: Phaser.Math.FloatBetween(0.15, 0.85),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
    };
  });

  function resize(nextWidth: number, nextHeight: number): void {
    background.clear();
    grid.clear();
    drawBackdrop(background, nextWidth, nextHeight, mode);

    glow.setPosition(nextWidth * 0.18, nextHeight * 0.18);
    glow.setDisplaySize(Math.max(nextWidth * 0.72, 500), Math.max(nextHeight * 0.72, 500));
    scanlines.setDisplaySize(nextWidth, nextHeight);
    noise.setDisplaySize(nextWidth, nextHeight);

    grid.lineStyle(1, COLORS.panelEdgeDim, 0.18);
    const columns = mode === "game" ? 10 : 14;
    const spacing = nextWidth / columns;
    for (let column = 0; column <= columns; column += 1) {
      const x = Math.round(column * spacing);
      grid.lineBetween(x, nextHeight * 0.62, x, nextHeight);
    }
  }

  resize(width, height);

  return {
    resize,
    update(delta: number) {
      const t = delta / 1000;
      const nextWidth = scene.scale.width;
      const nextHeight = scene.scale.height;

      for (const star of stars) {
        star.sprite.x -= star.speed * t;
        star.sprite.y += Math.sin(star.phase + scene.time.now * 0.0004) * star.drift * t;
        if (star.sprite.x < -32) {
          star.sprite.x = nextWidth + 32;
          star.sprite.y = Phaser.Math.Between(0, nextHeight);
        }
      }

      noise.tilePositionX += delta * 0.012;
      noise.tilePositionY += delta * 0.006;
      scanlines.tilePositionY += delta * 0.018;
      glow.rotation += delta * 0.00005;
    },
    destroy() {
      background.destroy();
      grid.destroy();
      scanlines.destroy();
      noise.destroy();
      glow.destroy();
      stars.forEach((star) => star.sprite.destroy());
    },
  };
}

