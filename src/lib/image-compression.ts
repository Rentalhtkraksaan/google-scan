/**
 * Utility to compress images in browser before uploading
 * Converts image to WebP/JPEG format with max dimensions and quality compression
 */
export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: "base64" | "blob" | "both";
}

export async function compressImageInBrowser(
  file: File | Blob,
  optionsOrMaxWidth: number | CompressImageOptions = 400,
  maxHeightParam: number = 400,
  qualityParam: number = 0.85
): Promise<{ base64: string; blob: Blob }> {
  let maxWidth = 400;
  let maxHeight = 400;
  let quality = 0.85;

  if (typeof optionsOrMaxWidth === "object" && optionsOrMaxWidth !== null) {
    maxWidth = optionsOrMaxWidth.maxWidth ?? 400;
    maxHeight = optionsOrMaxWidth.maxHeight ?? 400;
    quality = optionsOrMaxWidth.quality ?? 0.85;
  } else if (typeof optionsOrMaxWidth === "number") {
    maxWidth = optionsOrMaxWidth;
    maxHeight = maxHeightParam;
    quality = qualityParam;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve({
            base64: event.target?.result as string,
            blob: file as Blob,
          });
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try webp first, fallback to jpeg/png
        const base64 = canvas.toDataURL("image/webp", quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ base64, blob });
            } else {
              resolve({ base64, blob: file as Blob });
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
