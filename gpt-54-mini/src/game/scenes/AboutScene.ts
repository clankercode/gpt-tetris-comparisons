import Phaser from "phaser";
import { audio } from "../audio";
import { createRetroBackdrop } from "../backdrop";
import { computeMenuLayout } from "../layout";
import { SceneKeys } from "../sceneKeys";
import { createRetroButton, createRetroText } from "../ui";
import { COLORS, FONT } from "../theme";

export class AboutScene extends Phaser.Scene {
  private backdrop?: ReturnType<typeof createRetroBackdrop>;
  private layout = computeMenuLayout(1280, 720);
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private sectionTitle!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private footer!: Phaser.GameObjects.Text;
  private frame!: Phaser.GameObjects.Graphics;
  private backButton!: ReturnType<typeof createRetroButton>;
  private keys!: {
    enter: Phaser.Input.Keyboard.Key;
    esc: Phaser.Input.Keyboard.Key;
  };
  private lastWidth = 0;
  private lastHeight = 0;

  constructor() {
    super(SceneKeys.About);
  }

  create(): void {
    audio.setMode("menu");
    this.backdrop = createRetroBackdrop(this, "menu");

    this.title = this.add.text(0, 0, "ABOUT", {
      fontFamily: FONT.heading,
      fontSize: "30px",
      color: "#edfdf7",
      align: "center",
    });
    this.title.setOrigin(0.5);
    this.title.setShadow(0, 0, "#63ffd8", 18, false, true);

    this.subtitle = createRetroText(
      this,
      0,
      0,
      "An original retro cabinet built for the browser.",
      14,
      "#9eb8b0",
      "center",
    );
    this.subtitle.setOrigin(0.5, 0);

    this.frame = this.add.graphics();
    this.frame.setDepth(-10);

    this.sectionTitle = this.add.text(0, 0, "WHY IT FEELS THIS WAY", {
      fontFamily: FONT.body,
      fontSize: "14px",
      color: "#63ffd8",
    });
    this.sectionTitle.setDepth(5);

    this.body = this.add.text(0, 0, "", {
      fontFamily: FONT.body,
      fontSize: "16px",
      color: "#edfdf7",
      lineSpacing: 10,
      wordWrap: { width: 1 },
    });
    this.body.setDepth(5);

    this.footer = createRetroText(
      this,
      0,
      0,
      "Press ENTER or ESC to return to the main menu.",
      12,
      "#9eb8b0",
      "center",
    );
    this.footer.setOrigin(0.5, 0);

    this.backButton = createRetroButton(this, {
      x: 0,
      y: 0,
      width: 320,
      height: 60,
      label: "BACK",
      sublabel: "return to the main menu",
      onClick: () => this.goBack(),
    });

    this.keys = this.input.keyboard!.addKeys({
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    }) as {
      enter: Phaser.Input.Keyboard.Key;
      esc: Phaser.Input.Keyboard.Key;
    };

    this.reflow(true);
  }

  update(_time: number, delta: number): void {
    if (this.lastWidth !== this.scale.width || this.lastHeight !== this.scale.height) {
      this.reflow();
    }

    this.backdrop?.update(delta);

    if (Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.goBack();
    }
  }

  private reflow(initial = false): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.lastWidth = width;
    this.lastHeight = height;
    this.layout = computeMenuLayout(width, height);
    this.backdrop?.resize(width, height);

    this.title.setPosition(width / 2, this.layout.titleY);
    this.title.setFontSize(`${this.layout.titleSize}px`);
    this.subtitle.setPosition(width / 2, this.layout.titleY + 46);

    const frameWidth = Math.min(width - 32, 720);
    const frameHeight = this.layout.compact ? Math.min(height - 210, 430) : 392;
    const frameX = width / 2 - frameWidth / 2;
    const frameY = this.layout.compact ? height * 0.29 : height * 0.31;

    this.frame.clear();
    this.frame.fillStyle(COLORS.panel, 0.9);
    this.frame.fillRoundedRect(frameX, frameY, frameWidth, frameHeight, 20);
    this.frame.lineStyle(2, COLORS.panelEdgeDim, 0.65);
    this.frame.strokeRoundedRect(frameX, frameY, frameWidth, frameHeight, 20);
    this.frame.lineStyle(1, COLORS.panelEdge, 0.18);
    this.frame.strokeRoundedRect(frameX + 8, frameY + 8, frameWidth - 16, frameHeight - 16, 16);

    this.body.setText([
      "This cabinet is a greenfield Phaser build with classic arcade energy.",
      "",
      "Rules:",
      "• no hold piece",
      "• no ghost piece",
      "• no hard drop",
      "• no modern wall kicks",
      "",
      "Systems:",
      "• fair 7-bag randomizer",
      "• classic line-clear scoring",
      "• procedural Web Audio chiptune",
      "• retro scanlines and phosphor glow",
    ].join("\n"));
    this.body.setWordWrapWidth(frameWidth - 48);
    this.body.setPosition(frameX + 24, frameY + 60);

    this.footer.setPosition(width / 2, frameY + frameHeight + 18);
    this.backButton.container.setPosition(width / 2, frameY + frameHeight - 54);
    this.sectionTitle.setPosition(frameX + 24, frameY + 18);
  }

  private goBack(): void {
    audio.playSfx("back");
    this.scene.start(SceneKeys.MainMenu);
  }
}
