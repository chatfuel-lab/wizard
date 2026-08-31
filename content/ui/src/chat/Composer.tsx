import {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { IconPaperclip, IconPlus, IconSend, IconStop } from '../icons';
import { Popover } from '../floating/Popover';
import { Button } from '../primitives/Button';
import { canSend, insertText, nextComposerHeight } from '../lib/chat/composer';

/**
 * What the composer lets the outside do to its draft.
 *
 * The composer is uncontrolled and stays that way — a controlled draft would
 * re-render the caller on every keystroke for no reason it can use — but an
 * emoji picker or a saved-replies menu standing beside it has to be able to put
 * text in. This is the one door for that. It is a ref and not a prop because
 * an insertion is an event, not a state: "the draft is now X" is the wrong
 * shape for "add this here".
 */
export interface ComposerApi {
  /**
   * Put text at the caret, replacing any selection, and leave the caret just
   * after it. The textarea keeps its selection while unfocused, so this reads
   * the position the operator left even though the picker's button has focus.
   */
  insert: (text: string) => void;
  focus: () => void;
}

export interface ComposerProps {
  onSend: (text: string) => void | Promise<void>;
  /** No Inbox: Edit permission, conversation closed, … */
  disabled?: boolean;
  /**
   * Why it is disabled, in a line under the box.
   *
   * Under the box and NOWHERE ELSE. It used to also stand in as the
   * placeholder, which printed the same sentence twice, four pixels apart, in
   * two different greys — the coworker's "Pick a chat, or start a new one, to
   * write to the assistant." read as a rendering bug rather than as guidance.
   * A placeholder says what the box is FOR and is a fine thing to keep saying
   * while the box is shut; the reason is a different sentence and it belongs in
   * the one place that survives the operator starting to type.
   */
  disabledHint?: string;
  placeholder?: string;
  /** Anything to the left of the input. The attach button renders after it. */
  leftSlot?: ReactNode;
  /**
   * Fold `leftSlot` behind one "+" button that opens it in a popover.
   *
   * For the narrow band: on a 360px thread four icons in the slot plus the
   * attach and send buttons leave the textarea a few characters wide. The
   * module says when — it knows its band, and `~ui` does not measure — and the
   * composer only knows how. `ref.insert` keeps working from inside the
   * popover: the textarea holds its selection while unfocused, so a picker in
   * the popover puts text exactly where the caret was, and the popover stays
   * open for the next pick.
   */
  compact?: boolean;

  /**
   * Files chosen from the attach button. Its presence is what renders the
   * button at all — a channel that cannot take attachments simply does not
   * pass a handler, rather than passing a flag that disables a control nobody
   * can use.
   */
  onAttach?: (files: File[]) => void;
  /** `accept` for the file input, e.g. 'image/*'. Platform-specific. */
  accept?: string;
  multiple?: boolean;
  /**
   * The staged files, rendered above the input row — AttachmentTiles, usually.
   * The composer does not own them: an upload starts the moment a file is
   * picked, has its own progress and can fail, and all of that outlives any
   * text in the box.
   */
  attachments?: ReactNode;
  /** How many are staged. A message can be attachments and no text at all. */
  attachmentCount?: number;
  /** A send is already in flight, or an upload has not finished. Button only. */
  sending?: boolean;
  /**
   * There is a run to interrupt, and this is how.
   *
   * Its presence REPLACES the send button with a stop button, in place — the
   * same square, the same corner. That is deliberate and it is the third state
   * of one control rather than a fourth control: while the assistant's agent
   * loop is running there is exactly one thing worth doing, and a stop button
   * added beside a greyed-out send is two controls where the useful one is the
   * new and smaller half of the pair.
   *
   * It stays live through `sending` and through `disabled`, which is the whole
   * point — a run in flight is precisely when the composer is busy, and
   * somebody who has lost permission to write can still want the thing they
   * started to end. Only `stopping` takes it out of service, because by then
   * the request has been made and clicking again asks for nothing.
   *
   * Enter sends nothing while this is set. The reason is not that Enter is
   * unsafe: it is that Enter is muscle memory, and a draft sent into a running
   * loop is an implicit rejection of whatever the assistant was about to ask
   * for approval on. The text stays in the box.
   */
  onStop?: () => void;
  /** The stop has been asked for and the run has not ended yet. */
  stopping?: boolean;
  /** Ceiling for the growing textarea, px. Defaults to its own CSS max-height. */
  maxHeight?: number;
  /** `insert` and `focus` — see `ComposerApi`. */
  ref?: Ref<ComposerApi>;
  className?: string;
}

/**
 * Uncontrolled: owns its input state; Enter sends, Shift+Enter adds a newline.
 * The one way in from outside is `ref.insert` — see `ComposerApi`.
 *
 * Two states that look the same and are not. `disabled` means the composer is
 * unavailable — no permission, the 24-hour window has closed — and greys the
 * whole surface with a reason under it. `sending` means the composer is fine
 * and the button is momentarily not, which greys only the button. Collapsing
 * them into one prop is why a composer with an upload in flight so often
 * reads as "you are not allowed to write here".
 *
 * A third, for the assistant: `onStop` turns the send button INTO a stop
 * button while a run is in flight. `coworkerConversationStopStreaming` is the
 * only way to interrupt an agent loop, so that control has to be reachable, and
 * the corner the eye already goes to is the one place it will be found. See the
 * prop for why it is a replacement rather than a second button, and why it
 * survives `disabled`.
 */
export function Composer({
  onSend,
  disabled,
  disabledHint,
  placeholder = 'Type a message…',
  leftSlot,
  compact = false,
  onAttach,
  accept,
  multiple = true,
  attachments,
  attachmentCount = 0,
  sending = false,
  onStop,
  stopping = false,
  maxHeight,
  ref,
  className = '',
}: ComposerProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sendable = canSend({ text: value, attachmentCount, disabled, sending });

  /* Where the caret should be once React has written the new value.
   *
   * It cannot be set in `insert` itself: at that moment the textarea still
   * holds the old text, and a caret placed past its end is clamped to the end,
   * then left there when the longer value lands. So the position is parked and
   * applied in a layout effect keyed on `value` — after the DOM has the text
   * and before the frame paints, so the caret is never seen anywhere else. */
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    if (caret === null) return;
    pendingCaret.current = null;
    const element = textareaRef.current;
    if (!element) return;
    element.focus();
    element.setSelectionRange(caret, caret);
  }, [value]);

  useImperativeHandle(
    ref,
    () => ({
      insert: (text) => {
        const element = textareaRef.current;
        if (!element) return;
        const next = insertText(element.value, element.selectionStart, element.selectionEnd, text);
        if (next.value === element.value) {
          /* Nothing to re-render, so the effect above would not run — and a
             parked caret would then be applied on the NEXT keystroke, moving
             the cursor out from under it. Place it now instead. */
          element.focus();
          element.setSelectionRange(next.caret, next.caret);
          return;
        }
        pendingCaret.current = next.caret;
        setValue(next.value);
      },
      focus: () => textareaRef.current?.focus(),
    }),
    [],
  );

  /* Grow with the content up to a ceiling, then scroll.
   *
   * The reset to 'auto' is the whole trick: scrollHeight can never report less
   * than the height already set, so measuring without it produces a box that
   * grows and never shrinks again — the classic three-empty-lines composer.
   *
   * Both bounds are read back from the element's own computed style rather
   * than hardcoded, so `min-h-9` / `max-h-32` below stay the single source of
   * truth and a caller restyling them through className is respected. */
  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    const style = getComputedStyle(element);
    const ceiling = maxHeight ?? Number.parseFloat(style.maxHeight);
    element.style.height = `${nextComposerHeight(element.scrollHeight, Number.parseFloat(style.minHeight), ceiling)}px`;
  }, [value, maxHeight, attachments]);

  const submit = () => {
    /* A run is in flight: there is a stop button where send used to be, so
       there is no send to perform — including from Enter. */
    if (onStop) return;
    if (!sendable) return;
    const text = value.trim();
    setValue('');
    void onSend(text);
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onAttach?.(files);
    /* Clearing the input is not tidiness: without it, picking the same file
       twice in a row fires no change event at all, because the value did not
       change — which reads to the operator as the attach button being broken. */
    e.target.value = '';
  };

  return (
    /* One box, not a toolbar.
     *
     * This used to be a row: two or three icon buttons, then a bordered
     * textarea, then a coloured send button, all laid along one line on a bar.
     * That reads as a form — five controls of five different shapes competing
     * for the same axis — and it is the most-looked-at element in any chat
     * product. Every assistant worth the comparison draws it as ONE rounded
     * field with the writing surface on top and its controls tucked along the
     * bottom inside it, and they all do it for the same reason: it makes the
     * thing you type into the object, and the buttons its trim.
     *
     * The border belongs to the box and lights on focus-within, so focus is
     * legible without drawing a ring inside a ring.
     */
    <div className={`bg-surface px-3 pb-3 pt-2 ${className ?? ''}`}>
      {attachments ? <div className="mb-2 flex flex-wrap gap-2">{attachments}</div> : null}

      <div className="flex flex-col rounded-bubble border border-border bg-surface-raised shadow-raised transition-colors duration-fast ease-standard focus-within:border-accent">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          /* No border and no focus ring of its own — the box carries both, and
             `bg-transparent` so the field IS the box rather than a panel in it. */
          className="max-h-32 min-h-8 w-full resize-none bg-transparent px-3.5 pt-2.5 text-body text-text outline-none placeholder:text-text-faint disabled:cursor-not-allowed disabled:text-text-faint"
        />

        <div className="flex items-center gap-1 px-2 pb-1.5 pt-1">
          {leftSlot === undefined || leftSlot === null ? null : compact ? (
            <Popover
              placement="top-start"
              aria-label="More"
              /* Not greyed with the composer: the slot's own controls decide,
                 and one of them — a template, the message that can still go
                 when the window has shut the box — is exactly the control that
                 must stay reachable while everything else is disabled. */
              trigger={(props) => (
                <Button {...props} iconOnly variant="ghost" size="sm" aria-label="More">
                  <IconPlus />
                </Button>
              )}
            >
              {/* The slot's own row, laid out as it would have been beside the
                  textarea: the pickers inside it are popovers themselves, and
                  they open above this one — the layer stack keeps this one open
                  under them. */}
              <div className="flex items-center gap-1">{leftSlot}</div>
            </Popover>
          ) : (
            leftSlot
          )}

          {onAttach ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={onFiles}
                className="hidden"
                tabIndex={-1}
                aria-hidden
              />
              <Button
                iconOnly
                variant="ghost"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={disabled}
                aria-label="Attach a file"
              >
                <IconPaperclip />
              </Button>
            </>
          ) : null}

          <div className="ml-auto flex items-center gap-1">
            {onStop ? (
              <button
                type="button"
                onClick={onStop}
                /* Not `disabled || sending` — see the prop. The only thing that
                   takes it out of service is having already been used. */
                disabled={stopping}
                aria-label={stopping ? 'Stopping' : 'Stop'}
                className="flex aspect-square h-field-sm shrink-0 items-center justify-center rounded-control bg-surface-sunken text-text transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-surface-hover disabled:cursor-not-allowed disabled:text-text-faint"
              >
                <IconStop size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!sendable}
                aria-label="Send"
                className="flex aspect-square h-field-sm shrink-0 items-center justify-center rounded-control bg-accent text-accent-fg transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-faint"
              >
                <IconSend size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {disabled && disabledHint ? <div className="mt-1.5 px-1 text-meta text-text-muted">{disabledHint}</div> : null}
    </div>
  );
}
