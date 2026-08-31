import { useState } from 'react';
import { Button, FileDrop, IconFile, Textarea } from '~ui';
import type { ImportTarget } from '../../lib/knowledgeParams';

export interface ImportSourceStepProps {
  target: ImportTarget;
  busy: boolean;
  onFile: (file: File) => void;
  onPaste: (text: string) => void;
}

/** What each target can be built from — said plainly, because it is not obvious. */
const BLURB: Record<ImportTarget, string> = {
  faq: 'A spreadsheet of question and answer columns, or an FAQ document. Nothing is saved until you have seen every row.',
  products:
    'A spreadsheet with a title, a description and a price. Photos cannot be imported — add those to a product afterwards.',
};

export const ACCEPTED_EXTENSIONS = '.csv,.tsv,.txt,.md,.markdown';

/**
 * Two ways in: a file, or pasted text. Both end in the same place — raw text —
 * and the wizard treats them identically from there.
 */
export function ImportSourceStep({ target, busy, onFile, onPaste }: ImportSourceStepProps) {
  const [text, setText] = useState('');

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-text-muted">{BLURB[target]}</p>

      <FileDrop
        accept={ACCEPTED_EXTENSIONS}
        disabled={busy}
        label="Drop a file, or click to choose one"
        hint="CSV, TSV, plain text or Markdown — up to 2 MB"
        icon={<IconFile />}
        onFiles={(files) => {
          const file = files[0];
          if (file) onFile(file);
        }}
      />

      <div className="flex flex-col gap-2">
        <label className="text-label font-medium text-text" htmlFor="knowledge-import-paste">
          …or paste the text
        </label>
        <Textarea
          id="knowledge-import-paste"
          rows={5}
          maxRows={10}
          autoGrow
          disabled={busy}
          placeholder={
            target === 'faq'
              ? 'Q: Do you ship worldwide?\nA: Yes, everywhere except Antarctica.'
              : 'Title,Description,Price\nBlue sofa,Three seats,499'
          }
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <div>
          <Button size="sm" variant="secondary" disabled={busy || text.trim() === ''} onClick={() => onPaste(text)}>
            Use this text
          </Button>
        </div>
      </div>
    </div>
  );
}
