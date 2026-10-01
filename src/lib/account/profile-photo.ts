import sharp from "sharp";
import { PROFILE_PHOTO_MAX_BYTES, PROFILE_PHOTO_SIZE } from "../profile-photo";
/** Decode and re-encode before storage; do not trust client-side image processing. */
export async function normalizeProfilePhoto(input: Uint8Array) {
  try {
    const image = sharp(input, { limitInputPixels: 40_000_000, animated: false, failOn: "error" })
      .rotate().resize(PROFILE_PHOTO_SIZE, PROFILE_PHOTO_SIZE, { fit: "cover" });
    for (const quality of [82, 70, 58]) {
      const buffer = await image.clone().webp({ quality, effort: 4 }).toBuffer();
      if (buffer.length <= PROFILE_PHOTO_MAX_BYTES) return new Uint8Array(buffer);
    }
    throw new Error("image too large");
  } catch {
    throw new Error("این تصویر قابل پردازش نیست. یک عکس JPG، PNG یا WebP دیگر انتخاب کنید.");
  }
}
