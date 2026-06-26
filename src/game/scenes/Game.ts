import { Geom, Scene } from "phaser";
import SVGPathCommander from "svg-path-commander";

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;
  map: Phaser.GameObjects.Image;
  graphics: Phaser.GameObjects.Graphics;

  constructor() {
    super("Game");
  }

  create() {
    this.camera = this.cameras.main;
    // this.camera.setBackgroundColor(0x00ff00);

    // this.background = this.add.image(512, 384, "background");
    // this.background.setAlpha(0.5);

    this.msg_text = this.add.text(
      512,
      384,
      "Make something fun!\nand share it with us:\nsupport@phaser.io",
      {
        fontFamily: "Arial Black",
        fontSize: 38,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 8,
        align: "center",
      },
    );
    this.msg_text.setOrigin(0.5);

    // this.input.once("pointerdown", () => {
    //   this.scene.start("GameOver");
    // });

    const mapXml = this.cache.xml.get("poland_map");
    const provinces = mapXml.querySelectorAll("path");

    provinces.forEach((pathNode: Element) => {
      const provinceId = pathNode.getAttribute("id") || "unknown";
      const pathData = pathNode.getAttribute("d");

      // --- Filter out the junk ---
      if (!pathData) return;
      if (
        provinceId.toLowerCase().includes("pattern") ||
        provinceId.toLowerCase().includes("background") ||
        provinceId.toLowerCase().includes("path")
      ) {
        return;
      }

      const subPaths: number[][] = [];
      let currentPath: number[] = [];

      try {
        const path = new SVGPathCommander(pathData);

        const absoluteCommands = path.normalize().segments;

        absoluteCommands.forEach((command) => {
          if (command[0] === "M") {
            if (currentPath.length > 0) subPaths.push(currentPath);
            currentPath = [command[1] as number, command[2] as number];
          } else if (command[0] === "L") {
            currentPath.push(command[1] as number, command[2] as number);
          } else if (command[0] !== "Z") {
            const len = command.length;
            currentPath.push(
              command[len - 2] as number,
              command[len - 1] as number,
            );
          }
        });
        if (currentPath.length > 0) subPaths.push(currentPath);
      } catch (error) {
        console.warn({ error });
        return;
      }

      if (subPaths.length === 0 || subPaths[0].length < 3) return;

      const provinceGraphic = this.add.graphics();
      provinceGraphic.lineStyle(1.5, 0x1a334d, 1);
      provinceGraphic.fillStyle(0x336699, 1);

      provinceGraphic.beginPath();
      subPaths.forEach((loop) => {
        provinceGraphic.moveTo(loop[0], loop[1]);
        for (let i = 2; i < loop.length; i += 2) {
          provinceGraphic.lineTo(loop[i], loop[i + 1]);
        }
        provinceGraphic.closePath();
      });
      provinceGraphic.fillPath();
      provinceGraphic.strokePath();

      // Z-DEPTH
      provinceGraphic.setDepth(10000 - subPaths[0].length);

      const hitArea = new Geom.Polygon(subPaths[0]);
      provinceGraphic.setInteractive(hitArea, Geom.Polygon.Contains);

      provinceGraphic.on("pointerdown", () => {
        console.log(`Selected province: ${provinceId}`);

        provinceGraphic.clear();
        provinceGraphic.lineStyle(1.5, 0x1a334d, 1);
        provinceGraphic.fillStyle(0xff0000, 1);

        provinceGraphic.beginPath();

        subPaths.forEach((loop) => {
          provinceGraphic.moveTo(loop[0], loop[1]);
          for (let i = 2; i < loop.length; i += 2) {
            provinceGraphic.lineTo(loop[i], loop[i + 1]);
          }
          provinceGraphic.closePath();
        });

        provinceGraphic.fillPath();
        provinceGraphic.strokePath();
      });
    });
  }
}
