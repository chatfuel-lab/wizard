import { useMemo, type RefObject } from 'react';
import { Button, CanvasPalette, Dialog, Drawer, Select, type CanvasPaletteItem } from '~ui';
import type { TemplatePrompt } from '../hooks/usePlaceBlock';
import { paletteEntries } from '../lib/blockPalette';
import type { FlowT } from '../types';
import { glyphIcon } from './BlockGlyph';

export interface BlockPaletteProps {
  flow: FlowT;
  /** The armed family, or null. Owned by the canvas: an armed click lands there. */
  armed: string | null;
  onArmedChange: (id: string | null) => void;
  /** An item dragged out and released over canvas background, in client coordinates. */
  onDrop: (id: string, client: { x: number; y: number }) => void;
  /**
   * `island` floats in the canvas chrome; `sheet` is the bottom Drawer the
   * compact band gets instead. The sheet has no drag — a modal's scrim covers
   * the canvas, so a release could never land on it — and picking an item
   * arms it and closes the sheet, so the next tap on the canvas is the place.
   */
  variant: 'island' | 'sheet';
  open?: boolean;
  onClose?: () => void;
  /** Wraps the island so the canvas can find and focus its search box. */
  containerRef?: RefObject<HTMLDivElement | null>;
}

/**
 * The block families this flow can host, as the design system's insert
 * palette — the header `<Select>` this replaces sat four hundred pixels from
 * where the block would land and put it at the viewport centre. Everything
 * about WHAT is offered and how it reads is `lib/blockPalette`; this file only
 * turns glyph ids into icons and chooses which surface to stand on.
 */
export function BlockPalette({
  flow,
  armed,
  onArmedChange,
  onDrop,
  variant,
  open = false,
  onClose,
  containerRef,
}: BlockPaletteProps) {
  const items = useMemo<CanvasPaletteItem[]>(
    () =>
      paletteEntries(flow).map((entry) => ({
        id: entry.id,
        label: entry.label,
        icon: glyphIcon(entry.glyph),
        group: entry.group,
        keywords: entry.keywords,
        note: entry.note,
      })),
    [flow],
  );

  if (variant === 'sheet') {
    return (
      <Drawer open={open} onClose={onClose ?? (() => undefined)} title="Add a block" side="bottom">
        <CanvasPalette
          items={items}
          value={armed}
          onChange={(id) => {
            onArmedChange(id);
            if (id) onClose?.();
          }}
          maxHeight={320}
          className="w-full"
          aria-label="Block families"
        />
      </Drawer>
    );
  }

  return (
    <div ref={containerRef}>
      <CanvasPalette
        items={items}
        value={armed}
        onChange={onArmedChange}
        onDrop={onDrop}
        maxHeight={264}
        className="w-56"
        aria-label="Block families"
      />
    </div>
  );
}

/**
 * The aiAgent family's second question. A dialog and not a second palette row,
 * because the catalog is fetched on demand and can fail, and the palette has
 * nowhere to say so.
 */
export function TemplatePromptDialog({
  prompt,
  pending,
  onChoose,
  onDismiss,
}: {
  prompt: TemplatePrompt | null;
  pending: boolean;
  onChoose: (templateID: string) => void;
  onDismiss: () => void;
}) {
  return (
    <Dialog
      open={prompt !== null}
      onClose={onDismiss}
      title="Which AI agent template?"
      footer={
        <Button variant="secondary" size="sm" onClick={onDismiss}>
          Cancel
        </Button>
      }
    >
      <Select
        value=""
        placeholder="Pick a template…"
        aria-label="AI agent template"
        disabled={pending}
        options={(prompt?.templates ?? []).map((template) => ({
          value: template.id,
          label: template.title,
        }))}
        onChange={onChoose}
      />
    </Dialog>
  );
}
