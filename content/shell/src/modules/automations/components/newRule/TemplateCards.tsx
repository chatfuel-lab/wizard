import { useId } from 'react';
import { IconSparkles, Tag } from '~ui';
import type { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { SETTING_LABELS } from '../../lib/settingSummary';
import { templateSettingTypes, type RuleTemplate } from '../../lib/templates';

/** The "no template" choice — a plain create, every setting the source's Default. */
export const BLANK_TEMPLATE_ID = 'blank';

export interface TemplateCardsProps {
  scope: FuelyAutomationScope;
  templates: readonly RuleTemplate[];
  /** `BLANK_TEMPLATE_ID` or a template id. */
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

/**
 * The starters as radio cards: native radios in a `radiogroup` (one Tab stop,
 * arrows inside — the browser's), each card a bordered block with the title,
 * the sentence, and small tags of the settings it pre-fills. "Blank" first.
 */
export function TemplateCards({ scope, templates, value, onChange, disabled = false }: TemplateCardsProps) {
  const name = useId();
  const cards: { id: string; title: string; description: string; tags: string[] }[] = [
    {
      id: BLANK_TEMPLATE_ID,
      title: 'Blank',
      description: 'Every setting starts as the source’s Default; set the triggers yourself.',
      tags: [],
    },
    ...templates.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      tags: templateSettingTypes(t, scope).map((typename) => SETTING_LABELS[typename]),
    })),
  ];

  return (
    <div role="radiogroup" aria-label="Start from" className="flex flex-col gap-2">
      {cards.map((card) => {
        const checked = value === card.id;
        return (
          <label
            key={card.id}
            className={`relative flex cursor-pointer items-start gap-3 rounded-card border p-3 transition-colors duration-fast ease-standard has-[:focus-visible]:focus-ring ${
              checked
                ? 'border-accent bg-accent-soft/40'
                : 'border-border hover:border-border-strong hover:bg-surface-hover'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={card.id}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(card.id)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${checked ? 'border-accent' : 'border-border-strong'}`}
            >
              <span
                className={`h-2 w-2 rounded-full transition-transform duration-fast ease-spring ${checked ? 'scale-100 bg-accent' : 'scale-0'}`}
              />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-1.5 text-sm font-medium text-text">
                {card.id !== BLANK_TEMPLATE_ID ? <IconSparkles size={14} className="text-accent" /> : null}
                {card.title}
              </span>
              <span className="text-xs text-text-muted">{card.description}</span>
              {card.tags.length > 0 ? (
                <span className="mt-0.5 flex flex-wrap gap-1">
                  {card.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
