import { describe, expect, it } from 'vitest';
import { errorCode, errorMessage, isAlreadySent, problemArea, problemText } from './errors';

const routed = (code: string) => ({
  errors: [
    {
      message: 'Failed to fetch from Subgraph.',
      extensions: { errors: [{ message: 'service error', extensions: { code } }] },
    },
  ],
});

describe('thrown codes', () => {
  it('are read one level down, the way the router wraps them', () => {
    expect(errorCode(routed('WhatsAppOneTimeBroadcastAlreadyStarted'))).toBe('WhatsAppOneTimeBroadcastAlreadyStarted');
    expect(isAlreadySent(routed('WhatsAppOneTimeBroadcastAlreadyStarted'))).toBe(true);
  });

  it('become a sentence, with a bare server error named as such', () => {
    expect(errorMessage(routed('ScopeNotConnectedToBot'))).toMatch(/No WhatsApp number/);
    expect(errorMessage(routed('InternalServerError'))).toMatch(/could not complete/);
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });
});

describe('verdicts', () => {
  it('name the parameter they are about', () => {
    expect(problemText('body_text_param_value_required', '1')).toBe('Fill in {{1}}');
    expect(problemText('template_required')).toBe('Pick a template');
    expect(problemText('start_time_cannot_be_in_past')).toBe('The send time has passed');
  });

  it('are shown as they came when unknown', () => {
    expect(problemText('something_new')).toBe('something new');
  });

  it('belong to a composer step', () => {
    expect(problemArea('body_text_param_value_required')).toBe('message');
    expect(problemArea('weekdays_are_empty')).toBe('schedule');
    expect(problemArea('segment_set_is_invalid')).toBe('audience');
    expect(problemArea('connection_required')).toBe('campaign');
  });
});
