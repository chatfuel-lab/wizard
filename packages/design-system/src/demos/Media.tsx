import { useState } from 'react';
import { AttachmentGallery, Button, IconExternal, MediaGrid, type GalleryItem, type MediaGridItem } from '~ui';
import { Demo, Note } from './shared';

/** A flat colour, as a data URI — the gallery needs pictures and this file may not fetch any. */
const swatch = (hue: number): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="hsl(${hue} 55% 62%)"/></svg>`,
  )}`;

const GALLERY: GalleryItem[] = [
  { id: 'g1', kind: 'image', url: swatch(210), name: 'Roastery, morning' },
  { id: 'g2', kind: 'image', url: swatch(160), name: 'Bags landed' },
  { id: 'g3', kind: 'image', url: swatch(30), name: 'The grinder' },
  { id: 'g4', kind: 'image', url: swatch(320), name: 'Saturday queue' },
  { id: 'g5', kind: 'image', url: swatch(90), name: 'Fifth, folded away' },
  { id: 'g6', kind: 'document', url: '#', name: 'Price list.pdf', meta: '84 KB' },
  { id: 'g7', kind: 'audio', url: '#', name: 'Voice note', meta: '0:14' },
  { id: 'g8', kind: 'image', url: '#', name: 'Expired', gone: true, goneReason: 'No longer available' },
];

const TILES: MediaGridItem[] = [
  { id: 'm1', previewUrl: swatch(210), badge: 'Reel', label: 'Pulling the new Ethiopian' },
  { id: 'm2', previewUrl: swatch(160), label: 'Bags landed this morning' },
  { id: 'm3', previewUrl: swatch(30), badge: 'Story' },
  { id: 'm4', previewUrl: swatch(320), label: 'Two rooms, one grinder' },
  { id: 'm5', previewUrl: swatch(90), badge: 'Reel' },
  { id: 'm6', previewUrl: null, unknown: true, label: 'Could not be read' },
];

export function MediaSection() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(['m2']));

  const toggle = (item: MediaGridItem) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });

  return (
    <div className="grid gap-6">
      <Demo name="MediaGrid" tokens="--radius-card · --color-accent">
        <Note>
          Every tile is a button, a missing picture is a state rather than a broken glyph, and the end of the list is an
          observer rather than a scroll handler. Selection is not a mode: hand it a set and it draws checkmarks, leave
          it out and a click means open.
        </Note>
        <MediaGrid
          aria-label="Media"
          items={TILES}
          selected={selected}
          onToggle={toggle}
          actions={(item) => (
            <Button size="xs" variant="secondary" iconOnly aria-label={`Open ${item.id}`}>
              <IconExternal />
            </Button>
          )}
        />
        <div className="mt-6">
          <MediaGrid aria-label="Media, loading" items={[]} loading aspect="portrait" />
        </div>
      </Demo>

      <Demo name="AttachmentGallery" tokens="--radius-card · --color-scrim">
        <Note>
          Pictures as pictures, everything else as a tile — the two are read differently. Past the limit the images fold
          into a “+N” on the last one instead of turning an answer into a scroll of photographs.
        </Note>
        <div className="max-w-md">
          <AttachmentGallery items={GALLERY} onOpen={() => undefined} />
        </div>
      </Demo>
    </div>
  );
}
