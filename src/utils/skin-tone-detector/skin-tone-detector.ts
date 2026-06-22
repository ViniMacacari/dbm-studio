import sharp from 'sharp';

export type SkinToneOption = {
    type: number;
    hex: string;
};

export type SkinToneResult = {
    type: number;
    hex: string;
    detectedHex: string;
    distance: number;
    confidence: number;
    sampledPixels: number;
};

type RGB = {
    r: number;
    g: number;
    b: number;
};

type RGBWithSamples = RGB & {
    sampledPixels: number;
};

type Lab = {
    l: number;
    a: number;
    b: number;
};

export class SkinToneDetector {
    async getTone(tones: SkinToneOption[], imageUrl: string): Promise<SkinToneResult> {
        this.validateTones(tones);

        const imageBuffer = await this.downloadImage(imageUrl);
        const detectedColor = await this.extractSkinAverageColor(imageBuffer);
        const nearestTone = this.findNearestTone(detectedColor, tones);

        return {
            type: nearestTone.tone.type,
            hex: nearestTone.tone.hex,
            detectedHex: this.rgbToHex(detectedColor),
            distance: Number(nearestTone.distance.toFixed(2)),
            confidence: this.distanceToConfidence(nearestTone.distance),
            sampledPixels: detectedColor.sampledPixels,
        };
    }

    private async downloadImage(url: string): Promise<Buffer> {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro ao baixar imagem: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        return Buffer.from(arrayBuffer);
    }

    private async extractSkinAverageColor(imageBuffer: Buffer): Promise<RGBWithSamples> {
        const { data, info } = await sharp(imageBuffer)
            .rotate()
            .resize({
                width: 320,
                height: 320,
                fit: 'inside',
                withoutEnlargement: true,
            })
            .removeAlpha()
            .toColorspace('srgb')
            .raw()
            .toBuffer({ resolveWithObject: true });

        const channels = info.channels;

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let totalWeight = 0;
        let sampledPixels = 0;

        for (let y = 0; y < info.height; y++) {
            for (let x = 0; x < info.width; x++) {
                const index = (y * info.width + x) * channels;

                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];

                if (!this.isLikelySkin(r, g, b)) {
                    continue;
                }

                const weight = this.getRegionWeight(x, y, info.width, info.height);

                totalR += r * weight;
                totalG += g * weight;
                totalB += b * weight;
                totalWeight += weight;
                sampledPixels++;
            }
        }

        if (sampledPixels < 30 || totalWeight === 0) {
            return this.extractFallbackAverageColor(data, info.width, info.height, channels);
        }

        return {
            r: Math.round(totalR / totalWeight),
            g: Math.round(totalG / totalWeight),
            b: Math.round(totalB / totalWeight),
            sampledPixels,
        };
    }

    private extractFallbackAverageColor(
        data: Buffer,
        width: number,
        height: number,
        channels: number,
    ): RGBWithSamples {
        const startX = Math.floor(width * 0.3);
        const endX = Math.floor(width * 0.7);
        const startY = Math.floor(height * 0.15);
        const endY = Math.floor(height * 0.65);

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let count = 0;

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const index = (y * width + x) * channels;

                totalR += data[index];
                totalG += data[index + 1];
                totalB += data[index + 2];
                count++;
            }
        }

        if (count === 0) {
            throw new Error('Não foi possível extrair cor da imagem.');
        }

        return {
            r: Math.round(totalR / count),
            g: Math.round(totalG / count),
            b: Math.round(totalB / count),
            sampledPixels: count,
        };
    }

    private isLikelySkin(r: number, g: number, b: number): boolean {
        const hsv = this.rgbToHsv(r, g, b);
        const ycbcr = this.rgbToYCbCr(r, g, b);

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);

        const rgbRule =
            r > 25 &&
            g > 20 &&
            b > 15 &&
            max - min > 8 &&
            r > b * 1.03 &&
            r >= g * 0.70;

        const hsvRule =
            (
                hsv.h <= 55 ||
                hsv.h >= 340
            ) &&
            hsv.s >= 0.10 &&
            hsv.s <= 0.85 &&
            hsv.v >= 0.10 &&
            hsv.v <= 0.98;

        const ycbcrRule =
            ycbcr.cb >= 70 &&
            ycbcr.cb <= 155 &&
            ycbcr.cr >= 120 &&
            ycbcr.cr <= 195;

        return (
            hsvRule && ycbcrRule
        ) || (
                rgbRule && ycbcrRule
            ) || (
                rgbRule && hsvRule
            );
    }

    private getRegionWeight(x: number, y: number, width: number, height: number): number {
        const nx = x / width;
        const ny = y / height;

        const centerFaceArea =
            nx >= 0.28 &&
            nx <= 0.72 &&
            ny >= 0.12 &&
            ny <= 0.62;

        const upperBodyArea =
            nx >= 0.18 &&
            nx <= 0.82 &&
            ny >= 0.05 &&
            ny <= 0.85;

        if (centerFaceArea) {
            return 2.5;
        }

        if (upperBodyArea) {
            return 1.2;
        }

        return 0.35;
    }

    private findNearestTone(
        detectedColor: RGB,
        tones: SkinToneOption[],
    ): { tone: SkinToneOption; distance: number } {
        const detectedLab = this.rgbToLab(detectedColor);

        let bestTone = tones[0];
        let bestDistance = Infinity;

        for (const tone of tones) {
            const toneRgb = this.hexToRgb(tone.hex);
            const toneLab = this.rgbToLab(toneRgb);
            const distance = this.deltaE(detectedLab, toneLab);

            if (distance < bestDistance) {
                bestDistance = distance;
                bestTone = tone;
            }
        }

        return {
            tone: bestTone,
            distance: bestDistance,
        };
    }

    private distanceToConfidence(distance: number): number {
        const confidence = Math.max(0, Math.min(1, 1 - distance / 45));

        return Number(confidence.toFixed(2));
    }

    private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
        const rn = r / 255;
        const gn = g / 255;
        const bn = b / 255;

        const max = Math.max(rn, gn, bn);
        const min = Math.min(rn, gn, bn);
        const delta = max - min;

        let h = 0;

        if (delta !== 0) {
            if (max === rn) {
                h = 60 * (((gn - bn) / delta) % 6);
            } else if (max === gn) {
                h = 60 * ((bn - rn) / delta + 2);
            } else {
                h = 60 * ((rn - gn) / delta + 4);
            }
        }

        if (h < 0) {
            h += 360;
        }

        const s = max === 0 ? 0 : delta / max;
        const v = max;

        return { h, s, v };
    }

    private rgbToYCbCr(r: number, g: number, b: number): { y: number; cb: number; cr: number } {
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        return { y, cb, cr };
    }

    private rgbToLab(rgb: RGB): Lab {
        let r = rgb.r / 255;
        let g = rgb.g / 255;
        let b = rgb.b / 255;

        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
        const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
        const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

        const fx = this.labPivot(x);
        const fy = this.labPivot(y);
        const fz = this.labPivot(z);

        return {
            l: 116 * fy - 16,
            a: 500 * (fx - fy),
            b: 200 * (fy - fz),
        };
    }

    private labPivot(value: number): number {
        return value > 0.008856
            ? Math.cbrt(value)
            : 7.787 * value + 16 / 116;
    }

    private deltaE(a: Lab, b: Lab): number {
        return Math.sqrt(
            Math.pow(a.l - b.l, 2) +
            Math.pow(a.a - b.a, 2) +
            Math.pow(a.b - b.b, 2),
        );
    }

    private hexToRgb(hex: string): RGB {
        const cleanHex = hex.replace('#', '').trim();

        if (!/^[0-9a-fA-F]{6}$/.test(cleanHex)) {
            throw new Error(`Hex inválido: ${hex}`);
        }

        return {
            r: parseInt(cleanHex.substring(0, 2), 16),
            g: parseInt(cleanHex.substring(2, 4), 16),
            b: parseInt(cleanHex.substring(4, 6), 16),
        };
    }

    private rgbToHex(rgb: RGB): string {
        const toHex = (value: number): string => {
            return Math.max(0, Math.min(255, value))
                .toString(16)
                .padStart(2, '0');
        };

        return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    }

    private validateTones(tones: SkinToneOption[]): void {
        if (!Array.isArray(tones) || tones.length === 0) {
            throw new Error('O JSON de tons precisa ser um array com pelo menos um item.');
        }

        for (const tone of tones) {
            if (
                typeof tone !== 'object' ||
                typeof tone.type !== 'number' ||
                typeof tone.hex !== 'string'
            ) {
                throw new Error('Cada tom precisa ter o formato: { type: number, hex: string }');
            }

            this.hexToRgb(tone.hex);
        }
    }
}