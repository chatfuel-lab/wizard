/**
 * The photos a catalog item carries, as pure list edits.
 *
 * The wire takes FileIDs and the read returns File objects, so an editor holds
 * `{ id, url? }` and the input is `images.map((image) => image.id)`.
 *
 * ORDER is the whole reason this file exists. The first photo is the one the
 * assistant sends when a customer asks to see something, so it is a real
 * editorial decision — and an earlier version of this module could only
 * APPEND: a photo uploaded in the wrong order could never be promoted without
 * deleting every one after it and uploading them again.
 */
export interface ImageRef {
  id: string;
  /** Absent until the read comes back — an upload answers with the id and, usually, a URL. */
  url?: string;
}

/** The server refuses past its own limit (`GoodsProductImagesTooMuch`); this is the number the UI stops at. */
export const MAX_IMAGES = 10;

export const roomFor = (images: readonly ImageRef[], max: number = MAX_IMAGES): number =>
  Math.max(0, max - images.length);

/**
 * Append what was just uploaded, ignoring ids already in the list and
 * anything past the cap. Two uploads of the same file answer with the same
 * FileID, and a duplicate would render twice and be sent twice.
 */
export function addImages(
  images: readonly ImageRef[],
  uploaded: readonly ImageRef[],
  max: number = MAX_IMAGES,
): ImageRef[] {
  const seen = new Set(images.map((image) => image.id));
  const next = [...images];
  for (const image of uploaded) {
    if (next.length >= max) break;
    if (seen.has(image.id)) continue;
    seen.add(image.id);
    next.push(image);
  }
  return next;
}

export const removeImage = (images: readonly ImageRef[], id: string): ImageRef[] =>
  images.filter((image) => image.id !== id);

/**
 * Move one photo to another position. Out-of-range indices return the list
 * unchanged rather than throwing: the callers are a drag and two arrow
 * buttons, and "the first one cannot go further left" is a no-op, not an error.
 */
export function moveImage(images: readonly ImageRef[], from: number, to: number): ImageRef[] {
  if (from === to) return [...images];
  if (from < 0 || from >= images.length || to < 0 || to >= images.length) return [...images];
  const next = [...images];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

/** Same photos in the same order — what a dirty check asks. */
export const sameImages = (a: readonly ImageRef[], b: readonly ImageRef[]): boolean =>
  a.length === b.length && a.every((image, index) => image.id === b[index]?.id);
