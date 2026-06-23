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
  { left: 0.29, top: 0.47, right: 0.71, bottom: 0.67 },
  { left: 0.39, top: 0.62, right: 0.61, bottom: 0.72 },
  { left: 0.31, top: 0.55, right: 0.43, bottom: 0.67 },
  { left: 0.57, top: 0.55, right: 0.69, bottom: 0.67 }
];

const facialRegionWeights = [1, 1, 1, 1, 1, 3, 2, 2];

const compactFullBeardIds = new Set([
  30, 33, 40, 42, 43, 79, 103, 111, 239, 250, 265, 267, 270, 273,
  275, 276, 311
]);

const naturalShortBeardIds = new Set([
  27, 28, 30, 35, 36, 38, 39, 42, 43, 45, 46, 47, 58, 62, 94, 103,
  236, 237, 238, 239, 243, 244, 245, 247, 248, 249, 251, 252, 257, 259,
  260, 265, 266, 268, 270, 272, 273, 274, 275, 276, 277, 278, 279, 280,
  282, 284, 286, 288, 289, 299, 300, 301, 303, 311
]);

const goateeBeardIds = new Set([
  29, 39, 41, 58, 62, 80, 88, 94, 258, 264, 269, 271, 297, 310
]);

const cleanShavenBeardIds = new Set([
  35, 36, 46, 243, 244, 247, 251, 257, 259, 274, 277, 278, 279, 280,
  282, 284, 288, 300, 303
]);

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

    const [targetDescriptor, cleanShaven] = await Promise.all([
      this.createDescriptor(imageBuffer, true),
      this.isCleanShaven(imageBuffer)
    ]);
    const candidates = this.automaticCandidates(targetDescriptor, references, cleanShaven);
    let closest = candidates[0];
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const reference of candidates) {
      const distance = this.descriptorDistance(targetDescriptor, reference.descriptor);
      if (distance < closestDistance) {
        closest = reference;
        closestDistance = distance;
      }
    }
    return closest.id;
  }

  private automaticCandidates(
    targetDescriptor: number[],
    references: BeardReference[],
    cleanShaven: boolean
  ): BeardReference[] {
    const veryDarkCoverage = (region: number) => targetDescriptor[region * 4 + 2] ?? 0;
    const fullBeardScore = [1, 2, 3, 4]
      .reduce((total, region) => total + veryDarkCoverage(region), 0) / 4;
    const centralScore = (veryDarkCoverage(0) + veryDarkCoverage(1)) / 2;
    const sideScore = (veryDarkCoverage(2) + veryDarkCoverage(3)) / 2;
    const acceptedIds = cleanShaven
      ? cleanShavenBeardIds
      : fullBeardScore >= 0.7
        ? compactFullBeardIds
        : centralScore > sideScore + 0.18
          ? goateeBeardIds
          : naturalShortBeardIds;
    const candidates = references.filter(reference => acceptedIds.has(reference.id));
    return candidates.length > 0 ? candidates : references;
  }

  private async isCleanShaven(imageBuffer: Buffer): Promise<boolean> {
    const image = await this.normalizedPixels(imageBuffer, true);
    const upperFace = this.regionAppearance(
      image,
      { left: 0.34, top: 0.32, right: 0.66, bottom: 0.5 }
    );
    const lowerFace = this.regionAppearance(
      image,
      { left: 0.31, top: 0.5, right: 0.69, bottom: 0.7 }
    );
    return lowerFace.saturation >= upperFace.saturation + 0.025
      && lowerFace.gradient <= upperFace.gradient - 0.035;
  }

  private regionAppearance(
    image: ImagePixels,
    region: ImageRegion
  ): { saturation: number; gradient: number } {
    let count = 0;
    let saturationTotal = 0;
    let gradientTotal = 0;
    this.forEachPixel(image, region, (x, y, r, g, b) => {
      const maximum = Math.max(r, g, b);
      const minimum = Math.min(r, g, b);
      saturationTotal += maximum === 0 ? 0 : (maximum - minimum) / maximum;
      if (x > 0 && y > 0) {
        const leftIndex = (y * image.width + x - 1) * image.channels;
        const upperIndex = ((y - 1) * image.width + x) * image.channels;
        const currentLuminance = this.luminance(r, g, b);
        gradientTotal += Math.min(1, (
          Math.abs(currentLuminance - this.luminance(
            image.data[leftIndex],
            image.data[leftIndex + 1],
            image.data[leftIndex + 2]
          ))
          + Math.abs(currentLuminance - this.luminance(
            image.data[upperIndex],
            image.data[upperIndex + 1],
            image.data[upperIndex + 2]
          ))
        ) / 96);
      }
      count += 1;
    });
    return count === 0
      ? { saturation: 0, gradient: 0 }
      : {
          saturation: saturationTotal / count,
          gradient: gradientTotal / count
        };
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

  private async createDescriptor(imageBuffer: Buffer, alignToAsset = false): Promise<number[]> {
    const pixels = await this.normalizedPixels(imageBuffer, alignToAsset);
    const skinLuminance = alignToAsset
      ? this.alignedSkinLuminance(pixels)
      : this.skinLuminance(pixels);
    const luminance = this.luminanceMap(pixels);
    const descriptor: number[] = [];
    for (const region of facialRegions) {
      descriptor.push(...this.regionDescriptor(pixels, luminance, skinLuminance, region));
    }
    return descriptor;
  }

  private async normalizedPixels(imageBuffer: Buffer, alignToAsset: boolean): Promise<ImagePixels> {
    const { data, info } = await sharp(imageBuffer)
      .rotate()
      .resize(250, 250, { fit: "fill" })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .removeAlpha()
      .toColorspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });
    const image: ImagePixels = {
      data,
      width: info.width,
      height: info.height,
      channels: info.channels,
      background: { r: 255, g: 255, b: 255 }
    };
    image.background = this.backgroundColor(image);
    if (!alignToAsset) {
      return image;
    }

    const face = this.findFaceBounds(image);
    if (!face) {
      return image;
    }

    const faceWidth = face.right - face.left + 1;
    const cropSize = Math.max(32, Math.round(image.width * faceWidth / 84));
    const centerX = (face.left + face.right) / 2;
    const requestedLeft = Math.round(centerX - cropSize / 2);
    const requestedTop = Math.round(face.top - 74 * cropSize / image.height);
    const padding = {
      left: Math.max(0, -requestedLeft),
      top: Math.max(0, -requestedTop),
      right: Math.max(0, requestedLeft + cropSize - image.width),
      bottom: Math.max(0, requestedTop + cropSize - image.height)
    };
    const extended = await sharp(image.data, {
      raw: {
        width: image.width,
        height: image.height,
        channels: image.channels as 1 | 2 | 3 | 4
      }
    })
      .extend({ ...padding, background: image.background })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const aligned = await sharp(extended.data, {
      raw: {
        width: extended.info.width,
        height: extended.info.height,
        channels: extended.info.channels
      }
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
      data: aligned.data,
      width: aligned.info.width,
      height: aligned.info.height,
      channels: aligned.info.channels,
      background: image.background
    };
  }

  private alignedSkinLuminance(image: ImagePixels): number {
    const values: number[] = [];
    this.forEachPixel(
      image,
      { left: 0.34, top: 0.32, right: 0.66, bottom: 0.5 },
      (_x, _y, r, g, b) => {
        if (this.isFaceSkin(r, g, b)) {
          values.push(this.luminance(r, g, b));
        }
      }
    );
    if (values.length === 0) {
      return 128;
    }
    values.sort((left, right) => left - right);
    return values[Math.min(values.length - 1, Math.floor(values.length * 0.8))];
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
      const regionIndex = Math.floor(index / featureWeights.length);
      distance += difference
        * difference
        * featureWeights[index % featureWeights.length]
        * facialRegionWeights[regionIndex];
    }
    return Math.sqrt(distance);
  }

  private findFaceBounds(image: ImagePixels): FaceBounds | undefined {
    const pixelCount = image.width * image.height;
    const skinMask = new Uint8Array(pixelCount);
    for (let y = Math.floor(image.height * 0.05); y < Math.floor(image.height * 0.78); y += 1) {
      for (let x = Math.floor(image.width * 0.12); x < Math.floor(image.width * 0.88); x += 1) {
        const pixelIndex = y * image.width + x;
        const dataIndex = pixelIndex * image.channels;
        if (this.isFaceSkin(
          image.data[dataIndex],
          image.data[dataIndex + 1],
          image.data[dataIndex + 2]
        )) {
          skinMask[pixelIndex] = 1;
        }
      }
    }

    const queue = new Int32Array(pixelCount);
    let best: (FaceBounds & { score: number }) | undefined;
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
        best = { left, top, right, bottom, score };
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

  private isFaceSkin(r: number, g: number, b: number): boolean {
    const maximum = Math.max(r, g, b);
    const minimum = Math.min(r, g, b);
    if ((r >= 235 && g >= 235 && b >= 235) || (r <= 18 && g <= 18 && b <= 18)) {
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
    return fallbackBeardIds[Math.floor(Math.random() * fallbackBeardIds.length)];
  }
}
