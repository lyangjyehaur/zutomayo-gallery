import sharp from "sharp";

export interface WatermarkOptions {
  type: "text" | "image";
  // Text watermark options
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  // Image watermark options
  imageBuffer?: Buffer;
  // Common options
  opacity?: number;
  rotation?: number;
  tile?: boolean;
  offsetX?: number;
  offsetY?: number;
  gravity?: sharp.Gravity;
}

export class ImageProcessor {
  /**
   * Add a watermark to an image buffer
   */
  static async addWatermark(
    sourceBuffer: Buffer,
    options: WatermarkOptions,
  ): Promise<Buffer> {
    const sourceImage = sharp(sourceBuffer);
    const metadata = await sourceImage.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    let watermarkBuffer: Buffer;

    if (options.type === "text") {
      if (!options.text) {
        throw new Error("Text watermark requires a text string.");
      }

      const fontSize = options.fontSize || Math.max(24, Math.floor(width / 20));
      const color = options.color || "rgba(255, 255, 255, 0.5)";
      const fontFamily = options.fontFamily || "sans-serif";

      // Generate SVG for text
      const svgText = `
        <svg width="${width}" height="${height}">
          <style>
            .title { fill: ${color}; font-size: ${fontSize}px; font-family: ${fontFamily}; }
          </style>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="title">${options.text}</text>
        </svg>
      `;
      watermarkBuffer = Buffer.from(svgText);
    } else {
      if (!options.imageBuffer) {
        throw new Error("Image watermark requires an image buffer.");
      }
      watermarkBuffer = options.imageBuffer;
    }

    // Apply rotation and opacity to the watermark if needed
    let watermarkImage = sharp(watermarkBuffer);

    if (options.rotation) {
      watermarkImage = watermarkImage.rotate(options.rotation, {
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    }

    if (
      options.opacity !== undefined &&
      options.opacity >= 0 &&
      options.opacity < 1
    ) {
      // In sharp, opacity of images can be adjusted via a composite operation or ensuring the image buffer has an alpha channel.
      // A common trick is to use an SVG mask or adjust the alpha channel directly.
      watermarkImage = watermarkImage.ensureAlpha().composite([
        {
          input: Buffer.from([
            255,
            255,
            255,
            Math.round(options.opacity * 255),
          ]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: "dest-in",
        },
      ]);
    }

    const processedWatermarkBuffer = await watermarkImage.toBuffer();

    // Setup composition options
    const compositeOptions: sharp.OverlayOptions = {
      input: processedWatermarkBuffer,
      tile: options.tile || false,
      gravity: options.gravity || "center",
    };

    if (options.offsetX !== undefined || options.offsetY !== undefined) {
      compositeOptions.left = options.offsetX || 0;
      compositeOptions.top = options.offsetY || 0;
      // When specifying left/top, gravity is ignored
      delete compositeOptions.gravity;
    }

    return sourceImage.composite([compositeOptions]).toBuffer();
  }

  /**
   * General image processing (resize, format conversion, etc.)
   */
  static async process(
    sourceBuffer: Buffer,
    options: {
      width?: number;
      height?: number;
      format?: keyof sharp.FormatEnum;
      quality?: number;
      rotation?: number;
    },
  ): Promise<Buffer> {
    let image = sharp(sourceBuffer);

    if (options.rotation) {
      image = image.rotate(options.rotation);
    }

    if (options.width || options.height) {
      image = image.resize({
        width: options.width,
        height: options.height,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    if (options.format) {
      image = image.toFormat(options.format, {
        quality: options.quality || 80,
      });
    }

    return image.toBuffer();
  }
}
