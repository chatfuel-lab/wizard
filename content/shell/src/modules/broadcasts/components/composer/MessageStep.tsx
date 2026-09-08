import { useState } from 'react';
import { Alert } from '~ui';
import type { TemplateFillApi } from '../../hooks/useTemplateFill';
import { useParamAttributes } from '../../hooks/useParamAttributes';
import type { CampaignRecord } from '../../lib/campaign';
import type { BotFacts } from '../../types';
import { NoWhatsApp } from '../NoWhatsApp';
import { PhonePreview } from './PhonePreview';
import { StepFrame } from './StepFrame';
import { TemplateFillForm } from './TemplateFillForm';
import { TemplatePicker } from './TemplatePicker';

export interface MessageStepProps {
  record: CampaignRecord;
  fill: TemplateFillApi;
  canEdit: boolean;
  facts: BotFacts | null;
  /** The bot has no number: there is no catalog to pick from, and the step says so instead. */
  whatsappMissing: boolean;
  onConnectWhatsApp: (() => void) | null;
}

/**
 * The message: pick a template, fill its blanks, watch it land on the
 * phone. The picker shows until the element carries a template and again
 * on "Change template"; the fill form owns everything after that. The
 * preview draws from the server's element, so an unfilled blank previews
 * as `{{1}}` until its setter answers.
 */
export function MessageStep({ fill, canEdit, facts, whatsappMissing, onConnectWhatsApp }: MessageStepProps) {
  const [choosing, setChoosing] = useState(false);
  const attributes = useParamAttributes();
  const showPicker = fill.template === null || choosing;

  if (whatsappMissing) {
    return (
      <StepFrame title="Message">
        <NoWhatsApp onConnect={onConnectWhatsApp} />
      </StepFrame>
    );
  }

  return (
    <StepFrame
      title="Message"
      aside={
        <PhonePreview
          preview={fill.preview}
          number={facts?.whatsapp?.displayPhoneNumber ?? null}
          headerPreviewUrl={fill.headerFile?.previewUrl}
          headerFileName={fill.headerFile?.name}
        />
      }
    >
      {showPicker ? (
        <div className="flex flex-col gap-3">
          {fill.state.pickError ? (
            <Alert tone="danger" title="The template could not be set">
              {fill.state.pickError}
            </Alert>
          ) : null}
          <TemplatePicker
            disabled={!canEdit || fill.state.picking}
            onPick={(template) => {
              setChoosing(false);
              fill.pick(template);
            }}
          />
        </div>
      ) : (
        <TemplateFillForm
          fill={fill}
          canEdit={canEdit}
          attributes={attributes.names}
          onChangeTemplate={() => setChoosing(true)}
        />
      )}
    </StepFrame>
  );
}
