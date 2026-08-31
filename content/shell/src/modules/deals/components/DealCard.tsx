import { useEffect, type FocusEvent, type KeyboardEvent } from 'react';
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import { Checkbox, ContextMenu, type MenuItem } from '~ui';
import { FLASH_MS } from '../lib/constants';
import type { DealFieldBindings } from '../lib/dealFieldBinding';
import { isRestricted } from '../lib/dragPayload';
import type { Density } from '../lib/layout';
import { STAGE_KEY_HINT } from '../lib/stageKeys';
import type { DealCard as DealCardType } from '../types';
import { DealCardBody } from './DealCardBody';

/**
 * Everything the board hands every card. One object, because a card takes a
 * dozen things and all but three are identical for all of them.
 */
export interface BoardChrome {
  density: Density;
  canEdit: boolean;
  bindings: DealFieldBindings;
  now: number;
  anySelected: boolean;
  /** The one card that carries the board's tab stop. */
  focusedId: string | null;
  draggableProps: (id: string, card: DealCardType) => Record<string, unknown>;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSetStage: (card: DealCardType, to: SalesStageV2) => void;
  onFlashDone: (id: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>, card: DealCardType) => void;
  onCardFocus: (id: string) => void;
  onCardBlur: (event: { relatedTarget: EventTarget | null }) => void;
  registerCard: (id: string) => (node: HTMLElement | null) => void;
  /** Right-click items, built per card because half of them name it. */
  menuItems: (card: DealCardType) => MenuItem[];
  /** True while the click that follows a drag's pointerup should be ignored. */
  suppressClick: () => boolean;
}

export interface DealCardProps {
  card: DealCardType;
  chrome: BoardChrome;
  selected: boolean;
  dragging: boolean;
  /** Timestamp of a rollback, or undefined. */
  flashAt: number | undefined;
}

/**
 * A kanban card.
 *
 * The stage `<Select>` that used to live here is gone, and `1`–`6` replaces it:
 * a select does not fit a 32px compact card, and a pointerdown on a native
 * `<select>` inside a drag target bubbles up and starts a drag with the dropdown
 * open. `DealPanel` still carries a stage control, so `Enter` is a second
 * non-pointer route even if a key is missed.
 *
 * The card is one of six tab stops on the board, not one of a hundred and
 * twenty: `useBoardKeyboard` owns which, and `data-deal-card` is how its blur
 * handler tells "focus moved to another card" from "focus left the board".
 */
export function DealCard({ card, chrome, selected, dragging, flashAt }: DealCardProps) {
  const restricted = isRestricted(card);
  const interactive = chrome.canEdit && !restricted;
  const { onFlashDone } = chrome;

  useEffect(() => {
    if (flashAt === undefined) return;
    const timer = setTimeout(() => onFlashDone(card.id), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flashAt, card.id, onFlashDone]);

  const flashing = flashAt !== undefined;
  const showCheckbox = interactive && (selected || chrome.anySelected);
  const items = interactive ? chrome.menuItems(card) : [];

  return (
    <ContextMenu items={items} aria-label={`${card.name || 'Deal'} actions`}>
      {({ onContextMenu }) => (
        <div
          ref={chrome.registerCard(card.id)}
          data-deal-card="true"
          data-deal-id={card.id}
          role="listitem"
          tabIndex={chrome.focusedId === card.id ? 0 : -1}
          aria-label={`${card.name || 'Unnamed'}, ${card.salesStageV2 ?? 'no stage'}`}
          aria-keyshortcuts={interactive ? '1 2 3 4 5 6 [ ]' : undefined}
          title={interactive ? STAGE_KEY_HINT : undefined}
          aria-selected={interactive ? selected : undefined}
          onKeyDown={(event) => chrome.onKeyDown(event, card)}
          onFocus={() => chrome.onCardFocus(card.id)}
          onBlur={(event: FocusEvent<HTMLElement>) => chrome.onCardBlur(event)}
          onContextMenu={onContextMenu}
          onClick={() => {
            if (chrome.suppressClick()) return;
            chrome.onOpen(card.id);
          }}
          {...(interactive ? chrome.draggableProps(card.id, card) : {})}
          className={[
            'focus-visible:focus-ring group relative rounded-card border bg-surface-raised transition-colors',
            // A colour change rather than a keyframe: correct under reduced motion
            // by construction, and `tokens.css` cannot gain an animation from here.
            flashing ? 'border-danger bg-danger-soft' : 'border-border',
            selected ? 'ring-2 ring-accent' : '',
            dragging ? 'opacity-40' : '',
            restricted ? 'cursor-default' : 'cursor-pointer',
            interactive && !dragging ? 'hover:border-border-strong' : '',
          ].join(' ')}
        >
          {showCheckbox ? (
            <span
              className="absolute right-1.5 top-1.5 z-10"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Checkbox
                checked={selected}
                onChange={() => chrome.onToggleSelect(card.id)}
                aria-label={`Select ${card.name || 'deal'}`}
              />
            </span>
          ) : null}
          <DealCardBody
            card={card}
            bindings={chrome.bindings}
            density={chrome.density}
            now={chrome.now}
            dragging={dragging}
          />
        </div>
      )}
    </ContextMenu>
  );
}
