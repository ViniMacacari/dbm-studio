export class BitReader {
  private byteOffset: number;
  private currentByte = 0;
  private bitOffset = 0;

  constructor(private readonly buffer: Buffer, startOffset = 0) {
    this.byteOffset = startOffset;
  }

  readBitsLE(depth: number): number {
    let value = 0;
    let written = 0;

    if (this.bitOffset !== 0) {
      const available = 8 - this.bitOffset;
      const take = Math.min(available, depth);
      const mask = (1 << take) - 1;
      value |= ((this.currentByte >> this.bitOffset) & mask) << written;
      this.bitOffset = (this.bitOffset + take) & 7;
      written += take;
      if (this.bitOffset === 0) {
        this.currentByte = 0;
      }
    }

    while (written < depth) {
      if (this.byteOffset >= this.buffer.length) {
        throw new Error("Unexpected end of database file while reading bit-packed value.");
      }
      this.currentByte = this.buffer[this.byteOffset];
      this.byteOffset += 1;
      const take = Math.min(8, depth - written);
      const mask = (1 << take) - 1;
      value |= (this.currentByte & mask) << written;
      written += take;
      this.bitOffset = take & 7;
      if (this.bitOffset === 0) {
        this.currentByte = 0;
      }
    }

    return value >>> 0;
  }

  alignByte(): void {
    if (this.bitOffset !== 0) {
      this.bitOffset = 0;
      this.currentByte = 0;
    }
  }

  readFloatLE(): number {
    this.alignByte();
    if (this.byteOffset + 4 > this.buffer.length) {
      throw new Error("Unexpected end of database file while reading float value.");
    }
    const value = this.buffer.readFloatLE(this.byteOffset);
    this.byteOffset += 4;
    return value;
  }

  readBytes(length: number): Buffer {
    this.alignByte();
    if (this.byteOffset + length > this.buffer.length) {
      throw new Error("Unexpected end of database file while reading bytes.");
    }
    const value = this.buffer.subarray(this.byteOffset, this.byteOffset + length);
    this.byteOffset += length;
    return value;
  }
}
