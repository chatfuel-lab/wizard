import type { TypedDoc } from '~api';
import { Switch } from '~ui';
import type { Platform } from '~api/generated/flow-builder/graphql';
import { useAttributeSuggestions } from '../../../hooks/useAttributeSuggestions';
import { pickBlock } from '../../../lib/pickBlock';
import type { BlockT } from '../../../types';
import { AttributeInput } from '../../AttributeInput';
import { useBlockMutation } from '../useBlockMutation';

/** Every wait-for-replies op shares this variable shape. */
export type WaitDocument = TypedDoc<Record<string, unknown>, { elementID: string; waitForReplies: boolean }>;

/** Every save-reply op shares this one ($save / $attribute). */
export type SaveReplyDocument = TypedDoc<
  Record<string, unknown>,
  { elementID: string; save: boolean; attribute?: string | null }
>;

export interface ReplySettingsProps {
  element: {
    id: string;
    platform: Platform;
    waitForReplies: boolean;
    saveContactReply: boolean;
    savingToAttribute?: { name: string } | null;
  };
  waitDocument: WaitDocument;
  saveDocument: SaveReplyDocument;
  onBlock: (block: BlockT) => void;
}

/**
 * The wait-for-replies / save-reply-to-attribute pair every content element
 * family carries. Per-family documents are injected — the field names differ
 * per family, but the variable shapes are uniform across the ops.
 */
export function ReplySettings({ element, waitDocument, saveDocument, onBlock }: ReplySettingsProps) {
  const { run } = useBlockMutation(onBlock);
  const suggestions = useAttributeSuggestions(element.platform);
  const savedAttribute = element.savingToAttribute?.name ?? '';

  return (
    <div className="space-y-3">
      <Switch
        checked={element.waitForReplies}
        label="Wait for a reply before continuing"
        onChange={(waitForReplies) => run(waitDocument, { elementID: element.id, waitForReplies }, pickBlock)}
      />
      <Switch
        checked={element.saveContactReply}
        label="Save the reply to an attribute"
        onChange={(save) =>
          run(saveDocument, { elementID: element.id, save, attribute: savedAttribute || null }, pickBlock)
        }
      />
      {element.saveContactReply ? (
        <AttributeInput
          label="Save to attribute"
          value={savedAttribute}
          suggestions={suggestions}
          placeholder="attribute name"
          onSave={(name) =>
            run(saveDocument, { elementID: element.id, save: true, attribute: name || null }, pickBlock)
          }
        />
      ) : null}
    </div>
  );
}
