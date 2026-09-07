import { useMemo } from 'react';
import { WhatsAppTemplateStatus } from '~api/generated/broadcasts/graphql';
import { Button, Drawer, IconSend } from '~ui';
import { templateFields, templatePreview } from '../../lib/templatePreview';
import type { CatalogTemplate } from '../../types';
import { TemplatePreviewCard } from '../TemplatePreviewCard';
import { TemplateStatusBadge } from '../TemplateStatusBadge';

export interface TemplateDrawerProps {
  template: CatalogTemplate | null;
  onClose: () => void;
  /** Start a campaign on this template. Absent for a role that may not create one. */
  onUse: ((template: CatalogTemplate) => void) | null;
  using: boolean;
}

/** A template in full, and the one thing to do with it. */
export function TemplateDrawer({ template, onClose, onUse, using }: TemplateDrawerProps) {
  const preview = useMemo(() => (template ? templatePreview(template) : null), [template]);
  const blanks = useMemo(() => (template ? templateFields(template).length : 0), [template]);
  const usable = template?.status === WhatsAppTemplateStatus.Approved && template.IsSupportedInFlowbuilder;
  return (
    <Drawer
      open={template !== null}
      onClose={onClose}
      title={template?.name ?? ''}
      meta={template ? <TemplateStatusBadge status={template.status} /> : null}
      footer={
        onUse && template ? (
          <Button variant="primary" onClick={() => onUse(template)} disabled={!usable} loading={using}>
            <IconSend />
            Use in a campaign
          </Button>
        ) : null
      }
    >
      {template && preview ? (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-text-muted">Category</dt>
            <dd className="text-text">{template.category}</dd>
            <dt className="text-text-muted">Language</dt>
            <dd className="text-text">{template.language}</dd>
            <dt className="text-text-muted">Blanks to fill</dt>
            <dd className="text-text">{blanks}</dd>
          </dl>
          <div className="flex justify-end">
            <div className="max-w-[92%]">
              <TemplatePreviewCard preview={preview} />
            </div>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
