export const PROFILE_PHOTO_SIZE = 512;
export const PROFILE_PHOTO_MAX_BYTES = 256 * 1024;
export const PROFILE_PHOTO_SOURCE_MAX_BYTES = 15 * 1024 * 1024;
export function profilePhotoHref(path?: string | null) {
  return path ? `/account/photo?path=${encodeURIComponent(path)}` : null;
}
export function defaultProfilePhoto(gender?: string | null) {
  const value = gender?.trim().toLowerCase();
  if (["مرد", "male", "man"].includes(value || "")) return "/images/avatar-male.svg";
  if (["زن", "female", "woman"].includes(value || "")) return "/images/avatar-female.svg";
  return "/images/avatar-neutral.svg";
}
export function profileCrop(width: number, height: number, zoom: number, x: number, y: number) {
  const side = Math.min(width, height) / Math.max(1, Math.min(4, zoom));
  const horizontal = (width - side) / 2;
  const vertical = (height - side) / 2;
  return { x: horizontal * (1 + Math.max(-1, Math.min(1, x))), y: vertical * (1 + Math.max(-1, Math.min(1, y))), side };
}
