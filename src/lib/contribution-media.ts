
import sharp from "sharp";
export const MAX_PHOTOS = 4;
export const MAX_REQUEST_BYTES = 45 * 1024 * 1024;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MIME = new Set(["image/jpeg","image/png","image/webp","image/avif"]);
export async function processContributionPhotos(inputs: FormDataEntryValue[]): Promise<Buffer[]> {
  if (inputs.length > MAX_PHOTOS) throw new Error("TOO_MANY_PHOTOS");
  const photos: Buffer[] = [];
  for (const input of inputs) {
    if (!(input instanceof File) || !MIME.has(input.type) ||
      !input.size || input.size > MAX_PHOTO_BYTES) throw new Error("INVALID_IMAGE");
    try {
      const processed = await sharp(Buffer.from(await input.arrayBuffer()), {limitInputPixels: 40_000_000})
        .rotate().resize({width:1600,height:1200,fit:"inside",withoutEnlargement:true})
        .webp({quality:80}).toBuffer();
      if (!processed.length) throw new Error("INVALID_IMAGE");
      photos.push(processed);
    } catch { throw new Error("INVALID_IMAGE"); }
  }
  return photos;
}
