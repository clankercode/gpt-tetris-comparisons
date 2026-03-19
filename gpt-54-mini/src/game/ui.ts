import Phaser from "phaser";
import { COLORS, FONT } from "./theme";

export interface RetroButton {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  background: Phaser.GameObjects.Graphics;
  setSelected(selected: boolean): void;
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

export interface OptionRow {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  value: Phaser.GameObjects.Text;
  background: Phaser.GameObjects.Graphics;
  setSelected(selected: boolean): void;
  setValue(value: string): void;
  destroy(): void;
}

export interface ButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sublabel?: string;
  onClick: () => void;
}

function drawButtonFrame(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  selected: boolean,
  enabled: boolean,
): void {
  const fill = enabled ? (selected ? COLORS.panelAlt : COLORS.panel) : 0x07101a;
  const edge = enabled ? (selected ? COLORS.panelEdge : COLORS.panelEdgeDim) : 0x223344;

  graphics.clear();
  graphics.fillStyle(fill, 1);
  graphics.fillRoundedRect(-width / 2, -height / 2, width, height, Math.max(8, Math.min(16, height * 0.22)));
  graphics.lineStyle(selected ? 3 : 2, edge, enabled ? 1 : 0.7);
  graphics.strokeRoundedRect(
    -width / 2 + 1,
    -height / 2 + 1,
    width - 2,
    height - 2,
    Math.max(8, Math.min(16, height * 0.22)),
  );
}

export function createRetroButton(scene: Phaser.Scene, options: ButtonOptions): RetroButton {
  const container = scene.add.container(options.x, options.y);
  container.setSize(options.width, options.height);

  const background = scene.add.graphics();
  const label = scene.add.text(0, options.sublabel ? -12 : 0, options.label, {
    fontFamily: FONT.body,
    fontSize: "18px",
    color: "#edfff7",
    align: "center",
  });
  label.setOrigin(0.5);
  label.setShadow(0, 0, "#63ffd8", 8, false, true);

  let sublabel: Phaser.GameObjects.Text | undefined;
  if (options.sublabel) {
    sublabel = scene.add.text(0, 16, options.sublabel, {
      fontFamily: FONT.body,
      fontSize: "11px",
      color: "#93ada7",
      align: "center",
    });
    sublabel.setOrigin(0.5, 0);
  }

  container.add(background);
  container.add(label);
  if (sublabel) {
    container.add(sublabel);
  }

  let selected = false;
  let enabled = true;
  drawButtonFrame(background, options.width, options.height, selected, enabled);

  container.setInteractive(
    new Phaser.Geom.Rectangle(-options.width / 2, -options.height / 2, options.width, options.height),
    Phaser.Geom.Rectangle.Contains,
  );

  const applySelected = (value: boolean) => {
    selected = value;
    drawButtonFrame(background, options.width, options.height, selected, enabled);
    label.setAlpha(enabled ? 1 : 0.5);
    label.setScale(selected ? 1.03 : 1);
    if (sublabel) {
      sublabel.setAlpha(enabled ? 0.9 : 0.45);
    }
  };

  const applyEnabled = (value: boolean) => {
    enabled = value;
    drawButtonFrame(background, options.width, options.height, selected, enabled);
    label.setAlpha(enabled ? 1 : 0.42);
    if (sublabel) {
      sublabel.setAlpha(enabled ? 0.9 : 0.35);
    }
  };

  container.on("pointerover", () => {
    if (enabled) {
      applySelected(true);
    }
  });
  container.on("pointerout", () => {
    if (enabled) {
      applySelected(false);
    }
  });
  container.on("pointerdown", () => {
    if (enabled) {
      options.onClick();
    }
  });

  return {
    container,
    label,
    background,
    setSelected(selectedValue: boolean) {
      applySelected(selectedValue);
    },
    setEnabled(enabledValue: boolean) {
      applyEnabled(enabledValue);
    },
    destroy() {
      container.destroy(true);
    },
  };
}

export function createPanelFrame(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 0.92,
): Phaser.GameObjects.Graphics {
  const frame = scene.add.graphics({ x, y });
  frame.fillStyle(COLORS.panel, alpha);
  frame.fillRoundedRect(0, 0, width, height, 18);
  frame.lineStyle(2, COLORS.panelEdgeDim, 0.65);
  frame.strokeRoundedRect(0, 0, width, height, 18);
  frame.lineStyle(1, COLORS.panelEdge, 0.2);
  frame.strokeRoundedRect(6, 6, width - 12, height - 12, 14);
  return frame;
}

export interface OptionRowOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  value: string;
}

export function createOptionRow(scene: Phaser.Scene, options: OptionRowOptions): OptionRow {
  const container = scene.add.container(options.x, options.y);
  container.setSize(options.width, options.height);

  const background = scene.add.graphics();
  const label = scene.add.text(-options.width / 2 + 18, 0, options.label, {
    fontFamily: FONT.body,
    fontSize: "16px",
    color: "#edfff7",
  });
  label.setOrigin(0, 0.5);

  const value = scene.add.text(options.width / 2 - 18, 0, options.value, {
    fontFamily: FONT.body,
    fontSize: "16px",
    color: "#63ffd8",
  });
  value.setOrigin(1, 0.5);
  value.setShadow(0, 0, "#63ffd8", 6, false, true);

  container.add([background, label, value]);
  drawButtonFrame(background, options.width, options.height, false, true);

  let selected = false;
  const applySelected = (valueSelected: boolean) => {
    selected = valueSelected;
    drawButtonFrame(background, options.width, options.height, selected, true);
    label.setAlpha(selected ? 1 : 0.88);
    value.setAlpha(selected ? 1 : 0.82);
    label.setScale(selected ? 1.02 : 1);
    value.setScale(selected ? 1.02 : 1);
  };

  container.setInteractive(
    new Phaser.Geom.Rectangle(-options.width / 2, -options.height / 2, options.width, options.height),
    Phaser.Geom.Rectangle.Contains,
  );
  container.on("pointerover", () => applySelected(true));
  container.on("pointerout", () => applySelected(false));
  container.on("pointerdown", () => applySelected(true));

  return {
    container,
    label,
    value,
    background,
    setSelected(selectedValue: boolean) {
      applySelected(selectedValue);
    },
    setValue(nextValue: string) {
      value.setText(nextValue);
    },
    destroy() {
      container.destroy(true);
    },
  };
}

export function createRetroText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 18,
  color = "#edfff7",
  align: "left" | "center" | "right" = "left",
): Phaser.GameObjects.Text {
  const gameText = scene.add.text(x, y, text, {
    fontFamily: FONT.body,
    fontSize: `${size}px`,
    color,
    align,
    lineSpacing: 4,
  });

  gameText.setShadow(0, 0, "#63ffd8", size >= 24 ? 10 : 6, false, true);
  return gameText;
}

export function formatToggle(value: boolean): string {
  return value ? "ON" : "OFF";
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
