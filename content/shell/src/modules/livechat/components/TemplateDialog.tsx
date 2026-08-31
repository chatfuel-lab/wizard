import { useEffect } from 'react';
import { Button, Dialog, IconChevronLeft } from '~ui';
import type { SendTemplateInput } from '../hooks/useConversationSend';
import { useTemplateFillStore } from '../hooks/useTemplateFillStore';
import { useWhatsAppTemplates } from '../hooks/useWhatsAppTemplates';
import { templateContentOf } from '../lib/templatePreview';
import { TemplateFillForm } from './TemplateFillForm';
import { TemplatePicker } from './TemplatePicker';

export interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  contactName: string;
  onSend: (input: SendTemplateInput) => void;
}

/**
 * Pick a WhatsApp template, fill its blanks, send it.
 *
 * Two stages in one dialog, each its own component: `TemplatePicker` lists
 * what may be sent, `TemplateFillForm` renders the server's temporary copy.
 * This shell owns what spans both — the catalog, the fill store, the footer,
 * and the send.
 */
export function TemplateDialog({ open, onClose, contactName, onSend }: TemplateDialogProps) {
  const catalog = useWhatsAppTemplates(open);
  const fill = useTemplateFillStore();

  /* Closing forgets everything: the temporary copy on the server is exactly
     that, and the next open starts at the picker. */
  // `pick` is stable; `fill` as a whole is a fresh object per render.
  const pick = fill.pick;
  useEffect(() => {
    if (open) return;
    pick(null);
  }, [open, pick]);

  const send = () => {
    if (!fill.state.filled || !fill.template || !fill.preview) return;
    /* The optimistic row is drawn from the same preview the operator has been
       looking at; the picked file's name comes along because for a document
       header it is the only place the name is. */
    const content = templateContentOf(fill.preview, fill.headerFile?.name ?? null);
    onSend({ filledTemplateId: fill.state.filled.id, name: fill.template.name, content });
    onClose();
  };

  const picking = fill.template === null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={picking ? 'Send a template' : `Send a template to ${contactName}`}
      size="lg"
      footer={
        picking ? undefined : (
          <>
            <Button variant="ghost" onClick={() => fill.pick(null)}>
              <IconChevronLeft size={14} />
              Templates
            </Button>
            <Button onClick={send} disabled={!fill.canSend}>
              Send
            </Button>
          </>
        )
      }
    >
      {picking ? <TemplatePicker catalog={catalog} onPick={fill.pick} /> : <TemplateFillForm fill={fill} />}
    </Dialog>
  );
}
