import { existsSync, promises as fs } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { AppConfig } from "../../app-config";

interface HairReference {
  id: number;
  descriptor: number[];
}

interface ImagePixels {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
  background: { r: number; g: number; b: number };
}

interface ImageRegion {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface FaceBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const fallbackHairIds = Array.from({ length: 300 }, (_value, id) => id)
  .filter(id => id !== 202);

const hairGridColumns = 8;
const hairGridRows = 6;
const hairGridBounds = { left: 0.1, top: 0.08, right: 0.9, bottom: 0.68 };

export class HairDetector {
  private readonly hairsPath: string;
  private referencesPromise?: Promise<HairReference[]>;

  constructor(userDataPath: string) {
    const dependency = AppConfig.visualDependencies.find(item => item.id === "hairs");
    if (!dependency) {
      throw new Error("Hairs visual dependency is not configured.");
    }
    this.hairsPath = join(userDataPath, "visual-dependencies", dependency.targetDirectory);
  }

  async detect(imageUrl: string): Promise<number> {
    const assetFiles = await this.listHairAssets();
    if (assetFiles.length === 0) {
      return this.randomFallbackId();
    }

    try {
      this.validateImageUrl(imageUrl);
      const [imageBuffer, references] = await Promise.all([
        this.downloadImage(imageUrl),
        this.references(assetFiles)
      ]);
      if (references.length === 0) {
        return this.randomFallbackId();
      }

      const targetDescriptor = await this.createDescriptor(imageBuffer);
      let closest = references[0];
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const reference of references) {
        const distance = this.descriptorDistance(targetDescriptor, reference.descriptor);
        if (distance < closestDistance) {
          closest = reference;
          closestDistance = distance;
        }
      }
      return closest.id;
    } catch {
      return this.randomFallbackId();
    }
  }

  private async listHairAssets(): Promise<Array<{ id: number; path: string }>> {
    if (!existsSync(this.hairsPath)) {
      return [];
    }
    try {
      const files = await fs.readdir(this.hairsPath, { withFileTypes: true });
      return files
        .filter(file => file.isFile())
        .map(file => {
          const match = file.name.match(/^hair_id_(\d+)\.png$/i);
          return match
            ? { id: Number(match[1]), path: join(this.hairsPath, file.name) }
            : undefined;
        })
        .filter((asset): asset is { id: number; path: string } => Boolean(asset))
        .sort((left, right) => left.id - right.id);
    } catch {
      return [];
    }
  }

  private references(assetFiles: Array<{ id: number; path: string }>): Promise<HairReference[]> {
    if (!this.referencesPromise) {
      this.referencesPromise = this.loadReferences(assetFiles);
    }
    return this.referencesPromise;
  }

  private async loadReferences(assetFiles: Array<{ id: number; path: string }>): Promise<HairReference[]> {
    const references: HairReference[] = [];
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < assetFiles.length) {
        const asset = assetFiles[nextIndex];
        nextIndex += 1;
        try {
          const buffer = await fs.readFile(asset.path);
          references.push({ id: asset.id, descriptor: await this.createDescriptor(buffer) });
        } catch {}
      }
    };
    await Promise.all(Array.from({ length: Math.min(8, assetFiles.length) }, () => worker()));
    return references.sort((left, right) => left.id - right.id);
  }

  private async createDescriptor(imageBuffer: Buffer): Promise<number[]> {
    const image = await this.normalizedPixels(imageBuffer);
    const skinLuminance = this.skinLuminance(image);
    const rowBackgrounds = this.rowBackgrounds(image);
    return this.hairGridDescriptor(image, rowBackgrounds, skinLuminance);
  }

  private async normalizedPixels(imageBuffer: Buffer): Promise<ImagePixels> {
    const source = await sharp(imageBuffer)
      .rotate()
      .resize({ width: 500, height: 500, fit: "inside", withoutEnlargement: false })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .removeAlpha()
      .toColorspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });

    const sourceImage: ImagePixels = {
      data: source.data,
      width: source.info.width,
      height: source.info.height,
      channels: source.info.channels,
      background: { r: 255, g: 255, b: 255 }
    };
    sourceImage.background = this.backgroundColor(sourceImage);
    const face = this.findFaceBounds(sourceImage);
    if (!face) {
      const fallback = await sharp(source.data, {
        raw: { width: source.info.width, height: source.info.height, channels: source.info.channels }
      })
        .resize(250, 250, { fit: "fill" })
        .raw()
        .toBuffer({ resolveWithObject: true });
      return {
        data: fallback.data,
        width: fallback.info.width,
        height: fallback.info.height,
        channels: fallback.info.channels,
        background: sourceImage.background
      };
    }

    const faceWidth = face.right - face.left + 1;
    const cropSize = Math.max(32, Math.round(faceWidth * 2.2));
    const centerX = (face.left + face.right) / 2;
    const requestedLeft = Math.round(centerX - cropSize / 2);
    const requestedTop = Math.round(face.top - faceWidth * 0.7);
    const padding = {
      left: Math.max(0, -requestedLeft),
      top: Math.max(0, -requestedTop),
      right: Math.max(0, requestedLeft + cropSize - sourceImage.width),
      bottom: Math.max(0, requestedTop + cropSize - sourceImage.height)
    };
    const background = this.backgroundColor(sourceImage);
    const extended = await sharp(source.data, {
      raw: { width: source.info.width, height: source.info.height, channels: source.info.channels }
    })
      .extend({ ...padding, background })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { data, info } = await sharp(extended.data, {
      raw: { width: extended.info.width, height: extended.info.height, channels: extended.info.channels }
    })
      .extract({
        left: requestedLeft + padding.left,
        top: requestedTop + padding.top,
        width: cropSize,
        height: cropSize
      })
      .resize(250, 250, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    return {
      data,
      width: info.width,
      height: info.height,
      channels: info.channels,
      background
    };
  }

  private findFaceBounds(image: ImagePixels): FaceBounds | undefined {
    const pixelCount = image.width * image.height;
    const skinMask = new Uint8Array(pixelCount);
    for (let y = Math.floor(image.height * 0.05); y < Math.floor(image.height * 0.78); y += 1) {
      for (let x = Math.floor(image.width * 0.12); x < Math.floor(image.width * 0.88); x += 1) {
        const pixelIndex = y * image.width + x;
        const dataIndex = pixelIndex * image.channels;
        if (this.isLikelySkin(
          image.data[dataIndex],
          image.data[dataIndex + 1],
          image.data[dataIndex + 2]
        )) {
          skinMask[pixelIndex] = 1;
        }
      }
    }

    const queue = new Int32Array(pixelCount);
    let best: (FaceBounds & { size: number; score: number }) | undefined;
    for (let start = 0; start < pixelCount; start += 1) {
      if (skinMask[start] === 0) {
        continue;
      }
      let head = 0;
      let tail = 0;
      let size = 0;
      let left = image.width;
      let right = 0;
      let top = image.height;
      let bottom = 0;
      queue[tail] = start;
      tail += 1;
      skinMask[start] = 0;
      while (head < tail) {
        const current = queue[head];
        head += 1;
        const x = current % image.width;
        const y = Math.floor(current / image.width);
        size += 1;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        const neighbors = [current - 1, current + 1, current - image.width, current + image.width];
        for (const neighbor of neighbors) {
          if (neighbor < 0 || neighbor >= pixelCount || skinMask[neighbor] === 0) {
            continue;
          }
          const neighborX = neighbor % image.width;
          if (Math.abs(neighborX - x) > 1) {
            continue;
          }
          skinMask[neighbor] = 0;
          queue[tail] = neighbor;
          tail += 1;
        }
      }
      if (size < 80) {
        continue;
      }
      const centerX = (left + right) / 2 / image.width;
      const centerY = (top + bottom) / 2 / image.height;
      const centrality = Math.max(0.2, 1 - Math.abs(centerX - 0.5) - Math.abs(centerY - 0.4) * 0.6);
      const score = size * centrality;
      if (!best || score > best.score) {
        best = { left, top, right, bottom, size, score };
      }
    }
    return best;
  }

  private backgroundColor(image: ImagePixels): { r: number; g: number; b: number } {
    const samples: Array<[number, number]> = [
      [0, 0],
      [image.width - 1, 0],
      [0, Math.floor(image.height * 0.25)],
      [image.width - 1, Math.floor(image.height * 0.25)]
    ];
    let red = 0;
    let green = 0;
    let blue = 0;
    for (const [x, y] of samples) {
      const index = (y * image.width + x) * image.channels;
      red += image.data[index];
      green += image.data[index + 1];
      blue += image.data[index + 2];
    }
    return {
      r: Math.round(red / samples.length),
      g: Math.round(green / samples.length),
      b: Math.round(blue / samples.length)
    };
  }

  private skinLuminance(image: ImagePixels): number {
    const values: number[] = [];
    const cheeks: ImageRegion[] = [
      { left: 0.27, top: 0.36, right: 0.41, bottom: 0.48 },
      { left: 0.59, top: 0.36, right: 0.73, bottom: 0.48 }
    ];
    for (const region of cheeks) {
      this.forEachPixel(image, region, (_x, _y, r, g, b) => {
        if (this.isLikelySkin(r, g, b)) {
          values.push(this.luminance(r, g, b));
        }
      });
    }
    if (values.length === 0) {
      return 128;
    }
    values.sort((left, right) => left - right);
    return values[Math.floor(values.length / 2)];
  }

  private hairGridDescriptor(
    image: ImagePixels,
    rowBackgrounds: Array<{ r: number; g: number; b: number }>,
    skinLuminance: number
  ): number[] {
    const descriptor: number[] = [];
    const cellWidth = (hairGridBounds.right - hairGridBounds.left) / hairGridColumns;
    const cellHeight = (hairGridBounds.bottom - hairGridBounds.top) / hairGridRows;
    for (let row = 0; row < hairGridRows; row += 1) {
      for (let column = 0; column < hairGridColumns; column += 1) {
        let count = 0;
        let intensityTotal = 0;
        let occupied = 0;
        const region: ImageRegion = {
          left: hairGridBounds.left + column * cellWidth,
          top: hairGridBounds.top + row * cellHeight,
          right: hairGridBounds.left + (column + 1) * cellWidth,
          bottom: hairGridBounds.top + (row + 1) * cellHeight
        };
        this.forEachPixel(image, region, (_x, y, r, g, b) => {
          const rowBackground = rowBackgrounds[y] ?? image.background;
          const backgroundDistance = Math.sqrt(
            (r - rowBackground.r) ** 2
            + (g - rowBackground.g) ** 2
            + (b - rowBackground.b) ** 2
          );
          const foregroundWeight = Math.max(0, Math.min(1, (backgroundDistance - 18) / 45));
          const intensity = Math.max(
            0,
            (skinLuminance - this.luminance(r, g, b)) / Math.max(1, skinLuminance)
          ) * foregroundWeight;
          intensityTotal += intensity;
          if (intensity >= 0.18) {
            occupied += 1;
          }
          count += 1;
        });
        descriptor.push(
          count === 0 ? 0 : intensityTotal / count,
          count === 0 ? 0 : occupied / count
        );
      }
    }
    return descriptor;
  }

  private rowBackgrounds(image: ImagePixels): Array<{ r: number; g: number; b: number }> {
    const edgeWidth = Math.max(2, Math.floor(image.width * 0.1));
    const rows: Array<{ r: number; g: number; b: number }> = [];
    for (let y = 0; y < image.height; y += 1) {
      const reds: number[] = [];
      const greens: number[] = [];
      const blues: number[] = [];
      for (let offset = 0; offset < edgeWidth; offset += 1) {
        for (const x of [offset, image.width - 1 - offset]) {
          const index = (y * image.width + x) * image.channels;
          reds.push(image.data[index]);
          greens.push(image.data[index + 1]);
          blues.push(image.data[index + 2]);
        }
      }
      reds.sort((left, right) => left - right);
      greens.sort((left, right) => left - right);
      blues.sort((left, right) => left - right);
      const middle = Math.floor(reds.length / 2);
      rows.push({ r: reds[middle], g: greens[middle], b: blues[middle] });
    }
    return rows;
  }

  private descriptorDistance(left: number[], right: number[]): number {
    let distance = 0;
    for (let index = 0; index < left.length; index += 2) {
      const cell = index / 2;
      const row = Math.floor(cell / hairGridColumns);
      const column = cell % hairGridColumns;
      const isOuterColumn = column <= 1 || column >= hairGridColumns - 2;
      const positionWeight = isOuterColumn && row >= 3 ? 5 : isOuterColumn ? 2 : 1;
      const intensityDifference = left[index] - right[index];
      const occupancyDifference = left[index + 1] - right[index + 1];
      distance += positionWeight * (
        intensityDifference * intensityDifference
        + 1.5 * occupancyDifference * occupancyDifference
      );
    }
    return Math.sqrt(distance);
  }

  private forEachPixel(
    image: ImagePixels,
    region: ImageRegion,
    callback: (x: number, y: number, r: number, g: number, b: number) => void
  ): void {
    const left = Math.max(0, Math.floor(region.left * image.width));
    const top = Math.max(0, Math.floor(region.top * image.height));
    const right = Math.min(image.width, Math.ceil(region.right * image.width));
    const bottom = Math.min(image.height, Math.ceil(region.bottom * image.height));
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const index = (y * image.width + x) * image.channels;
        callback(x, y, image.data[index], image.data[index + 1], image.data[index + 2]);
      }
    }
  }

  private isLikelySkin(r: number, g: number, b: number): boolean {
    const maximum = Math.max(r, g, b);
    const minimum = Math.min(r, g, b);
    if (r >= 235 && g >= 235 && b >= 235) {
      return false;
    }
    if (r <= 18 && g <= 18 && b <= 18) {
      return false;
    }
    if (maximum - minimum <= 6) {
      return false;
    }
    const redNormalized = r / 255;
    const greenNormalized = g / 255;
    const blueNormalized = b / 255;
    const hsvMaximum = Math.max(redNormalized, greenNormalized, blueNormalized);
    const hsvMinimum = Math.min(redNormalized, greenNormalized, blueNormalized);
    const delta = hsvMaximum - hsvMinimum;
    let hue = 0;
    if (delta > 0) {
      if (hsvMaximum === redNormalized) {
        hue = 60 * (((greenNormalized - blueNormalized) / delta) % 6);
      } else if (hsvMaximum === greenNormalized) {
        hue = 60 * ((blueNormalized - redNormalized) / delta + 2);
      } else {
        hue = 60 * ((redNormalized - greenNormalized) / delta + 4);
      }
    }
    if (hue < 0) {
      hue += 360;
    }
    const saturation = hsvMaximum === 0 ? 0 : delta / hsvMaximum;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    return (hue <= 60 || hue >= 340)
      && saturation >= 0.07
      && saturation <= 0.84
      && hsvMaximum >= 0.1
      && hsvMaximum <= 0.99
      && cb >= 68
      && cb <= 156
      && cr >= 116
      && cr <= 200
      && r >= 24
      && g >= 18
      && b >= 12
      && g >= r * 0.35
      && b >= r * 0.2
      && maximum - minimum >= 8
      && r >= g * 0.64
      && r >= b * 1.01
      && g >= b * 0.64;
  }

  private luminance(r: number, g: number, b: number): number {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  private validateImageUrl(imageUrl: string): void {
    if (!imageUrl?.trim()) {
      throw new Error("Player image URL was not provided.");
    }
    try {
      new URL(imageUrl);
    } catch {
      throw new Error(`Invalid player image URL: "${imageUrl}".`);
    }
  }

  private async downloadImage(imageUrl: string): Promise<Buffer> {
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      },
      signal: AbortSignal.timeout(20_000)
    });
    if (!response.ok) {
      throw new Error(`Could not download player image: ${response.status} ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      throw new Error("Downloaded player image is empty.");
    }
    if (buffer.length > 12 * 1024 * 1024) {
      throw new Error("Player image exceeds the 12 MB limit.");
    }
    return buffer;
  }

  private randomFallbackId(): number {
    return fallbackHairIds[Math.floor(Math.random() * fallbackHairIds.length)];
  }
}
