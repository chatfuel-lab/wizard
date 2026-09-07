import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Combobox, Input, type ComboboxOption } from '~ui';
import { fieldLabel, placeholder as placeholderOf, type TemplateField } from '../../lib/templatePreview';

export interface ParamFieldProps {
  field: Extract<TemplateField, { kind: 'text' | 'urlParam' | 'copyCode' }>;
  /** Sentences to print beside the field: the server's verdict, a refusal, a refused reference. */
  problems: readonly string[];
  busy: boolean;
  canEdit: boolean;
  /** The bot's WhatsApp attribute names — the only things "Insert field" may put into a value. */
  attributes: readonly string[];
  /** Rejects with a sentence when the server refuses the value. */
  onSave: (value: string) => Promise<void>;
}

/**
 * One blank of the template: a text input saved on blur, and beside it the
 * insert control for personalisation.
 *
 * Inserting writes `{{Attribute name}}` at the caret and saves at once —
 * a reference the server has not parsed is text the preview cannot show
 * as a reference. Only a catalog name is ever inserted; whatever is typed
 * by hand stays the text it is, because the server would CREATE an
 * attribute for a name it does not know. A copy code takes no reference.
 */
export function ParamField({ field, problems, busy, canEdit, attributes, onSave }: ParamFieldProps) {
  const inputId = useId();
  const [draft, setDraft] = useState(field.value);
  const [refusal, setRefusal] = useState<string | null>(null);
  const lastSaved = useRef(field.value);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Adopt the server's value when it moved — a pick replaced the template,
     or a reference came back parsed — unless the person is mid-edit. */
  useEffect(() => {
    if (field.value !== lastSaved.current) {
      lastSaved.current = field.value;
      setDraft(field.value);
      setRefusal(null);
    }
  }, [field.value]);

  const save = async (next: string) => {
    if (next === lastSaved.current) return;
    setRefusal(null);
    try {
      await onSave(next);
      lastSaved.current = next;
    } catch (err) {
      setRefusal(err instanceof Error ? err.message : String(err));
    }
  };

  const insert = (name: string) => {
    const input = inputRef.current;
    const token = placeholderOf(name);
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    const next = `${draft.slice(0, start)}${token}${draft.slice(end)}`;
    setDraft(next);
    void save(next);
    const caret = start + token.length;
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(caret, caret);
    });
  };

  const options = useMemo<ComboboxOption[]>(
    () => attributes.map((name) => ({ value: name, label: name })),
    [attributes],
  );
  const invalid = problems.length > 0 || refusal !== null;
  const takesReference = field.kind !== 'copyCode';

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-label font-medium text-text-muted">
        {fieldLabel(field)}
      </label>
      <div className="flex flex-wrap items-start gap-2">
        <Input
          id={inputId}
          ref={inputRef}
          className="min-w-48 flex-1"
          value={draft}
          placeholder={placeholderOf('name' in field ? field.name : 'code')}
          disabled={!canEdit}
          invalid={invalid}
          maxLength={field.kind === 'copyCode' ? 15 : field.kind === 'urlParam' ? 2083 : 1024}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void save(draft)}
        />
        {takesReference && canEdit && options.length > 0 ? (
          <Combobox
            className="w-48"
            aria-label="Insert field"
            placeholder="Insert field"
            value={null}
            options={options}
            disabled={busy}
            onChange={(value) => {
              if (value) insert(value);
            }}
          />
        ) : null}
      </div>
      {[...problems, ...(refusal ? [refusal] : [])].map((text) => (
        <p key={text} className="mt-1 text-meta text-danger">
          {text}
        </p>
      ))}
    </div>
  );
}
