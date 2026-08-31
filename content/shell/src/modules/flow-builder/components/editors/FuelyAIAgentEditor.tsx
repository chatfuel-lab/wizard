import { Button, Field, IconPlus, IconTrash } from '~ui';
import {
  AddAiAgentRuleDocument,
  DeleteAiAgentRuleDocument,
  SetAiAgentInstructionsDocument,
  SetAiAgentRulePromptDocument,
  SetAiAgentRuleTitleDocument,
} from '~api/generated/flow-builder/graphql';
import { pickBlock } from '../../lib/pickBlock';
import type { BlockT, ElementOf } from '../../types';
import { useBlockMutation } from './useBlockMutation';

export interface FuelyAIAgentEditorProps {
  element: ElementOf<'FuelyAIAgentBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/**
 * Fuely AI agent: additional instructions (server enforces the char budget —
 * FuelyAdditionalInstructionsCharLimitExceeded surfaces inline) + rules CRUD.
 */
export function FuelyAIAgentEditor({ element, onBlock }: FuelyAIAgentEditorProps) {
  const { run, runAction, actionError } = useBlockMutation(onBlock);

  return (
    <div className="space-y-3">
      <Field
        label={`Additional instructions (${element.charsCount} chars used)`}
        multiline
        value={element.additionalInstructions}
        placeholder="Tone, boundaries, escalation rules…"
        onSave={(instructions) =>
          run(SetAiAgentInstructionsDocument, { elementID: element.id, instructions }, pickBlock)
        }
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
                  void runAction(DeleteAiAgentRuleDocument, { elementID: element.id, ruleID: rule.id }, pickBlock)
                }
              >
                <IconTrash size={13} />
              </Button>
            </div>
            <Field
              label="Rule title"
              value={rule.title}
              onSave={(title) =>
                run(SetAiAgentRuleTitleDocument, { elementID: element.id, ruleID: rule.id, title }, pickBlock)
              }
            />
            <Field
              label="Prompt"
              multiline
              value={rule.prompt}
              onSave={(prompt) =>
                run(SetAiAgentRulePromptDocument, { elementID: element.id, ruleID: rule.id, prompt }, pickBlock)
              }
            />
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void runAction(AddAiAgentRuleDocument, { elementID: element.id }, pickBlock)}
        >
          <IconPlus size={13} /> Add rule
        </Button>
        {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
      </div>
    </div>
  );
}
