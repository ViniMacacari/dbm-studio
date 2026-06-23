import { existsSync, promises as fs } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { AppConfig } from "../../app-config";

interface BeardReference {
  id: number;
  descriptor: number[];
}

interface ImagePixels {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}

interface ImageRegion {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const fallbackBeardIds = [
  27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 39, 40, 41, 42, 43, 44,
  45, 46, 47, 58, 62, 78, 79, 80, 81, 85, 87, 88, 89, 90, 91, 92, 93,
  94, 100, 101, 102, 103, 111, 236, 237, 238, 239, 240, 241, 242, 243,
  244, 245, 247, 248, 249, 250, 251, 252, 257, 258, 259, 260, 261, 262,
  263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276,
  277, 278, 279, 280, 281, 282, 283, 284, 286, 288, 289, 297, 298, 299,
  300, 301, 302, 303, 304, 310, 311
] as const;

const facialRegions: ImageRegion[] = [
  { left: 0.39, top: 0.44, right: 0.61, bottom: 0.53 },
  { left: 0.38, top: 0.52, right: 0.62, bottom: 0.66 },
  { left: 0.27, top: 0.46, right: 0.44, bottom: 0.65 },
  { left: 0.56, top: 0.46, right: 0.73, bottom: 0.65 },
  { left: 0.29, top: 0.47, right: 0.71, bottom: 0.67 }
];

export class BeardDetector {
  private readonly beardsPath: string;
  private referencesPromise?: Promise<BeardReference[]>;

  constructor(userDataPath: string) {
    const dependency = AppConfig.visualDependencies.find(item => item.id === "beards");
    if (!dependency) {
      throw new Error("Beards visual dependency is not configured.");
    }
    this.beardsPath = join(userDataPath, "visual-dependencies", dependency.targetDirectory);
  }

  async detect(imageUrl: string): Promise<number> {
    const assetFiles = await this.listBeardAssets();
    if (assetFiles.length === 0) {
      return this.randomFallbackId();
    }

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
  }

  private async listBeardAssets(): Promise<Array<{ id: number; path: string }>> {
    if (!existsSync(this.beardsPath)) {
      return [];
    }
    try {
      const files = await fs.readdir(this.beardsPath, { withFileTypes: true });
      return files
        .filter(file => file.isFile())
        .map(file => {
          const match = file.name.match(/^hair_id_(\d+)\.png$/i);
          return match
            ? { id: Number(match[1]), path: join(this.beardsPath, file.name) }
            : undefined;
        })
        .filter((asset): asset is { id: number; path: string } => Boolean(asset))
        .sort((left, right) => left.id - right.id);
    } catch {
      return [];
    }
  }

  private references(assetFiles: Array<{ id: number; path: string }>): Promise<BeardReference[]> {
    if (!this.referencesPromise) {
      this.referencesPromise = this.loadReferences(assetFiles);
    }
    return this.referencesPromise;
  }

  private async loadReferences(assetFiles: Array<{ id: number; path: string }>): Promise<BeardReference[]> {
    const references = await Promise.all(assetFiles.map(async asset => {
      try {
        const buffer = await fs.readFile(asset.path);
        return { id: asset.id, descriptor: await this.createDescriptor(buffer) };
      } catch {
        return undefined;
      }
    }));
    return references.filter((reference): reference is BeardReference => Boolean(reference));
  }

  private async createDescriptor(imageBuffer: Buffer): Promise<number[]> {
    const pixels = await this.normalizedPixels(imageBuffer);
    const skinLuminance = this.skinLuminance(pixels);
    const luminance = this.luminanceMap(pixels);
    const descriptor: number[] = [];
    for (const region of facialRegions) {
      descriptor.push(...this.regionDescriptor(pixels, luminance, skinLuminance, region));
    }
    return descriptor;
  }

  private async normalizedPixels(imageBuffer: Buffer): Promise<ImagePixels> {
    const { data, info } = await sharp(imageBuffer)
      .rotate()
      .resize(250, 250, { fit: "fill" })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .removeAlpha()
      .toColorspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, channels: info.channels };
  }

  private skinLuminance(image: ImagePixels): number {
    const skinRegions: ImageRegion[] = [
      { left: 0.37, top: 0.23, right: 0.63, bottom: 0.34 },
      { left: 0.27, top: 0.35, right: 0.41, bottom: 0.47 },
      { left: 0.59, top: 0.35, right: 0.73, bottom: 0.47 }
    ];
    const values: number[] = [];
    for (const region of skinRegions) {
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

  private regionDescriptor(
    image: ImagePixels,
    luminance: Float32Array,
    skinLuminance: number,
    region: ImageRegion
  ): number[] {
    let count = 0;
    let darknessTotal = 0;
    let gradientTotal = 0;
    let moderatelyDark = 0;
    let veryDark = 0;
    this.forEachPixel(image, region, (x, y, r, g, b) => {
      const pixelLuminance = this.luminance(r, g, b);
      const darkness = Math.max(0, (skinLuminance - pixelLuminance) / Math.max(1, skinLuminance));
      darknessTotal += darkness;
      if (darkness >= 0.16) {
        moderatelyDark += 1;
      }
      if (darkness >= 0.34) {
        veryDark += 1;
      }
      if (x > 0 && y > 0) {
        const index = y * image.width + x;
        gradientTotal += Math.min(1, (
          Math.abs(luminance[index] - luminance[index - 1])
          + Math.abs(luminance[index] - luminance[index - image.width])
        ) / 96);
      }
      count += 1;
    });
    if (count === 0) {
      return [0, 0, 0, 0];
    }
    return [
      darknessTotal / count,
      moderatelyDark / count,
      veryDark / count,
      gradientTotal / count
    ];
  }

  private luminanceMap(image: ImagePixels): Float32Array {
    const result = new Float32Array(image.width * image.height);
    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        const index = (y * image.width + x) * image.channels;
        result[y * image.width + x] = this.luminance(
          image.data[index],
          image.data[index + 1],
          image.data[index + 2]
        );
      }
    }
    return result;
  }

  private descriptorDistance(left: number[], right: number[]): number {
    let distance = 0;
    const featureWeights = [1.15, 1.35, 1.5, 0.75];
    for (let index = 0; index < left.length; index += 1) {
      const difference = left[index] - right[index];
      distance += difference * difference * featureWeights[index % featureWeights.length];
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
    return r >= 24
      && g >= 18
      && b >= 12
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
    return fallbackBeardIds[Math.floor(Math.random() * fallbackBeardIds.length)];
  }
}
