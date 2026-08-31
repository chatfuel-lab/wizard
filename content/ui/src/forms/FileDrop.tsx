import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { Spinner } from '../primitives/Spinner';

export type FileDropLayout = 'stack' | 'row' | 'tile';

export interface FileDropProps {
  /** Same syntax as the input's: 'image/*', '.csv,.txt'. */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  busy?: boolean;
  /** The bold line inside the zone. */
  label: string;
  /** The quiet line under it: what is accepted, how big, how many. */
  hint?: ReactNode;
  icon?: ReactNode;
  /** Fires for a drop, a picked file and a paste alike — one path for all three. */
  onFiles: (files: File[]) => void;
  /**
   * The caller's own controls inside the zone, handed the file picker to call.
   *
   * Their presence turns the zone from a button into a region, and it has to:
   * a button cannot contain buttons, and a browser given that markup resolves
   * it by dropping one of the two click targets. So where a caller needs
   * controls of its own — a second source, a link to paste — the whole surface
   * stops being the click target and opening the picker becomes one control's
   * job among them. Dropping and pasting still work on the whole surface.
   */
  actions?: (open: () => void) => ReactNode;
  /**
   * `row` puts the icon, the label and the actions on one line.
   *
   * For a zone standing among other controls rather than owning a page: the
   * stacked shape is a target to aim a file at and earns its height, and a row
   * is a control in a form and should cost a control's height.
   *
   * `tile` is the stacked shape with no width and no padding of its own, for a
   * zone standing IN a strip of thumbnails rather than above one. The strip
   * decides how big a slot is, so the caller sizes it — `h-36 w-36` — and the
   * zone fills that square exactly, which is what makes it read as one more
   * slot in the row instead of a separate control parked beside it.
   */
  layout?: FileDropLayout;
  /**
   * Handed this zone's file picker while it is mounted, so a control somewhere
   * else can raise the same one.
   *
   * A toolbar button and a drop tile are two doors into one action, and the
   * alternative is a second hidden `<input type="file">` in the caller — which
   * is the third-best upload every module used to hand-roll. Nulled on unmount,
   * so a stale opener cannot fire at a zone that is gone.
   */
  openRef?: RefObject<(() => void) | null>;
  className?: string;
}

/* Only `tile` withholds `w-full` and a padding: it is sized by its caller, and
   a padding of its own inside a fixed square would push the glyph off-centre. */
const SHAPE: Record<FileDropLayout, string> = {
  stack: 'w-full flex-col items-center justify-center gap-2 px-4 py-6 text-center',
  row: 'w-full items-center gap-3 px-3 py-3 text-left',
  tile: 'flex-col items-center justify-center gap-1.5 px-2 text-center',
};

/**
 * A drop zone that is also a button, and also somewhere you can paste.
 *
 * Three ways in because people arrive three ways: dragging from a folder,
 * clicking because the drag did not register, and pasting a screenshot or a
 * copied file. Every module that wanted an upload before this component built
 * the third-best of those — a hidden `<input>` behind a button — which works
 * with a mouse and is invisible to everyone dragging a file at it.
 *
 * Without `actions` the element is a real `<button>`, so it is in the tab
 * order, announces itself, and opens the picker on Enter and Space with no key
 * handling here. With them it is a region instead, for the reason written on
 * the prop, and one of the caller's controls opens the picker.
 * `dragCounter` and not a boolean: dragging over a CHILD fires `dragleave` on
 * the parent, and a boolean flickers the highlight off on every inner edge.
 */
export function FileDrop({
  accept,
  multiple = false,
  disabled = false,
  busy = false,
  label,
  hint,
  icon,
  onFiles,
  actions,
  layout = 'stack',
  openRef,
  className = '',
}: FileDropProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);
  const [over, setOver] = useState(false);
  const describedBy = useId();

  const emit = useCallback(
    (list: FileList | null) => {
      if (disabled || !list || list.length === 0) return;
      const files = Array.from(list);
      onFiles(multiple ? files : files.slice(0, 1));
    },
    [disabled, multiple, onFiles],
  );

  const open = useCallback(() => {
    if (disabled || busy) return;
    inputRef.current?.click();
  }, [disabled, busy]);

  useEffect(() => {
    if (!openRef) return undefined;
    openRef.current = open;
    return () => {
      openRef.current = null;
    };
  }, [open, openRef]);

  const onDragEnter = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (disabled) return;
    dragCounter.current += 1;
    setOver(true);
  };
  const onDragLeave = () => {
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setOver(false);
  };
  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragCounter.current = 0;
    setOver(false);
    emit(event.dataTransfer?.files ?? null);
  };

  const dropProps = {
    onDragEnter,
    onDragOver: (event: DragEvent<HTMLElement>) => event.preventDefault(),
    onDragLeave,
    onDrop,
    onPaste: (event: ClipboardEvent<HTMLElement>) => emit(event.clipboardData?.files ?? null),
  };

  const row = layout === 'row';
  const tile = layout === 'tile';
  const surface = `flex rounded-card border border-dashed transition-colors duration-fast ease-standard ${
    SHAPE[layout]
  } ${
    over
      ? 'border-accent bg-accent-soft'
      : 'border-border-strong bg-surface-sunken hover:border-accent hover:bg-surface-hover'
  }`;

  /* A tile is small, so its two lines drop to the meta size — at the body size
     "Drag & drop" wraps inside a thumbnail-width square. */
  const labelClass = tile ? 'text-meta font-medium text-text' : 'text-sm font-medium text-text';
  const hintClass = tile ? 'text-meta text-text-muted' : 'text-xs text-text-muted';

  const glyph = busy ? <Spinner size={18} /> : icon ? <span className="shrink-0 text-text-faint">{icon}</span> : null;

  return (
    <>
      {actions ? (
        <div {...dropProps} className={`${surface} ${disabled ? 'opacity-60' : ''} ${className}`}>
          {glyph}
          <span className={row ? 'min-w-0 flex-1' : 'contents'}>
            <span className={`block ${labelClass}`}>{label}</span>
            {hint ? (
              <span id={describedBy} className={`block ${hintClass}`}>
                {hint}
              </span>
            ) : null}
          </span>
          <span className="flex shrink-0 flex-wrap items-center gap-2">{actions(open)}</span>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || busy}
          aria-describedby={hint ? describedBy : undefined}
          onClick={open}
          {...dropProps}
          className={`${surface} focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        >
          {glyph}
          <span className={row ? `min-w-0 flex-1 ${labelClass}` : labelClass}>{label}</span>
          {hint ? (
            <span id={describedBy} className={hintClass}>
              {hint}
            </span>
          ) : null}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          emit(event.target.files);
          /* Same file twice in a row must fire twice. */
          event.target.value = '';
        }}
      />
    </>
  );
}
