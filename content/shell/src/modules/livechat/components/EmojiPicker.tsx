import { useMemo, useState } from 'react';
import { Button, Input, Popover } from '~ui';
import { EMOJI_GROUPS, searchEmoji, type EmojiEntry } from '../lib/emoji';

export interface EmojiPickerProps {
  disabled?: boolean;
  /** The character, to be inserted at the caret. */
  onPick: (char: string) => void;
}

const cell =
  'flex h-8 w-8 items-center justify-center rounded-control text-base leading-none transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-surface-hover';

function Grid({ emoji, onPick }: { emoji: readonly EmojiEntry[]; onPick: (char: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-0.5">
      {emoji.map((entry) => (
        <button
          key={entry.char}
          type="button"
          onClick={() => onPick(entry.char)}
          /* The name, not the character. A screen reader announcing the raw
             emoji reads whatever its own table says, which for the flag and
             gesture blocks is frequently nothing at all. */
          aria-label={entry.name}
          title={entry.name}
          className={cell}
        >
          {entry.char}
        </button>
      ))}
    </div>
  );
}

/**
 * The composer's emoji picker, in its `leftSlot`.
 *
 * Stays open after a pick. Emoji arrive in twos and threes far more often than
 * singly, and a panel that closes on every one turns "👍🎉" into two round
 * trips through the button.
 */
export function EmojiPicker({ disabled, onPick }: EmojiPickerProps) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => (query.trim() === '' ? null : searchEmoji(query)), [query]);

  return (
    <Popover
      aria-label="Emoji"
      placement="top-start"
      onOpenChange={(open) => {
        if (!open) setQuery('');
      }}
      className="w-72"
      trigger={(props) => (
        <Button
          {...props}
          iconOnly
          variant="ghost"
          disabled={disabled}
          aria-label="Insert an emoji"
          className="text-base leading-none"
        >
          <span aria-hidden>🙂</span>
        </Button>
      )}
    >
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search emoji"
        aria-label="Search emoji"
        className="mb-2"
      />
      <div className="max-h-64 overflow-y-auto">
        {results ? (
          results.length === 0 ? (
            <p className="py-4 text-center text-meta text-text-muted">Nothing matches.</p>
          ) : (
            <Grid emoji={results} onPick={onPick} />
          )
        ) : (
          EMOJI_GROUPS.map((group) => (
            <section key={group.name} className="mb-2 last:mb-0">
              <h3 className="mb-1 text-nano font-medium uppercase tracking-wide text-text-faint">{group.name}</h3>
              <Grid emoji={group.emoji} onPick={onPick} />
            </section>
          ))
        )}
      </div>
    </Popover>
  );
}
