import { useId, type Dispatch } from 'react';
import { Card, Input, Textarea } from '~ui';
import type { UploadFileFn } from '~api';
import {
  ABOUT_MAX,
  FIRST_NAME_MAX,
  LAST_NAME_MAX,
  fieldError,
  type StaffFormAction,
  type StaffFormState,
} from '../../lib/staffFormStore';
import { specialistName } from '../../lib/catalogStore';
import { FormField, errorIdOf } from './FormField';
import { ImageInput } from './ImageInput';

export interface ProfileSectionProps {
  state: StaffFormState;
  dispatch: Dispatch<StaffFormAction>;
  readOnly: boolean;
  botId: string;
  /** Absent → no photo control (the host has no upload path). */
  uploadFile: UploadFileFn | undefined;
}

/** First and last name, the description customers see, and the photo. */
export function ProfileSection({ state, dispatch, readOnly, botId, uploadFile }: ProfileSectionProps) {
  const id = useId();
  const firstId = `${id}-first`;
  const lastId = `${id}-last`;
  const aboutId = `${id}-about`;
  const firstError = fieldError(state, 'firstName');
  const lastError = fieldError(state, 'lastName');
  const aboutError = fieldError(state, 'aboutInfo');
  const draft = state.draft;

  return (
    <Card title="Profile" description="What customers and the AI see. The name must be unique on this bot.">
      <div className="flex flex-col gap-4">
        {uploadFile ? (
          <ImageInput
            botId={botId}
            value={draft.logo}
            onChange={(logo) => dispatch({ type: 'setLogo', logo })}
            uploadFile={uploadFile}
            name={specialistName({ firstName: draft.firstName || 'New', lastName: draft.lastName })}
            disabled={readOnly || state.saving}
            error={fieldError(state, 'logo')}
          />
        ) : null}
        <div className="grid grid-cols-1 gap-3 @compact:grid-cols-2">
          <FormField id={firstId} label="First name" required error={firstError}>
            <Input
              id={firstId}
              value={draft.firstName}
              maxLength={FIRST_NAME_MAX + 20}
              autoComplete="off"
              disabled={readOnly || state.saving}
              aria-invalid={firstError ? true : undefined}
              aria-describedby={firstError ? errorIdOf(firstId) : undefined}
              onChange={(e) => dispatch({ type: 'setText', field: 'firstName', value: e.target.value })}
            />
          </FormField>
          <FormField id={lastId} label="Last name" error={lastError}>
            <Input
              id={lastId}
              value={draft.lastName}
              maxLength={LAST_NAME_MAX + 20}
              autoComplete="off"
              disabled={readOnly || state.saving}
              aria-invalid={lastError ? true : undefined}
              aria-describedby={lastError ? errorIdOf(lastId) : undefined}
              onChange={(e) => dispatch({ type: 'setText', field: 'lastName', value: e.target.value })}
            />
          </FormField>
        </div>
        <FormField
          id={aboutId}
          label="About"
          hint="A sentence or two the AI can use when it suggests this specialist."
          error={aboutError}
        >
          <Textarea
            id={aboutId}
            value={draft.aboutInfo}
            rows={3}
            autoGrow
            maxRows={8}
            maxLength={ABOUT_MAX}
            showCount
            disabled={readOnly || state.saving}
            aria-invalid={aboutError ? true : undefined}
            aria-describedby={aboutError ? errorIdOf(aboutId) : undefined}
            onChange={(e) => dispatch({ type: 'setText', field: 'aboutInfo', value: e.target.value })}
          />
        </FormField>
      </div>
    </Card>
  );
}
