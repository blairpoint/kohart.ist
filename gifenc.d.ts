declare module "gifenc" {
  export class GIFEncoder {
    constructor(opts?: any);
    writeFrame(index: Uint8Array, width: number, height: number, opts?: any): void;
    finish(): void;
    bytesView(): Uint8Array;
  }
  export function quantize(rgba: Uint8Array, maxColors: number, opts?: any): any;
  export function applyPalette(rgba: Uint8Array, palette: any, format?: string): Uint8Array;
}
