import { describe, expect, it } from 'vitest';
import { addImages, MAX_IMAGES, moveImage, removeImage, roomFor, sameImages, type ImageRef } from './images';

const ref = (id: string): ImageRef => ({ id, url: `https://example.test/${id}` });
const ids = (images: readonly ImageRef[]) => images.map((image) => image.id);

describe('addImages', () => {
  it('appends in the order they were uploaded', () => {
    expect(ids(addImages([ref('a')], [ref('b'), ref('c')]))).toEqual(['a', 'b', 'c']);
  });

  it('ignores an id already in the list', () => {
    expect(ids(addImages([ref('a')], [ref('a'), ref('b')]))).toEqual(['a', 'b']);
  });

  it('stops at the cap and keeps the earliest of the batch', () => {
    const full = Array.from({ length: MAX_IMAGES - 1 }, (_, index) => ref(`f${index}`));
    expect(ids(addImages(full, [ref('x'), ref('y')]))).toHaveLength(MAX_IMAGES);
    expect(ids(addImages(full, [ref('x'), ref('y')])).at(-1)).toBe('x');
  });

  it('reports the room left', () => {
    expect(roomFor([ref('a')], 3)).toBe(2);
    expect(roomFor([ref('a'), ref('b'), ref('c')], 3)).toBe(0);
    expect(roomFor([ref('a'), ref('b'), ref('c'), ref('d')], 3)).toBe(0);
  });
});

describe('moveImage', () => {
  const list = [ref('a'), ref('b'), ref('c')];

  it('promotes a photo to first — the one the assistant sends', () => {
    expect(ids(moveImage(list, 2, 0))).toEqual(['c', 'a', 'b']);
  });

  it('moves forward without dropping anything', () => {
    expect(ids(moveImage(list, 0, 2))).toEqual(['b', 'c', 'a']);
  });

  it('is a no-op off either end rather than a throw', () => {
    expect(ids(moveImage(list, 0, -1))).toEqual(['a', 'b', 'c']);
    expect(ids(moveImage(list, 2, 3))).toEqual(['a', 'b', 'c']);
    expect(ids(moveImage(list, 1, 1))).toEqual(['a', 'b', 'c']);
  });

  it('never mutates the list it was given', () => {
    moveImage(list, 0, 2);
    expect(ids(list)).toEqual(['a', 'b', 'c']);
  });
});

describe('removeImage', () => {
  it('drops one and leaves the rest in order', () => {
    expect(ids(removeImage([ref('a'), ref('b'), ref('c')], 'b'))).toEqual(['a', 'c']);
  });
});

describe('sameImages', () => {
  it('is order-sensitive, because the order is the meaning', () => {
    expect(sameImages([ref('a'), ref('b')], [ref('a'), ref('b')])).toBe(true);
    expect(sameImages([ref('a'), ref('b')], [ref('b'), ref('a')])).toBe(false);
    expect(sameImages([ref('a')], [ref('a'), ref('b')])).toBe(false);
  });

  it('compares ids, not URLs — a re-read gives the same file a fresh signed URL', () => {
    expect(sameImages([{ id: 'a', url: 'one' }], [{ id: 'a', url: 'two' }])).toBe(true);
  });
});
