import { useState } from 'react';
import { errorMessageFor } from '~api';
import { Button, Field, IconPlus, IconTrash, Select, Switch, type SelectOption } from '~ui';
import {
  AddSendJsonHeaderDocument,
  AddSendJsonUrlParamDocument,
  DeleteSendJsonHeaderDocument,
  DeleteSendJsonUrlParamDocument,
  DisableSendJsonParsingRulesDocument,
  EnableSendJsonParsingRulesDocument,
  AddSendJsonParsingRuleDocument,
  DeleteSendJsonParsingRuleDocument,
  SendJsonHttpMethod,
  SendJsonPayloadType,
  SetSendJsonCustomPayloadDocument,
  SetSendJsonHeaderTitleDocument,
  SetSendJsonHeaderValueDocument,
  SetSendJsonMethodDocument,
  SetSendJsonParsingRuleAttributeDocument,
  SetSendJsonParsingRuleJsonPathDocument,
  SetSendJsonPayloadTypeDocument,
  SetSendJsonUrlDocument,
  SetSendJsonUrlParamTitleDocument,
  SetSendJsonUrlParamValueDocument,
  TestSendJsonRequestDocument,
  type TestSendJsonRequestMutation,
} from '~api/generated/flow-builder/graphql';
import { useFlowBuilder } from '../../FlowBuilderContext';
import { useAttributeSuggestions } from '../../hooks/useAttributeSuggestions';
import { pickBlock } from '../../lib/pickBlock';
import { templateStrToString } from '../../lib/templateStr';
import type { BlockT, ElementOf } from '../../types';
import { AttributeInput } from '../AttributeInput';
import { useBlockMutation } from './useBlockMutation';

export interface SendJsonEditorProps {
  element: ElementOf<'SendJsonBlockElement'>;
  onBlock: (block: BlockT) => void;
}

const METHOD_OPTIONS: SelectOption[] = Object.values(SendJsonHttpMethod).map((method) => ({
  value: method,
  label: method,
}));

const PAYLOAD_OPTIONS: SelectOption[] = [
  { value: SendJsonPayloadType.AllProperties, label: 'All contact properties' },
  { value: SendJsonPayloadType.CustomRequest, label: 'Custom JSON payload' },
  { value: SendJsonPayloadType.EncodedUrl, label: 'URL-encoded params' },
];

type TestExchange = TestSendJsonRequestMutation['sendJsonTestRequest'];

/**
 * The full Send-JSON surface: method + URL, headers CRUD, payload type with
 * its custom-payload / URL-params branches, response parsing rules (enable
 * toggle + rules CRUD) and the test-request dry run — the one mutation that
 * fires the real HTTP request and returns the whole exchange
 * (TestRequestConnectionRefused on failure).
 */
export function SendJsonEditor({ element, onBlock }: SendJsonEditorProps) {
  const { client } = useFlowBuilder();
  const { run, runAction, actionError } = useBlockMutation(onBlock);
  const suggestions = useAttributeSuggestions(element.platform);
  const [test, setTest] = useState<TestExchange | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    setTestError(null);
    try {
      const data = await client.mutate(TestSendJsonRequestDocument, { elementID: element.id });
      setTest(data.sendJsonTestRequest ?? null);
    } catch (err) {
      setTestError(errorMessageFor(err, {}));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-text-muted">Method</span>
        <Select
          className="w-full"
          aria-label="HTTP method"
          value={element.httpMethod}
          options={METHOD_OPTIONS}
          onChange={(method) =>
            void runAction(
              SetSendJsonMethodDocument,
              { elementID: element.id, method: method as SendJsonHttpMethod },
              (d) => d.sendJsonUpdateHTTPMethod,
            )
          }
        />
      </label>
      <Field
        label="URL"
        value={templateStrToString(element.url)}
        placeholder="https://api.example.com/hook"
        onSave={(url) => run(SetSendJsonUrlDocument, { elementID: element.id, url }, (d) => d.sendJsonUpdateURL)}
      />
      <div className="space-y-2">
        <div className="text-xs font-medium text-text-muted">Headers</div>
        {element.headers.map((header) => (
          <div key={header.id} className="space-y-2 rounded-lg border border-border p-2.5">
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete header"
                onClick={() =>
                  void runAction(
                    DeleteSendJsonHeaderDocument,
                    { elementID: element.id, headerID: header.id },
                    pickBlock,
                  )
                }
              >
                <IconTrash size={13} />
              </Button>
            </div>
            <Field
              label="Header"
              value={templateStrToString(header.title)}
              placeholder="Content-Type"
              onSave={(title) =>
                run(SetSendJsonHeaderTitleDocument, { elementID: element.id, headerID: header.id, title }, pickBlock)
              }
            />
            <Field
              label="Value"
              value={templateStrToString(header.value)}
              onSave={(value) =>
                run(SetSendJsonHeaderValueDocument, { elementID: element.id, headerID: header.id, value }, pickBlock)
              }
            />
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            void runAction(AddSendJsonHeaderDocument, { elementID: element.id }, (d) => d.sendJsonAddHeader)
          }
        >
          <IconPlus size={13} /> Add header
        </Button>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-text-muted">Payload</span>
        <Select
          className="w-full"
          aria-label="Payload type"
          value={element.payloadType}
          options={PAYLOAD_OPTIONS}
          onChange={(payloadType) =>
            void runAction(
              SetSendJsonPayloadTypeDocument,
              { elementID: element.id, payloadType: payloadType as SendJsonPayloadType },
              pickBlock,
            )
          }
        />
      </label>
      {element.payloadType === SendJsonPayloadType.CustomRequest ? (
        <Field
          label="Custom payload (JSON)"
          multiline
          value={templateStrToString(element.customRequestPayload)}
          placeholder='{"phone": "{{phone}}"}'
          onSave={(payload) => run(SetSendJsonCustomPayloadDocument, { elementID: element.id, payload }, pickBlock)}
        />
      ) : null}
      {element.payloadType === SendJsonPayloadType.EncodedUrl ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-text-muted">URL params</div>
          {element.encodedURLPayload.map((param) => (
            <div key={param.id} className="space-y-2 rounded-lg border border-border p-2.5">
              <div className="flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Delete param"
                  onClick={() =>
                    void runAction(
                      DeleteSendJsonUrlParamDocument,
                      { elementID: element.id, paramID: param.id },
                      pickBlock,
                    )
                  }
                >
                  <IconTrash size={13} />
                </Button>
              </div>
              <Field
                label="Param"
                value={templateStrToString(param.title)}
                onSave={(title) =>
                  run(SetSendJsonUrlParamTitleDocument, { elementID: element.id, paramID: param.id, title }, pickBlock)
                }
              />
              <Field
                label="Value"
                value={templateStrToString(param.value)}
                onSave={(value) =>
                  run(SetSendJsonUrlParamValueDocument, { elementID: element.id, paramID: param.id, value }, pickBlock)
                }
              />
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void runAction(AddSendJsonUrlParamDocument, { elementID: element.id }, pickBlock)}
          >
            <IconPlus size={13} /> Add param
          </Button>
        </div>
      ) : null}
      <div className="space-y-2">
        <Switch
          checked={element.responseParsingRulesEnabled}
          label="Parse the response into attributes"
          onChange={(enabled) =>
            run(
              enabled ? EnableSendJsonParsingRulesDocument : DisableSendJsonParsingRulesDocument,
              { elementID: element.id },
              pickBlock,
            )
          }
        />
        {element.responseParsingRulesEnabled ? (
          <>
            {element.responseParsingRules.map((rule) => (
              <div key={rule.id} className="space-y-2 rounded-lg border border-border p-2.5">
                <div className="flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Delete parsing rule"
                    onClick={() =>
                      void runAction(
                        DeleteSendJsonParsingRuleDocument,
                        { elementID: element.id, ruleID: rule.id },
                        pickBlock,
                      )
                    }
                  >
                    <IconTrash size={13} />
                  </Button>
                </div>
                <Field
                  label="JSON path"
                  value={rule.jsonPath ?? ''}
                  placeholder="$.data.city"
                  onSave={(path) =>
                    run(
                      SetSendJsonParsingRuleJsonPathDocument,
                      { elementID: element.id, ruleID: rule.id, path },
                      pickBlock,
                    )
                  }
                />
                <AttributeInput
                  label="Save to attribute"
                  value={rule.attribute?.name ?? ''}
                  suggestions={suggestions}
                  placeholder="attribute name"
                  validate={(name) => (name.trim() ? null : 'Attribute name is required')}
                  onSave={(name) =>
                    run(
                      SetSendJsonParsingRuleAttributeDocument,
                      { elementID: element.id, ruleID: rule.id, name: name.trim() },
                      pickBlock,
                    )
                  }
                />
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void runAction(AddSendJsonParsingRuleDocument, { elementID: element.id }, pickBlock)}
            >
              <IconPlus size={13} /> Add parsing rule
            </Button>
          </>
        ) : null}
      </div>
      <div className="space-y-2 border-t border-border pt-3">
        <Button variant="ghost" size="sm" disabled={testing} onClick={() => void runTest()}>
          {testing ? 'Testing…' : 'Test request'}
        </Button>
        {testError ? <p className="text-xs text-danger">{testError}</p> : null}
        {test ? (
          <div className="space-y-1 rounded-lg border border-border p-2.5 text-xs">
            <div className="font-medium text-text">
              {test.requestMethod} {test.requestURL} → {test.statusCode} {test.statusName}
            </div>
            {test.requestBody ? (
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all text-text-muted">
                {test.requestBody}
              </pre>
            ) : null}
            <div className="font-medium text-text">Response</div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all text-text-muted">
              {test.responseBody || '(empty body)'}
            </pre>
          </div>
        ) : null}
      </div>
      {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
    </div>
  );
}
