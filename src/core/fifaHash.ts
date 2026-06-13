const crcTable = makeCrc32Table();

function makeCrc32Table(): number[] {
  const table: number[] = [];
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) !== 0 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

export function computeLanguageHash(name: string): number {
  const bytes = Buffer.from(name, "utf8");
  let value = 0;

  for (const byte of bytes) {
    let index = byte & 0xdf;
    index = (index ^ value) & 0xff;
    value = ((value >>> 8) ^ crcTable[index]) >>> 0;
  }

  return (value ^ 0x80000000) >>> 0;
}

export function toSignedInt32(value: number): number {
  return value | 0;
}

export function computeBitUsed(range: number): number {
  const normalized = range >>> 0;
  if (normalized === 0) {
    return 1;
  }
  for (let bit = 32; bit > 0; bit -= 1) {
    if ((normalized & (1 << (bit - 1))) !== 0) {
      return bit;
    }
  }
  return 0;
}
