import SVGPathCommander from "svg-path-commander";
import { Container, Graphics, Sprite, Polygon } from "pixi.js";
import { engine } from "../app/getEngine";

interface ProvinceData {
  id: string;
  polygons: Polygon[];
}

export class Map extends Container {
  public mapSprite: Sprite;
  public provinceData: ProvinceData[] = [];
  public highlightGraphic: Graphics;

  constructor() {
    super();

    this.highlightGraphic = new Graphics();
    this.addChild(this.highlightGraphic);
  }

  public async createProvinces(svgUrl: string) {

    const response = await fetch(svgUrl);
    const svgText = await response.text();
    const parser = new DOMParser();
    const mapXml = parser.parseFromString(svgText, "image/svg+xml");
    const provinces = mapXml.querySelectorAll("path");

    const parsedProvinces: {
      id: string;
      subPaths: number[][];
      pointCount: number;
    }[] = [];

    provinces.forEach((pathNode: Element) => {
      const provinceId = pathNode.getAttribute("id") || "unknown";
      const pathData = pathNode.getAttribute("d");

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
        console.error("Error ", error);
        return;
      }

      if (subPaths.length === 0 || subPaths[0].length < 3) return;

      parsedProvinces.push({
        id: provinceId,
        subPaths: subPaths,
        pointCount: subPaths[0].length,
      });
    });

    parsedProvinces.sort((a, b) => b.pointCount - a.pointCount);

    const megaStamp = new Graphics();

    parsedProvinces.forEach((prov) => {
      const mathPolygons: Polygon[] = [];

      prov.subPaths.forEach((loop) => {
        megaStamp.poly(loop);

        megaStamp.fill({ color: 0x336699, alpha: 1 });
        megaStamp.stroke({ width: 0.5, color: 0x1a334d, alpha: 1 });

        mathPolygons.push(new Polygon(loop));
      });

      this.provinceData.push({
        id: prov.id,
        polygons: mathPolygons,
      });
    });

    const mapTexture = engine().renderer.generateTexture(megaStamp);

    megaStamp.destroy();

    this.mapSprite = new Sprite(mapTexture);

    this.addChildAt(this.mapSprite, 0);

    this.setupInteractivity();
  }

  private setupInteractivity() {
    this.mapSprite.eventMode = "static";

    this.mapSprite.on("pointerdown", (event) => {
      const localPoint = event.getLocalPosition(this.mapSprite);

      for (let i = this.provinceData.length - 1; i >= 0; i--) {
        const province = this.provinceData[i];

        for (const poly of province.polygons) {
          if (poly.contains(localPoint.x, localPoint.y)) {
            console.log(`Selected province: ${province.id}`);
            this.highlightProvince(province);
            return;
          }
        }
      }
    });
  }

  private highlightProvince(province: ProvinceData) {
    this.highlightGraphic.clear();

    province.polygons.forEach((poly) => {
      this.highlightGraphic.poly(poly);
      this.highlightGraphic.fill({ color: 0xff0000, alpha: 0.5 });
      this.highlightGraphic.stroke({ width: 2, color: 0xff0000, alpha: 1 });
    });
  }
}
