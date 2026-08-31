import { Button, Field, IconPlus, IconTrash } from '~ui';
import {
  AddAiAgentCustomRuleDocument,
  DeleteAiAgentCustomRuleDocument,
  SetAiAgentCustomPromptDocument,
  SetAiAgentCustomRulePromptDocument,
  SetAiAgentCustomRuleTitleDocument,
} from '~api/generated/flow-builder/graphql';
import { pickBlock } from '../../lib/pickBlock';
import type { BlockT, ElementOf } from '../../types';
import { ReadOnly } from './shared/ReadOnly';
import { useBlockMutation } from './useBlockMutation';

export interface AiAgentCustomEditorProps {
  element: ElementOf<'AiAgentCustomBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/** Custom-prompt AI agent: the main prompt + its own rules CRUD (aiAgentCustom*). */
export function AiAgentCustomEditor({ element, onBlock }: AiAgentCustomEditorProps) {
  const { run, runAction, actionError } = useBlockMutation(onBlock);

  return (
    <div className="space-y-3">
      <ReadOnly label="Token budget" value={`${element.availableTokens} of ${element.maxTokens} available`} />
      <Field
        label="Prompt"
        multiline
        value={element.prompt ?? ''}
        placeholder="You are a support agent for…"
        onSave={(prompt) => run(SetAiAgentCustomPromptDocument, { elementID: element.id, prompt }, pickBlock)}
      />
      <div className="space-y-2">
        <div className="text-xs font-medium text-text-muted">Rules</div>
        {element.rules.map((rule) => (
          <div key={rule.id} className="space-y-2 rounded-lg border border-border p-2.5">
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete rule"
                onClick={() =>
                  void runAction(DeleteAiAgentCustomRuleDocument, { elementID: element.id, ruleID: rule.id }, pickBlock)
                }
              >
                <IconTrash size={13} />
              </Button>
            </div>
            <Field
              label="Rule title"
              value={rule.title}
              onSave={(title) =>
                run(SetAiAgentCustomRuleTitleDocument, { elementID: element.id, ruleID: rule.id, title }, pickBlock)
              }
            />
            <Field
              label="Prompt"
              multiline
              value={rule.prompt}
              onSave={(prompt) =>
                run(SetAiAgentCustomRulePromptDocument, { elementID: element.id, ruleID: rule.id, prompt }, pickBlock)
              }
            />
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void runAction(AddAiAgentCustomRuleDocument, { elementID: element.id }, pickBlock)}
        >
          <IconPlus size={13} /> Add rule
        </Button>
        {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
      </div>
    </div>
  );
}
