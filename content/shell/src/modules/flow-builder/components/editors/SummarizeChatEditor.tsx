import { useState } from 'react';
import { Button, Field, IconPlus, IconTrash } from '~ui';
import {
  AddSummarizeChatEntryDocument,
  DeleteSummarizeChatEntryDocument,
  SetSummarizeChatEntryDocument,
} from '~api/generated/flow-builder/graphql';
import { useAttributeSuggestions } from '../../hooks/useAttributeSuggestions';
import { pickBlock } from '../../lib/pickBlock';
import type { BlockT, ElementOf } from '../../types';
import { AttributeInput } from '../AttributeInput';
import { useBlockMutation } from './useBlockMutation';

export interface SummarizeChatEditorProps {
  element: ElementOf<'SummarizeChatBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/**
 * Entries CRUD. The API's Add/Update both carry name+description TOGETHER, so
 * the add form stages both locally and fires one summarizeChatAddEntry;
 * existing entries update through SetSummarizeChatEntry on either field's
 * save (sending the other field's current value along).
 */
export function SummarizeChatEditor({ element, onBlock }: SummarizeChatEditorProps) {
  const { run, runAction, actionError } = useBlockMutation(onBlock);
  const suggestions = useAttributeSuggestions(element.platform);
  const [draft, setDraft] = useState<{ name: string; description: string } | null>(null);

  const addEntry = async () => {
    if (!draft?.name.trim() || !draft.description.trim()) return;
    await runAction(
      AddSummarizeChatEntryDocument,
      { elementID: element.id, name: draft.name.trim(), description: draft.description.trim(), addAsFirst: false },
      pickBlock,
    );
    setDraft(null);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-text-muted">Entries</div>
      {element.entries.length === 0 && !draft ? <p className="text-xs text-text-faint">No entries yet</p> : null}
      {element.entries.map((entry) => (
        <div key={entry.id} className="space-y-2 rounded-lg border border-border p-2.5">
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Delete entry"
              onClick={() =>
                void runAction(DeleteSummarizeChatEntryDocument, { elementID: element.id, id: entry.id }, pickBlock)
              }
            >
              <IconTrash size={13} />
            </Button>
          </div>
          <AttributeInput
            label="Save to attribute"
            value={entry.attribute?.name ?? ''}
            suggestions={suggestions}
            placeholder="attribute name"
            validate={(name) => (name.trim() ? null : 'Attribute name is required')}
            onSave={(name) =>
              run(
                SetSummarizeChatEntryDocument,
                { elementID: element.id, id: entry.id, name: name.trim(), description: entry.description },
                pickBlock,
              )
            }
          />
          <Field
            label="What to extract"
            multiline
            value={entry.description}
            placeholder="e.g. the customer's shipping city"
            onSave={(description) =>
              run(
                SetSummarizeChatEntryDocument,
                { elementID: element.id, id: entry.id, name: entry.attribute?.name ?? '', description },
                pickBlock,
              )
            }
          />
        </div>
      ))}
      {draft ? (
        <div className="space-y-2 rounded-lg border border-border p-2.5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-text-muted">Save to attribute</span>
            <input
              value={draft.name}
              list="summarize-chat-attrs"
              placeholder="attribute name"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
            />
            <datalist id="summarize-chat-attrs">
              {suggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-text-muted">What to extract</span>
            <textarea
              value={draft.description}
              rows={2}
              placeholder="e.g. the customer's shipping city"
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
            />
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!draft.name.trim() || !draft.description.trim()}
              onClick={() => void addEntry()}
            >
              Add entry
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setDraft({ name: '', description: '' })}>
          <IconPlus size={13} /> Add entry
        </Button>
      )}
      {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
    </div>
  );
}
