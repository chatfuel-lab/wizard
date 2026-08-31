import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Dialog, EmptyState, IconImage, MediaGrid, type MediaGridItem } from '~ui';
import { usePublishing } from '../../PublishingContext';
import { useLibraryPicker } from '../../hooks/useLibraryPicker';
import { acceptsOf, fromLibraryNode } from '../../lib/composerDraft';
import { thumbnailOf } from '../../lib/libraryItems';
import type { MediaItem, PostKind } from '../../types';

export interface LibraryPickerDialogProps {
  open: boolean;
  onClose: () => void;
  kind: PostKind;
  /** How many more the post can take. */
  room: number;
  onPick: (items: MediaItem[]) => void;
}

interface Pickable extends MediaGridItem {
  item: MediaItem;
}

const KIND_BADGE: Record<string, string> = {
  InstagramPost: 'Post',
  InstagramReel: 'Reel',
  InstagramStory: 'Story',
  InstagramAd: 'Ad',
};

/**
 * Media already on the account, offered as the source for a new post.
 *
 * Two filters, and both are about offering only what can be picked rather than
 * showing everything and failing later. A Reel takes a video, so photos are not
 * in the list at all; and anything the platform could not resolve, or whose
 * stored bytes have expired, has no address to publish and is left out — a tile
 * with nothing behind it is worse than no tile.
 *
 * What comes back is durable: media on the account carries no deletion deadline,
 * so a post built from it can be given a time and still be there when it goes.
 */
export function LibraryPickerDialog({ open, onClose, kind, room, onPick }: LibraryPickerDialogProps) {
  const { client, botId } = usePublishing();
  const library = useLibraryPicker(client, botId, open);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (open) setChosen(new Set());
  }, [open]);

  const accepts = acceptsOf(kind);
  const items = useMemo<Pickable[]>(() => {
    const out: Pickable[] = [];
    for (const node of library.nodes) {
      const usable = fromLibraryNode(node);
      if (!usable || !accepts.includes(usable.type)) continue;
      out.push({
        id: node.id,
        previewUrl: thumbnailOf(node),
        badge: KIND_BADGE[node.__typename] ?? null,
        alt: node.caption ?? '',
        item: usable,
      });
    }
    return out;
  }, [library.nodes, accepts]);

  const toggle = (candidate: Pickable) => {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(candidate.id)) next.delete(candidate.id);
      else if (room <= 1) return new Set([candidate.id]);
      else if (next.size < room) next.add(candidate.id);
      return next;
    });
  };

  const confirm = () => {
    const picked = items.filter((candidate) => chosen.has(candidate.id)).map((candidate) => candidate.item);
    if (picked.length > 0) onPick(picked);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pick from the library"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirm} disabled={chosen.size === 0}>
            Add {chosen.size > 1 ? `${chosen.size} items` : chosen.size === 1 ? '1 item' : ''}
          </Button>
        </>
      }
    >
      {library.error && items.length === 0 ? (
        <Alert
          tone="danger"
          title="The library could not be read"
          action={
            <Button size="sm" onClick={library.reload}>
              Try again
            </Button>
          }
        >
          {library.error}
        </Alert>
      ) : (
        <MediaGrid
          aria-label="Media on the account"
          items={items}
          selected={chosen}
          onToggle={toggle}
          loading={library.loading && items.length === 0}
          loadingMore={library.loadingMore}
          onEndReached={library.more}
          empty={<EmptyState icon={<IconImage />} title="Nothing here to use" />}
        />
      )}
    </Dialog>
  );
}
