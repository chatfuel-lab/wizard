import { Alert, Button, Spinner, Tag } from '~ui';
import type { TemplateFillApi } from '../../hooks/useTemplateFill';
import { HeaderFileField } from './HeaderFileField';
import { ParamField } from './ParamField';

export interface TemplateFillFormProps {
  fill: TemplateFillApi;
  canEdit: boolean;
  attributes: readonly string[];
  onChangeTemplate: () => void;
}

/**
 * The message step's second stage: the blanks of the template on the
 * payload element.
 *
 * The form is built from the server's element and nothing else. Every field
 * writes through a setter that answers with the whole block; the fields, the
 * preview and Continue all re-render from that answer. `errors` on the
 * element IS the gate, and each is printed beside the field it names. The
 * form checks nothing itself.
 */
export function TemplateFillForm({ fill, canEdit, attributes, onChangeTemplate }: TemplateFillFormProps) {
  const template = fill.template;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-label text-text">{template?.name}</span>
        {template ? <Tag tone={template.status === 'Approved' ? 'success' : 'warning'}>{template.status}</Tag> : null}
        {canEdit ? (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={onChangeTemplate}
            disabled={fill.state.picking}
          >
            Change template
          </Button>
        ) : null}
      </div>

      {fill.state.picking ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : fill.state.pickError ? (
        <Alert tone="danger" title="The template could not be set">
          {fill.state.pickError}
        </Alert>
      ) : (
        <>
          {fill.errors.unattached.map((text) => (
            <Alert key={text} tone="warning">
              {text}
            </Alert>
          ))}
          {fill.fields.map((field) =>
            field.kind === 'file' ? (
              <HeaderFileField key={field.key} field={field} fill={fill} canEdit={canEdit} />
            ) : (
              <ParamField
                key={field.key}
                field={field}
                problems={[
                  ...(fill.errors.byKey[field.key] ?? []),
                  ...(fill.refused[field.key] ?? []).map((name) => `${name} is not a WhatsApp field`),
                ]}
                busy={fill.state.busy[field.key] === true}
                canEdit={canEdit}
                attributes={attributes}
                onSave={(value) => fill.setText(field, value)}
              />
            ),
          )}
        </>
      )}
    </div>
  );
}
