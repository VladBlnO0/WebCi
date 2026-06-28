import SVGPathCommander from "svg-path-commander";
import { Geom, Scene } from "phaser";

export class Map {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  createProvinces() {
    const mapXml = this.scene.cache.xml.get("poland_map");
    const provinces = mapXml.querySelectorAll("path");

    provinces.forEach((pathNode: Element) => {
      const provinceId = pathNode.getAttribute("id") || "unknown";
      const pathData = pathNode.getAttribute("d");

      // --- Filter out the junk ---
      if (!pathData) return;
      if (
        provinceId.toLowerCase().includes("pattern") ||
        provinceId.toLowerCase().includes("background")
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

      const provinceGraphic = this.scene.add.graphics();

      provinceGraphic.lineStyle(0.5, 0x1a334d, 1);
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

      provinceGraphic.setInteractive(
        new Geom.Rectangle(0, 0, 0, 0),
        (hitArea: any, x: number, y: number) => {
          for (const loop of subPaths) {
            const poly = new Geom.Polygon(loop);

            if (poly.contains(x, y)) {
              return true;
            }
          }
          return false;
        },
      );

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
