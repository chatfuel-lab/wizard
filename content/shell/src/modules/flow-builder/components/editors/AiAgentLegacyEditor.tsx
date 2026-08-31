import { Button, Field, IconPlus, IconTrash } from '~ui';
import {
  AddAiAgentRuleDocument,
  ClearAiAgentKnowledgeItemPromptsDocument,
  DeleteAiAgentRuleDocument,
  SetAiAgentKnowledgeItemPromptDocument,
  SetAiAgentRulePromptDocument,
  SetAiAgentRuleTitleDocument,
} from '~api/generated/flow-builder/graphql';
import { pickBlock } from '../../lib/pickBlock';
import type { BlockT, ElementOf } from '../../types';
import { ReadOnly } from './shared/ReadOnly';
import { useBlockMutation } from './useBlockMutation';

export interface AiAgentLegacyEditorProps {
  element: ElementOf<'AiAgentBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/**
 * The legacy (pre-Fuely) AI agent: knowledge-item prompts + shared rules
 * CRUD. Token counters are read-only — the schema exposes no setters for
 * them.
 */
export function AiAgentLegacyEditor({ element, onBlock }: AiAgentLegacyEditorProps) {
  const { run, runAction, actionError } = useBlockMutation(onBlock);

  return (
    <div className="space-y-3">
      <ReadOnly label="Token budget" value={`${element.availableTokens} of ${element.maxTokens} available`} />
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-text-muted">Knowledge items</div>
          {element.knowledgeItems.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                void runAction(ClearAiAgentKnowledgeItemPromptsDocument, { elementID: element.id }, pickBlock)
              }
            >
              Clear all prompts
            </Button>
          ) : null}
        </div>
        {element.knowledgeItems.length === 0 ? (
          <p className="text-xs text-text-faint">This agent has no knowledge items.</p>
        ) : (
          element.knowledgeItems.map((item) => (
            <div key={item.id} className="space-y-2 rounded-lg border border-border p-2.5">
              <div className="text-xs font-medium text-text">{item.title}</div>
              {item.description ? <p className="text-xs text-text-muted">{item.description}</p> : null}
              <Field
                label="Prompt"
                multiline
                value={item.prompt ?? ''}
                onSave={(prompt) =>
                  run(
                    SetAiAgentKnowledgeItemPromptDocument,
                    { elementID: element.id, knowledgeItemID: item.id, prompt },
                    pickBlock,
                  )
                }
              />
            </div>
          ))
        )}
      </div>
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
